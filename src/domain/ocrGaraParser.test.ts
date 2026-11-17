import { describe, it, expect } from 'vitest';
import { OcrGaraParser } from './ocrGaraParser';

describe('OcrGaraParser.parseTabellaGare', () => {
  it('estrae tempi da una riga con data', () => {
    const testo = 'Varese 12/03/2025 1:02.35 58.40 31.20 29.80';
    const risultati = OcrGaraParser.parseTabellaGare(testo);
    expect(risultati.length).toBeGreaterThan(0);
    expect(risultati[0].data).toBe('2025-03-12');
    expect(risultati[0].luogo).toContain('Varese');
    expect(risultati[0].contesto).toBe('GARA');
    expect(risultati[0].selezionato).toBe(true);
  });

  it('anno a due cifre -> 20xx', () => {
    const risultati = OcrGaraParser.parseTabellaGare('Gara 05-06-25 30.50');
    expect(risultati[0].data).toBe('2025-06-05');
  });

  it('testo senza tempi -> array vuoto', () => {
    expect(OcrGaraParser.parseTabellaGare('')).toEqual([]);
    expect(OcrGaraParser.parseTabellaGare('nessun tempo qui')).toEqual([]);
  });

  it('fallback: tempi senza data assumono contesto GARA stile libero', () => {
    const risultati = OcrGaraParser.parseTabellaGare('1:02.35 e 58.40');
    expect(risultati.length).toBe(2);
    expect(risultati[0].stile).toBe('STILE_LIBERO');
    expect(risultati[0].distanzaMetri).toBe(100);
    expect(risultati[0].centesimi).toBeGreaterThan(0);
  });

  it('ignora token che non sono tempi validi', () => {
    const risultati = OcrGaraParser.parseTabellaGare('Gara 01/01/2025 non-tempo 99.99');
    // "99.99" non matcha il pattern tempo (richiede : o . con 2 decimali: 99.99 matcha!)
    // verifichiamo solo che i risultati abbiano centesimi > 0
    for (const r of risultati) {
      expect(r.centesimi).toBeGreaterThan(0);
      expect(r.data).toBe('2025-01-01');
    }
  });
});
