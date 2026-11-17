import { describe, it, expect } from 'vitest';
import {
  VASCHE_VALIDE,
  DURATA_MIN,
  DURATA_MAX,
  DURATA_DEFAULT_MIN,
  normalizzaVasca,
  normalizzaDurata,
  normalizzaParametri,
  parametriUguali,
  risolviParametriSeduta,
  conParametriGiorno,
  conOverride,
  senzaOverride,
  dateSettimana,
  seduteSettimana,
  seduteResidue,
} from './parametriSeduta';
import { ImpostazioniPiano, Stagione, DayOfWeekNum } from '../types';

const STAGIONE: Stagione = {
  id: 1, nome: '2025/26', inizio: '2025-09-01', fine: '2026-06-30', vascaMetri: 25,
};

describe('normalizzazione', () => {
  it('normalizzaVasca accetta solo 25 o 50', () => {
    expect(normalizzaVasca(25)).toBe(25);
    expect(normalizzaVasca(50)).toBe(50);
    expect(normalizzaVasca(33)).toBe(25);
    expect(normalizzaVasca(null, 50)).toBe(50);
    expect(normalizzaVasca(undefined)).toBe(25);
  });

  it('normalizzaDurata clamp tra DURATA_MIN e DURATA_MAX', () => {
    expect(normalizzaDurata(90)).toBe(90);
    expect(normalizzaDurata(10)).toBe(DURATA_MIN);
    expect(normalizzaDurata(500)).toBe(DURATA_MAX);
    expect(normalizzaDurata(0)).toBe(DURATA_DEFAULT_MIN);
    expect(normalizzaDurata(-5)).toBe(DURATA_DEFAULT_MIN);
    expect(normalizzaDurata(NaN)).toBe(DURATA_DEFAULT_MIN);
    expect(normalizzaDurata(45.6)).toBe(46);
  });

  it('normalizzaParametri valida corsie e atleti', () => {
    const p = normalizzaParametri({
      vascaMetri: 50,
      durataMin: 60,
      numeroCorsie: 99,
      atletiPresentiIds: [1, 1, 2, 'x' as unknown as number],
    });
    expect(p.vascaMetri).toBe(50);
    expect(p.numeroCorsie).toBe(8); // clamp a 8
    expect(p.atletiPresentiIds).toEqual([1, 2]); // dedup + filtro
    expect(VASCHE_VALIDE).toEqual([25, 50]);
  });
});

describe('parametriUguali', () => {
  const base = { vascaMetri: 25, durataMin: 90 };
  it('confronta tutti i campi', () => {
    expect(parametriUguali(base, { ...base })).toBe(true);
    expect(parametriUguali(base, { ...base, durataMin: 91 })).toBe(false);
    expect(parametriUguali(base, { ...base, numeroCorsie: 4 })).toBe(false);
    expect(parametriUguali(base, { ...base, atletiPresentiIds: [1, 2] })).toBe(false);
    expect(parametriUguali({ ...base, atletiPresentiIds: [2, 1] }, { ...base, atletiPresentiIds: [1, 2] })).toBe(true);
  });
});

describe('risolviParametriSeduta — priorita override > giorno > stagione', () => {
  it('usa la stagione quando non ci sono impostazioni', () => {
    const p = risolviParametriSeduta('2025-09-03', undefined, STAGIONE); // mercoledì
    expect(p.origine).toBe('stagione');
    expect(p.vascaMetri).toBe(25);
    expect(p.durataMin).toBe(DURATA_DEFAULT_MIN);
    expect(p.giornoSettimana).toBe(3);
  });

  it('usa il giorno della settimana se configurato', () => {
    const imp: ImpostazioniPiano = {
      parametriPerGiorno: { 3: { vascaMetri: 50, durataMin: 75 } },
    };
    const p = risolviParametriSeduta('2025-09-03', imp, STAGIONE);
    expect(p.origine).toBe('giorno');
    expect(p.vascaMetri).toBe(50);
    expect(p.durataMin).toBe(75);
  });

  it('l override vince su giorno e stagione', () => {
    const imp: ImpostazioniPiano = {
      parametriPerGiorno: { 3: { vascaMetri: 50, durataMin: 75 } },
      overrideSedute: { '2025-09-03': { vascaMetri: 25, durataMin: 45 } },
    };
    const p = risolviParametriSeduta('2025-09-03', imp, STAGIONE);
    expect(p.origine).toBe('override');
    expect(p.vascaMetri).toBe(25);
    expect(p.durataMin).toBe(45);
  });
});

describe('conParametriGiorno / conOverride / senzaOverride', () => {
  const imp: ImpostazioniPiano = { giorni: [1, 3, 5] };

  it('conParametriGiorno aggiunge senza perdere gli altri giorni', () => {
    const i1 = conParametriGiorno(imp, 1 as DayOfWeekNum, { vascaMetri: 50, durataMin: 60 });
    const i2 = conParametriGiorno(i1, 3 as DayOfWeekNum, { vascaMetri: 25, durataMin: 90 });
    expect(i2.parametriPerGiorno?.[1]?.vascaMetri).toBe(50);
    expect(i2.parametriPerGiorno?.[3]?.durataMin).toBe(90);
    expect(i2.giorni).toEqual([1, 3, 5]);
  });

  it('conOverride e senzaOverride gestiscono la data', () => {
    const i1 = conOverride(imp, '2025-09-03', { vascaMetri: 50, durataMin: 60 });
    expect(i1.overrideSedute?.['2025-09-03']).toBeDefined();
    const i2 = senzaOverride(i1, '2025-09-03');
    expect(i2.overrideSedute?.['2025-09-03']).toBeUndefined();
    // senzaOverride su data assente restituisce lo stesso oggetto
    expect(senzaOverride(i2, '2025-09-04')).toBe(i2);
  });
});

describe('calendario sedute', () => {
  it('dateSettimana restituisce lun-dom', () => {
    const sett = dateSettimana('2025-01-08'); // mercoledì
    expect(sett).toHaveLength(7);
    expect(sett[0]).toBe('2025-01-06');
    expect(sett[6]).toBe('2025-01-12');
  });

  it('seduteSettimana filtra i giorni di allenamento', () => {
    const sedute = seduteSettimana('2025-01-08', [1, 3, 5]);
    expect(sedute).toEqual(['2025-01-06', '2025-01-08', '2025-01-10']); // lun mer ven
  });

  it('seduteResidue esclude i giorni passati della stessa settimana', () => {
    const sedute = seduteResidue('2025-01-08', [1, 3, 5]); // mer
    expect(sedute).toEqual(['2025-01-08', '2025-01-10']); // mer e ven
  });

  it('giorniAllenamento vuoto -> default lun mer ven', () => {
    const sedute = seduteSettimana('2025-01-06', []);
    expect(sedute).toEqual(['2025-01-06', '2025-01-08', '2025-01-10']);
  });
});
