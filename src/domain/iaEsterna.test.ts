import { describe, expect, it } from 'vitest';
import { IAContesto, costruisciPromptScheda, estraiRisposta, rispostaToTesto } from './iaEsterna';

const ctx: IAContesto = {
  data: '2025-01-10',
  atleta: null,
  squadra: true,
  etaAtleta: null,
  fase: 'PREPARAZIONE_SPECIFICA',
  tipoMicro: 'CARICO',
  parametri: { vascaMetri: 25, durataMin: 90 },
  volumeSessione: 1800,
  volumeSettimana: 5400,
  tempi: [],
};

describe('iaEsterna', () => {
  it(' costruisce un prompt con i codici scelti e richiesta solo JSON', () => {
    const prompt = costruisciPromptScheda(ctx, ['B1', 'C1']);

    expect(prompt).toContain('B1 + C1');
    expect(prompt).toContain('Codici già scelti');
    expect(prompt).toContain('SOLO JSON');
    expect(prompt).toContain('Non inserire diagnosi');
    expect(prompt).not.toContain('Paraplegia');
    expect(prompt).not.toContain('spasticita');
  });

  it('estrae e converte una risposta JSON in righe di scheda', () => {
    const json = `\`\`\`json
{
  "titolo": "Seduta",
  "serie": [
    { "sezione": "Principale", "codice": "B1", "ripetizioni": 4, "distanza": 100, "descrizione": "soglia" }
  ],
  "note": "ok"
}
\`\`\``;

    const risposta = estraiRisposta(json);
    expect(risposta).not.toBeNull();
    const testo = risposta ? rispostaToTesto(risposta) : '';
    expect(testo).toContain('Principale');
    expect(testo).toContain('4x100');
    expect(testo).toContain('B1');
  });
});
