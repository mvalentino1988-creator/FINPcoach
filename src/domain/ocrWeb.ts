import { OCRService } from './ocrService';

export class OcrWeb {
  static async riconosciTestoDaImmagine(file: File | Blob): Promise<string> {
    try {
      return await OCRService.riconosciTestoDaImmagine(file as File);
    } catch (e) {
      console.error('Errore OCR Web:', e);
      return '';
    }
  }
}
