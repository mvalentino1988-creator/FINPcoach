/**
 * Registro delle migrazioni dello schema di persistenza.
 *
 * Ogni chiave di LocalStorage ha una versione di schema. All'avvio
 * `runMigrations` confronta la versione registrata in `finp_schema_migrations`
 * con quella corrente e applica le migrazioni mancanti in ordine.
 * È idempotente: eseguirla due volte non cambia nulla.
 *
 * Le migrazioni sono funzioni pure sul valore JSON già parsato:
 *   (value: unknown) => unknown
 * Se il JSON è corrotto la chiave viene saltata (i reader sono già tolleranti)
 * e l'errore è riportato nel risultato.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Migration {
  /** Versione di destinazione (1-based). */
  to: number;
  run: (value: unknown) => unknown;
}

export interface KeySchema {
  key: string;
  /** Versione corrente dello schema per questa chiave. */
  version: number;
  /** Migrazioni ordinate per versione di arrivo. */
  migrations: Migration[];
}

export const MIGRATIONS_KEY = 'finp_schema_migrations';

import { normalizzaAssegnazione } from '../domain/assegnazioneVasca';

/**
 * Schema corrente. Le chiavi esistenti prima del versionamento sono v1;
 * la v2 introduce la normalizzazione esplicita dei dati (assegnazione vasca)
 * e la base per future migrazioni.
 */
export const SCHEMA: KeySchema[] = [
  { key: 'finp_mode', version: 1, migrations: [] },
  { key: 'finp_atleti', version: 1, migrations: [] },
  { key: 'finp_condizioni', version: 1, migrations: [] },
  { key: 'finp_assenze', version: 1, migrations: [] },
  { key: 'finp_tempi', version: 1, migrations: [] },
  { key: 'finp_log_sedute', version: 1, migrations: [] },
  { key: 'finp_stagione', version: 1, migrations: [] },
  { key: 'finp_chiusure', version: 1, migrations: [] },
  { key: 'finp_gare', version: 1, migrations: [] },
  { key: 'finp_macrocicli', version: 1, migrations: [] },
  { key: 'finp_mesocicli', version: 1, migrations: [] },
  { key: 'finp_microcicli', version: 1, migrations: [] },
  { key: 'finp_impostazioni', version: 1, migrations: [] },
  { key: 'finp_firma_piano', version: 1, migrations: [] },
  { key: 'finp_classi_stimate', version: 1, migrations: [] },
  { key: 'finpcoach_custom_workouts', version: 1, migrations: [] },
  { key: 'finp_ia_config', version: 1, migrations: [] },
  { key: 'finp_layout_scelto', version: 1, migrations: [] },
  { key: 'finp_theme_mode', version: 1, migrations: [] },
  { key: 'finp_vasca_session_v1', version: 1, migrations: [] },
  { key: 'finp_ultimo_backup', version: 1, migrations: [] },
  {
    key: 'finp_vasca_assegnazione_v1',
    version: 2,
    migrations: [
      {
        to: 2,
        // v1 -> v2: normalizza la struttura (campi opzionali, clamp, multipli di 5).
        run: value => normalizzaAssegnazione(value) ?? value,
      },
    ],
  },
];

export interface MigrationReport {
  /** Chiavi migrate in questo giro. */
  migrated: string[];
  /** Chiavi il cui JSON era illeggibile (saltate). */
  errors: { key: string; error: string }[];
}

function leggiVersioni(s: StorageLike): Record<string, number> {
  try {
    const raw = s.getItem(MIGRATIONS_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v)) {
      if (typeof n === 'number' && Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Esegue le migrazioni mancanti. Da chiamare una volta all'avvio,
 * prima di leggere i dati. Mai lancia eccezioni.
 */
export function runMigrations(storage: StorageLike): MigrationReport {
  const report: MigrationReport = { migrated: [], errors: [] };
  const versioni = leggiVersioni(storage);
  let dirty = false;

  for (const schema of SCHEMA) {
    const corrente = versioni[schema.key] ?? 1; // le chiavi pre-versionamento sono v1
    if (corrente >= schema.version) {
      // Registra la versione anche se non c'era nulla da migrare.
      if (versioni[schema.key] == null) {
        versioni[schema.key] = schema.version;
        dirty = true;
      }
      continue;
    }

    const raw = storage.getItem(schema.key);
    if (raw == null) {
      // Chiave assente: marca comunque la versione per non riprovare.
      versioni[schema.key] = schema.version;
      dirty = true;
      continue;
    }

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (e) {
      report.errors.push({ key: schema.key, error: e instanceof Error ? e.message : String(e) });
      continue; // non marca la versione: si riproverà al prossimo avvio
    }

    // Applica le migrazioni con `to` crescente oltre la versione corrente.
    let v = corrente;
    for (const m of schema.migrations.filter(m => m.to > v).sort((a, b) => a.to - b.to)) {
      try {
        value = m.run(value);
        v = m.to;
      } catch (e) {
        report.errors.push({ key: schema.key, error: e instanceof Error ? e.message : String(e) });
        break;
      }
    }

    if (v > corrente) {
      try {
        storage.setItem(schema.key, JSON.stringify(value));
        versioni[schema.key] = v;
        report.migrated.push(schema.key);
        dirty = true;
      } catch (e) {
        report.errors.push({ key: schema.key, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  if (dirty) {
    try {
      storage.setItem(MIGRATIONS_KEY, JSON.stringify(versioni));
    } catch {
      /* quota piena: le migrazioni sono già state applicate */
    }
  }
  return report;
}

/** Versione registrata per una chiave (per test e diagnostica). */
export function versioneSchema(storage: StorageLike, key: string): number | undefined {
  return leggiVersioni(storage)[key];
}
