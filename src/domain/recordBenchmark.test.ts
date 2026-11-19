import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { __setPayloadRecordForTest } from '../data/staticData';
import { RecordFINP } from './recordService';
import {
  recordPerRiferimento,
  clusterRecord,
  classiPerStile,
  confrontoAtletaRecord,
  classeRecordPerStile
} from './recordBenchmark';
import { BiomechanicsEngine } from './biomechanicsEngine';
import { HydrodynamicsEngine } from './hydrodynamicsEngine';
import { Tempo } from '../types';

const rec = (partial: Partial<RecordFINP>): RecordFINP => ({
  v: 25, g: 'M&F', ev: '50 Stile Libero', cl: 'S9', t: 'ITA', cat: 'Assoluto',
  tm: '25.00', d: 'Atleta Reale', y: 2024, n: 'ITA', l: 'Roma', dt: '12/06/2024', m: 'Gare Nazionali',
  ...partial
});

const PAYLOAD = {
  meta: { fonte: 'test', aggiornato: '26/07/2026', url: '', nota: '' },
  records: [
    rec({ cl: 'S1', ev: '50 Stile Libero', tm: '40.00', d: 'Detentore S1' }),
    rec({ cl: 'S9', ev: '50 Stile Libero', tm: '25.50', d: 'Detentore S9 ITA', t: 'ITA' }),
    rec({ cl: 'S9', ev: '50 Stile Libero', tm: '24.00', d: 'Detentore S9 WR', t: 'WR' }),
    rec({ cl: 'S9', ev: '100 Stile Libero', tm: '57.00', d: 'Detentore 100', t: 'WR', v: 50 }),
    rec({ cl: 'SB3', ev: '50 Rana', tm: '35.00', d: 'Detentore SB3', t: 'EUR' }),
    rec({ cl: 'SM5', ev: '100 Misti', tm: '80.00', d: 'Detentore SM5', t: 'ITA', cat: 'Ragazzi' })
  ]
};

beforeAll(() => __setPayloadRecordForTest(PAYLOAD));
afterAll(() => __setPayloadRecordForTest(null));

describe('recordBenchmark — riferimenti reali', () => {
  it('trova il record ITA Assoluto per classe/evento/vasca', () => {
    const r = recordPerRiferimento('Italiano', 'S9', 'STILE_LIBERO', 50, 25);
    expect(r.disponibile).toBe(true);
    expect(r.centesimi).toBe(2550);
    expect(r.detentore).toBe('Detentore S9 ITA');
    expect(r.velocitaMedia).toBeCloseTo(50 / 25.5, 3);
  });

  it('livello Mondiale usa WR, non ITA', () => {
    const r = recordPerRiferimento('Mondiale', 'S9', 'STILE_LIBERO', 50, 25);
    expect(r.centesimi).toBe(2400);
    expect(r.detentore).toBe('Detentore S9 WR');
  });

  it('nessun record -> disponibile=false, nessun nome inventato', () => {
    const r = recordPerRiferimento('Italiano', 'S14', 'FARFALLA', 400, 50);
    expect(r.disponibile).toBe(false);
    expect(r.detentore).toBeNull();
    expect(r.velocitaMedia).toBeNull();
  });

  it('clusterRecord copre S1-S14 e restituisce solo classi con record', () => {
    const cluster = clusterRecord('Italiano', 'STILE_LIBERO', 50, null, 25);
    const classi = cluster.map(p => p.classe);
    expect(classi).toContain('S1');
    expect(classi).toContain('S9');
    expect(classi).not.toContain('S14'); // nessun record nel payload
    expect(classiPerStile('RANA').some(c => c.startsWith('SB'))).toBe(true);
    expect(classiPerStile('MISTI').some(c => c.startsWith('SM'))).toBe(true);
    expect(classiPerStile('DORSO').some(c => c.startsWith('SB'))).toBe(false);
  });

  it('BiomechanicsEngine.generaClusterElite non produce nomi inventati', () => {
    const punti = BiomechanicsEngine.generaClusterElite('Italiano', 'STILE_LIBERO', 50, null, 25);
    expect(punti.length).toBeGreaterThan(0);
    for (const p of punti) {
      expect(p.atletaNome).not.toMatch(/Top10|Elite Competitor/);
      expect(p.velocitaMedia).toBeGreaterThan(0);
    }
  });

  it('HydrodynamicsEngine.benchmarkRecord usa il record reale o []', () => {
    const ok = HydrodynamicsEngine.benchmarkRecord('Italiano', 'S9', 'STILE_LIBERO', 50, 0.42, 25);
    expect(ok).toHaveLength(1);
    expect(ok[0].velocitaMedia).toBeCloseTo(50 / 25.5, 3);
    expect(ok[0].nome).toContain('Detentore S9 ITA');
    expect(ok[0].nome).not.toContain('Elite Competitor');

    const vuoto = HydrodynamicsEngine.benchmarkRecord('Italiano', 'S14', 'FARFALLA', 400, 0.42, 50);
    expect(vuoto).toEqual([]);
  });

  it('confrontoAtletaRecord calcola % del record per ogni evento', () => {
    const tempi: Tempo[] = [
      { id: 1, atletaId: 7, data: '2025-01-10', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 3000, contesto: 'GARA', vascaMetri: 25, note: '' },
      { id: 2, atletaId: 7, data: '2025-01-10', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 2800, contesto: 'GARA', vascaMetri: 25, note: '' },
      { id: 3, atletaId: 8, data: '2025-01-10', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 2000, contesto: 'GARA', vascaMetri: 25, note: '' }
    ];
    const res = confrontoAtletaRecord(tempi, 7, 'S9', 'Italiano');
    expect(res).toHaveLength(1);
    expect(res[0].tempoAtletaCentesimi).toBe(2800); // migliore dei due
    expect(res[0].confronto).not.toBeNull();
    expect(res[0].confronto!.migliore).toBe(false);
    expect(res[0].confronto!.percentuale).toBeCloseTo((2800 / 2550) * 100, 1);
  });

  it('classeRecordPerStile mappa S/SB/SM correttamente', () => {
    expect(classeRecordPerStile({ classeS: 9, classeSB: 3, classeSM: 5 }, 'RANA')).toBe('SB3');
    expect(classeRecordPerStile({ classeS: 9, classeSB: 3, classeSM: 5 }, 'MISTI')).toBe('SM5');
    expect(classeRecordPerStile({ classeS: 9, classeSB: 3, classeSM: 5 }, 'DORSO')).toBe('S9');
    expect(classeRecordPerStile({}, 'STILE_LIBERO')).toBeNull();
  });

  it('casi limite: velocità 0 e tempi non validi', () => {
    expect(BiomechanicsEngine.calcolaCostoEnergetico(0)).toBe(0);
    expect(BiomechanicsEngine.calcolaVelocitaMedia(50, 0)).toBe(0);
    expect(BiomechanicsEngine.calcolaCostoEnergetico(2)).toBeCloseTo(110 + 300, 5);
  });
});
