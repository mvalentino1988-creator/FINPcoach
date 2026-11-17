import { describe, it, expect } from 'vitest';
import { RecordService, CATEGORIE_ITA } from './recordService';
import { Tempo } from '../types';

describe('RecordService — funzioni pure', () => {
  it('tempoCentesimi converte "1:02.35"', () => {
    expect(RecordService.tempoCentesimi('1:02.35')).toBe(6235);
    expect(RecordService.tempoCentesimi('invalid')).toBeNull();
    expect(RecordService.tempoCentesimi('')).toBeNull();
  });

  it('formatta centesimi in italiano', () => {
    expect(RecordService.formatta(6235)).toBe('1:02.35');
    expect(RecordService.formatta(2840)).toBe('28.40');
  });

  it('confronta: delta positivo = piu lento del record', () => {
    const piuLento = RecordService.confronta(6100, 6000);
    expect(piuLento.deltaCentesimi).toBe(100);
    expect(piuLento.migliore).toBe(false);
    expect(piuLento.percentuale).toBeCloseTo(101.67, 1);

    const record = RecordService.confronta(6000, 6000);
    expect(record.migliore).toBe(true);
    expect(record.puntiWPS).toBe(1000);
  });

  it('senza dati caricati -> liste vuote ma nessun errore', () => {
    expect(RecordService.eventi(25)).toEqual([]);
    expect(RecordService.eventiIndividuali(25)).toEqual([]);
    expect(RecordService.meta()).toBeDefined();
    expect(CATEGORIE_ITA).toContain('Assoluto');
  });
});

const mkTempo = (partial: Partial<Tempo>): Tempo => ({
  id: 1, atletaId: 7, data: '2025-01-10', stile: 'STILE_LIBERO',
  distanzaMetri: 50, centesimi: 3000, contesto: 'GARA', vascaMetri: 25, note: '',
  ...partial,
});

describe('RecordService.migliorTempoAtleta / eventoPerTempo / classePerStile', () => {
  it('eventoPerTempo produce "50 Stile Libero"', () => {
    expect(RecordService.eventoPerTempo(mkTempo({}))).toBe('50 Stile Libero');
    expect(RecordService.eventoPerTempo(mkTempo({ stile: 'DORSO' }))).toBe('50 Dorso');
  });

  it('migliorTempoAtleta trova il minimo tra i gare dell atleta', () => {
    const tempi = [
      mkTempo({ id: 1, centesimi: 3100 }),
      mkTempo({ id: 2, centesimi: 3050 }),
      mkTempo({ id: 3, centesimi: 2900, contesto: 'ALLENAMENTO' }), // escluso? no: filtro solo per evento+vasca+atleta
      mkTempo({ id: 4, atletaId: 8, centesimi: 2800 }), // altro atleta
    ];
    const migliore = RecordService.migliorTempoAtleta(tempi, 7, 25, '50 Stile Libero');
    expect(migliore).not.toBeNull();
    // include anche i tempi di allenamento (il filtro non guarda il contesto)
    expect(migliore!.centesimi).toBe(2900);
  });

  it('migliorTempoAtleta: nessun candidato -> null', () => {
    expect(RecordService.migliorTempoAtleta([], 7, 25, '50 Stile Libero')).toBeNull();
    expect(RecordService.migliorTempoAtleta([mkTempo({})], 7, 50, '50 Stile Libero')).toBeNull();
  });

  it('classePerStile: RANA->SB, MISTI->SM, altri->S', () => {
    const atleta = { id: 1, nome: 'T', cognome: 'A', classeS: 9, classeSB: 8, classeSM: 11, stato: 'UFFICIALE' as const, fattoreVolume: 1, note: '', volumeAuto: true };
    expect(RecordService.classePerStile(atleta, 'RANA')).toBe('SB8');
    expect(RecordService.classePerStile(atleta, 'MISTI')).toBe('SM11');
    expect(RecordService.classePerStile(atleta, 'DORSO')).toBe('S9');
    expect(RecordService.classePerStile({ ...atleta, classeS: undefined }, 'DORSO')).toBeNull();
  });
});
