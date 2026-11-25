/**
 * QUINTO GIRO — Fase 2: storage persistente senza tetto di 5 MB.
 *
 * Architettura:
 *  - IndexedDB (`finpcoach-kv`, object store `kv`) è il backend dei dati
 *    (tutte le chiavi `finp*`/`finpcoach*` che non sono impostazioni piccole).
 *  - In memoria resta una cache `Map<string,string>`: all'avvio
 *    `bootKvStore()` la idrata (dopo aver eventualmente migrato da
 *    localStorage). Le API sincrone `kvGet/kvSet/kvDel` leggono/scrivono la
 *    cache: la UI non cambia.
 *  - Le scritture su chiavi-dato aggiornano subito la cache e vengono
 *    persistite su IndexedDB in modo asincrono: debounce ~200 ms, coda
 *    ordinata (`flushKvStore()`), flush su visibilitychange/pagehide/blur.
 *  - In localStorage restano solo le impostazioni piccole (whitelist) e il
 *    puntatore `finp_idb_state`.
 *  - `navigator.storage.persist()` viene richiesto all'avvio.
 *
 * Se IndexedDB non è disponibile (test node, WebView senza IDB, errore di
 * apertura) il modulo resta in modalità 'ls' e delega tutto a localStorage:
 * il comportamento è identico a prima.
 *
 * Migrazione LS → IDB (idempotente, crash-safe):
 *  1. se il marcatore `__meta:migrazione` non c'è in IDB, localStorage è
 *     l'unica fonte autoritativa: si copiano tutte le chiavi `finp*` non in
 *     whitelist, si verifica ogni chiave (conteggio elementi + checksum),
 *     si salva uno snapshot compresso dei dati grezzi in IDB, si scrive il
 *     marcatore e SOLO ALLORA si cancellano le chiavi da localStorage.
 *  2. se qualsiasi passo fallisce, niente viene cancellato e al prossimo
 *     avvio si riprova (il parziale in IDB viene sovrascritto/cancellato:
 *     senza marcatore IDB non è mai letto).
 *  3. a marcatore presente, IDB è autoritativa: la cache si idrata da IDB e
 *     le eventuali chiavi `finp*` residue in localStorage vengono eliminate
 *     (copre l'interruzione fra marcatore e cancellazione).
 */

const DB_NAME = 'finpcoach-kv';
const DB_VERSION = 1;
const STORE = 'kv';

/** Puntatore di stato in localStorage (conoscenza immediata anche senza IDB). */
export const IDB_STATE_KEY = 'finp_idb_state';
const MIGRATION_META_KEY = '__meta:migrazione';
const PRE_MIGRATION_SNAPSHOT_KEY = '__snapshot_pre_migrazione';

/**
 * Chiavi che RESTANO in localStorage: impostazioni piccole e stato UI.
 * Tutto il resto `finp*`/`finpcoach*` va su IndexedDB.
 */
export const LS_WHITELIST: ReadonlySet<string> = new Set([
  'finp_mode',
  'finp_onboarded',
  'finp_sync_enabled',
  'finp_sync_consent',
  'finp_last_sync',
  'finp_feedback',
  'finp_backup_reminder_days',
  'finp_theme_mode',
  'finp_layout_scelto',
  'finp_active_tab',
  'finp_altro_sezione',
  'finp_dati_tab',
  'finp_from_altro',
  'finp_vasca_resume_asked',
  'finp_last_auto_update_check',
  'finp_remote_version',
  IDB_STATE_KEY,
]);

/** true se la chiave deve restare in localStorage (impostazione piccola). */
export function isLocalStorageKey(key: string): boolean {
  return LS_WHITELIST.has(key);
}

/** Chiavi alla migrazione: prefisso finp* e non whitelist. */
function eChiaveDati(key: string): boolean {
  return (key.startsWith('finp_') || key.startsWith('finpcoach_')) && !LS_WHITELIST.has(key);
}

type Modalita = 'ls' | 'idb';
let modalita: Modalita = 'ls';
let db: IDBDatabase | null = null;

const cache = new Map<string, string>();
const sporchi = new Set<string>();
const cancellati = new Set<string>();
const DEBOUNCE_MS = 200;
let timerFlush: ReturnType<typeof setTimeout> | null = null;
let codaFlush: Promise<void> = Promise.resolve();
let hookInstallato = false;

export function kvPronto(): boolean {
  return modalita === 'idb';
}

/** Solo per test: riporta il modulo allo stato iniziale (stessa DB finisce).
 *  NON usare a runtime. */
export function __resetKvStoreForTest(): void {
  modalita = 'ls';
  try { db?.close(); } catch { /* noop */ }
  db = null;
  cache.clear();
  sporchi.clear();
  cancellati.clear();
  if (timerFlush != null) {
    clearTimeout(timerFlush);
    timerFlush = null;
  }
}

// ---------------- IndexedDB di basso livello ----------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'k' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction error'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction abort'));
  });
}

async function idbGet(chiave: string): Promise<string | null> {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    try {
      const tx = db!.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(chiave);
      req.onsuccess = () => resolve((req.result as { v?: string } | undefined)?.v ?? null);
      req.onerror = () => reject(req.error ?? new Error('IDB get error'));
    } catch (e) {
      reject(e);
    }
  });
}

async function idbGetAll(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!db) return out;
  await new Promise<void>((resolve, reject) => {
    try {
      const tx = db!.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        for (const rec of (req.result ?? []) as { k?: string; v?: string }[]) {
          if (typeof rec?.k === 'string' && typeof rec?.v === 'string') out.set(rec.k, rec.v);
        }
        resolve();
      };
      req.onerror = () => reject(req.error ?? new Error('IDB getAll error'));
    } catch (e) {
      reject(e);
    }
  });
  return out;
}

async function idbClear(): Promise<void> {
  if (!db) return;
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await txDone(tx);
}

async function idbPut(chiave: string, valore: string): Promise<void> {
  if (!db) return;
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ k: chiave, v: valore });
  await txDone(tx);
}

// ---------------- checksum / conteggio (verifica migrazione) ----------------

/** Hash FNV-1a 32 bit: checksum rapido e deterministico della stringa grezza. */
export function checksumStringa(raw: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Numero di elementi "logici" del valore: lunghezza se array, 1 altrimenti. */
export function conteggioElementi(raw: string): number {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.length : 1;
  } catch {
    return -1; // JSON illeggibile: la verifica usa solo checksum+lunghezza
  }
}

interface VerificaVoce {
  bytes: number;
  hash: number;
  count: number;
}

function verificaDi(raw: string): VerificaVoce {
  return { bytes: raw.length, hash: checksumStringa(raw), count: conteggioElementi(raw) };
}

function verificaOk(raw: string, v: VerificaVoce): boolean {
  const letto = verificaDi(raw);
  return letto.bytes === v.bytes && letto.hash === v.hash && letto.count === v.count;
}

// ---------------- migrazione localStorage -> IndexedDB ----------------

function leggiTutteDaLocalStorage(): { k: string; raw: string }[] {
  const out: { k: string; raw: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !eChiaveDati(k)) continue;
      const raw = localStorage.getItem(k);
      if (raw != null) out.push({ k, raw });
    }
  } catch {
    /* storage non disponibile */
  }
  return out;
}

async function scriviTuttoInIdb(voci: { k: string; raw: string }[]): Promise<void> {
  if (!db) throw new Error('IDB non aperta');
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const { k, raw } of voci) store.put({ k, v: raw });
  await txDone(tx);
}

/** Snapshot compresso (gzip) dei dati grezzi, conservato in IDB prima di cancellare LS. */
async function scriviSnapshotPreMigrazione(voci: { k: string; raw: string }[]): Promise<void> {
  const payload = JSON.stringify({ ts: Date.now(), voci: Object.fromEntries(voci.map(v => [v.k, v.raw])) });
  let daSalvare = payload;
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const buf = await new Response(new Blob([payload]).stream().pipeThrough(cs)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      daSalvare = btoa(bin);
    }
  } catch {
    /* fallback: JSON grezzo (IDB regge dimensioni ben oltre LS) */
  }
  await idbPut(PRE_MIGRATION_SNAPSHOT_KEY, daSalvare);
}

/**
 * Migrazione LS -> IDB. Ritorna true se completata (marcatore scritto e
 * chiavi cancellate da LS). False => ls resta autoritativa, si riprova dopo.
 */
async function migraDaLocalStorage(): Promise<boolean> {
  try {
    const voci = leggiTutteDaLocalStorage();
    const verifiche = new Map<string, VerificaVoce>();
    for (const { k, raw } of voci) verifiche.set(k, verificaDi(raw));

    // IDB non è fidata senza marcatore: si riparte da zero (anche se una
    // migrazione precedente era stata interrotta a metà).
    await idbClear();
    await scriviTuttoInIdb(voci);

    // Verifica per ogni chiave: lettura di ritorno da IDB.
    for (const { k } of voci) {
      const v = verifiche.get(k)!;
      const riletto = await idbGet(k);
      if (riletto == null || !verificaOk(riletto, v)) {
        console.error('Migrazione storage: verifica fallita per', k);
        return false;
      }
    }

    // Snapshot compresso PRIMA di toccare localStorage.
    await scriviSnapshotPreMigrazione(voci);

    // Marcatore: da qui in poi IDB è autoritativa.
    const checksumTotale = voci.reduce((a, v) => (a + verificaDi(v.raw).hash) >>> 0, 0);
    await idbPut(
      MIGRATION_META_KEY,
      JSON.stringify({ v: 1, ts: Date.now(), chiavi: voci.length, checksum: checksumTotale })
    );
    try {
      localStorage.setItem(IDB_STATE_KEY, 'v1');
    } catch {
      /* puntatore best-effort */
    }

    // Solo ora si eliminano le chiavi pesanti da localStorage.
    for (const { k } of voci) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* residuo: la pulizia post-idratazione riproverà */
      }
    }
    return true;
  } catch (e) {
    console.error('Migrazione storage LS->IDB fallita:', e);
    return false;
  }
}

/** Marcatore presente? (letto da IDB) */
async function migrazioneCompiuta(): Promise<boolean> {
  try {
    return (await idbGet(MIGRATION_META_KEY)) != null;
  } catch {
    return false;
  }
}

/** IDB autorevole: elimina da LS le chiavi dati residue (crash fra marcatore e delete). */
function pulisciResiduiLocalStorage(): void {
  try {
    const daCancellare: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && eChiaveDati(k)) daCancellare.push(k);
    }
    for (const k of daCancellare) localStorage.removeItem(k);
  } catch {
    /* noop */
  }
}

async function idrataCache(): Promise<void> {
  cache.clear();
  const tutte = await idbGetAll();
  for (const [k, v] of tutte) {
    if (k.startsWith('__')) continue; // meta/snapshot interni
    cache.set(k, v);
  }
}

function installaHookFlush(): void {
  if (hookInstallato || typeof window === 'undefined') return;
  hookInstallato = true;
  const flush = () => {
    if (sporchi.size > 0 || cancellati.size > 0) void flushKvStore();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('blur', flush);
}

/**
 * Avvio: apre IDB, richiede persistenza, migra se serve, idrata la cache.
 * MAI lancia: in caso di errore resta in modalità 'ls'.
 */
export async function bootKvStore(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    modalita = 'ls';
    return;
  }
  try {
    db = await openDb();
  } catch (e) {
    console.error('IndexedDB non disponibile, fallback localStorage:', e);
    modalita = 'ls';
    return;
  }
  try {
    const nav = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } };
    if (nav.storage?.persist) void nav.storage.persist().catch(() => false);
  } catch {
    /* noop */
  }

  try {
    if (!(await migrazioneCompiuta())) {
      const ok = await migraDaLocalStorage();
      if (!ok) {
        modalita = 'ls';
        return;
      }
    } else {
      pulisciResiduiLocalStorage();
    }
    await idrataCache();
    modalita = 'idb';
    installaHookFlush();
  } catch (e) {
    console.error('bootKvStore fallito, fallback localStorage:', e);
    modalita = 'ls';
  }
}

// ---------------- API sincrona (cache / fallback LS) ----------------

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  localStorage.setItem(key, value); // può lanciare (quota): i chiamanti gestiscono
}

function lsDel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function kvGet(key: string): string | null {
  if (isLocalStorageKey(key) || modalita === 'ls') return lsGet(key);
  return cache.has(key) ? cache.get(key)! : null;
}

export function kvSet(key: string, value: string): void {
  if (isLocalStorageKey(key)) {
    lsSet(key, value);
    return;
  }
  if (modalita === 'ls') {
    lsSet(key, value);
    return;
  }
  cache.set(key, value);
  cancellati.delete(key);
  sporchi.add(key);
  if (timerFlush == null) {
    timerFlush = setTimeout(() => {
      timerFlush = null;
      void flushKvStore();
    }, DEBOUNCE_MS);
  }
}

export function kvDel(key: string): void {
  if (isLocalStorageKey(key)) {
    lsDel(key);
    return;
  }
  if (modalita === 'ls') {
    lsDel(key);
    return;
  }
  cache.delete(key);
  sporchi.delete(key);
  cancellati.add(key);
  if (timerFlush == null) {
    timerFlush = setTimeout(() => {
      timerFlush = null;
      void flushKvStore();
    }, DEBOUNCE_MS);
  }
}

/** Per test/diagnostica: chiavi dati correnti in cache. */
export function kvCacheKeys(): string[] {
  return Array.from(cache.keys());
}

// ---------------- flush ----------------

function scriviBatch(): Promise<void> {
  if (!db || (sporchi.size === 0 && cancellati.size === 0)) return Promise.resolve();
  const daScrivere = Array.from(sporchi);
  const daCancellare = Array.from(cancellati);
  sporchi.clear();
  cancellati.clear();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db!.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const k of daScrivere) {
        const v = cache.get(k);
        if (v != null) store.put({ k, v });
      }
      for (const k of daCancellare) store.delete(k);
      txDone(tx).then(resolve, reject);
    } catch (e) {
      // Ripristina le chiavi nel dirty set: il prossimo flush riprova.
      for (const k of daScrivere) sporchi.add(k);
      for (const k of daCancellare) cancellati.add(k);
      reject(e);
    }
  });
}

/**
 * Persiste subito tutte le scritture in coda. Chiamare prima di
 * export/import/snapshot e su eventi di chiusura (pagehide/visibility).
 */
export function flushKvStore(): Promise<void> {
  codaFlush = codaFlush.then(scriviBatch).catch((e) => {
    console.error('flushKvStore fallito:', e);
  });
  return codaFlush;
}

// ---------------- facade StorageLike (per runMigrations e simili) ----------------

/** Oggetto compatibile con Storage.getItem/setItem/removeItem sul backend corrente. */
export const kvStorage = {
  getItem: (key: string) => kvGet(key),
  setItem: (key: string, value: string) => kvSet(key, value),
  removeItem: (key: string) => kvDel(key),
};
