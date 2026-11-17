import { describe, expect, it } from 'vitest';
import { Atleta, Tempo } from '../types';
import {
  AssegnazioneVasca,
  nuovaAssegnazione,
  normalizzaAssegnazione,
  corsiaDiAtleta,
  corsiaPerNumero,
  atletiAssegnati,
  atletiNonAssegnati,
  ripartenzaEreditata,
  impostaPresente,
  assegnaAtleta,
  rimuoviDaCorsia,
  muoviAtletaInCorsia,
  scambiaConAdiacente,
  impostaRipartenzaCorsia,
  impostaIntervalloCorsia,
  impostaBloccoCorsia,
  impostaRipartenzaGenerale,
  impostaRipartenzaAtleta,
  impostaNumeroCorsie,
  svuotaCorsie,
  conData,
  applicaSuggerimento,
} from './assegnazioneVasca';

const OGGI = '2025-06-01';

const atleta = (id: number): Atleta => ({
  id,
  nome: `N${id}`,
  cognome: `C${id}`,
  stato: 'UFFICIALE',
  fattoreVolume: 1,
  note: '',
  volumeAuto: true,
});

const tempo = (atletaId: number, centesimi: number): Tempo => ({
  id: atletaId * 10,
  atletaId,
  data: OGGI,
  stile: 'STILE_LIBERO',
  distanzaMetri: 100,
  centesimi,
  contesto: 'GARA',
  vascaMetri: 50,
  note: '',
});

function base(nAtleti = 6, corsie = 3): { a: AssegnazioneVasca; atleti: Atleta[] } {
  const atleti = Array.from({ length: nAtleti }, (_, i) => atleta(i + 1));
  const a = nuovaAssegnazione(OGGI, 50, corsie, atleti.map(x => x.id));
  return { a, atleti };
}

describe('assegnazioneVasca — assegnazione base', () => {
  it('assegna un atleta presente in coda alla corsia', () => {
    const { a } = base();
    const out = assegnaAtleta(a, 1, 2)!;
    expect(corsiaDiAtleta(out, 1)?.numero).toBe(2);
    expect(corsiaPerNumero(out, 2)!.atletiIds).toEqual([1]);
  });

  it('muove un atleta gia\' assegnato senza duplicarlo', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = assegnaAtleta(out, 1, 3)!;
    expect(corsiaDiAtleta(out, 1)?.numero).toBe(3);
    expect(atletiAssegnati(out).size).toBe(1);
    expect(corsiaPerNumero(out, 1)!.atletiIds).not.toContain(1);
  });

  it('rispetta l\'ordine di partenza (posizione esplicita)', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = assegnaAtleta(out, 2, 1)!;
    out = assegnaAtleta(out, 3, 1)!;
    // Inserisce 2 in testa.
    out = assegnaAtleta(out, 2, 1, 0)!;
    expect(corsiaPerNumero(out, 1)!.atletiIds).toEqual([2, 1, 3]);
  });

  it('non assegna atleti non presenti o corsie bloccate', () => {
    const { a } = base();
    expect(assegnaAtleta(a, 99, 1)).toBeNull(); // id sconosciuto
    const senza = impostaPresente(a, 1, false);
    expect(assegnaAtleta(senza, 1, 1)).toBeNull();
    const bloccata = impostaBloccoCorsia(a, 1, true)!;
    expect(assegnaAtleta(bloccata, 1, 1)).toBeNull();
  });
});

describe('assegnazioneVasca — ordine e rimozione', () => {
  it('riordina con muoviAtletaInCorsia e scambiaConAdiacente', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = assegnaAtleta(out, 2, 1)!;
    out = assegnaAtleta(out, 3, 1)!;
    out = muoviAtletaInCorsia(out, 1, 3, 0)!;
    expect(corsiaPerNumero(out, 1)!.atletiIds).toEqual([3, 1, 2]);
    out = scambiaConAdiacente(out, 1, 1, 1)!;
    expect(corsiaPerNumero(out, 1)!.atletiIds).toEqual([3, 2, 1]);
    // Corsa bloccata: nessuna modifica.
    const bloccata = impostaBloccoCorsia(out, 1, true)!;
    expect(scambiaConAdiacente(bloccata, 1, 2, -1)).toBeNull();
  });

  it('rimuove un atleta dalla corsia (torna non assegnato)', () => {
    const { a, atleti } = base();
    const out = rimuoviDaCorsia(assegnaAtleta(a, 1, 1)!, 1);
    expect(atletiAssegnati(out).size).toBe(0);
    expect(atletiNonAssegnati(out, atleti).map(x => x.id)).toContain(1);
  });

  it('un atleta non presente esce dalla corsia e perde la ripartenza', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = impostaRipartenzaAtleta(out, 1, 90);
    out = impostaPresente(out, 1, false);
    expect(out.presentiIds).not.toContain(1);
    expect(atletiAssegnati(out).has(1)).toBe(false);
    expect(out.ripartenzeAtleta[1]).toBeUndefined();
  });
});

describe('assegnazioneVasca — ripartenze', () => {
  it('precedenza atleta > corsia > generale', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = impostaRipartenzaGenerale(out, 60);
    out = impostaRipartenzaCorsia(out, 1, 45)!;
    expect(ripartenzaEreditata(out, 1, 1)).toBe(45);
    out = impostaRipartenzaAtleta(out, 1, 30);
    expect(ripartenzaEreditata(out, 1, 1)).toBe(30);
    out = impostaRipartenzaAtleta(out, 1, null);
    expect(ripartenzaEreditata(out, 1, 1)).toBe(45);
  });

  it('intervalli e ripartenze sono sempre multipli di 5', () => {
    const { a } = base();
    let out = impostaRipartenzaCorsia(a, 1, 47)!;
    expect(corsiaPerNumero(out, 1)!.ripartenzaCorsia).toBe(45);
    out = impostaIntervalloCorsia(out, 1, 13)!;
    expect(corsiaPerNumero(out, 1)!.intervalloPartenza).toBe(15);
    out = impostaRipartenzaAtleta(out, 1, 33);
    expect(out.ripartenzeAtleta[1]).toBe(35);
  });
});

describe('assegnazioneVasca — persistenza e data', () => {
  it('round-trip di serializzazione JSON senza perdita', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = assegnaAtleta(out, 2, 1)!;
    out = impostaBloccoCorsia(out, 2, true)!;
    out = impostaRipartenzaAtleta(out, 1, 75);
    const raw = JSON.parse(JSON.stringify(out));
    const back = normalizzaAssegnazione(raw);
    expect(back).toEqual(out);
  });

  it('normalizza dati corrotti senza esplodere', () => {
    expect(normalizzaAssegnazione(null)).toBeNull();
    expect(normalizzaAssegnazione({})).toBeNull();
    const ok = normalizzaAssegnazione({ data: OGGI, numeroCorsie: 99, corsie: 'x' });
    expect(ok).not.toBeNull();
    expect(ok!.numeroCorsie).toBe(8); // clamp a MAX_CORISIE
    expect(ok!.corsie).toHaveLength(8);
  });

  it('conData riusa la composizione di un altro giorno', () => {
    const { a } = base();
    const out = assegnaAtleta(a, 1, 1)!;
    const domani = conData(out, '2025-06-02');
    expect(domani.data).toBe('2025-06-02');
    expect(corsiaDiAtleta(domani, 1)?.numero).toBe(1);
  });
});

describe('assegnazioneVasca — ridimensionamento e svuotamento', () => {
  it('ridurre le corsie riporta gli atleti delle corsie eliminate tra i non assegnati', () => {
    const { a, atleti } = base(4, 4);
    let out = assegnaAtleta(a, 1, 4)!;
    out = assegnaAtleta(out, 2, 2)!;
    out = impostaNumeroCorsie(out, 2)!;
    expect(out.numeroCorsie).toBe(2);
    expect(atletiAssegnati(out).has(1)).toBe(false);
    expect(atletiAssegnati(out).has(2)).toBe(true);
    expect(atletiNonAssegnati(out, atleti).map(x => x.id)).toContain(1);
  });

  it('svuotaCorsie mantiene impostazioni e presenti', () => {
    const { a } = base();
    let out = assegnaAtleta(a, 1, 1)!;
    out = impostaRipartenzaCorsia(out, 1, 60)!;
    const vuota = svuotaCorsie(out);
    expect(atletiAssegnati(vuota).size).toBe(0);
    expect(corsiaPerNumero(vuota, 1)!.ripartenzaCorsia).toBe(60);
    expect(vuota.presentiIds).toHaveLength(6);
  });
});

describe('assegnazioneVasca — suggerimento automatico', () => {
  it('assegna solo i presenti e su N corsie', () => {
    const atleti = Array.from({ length: 10 }, (_, i) => atleta(i + 1));
    const presenti = [1, 2, 3, 4, 5, 6];
    const a = nuovaAssegnazione(OGGI, 50, 3, presenti);
    const tempi = atleti.map(x => tempo(x.id, 8000 + x.id * 300));
    const out = applicaSuggerimento(a, atleti, tempi);
    const assegnati = [...atletiAssegnati(out)].sort((x, y) => x - y);
    expect(assegnati).toEqual(presenti);
    expect(out.corsie).toHaveLength(3);
    // Ogni corsia ha 2 atleti (6 presenti / 3 corsie).
    for (const c of out.corsie) expect(c.atletiIds).toHaveLength(2);
  });

  it('rispetta le corsie bloccate e gli atleti gia\' in esse', () => {
    const atleti = Array.from({ length: 8 }, (_, i) => atleta(i + 1));
    const a = nuovaAssegnazione(OGGI, 50, 4, atleti.map(x => x.id));
    let out = assegnareInCorsia(a, 7, 1);
    out = assegnareInCorsia(out, 8, 1);
    out = impostaBloccoCorsia(out, 1, true)!;
    out = applicaSuggerimento(out, atleti, []);
    // La corsia 1 bloccata conserva i suoi atleti; gli altri 6 si distribuiscono.
    expect(corsiaPerNumero(out, 1)!.atletiIds.sort()).toEqual([7, 8]);
    const altri = out.corsie.filter(c => c.numero !== 1).flatMap(c => c.atletiIds).sort();
    expect(altri).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

function assegnareInCorsia(a: AssegnazioneVasca, atletaId: number, corsia: number): AssegnazioneVasca {
  return assegnaAtleta(a, atletaId, corsia)!;
}
