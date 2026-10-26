import { describe, it, expect, beforeEach } from 'vitest';
import { ParserScheda } from './parserScheda';
import { ParserApprendimento, escapeRegExp } from './parserApprendimento';

describe('Parser schede - etichette iniziali', () => {
  it('riconosce "Riscaldamento 400m" come etichetta + 400 metri', () => {
    const serie = ParserScheda.parseSerie('Riscaldamento 400m');
    expect(serie).toHaveLength(1);
    expect(serie[0].sezione).toBe('Riscaldamento');
    expect(serie[0].metriTotali).toBe(400);
    expect(serie[0].descrizione).toBe('400m');
  });

  it('riconosce "Riscaldamento 4x100"', () => {
    const serie = ParserScheda.parseSerie('Riscaldamento 4x100');
    expect(serie[0].sezione).toBe('Riscaldamento');
    expect(serie[0].ripetizioni).toBe(4);
    expect(serie[0].distanza).toBe(100);
    expect(serie[0].metriTotali).toBe(400);
  });

  it('riconosce etichetta con separatore', () => {
    const serie = ParserScheda.parseSerie('T finale: 2x50 forte');
    expect(serie[0].sezione).toBe('T finale');
    expect(serie[0].metriTotali).toBe(100);
  });

  it('non crea etichette quando la riga inizia con un numero', () => {
    const serie = ParserScheda.parseSerie('8x50 libero');
    expect(serie[0].sezione).toBeUndefined();
    expect(serie[0].metriTotali).toBe(400);
  });

  it('non conta metri per righe senza numeri (intestazioni di sezione)', () => {
    const serie = ParserScheda.parseSerie('Riscaldamento\nSerie principale\n4x50 sl');
    expect(serie).toHaveLength(3);
    expect(serie[0].metriTotali).toBe(0);
    expect(serie[1].metriTotali).toBe(0);
    expect(serie[2].metriTotali).toBe(200);
  });

  it('gestisce composizioni con "+" e con parentesi', () => {
    expect(ParserScheda.calcolaMetriDaTesto('3x100 b1 + 2x50 forte')).toBe(400);
    expect(ParserScheda.calcolaMetriDaTesto('(3x100 + 2x50) X2')).toBe(800);
  });

  it('gestisce le unita km', () => {
    const serie = ParserScheda.parseSerie('1.5km sciolto');
    expect(serie[0].metriTotali).toBe(1500);
  });
});

describe('Parser - apprendimento realmente applicato', () => {
  beforeEach(() => {
    ParserApprendimento.svuotaRegole();
  });

  it('le regole apprese vengono davvero applicate al parsing', () => {
    const riga = 'blocco speciale 6 vasche';
    // Nessun pattern standard riconosce questa riga
    expect(ParserScheda.calcolaMetriDaTesto(riga)).toBe(0);

    // Il coach corregge: "6 vasche" = 6 ripetizioni da 75m
    ParserApprendimento.aggiungiRegola({
      pattern: escapeRegExp(riga),
      tipo: 'NXM',
      descrizione: '6 vasche = 6x75',
      distanza: 75,
      ripetizioni: 6,
    });

    const serie = ParserScheda.parseSerie(riga);
    expect(serie[0].metriTotali).toBe(450);
    expect(serie[0].ripetizioni).toBe(6);
    expect(serie[0].distanza).toBe(75);
    expect(serie[0].regolaAppresa).toBe('6 vasche = 6x75');
  });

  it('i pattern standard hanno priorita sulle regole apprese', () => {
    const riga = 'blocco speciale 6x75';
    ParserApprendimento.aggiungiRegola({
      pattern: escapeRegExp(riga),
      tipo: 'NXM',
      descrizione: 'interpretazione custom',
      distanza: 999,
      ripetizioni: 2,
    });
    const serie = ParserScheda.parseSerie(riga);
    expect(serie[0].metriTotali).toBe(450);
    expect(serie[0].regolaAppresa).toBeUndefined();
  });

  it('parseConRegole segnala le righe non comprese', () => {
    const testo = '4x100 libero\nriga oscura\n8x50';
    const res = ParserApprendimento.parseConRegole(testo);
    expect(res.nonCompreso).toContain('riga oscura');
    expect(res.nonCompreso).not.toContain('4x100 libero');
  });

  it('una regola UNITA converte km in metri', () => {
    ParserApprendimento.aggiungiRegola({
      pattern: escapeRegExp('giro lungo 2km'),
      tipo: 'UNITA',
      descrizione: '2km',
      distanza: 2000,
      unita: 'km',
      fattoreUnita: 1000,
    });
    const serie = ParserScheda.parseSerie('giro lungo 2km');
    expect(serie[0].metriTotali).toBe(2000);
  });

  it('le regole usate vengono conteggiate', () => {
    const pattern = escapeRegExp('speciale 4 vasche');
    ParserApprendimento.aggiungiRegola({
      pattern,
      tipo: 'NXM',
      descrizione: '4x25',
      distanza: 25,
      ripetizioni: 4,
    });
    ParserScheda.parseSerie('speciale 4 vasche');
    ParserScheda.parseSerie('speciale 4 vasche');
    const regole = ParserApprendimento.getRegole();
    expect(regole[0].usi).toBeGreaterThanOrEqual(2);
  });

  it('suggerisce una interpretazione per una riga non compresa', () => {
    const suggerimento = ParserApprendimento.suggerisciInterpretazione('12x50');
    expect(suggerimento?.tipo).toBe('NXM');
    expect(suggerimento?.distanza).toBe(50);
    expect(suggerimento?.ripetizioni).toBe(12);
  });
});
