import { Atleta, Tempo } from '../types';
import { ordineAssegnazioneCorsie, suggerisciComposizioneCorsie } from './composizioneCorsie';

/**
 * Assegnazione Vasca: fonte unica di verità per corsie, presenze,
 * ordine di partenza, ripartenze e intervalli automatici.
 * Persistita in LocalStorage (finp_vasca_assegnazione_v1) e sincronizzata
 * con i parametri del giorno del Piano.
 */

export interface CorsiaAssegnazione {
  /** Numero visualizzato (1..numeroCorsie). */
  numero: number;
  /** Ordine = ordine di partenza. */
  atletiIds: number[];
  /** Secondi di riposo dopo ogni ripetizione; multipli di 5. null = eredita generale. */
  ripartenzaCorsia: number | null;
  /** Secondi tra un atleta e il successivo nella partenza automatica; multipli di 5. null = spento. */
  intervalloPartenza: number | null;
  /** Corsia in sola lettura (es. durante una serie o per protezione manuale). */
  bloccata: boolean;
}

export interface AssegnazioneVasca {
  /** Data della composizione (YYYY-MM-DD). */
  data: string;
  vascaMetri: 25 | 50;
  numeroCorsie: number;
  presentiIds: number[];
  corsie: CorsiaAssegnazione[];
  /** Ripartenza generale in secondi (multipli di 5). */
  ripartenzaGenerale: number;
  /** Ripartenze personali per atletaId (secondi, multipli di 5). */
  ripartenzeAtleta: Record<number, number>;
}

export const NUMERO_CORISIE_DEFAULT = 4;
export const RIPARTENZA_GENERALE_DEFAULT = 60;
export const MAX_CORISIE = 8;
export const MAX_ATLETI_CORISIA = 12;

export function secondi5(v: number): number {
  return Math.max(0, Math.round(v / 5) * 5);
}

function numeroCorsieValido(n: unknown, fallback: number): number {
  const num = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(1, Math.min(MAX_CORISIE, num));
}

/** Crea un'assegnazione vuota per la data indicata: corsie vuote, nessun atleta assegnato. */
export function nuovaAssegnazione(
  data: string,
  vascaMetri: 25 | 50,
  numeroCorsie: number = NUMERO_CORISIE_DEFAULT,
  presentiIds: number[] = [],
  ripartenzaGenerale: number = RIPARTENZA_GENERALE_DEFAULT
): AssegnazioneVasca {
  const n = numeroCorsieValido(numeroCorsie, NUMERO_CORISIE_DEFAULT);
  return {
    data,
    vascaMetri: vascaMetri === 50 ? 50 : 25,
    numeroCorsie: n,
    presentiIds: [...new Set(presentiIds)],
    corsie: Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      atletiIds: [],
      ripartenzaCorsia: null,
      intervalloPartenza: null,
      bloccata: false,
    })),
    ripartenzaGenerale: secondi5(ripartenzaGenerale) || RIPARTENZA_GENERALE_DEFAULT,
    ripartenzeAtleta: {},
  };
}

/** Normalizza un oggetto letto da LocalStorage/backup: robusto ai dati corrotti. */
export function normalizzaAssegnazione(raw: unknown, _fallbackData?: string): AssegnazioneVasca | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AssegnazioneVasca>;
  if (typeof r.data !== 'string' || !r.data) return null;

  const n = numeroCorsieValido(r.numeroCorsie, NUMERO_CORISIE_DEFAULT);
  const corsie: CorsiaAssegnazione[] = Array.from({ length: n }, (_, i) => {
    const c = Array.isArray(r.corsie) ? r.corsie[i] : undefined;
    const ids = Array.isArray(c?.atletiIds)
      ? [...new Set(c.atletiIds.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)))].slice(0, MAX_ATLETI_CORISIA)
      : [];
    return {
      numero: i + 1,
      atletiIds: ids,
      ripartenzaCorsia: typeof c?.ripartenzaCorsia === 'number' ? secondi5(c.ripartenzaCorsia) || null : null,
      intervalloPartenza: typeof c?.intervalloPartenza === 'number' ? secondi5(c.intervalloPartenza) || null : null,
      bloccata: c?.bloccata === true,
    };
  });

  const ripartenzeAtleta: Record<number, number> = {};
  if (r.ripartenzeAtleta && typeof r.ripartenzeAtleta === 'object') {
    for (const [k, v] of Object.entries(r.ripartenzeAtleta)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === 'number' && Number.isFinite(v)) {
        ripartenzeAtleta[id] = secondi5(v);
      }
    }
  }

  return {
    data: r.data,
    vascaMetri: r.vascaMetri === 50 ? 50 : 25,
    numeroCorsie: n,
    presentiIds: Array.isArray(r.presentiIds)
      ? [...new Set(r.presentiIds.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)))]
      : [],
    corsie,
    ripartenzaGenerale: typeof r.ripartenzaGenerale === 'number' ? secondi5(r.ripartenzaGenerale) || RIPARTENZA_GENERALE_DEFAULT : RIPARTENZA_GENERALE_DEFAULT,
    ripartenzeAtleta,
  };
}

// ---------- Query ----------

export function corsiaPerNumero(a: AssegnazioneVasca, numero: number): CorsiaAssegnazione | undefined {
  return a.corsie.find(c => c.numero === numero);
}

export function corsiaDiAtleta(a: AssegnazioneVasca, atletaId: number): CorsiaAssegnazione | undefined {
  return a.corsie.find(c => c.atletiIds.includes(atletaId));
}

export function atletiAssegnati(a: AssegnazioneVasca): Set<number> {
  const s = new Set<number>();
  for (const c of a.corsie) for (const id of c.atletiIds) s.add(id);
  return s;
}

export function atletiNonAssegnati(a: AssegnazioneVasca, atleti: Atleta[]): Atleta[] {
  const assegnati = atletiAssegnati(a);
  const presenti = new Set(a.presentiIds);
  return atleti
    .filter(x => !assegnati.has(x.id) && presenti.has(x.id))
    .sort((x, y) => x.cognome.localeCompare(y.cognome) || x.nome.localeCompare(y.nome));
}

export function ripartenzaEreditata(a: AssegnazioneVasca, corsiaNumero: number, atletaId: number): number {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  return a.ripartenzeAtleta[atletaId]
    ?? corsia?.ripartenzaCorsia
    ?? a.ripartenzaGenerale;
}

// ---------- Mutazioni pure ----------

function updateCorsia(
  a: AssegnazioneVasca,
  numero: number,
  fn: (c: CorsiaAssegnazione) => CorsiaAssegnazione
): AssegnazioneVasca {
  return { ...a, corsie: a.corsie.map(c => (c.numero === numero ? fn(c) : c)) };
}

function rimuoviDaTutte(a: AssegnazioneVasca, atletaId: number): AssegnazioneVasca {
  return {
    ...a,
    corsie: a.corsie.map(c => ({ ...c, atletiIds: c.atletiIds.filter(id => id !== atletaId) })),
  };
}

/** Marca/non marca un atleta come presente; se diventa non presente esce dalla corsia. */
export function impostaPresente(a: AssegnazioneVasca, atletaId: number, presente: boolean): AssegnazioneVasca {
  let out = a;
  const idx = a.presentiIds.indexOf(atletaId);
  if (presente && idx < 0) {
    out = { ...out, presentiIds: [...out.presentiIds, atletaId] };
  } else if (!presente && idx >= 0) {
    out = {
      ...out,
      presentiIds: out.presentiIds.filter(id => id !== atletaId),
      ripartenzeAtleta: (() => {
        const { [atletaId]: _omit, ...rest } = out.ripartenzeAtleta;
        return rest;
      })(),
    };
    out = rimuoviDaTutte(out, atletaId);
  }
  return out;
}

/** Sposta un atleta in coda a una corsia (o in una posizione specifica). Ritorna null se bloccata/piena/non presente. */
export function assegnaAtleta(
  a: AssegnazioneVasca,
  atletaId: number,
  corsiaNumero: number,
  posizione?: number
): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia || corsia.bloccata) return null;
  if (!a.presentiIds.includes(atletaId)) return null;
  if (corsia.atletiIds.includes(atletaId)) {
    // già nella corsia: spostamento di posizione opzionale
    if (posizione == null) return a;
    return muoviAtletaInCorsia(a, corsiaNumero, atletaId, posizione);
  }
  if (corsia.atletiIds.length >= MAX_ATLETI_CORISIA) return null;
  let out = rimuoviDaTutte(a, atletaId);
  out = updateCorsia(out, corsiaNumero, c => {
    const ids = [...c.atletiIds];
    const p = posizione == null ? ids.length : Math.max(0, Math.min(posizione, ids.length));
    ids.splice(p, 0, atletaId);
    return { ...c, atletiIds: ids };
  });
  return out;
}

/** Togli un atleta dalla corsia (torna tra i non assegnati). */
export function rimuoviDaCorsia(a: AssegnazioneVasca, atletaId: number): AssegnazioneVasca {
  return rimuoviDaTutte(a, atletaId);
}

/** Sposta l'atleta all'interno della corsia (indice 0 = primo di partenza). */
export function muoviAtletaInCorsia(
  a: AssegnazioneVasca,
  corsiaNumero: number,
  atletaId: number,
  nuovoIndice: number
): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia || !corsia.atletiIds.includes(atletaId)) return null;
  if (corsia.bloccata) return null;
  const ids = corsia.atletiIds.filter(id => id !== atletaId);
  const idx = Math.max(0, Math.min(nuovoIndice, ids.length));
  ids.splice(idx, 0, atletaId);
  return updateCorsia(a, corsiaNumero, c => ({ ...c, atletiIds: ids }));
}

/** Scambia un atleta con l'adiacente (su/giù) nell'ordine di partenza. */
export function scambiaConAdiacente(a: AssegnazioneVasca, corsiaNumero: number, atletaId: number, direzione: -1 | 1): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia || corsia.bloccata) return null;
  const i = corsia.atletiIds.indexOf(atletaId);
  if (i < 0) return null;
  const j = i + direzione;
  if (j < 0 || j >= corsia.atletiIds.length) return null;
  const ids = [...corsia.atletiIds];
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return updateCorsia(a, corsiaNumero, c => ({ ...c, atletiIds: ids }));
}

export function impostaRipartenzaCorsia(a: AssegnazioneVasca, corsiaNumero: number, secondi: number | null): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia) return null;
  return updateCorsia(a, corsiaNumero, c => ({
    ...c,
    ripartenzaCorsia: secondi == null ? null : secondi5(secondi),
  }));
}

export function impostaIntervalloCorsia(a: AssegnazioneVasca, corsiaNumero: number, secondi: number | null): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia) return null;
  return updateCorsia(a, corsiaNumero, c => ({
    ...c,
    intervalloPartenza: secondi == null || secondi <= 0 ? null : secondi5(secondi),
  }));
}

export function impostaBloccoCorsia(a: AssegnazioneVasca, corsiaNumero: number, bloccata: boolean): AssegnazioneVasca | null {
  const corsia = corsiaPerNumero(a, corsiaNumero);
  if (!corsia) return null;
  return updateCorsia(a, corsiaNumero, c => ({ ...c, bloccata }));
}

export function impostaRipartenzaGenerale(a: AssegnazioneVasca, secondi: number): AssegnazioneVasca {
  return { ...a, ripartenzaGenerale: secondi5(secondi) };
}

export function impostaRipartenzaAtleta(a: AssegnazioneVasca, atletaId: number, secondi: number | null): AssegnazioneVasca {
  const ripartenzeAtleta = { ...a.ripartenzeAtleta };
  if (secondi == null) delete ripartenzeAtleta[atletaId];
  else ripartenzeAtleta[atletaId] = secondi5(secondi);
  return { ...a, ripartenzeAtleta };
}

/** Ridimensiona il numero di corsie: quelle in eccesso perdono gli atleti (torna fra i non assegnati). */
export function impostaNumeroCorsie(a: AssegnazioneVasca, numeroCorsie: number): AssegnazioneVasca {
  const n = numeroCorsieValido(numeroCorsie, a.numeroCorsie);
  if (n === a.numeroCorsie) return a;
  const corsie = Array.from({ length: n }, (_, i) => {
    const vecchia = corsiaPerNumero(a, i + 1);
    return vecchia
      ? { ...vecchia, numero: i + 1 }
      : { numero: i + 1, atletiIds: [], ripartenzaCorsia: null, intervalloPartenza: null, bloccata: false };
  });
  return { ...a, numeroCorsie: n, corsie };
}

/** Svuota tutte le corsie (mantiene corsie, ripartenze e impostazioni). */
export function svuotaCorsie(a: AssegnazioneVasca): AssegnazioneVasca {
  return { ...a, corsie: a.corsie.map(c => ({ ...c, atletiIds: [] })) };
}

/** Allinea l'assegnazione ai parametri del giorno (numero corsie, presenti, vasca). */
export function allineaConParametri(
  a: AssegnazioneVasca,
  vascaMetri: 25 | 50,
  numeroCorsie: number,
  presentiIds: number[]
): AssegnazioneVasca {
  let out: AssegnazioneVasca = { ...a, vascaMetri: vascaMetri === 50 ? 50 : 25 };
  const presentiSet = new Set(presentiIds);
  // Rimuovi dalle corsie chi non è più presente
  out = {
    ...out,
    corsie: out.corsie.map(c => ({ ...c, atletiIds: c.atletiIds.filter(id => presentiSet.has(id)) })),
    ripartenzeAtleta: Object.fromEntries(
      Object.entries(out.ripartenzeAtleta).filter(([k]) => presentiSet.has(Number(k)))
    ),
    presentiIds: [...presentiSet],
  };
  out = impostaNumeroCorsie(out, numeroCorsie);
  return out;
}

/** Applica il suggerimento automatico (solo corsie non bloccate, solo atleti presenti e non già in corsie bloccate). */
export function applicaSuggerimento(
  a: AssegnazioneVasca,
  atleti: Atleta[],
  tempi: Tempo[]
): AssegnazioneVasca {
  const giaNelleBloccate = new Set<number>();
  for (const c of a.corsie) {
    if (c.bloccata) for (const id of c.atletiIds) giaNelleBloccate.add(id);
  }

  // Candidati: presenti, non già in una corsia bloccata.
  const candidati = atleti.filter(x => a.presentiIds.includes(x.id) && !giaNelleBloccate.has(x.id));

  // Corsie non bloccate ordinate centro -> bordi (sull'intero range di corsie).
  const nonBloccate = a.corsie
    .filter(c => !c.bloccata)
    .map(c => c.numero)
    .sort((x, y) => {
      const centro = (a.numeroCorsie - 1) / 2;
      return Math.abs(x - 1 - centro) - Math.abs(y - 1 - centro) || x - y;
    });

  // La suggestion e' indicizzata per corsia virtuale (0..n-1); l'ordine di
  // priorita' centro -> bordi e' dato da ordineAssegnazioneCorsie. La r-esima
  // corsia reale non bloccata (in ordine di centralita') riceve il blocco della
  // corsia virtuale con lo stesso rango.
  const suggestion = suggerisciComposizioneCorsie(candidati, tempi, nonBloccate.length, null);
  const ordineVirtuale = ordineAssegnazioneCorsie(nonBloccate.length);
  const perCorsia = new Map<number, number[]>();
  nonBloccate.forEach((numero, r) => perCorsia.set(numero, suggestion[ordineVirtuale[r]] ?? []));

  const corsie = a.corsie.map(c =>
    c.bloccata ? c : { ...c, atletiIds: perCorsia.get(c.numero) ?? [] }
  );
  return { ...a, corsie };
}

/** Ritorna una copia con la data aggiornata (riuso della composizione di ieri). */
export function conData(a: AssegnazioneVasca, data: string): AssegnazioneVasca {
  return { ...a, data };
}
