import { describe, it, expect } from 'vitest';
import { parseTempo, formattaTempo } from './tempoUtils';
import { ParserScheda } from './parserScheda';
import { CalcoloScienzaNuoto } from './calcoloCSS';

describe('FINPcoach Core Domain Tests', () => {
  it('should parse swimming times correctly', () => {
    expect(parseTempo('1:02.35')).toBe(6235);
    expect(parseTempo('28.40')).toBe(2840);
    expect(parseTempo('59.9')).toBe(5990);
    expect(parseTempo('invalid')).toBeNull();
  });

  it('should format swimming times correctly', () => {
    expect(formattaTempo(6235)).toBe('1:02.35');
    expect(formattaTempo(2840)).toBe('28.40');
  });

  it('should calculate meters from workout text correctly', () => {
    const testo = 'Riscaldamento\n4x50 sl r 30"\nSerie principale\n3x100 mix';
    const metri = ParserScheda.calcolaMetriDaTesto(testo);
    expect(metri).toBe(500);
  });

  it('should calculate Critical Swim Speed (CSS)', () => {
    const css = CalcoloScienzaNuoto.calcolaCSS(27000, 6000);
    expect(css).not.toBeNull();
    if (css) {
      expect(css.cssVelocitaMs).toBeGreaterThan(0);
      expect(css.passo100mCentesimi).toBeGreaterThan(0);
    }
  });
});
