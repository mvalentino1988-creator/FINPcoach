import { createWorker } from 'tesseract.js';

export class OcrWeb {
  static async riconosciTestoDaImmagine(file: File | Blob): Promise<string> {
    try {
      const worker = await createWorker('ita+eng');
      const ret = await worker.recognize(file);
      await worker.terminate();
      return ret.data.text || '';
    } catch (e) {
      console.error('Errore OCR Web:', e);
      return '';
    }
  }
}
