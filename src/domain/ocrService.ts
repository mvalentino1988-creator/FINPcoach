/**
 * Servizio OCR unificato per FINPcoach.
 * Riutilizza un singolo worker Tesseract, pre-processing canvas e
 * auto-detezione tra scheda di allenamento e gara.
 */

import { createWorker, Worker } from 'tesseract.js';

export type ModalitaOCR = 'auto' | 'scheda' | 'gara';

export interface RisultatoOCR {
  testo: string;
  modalita: ModalitaOCR;
  confidenza: number;
}

export class OCRService {
  private static worker: Worker | null = null;
  private static inizializzando: Promise<Worker> | null = null;

  private static async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    if (this.inizializzando) return this.inizializzando;

    this.inizializzando = (async () => {
      const worker = await createWorker('ita+eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/core',
        langPath: '/tesseract/lang',
        logger: () => {},
      });
      this.worker = worker;
      return worker;
    })();

    try {
      return await this.inizializzando;
    } finally {
      this.inizializzando = null;
    }
  }

  static async termina(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private static preProcessaImmagine(file: File | Blob): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas non supportato');

          const scala = Math.min(2, 2000 / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scala);
          canvas.height = Math.round(img.height * scala);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Grayscale + contrasto + binarizzazione leggera
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const contrast = 1.4;
            let val = ((gray - 128) * contrast + 128);
            val = val > 160 ? 255 : val < 95 ? 0 : val;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
          ctx.putImageData(imageData, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossibile caricare immagine'));
      };
      img.src = url;
    });
  }

  /**
   * Rileva se il testo OCR descrive una scheda di allenamento o una gara.
   * Esposta perche' le schermate possano instradare l'utente al flusso giusto.
   */
  static rilevaModalita(testo: string): ModalitaOCR {
    const t = (testo || '').toLowerCase();
    if (!t.trim()) return 'auto';

    // Indicatori forti di gara: struttura, risultati, batterie.
    const indicatoriGara = [
      'batteria', 'finale', 'semifinale', 'classifica', 'risultato', 'risultati',
      'tempo', 'tempo finale', 'gara', 'gare', 'piscina', 'gara 1', 'gara 2',
      '1a gara', '2a gara', 'assoluta', 'categoria', 'tabella tempi', 'record',
    ];
    // Indicatori forti di scheda: struttura di allenamento.
    const indicatoriScheda = [
      'riscaldamento', 'defaticamento', 'defaticamento e', 'attivazione',
      'ripetizioni', 'metri', 'vasca', 'corsia', 'recupero', 'settimana',
      'esercizi', 'schema', 'circuito',
    ];

    let scoreGara = 0;
    let scoreScheda = 0;
    for (const k of indicatoriGara) if (t.includes(k)) scoreGara += 2;
    for (const k of indicatoriScheda) if (t.includes(k)) scoreScheda += 2;

    // Le serie "NxY" sono tipiche delle schede di allenamento.
    if (/\b\d{1,3}\s?x\s?\d{2,4}\b/.test(t)) scoreScheda += 3;
    // I temi in formato 1'23"45 sono tipici delle gare.
    if (/\d+'\d{2}"\d{0,2}/.test(t)) scoreGara += 3;
    // Distanze in metri senza pattern serie: tipiche delle schede.
    if (/\d{2,4}\s?m\b/.test(t)) scoreScheda += 1;

    if (scoreGara > scoreScheda && scoreGara >= 2) return 'gara';
    if (scoreScheda > scoreGara && scoreScheda >= 2) return 'scheda';
    return 'auto';
  }

  static async riconosci(file: File | Blob, modalita: ModalitaOCR = 'auto'): Promise<RisultatoOCR> {
    const worker = await this.getWorker();
    const canvas = await this.preProcessaImmagine(file);
    const { data } = await worker.recognize(canvas);
    const testo = (data.text || '').replace(/\r\n/g, '\n').trim();
    const rilevata = modalita === 'auto' ? this.rilevaModalita(testo) : modalita;
    return {
      testo,
      modalita: rilevata,
      confidenza: data.confidence || 0,
    };
  }

  /** Compatibile con OcrWeb.riconosciTestoDaImmagine */
  static async riconosciTestoDaImmagine(file: File | Blob): Promise<string> {
    const res = await this.riconosci(file, 'auto');
    return res.testo;
  }
}

export { OCRService as OcrService };
