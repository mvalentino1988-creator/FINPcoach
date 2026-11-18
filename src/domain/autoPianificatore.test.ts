import { describe, it, expect } from 'vitest';
import { AutoPianificatore } from './autoPianificatore';
import { Atleta, Stagione, CondizioneMedica } from '../types';

const mkAtleta = (partial: Partial<Atleta> = {}): Atleta => ({
  id: 1, nome: 'T', cognome: 'A', stato: 'UFFICIALE',
  fattoreVolume: 1.0, note: '', volumeAuto: true, ...partial,
});

describe('AutoPianificatore — date stagione', () => {
  it('inizioStagioneSuggerito: stagioneStarting a settembre, lunedì', () => {
    // 2025-03-15 -> stagione inizia set 2024
    const inizio = AutoPianificatore.inizioStagioneSuggerito('2025-03-15');
    expect(inizio.startsWith('2024-09')).toBe(true);
    // deve essere un lunedì
    const giorno = new Date(inizio + 'T12:00:00').getDay();
    expect(giorno).toBe(1);
  });

  it('inizioStagioneSuggerito: dopo luglio -> anno corrente', () => {
    const inizio = AutoPianificatore.inizioStagioneSuggerito('2025-08-01');
    expect(inizio.startsWith('2025-09')).toBe(true);
  });

  it('fineStagioneSuggerita: giugno anno successivo', () => {
    expect(AutoPianificatore.fineStagioneSuggerita('2025-09-01')).toBe('2026-06-30');
    expect(AutoPianificatore.fineStagioneSuggerita('2025-03-01')).toBe('2025-06-30');
  });

  it('nomeStagione formato anno o anno/anno', () => {
    expect(AutoPianificatore.nomeStagione('2025-09-01', '2026-06-30')).toBe('2025/26');
    expect(AutoPianificatore.nomeStagione('2025-01-01', '2025-12-31')).toBe('2025');
  });

  it('garaProbabilmentePrioritaria riconosce parole chiave', () => {
    expect(AutoPianificatore.garaProbabilmentePrioritaria('Campionati Italiani')).toBe(true);
    expect(AutoPianificatore.garaProbabilmentePrioritaria('Gara Locale')).toBe(false);
    expect(AutoPianificatore.garaProbabilmentePrioritaria('')).toBe(false);
  });
});

describe('AutoPianificatore.parametriAuto', () => {
  it('senza stagione ne storico -> default', () => {
    const p = AutoPianificatore.parametriAuto([], [], null, '2025-06-01');
    expect(p.giorniAllenamento).toEqual([3, 6]); // mercoledì sabato
    expect(p.numeroMacrocicli).toBe(1);
    expect(p.metriBaseSeduta).toBe(1800);
  });

  it('stagione lunga -> 2 macrocicli', () => {
    const stagione: Stagione = {
      id: 1, nome: 'Lunga', inizio: '2024-09-01', fine: '2026-06-30', vascaMetri: 25,
    };
    const p = AutoPianificatore.parametriAuto([], [], stagione, '2025-06-01');
    expect(p.numeroMacrocicli).toBe(2);
  });
});

describe('AutoPianificatore.fattoreVolumeSuggerito', () => {
  const OGGI = '2025-06-15';

  it('eta adulta sana -> 1.0', () => {
    const a = mkAtleta({ dataNascita: '1995-01-01' }); // 30 anni
    expect(AutoPianificatore.fattoreVolumeSuggerito(a, [], OGGI)).toBe(1.0);
  });

  it('bambino piccolo -> fattore ridotto', () => {
    const a = mkAtleta({ dataNascita: '2018-01-01' }); // ~7 anni
    const f = AutoPianificatore.fattoreVolumeSuggerito(a, [], OGGI);
    expect(f).toBeLessThanOrEqual(0.6);
    expect(f).toBeGreaterThanOrEqual(0.4);
  });

  it('senza data di nascita -> 1.0', () => {
    expect(AutoPianificatore.fattoreVolumeSuggerito(mkAtleta(), [], OGGI)).toBe(1.0);
  });

  it('atleta anziano -> ridotto', () => {
    const a = mkAtleta({ dataNascita: '1960-01-01' }); // 65 anni
    expect(AutoPianificatore.fattoreVolumeSuggerito(a, [], OGGI)).toBeLessThan(1.0);
  });

  it('condizione medica con classe bassa riduce ulteriormente', () => {
    const a = mkAtleta({ dataNascita: '1990-01-01', classeS: 2 });
    const cond: CondizioneMedica[] = [{
      id: 1, atletaId: 1, descrizione: 'lesione midollare',
      limitazioni: 'limitata', attiva: true,
    }];
    const f = AutoPianificatore.fattoreVolumeSuggerito(a, cond, OGGI);
    expect(f).toBeLessThan(1.0);
  });
});
