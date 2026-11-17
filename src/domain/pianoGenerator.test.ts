import { describe, it, expect } from 'vitest';
import { PianoGenerator } from './pianoGenerator';
import { Gara, ParametriPiano, Stagione, DayOfWeekNum } from '../types';

const STAGIONE: Stagione = {
  id: 1, nome: 'Test', inizio: '2025-09-01', fine: '2025-12-31', vascaMetri: 25,
};

const PARAMETRI: ParametriPiano = {
  giorniAllenamento: [1, 3, 5] as DayOfWeekNum[],
  numeroMacrocicli: 1,
  metriBaseSeduta: 2000,
  settimaneCicloCarico: 4,
};

const GARA: Gara = {
  id: 1, stagioneId: 1, nome: 'Campionati', dal: '2025-11-10', al: '2025-11-12',
  luogo: 'Varese', prioritaria: true,
};

describe('PianoGenerator.genera', () => {
  it('genera macro/meso/micro per una stagione valida', () => {
    const piano = PianoGenerator.genera(STAGIONE, [], [GARA], PARAMETRI);
    expect(piano.length).toBeGreaterThan(0);
    expect(piano[0].macro.nome).toContain('Macrociclo');
    expect(piano[0].macro.stagioneId).toBe(1);
    expect(piano[0].meso.length).toBeGreaterThan(0);
    for (const m of piano[0].meso) {
      expect(m.micro.length).toBeGreaterThan(0);
      for (const mic of m.micro) {
        expect(mic.inizio <= mic.fine || mic.fine === '').toBe(true);
      }
    }
  });

  it('stagione senza allenamenti -> piano vuoto', () => {
    const piano = PianoGenerator.genera(STAGIONE, [], [GARA], { ...PARAMETRI, giorniAllenamento: [] });
    expect(piano).toEqual([]);
  });

  it('gara oltre la fine della stagione estende la fine effettiva', () => {
    const garaLunga: Gara = { ...GARA, al: '2026-03-01', dal: '2026-02-28' };
    const piano = PianoGenerator.genera(STAGIONE, [], [garaLunga], PARAMETRI);
    const ultimaFine = piano[piano.length - 1].macro.fine;
    expect(ultimaFine >= '2026-02-22').toBe(true); // copre la gara estesa
  });

  it('parametri coerenti: volume target > 0 nei micro', () => {
    const piano = PianoGenerator.genera(STAGIONE, [], [GARA], PARAMETRI);
    const micro = piano[0].meso[0].micro[0];
    expect(micro.volumeTargetMetri).toBeGreaterThan(0);
    expect(micro.sedutePreviste).toBeGreaterThan(0);
  });
});
