/**
 * Snapshot automatici di protezione dati.
 *
 * Prima di ogni sostituzione massiva (import backup, seed demo, reset,
 * avvio squadre vuota, migrazione) si salva uno snapshot completo dei dati
 * correnti in `finp_snapshot_auto_v1`: un array di al massimo 3 voci
 * { ts, voci } con i valori GREZZI (stringhe JSON) di ogni chiave.
 *
 * Vengono esclusi deliberatamente:
 *  - `finp_ia_config` (contiene la chiave API: mai duplicare segreti);
 *  - `finp_ultimo_backup` (metadato derivato, non un dato);
 *  - le chiavi di snapshot stesso.
 *
 * Il ripristino riscrive i valori grezzi così com'erano, anche se una
 * sezione era corrotta: è un undo fedele, non un merge.
 */

export const SNAPSHOT_KEY = 'finp_snapshot_auto_v1';
export const SNAPSHOT_MAX = 3;

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

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function listaSnapshot(): SnapshotVoce[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is SnapshotVoce =>
        !!x && typeof x === 'object' && typeof x.ts === 'number' && !!x.voci && typeof x.voci === 'object'
    );
  } catch {
    return [];
  }
}

/**
 * Salva uno snapshot dei dati correnti. È un no-op se non c'è NIENTE da
 * proteggere (tutti i valori null): il primo avvio non produce snapshot.
 * Ritorna true se uno snapshot è stato effettivamente scritto.
 */
export function salvaSnapshotDati(): boolean {
  const s = storage();
  if (!s) return false;
  const voci: Record<string, string | null> = {};
  let something = false;
  for (const k of SNAPSHOT_DATA_KEYS) {
    let raw: string | null = null;
    try {
      raw = s.getItem(k);
    } catch {
      raw = null;
    }
    voci[k] = raw;
    // La sola modalità (demo/live) non è un dato da proteggere: non deve
    // bastare a creare uno snapshot.
    if (k !== 'finp_mode' && raw != null && raw !== 'null' && raw !== '[]' && raw !== '{}') something = true;
  }
  if (!something) return false;

  const lista = listaSnapshot();
  lista.unshift({ ts: Date.now(), voci });
  const tagliata = lista.slice(0, SNAPSHOT_MAX);
  try {
    s.setItem(SNAPSHOT_KEY, JSON.stringify(tagliata));
    return true;
  } catch {
    return false;
  }
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
  let numAtleti = 0;
  try {
    const raw = primo.voci['finp_atleti'];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) numAtleti = parsed.length;
    }
  } catch {
    /* JSON corrotto: riporta 0 */
  }
  return { ts: primo.ts, numAtleti };
}

/**
 * Ripristina lo snapshot più recente (o quello con ts indicato).
 * Riscrive i valori grezzi; chiavi assenti dallo snapshot vengono
 * rimosse. Ritorna true se il ripristino è stato scritto.
 */
export function ripristinaSnapshot(ts?: number): boolean {
  const s = storage();
  if (!s) return false;
  const lista = listaSnapshot();
  const idx = ts == null ? 0 : lista.findIndex(x => x.ts === ts);
  if (idx < 0) return false;
  const snap = lista[idx];
  for (const k of SNAPSHOT_DATA_KEYS) {
    const raw = snap.voci[k];
    try {
      if (raw == null) s.removeItem(k);
      else s.setItem(k, raw);
    } catch {
      /* quota piena: il ripristino è best-effort */
    }
  }
  return true;
}
