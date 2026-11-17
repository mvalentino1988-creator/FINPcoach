import { describe, it, expect } from 'vitest';
import { StaffetteService } from './staffetteService';
import { Atleta } from '../types';

const mkAtleta = (id: number, classeS?: number): Atleta => ({
  id, nome: `N${id}`, cognome: `C${id}`,
  classeS, stato: 'UFFICIALE', fattoreVolume: 1.0, note: '', volumeAuto: true,
});

const config = (tetto: number, atleti: Atleta[], conStili = false) => ({
  tipo: '4x50m' as const,
  tettoPuntiMax: tetto,
  atleti: atleti.map((a, i) => ({
    atleta: a,
    ordine: (i + 1) as 1 | 2 | 3 | 4,
    stile: conStili ? 'STILE_LIBERO' : undefined,
  })),
});

describe('StaffetteService.getPuntiClasse', () => {
  it('punti = classe S (1-14)', () => {
    expect(StaffetteService.getPuntiClasse(mkAtleta(1, 5))).toBe(5);
    expect(StaffetteService.getPuntiClasse(mkAtleta(1, 14))).toBe(14);
  });
  it('classe assente -> 0', () => {
    expect(StaffetteService.getPuntiClasse(mkAtleta(1))).toBe(0);
  });
});

describe('StaffetteService.calcolaStaffetta', () => {
  it('staffetta valida sotto il tetto', () => {
    const atleti = [mkAtleta(1, 3), mkAtleta(2, 4), mkAtleta(3, 5), mkAtleta(4, 6)];
    const r = StaffetteService.calcolaStaffetta(config(20, atleti));
    expect(r.valida).toBe(true);
    expect(r.puntiTotali).toBe(18);
    expect(r.eccedenzaPunti).toBe(0);
    expect(r.composizione).toHaveLength(4);
  });

  it('staffetta invalida oltre il tetto segnala l eccedenza', () => {
    const atleti = [mkAtleta(1, 10), mkAtleta(2, 11), mkAtleta(3, 12), mkAtleta(4, 13)];
    const r = StaffetteService.calcolaStaffetta(config(20, atleti));
    expect(r.valida).toBe(false);
    expect(r.puntiTotali).toBe(46);
    expect(r.eccedenzaPunti).toBe(26);
    expect(r.avvisi.some(a => a.includes('TETTO PUNTI SUPERATO'))).toBe(true);
  });

  it('atleta senza classe genera avviso', () => {
    const atleti = [mkAtleta(1, 3), mkAtleta(2), mkAtleta(3, 5), mkAtleta(4, 6)];
    const r = StaffetteService.calcolaStaffetta(config(49, atleti));
    expect(r.avvisi.some(a => a.includes('senza classe'))).toBe(true);
  });

  it('assegnazione stili parziale genera avviso informativo', () => {
    const atleti = [mkAtleta(1, 3), mkAtleta(2, 4), mkAtleta(3, 5), mkAtleta(4, 6)];
    const r = StaffetteService.calcolaStaffetta(config(49, atleti, true));
    expect(r.valida).toBe(true);
    expect(r.composizione.every(c => c.stileAssegnato === 'STILE_LIBERO')).toBe(true);
  });
});

describe('StaffetteService.suggerisciStaffette e getTettiDisponibili', () => {
  it('meno di 4 atleti -> nessun suggerimento', () => {
    expect(StaffetteService.suggerisciStaffette([mkAtleta(1, 3)], '4x50m', 20)).toEqual([]);
  });

  it('sceglie i 4 con punti piu bassi', () => {
    const atleti = [mkAtleta(1, 12), mkAtleta(2, 2), mkAtleta(3, 8), mkAtleta(4, 5), mkAtleta(5, 14)];
    const suggerimenti = StaffetteService.suggerisciStaffette(atleti, '4x50m', 49);
    expect(suggerimenti).toHaveLength(1);
    expect(suggerimenti[0].puntiTotali).toBe(2 + 5 + 8 + 12);
  });

  it('getTettiDisponibili restituisce tetti ordinati per tipo', () => {
    expect(StaffetteService.getTettiDisponibili('4x50m')).toEqual([20, 34, 49]);
    expect(StaffetteService.getTettiDisponibili('4x100m')).toEqual([20, 34, 49]);
  });
});
