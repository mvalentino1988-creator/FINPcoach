import { describe, expect, it } from 'vitest';
import { Atleta, Tempo } from '../types';
import { passoMedioCorsia, profiloCorsiaAtleta, suggerisciComposizioneCorsie, tipoPrevalenteCorsia } from './composizioneCorsie';

const atleta = (id: number, nome = `A${id}`): Atleta => ({
  id,
  nome,
  cognome: 'Test',
  stato: 'UFFICIALE',
  fattoreVolume: 1,
  note: '',
  volumeAuto: true,
});

const tempo = (atletaId: number, distanzaMetri: number, centesimi: number): Tempo => ({
  id: atletaId * 100 + distanzaMetri,
  atletaId,
  data: '2025-01-01',
  stile: 'STILE_LIBERO',
  distanzaMetri,
  centesimi,
  contesto: 'GARA',
  vascaMetri: 50,
  note: '',
});

describe('composizioneCorsie', () => {
  it('stima il passo 100m e il tipo di lavoro dai tempi', () => {
    const p = profiloCorsiaAtleta(atleta(1), [tempo(1, 100, 9000), tempo(1, 200, 21000)]);
    expect(p.passo100mCentesimi).toBe(9000);
    expect(p.distanzaTipicaMetri).toBe(200);
    expect(p.tipoLavoro).toBe('F');
  });

  it('mette i più veloci nelle corsie centrali e mantiene passo simile per corsia', () => {
    const atleti = [atleta(1), atleta(2), atleta(3), atleta(4), atleta(5), atleta(6), atleta(7), atleta(8)];
    // Passo 100m crescente: 1 più veloce, 8 più lento.
    const tempi = atleti.map((a, i) => tempo(a.id, 100, 8000 + i * 500));
    const corsie = suggerisciComposizioneCorsie(atleti, tempi);

    expect(corsie).toHaveLength(4);
    const flat = corsie.flat().sort((a, b) => a - b);
    expect(flat).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const profili = new Map(atleti.map(a => [a.id, profiloCorsiaAtleta(a, tempi)]));
    const mediaC23 = [passoMedioCorsia(corsie[1], profili)!, passoMedioCorsia(corsie[2], profili)!];
    const mediaBordi = [passoMedioCorsia(corsie[0], profili)!, passoMedioCorsia(corsie[3], profili)!];
    expect(Math.min(...mediaC23)).toBeLessThan(Math.max(...mediaBordi));
  });

  it('gestisce atleti senza tempi riempiendo le corsie meno popolate', () => {
    const atleti = [atleta(1), atleta(2), atleta(3)];
    const corsie = suggerisciComposizioneCorsie(atleti, []);
    expect(corsie.flat().sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(tipoPrevalenteCorsia(corsie[0], new Map())).toBe('N');
  });
});
