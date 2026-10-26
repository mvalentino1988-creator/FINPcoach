/**
 * FONTE UNICA DEL VOLUME PRESCRITTO.
 *
 * Catena di calcolo, in ordine, senza altre euristiche sparse nel codice:
 *
 *   1. target settimanale del microciclo (squadra)
 *   2. fattore individuale dell'atleta (fattoreVolume, assenze, rientro)
 *   3. ripartizione della settimana per DURATA (quota proporzionale)
 *   4. cap di sostenibilita' legato a durata e passo (non si prescrive piu'
 *      volume di quanto l'atleta possa nuotare nei minuti disponibili)
 *   5. fattore di carico ACWR (solo riduzione, mai aumento automatico)
 *
 * La ricalibrazione (cambio durata/vasca in corsa) usa `ripartisciSettimana`:
 * il volume settimanale resta lo stesso e viene ridistribuito tra le sedute
 * residue in proporzione alla durata, rispettando i cap.
 */

import {
  Assenza,
  Atleta,
  CondizioneMedica,
  LogSeduta,
  Microciclo,
  ParametriSeduta,
  Tempo,
} from '../types';
import { addDays, previousOrSameMonday, todayISO } from './dateUtils';
import { CalibrazioneAtleta } from './calibrazioneAtleta';
import { CalcoloScienzaNuoto } from './calcoloCSS';
import { normalizzaDurata, normalizzaVasca } from './parametriSeduta';
import { VolumeIndividuale } from './volumeIndividuale';

/** Arrotonda al multiplo di 50m piu' vicino (unita' minima di prescrizione). */
export function arrotondaA50m(n: number): number {
  return Math.round(n / 50) * 50;
}

/** Efficienza media di lavoro in vasca: tiene conto di virate, recuperi e spiegazioni. */
export const EFFICIENZA_VASCA = 0.7;

const PASSO_DEFAULT_CENTESIMI = 6000; // 1'00" / 100m

const ATLETA_DEFAULT: Atleta = {
  id: -1,
  nome: 'Squadra',
  cognome: '',
  stato: 'UFFICIALE',
  fattoreVolume: 1,
  note: '',
  volumeAuto: true,
};

export interface SedutaSettimana {
  data: string;
  parametri: ParametriSeduta;
}

export interface VolumeSessioneInput {
  micro?: Microciclo | null;
  atleta?: Atleta | null;
  assenze?: Assenza[];
  condizioni?: CondizioneMedica[];
  tempi?: Tempo[];
  logSedute?: LogSeduta[];
  parametri: ParametriSeduta;
  /** Tutte le sedute della settimana (incluse quelle passate): servono per la quota. */
  durateSettimana?: SedutaSettimana[];
  /** Fallback quando non esiste un microciclo attivo. */
  volumeSettimanaFallback?: number;
}

export interface VolumeSessione {
  /** Metri prescritti per questa seduta. */
  metriSessione: number;
  /** Volume settimanale dell'atleta dopo fattori (assenze, rientro, ...). */
  metriSettimana: number;
  /** Volume settimanale di squadra (target del microciclo). */
  metriSettimanaSquadra: number;
  /** Quota della settimana assegnata a questa seduta (0-1). */
  quota: number;
  /** Tetto fisico: metri nuotabili nella durata disponibile. */
  capDurataMetri: number;
  fattoreAtleta: number;
  fattoreCalibrazione: number;
  fattoreCarico: number;
  passo100mCentesimi: number;
  vascaMetri: number;
  durataMin: number;
  note: string[];
  avvertenze: string[];
}

/** Metri nuotabili al minuto: 100m ogni `passo` centesimi, con efficienza di vasca. */
export function metriPerMinuto(passo100mCentesimi: number): number {
  const passo = passo100mCentesimi > 0 ? passo100mCentesimi : PASSO_DEFAULT_CENTESIMI;
  // 6000 centesimi = 1 minuto, quindi 100m / (passo / 6000) minuti = 600000/passo metri al minuto.
  return (600000 / passo) * EFFICIENZA_VASCA;
}

/** Metri massimi sostenibili in `durataMin` minuti con il passo indicato. */
export function capDurataMetri(durataMin: number, passo100mCentesimi: number): number {
  return Math.max(
    0,
    arrotondaA50m(normalizzaDurata(durataMin) * metriPerMinuto(passo100mCentesimi))
  );
}

/** Durata stimata (minuti) per nuotare `metri` con il passo indicato. */
export function durataStimataMin(metri: number, passo100mCentesimi: number): number {
  const velocita = metriPerMinuto(passo100mCentesimi);
  if (velocita <= 0) return 0;
  return Math.max(1, Math.round(metri / velocita));
}

function passoAtleta(
  atleta: Atleta | null | undefined,
  tempi: Tempo[],
  condizioni: CondizioneMedica[],
  logSedute: LogSeduta[]
): { passo: number; fattore: number; note: string[] } {
  const calib = CalibrazioneAtleta.calibra(atleta || ATLETA_DEFAULT, tempi, condizioni, logSedute);
  return {
    passo: calib.passo100mCentesimi || PASSO_DEFAULT_CENTESIMI,
    fattore: calib.fattoreCorrezione ?? 1,
    note: calib.note,
  };
}

/** Carico delle ultime settimane dell'atleta (metri effettivi). */
function carichiSettimanali(logSedute: LogSeduta[], atletaId: number | null, settimane = 4): number[] {
  if (!logSedute || logSedute.length === 0) return [];
  const oggi = todayISO();
  const lunediCorrente = previousOrSameMonday(oggi);
  const out: number[] = [];
  for (let i = 1; i <= settimane; i++) {
    const inizio = addDays(lunediCorrente, -7 * i);
    const fine = addDays(inizio, 6);
    const totale = logSedute
      .filter((l) => l.presente && l.data >= inizio && l.data <= fine)
      .filter((l) => atletaId === null || l.atletaId === atletaId)
      .reduce((sum, l) => sum + (l.metriEffettivi || 0), 0);
    out.push(totale);
  }
  return out;
}

/**
 * Calcola il volume prescritto per una seduta.
 * Questa e' l'unica funzione che le schermate devono usare per sapere "quanti metri".
 */
export function calcolaVolumeSessione(input: VolumeSessioneInput): VolumeSessione {
  const parametri: ParametriSeduta = {
    vascaMetri: normalizzaVasca(input.parametri.vascaMetri),
    durataMin: normalizzaDurata(input.parametri.durataMin),
  };
  const note: string[] = [];
  const avvertenze: string[] = [];

  const settimana = input.durateSettimana && input.durateSettimana.length > 0
    ? input.durateSettimana
    : [{ data: todayISO(), parametri }];

  const seduteSquadra = Math.max(
    1,
    input.micro?.sedutePreviste || settimana.length
  );

  const durataTotale = settimana.reduce((s, x) => s + normalizzaDurata(x.parametri.durataMin), 0) || parametri.durataMin;
  const quota = Math.min(1, normalizzaDurata(parametri.durataMin) / durataTotale);

  let metriSettimanaSquadra = input.micro?.volumeTargetMetri
    || input.volumeSettimanaFallback
    || 1800 * seduteSquadra;

  let metriSettimana = metriSettimanaSquadra;
  let fattoreAtleta = 1;

  if (input.micro && input.atleta) {
    const indiv = VolumeIndividuale.settimana(input.micro, input.atleta, input.assenze || []);
    metriSettimana = indiv.metri;
    note.push(...indiv.note);
    fattoreAtleta = metriSettimanaSquadra > 0 ? metriSettimana / metriSettimanaSquadra : 1;
  } else if (input.atleta) {
    fattoreAtleta = input.atleta.fattoreVolume || 1;
    metriSettimana = metriSettimanaSquadra * fattoreAtleta;
  }

  const { passo, fattore: fattoreCalibrazione, note: noteCalib } = passoAtleta(
    input.atleta,
    input.tempi || [],
    input.condizioni || [],
    input.logSedute || []
  );
  note.push(...noteCalib);

  const cap = capDurataMetri(parametri.durataMin, passo);

  let fattoreCarico = 1;
  const carichi = carichiSettimanali(input.logSedute || [], input.atleta?.id ?? null);
  if (carichi.some((c) => c > 0)) {
    const acwr = CalcoloScienzaNuoto.calcolaACWR(metriSettimana, carichi);
    if (acwr.acwrRapporto > 1.45) {
      fattoreCarico = 0.85;
      if (acwr.avvisoInfortunio) avvertenze.push(acwr.avvisoInfortunio);
    } else if (acwr.acwrRapporto > 1.25) {
      fattoreCarico = 0.93;
      if (acwr.avvisoInfortunio) note.push(acwr.avvisoInfortunio);
    }
  }

  const teorico = arrotondaA50m(metriSettimana * quota * fattoreCalibrazione * fattoreCarico);
  const metriSessione = Math.max(0, Math.min(teorico, cap));

  if (teorico > cap) {
    note.push(
      `Volume ridotto a ${cap}m dal vincolo di ${parametri.durataMin} minuti ` +
      `(passo ${(passo / 100).toFixed(0)}" /100m).`
    );
  }

  return {
    metriSessione,
    metriSettimana,
    metriSettimanaSquadra,
    quota,
    capDurataMetri: cap,
    fattoreAtleta,
    fattoreCalibrazione,
    fattoreCarico,
    passo100mCentesimi: passo,
    vascaMetri: parametri.vascaMetri,
    durataMin: parametri.durataMin,
    note,
    avvertenze,
  };
}

export interface RipartizioneSettimana {
  data: string;
  parametri: ParametriSeduta;
  quota: number;
  metri: number;
  cap: number;
  limitata: boolean;
}

/**
 * Ripartisce un volume settimanale tra le sedute in proporzione alla durata,
 * rispettando i cap e ridistribuendo l'eccedenza sulle sedute con capienza.
 * Usata sia per la programmazione sia per la ricalibrazione dopo un override.
 */
export function ripartisciSettimana(
  sedute: SedutaSettimana[],
  volumeSettimana: number,
  passo100mCentesimi: number
): RipartizioneSettimana[] {
  if (sedute.length === 0) return [];

  const durate = sedute.map((s) => normalizzaDurata(s.parametri.durataMin));
  const totale = durate.reduce((a, b) => a + b, 0) || 1;
  const caps = durate.map((d) => capDurataMetri(d, passo100mCentesimi));

  const target = Math.max(0, volumeSettimana);
  let metri = durate.map((d) => (d / totale) * target);

  // Ridistribuzione con cap: 6 passate sono piu' che sufficienti a convergere.
  for (let iter = 0; iter < 6; iter++) {
    let eccedenza = 0;
    const bloccate: boolean[] = metri.map((m, i) => m > caps[i] + 0.5);
    metri = metri.map((m, i) => {
      if (m > caps[i]) {
        eccedenza += m - caps[i];
        return caps[i];
      }
      return m;
    });
    if (eccedenza < 1) break;

    const libere = metri
      .map((_, i) => i)
      .filter((i) => !bloccate[i] && metri[i] < caps[i]);
    if (libere.length === 0) break;

    const pesoLibere = libere.reduce((s, i) => s + durate[i], 0) || 1;
    for (const i of libere) {
      metri[i] = Math.min(caps[i], metri[i] + eccedenza * (durate[i] / pesoLibere));
    }
  }

  const arrotondati = metri.map((m) => arrotondaA50m(m));
  return sedute.map((s, i) => ({
    data: s.data,
    parametri: {
      vascaMetri: normalizzaVasca(s.parametri.vascaMetri),
      durataMin: durate[i],
    },
    quota: durate[i] / totale,
    metri: arrotondati[i],
    cap: caps[i],
    limitata: arrotondati[i] >= caps[i] && caps[i] > 0,
  }));
}

/**
 * Ricalibrazione dopo il cambio parametri di una seduta.
 * Confronta la ripartizione precedente con la nuova: le sedute successive
 * assorbono (o restituiscono) i metri non coperti dalla seduta modificata.
 */
export function ricalibraSettimana(
  sedutePrima: SedutaSettimana[],
  seduteDopo: SedutaSettimana[],
  volumeSettimana: number,
  passo100mCentesimi: number
): {
  ripartizione: RipartizioneSettimana[];
  variazioni: { data: string; prima: number; dopo: number; delta: number }[];
} {
  const primaMap = new Map(
    ripartisciSettimana(sedutePrima, volumeSettimana, passo100mCentesimi).map((r) => [r.data, r.metri])
  );
  const ripartizione = ripartisciSettimana(seduteDopo, volumeSettimana, passo100mCentesimi);
  const variazioni = ripartizione.map((r) => {
    const prima = primaMap.get(r.data) ?? 0;
    return { data: r.data, prima, dopo: r.metri, delta: r.metri - prima };
  });
  return { ripartizione, variazioni };
}
