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

const NUM_CORSIE_DEFAULT = 4;

/** Ordine delle corsie per la composizione: centro prima, poi bordi.
 *  Per N corsie ordina per distanza dal centro (es. 6 corsie -> indici 2,3,1,4,0,5). */
export function ordineAssegnazioneCorsie(n: number): number[] {
  const num = Math.max(1, Math.round(n));
  if (num === 1) return [0];
  const centro = (num - 1) / 2;
  return Array.from({ length: num }, (_, i) => i)
    .sort((a, b) => Math.abs(a - centro) - Math.abs(b - centro) || a - b);
}

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
export function suggerisciComposizioneCorsie(
  atleti: Atleta[],
  tempi: Tempo[],
  numeroCorsie: number = NUM_CORSIE_DEFAULT,
  presentiIds?: Iterable<number> | null
): number[][] {
  const n = Math.max(1, Math.min(8, Math.round(numeroCorsie)));
  const corsie: number[][] = Array.from({ length: n }, () => []);
  const ammessi = presentiIds != null ? new Set(presentiIds) : null;
  const candidati = ammessi ? atleti.filter(a => ammessi.has(a.id)) : atleti;
  if (candidati.length === 0) return corsie;

  const profili = candidati.map(a => profiloCorsiaAtleta(a, tempi));
  const conTempi = profili
    .filter(p => p.passo100mCentesimi != null)
    .sort((a, b) =>
      RANK_TIPO[a.tipoLavoro] - RANK_TIPO[b.tipoLavoro] ||
      (a.passo100mCentesimi ?? 0) - (b.passo100mCentesimi ?? 0)
    );
  const senzaTempi = profili.filter(p => p.passo100mCentesimi == null);

  const ordineCorsie = ordineAssegnazioneCorsie(n);

  // Blocchi contigui di passo simile, assegnati centro -> bordi.
  const numeroBlocchi = Math.min(n, conTempi.length);
  const dimensioneBlocco = numeroBlocchi > 0 ? Math.ceil(conTempi.length / numeroBlocchi) : 0;
  const blocchi = dimensioneBlocco > 0 ? chunk(conTempi, dimensioneBlocco).slice(0, n) : [];

  blocchi.forEach((blocco, i) => {
    const corsia = ordineCorsie[i % ordineCorsie.length];
    corsie[corsia].push(...blocco.map(p => p.atletaId));
  });

  // Senza tempi: distribuisci sulle corsie meno popolate, preferendo il centro.
  senzaTempi.forEach(p => {
    let best = 0;
    for (let i = 1; i < ordineCorsie.length; i++) {
      const cur = ordineCorsie[i], prev = ordineCorsie[best];
      const diff = corsie[cur].length - corsie[prev].length;
      if (diff < 0 || (diff === 0 && i < best)) best = i;
    }
    corsie[ordineCorsie[best]].push(p.atletaId);
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
