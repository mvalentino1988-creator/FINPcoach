import { describe, expect, it } from 'vitest';
import { costruisciArchivioStagione, logNellaStagione } from './archivioStagione';
import { Gara, LogSeduta, Stagione } from '../types';

const stagione: Stagione = {
  id: 1,
  nome: 'Stagione 2026-27',
  inizio: '2026-09-01',
  fine: '2027-06-30',
} as Stagione;

const log: LogSeduta[] = [
  { id: 1, atletaId: 1, data: '2026-09-05', presente: true, durataMin: 60, metriEffettivi: 1800, note: '' },
  { id: 2, atletaId: 1, data: '2027-06-30', presente: true, durataMin: 60, metriEffettivi: 1800, note: '' },
  { id: 3, atletaId: 2, data: '2027-07-01', presente: true, durataMin: 60, metriEffettivi: 1800, note: '' },
  { id: 4, atletaId: 2, data: '2025-01-10', presente: true, durataMin: 60, metriEffettivi: 1500, note: '' },
  { id: 5, atletaId: 3, data: '2026-08-31', presente: false, durataMin: 0, metriEffettivi: 0, note: '' },
];

const gare: Gara[] = [
  { id: 10, nome: 'Gara A', dal: '2026-10-01', al: '2026-10-03', prioritaria: false },
] as Gara[];

describe('logNellaStagione', () => {
  it('include i bordi e esclude fuori periodo', () => {
    expect(logNellaStagione('2026-09-01', stagione)).toBe(true);
    expect(logNellaStagione('2027-06-30', stagione)).toBe(true);
    expect(logNellaStagione('2027-07-01', stagione)).toBe(false);
    expect(logNellaStagione('2026-08-31', stagione)).toBe(false);
  });
});

describe('costruisciArchivioStagione', () => {
  it('racchiude solo le sedute nel periodo della stagione', () => {
    const arch = costruisciArchivioStagione({
      stagione,
      chiusure: [],
      gare,
      iscrizioniGare: [],
      macrocicli: [],
      mesocicli: [],
      microcicli: [],
      log,
      esportatoIl: '2027-07-02T00:00:00.000Z',
    });
    expect(arch.tipo).toBe('finpcoach-archivio-stagione');
    expect(arch.version).toBe('1.0');
    expect(arch.esportatoIl).toBe('2027-07-02T00:00:00.000Z');
    expect(arch.stagione).toBe(stagione);
    expect(arch.gare).toHaveLength(1);
    // Restano solo id 1 e 2 (dentro il periodo).
    expect(arch.logSedute.map(l => l.id)).toEqual([1, 2]);
  });
});
