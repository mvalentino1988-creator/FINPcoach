/**
 * Helper per OCR (Optical Character Recognition) usando Tesseract.js.
 * Estrae testo da immagini per interpretare tempi di gara o allenamenti.
 */

import { createWorker } from 'tesseract.js';
import { parseTempo, parseSeduta, RisultatoParsing } from './nlpParser';

let worker: any = null;

/**
 * Inizializza il worker Tesseract
 */
async function initWorker() {
  if (!worker) {
    worker = await createWorker('ita', 1, {
      logger: (m: any) => console.log(m)
    });
  }
  return worker;
}

/**
 * Estrae testo da un'immagine (File o base64).
 * Ritorna il testo estratto o null in caso di errore.
 */
export async function estraiTestoDaImmagine(image: File | string): Promise<string | null> {
  try {
    const w = await initWorker();
    const result = await w.recognize(image);
    return result.data.text;
  } catch (e) {
    console.error('Errore OCR:', e);
    return null;
  }
}

/**
 * Estrae testo da un'immagine e lo passa al parser NLP.
 * Ritorna un RisultatoParsing con i dati estratti.
 */
export async function parseTempoDaImmagine(image: File | string): Promise<RisultatoParsing> {
  const testo = await estraiTestoDaImmagine(image);
  if (testo && testo.trim()) {
    return parseTempo(testo);
  } else {
    return {
      successo: false,
      messaggio: 'Non è stato possibile estrarre testo dall\'immagine. Prova a fare una foto più chiara.'
    };
  }
}

/**
 * Estrae testo da un'immagine e lo passa al parser NLP per sedute.
 * Ritorna un RisultatoParsing con i dati estratti.
 */
export async function parseSedutaDaImmagine(image: File | string): Promise<RisultatoParsing> {
  const testo = await estraiTestoDaImmagine(image);
  if (testo && testo.trim()) {
    return parseSeduta(testo);
  } else {
    return {
      successo: false,
      messaggio: 'Non è stato possibile estrarre testo dall\'immagine. Prova a fare una foto più chiara.'
    };
  }
}

/**
 * Termina il worker quando non serve più
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
