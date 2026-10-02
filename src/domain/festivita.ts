import { Chiusura, Stagione } from '../types';
import { addDays, isAfter, isBefore, pad2 } from './dateUtils';

export class Festivita {
  /** Algoritmo di Meeus/Jones/Butcher (calendario gregoriano). */
  static pasqua(anno: number): string {
    const a = anno % 19;
    const b = Math.floor(anno / 100);
    const c = anno % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mese = Math.floor((h + l - 7 * m + 114) / 31);
    const giorno = ((h + l - 7 * m + 114) % 31) + 1;
    return `${anno}-${pad2(mese)}-${pad2(giorno)}`;
  }

  /**
   * Festività nazionali che cadono dentro la stagione, come chiusure di un giorno.
   */
  static perStagione(stagione: Stagione): Chiusura[] {
    const risultato: Chiusura[] = [];
    const inizioYear = parseInt(stagione.inizio.substring(0, 4), 10);
    const fineYear = parseInt(stagione.fine.substring(0, 4), 10);

    for (let anno = inizioYear; anno <= fineYear; anno++) {
      const pasquaIso = this.pasqua(anno);
      const pasquettaIso = addDays(pasquaIso, 1);

      const voci: [string, string][] = [
        [`${anno}-01-01`, 'Capodanno'],
        [`${anno}-01-06`, 'Epifania'],
        [pasquaIso, 'Pasqua'],
        [pasquettaIso, "Lunedì dell'Angelo"],
        [`${anno}-04-25`, 'Festa della Liberazione'],
        [`${anno}-05-01`, 'Festa del Lavoro'],
        [`${anno}-06-02`, 'Festa della Repubblica'],
        [`${anno}-08-15`, 'Ferragosto'],
        [`${anno}-11-01`, 'Ognissanti'],
        [`${anno}-12-08`, 'Immacolata Concezione'],
        [`${anno}-12-25`, 'Natale'],
        [`${anno}-12-26`, 'Santo Stefano']
      ];

      for (const [data, motivo] of voci) {
        if (!isBefore(data, stagione.inizio) && !isAfter(data, stagione.fine)) {
          risultato.push({
            id: 0,
            stagioneId: stagione.id,
            dal: data,
            al: data,
            motivo
          });
        }
      }
    }

    return risultato.sort((a, b) => a.dal.localeCompare(b.dal));
  }
}
