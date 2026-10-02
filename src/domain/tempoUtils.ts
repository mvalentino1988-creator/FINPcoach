import { Tempo, Primato, Stile } from '../types';

const REGEX_TEMPO = /^(?:(\d{1,2}):)?(\d{1,2})(?:[.,](\d{1,2}))?$/;

/**
 * "1:02.35", "62.35", "28,4", "60" -> centesimi.
 * Restituisce null se il testo non è valido.
 */
export function parseTempo(testo: string): number | null {
  if (!testo) return null;
  const t = testo.trim();
  const m = t.match(REGEX_TEMPO);
  if (!m) return null;

  const minutiStr = m[1];
  const minuti = minutiStr ? parseInt(minutiStr, 10) : 0;
  const secondi = parseInt(m[2], 10);

  if (minutiStr && minutiStr.length > 0 && secondi >= 60) return null;

  const dec = m[3];
  let centesimi = 0;
  if (dec) {
    if (dec.length === 1) {
      centesimi = parseInt(dec, 10) * 10;
    } else {
      centesimi = parseInt(dec.substring(0, 2), 10);
    }
  }

  const totale = (minuti * 60 + secondi) * 100 + centesimi;
  return totale > 0 ? totale : null;
}

/**
 * 6235 -> "1:02.35"; 2840 -> "28.40"
 */
export function formattaTempo(centesimi: number): string {
  if (centesimi <= 0) return '0.00';
  const minuti = Math.floor(centesimi / 6000);
  const secondi = Math.floor((centesimi % 6000) / 100);
  const cent = centesimi % 100;
  const secStr = minuti > 0 && secondi < 10 ? `0${secondi}` : `${secondi}`;
  const centStr = cent < 10 ? `0${cent}` : `${cent}`;
  return minuti > 0 ? `${minuti}:${secStr}.${centStr}` : `${secStr}.${centStr}`;
}

const STILE_ORDER: Record<Stile, number> = {
  STILE_LIBERO: 0,
  DORSO: 1,
  RANA: 2,
  FARFALLA: 3,
  MISTI: 4
};

/**
 * Miglior tempo di gara per stile, distanza e vasca (i tempi di allenamento e test non contano).
 */
export function primatiPersonali(tempi: Tempo[]): Primato[] {
  const gare = tempi.filter(t => t.contesto === 'GARA');
  const gruppi = new Map<string, Tempo[]>();

  for (const t of gare) {
    const key = `${t.stile}_${t.distanzaMetri}_${t.vascaMetri}`;
    if (!gruppi.has(key)) {
      gruppi.set(key, []);
    }
    gruppi.get(key)!.push(t);
  }

  const primati: Primato[] = [];
  for (const [, lista] of gruppi.entries()) {
    let migliore = lista[0];
    for (const t of lista) {
      if (t.centesimi < migliore.centesimi) {
        migliore = t;
      }
    }
    primati.push({
      stile: migliore.stile,
      distanzaMetri: migliore.distanzaMetri,
      vascaMetri: migliore.vascaMetri,
      centesimi: migliore.centesimi,
      data: migliore.data
    });
  }

  return primati.sort((a, b) => {
    const sDiff = STILE_ORDER[a.stile] - STILE_ORDER[b.stile];
    if (sDiff !== 0) return sDiff;
    const dDiff = a.distanzaMetri - b.distanzaMetri;
    if (dDiff !== 0) return dDiff;
    return a.vascaMetri - b.vascaMetri;
  });
}
