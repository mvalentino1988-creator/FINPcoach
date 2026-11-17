import { describe, it, expect } from 'vitest';
import { RegolamentiService } from './regolamentiService';

describe('RegolamentiService — comportamento senza dati caricati', () => {
  it('meta/documenti/sezioni restituiscono vuoti senza errori', () => {
    expect(RegolamentiService.meta()).toBeDefined();
    expect(Array.isArray(RegolamentiService.documenti())).toBe(true);
    expect(RegolamentiService.documento('inesistente')).toBeNull();
    expect(RegolamentiService.sezioni('inesistente')).toEqual([]);
    expect(RegolamentiService.capitoli('inesistente')).toEqual([]);
    expect(RegolamentiService.cerca('classi sportive')).toEqual([]);
    expect(RegolamentiService.cerca('')).toEqual([]);
  });

  it('suggerimenti restituisce lista non vuota', () => {
    const s = RegolamentiService.suggerimenti();
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('classi sportive');
  });
});
