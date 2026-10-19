import { describe, it, expect } from 'vitest';
import {
  PROGRAMMA_WPS,
  valutaGara,
  valutaProgramma,
  gareAmmesse,
  classiMancanti,
  etichettaClassi,
  type ClassiAtleta,
  type GaraProgramma,
} from './gareAmmissibili';

function gara(stile: string, distanza: number): GaraProgramma {
  const g = PROGRAMMA_WPS.find((x) => x.stile === stile && x.distanza === distanza);
  if (!g) throw new Error(`Gara non trovata: ${stile} ${distanza}`);
  return g;
}

const stato = (stile: string, dist: number, classi: ClassiAtleta, vasca?: 'corta' | 'lunga') =>
  valutaGara(gara(stile, dist), classi, vasca).stato;

describe('integrità della tabella', () => {
  it('contiene le 14 gare individuali della Rule 10.4.1', () => {
    expect(PROGRAMMA_WPS).toHaveLength(14);
  });

  it('usa la famiglia di classe corretta per ogni stile', () => {
    for (const g of PROGRAMMA_WPS) {
      const attesa = g.stile === 'RANA' ? 'SB' : g.stile === 'MISTI' ? 'SM' : 'S';
      expect(g.famiglia).toBe(attesa);
    }
  });

  it('ha intervalli ordinati e validi', () => {
    for (const g of PROGRAMMA_WPS) {
      for (const [da, a] of g.classi) {
        expect(da).toBeLessThanOrEqual(a);
        expect(da).toBeGreaterThanOrEqual(1);
        expect(a).toBeLessThanOrEqual(14);
      }
    }
  });
});

describe('stile libero, dorso, farfalla (classe S)', () => {
  it('S5: 200 SL sì, 400 SL no, 50 farfalla sì, 100 farfalla no', () => {
    const c = { classeS: 5 };
    expect(stato('STILE_LIBERO', 200, c)).toBe('ammessa');
    expect(stato('STILE_LIBERO', 400, c)).toBe('non_ammessa');
    expect(stato('FARFALLA', 50, c)).toBe('ammessa');
    expect(stato('FARFALLA', 100, c)).toBe('non_ammessa');
  });

  it('S8: 200 SL no, 100 dorso sì, 50 dorso no, 100 farfalla sì', () => {
    const c = { classeS: 8 };
    expect(stato('STILE_LIBERO', 200, c)).toBe('non_ammessa');
    expect(stato('DORSO', 100, c)).toBe('ammessa');
    expect(stato('DORSO', 50, c)).toBe('non_ammessa');
    expect(stato('FARFALLA', 100, c)).toBe('ammessa');
  });

  it('S14: 200 SL sì (eccezione), 50 SL no, 400 SL sì', () => {
    const c = { classeS: 14 };
    expect(stato('STILE_LIBERO', 200, c)).toBe('ammessa');
    expect(stato('STILE_LIBERO', 50, c)).toBe('non_ammessa');
    expect(stato('STILE_LIBERO', 400, c)).toBe('ammessa');
  });

  it('S3: 100 dorso no (solo S1-2 e S6-14), 50 dorso sì', () => {
    const c = { classeS: 3 };
    expect(stato('DORSO', 100, c)).toBe('non_ammessa');
    expect(stato('DORSO', 50, c)).toBe('ammessa');
  });
});

describe('rana (classe SB)', () => {
  it('SB3: 50 sì, 100 no', () => {
    expect(stato('RANA', 50, { classeSB: 3 })).toBe('ammessa');
    expect(stato('RANA', 100, { classeSB: 3 })).toBe('non_ammessa');
  });

  it('SB4, SB9, SB11 sulla 100 rana: ammesse', () => {
    expect(stato('RANA', 100, { classeSB: 4 })).toBe('ammessa');
    expect(stato('RANA', 100, { classeSB: 9 })).toBe('ammessa');
    expect(stato('RANA', 100, { classeSB: 11 })).toBe('ammessa');
  });

  it('SB10 non esiste: nessuna gara ammessa', () => {
    expect(stato('RANA', 100, { classeSB: 10 })).toBe('non_ammessa');
    expect(stato('RANA', 50, { classeSB: 10 })).toBe('non_ammessa');
  });

  it('non usa la classe S per la rana', () => {
    expect(stato('RANA', 100, { classeS: 7 })).toBe('classe_mancante');
  });
});

describe('misti (classe SM) e vasca', () => {
  it('SM4: 150 sì, 200 no', () => {
    expect(stato('MISTI', 150, { classeSM: 4 })).toBe('ammessa');
    expect(stato('MISTI', 200, { classeSM: 4 })).toBe('non_ammessa');
  });

  it('SM5: 200 sì, 150 no', () => {
    expect(stato('MISTI', 200, { classeSM: 5 })).toBe('ammessa');
    expect(stato('MISTI', 150, { classeSM: 5 })).toBe('non_ammessa');
  });

  it('100 misti (SM5-13) solo in vasca corta', () => {
    const c = { classeSM: 8 };
    expect(stato('MISTI', 100, c, 'corta')).toBe('ammessa');
    expect(stato('MISTI', 100, c, 'lunga')).toBe('non_ammessa');
    expect(stato('MISTI', 100, c)).toBe('ammessa');
  });

  it('SM14: 200 sì, 100 no', () => {
    const c = { classeSM: 14 };
    expect(stato('MISTI', 200, c)).toBe('ammessa');
    expect(stato('MISTI', 100, c)).toBe('non_ammessa');
  });

  it('75 misti (SM1-4) solo in vasca corta', () => {
    expect(stato('MISTI', 75, { classeSM: 2 }, 'lunga')).toBe('non_ammessa');
    expect(stato('MISTI', 75, { classeSM: 2 }, 'corta')).toBe('ammessa');
  });
});

describe('dati mancanti e utilità', () => {
  it('senza classi nessuna gara è ammessa e tutte chiedono la classe', () => {
    const esiti = valutaProgramma({});
    expect(esiti.every((e) => e.stato === 'classe_mancante')).toBe(true);
    expect(gareAmmesse({})).toHaveLength(0);
  });

  it('classiMancanti elenca le famiglie assenti', () => {
    expect(classiMancanti({ classeS: 7 })).toEqual(['SB', 'SM']);
    expect(classiMancanti({ classeS: 7, classeSB: 6, classeSM: 7 })).toEqual([]);
    expect(classiMancanti({ classeS: null })).toEqual(['S', 'SB', 'SM']);
  });

  it('etichettaClassi formatta intervalli e singole classi', () => {
    expect(etichettaClassi(gara('STILE_LIBERO', 200))).toBe('S1–S5, S14');
    expect(etichettaClassi(gara('RANA', 100))).toBe('SB4–SB9, SB11–SB14');
  });

  it('atleta S7/SB6/SM7: elenco coerente', () => {
    const c = { classeS: 7, classeSB: 6, classeSM: 7 };
    const ammesse = gareAmmesse(c).map((g) => `${g.stile}_${g.distanza}`);
    expect(ammesse).toEqual([
      'STILE_LIBERO_50',
      'STILE_LIBERO_100',
      'STILE_LIBERO_400',
      'DORSO_100',
      'RANA_100',
      'FARFALLA_50',
      'MISTI_100',
      'MISTI_200',
    ]);
  });
});
