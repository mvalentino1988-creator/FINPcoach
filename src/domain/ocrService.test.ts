import { describe, it, expect } from 'vitest';
import { OCRService } from './ocrService';
import { estraiRisposta, rispostaToTesto, costruisciPromptScheda, configIAValida } from './iaEsterna';

describe('OCR - rilevamento modalita', () => {
  it('riconosce una scheda di allenamento', () => {
    const testo = [
      'Riscaldamento 400m stile libero',
      '4x100m a 1\'30" recuperi 20"',
      'Defaticamento 200m',
    ].join('\n');
    expect(OCRService.rilevaModalita(testo)).toBe('scheda');
  });

  it('riconosce una gara dai tempi e dalla classifica', () => {
    const testo = [
      'Batteria 1 - 100m Stile Libero Femminile',
      '1  ROSSI Anna   1\'05"32   2026-10-22',
      'Classifica finale: 2 SEMAFORO',
    ].join('\n');
    expect(OCRService.rilevaModalita(testo)).toBe('gara');
  });

  it('resta "auto" su un testo non classificabile', () => {
    expect(OCRService.rilevaModalita('')).toBe('auto');
    expect(OCRService.rilevaModalita('pippo pluto')).toBe('auto');
  });
});

describe('IA esterna - parsing risposta', () => {
  it('estrae il JSON anche con code fence', () => {
    const testo = 'Ecco la scheda:\n```json\n{"titolo":"Seduta 1","serie":[{"sezione":"Riscaldamento","codice":"A1","ripetizioni":4,"distanza":100,"descrizione":"stile libero"}]}\n```';
    const risposta = estraiRisposta(testo);
    expect(risposta).not.toBeNull();
    expect(risposta?.titolo).toBe('Seduta 1');
    expect(risposta?.serie).toHaveLength(1);
    expect(risposta?.serie[0].distanza).toBe(100);
  });

  it('rifiuta risposte non conformi', () => {
    expect(estraiRisposta('non e\' un json')).toBeNull();
    expect(estraiRisposta('{"serie":[]}')).toBeNull();
  });

  it('converte la risposta nel testo delle schede manuali', () => {
    const risposta = estraiRisposta(
      '{"titolo":"T","serie":[{"sezione":"Riscaldamento","codice":"a1","ripetizioni":4,"distanza":100,"descrizione":"libero"}]}'
    );
    expect(risposta).not.toBeNull();
    const testo = rispostaToTesto(risposta!);
    expect(testo).toContain('Riscaldamento');
    expect(testo).toContain('4x100');
    expect(testo).toContain('A1');
  });

  it('costruisce un prompt con vasca, durata e volume', () => {
    const prompt = costruisciPromptScheda({
      data: '2026-10-22',
      atleta: null,
      squadra: true,
      etaAtleta: null,
      fase: 'PREPARAZIONE_SPECIFICA',
      tipoMicro: 'CARICO',
      parametri: { vascaMetri: 50, durataMin: 90 },
      volumeSessione: 2500,
      volumeSettimana: 9000,
      condizioni: [],
      tempi: [],
      note: [],
    });
    expect(prompt).toContain('Vasca: 50 metri');
    expect(prompt).toContain('90 minuti');
    expect(prompt).toContain('2500 m');
    expect(prompt).toContain('JSON');
  });

  it('la configurazione IA e\' valida solo con endpoint, modello e key', () => {
    expect(configIAValida({ endpoint: '', model: 'gpt', apiKey: 'k', providerWeb: 'chatgpt' })).toBe(false);
    expect(configIAValida({ endpoint: 'https://x/v1', model: '', apiKey: 'k', providerWeb: 'chatgpt' })).toBe(false);
    expect(configIAValida({ endpoint: 'https://x/v1', model: 'gpt', apiKey: 'k', providerWeb: 'chatgpt' })).toBe(true);
  });
});
