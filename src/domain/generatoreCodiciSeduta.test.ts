import { describe, expect, it } from 'vitest';
import { CondizioneMedica, CodiceAllenamentoKey } from '../types';
import { codiciConsentiti, generaCodiciSeduta } from './generatoreCodiciSeduta';

const CODICI_VALIDI = new Set<CodiceAllenamentoKey>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D']);

const condizione = (descrizione: string, limitazioni = ''): CondizioneMedica => ({
  id: 1,
  atletaId: 1,
  descrizione,
  limitazioni,
  attiva: true,
});

describe('generatoreCodiciSeduta', () => {
  it('propone solo codici validi e al massimo due', () => {
    const { codici } = generaCodiciSeduta({
      fase: 'PREPARAZIONE_SPECIFICA',
      tipoMicro: 'CARICO',
      etaAtleta: 20,
      condizioni: [],
    });

    expect(codici.length).toBeGreaterThan(0);
    expect(codici.length).toBeLessThanOrEqual(2);
    for (const codice of codici) expect(CODICI_VALIDI.has(codice)).toBe(true);
  });

  it('esclude il lattacido alto con condizione neurologica', () => {
    const condizioni = [condizione('Paraplegia T6', 'spasticita e affaticamento')];
    const opts = {
      fase: 'PRE_GARA' as const,
      tipoMicro: 'CARICO' as const,
      etaAtleta: 24,
      condizioni,
    };

    const { codici } = generaCodiciSeduta(opts);
    expect(codici).not.toContain('C1');
    expect(codici).not.toContain('C2');
    expect(codiciConsentiti(opts)).not.toContain('C1');
    expect(codiciConsentiti(opts)).not.toContain('C2');
  });

  it('tiene il focus sul fondo per un atleta molto giovane', () => {
    const { codici } = generaCodiciSeduta({
      fase: 'COMPETITIVA',
      tipoMicro: 'CARICO',
      etaAtleta: 10,
      condizioni: [],
    });

    expect(codici).not.toContain('C1');
    expect(codici).not.toContain('C2');
  });
});
