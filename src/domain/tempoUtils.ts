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

/**
 * Calcolo del Punteggio Ufficiale World Para Swimming (WPS Points).
 * Formula standard World Para Swimming: Punti = 1000 * (WorldRecord / TempoAtleta)^3
 * Se tempoAtleta <= 0 o record <= 0 restituisce null.
 */
export function calcolaPuntiWPS(tempoAtletaCentesimi: number, recordMondoCentesimi: number): number | null {
  if (tempoAtletaCentesimi <= 0 || recordMondoCentesimi <= 0) return null;
  const ratio = recordMondoCentesimi / tempoAtletaCentesimi;
  const punti = Math.round(1000 * Math.pow(ratio, 3));
  return Math.max(0, punti);
}

/**
 * Conversione tempi tra Vasca Corta (25m) e Vasca Lunga (50m) per il nuoto paralimpico.
 * Nel nuoto paralimpico il fattore virata dipende dalla classe funzionale dell'atleta:
 * - Classi alte (S8-S14): virata efficiente (~0.7s - 0.9s per virata da 50 a 25)
 * - Classi basse (S1-S5): virata senza rollio o più lenta (~1.3s - 2.0s per virata da 50 a 25)
 *
 * @param tempoCentesimi Tempo di partenza in centesimi di secondo
 * @param distanzaMetri Distanza della gara (50, 100, 200, 400, 800, 1500)
 * @param vascaOrigine 25 | 50
 * @param vascaTarget 25 | 50
 * @param classeS Classe funzionale dell'atleta (opzionale, default S9)
 */
export function convertiVasca(
  tempoCentesimi: number,
  distanzaMetri: number,
  vascaOrigine: 25 | 50,
  vascaTarget: 25 | 50,
  classeS: number = 9
): number {
  if (vascaOrigine === vascaTarget || tempoCentesimi <= 0 || distanzaMetri <= 0) {
    return tempoCentesimi;
  }

  // Numero di virate in 25m vs 50m
  const virate25 = Math.floor(distanzaMetri / 25) - 1;
  const virate50 = Math.floor(distanzaMetri / 50) - 1;
  const deltaVirate = virate25 - virate50; // virate aggiuntive in vasca da 25m

  // Delta tempo per virata aggiuntiva in base alla classe funzionale
  let secondiPerVirata = 0.8;
  if (classeS <= 4) {
    secondiPerVirata = 1.6;
  } else if (classeS <= 7) {
    secondiPerVirata = 1.1;
  } else if (classeS <= 10) {
    secondiPerVirata = 0.8;
  } else {
    secondiPerVirata = 0.7; // S11-S14
  }

  const deltaCentesimi = Math.round(deltaVirate * secondiPerVirata * 100);

  if (vascaOrigine === 50 && vascaTarget === 25) {
    // Da 50m a 25m il tempo è più veloce (sottrai il vantaggio delle virate)
    return Math.max(100, tempoCentesimi - deltaCentesimi);
  } else {
    // Da 25m a 50m il tempo è più lento (somma lo svantaggio delle minori virate)
    return tempoCentesimi + deltaCentesimi;
  }
}
