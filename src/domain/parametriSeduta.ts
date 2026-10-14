import { DayOfWeekNum, ParametriPiano } from '../types';
import { getDayOfWeek } from './dateUtils';

export interface VascaDurata {
  vascaMetri: 25 | 50;
  durataSedutaMin: number;
}

/**
 * Risolve la vasca e la durata effettive di una seduta, applicando in ordine di
 * priorità:
 *   1. l'override della singola seduta (per data, "in caso di necessità");
 *   2. il valore del giorno della settimana (1 = Lun … 7 = Dom);
 *   3. il valore di default del piano.
 *
 * È la fonte unica usata da tutte le schermate, così la scheda generata e i
 * volumi mostrati restano coerenti con la vasca/durata reali del giorno.
 */
export class ParametriSeduta {
  static risolvi(data: string | null | undefined, p: ParametriPiano): VascaDurata {
    const base: VascaDurata = {
      vascaMetri: p.vascaMetri,
      durataSedutaMin: p.durataSedutaMin
    };
    if (!data) return base;

    const ov = p.overrideSedute?.[data];
    const dow: DayOfWeekNum = getDayOfWeek(data);

    return {
      vascaMetri: ov?.vascaMetri ?? p.vascaPerGiorno?.[dow] ?? base.vascaMetri,
      durataSedutaMin: ov?.durataSedutaMin ?? p.durataPerGiorno?.[dow] ?? base.durataSedutaMin
    };
  }

  /** true se per quella data esiste un override esplicito di vasca o durata. */
  static haOverride(data: string | null | undefined, p: ParametriPiano): boolean {
    if (!data) return false;
    const ov = p.overrideSedute?.[data];
    return ov != null && (ov.vascaMetri != null || ov.durataSedutaMin != null);
  }
}
