import calendarioData from '../data/calendario.json';
import { kvGet, kvSet } from '../data/kvStore';

/** Un evento del calendario gare FINP. */
export interface EventoCalendario {
  id: string;
  titolo: string;
  /** Data inizio (YYYY-MM-DD). */
  dal: string;
  /** Data fine (YYYY-MM-DD). */
  al: string;
  luogo: string;
  regione: string;
  tipologia: string;
  disciplina: string;
  /** Suggerimento: gara prioritaria (A-Race). */
  prioritaria: boolean;
}

export interface MetaCalendario {
  fonte: string;
  url: string;
  aggiornato: string;
  nota: string;
}

interface CalendarioPayload {
  meta: MetaCalendario;
  eventi: EventoCalendario[];
}

const DATA = calendarioData as CalendarioPayload;

const STORAGE_KEY = 'finp_calendario_eventi_v1';

/** Evento personalizzato aggiunto/importato dall'utente (non fa parte dello snapshot FINP). */
export interface EventoPersonalizzato extends EventoCalendario {
  origine: 'manuale' | 'import';
}

function caricaPersonalizzati(): EventoPersonalizzato[] {
  try {
    const raw = kvGet(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && typeof e.id === 'string' && typeof e.dal === 'string' && typeof e.al === 'string');
  } catch {
    return [];
  }
}

function salvaPersonalizzati(lista: EventoPersonalizzato[]): void {
  try {
    kvSet(STORAGE_KEY, JSON.stringify(lista));
  } catch {
    // quota/private mode: gli eventi restano solo in memoria per questa sessione
  }
}

let PERSONALIZZATI: EventoPersonalizzato[] | null = null;
function personalizzati(): EventoPersonalizzato[] {
  if (PERSONALIZZATI === null) PERSONALIZZATI = caricaPersonalizzati();
  return PERSONALIZZATI;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

/** Valida un singolo evento (oggetto qualunque). Ritorna lista errori. */
export function validaEventoCalendario(raw: unknown, index = 0): string[] {
  const errori: string[] = [];
  const dove = `evento ${index + 1}`;
  if (typeof raw !== 'object' || raw === null) return [`${dove}: non e' un oggetto`];
  const e = raw as Record<string, unknown>;
  if (typeof e.titolo !== 'string' || !e.titolo.trim()) errori.push(`${dove}: titolo mancante`);
  for (const campo of ['dal', 'al'] as const) {
    const v = e[campo];
    if (typeof v !== 'string' || (!ISO_DATE.test(v) && !DATE_RE.test(v))) {
      errori.push(`${dove}: ${campo} non e' una data valida (YYYY-MM-DD o GG/MM/AAAA)`);
    }
  }
  if (errori.length === 0) {
    const norm = (v: string) => ISO_DATE.test(v) ? v : `${v.slice(6, 10)}-${v.slice(3, 5)}-${v.slice(0, 2)}`;
    if (norm(e.al as string) < norm(e.dal as string)) errori.push(`${dove}: data fine precedente alla data inizio`);
  }
  return errori;
}

function normalizzaEvento(raw: Record<string, unknown>, origine: 'manuale' | 'import'): EventoPersonalizzato | null {
  if (validaEventoCalendario(raw).length > 0) return null;
  const norm = (v: string) => ISO_DATE.test(v) ? v : `${v.slice(6, 10)}-${v.slice(3, 5)}-${v.slice(0, 2)}`;
  return {
    id: typeof raw.id === 'string' && raw.id ? `custom-${raw.id}` : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    titolo: String(raw.titolo).trim(),
    dal: norm(raw.dal as string),
    al: norm(raw.al as string),
    luogo: typeof raw.luogo === 'string' ? raw.luogo : '',
    regione: typeof raw.regione === 'string' ? raw.regione : '',
    tipologia: typeof raw.tipologia === 'string' ? raw.tipologia : 'Evento',
    disciplina: typeof raw.disciplina === 'string' && raw.disciplina ? raw.disciplina : 'Nuoto',
    prioritaria: raw.prioritaria === true,
    origine,
  };
}

export interface EsitoImportCalendario {
  ok: boolean;
  aggiunti: number;
  errori: string[];
}

/** Importa un JSON di calendario (formato calendario.json o array di eventi). */
export function importaCalendarioJson(testo: string): EsitoImportCalendario {
  let parsed: unknown;
  try {
    parsed = JSON.parse(testo);
  } catch {
    return { ok: false, aggiunti: 0, errori: ['File non e\' un JSON valido'] };
  }
  const lista: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { eventi?: unknown }).eventi))
      ? (parsed as { eventi: unknown[] }).eventi
      : [];
  if (lista.length === 0) {
    return { ok: false, aggiunti: 0, errori: ['Nessun evento trovato: il JSON deve essere un array o avere la chiave "eventi"'] };
  }
  const errori = lista.flatMap((e, i) => validaEventoCalendario(e, i));
  if (errori.length > 0) {
    return { ok: false, aggiunti: 0, errori: errori.slice(0, 10) };
  }
  const nuovi = (lista as Record<string, unknown>[]).map(r => normalizzaEvento(r, 'import')).filter((e): e is EventoPersonalizzato => e !== null);
  PERSONALIZZATI = [...personalizzati(), ...nuovi];
  salvaPersonalizzati(PERSONALIZZATI);
  return { ok: true, aggiunti: nuovi.length, errori: [] };
}

/** Aggiunge un evento manuale (conferma a carico della UI). */
export function aggiungiEventoManuale(e: Omit<EventoCalendario, 'id'>): EventoPersonalizzato | null {
  const raw = { ...e } as Record<string, unknown>;
  const ev = normalizzaEvento(raw, 'manuale');
  if (!ev) return null;
  PERSONALIZZATI = [...personalizzati(), ev];
  salvaPersonalizzati(PERSONALIZZATI);
  return ev;
}

const SNAPSHOT_EVENTI: EventoCalendario[] = [...DATA.eventi].sort((a, b) => a.dal.localeCompare(b.dal));

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

function parti(data: string): { y: number; m: number; d: number } {
  const [y, m, d] = data.split('-').map(Number);
  return { y, m, d };
}

export class CalendarioService {
  static meta(): MetaCalendario {
    return DATA.meta;
  }

  /** Snapshot FINP + eventi aggiunti/importati dall'utente, ordinati per data. */
  static eventi(): EventoCalendario[] {
    return [...SNAPSHOT_EVENTI, ...personalizzati()].sort((a, b) => a.dal.localeCompare(b.dal));
  }

  /**
   * Stato di aggiornamento del calendario: avvisa quando l'ultimo evento e'
   * passato o quando la stagione corrente ha un periodo scoperto (nessuna gara
   * nota nei prossimi 120 giorni durante il periodo agonistico mar-nov).
   */
  static statoAggiornamento(oggiISO: string): { aggiornato: boolean; motivo: string | null } {
    const tutti = this.eventi();
    if (tutti.length === 0) {
      return { aggiornato: false, motivo: 'Calendario vuoto: nessun evento caricato.' };
    }
    const ultimo = tutti.reduce((a, b) => (b.al > a.al ? b : a));
    if (ultimo.al < oggiISO) {
      const [y, m, d] = ultimo.al.split('-');
      return {
        aggiornato: false,
        motivo: `Calendario non aggiornato: ultimo evento il ${d}/${m}/${y}. Verifica il calendario ufficiale su ${DATA.meta.url}`,
      };
    }
    // Periodo scoperto: oggi dentro la stagione agonistica (mar-nov) ma nessuna
    // gara nota entro i prossimi 120 giorni.
    const mese = Number(oggiISO.slice(5, 7));
    if (mese >= 3 && mese <= 11) {
      const limite = new Date(new Date(oggiISO).getTime() + 120 * 86400000).toISOString().slice(0, 10);
      const coperto = tutti.some(e => e.dal <= limite && e.al >= oggiISO) ||
        tutti.some(e => e.dal >= oggiISO && e.dal <= limite);
      if (!coperto) {
        return {
          aggiornato: false,
          motivo: 'Calendario non aggiornato: nessuna gara nota nei prossimi 4 mesi. Verifica il calendario ufficiale su ' + DATA.meta.url,
        };
      }
    }
    return { aggiornato: true, motivo: null };
  }

  static discipline(): string[] {
    const set = new Set<string>();
    for (const e of this.eventi()) set.add(e.disciplina);
    return [...set].sort();
  }

  static perDisciplina(disciplina: string | null): EventoCalendario[] {
    if (!disciplina) return this.eventi();
    return this.eventi().filter(e => e.disciplina === disciplina);
  }

  /**
   * Solo le gare di nuoto in vasca (esclude fondo/acque libere e pallanuoto).
   * È il perimetro utile al piano di allenamento in piscina.
   */
  static nuotoVasca(): EventoCalendario[] {
    return this.eventi().filter(e => e.disciplina === 'Nuoto');
  }

  /** Eventi con data di inizio >= oggi (ISO). */
  static prossimi(oggiISO: string): EventoCalendario[] {
    return this.eventi().filter(e => e.al >= oggiISO);
  }

  /** Etichetta del periodo, es. "12 - 15 marzo 2026" o "18 aprile 2026". */
  static formattaPeriodo(e: EventoCalendario): string {
    const a = parti(e.dal);
    const b = parti(e.al);
    if (e.dal === e.al) {
      return `${a.d} ${MESI[a.m - 1]} ${a.y}`;
    }
    if (a.m === b.m && a.y === b.y) {
      return `${a.d} - ${b.d} ${MESI[a.m - 1]} ${a.y}`;
    }
    return `${a.d} ${MESI[a.m - 1]} - ${b.d} ${MESI[b.m - 1]} ${b.y}`;
  }

  /** Etichetta breve del mese, es. "Marzo 2026". */
  static meseLabel(dataISO: string): string {
    const { y, m } = parti(dataISO);
    const nome = MESI[m - 1];
    return nome.charAt(0).toUpperCase() + nome.slice(1) + ' ' + y;
  }

  /** Chiave mese (YYYY-MM) per raggruppare gli eventi. */
  static meseChiave(dataISO: string): string {
    return dataISO.slice(0, 7);
  }
}
