import { Atleta, Tempo } from '../types';

export type TipoLavoroCorsia = 'V' | 'M' | 'F' | 'N';

export interface ProfiloCorsiaAtleta {
  atletaId: number;
  /** Passo 100m stimato in centesimi (minore = più veloce). null se non ci sono tempi. */
  passo100mCentesimi: number | null;
  /** Distanza tipica in metri (massima distanza con tempo registrato). */
  distanzaTipicaMetri: number | null;
  tipoLavoro: TipoLavoroCorsia;
}

const NUM_CORSIE = 4;

/** Ordine delle corsie per la composizione: centro prima (C2, C3), poi bordi (C1, C4). */
const ORDINE_ASSEGNAZIONE = [1, 2, 0, 3];

/** Priorità di lavoro per le corsie: prima velocità/medio, fondo e "da valutare" ai bordi. */
const RANK_TIPO: Record<TipoLavoroCorsia, number> = { V: 0, M: 1, F: 2, N: 3 };

const ETICHETTA_TIPO: Record<TipoLavoroCorsia, string> = {
  V: 'Velocità',
  M: 'Medio',
  F: 'Fondo',
  N: 'Da valutare',
};

export function etichettaTipoLavoro(tipo: TipoLavoroCorsia): string {
  return ETICHETTA_TIPO[tipo];
}

function tipoDaDistanza(distanzaMetri: number | null): TipoLavoroCorsia {
  if (distanzaMetri == null) return 'N';
  if (distanzaMetri >= 200) return 'F';
  if (distanzaMetri <= 50) return 'V';
  return 'M';
}

/**
 * Stima conservativa del passo 100m in centesimi.
 * Le distanze corte sono penalizzate (un 50m veloce non è un 100m), quelle lunghe
 * danno una capacità 100m leggermente più veloce della media della gara lunga.
 */
function stimaPasso100m(centesimi: number, distanzaMetri: number): number {
  const esponente =
    distanzaMetri <= 50 ? 1.15 :
    distanzaMetri <= 100 ? 1.08 :
    distanzaMetri <= 200 ? 1.06 : 1.04;
  return Math.round(centesimi * Math.pow(100 / distanzaMetri, esponente));
}

/** Profilo veloce per la composizione delle corsie: usa solo i tempi, mai dati medici. */
export function profiloCorsiaAtleta(atleta: Atleta, tempi: Tempo[]): ProfiloCorsiaAtleta {
  const miei = tempi.filter(t => t.atletaId === atleta.id && t.distanzaMetri > 0 && t.centesimi > 0);
  if (miei.length === 0) {
    return { atletaId: atleta.id, passo100mCentesimi: null, distanzaTipicaMetri: null, tipoLavoro: 'N' };
  }

  const passo = Math.min(...miei.map(t => stimaPasso100m(t.centesimi, t.distanzaMetri)));
  const distanzaTipicaMetri = Math.max(...miei.map(t => t.distanzaMetri));
  return {
    atletaId: atleta.id,
    passo100mCentesimi: passo,
    distanzaTipicaMetri,
    tipoLavoro: tipoDaDistanza(distanzaTipicaMetri),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Suggerisce una composizione delle corsie:
 * - prima si separa per tipo di lavoro (velocità/medio al centro, fondo ai bordi);
 * - dentro ogni gruppo ordina per passo 100m stimato, dal più veloce al più lento;
 * - ogni corsia riceve un blocco contiguo con passo e lavoro simili;
 * - gli atleti senza tempi riempiono le corsie meno popolate.
 */
export function suggerisciComposizioneCorsie(atleti: Atleta[], tempi: Tempo[]): number[][] {
  const corsie: number[][] = Array.from({ length: NUM_CORSIE }, () => []);
  if (atleti.length === 0) return corsie;

  const profili = atleti.map(a => profiloCorsiaAtleta(a, tempi));
  const conTempi = profili
    .filter(p => p.passo100mCentesimi != null)
    .sort((a, b) =>
      RANK_TIPO[a.tipoLavoro] - RANK_TIPO[b.tipoLavoro] ||
      (a.passo100mCentesimi ?? 0) - (b.passo100mCentesimi ?? 0)
    );
  const senzaTempi = profili.filter(p => p.passo100mCentesimi == null);

  // Blocchi contigui di passo simile, assegnati centro -> bordi.
  const numeroBlocchi = Math.min(NUM_CORSIE, conTempi.length);
  const dimensioneBlocco = numeroBlocchi > 0 ? Math.ceil(conTempi.length / numeroBlocchi) : 0;
  const blocchi = dimensioneBlocco > 0 ? chunk(conTempi, dimensioneBlocco).slice(0, NUM_CORSIE) : [];

  blocchi.forEach((blocco, i) => {
    const corsia = ORDINE_ASSEGNAZIONE[i % ORDINE_ASSEGNAZIONE.length];
    corsie[corsia].push(...blocco.map(p => p.atletaId));
  });

  // Senza tempi: distribuisci sulle corsie meno popolate, preferendo il centro.
  const ordineRiempimento = [...ORDINE_ASSEGNAZIONE];
  senzaTempi.forEach(p => {
    ordineRiempimento.sort((a, b) => corsie[a].length - corsie[b].length || ORDINE_ASSEGNAZIONE.indexOf(a) - ORDINE_ASSEGNAZIONE.indexOf(b));
    corsie[ordineRiempimento[0]].push(p.atletaId);
  });

  return corsie;
}

/** Passo medio (centesimi) degli atleti di una corsia; null se nessuno ha tempi. */
export function passoMedioCorsia(corsiaIds: number[], profili: Map<number, ProfiloCorsiaAtleta>): number | null {
  const passi = corsiaIds
    .map(id => profili.get(id)?.passo100mCentesimi)
    .filter((p): p is number => p != null);
  if (passi.length === 0) return null;
  return Math.round(passi.reduce((s, p) => s + p, 0) / passi.length);
}

/** Tipo di lavoro prevalente della corsia. */
export function tipoPrevalenteCorsia(corsiaIds: number[], profili: Map<number, ProfiloCorsiaAtleta>): TipoLavoroCorsia {
  const conteggio: Record<TipoLavoroCorsia, number> = { V: 0, M: 0, F: 0, N: 0 };
  for (const id of corsiaIds) {
    const tipo = profili.get(id)?.tipoLavoro ?? 'N';
    conteggio[tipo] += 1;
  }
  const ordine: TipoLavoroCorsia[] = ['F', 'M', 'V', 'N'];
  return ordine.reduce((best, cur) => (conteggio[cur] > conteggio[best] ? cur : best), 'N');
}
