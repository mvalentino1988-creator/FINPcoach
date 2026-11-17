import { describe, it, expect } from 'vitest';
import { ParserApprendimento, fattoreUnitaDaNome, escapeRegExp } from './parserApprendimento';

describe('fattoreUnitaDaNome / escapeRegExp', () => {
  it('fattori unita', () => {
    expect(fattoreUnitaDaNome('m')).toBe(1);
    expect(fattoreUnitaDaNome('km')).toBe(1000);
    expect(fattoreUnitaDaNome('unita-sconosciuta')).toBe(1); // fallback a metri
  });
  it('escapeRegExp protegge i caratteri speciali', () => {
    expect(escapeRegExp('4x50 (a+b)')).toBe('4x50 \\(a\\+b\\)');
  });
});

describe('ParserApprendimento.analizzaStandard', () => {
  const analizza = (riga: string) => ParserApprendimento.analizzaStandard(riga);

  it('NxM semplice', () => {
    expect(analizza('8x50')).toEqual({ compreso: true, ripetizioni: 8, distanza: 50, metriTotali: 400 });
    expect(analizza('3x100 libero')).toEqual({ compreso: true, ripetizioni: 3, distanza: 100, metriTotali: 300 });
  });

  it('unita con m/km', () => {
    expect(analizza('400m')).toEqual({ compreso: true, ripetizioni: 1, distanza: 400, metriTotali: 400 });
    expect(analizza('1.5km')).toEqual({ compreso: true, ripetizioni: 1, distanza: 1500, metriTotali: 1500 });
    expect(analizza('2,5 km')).toEqual({ compreso: true, ripetizioni: 1, distanza: 2500, metriTotali: 2500 });
  });

  it('numero semplice >= 25', () => {
    expect(analizza('400')).toEqual({ compreso: true, ripetizioni: 1, distanza: 400, metriTotali: 400 });
    expect(analizza('1500 m')).toBeTruthy();
  });

  it('composito (3x100 + 2x50) X2', () => {
    const r = analizza('(3x100 + 2x50) X2');
    expect(r).not.toBeNull();
    expect(r!.metriTotali).toBe((300 + 100) * 2);
  });

  it('somma con +', () => {
    const r = analizza('4x50 + 200');
    expect(r).not.toBeNull();
    expect(r!.metriTotali).toBe(400);
  });

  it('input non valido -> null', () => {
    expect(analizza('')).toBeNull();
    expect(analizza('abc')).toBeNull();
    expect(analizza('0x0')).toBeNull();
    expect(analizza('10')).toBeNull(); // < 25
  });
});

describe('ParserApprendimento.estraiEtichetta', () => {
  it('separa etichetta e contenuto', () => {
    const r = ParserApprendimento.estraiEtichetta('Riscaldamento: 400m');
    expect(r.etichetta).toBe('Riscaldamento');
    expect(r.contenuto).toBe('400m');
  });
  it('senza etichetta -> solo contenuto', () => {
    const r = ParserApprendimento.estraiEtichetta('8x50 libero');
    expect(r.contenuto).toBe('8x50 libero');
  });
});

describe('ParserApprendimento.suggerisciInterpretazione', () => {
  it('suggerisce NXM per pattern x', () => {
    const s = ParserApprendimento.suggerisciInterpretazione('4x50 stile');
    expect(s?.tipo).toBe('NXM');
    expect(s?.ripetizioni).toBe(4);
    expect(s?.distanza).toBe(50);
  });
  it('suggerisce UNITA per km/m', () => {
    const s = ParserApprendimento.suggerisciInterpretazione('2 km facili');
    expect(s?.tipo).toBe('UNITA');
    expect(s?.distanza).toBe(2000);
  });
  it('testo senza numeri -> null', () => {
    expect(ParserApprendimento.suggerisciInterpretazione('nuoto libero')).toBeNull();
  });
});
