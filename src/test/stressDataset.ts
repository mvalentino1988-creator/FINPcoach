/**
 * Caricamento del dataset di stress A2 in memoria per i test.
 * Usa lo stesso generatore di scripts/qa/gen-stress-core.ts (sem fisso):
 * il dataset generato qui è identico a scripts/qa/out/stress-100.json.
 */
import { generaDatasetStress, SEME_DEFAULT } from '../../scripts/qa/gen-stress-core';

export interface DatasetStressCaricato {
  backup: Record<string, unknown>;
  json: string;
  manifest: Record<string, unknown>;
}

let cache: DatasetStressCaricato | null = null;

/** Dataset di stress (100 atleti simulati). Generato una volta per processo. */
export function datasetStress(): DatasetStressCaricato {
  if (!cache) {
    const { backup, manifest } = generaDatasetStress(SEME_DEFAULT);
    cache = { backup, json: JSON.stringify(backup), manifest };
  }
  return cache;
}

/** Forza la rigenerazione con un seme diverso (test di determinismo). */
export function datasetStressConSeme(seme: number): DatasetStressCaricato {
  const { backup, manifest } = generaDatasetStress(seme);
  return { backup, json: JSON.stringify(backup), manifest };
}
