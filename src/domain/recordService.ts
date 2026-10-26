import { payloadRecord } from '../data/staticData';
import { Atleta, Stile, Tempo } from '../types';
import { parseTempo, formattaTempo, calcolaPuntiWPS } from './tempoUtils';

/** Un record FINP (italiano, europeo o mondiale) per classe e categoria. */
export interface RecordFINP {
  /** Vasca in metri (25 o 50). */
  v: number;
  /** Genere: 'M', 'F' o 'M&F' (mista). */
  g: string;
  /** Evento, es. '100 Stile Libero' o 'Staff. 4x50 Mista'. */
  ev: string;
  /** Classe: 'S10', 'SB8', 'SM9', 'PT20'... */
  cl: string;
  /** Tipo di record. */
  t: 'ITA' | 'EUR' | 'WR';
  /** Categoria (solo per ITA): Esordienti/Ragazzi/Juniores/Assoluto. */
  cat: string;
  /** Tempo in formato mm:ss.cc. */
  tm: string;
  /** Detentore. */
  d: string | null;
  /** Anno. */
  y: number | null;
  /** Nazione. */
  n: string | null;
  /** Luogo. */
  l: string | null;
  /** Data (gg/mm/aaaa). */
  dt: string | null;
  /** Manifestazione. */
  m: string | null;
}

export interface RecordMeta {
  fonte: string;
  aggiornato: string;
  url: string;
  nota: string;
}

interface RecordsPayload {
  meta: RecordMeta;
  records: RecordFINP[];
}

export interface ConfrontoRecord {
  /** Differenza in centesimi (positivo = atleta più lento del record). */
  deltaCentesimi: number;
  /** Percentuale rispetto al record (100 = uguale al record). */
  percentuale: number;
  /** true se l'atleta è più veloce o uguale al record. */
  migliore: boolean;
  /** Punteggio World Para Swimming (se record mondiale). */
  puntiWPS?: number | null;
}

const META_VUOTA: RecordMeta = { fonte: '', aggiornato: '', url: '', nota: '' };

/** Payload caricato all'avvio da `public/data/records.json` (vedi staticData). */
function data(): RecordsPayload | null {
  return payloadRecord() as RecordsPayload | null;
}

function elenco(): RecordFINP[] {
  return data()?.records ?? [];
}

const STILE_TO_EVENT: Record<Stile, string> = {
  STILE_LIBERO: 'Stile Libero',
  DORSO: 'Dorso',
  RANA: 'Rana',
  FARFALLA: 'Farfalla',
  MISTI: 'Misti'
};

const STILE_ORDER: Record<Stile, number> = {
  STILE_LIBERO: 0,
  DORSO: 1,
  RANA: 2,
  FARFALLA: 3,
  MISTI: 4
};

export const CATEGORIE_ITA = ['Esordienti', 'Ragazzi', 'Juniores', 'Assoluto'] as const;

function distanzaEvento(ev: string): number {
  const m = ev.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

function strokeEvento(ev: string): string {
  return ev.replace(/^\d+\s*/, '').trim();
}

function ordinaEventi(a: string, b: string): number {
  const ra = /Staff|Mistaffetta/i.test(a);
  const rb = /Staff|Mistaffetta/i.test(b);
  if (ra !== rb) return ra ? 1 : -1;
  const da = distanzaEvento(a);
  const db = distanzaEvento(b);
  if (da !== db) return da - db;
  const sa = strokeEvento(a);
  const sb = strokeEvento(b);
  const order = ['Stile Libero', 'Dorso', 'Rana', 'Farfalla', 'Misti'];
  const ia = order.indexOf(sa);
  const ib = order.indexOf(sb);
  if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  return a.localeCompare(b);
}

function ordinaClassi(a: string, b: string): number {
  const pref = (c: string) => (c.startsWith('SB') ? 1 : c.startsWith('SM') ? 2 : c.startsWith('PT') ? 3 : 0);
  const pa = pref(a);
  const pb = pref(b);
  if (pa !== pb) return pa - pb;
  const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
  return na - nb;
}

export class RecordService {
  static meta(): RecordMeta {
    return data()?.meta ?? META_VUOTA;
  }

  /** Tutti gli eventi disponibili per una vasca (individuali + staffette). */
  static eventi(vasca: number): string[] {
    const set = new Set<string>();
    for (const r of elenco()) if (r.v === vasca) set.add(r.ev);
    return [...set].sort(ordinaEventi);
  }

  /** Solo gli eventi individuali (esclude staffette). */
  static eventiIndividuali(vasca: number): string[] {
    return this.eventi(vasca).filter(e => !/Staff|Mistaffetta/i.test(e));
  }

  static generi(vasca: number, evento: string): string[] {
    const set = new Set<string>();
    for (const r of elenco()) if (r.v === vasca && r.ev === evento) set.add(r.g);
    return [...set].sort();
  }

  static classi(vasca: number, evento: string, genere: string): string[] {
    const set = new Set<string>();
    for (const r of elenco()) if (r.v === vasca && r.ev === evento && r.g === genere) set.add(r.cl);
    return [...set].sort(ordinaClassi);
  }

  /** Tutti i record (ITA/EUR/WR) per un evento, genere e classe. */
  static perClasse(vasca: number, evento: string, genere: string, classe: string): RecordFINP[] {
    return elenco().filter(
      r => r.v === vasca && r.ev === evento && r.g === genere && r.cl === classe
    );
  }

  /** Record ITA di una categoria specifica. */
  static recordIta(vasca: number, evento: string, genere: string, classe: string, categoria: string): RecordFINP | null {
    return (
      elenco().find(
        r =>
          r.v === vasca &&
          r.ev === evento &&
          r.g === genere &&
          r.cl === classe &&
          r.t === 'ITA' &&
          r.cat === categoria
      ) || null
    );
  }

  /** Record europeo o mondiale (categoria Assoluto). */
  static recordInternazionale(vasca: number, evento: string, genere: string, classe: string, tipo: 'EUR' | 'WR'): RecordFINP | null {
    return (
      elenco().find(
        r => r.v === vasca && r.ev === evento && r.g === genere && r.cl === classe && r.t === tipo
      ) || null
    );
  }

  /** Converte un tempo record ('01:04.20') in centesimi. */
  static tempoCentesimi(tm: string): number | null {
    return parseTempo(tm);
  }

  static formatta(centesimi: number): string {
    return formattaTempo(centesimi);
  }

  /** Confronta il tempo dell'atleta con un record. */
  static confronta(tempoAtletaCentesimi: number, recordCentesimi: number): ConfrontoRecord {
    const delta = tempoAtletaCentesimi - recordCentesimi;
    const percentuale = recordCentesimi > 0 ? (tempoAtletaCentesimi / recordCentesimi) * 100 : 0;
    const puntiWPS = calcolaPuntiWPS(tempoAtletaCentesimi, recordCentesimi);
    return { deltaCentesimi: delta, percentuale, migliore: delta <= 0, puntiWPS };
  }

  /** Etichetta della classe dell'atleta per uno stile (S/SB/SM). */
  static classePerStile(atleta: Atleta, stile: Stile): string | null {
    if (stile === 'RANA') return atleta.classeSB ? `SB${atleta.classeSB}` : null;
    if (stile === 'MISTI') return atleta.classeSM ? `SM${atleta.classeSM}` : null;
    return atleta.classeS ? `S${atleta.classeS}` : null;
  }

  /** Evento record corrispondente a un tempo dell'atleta. */
  static eventoPerTempo(t: Tempo): string {
    return `${t.distanzaMetri} ${STILE_TO_EVENT[t.stile]}`;
  }

  /** Miglior tempo di gara dell'atleta per un evento e vasca. */
  static migliorTempoAtleta(tempi: Tempo[], atletaId: number, vasca: number, evento: string): Tempo | null {
    const candidati = tempi.filter(
      t => t.atletaId === atletaId && t.vascaMetri === vasca && this.eventoPerTempo(t) === evento
    );
    if (candidati.length === 0) return null;
    return candidati.reduce((best, t) => (t.centesimi < best.centesimi ? t : best), candidati[0]);
  }

  /** Ordine di uno stile per la UI. */
  static ordineStile(stile: Stile): number {
    return STILE_ORDER[stile];
  }
}
