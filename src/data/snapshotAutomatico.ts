/**
 * Snapshot automatici di protezione dati.
 *
 * Prima di ogni sostituzione massiva (import backup, seed demo, reset,
 * avvio squadre vuota, migrazione) si salva uno snapshot completo dei dati
 * correnti in `finp_snapshot_auto_v1`: un array di al massimo 3 voci.
 *
 * Formati delle voci:
 *  - inline (dataset piccoli, <= SNAPSHOT_COMPRESS_MIN_BYTES): { ts, voci }
 *    con i valori GREZZI (stringhe JSON) di ogni chiave — storico;
 *  - compresso (dataset grandi): { ts, v: 2, gz, numAtleti } dove `gz` è il
 *    JSON dei `voci` compresso con gzip (CompressionStream) e codificato in
 *    base64. Il numero di atleti è salvato in chiaro per le anteprime.
 *
 * Vengono esclusi deliberatamente:
 *  - `finp_ia_config` (contiene la chiave API: mai duplicare segreti);
 *  - `finp_ultimo_backup` (metadato derivato, non un dato);
 *  - le chiavi di snapshot stesso.
 *
 * Il ripristino riscrive i valori grezzi così com'erano, anche se una
 * sezione era corrotta: è un undo fedele, non un merge.
 * `ripristinaSnapshot` è asincrono perché può dover decomprimere.
 */

export const SNAPSHOT_KEY = 'finp_snapshot_auto_v1';
export const SNAPSHOT_MAX = 3;
/** Soglia oltre la quale lo snapshot viene compresso con gzip. */
export const SNAPSHOT_COMPRESS_MIN_BYTES = 400_000;

/** Chiavi i cui dati utente vengono salvati (valori letterali, vedi STORAGE_KEYS). */
export const SNAPSHOT_DATA_KEYS: readonly string[] = [
  'finp_mode',
  'finp_atleti',
  'finp_condizioni',
  'finp_assenze',
  'finp_tempi',
  'finp_log_sedute',
  'finp_stagione',
  'finp_chiusure',
  'finp_gare',
  'finp_iscrizioni_gare',
  'finp_macrocicli',
  'finp_mesocicli',
  'finp_microcicli',
  'finp_impostazioni',
  'finp_firma_piano',
  'finp_classi_stimate',
  'finpcoach_custom_workouts',
  'finp_vasca_assegnazione_v1',
];

export interface SnapshotVoce {
  ts: number;
  voci: Record<string, string | null>;
}

/** Voce snapshot v2 (compressa gzip). */
export interface SnapshotVoceCompressa {
  ts: number;
  v: 2;
  /** JSON di `voci` compresso gzip, base64. */
  gz: string;
  numAtleti: number;
}

export type SnapshotEntry = SnapshotVoce | SnapshotVoceCompressa;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isCompressa(e: unknown): e is SnapshotVoceCompressa {
  return (
    !!e &&
    typeof e === 'object' &&
    (e as SnapshotVoceCompressa).v === 2 &&
    typeof (e as SnapshotVoceCompressa).gz === 'string'
  );
}

export function listaSnapshot(): SnapshotEntry[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is SnapshotEntry =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as { ts?: unknown }).ts === 'number' &&
        (isCompressa(x) || (!!(x as SnapshotVoce).voci && typeof (x as SnapshotVoce).voci === 'object'))
    );
  } catch {
    return [];
  }
}

// ---------------- compressione gzip (CompressionStream) ----------------

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function comprimi(testo: string): Promise<string | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const cs = new CompressionStream('gzip');
    const stream = new Blob([testo]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return b64encode(buf);
  } catch {
    return null;
  }
}

async function decomprimi(b64: string): Promise<string | null> {
  try {
    if (typeof DecompressionStream === 'undefined') return null;
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([b64decode(b64)]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  }
}

function contaAtleti(voci: Record<string, string | null>): number {
  const raw = voci['finp_atleti'];
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// Coda serializzata delle scritture snapshot: ogni snapshot comprime in modo
// asincrono, ma le scritture su SNAPSHOT_KEY non si accavallano mai.
let codaSnapshot: Promise<void> = Promise.resolve();

function accodaScritturaSnapshot(lavoro: () => Promise<void>): void {
  codaSnapshot = codaSnapshot.then(lavoro).catch(() => {
    /* snapshot best-effort: un errore non deve propagarsi */
  });
}

/** Attende che eventuali scritture snapshot in coda siano completate (test/diagnostica). */
export function snapshotFlush(): Promise<void> {
  return codaSnapshot;
}

/**
 * Salva uno snapshot dei dati correnti. È un no-op se non c'è NIENTE da
 * proteggere (tutti i valori null): il primo avvio non produce snapshot.
 * Ritorna true se uno snapshot è stato accodato per la scrittura.
 *
 * Per dataset grandi (> SNAPSHOT_COMPRESS_MIN_BYTES) la voce viene compressa
 * con gzip in modo asincrono: la funzione ritorna subito, la scrittura è
 * garantita da `snapshotFlush()`.
 */
export function salvaSnapshotDati(): boolean {
  const s = storage();
  if (!s) return false;
  const voci: Record<string, string | null> = {};
  let something = false;
  let bytes = 0;
  for (const k of SNAPSHOT_DATA_KEYS) {
    let raw: string | null = null;
    try {
      raw = s.getItem(k);
    } catch {
      raw = null;
    }
    voci[k] = raw;
    bytes += raw?.length ?? 0;
    // La sola modalità (demo/live) non è un dato da proteggere: non deve
    // bastare a creare uno snapshot.
    if (k !== 'finp_mode' && raw != null && raw !== 'null' && raw !== '[]' && raw !== '{}') something = true;
  }
  if (!something) return false;

  const numAtleti = contaAtleti(voci);
  const ts = Date.now();

  if (bytes <= SNAPSHOT_COMPRESS_MIN_BYTES) {
    // Dataset piccolo: scrittura sincrona inline (comportamento storico).
    const voce: SnapshotVoce = { ts, voci };
    try {
      const lista = [...listaSnapshot(), voce].sort((a, b) => b.ts - a.ts).slice(0, SNAPSHOT_MAX);
      s.setItem(SNAPSHOT_KEY, JSON.stringify(lista));
    } catch {
      /* quota piena */
    }
    return true;
  }

  accodaScritturaSnapshot(async () => {
    const jsonVoci = JSON.stringify(voci);
    const gz = await comprimi(jsonVoci);
    if (gz == null) {
      // Compressione non disponibile: fallback a snapshot inline (potrebbe
      // fallire per quota, ma è il comportamento precedente).
      const voce: SnapshotVoce = { ts, voci };
      const lista = [...listaSnapshot(), voce].sort((a, b) => b.ts - a.ts).slice(0, SNAPSHOT_MAX);
      s.setItem(SNAPSHOT_KEY, JSON.stringify(lista));
      return;
    }
    const voce: SnapshotVoceCompressa = { ts, v: 2, gz, numAtleti };
    const lista = [...listaSnapshot(), voce].sort((a, b) => b.ts - a.ts).slice(0, SNAPSHOT_MAX);
    s.setItem(SNAPSHOT_KEY, JSON.stringify(lista));
  });
  return true;
}

export interface SnapshotInfo {
  ts: number;
  numAtleti: number;
}

/** Info dello snapshot più recente (per l'anteprima nel UI). */
export function infoSnapshotPiuRecente(): SnapshotInfo | null {
  const lista = listaSnapshot();
  const primo = lista[0];
  if (!primo) return null;
  if (isCompressa(primo)) return { ts: primo.ts, numAtleti: primo.numAtleti };
  return { ts: primo.ts, numAtleti: contaAtleti(primo.voci) };
}

async function vociDi(entry: SnapshotEntry): Promise<Record<string, string | null> | null> {
  if (!isCompressa(entry)) return entry.voci;
  const json = await decomprimi(entry.gz);
  if (json == null) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, string | null>;
  } catch {
    return null;
  }
}

/**
 * Ripristina lo snapshot più recente (o quello con ts indicato).
 * Riscrive i valori grezzi; chiavi assenti dallo snapshot vengono
 * rimosse. Ritorna true se il ripristino è stato scritto.
 * Asincrono: può dover decomprimere una voce gzip.
 */
export async function ripristinaSnapshot(ts?: number): Promise<boolean> {
  const s = storage();
  if (!s) return false;
  const lista = listaSnapshot();
  const idx = ts == null ? 0 : lista.findIndex(x => x.ts === ts);
  if (idx < 0) return false;
  const voci = await vociDi(lista[idx]);
  if (voci == null) return false;
  for (const k of SNAPSHOT_DATA_KEYS) {
    const raw = voci[k];
    try {
      if (raw == null) s.removeItem(k);
      else s.setItem(k, raw);
    } catch {
      /* quota piena: il ripristino è best-effort */
    }
  }
  return true;
}
