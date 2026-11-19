import { describe, expect, it } from 'vitest';
import {
  isAssenteInData,
  giorniAssentiInPeriodo,
  avvisiIscrizioniGare,
  avvisiTempiInAssenza,
  normalizzaAssenza,
  normalizzaIscrizione,
} from './assenze';
import { Assenza, Gara, IscrizioneGara, Tempo } from '../types';
import { VolumeIndividuale } from './volumeIndividuale';
import type { Microciclo } from '../types';

const A1 = 1;
const base: Assenza[] = [
  { id: 1, atletaId: A1, dal: '2026-03-01', al: '2026-03-10', motivo: 'infortunio', ambito: 'TUTTO' },
  { id: 2, atletaId: A1, dal: '2026-04-05', al: '2026-04-06', motivo: 'solo allenamenti', ambito: 'ALLENAMENTO' },
  { id: 3, atletaId: A1, dal: '2026-05-10', al: '2026-05-12', motivo: 'gara x', ambito: 'GARA', garaId: 7 },
  { id: 4, atletaId: A1, dal: '2026-05-20', al: '2026-05-21', motivo: 'gara y', ambito: 'GARA', garaId: 8 },
];

describe('isAssenteInData', () => {
  it('TUTTO copre allenamento e gara', () => {
    expect(isAssenteInData(A1, '2026-03-05', base, 'ALLENAMENTO')).toBe(true);
    expect(isAssenteInData(A1, '2026-03-05', base, 'GARA')).toBe(true);
  });
  it('ALLENAMENTO non copre le gare', () => {
    expect(isAssenteInData(A1, '2026-04-05', base, 'ALLENAMENTO')).toBe(true);
    expect(isAssenteInData(A1, '2026-04-05', base, 'GARA')).toBe(false);
  });
  it('GARA con garaId copre solo quella gara', () => {
    expect(isAssenteInData(A1, '2026-05-10', base, 'GARA', 7)).toBe(true);
    expect(isAssenteInData(A1, '2026-05-10', base, 'GARA', 8)).toBe(false);
    expect(isAssenteInData(A1, '2026-05-10', base, 'ALLENAMENTO')).toBe(false);
    // Senza garaId specificata, un'assenza GARA copre comunque l'ambito gara.
    expect(isAssenteInData(A1, '2026-05-10', base, 'GARA')).toBe(true);
  });
  it('assenza senza ambito vale TUTTO (retrocompatibile)', () => {
    const legacy: Assenza[] = [{ id: 9, atletaId: 2, dal: '2026-01-01', al: '2026-01-05', motivo: 'x' }];
    expect(isAssenteInData(2, '2026-01-03', legacy, 'ALLENAMENTO')).toBe(true);
    expect(isAssenteInData(2, '2026-01-03', legacy, 'GARA')).toBe(true);
  });
  it('fuori periodo non è assente; altro atleta non conta', () => {
    expect(isAssenteInData(A1, '2026-03-15', base, 'ALLENAMENTO')).toBe(false);
    expect(isAssenteInData(999, '2026-03-05', base, 'ALLENAMENTO')).toBe(false);
  });
});

describe('giorniAssentiInPeriodo', () => {
  it('conta solo i giorni coperti, senza doppi conteggi su sovrapposizioni', () => {
    const sovrapposte: Assenza[] = [
      { id: 1, atletaId: A1, dal: '2026-01-01', al: '2026-01-10', motivo: '', ambito: 'TUTTO' },
      { id: 2, atletaId: A1, dal: '2026-01-05', al: '2026-01-15', motivo: '', ambito: 'TUTTO' },
      { id: 3, atletaId: A1, dal: '2026-01-20', al: '2026-01-22', motivo: '', ambito: 'GARA', garaId: 1 },
    ];
    // 1-15 gennaio coperti (15 giorni); l'assenza GARA non conta per allenamento.
    expect(giorniAssentiInPeriodo(A1, '2026-01-01', '2026-01-31', sovrapposte)).toBe(15);
  });
});

describe('normalizzazione', () => {
  it('ambito non valido -> TUTTO; garaId rimosso se non GARA', () => {
    const n = normalizzaAssenza({ id: 1, atletaId: 1, dal: '2026-01-01', al: '2026-01-02', motivo: '', ambito: 'strano' as never, garaId: 3 });
    expect(n.ambito).toBe('TUTTO');
    expect(n.garaId).toBeUndefined();
  });
  it('iscrizione: stato invalido -> ISCRITTO, eventi senza distanza rimossi', () => {
    const i = normalizzaIscrizione({
      id: 1, garaId: 1, atletaId: 1,
      eventi: [
        { stile: 'STILE_LIBERO', distanzaMetri: 100 },
        { stile: 'DORSO', distanzaMetri: 0 },
      ] as never,
      stato: 'BOH' as never,
    });
    expect(i.stato).toBe('ISCRITTO');
    expect(i.eventi).toHaveLength(1);
  });
});

describe('avvisi iscrizioni e tempi', () => {
  const gare: Gara[] = [
    { id: 7, stagioneId: 1, nome: 'Gara Maggio', dal: '2026-05-10', al: '2026-05-10', luogo: '', prioritaria: true },
    { id: 8, stagioneId: 1, nome: 'Gara Giugno', dal: '2026-06-01', al: '2026-06-02', luogo: '', prioritaria: false },
  ];
  const iscrizioni: IscrizioneGara[] = [
    { id: 1, garaId: 7, atletaId: A1, eventi: [{ stile: 'STILE_LIBERO', distanzaMetri: 100 }], stato: 'ISCRITTO' },
    { id: 2, garaId: 8, atletaId: A1, eventi: [], stato: 'RITIRATO' },
  ];
  const atleti = [{ id: A1, nome: 'Test', cognome: 'Atleta' } as never];

  it('ISCRITTO con assenza che copre la gara -> avviso', () => {
    const avv = avvisiIscrizioniGare(iscrizioni, base, gare, atleti);
    expect(avv.some(a => a.gravita === 'ATTENZIONE' && a.messaggio.includes('Gara Maggio'))).toBe(true);
    // L'iscrizione RITIRATO non genera avviso.
    expect(avv.some(a => a.messaggio.includes('Gara Giugno'))).toBe(false);
  });

  it('tempo di gara in data coperta da assenza -> avviso', () => {
    const tempi: Tempo[] = [
      { id: 1, atletaId: A1, data: '2026-03-05', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6000, contesto: 'GARA', vascaMetri: 25, note: '' },
      { id: 2, atletaId: A1, data: '2026-03-05', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6000, contesto: 'ALLENAMENTO', vascaMetri: 25, note: '' },
      { id: 3, atletaId: A1, data: '2026-05-10', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6000, contesto: 'GARA', vascaMetri: 25, note: '' },
    ];
    const avv = avvisiTempiInAssenza(tempi, base);
    // Solo i due tempi GARA in date coperte (marzo TUTTO, maggio garaId 7 senza garaId richiesto -> copre).
    expect(avv).toHaveLength(2);
  });
});

describe('VolumeIndividuale con ambiti', () => {
  const micro: Microciclo = {
    id: 1, mesocicloId: 1, inizio: '2026-04-06', fine: '2026-04-12',
    tipo: 'CARICO', sedutePreviste: 4, volumeTargetMetri: 14000, note: '', bloccato: false,
  };
  const atleta = { id: A1, fattoreVolume: 1.0 } as never;

  it('assenza solo GARA non riduce il volume di allenamento', () => {
    const soloGara: Assenza[] = [
      { id: 1, atletaId: A1, dal: '2026-04-06', al: '2026-04-12', motivo: '', ambito: 'GARA', garaId: 7 },
    ];
    const v = VolumeIndividuale.settimana(micro, atleta, soloGara);
    expect(v.metri).toBe(14000);
  });

  it('assenza ALLENAMENTO riduce il volume', () => {
    const soloAllen: Assenza[] = [
      { id: 1, atletaId: A1, dal: '2026-04-06', al: '2026-04-08', motivo: '', ambito: 'ALLENAMENTO' },
    ];
    const v = VolumeIndividuale.settimana(micro, atleta, soloAllen);
    expect(v.metri).toBe(Math.round(14000 * (4 / 7)));
  });
});
