import calendarioData from '../data/calendario.json';

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
const EVENTI: EventoCalendario[] = [...DATA.eventi].sort((a, b) => a.dal.localeCompare(b.dal));

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

  static eventi(): EventoCalendario[] {
    return EVENTI;
  }

  static discipline(): string[] {
    const set = new Set<string>();
    for (const e of EVENTI) set.add(e.disciplina);
    return [...set].sort();
  }

  static perDisciplina(disciplina: string | null): EventoCalendario[] {
    if (!disciplina) return EVENTI;
    return EVENTI.filter(e => e.disciplina === disciplina);
  }

  /**
   * Solo le gare di nuoto in vasca (esclude fondo/acque libere e pallanuoto).
   * È il perimetro utile al piano di allenamento in piscina.
   */
  static nuotoVasca(): EventoCalendario[] {
    return EVENTI.filter(e => e.disciplina === 'Nuoto');
  }

  /** Eventi con data di inizio >= oggi (ISO). */
  static prossimi(oggiISO: string): EventoCalendario[] {
    return EVENTI.filter(e => e.al >= oggiISO);
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
