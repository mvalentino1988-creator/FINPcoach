import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PROGRAMMA_WPS, valutaGara, gareAmmesse } from './gareAmmissibili';
import { __setPayloadRegolamentiForTest } from '../data/staticData';
import { __resetRegolamentiIndiceForTest } from './regolamentiService';
import { RegolamentiService } from './regolamentiService';

/**
 * Verifica gare-ammissibili.json contro la regola WPS 10.4.1 presente in
 * public/data/regolamenti.json (documento wps-rules-2026).
 */

beforeAll(() => {
  const p = JSON.parse(readFileSync(join(process.cwd(), 'public/data/regolamenti.json'), 'utf8'));
  __setPayloadRegolamentiForTest(p);
  __resetRegolamentiIndiceForTest();
});
afterAll(() => {
  __setPayloadRegolamentiForTest(null);
  __resetRegolamentiIndiceForTest();
});

const EVENTO_WPS: Record<string, string> = {
  STILE_LIBERO: 'Freestyle',
  DORSO: 'Backstroke',
  RANA: 'Breaststroke',
  FARFALLA: 'Butterfly',
  MISTI: 'Ind. Medley'
};

describe('gare-ammissibili.json vs WPS 10.4.1', () => {
  const regola = () => RegolamentiService.documento('wps-rules-2026')
    ?.sezioni.find(s => s.titolo === '10.4 Events and Programme of Events');

  it('la regola 10.4.1 è presente nelle fonti', () => {
    const r = regola();
    expect(r).toBeDefined();
    expect(r!.testo).toContain('10.4.1');
  });

  it('ogni evento individuale del JSON ha una riga corrispondente nella regola', () => {
    const testo = regola()!.testo;
    for (const g of PROGRAMMA_WPS) {
      const atteso = `${g.distanza}m ${EVENTO_WPS[g.stile]}`;
      // La regola usa "Ind. Medley" per MISTI e "Breaststroke" per RANA.
      expect(testo).toContain(atteso);
    }
  });

  it('le classi ammesse corrispondono agli intervalli della regola', () => {
    // Controllo puntuale sulle righe chiave della regola 10.4.1.
    const casi: [string, number, number[]][] = [
      ['50m Freestyle', 50, [1, 13]],
      ['100m Freestyle', 100, [1, 14]],
      ['200m Freestyle', 200, [1, 5]],
      ['400m Freestyle', 400, [6, 14]],
      ['50m Backstroke', 50, [1, 5]],
      ['100m Backstroke', 100, [1, 2]],
      ['50m Breaststroke', 50, [1, 3]],
      ['100m Breaststroke', 100, [4, 9]],
      ['50m Butterfly', 50, [2, 7]],
      ['100m Butterfly', 100, [8, 14]],
      ['150m Ind. Medley', 150, [1, 4]],
      ['200m Ind. Medley', 200, [5, 14]]
    ];
    for (const [riga, dist, intervallo] of casi) {
      const gara = PROGRAMMA_WPS.find(g => g.distanza === dist && riga.includes(EVENTO_WPS[g.stile]));
      expect(gara, `gara per ${riga}`).toBeDefined();
      // L'intervallo atteso dalla regola deve essere presente (eventuali intervalli
      // aggiuntivi come S14 nel 200m SL sono verificati a parte).
      expect(gara!.classi).toContainEqual(intervallo as [number, number]);
    }
  });

  it('SB10 non esiste: la rana 100m esclude la classe 10', () => {
    const rana100 = PROGRAMMA_WPS.find(g => g.stile === 'RANA' && g.distanza === 100)!;
    const esito10 = valutaGara(rana100, { classeSB: 10 });
    expect(esito10.stato).toBe('non_ammessa');
    const esito9 = valutaGara(rana100, { classeSB: 9 });
    expect(esito9.stato).toBe('ammessa');
    const esito11 = valutaGara(rana100, { classeSB: 11 });
    expect(esito11.stato).toBe('ammessa');
  });

  it('misti 75/100 solo in vasca corta', () => {
    const m75 = PROGRAMMA_WPS.find(g => g.stile === 'MISTI' && g.distanza === 75)!;
    expect(m75.soloVascaCorta).toBe(true);
    expect(valutaGara(m75, { classeSM: 3 }, 'corta').stato).toBe('ammessa');
    expect(valutaGara(m75, { classeSM: 3 }, 'lunga').stato).toBe('non_ammessa');
    const m100 = PROGRAMMA_WPS.find(g => g.stile === 'MISTI' && g.distanza === 100)!;
    expect(m100.soloVascaCorta).toBe(true);
  });

  it('S14 intellettiva: 200m SL ammessa solo a S14 (fuori S1-S5)', () => {
    const sl200 = PROGRAMMA_WPS.find(g => g.stile === 'STILE_LIBERO' && g.distanza === 200)!;
    expect(valutaGara(sl200, { classeS: 14 }).stato).toBe('ammessa');
    expect(valutaGara(sl200, { classeS: 6 }).stato).toBe('non_ammessa');
    expect(valutaGara(sl200, { classeS: 5 }).stato).toBe('ammessa');
  });

  it('atleta senza classe -> classe_mancante', () => {
    const esiti = gareAmmesse({}, 'corta');
    expect(esiti.length).toBe(0);
  });
});
