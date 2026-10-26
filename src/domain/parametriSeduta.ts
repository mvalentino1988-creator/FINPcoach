/**
 * Parametri operativi della seduta: vasca e durata.
 *
 * Regola di risoluzione (dalla piu' specifica alla piu' generale):
 *   1. override per la singola data  (impostazioni.overrideSedute[YYYY-MM-DD])
 *   2. programmazione del giorno     (impostazioni.parametriPerGiorno[dow])
 *   3. default di stagione           (stagione.vascaMetri + impostazioni.durataDefaultMin)
 *
 * Il volume NON viene deciso qui: questo modulo espone solo i parametri e gli
 * helper di calendario usati da domain/volumePrescritto.ts.
 */

import { DayOfWeekNum, ImpostazioniPiano, ParametriSeduta, Stagione } from '../types';
import { addDays, getDayOfWeek, previousOrSameMonday } from './dateUtils';

export const VASCHE_VALIDE = [25, 50] as const;
export const DURATA_MIN = 30;
export const DURATA_MAX = 210;
export const DURATA_DEFAULT_MIN = 90;

export type OrigineParametri = 'override' | 'giorno' | 'stagione';

export interface ParametriRisolti extends ParametriSeduta {
  data: string;
  giornoSettimana: DayOfWeekNum;
  origine: OrigineParametri;
}

export function normalizzaVasca(valore: number | null | undefined, fallback = 25): number {
  if (valore === 50) return 50;
  if (valore === 25) return 25;
  return fallback === 50 ? 50 : 25;
}

export function normalizzaDurata(valore: number | null | undefined, fallback = DURATA_DEFAULT_MIN): number {
  const n = Number(valore);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(DURATA_MAX, Math.max(DURATA_MIN, Math.round(n)));
}

export function normalizzaParametri(
  p: Partial<ParametriSeduta> | null | undefined,
  fallbackVasca = 25
): ParametriSeduta {
  return {
    vascaMetri: normalizzaVasca(p?.vascaMetri, fallbackVasca),
    durataMin: normalizzaDurata(p?.durataMin),
  };
}

export function parametriUguali(a: ParametriSeduta, b: ParametriSeduta): boolean {
  return a.vascaMetri === b.vascaMetri && a.durataMin === b.durataMin;
}

export function risolviParametriSeduta(
  data: string,
  impostazioni: ImpostazioniPiano | null | undefined,
  stagione: Stagione | null | undefined
): ParametriRisolti {
  const giornoSettimana = getDayOfWeek(data);
  const vascaStagione = normalizzaVasca(stagione?.vascaMetri, 25);
  const durataStagione = normalizzaDurata(impostazioni?.durataDefaultMin, DURATA_DEFAULT_MIN);

  const override = impostazioni?.overrideSedute?.[data];
  if (override) {
    const p = normalizzaParametri(override, vascaStagione);
    return { ...p, data, giornoSettimana, origine: 'override' };
  }

  const giorno = impostazioni?.parametriPerGiorno?.[giornoSettimana];
  if (giorno) {
    const p = normalizzaParametri(giorno, vascaStagione);
    return { ...p, data, giornoSettimana, origine: 'giorno' };
  }

  return {
    vascaMetri: vascaStagione,
    durataMin: durataStagione,
    data,
    giornoSettimana,
    origine: 'stagione',
  };
}

export function conParametriGiorno(
  impostazioni: ImpostazioniPiano,
  giorno: DayOfWeekNum,
  parametri: ParametriSeduta
): ImpostazioniPiano {
  return {
    ...impostazioni,
    parametriPerGiorno: {
      ...(impostazioni.parametriPerGiorno || {}),
      [giorno]: normalizzaParametri(parametri),
    },
  };
}

export function conOverride(
  impostazioni: ImpostazioniPiano,
  data: string,
  parametri: ParametriSeduta
): ImpostazioniPiano {
  return {
    ...impostazioni,
    overrideSedute: {
      ...(impostazioni.overrideSedute || {}),
      [data]: normalizzaParametri(parametri),
    },
  };
}

export function senzaOverride(impostazioni: ImpostazioniPiano, data: string): ImpostazioniPiano {
  if (!impostazioni.overrideSedute || !(data in impostazioni.overrideSedute)) return impostazioni;
  const overrideSedute = { ...impostazioni.overrideSedute };
  delete overrideSedute[data];
  return { ...impostazioni, overrideSedute };
}

/** Lunedì -> domenica della settimana che contiene `data`. */
export function dateSettimana(data: string): string[] {
  const lunedi = previousOrSameMonday(data);
  return Array.from({ length: 7 }, (_, i) => addDays(lunedi, i));
}

/** Date di allenamento della settimana che contiene `data`, ordinate. */
export function seduteSettimana(data: string, giorniAllenamento: DayOfWeekNum[] | undefined): string[] {
  const giorni = (giorniAllenamento && giorniAllenamento.length > 0
    ? giorniAllenamento
    : ([1, 3, 5] as DayOfWeekNum[]));
  const set = new Set(giorni);
  return dateSettimana(data).filter((iso) => set.has(getDayOfWeek(iso)));
}

/** Sedute della settimana da `data` in poi (include `data` se e' giorno di allenamento). */
export function seduteResidue(
  data: string,
  giorniAllenamento: DayOfWeekNum[] | undefined
): string[] {
  return seduteSettimana(data, giorniAllenamento).filter((iso) => iso >= data);
}
