import { describe, it, expect } from 'vitest';
import {
  parseTempo,
  formattaTempo,
  primatiPersonali,
  calcolaPuntiWPS,
  convertiVasca,
} from './tempoUtils';
import { Tempo } from '../types';

describe('parseTempo', () => {
  it.each([
    ['1:02.35', 6235],
    ['62.35', 6235],
    ['28,4', 2840],
    ['60', 6000],
    [' 1:02,35 ', 6235],
    ['0:09.58', 958],
    ['10:00.00', 60000],
  ])('parsa "%s" -> %i centesimi', (input, atteso) => {
    expect(parseTempo(input)).toBe(atteso);
  });

  it.each(['', 'abc', '1:60.00', '0.00', '-5', '1:2:3', '999999'])('rifiuta "%s"', (input) => {
    expect(parseTempo(input)).toBeNull();
  });
});

describe('formattaTempo', () => {
  it.each([
    [6235, '1:02.35'],
    [2840, '28.40'],
    [958, '9.58'],
    [60000, '10:00.00'],
    [0, '0.00'],
    [-100, '0.00'],
    [5, '0.05'],
  ])('%i centesimi -> "%s"', (centesimi, atteso) => {
    expect(formattaTempo(centesimi)).toBe(atteso);
  });
});

const mkTempo = (partial: Partial<Tempo>): Tempo => ({
  id: 1,
  atletaId: 1,
  data: '2025-01-10',
  stile: 'STILE_LIBERO',
  distanzaMetri: 50,
  centesimi: 3000,
  contesto: 'GARA',
  vascaMetri: 25,
  note: '',
  ...partial,
});

describe('primatiPersonali', () => {
  it('prende il miglior tempo per stile/distanza/vasca, solo contesto GARA', () => {
    const tempi = [
      mkTempo({ id: 1, centesimi: 3100, data: '2025-01-01' }),
      mkTempo({ id: 2, centesimi: 3050, data: '2025-02-01' }),
      mkTempo({ id: 3, centesimi: 2900, contesto: 'ALLENAMENTO' }), // non conta
      mkTempo({ id: 4, stile: 'DORSO', centesimi: 3300 }),
    ];
    const primati = primatiPersonali(tempi);
    expect(primati).toHaveLength(2);
    const sl = primati.find(p => p.stile === 'STILE_LIBERO')!;
    expect(sl.centesimi).toBe(3050);
    expect(sl.data).toBe('2025-02-01');
  });

  it('ordina per stile, distanza, vasca', () => {
    const tempi = [
      mkTempo({ stile: 'DORSO', distanzaMetri: 100 }),
      mkTempo({ stile: 'STILE_LIBERO', distanzaMetri: 100 }),
      mkTempo({ stile: 'STILE_LIBERO', distanzaMetri: 50 }),
    ];
    const primati = primatiPersonali(tempi);
    expect(primati.map(p => `${p.stile}_${p.distanzaMetri}`)).toEqual([
      'STILE_LIBERO_50', 'STILE_LIBERO_100', 'DORSO_100',
    ]);
  });

  it('lista vuota -> nessun primato', () => {
    expect(primatiPersonali([])).toEqual([]);
    expect(primatiPersonali([mkTempo({ contesto: 'TEST' })])).toEqual([]);
  });
});

describe('calcolaPuntiWPS', () => {
  it('tempo uguale al record -> 1000 punti', () => {
    expect(calcolaPuntiWPS(6000, 6000)).toBe(1000);
  });
  it('atleta più veloce del record -> più di 1000 punti', () => {
    expect(calcolaPuntiWPS(3000, 6000)).toBe(8000);
  });
  it('atleta più lento -> meno di 1000', () => {
    expect(calcolaPuntiWPS(12000, 6000)).toBe(125);
  });
  it.each([[0, 6000], [6000, 0], [-1, 6000], [6000, -1]])('input non valido %s/%s -> null', (a, b) => {
    expect(calcolaPuntiWPS(a, b)).toBeNull();
  });
});

describe('convertiVasca', () => {
  it('stessa vasca o input non valido -> tempo invariato', () => {
    expect(convertiVasca(6000, 100, 25, 25)).toBe(6000);
    expect(convertiVasca(6000, 100, 25, 50, 9)).toBe(6160);
    expect(convertiVasca(0, 100, 25, 50)).toBe(0);
    expect(convertiVasca(6000, 0, 25, 50)).toBe(6000);
  });

  it('25m -> 50m è più lento (meno virate)', () => {
    const t = convertiVasca(6000, 100, 25, 50, 9);
    expect(t).toBeGreaterThan(6000);
  });

  it('50m -> 25m è più veloce', () => {
    const t = convertiVasca(7000, 100, 50, 25, 9);
    expect(t).toBeLessThan(7000);
    expect(t).toBeGreaterThanOrEqual(100);
  });

  it('classe bassa ha penalità di virata maggiore', () => {
    const bassa = convertiVasca(6000, 200, 25, 50, 3);
    const alta = convertiVasca(6000, 200, 25, 50, 12);
    expect(bassa).toBeGreaterThan(alta);
  });
});
