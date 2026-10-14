/**
 * Parser di linguaggio naturale per l'inserimento di tempi di gara e allenamenti.
 * Approccio ibrido: prima tenta il parsing locale (regex), se fallisce chiede chiarimenti.
 */

export interface RisultatoParsing {
  successo: boolean;
  dati?: DatiParsati;
  domande: string[];
  messaggio: string;
}

export interface DatiParsati {
  stile?: string;
  distanzaMetri?: number;
  centesimi?: number;
  note: string;
  contesto: 'GARA' | 'ALLENAMENTO' | 'TEST';
  vascaMetri: number;
}

export const STILI = {
  STILE_LIBERO: 'STILE_LIBERO',
  DORSO: 'DORSO',
  RANA: 'RANA',
  FARFALLA: 'FARFALLA',
  MISTI: 'MISTI'
} as const;

export const STILE_ETICHETTE: Record<string, string> = {
  STILE_LIBERO: 'Stile libero',
  DORSO: 'Dorso',
  RANA: 'Rana',
  FARFALLA: 'Farfalla',
  MISTI: 'Misti'
};

// Pattern regex per diversi formati di input
const PATTERN_TEMPO = /(\d+)[:.](\d{2})[:.](\d{2})|(\d+)[:.](\d{2})|(\d+)(?:m| metri)?/g;
const PATTERN_STILE = /(stile\s*libero|libero|sl|crawl|freestyle|dorso|back|d|rana|breaststroke|br|farfalla|fly|f|misti|medley|im)/gi;
const PATTERN_DISTANZA = /(\d+)\s*(?:m|metri)/g;
const PATTERN_GARA = /(gara|competizione|campionato|race)/gi;
const PATTERN_ALLENAMENTO = /(allenamento|training|test|prove)/gi;
const PATTERN_VASCA = /(vasca\s*)?(\d+)\s*m/gi;

/**
 * Parsing di un testo libero per estrarre dati di un tempo di gara.
 * Ritorna un RisultatoParsing con successo, dati parsati, o domande per chiarimenti.
 */
export function parseTempo(testo: string): RisultatoParsing {
  const t = testo.trim().toLowerCase();

  // Estrazione stile
  const stileMatch = PATTERN_STILE.exec(t);
  let stile: string | undefined;
  if (stileMatch) {
    const match = stileMatch[1].toLowerCase();
    if (['stile libero', 'libero', 'sl', 'crawl', 'freestyle'].includes(match)) {
      stile = STILI.STILE_LIBERO;
    } else if (['dorso', 'back', 'd'].includes(match)) {
      stile = STILI.DORSO;
    } else if (['rana', 'breaststroke', 'br'].includes(match)) {
      stile = STILI.RANA;
    } else if (['farfalla', 'fly', 'f'].includes(match)) {
      stile = STILI.FARFALLA;
    } else if (['misti', 'medley', 'im'].includes(match)) {
      stile = STILI.MISTI;
    }
  }

  // Estrazione distanza
  const distanzaMatch = PATTERN_DISTANZA.exec(t);
  const distanza = distanzaMatch ? parseInt(distanzaMatch[1]) : undefined;

  // Estrazione tempo
  const tempoMatch = PATTERN_TEMPO.exec(t);
  let centesimi: number | undefined;
  if (tempoMatch) {
    if (tempoMatch[1]) {
      // formato mm:ss.cc
      const min = parseInt(tempoMatch[1]) || 0;
      const sec = parseInt(tempoMatch[2]) || 0;
      const cent = parseInt(tempoMatch[3]) || 0;
      centesimi = min * 6000 + sec * 100 + cent;
    } else if (tempoMatch[4]) {
      // formato ss.cc
      const sec = parseInt(tempoMatch[4]) || 0;
      const cent = parseInt(tempoMatch[5]) || 0;
      centesimi = sec * 100 + cent;
    }
  }

  // Estrazione contesto
  let contesto: 'GARA' | 'ALLENAMENTO' | 'TEST' = 'GARA';
  if (PATTERN_GARA.test(t)) {
    contesto = 'GARA';
  } else if (PATTERN_ALLENAMENTO.test(t)) {
    contesto = 'ALLENAMENTO';
  }

  // Estrazione vasca
  const vascaMatch = PATTERN_VASCA.exec(t);
  const vasca = vascaMatch ? parseInt(vascaMatch[2]) : 25;

  // Verifica cosa manca e genera domande
  const domande: string[] = [];
  if (!stile) domande.push('Quale stile? (stile libero, dorso, rana, farfalla, misti)');
  if (!distanza) domande.push('Quale distanza? (es. 50m, 100m, 200m)');
  if (!centesimi) domande.push('Qual è il tempo? (es. 1:02.35 per 1 minuto e 2.35 secondi)');

  if (domande.length > 0) {
    return {
      successo: false,
      domande,
      messaggio: `Non ho capito completamente. ${domande.join(' ')}`
    };
  }

  return {
    successo: true,
    dati: {
      stile,
      distanzaMetri: distanza,
      centesimi,
      note: testo,
      contesto,
      vascaMetri: vasca
    },
    messaggio: `Ho capito: ${STILE_ETICHETTE[stile!]} ${distanza}m in ${formattaTempo(centesimi!)}`
  };
}

/**
 * Parsing di un testo libero per estrarre dati di una seduta di allenamento.
 */
export function parseSeduta(testo: string): RisultatoParsing {
  const t = testo.trim().toLowerCase();

  // Estrazione metri totali
  const distanzaMatch = PATTERN_DISTANZA.exec(t);
  const metri = distanzaMatch ? parseInt(distanzaMatch[1]) : undefined;

  // Estrazione durata (minuti)
  const durataMatch = /(\d+)\s*(?:min|minuti|m)/.exec(t);
  const durata = durataMatch ? parseInt(durataMatch[1]) : undefined;

  // Estrazione RPE
  const rpeMatch = /rpe\s*:?\s*(\d+)/.exec(t);
  const rpe = rpeMatch ? parseInt(rpeMatch[1]) : undefined;

  const domande: string[] = [];
  if (!metri) domande.push('Quanti metri hai fatto? (es. 2000m)');
  if (!durata) domande.push('Quanto è durata la seduta? (es. 60 min)');

  if (domande.length > 0) {
    return {
      successo: false,
      domande,
      messaggio: `Non ho capito completamente. ${domande.join(' ')}`
    };
  }

  return {
    successo: true,
    dati: {
      distanzaMetri: metri,
      note: testo,
      contesto: 'ALLENAMENTO',
      vascaMetri: 25
    },
    messaggio: `Ho capito: ${metri}m in ${durata}min${rpe ? ` con RPE ${rpe}` : ''}`
  };
}

/**
 * Formatta i centesimi in formato mm:ss.cc
 */
export function formattaTempo(centesimi: number): string {
  const min = Math.floor(centesimi / 6000);
  const sec = Math.floor((centesimi % 6000) / 100);
  const cent = centesimi % 100;
  if (min > 0) {
    return `${min}:${sec.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
  } else {
    return `${sec.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
  }
}

/**
 * Funzione pubblica per formattare il tempo per display
 */
export function formattaTempoDisplay(centesimi: number): string {
  return formattaTempo(centesimi);
}
