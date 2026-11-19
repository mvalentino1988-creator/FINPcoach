/**
 * A3 — Validità del dataset di stress generato da scripts/qa/gen-stress-core.ts:
 *  - passa validaBackup e importBackup senza errori;
 *  - rispetta le regole di dominio (A1) salvo le incongruenze volute,
 *    elencate nel manifest;
 *  - è identico a ogni esecuzione con lo stesso seme.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { datasetStress, datasetStressConSeme } from '../test/stressDataset';
import { validaBackup } from './backupValidate';
import { isAssenteInData } from '../domain/assenze';
import type {
  Assenza,
  Atleta,
  Gara,
  ImpostazioniPiano,
  IscrizioneGara,
  LogSeduta,
  Tempo,
} from '../types';

// Stub LocalStorage per l'ambiente node (come storage.test.ts).
function storageMemoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}
const ls = storageMemoria();
(globalThis as Record<string, unknown>).localStorage = ls;
(globalThis as Record<string, unknown>).window = { dispatchEvent: () => true };

import { FINPStorage } from './storage';

interface Dati {
  atleti: Atleta[];
  assenze: Assenza[];
  tempi: Tempo[];
  logSedute: LogSeduta[];
  gare: Gara[];
  iscrizioniGare: IscrizioneGara[];
  impostazioni: ImpostazioniPiano;
}

let dati: Dati;
let manifest: Record<string, unknown>;
let json: string;

beforeAll(() => {
  const d = datasetStress();
  dati = d.backup as unknown as Dati;
  manifest = d.manifest;
  json = d.json;
});

describe('dataset stress — validazione backup', () => {
  it('passa validaBackup senza errori', () => {
    const r = validaBackup(json);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('passa importBackup senza errori', () => {
    ls.clear();
    ls.setItem('finp_mode', 'live');
    const r = FINPStorage.importBackup(json);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(FINPStorage.getAtleti()).toHaveLength(100);
    expect(FINPStorage.getIscrizioniGare().length).toBeGreaterThan(0);
  });

  it('è deterministico con lo stesso seme', () => {
    const a = datasetStressConSeme(42);
    const b = datasetStressConSeme(42);
    expect(a.json).toBe(b.json);
  });

  it('i dati sono marcati come simulati', () => {
    const atleti = dati.atleti as Atleta[];
    for (const a of atleti.slice(0, 10)) {
      expect(a.cognome.startsWith('SIM-')).toBe(true);
    }
    const gare = dati.gare as Gara[];
    expect(gare.every(g => g.nome.startsWith('SIM-'))).toBe(true);
    expect((dati as { meta?: { simulato?: boolean } }).meta?.simulato).toBe(true);
  });
});

describe('dataset stress — regole A1', () => {
  const incongruenzeIscritti = new Set<number>();
  const incongruenzeTempi = new Set<number>();
  beforeAll(() => {
    const lista = (manifest.incongruenzeVolute as { tipo: string; iscrizioneId?: number; tempoId?: number }[]) ?? [];
    for (const i of lista) {
      if (i.tipo === 'iscritto_con_assenza' && i.iscrizioneId != null) incongruenzeIscritti.add(i.iscrizioneId);
      if (i.tipo === 'tempo_gara_in_assenza' && i.tempoId != null) incongruenzeTempi.add(i.tempoId);
    }
  });

  it('nessun ISCRITTO con assenza che copre la gara, salvo incongruenze manifestate', () => {
    for (const is of dati.iscrizioniGare) {
      if (is.stato !== 'ISCRITTO') continue;
      if (incongruenzeIscritti.has(is.id)) continue;
      const gara = dati.gare.find(g => g.id === is.garaId);
      if (!gara) continue;
      const coperta = dati.assenze.some(a => {
        if (a.atletaId !== is.atletaId) return false;
        const amb = a.ambito ?? 'TUTTO';
        if (amb === 'ALLENAMENTO') return false;
        if (amb === 'GARA' && a.garaId != null && a.garaId !== gara.id) return false;
        return !(a.dal > gara.al || a.al < gara.dal);
      });
      expect(coperta, `iscrizione ${is.id} (atleta ${is.atletaId}, gara ${gara.id})`).toBe(false);
    }
  });

  it('nessun tempo GARA in data coperta da assenza, salvo incongruenze manifestate', () => {
    for (const t of dati.tempi) {
      if (t.contesto !== 'GARA') continue;
      if (incongruenzeTempi.has(t.id)) continue;
      expect(
        isAssenteInData(t.atletaId, t.data, dati.assenze, 'GARA'),
        `tempo ${t.id} atleta ${t.atletaId} data ${t.data}`
      ).toBe(false);
    }
  });

  it('nessun atleta presente in un log in data coperta da assenza allenamento', () => {
    for (const l of dati.logSedute) {
      if (!l.presente) continue;
      expect(
        isAssenteInData(l.atletaId, l.data, dati.assenze, 'ALLENAMENTO'),
        `log ${l.id} atleta ${l.atletaId} data ${l.data}`
      ).toBe(false);
    }
  });

  it('giorno di prova: esattamente 48 atletiPresentiIds', () => {
    const prova = dati.impostazioni.overrideSedute?.['2026-11-19'];
    expect(prova).toBeDefined();
    expect(prova!.numeroCorsie).toBe(6);
    expect(prova!.atletiPresentiIds).toHaveLength(48);
    const ids = new Set(prova!.atletiPresentiIds);
    expect(ids.size).toBe(48);
  });

  it('tempi: centesimi positivi e vasca coerente', () => {
    // Il vincolo "mai sotto il record ITA" è garantito dal generatore
    // (centesimi >= record+1); qui verifichiamo la coerenza interna.
    for (const t of dati.tempi.slice(0, 500)) {
      expect(t.centesimi).toBeGreaterThan(0);
      expect([25, 50]).toContain(t.vascaMetri);
    }
  });
});
