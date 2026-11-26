/**
 * Mappa semantica unica dei colori di presentazione.
 *
 * Ogni entita' visuale ha: colore (da token esistenti) + icona/simbolo + testo
 * breve. Le classi Tailwind qui sotto usano solo token del design system
 * (primary/secondary/tertiary/success/warning/error/info/accent-gold/outline).
 * Regola: nessun colore fuori token; se serve una sfumatura si usa la forma
 * `<colore>/<alpha>` (supportata dai token rgb-triplet).
 */
import type { FaseMesociclo, TipoMicrociclo } from '../types';
import { FASE_MESOCICLO_LABEL, TIPO_MICROCICLO_LABEL } from '../types';

export interface SemanticaChip {
  /** Classi per un chip/etichetta (sfondo tenue + testo + bordo). */
  chip: string;
  /** Classe testo per numeri/testo nudo nello stesso colore. */
  text: string;
  /** Classe sfondo piena per barre/pallini. */
  solid: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Microcicli                                                          */
/* ------------------------------------------------------------------ */

export const MICROCOLORE: Record<TipoMicrociclo, SemanticaChip> = {
  ADATTAMENTO: {
    label: TIPO_MICROCICLO_LABEL.ADATTAMENTO,
    chip: 'border bg-accent-gold/15 text-accent-gold border-accent-gold/40',
    text: 'text-accent-gold',
    solid: 'bg-accent-gold',
  },
  CARICO: {
    label: TIPO_MICROCICLO_LABEL.CARICO,
    chip: 'border bg-primary/10 text-primary border-primary/30',
    text: 'text-primary',
    solid: 'bg-primary',
  },
  SCARICO: {
    label: TIPO_MICROCICLO_LABEL.SCARICO,
    chip: 'border bg-secondary/10 text-secondary border-secondary/30',
    text: 'text-secondary',
    solid: 'bg-secondary',
  },
  GARA: {
    label: TIPO_MICROCICLO_LABEL.GARA,
    chip: 'border bg-tertiary/10 text-tertiary border-tertiary/30',
    text: 'text-tertiary',
    solid: 'bg-tertiary',
  },
  RECUPERO: {
    label: TIPO_MICROCICLO_LABEL.RECUPERO,
    chip: 'border bg-success/10 text-success border-success/30',
    text: 'text-success',
    solid: 'bg-success',
  },
  PAUSA: {
    label: TIPO_MICROCICLO_LABEL.PAUSA,
    chip: 'border bg-surface-container-high text-on-surface-variant border-outline-variant',
    text: 'text-on-surface-variant',
    solid: 'bg-outline',
  },
};

export function microSemantica(tipo: TipoMicrociclo | string | undefined | null): SemanticaChip {
  if (tipo && tipo in MICROCOLORE) return MICROCOLORE[tipo as TipoMicrociclo];
  return {
    label: tipo ?? '—',
    chip: 'border bg-surface-container-high text-on-surface-variant border-outline-variant',
    text: 'text-on-surface-variant',
    solid: 'bg-outline',
  };
}

/* ------------------------------------------------------------------ */
/* Stati atleta in vasca (cronometro / regia)                          */
/* ------------------------------------------------------------------ */

export type StatoVasca = 'in_attesa' | 'in_nuoto' | 'in_ripartenza' | 'in_ritardo' | 'fermo';

export interface StatoVascaMeta {
  label: string;
  /** Simbolo geometrico (non testuale) usato nelle tessere. */
  symbol: string;
  /** Classe colore testo. */
  cls: string;
  /** Classe colore barra di avanzamento. */
  bar: string;
  /** Nome icona Lucide suggerita per contesti con spazio. */
  icon: 'circle' | 'waves' | 'rotate-ccw' | 'triangle-alert' | 'square';
}

export const STATO_VASCA: Record<StatoVasca, StatoVascaMeta> = {
  in_attesa:     { label: 'Attesa',     symbol: '○', cls: 'text-on-surface-variant', bar: 'bg-outline-variant', icon: 'circle' },
  in_nuoto:      { label: 'In nuoto',   symbol: '●', cls: 'text-secondary',          bar: 'bg-secondary',       icon: 'waves' },
  in_ripartenza: { label: 'Recupero',   symbol: '◔', cls: 'text-primary',            bar: 'bg-primary',         icon: 'rotate-ccw' },
  in_ritardo:    { label: 'In ritardo', symbol: '▲', cls: 'text-warning',            bar: 'bg-warning',         icon: 'triangle-alert' },
  fermo:         { label: 'Fermo',      symbol: '■', cls: 'text-on-surface-variant', bar: 'bg-outline',         icon: 'square' },
};

/* ------------------------------------------------------------------ */
/* Classi WPS (famiglie S / SB / SM)                                   */
/* ------------------------------------------------------------------ */

export type FamigliaClasse = 'S' | 'SB' | 'SM';

export interface ClasseSemantica {
  chip: string;
  text: string;
  solid: string;
}

export const CLASSE_FAMIGLIA: Record<FamigliaClasse, ClasseSemantica> = {
  S:  { chip: 'border bg-primary/10 text-primary border-primary/30',       text: 'text-primary',   solid: 'bg-primary' },
  SB: { chip: 'border bg-secondary/10 text-secondary border-secondary/30', text: 'text-secondary', solid: 'bg-secondary' },
  SM: { chip: 'border bg-tertiary/10 text-tertiary border-tertiary/30',    text: 'text-tertiary',  solid: 'bg-tertiary' },
};

/* ------------------------------------------------------------------ */
/* Fasi del mesociclo                                                  */
/* ------------------------------------------------------------------ */

export const FASE_SEMANTICA: Record<FaseMesociclo, SemanticaChip> = {
  PREPARAZIONE_GENERALE: {
    label: FASE_MESOCICLO_LABEL.PREPARAZIONE_GENERALE,
    chip: 'border bg-secondary/10 text-secondary border-secondary/30',
    text: 'text-secondary',
    solid: 'bg-secondary',
  },
  PREPARAZIONE_SPECIFICA: {
    label: FASE_MESOCICLO_LABEL.PREPARAZIONE_SPECIFICA,
    chip: 'border bg-primary/10 text-primary border-primary/30',
    text: 'text-primary',
    solid: 'bg-primary',
  },
  PRE_GARA: {
    label: FASE_MESOCICLO_LABEL.PRE_GARA,
    chip: 'border bg-accent-gold/15 text-accent-gold border-accent-gold/40',
    text: 'text-accent-gold',
    solid: 'bg-accent-gold',
  },
  COMPETITIVA: {
    label: FASE_MESOCICLO_LABEL.COMPETITIVA,
    chip: 'border bg-tertiary/10 text-tertiary border-tertiary/30',
    text: 'text-tertiary',
    solid: 'bg-tertiary',
  },
};

export function faseSemantica(fase: FaseMesociclo | string | undefined | null): SemanticaChip {
  if (fase && fase in FASE_SEMANTICA) return FASE_SEMANTICA[fase as FaseMesociclo];
  return {
    label: fase ?? '—',
    chip: 'border bg-surface-container-high text-on-surface-variant border-outline-variant',
    text: 'text-on-surface-variant',
    solid: 'bg-outline',
  };
}

/* ------------------------------------------------------------------ */
/* Livelli ACWR (allineati ai token acwr-* e alle soglie dominio)      */
/* ------------------------------------------------------------------ */

export type LivelloACWRSemantico = 'ottimale' | 'attenzione' | 'elevato' | 'sotto';

export interface AcwrSemantica {
  label: string;
  chip: string;
  dot: string;
}

export const ACWR_SEMANTICA: Record<LivelloACWRSemantico, AcwrSemantica> = {
  ottimale:   { label: 'ACWR ok',        chip: 'border bg-acwr-ok/10 text-acwr-ok border-acwr-ok/30',           dot: 'bg-acwr-ok' },
  attenzione: { label: 'ACWR attenzione',chip: 'border bg-acwr-attenzione/10 text-acwr-attenzione border-acwr-attenzione/30', dot: 'bg-acwr-attenzione' },
  elevato:    { label: 'ACWR elevato',   chip: 'border bg-acwr-critico/10 text-acwr-critico border-acwr-critico/30',           dot: 'bg-acwr-critico' },
  sotto:      { label: 'ACWR sotto',     chip: 'border bg-surface-container-high text-on-surface-variant border-outline-variant', dot: 'bg-outline' },
};

/** Mappa il livello dominio (sotto-allenamento/ottimale/attenzione/elevato) alla semantica UI. */
export function acwrSemantica(livello: string | undefined | null): AcwrSemantica {
  switch (livello) {
    case 'ottimale': return ACWR_SEMANTICA.ottimale;
    case 'attenzione': return ACWR_SEMANTICA.attenzione;
    case 'elevato': return ACWR_SEMANTICA.elevato;
    default: return ACWR_SEMANTICA.sotto;
  }
}
