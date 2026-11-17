import { describe, it, expect } from 'vitest';
import {
  pad2,
  formatDataInput,
  parseData,
  formattaData,
  toISO,
  addDays,
  addWeeks,
  daysBetween,
  weeksBetween,
  yearsBetween,
  getDayOfWeek,
  previousOrSameMonday,
  nextOrSameSunday,
  nextOrSameMonday,
  setDayOfWeekInWeek,
  isBefore,
  isAfter,
  isInRange,
} from './dateUtils';

describe('pad2 / formatDataInput', () => {
  it('pad2 completa a due cifre', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
  it('formatDataInput costruisce gg/mm/aaaa progressivamente', () => {
    expect(formatDataInput('1')).toBe('1');
    expect(formatDataInput('12')).toBe('12');
    expect(formatDataInput('123')).toBe('12/3');
    expect(formatDataInput('1234')).toBe('12/34');
    expect(formatDataInput('12342025')).toBe('12/34/2025');
    expect(formatDataInput('123420251')).toBe('12/34/2025');
  });
});

describe('parseData', () => {
  it.each([
    ['12/03/2025', '2025-03-12'],
    ['12-03-2025', '2025-03-12'],
    ['2025-3-12', '2025-03-12'],
    ['2025-03-12', '2025-03-12'],
  ])('parsa "%s" -> %s', (input, atteso) => {
    expect(parseData(input)).toBe(atteso);
  });

  it.each(['', '32/13/2025', '2025-13-40', 'abc', '12/03'])('rifiuta "%s"', (input) => {
    expect(parseData(input)).toBeNull();
  });
});

describe('formattaData / round-trip', () => {
  it('formattata in italiano', () => {
    expect(formattaData('2025-03-12')).toBe('12/03/2025');
    expect(formattaData('2025-03-12T00:00:00Z')).toBe('2025-03-12T00:00:00Z');
    expect(formattaData(null)).toBe('');
    expect(formattaData(undefined)).toBe('');
  });
  it('parseData(formattaData(x)) è idempotente', () => {
    expect(parseData(formattaData('2025-03-12'))).toBe('2025-03-12');
  });
});

describe('aritmetica date', () => {
  it('toISO e addDays attraversano i mesi', () => {
    expect(toISO(new Date(2025, 0, 31))).toBe('2025-01-31');
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // anno bisestile
  });

  it('addWeeks aggiunge 7 giorni per settimana', () => {
    expect(addWeeks('2025-01-06', 1)).toBe('2025-01-13');
    expect(addWeeks('2025-01-06', -2)).toBe('2024-12-23');
  });

  it('daysBetween e weeksBetween', () => {
    expect(daysBetween('2025-01-01', '2025-01-08')).toBe(7);
    expect(daysBetween('2025-01-08', '2025-01-01')).toBe(-7);
    expect(weeksBetween('2025-01-01', '2025-01-22')).toBe(3);
  });

  it('yearsBetween calcola l eta correttamente', () => {
    expect(yearsBetween('2000-06-15', '2025-06-14')).toBe(24);
    expect(yearsBetween('2000-06-15', '2025-06-15')).toBe(25);
    expect(yearsBetween('2000-06-15', '2025-05-01')).toBe(24);
  });
});

describe('giorni della settimana', () => {
  it('getDayOfWeek: 1=lunedì ... 7=domenica', () => {
    expect(getDayOfWeek('2025-01-06')).toBe(1); // lunedì
    expect(getDayOfWeek('2025-01-12')).toBe(7); // domenica
    expect(getDayOfWeek('2025-01-07')).toBe(2); // martedì
  });

  it('previousOrSameMonday / nextOrSameSunday / nextOrSameMonday', () => {
    expect(previousOrSameMonday('2025-01-08')).toBe('2025-01-06'); // mer -> lun
    expect(previousOrSameMonday('2025-01-06')).toBe('2025-01-06'); // lun -> se stesso
    expect(nextOrSameSunday('2025-01-08')).toBe('2025-01-12'); // mer -> dom
    expect(nextOrSameSunday('2025-01-12')).toBe('2025-01-12'); // dom -> se stesso
    expect(nextOrSameMonday('2025-01-08')).toBe('2025-01-13'); // mer -> lun dopo
    expect(nextOrSameMonday('2025-01-06')).toBe('2025-01-06'); // lun -> se stesso
  });

  it('setDayOfWeekInWeek e isInRange', () => {
    const lun = '2025-01-06';
    expect(setDayOfWeekInWeek(lun, 1)).toBe('2025-01-06');
    expect(setDayOfWeekInWeek(lun, 7)).toBe('2025-01-12');
    expect(setDayOfWeekInWeek(lun, 5)).toBe('2025-01-10');
    expect(isInRange('2025-01-10', '2025-01-06', '2025-01-12')).toBe(true);
    expect(isInRange('2025-01-13', '2025-01-06', '2025-01-12')).toBe(false);
    expect(isBefore('2025-01-01', '2025-01-02')).toBe(true);
    expect(isAfter('2025-01-02', '2025-01-01')).toBe(true);
  });
});
