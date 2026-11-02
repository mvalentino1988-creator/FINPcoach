/**
 * Servizio per il calcolo dei Punti Tabellari WPS / FINP
 * Formula ufficiale World Para Swimming per convertire tempi in punti (0-1000)
 * basati sul Record del Mondo in carica per la classe dell'atleta.
 */

import { formattaTempo } from './tempoUtils';

export interface PuntiTabellariResult {
  punti: number;
  puntiFormatted: string;
  tempoAtletaFormatted: string;
  recordMondoFormatted: string;
  distanzaDalRecordPercentuale: number;
  livelloPrestazione: 'Elite' | 'Nazionale' | 'Regionale' | 'Sviluppo';
}

export class PuntiTabellariService {
  /**
   * Calcola i punti tabellari secondo la formula WPS.
   * Punti = 1000 * (RecordMondo / TempoAtleta)^3
   *
   * @param tempoAtletaCentesimi Tempo dell'atleta in centesimi di secondo
   * @param recordMondoCentesimi Record del mondo in centesimi di secondo
   * @returns Punti 0-1000 con metadati
   */
  static calcolaPunti(
    tempoAtletaCentesimi: number,
    recordMondoCentesimi: number
  ): PuntiTabellariResult {
    if (recordMondoCentesimi <= 0 || tempoAtletaCentesimi <= 0) {
      return {
        punti: 0,
        puntiFormatted: '0',
        tempoAtletaFormatted: formattaTempo(tempoAtletaCentesimi),
        recordMondoFormatted: formattaTempo(recordMondoCentesimi),
        distanzaDalRecordPercentuale: 0,
        livelloPrestazione: 'Sviluppo'
      };
    }

    // Formula WPS: Punti = 1000 * (WR / T)^3
    const rapporto = recordMondoCentesimi / tempoAtletaCentesimi;
    const punti = Math.round(1000 * Math.pow(rapporto, 3));
    const puntiClamped = Math.min(1000, Math.max(0, punti));

    // Distanza percentuale dal record del mondo
    const distanzaPercentuale = ((tempoAtletaCentesimi - recordMondoCentesimi) / recordMondoCentesimi) * 100;

    // Classificazione livello prestazione
    let livello: 'Elite' | 'Nazionale' | 'Regionale' | 'Sviluppo';
    if (puntiClamped >= 900) {
      livello = 'Elite';
    } else if (puntiClamped >= 750) {
      livello = 'Nazionale';
    } else if (puntiClamped >= 600) {
      livello = 'Regionale';
    } else {
      livello = 'Sviluppo';
    }

    return {
      punti: puntiClamped,
      puntiFormatted: puntiClamped.toString(),
      tempoAtletaFormatted: formattaTempo(tempoAtletaCentesimi),
      recordMondoFormatted: formattaTempo(recordMondoCentesimi),
      distanzaDalRecordPercentuale: Math.round(distanzaPercentuale * 10) / 10,
      livelloPrestazione: livello
    };
  }

  /**
   * Calcola i punti per un tempo in gara considerando stile, distanza, classe e genere.
   * Utilizza i record del mondo dal RecordService.
   */
  static calcolaPuntiGara(
    tempoAtletaCentesimi: number,
    vascaMetri: 25 | 50,
    stile: string,
    distanzaMetri: number,
    classeS: number,
    genere: 'M' | 'F'
  ): PuntiTabellariResult | null {
    // Importazione dinamica per evitare circular dependency
    const { RecordService } = require('./recordService');

    // Ottieni il record del mondo per la classe
    const recordWR = RecordService.recordInternazionale(
      vascaMetri,
      `${distanzaMetri} ${stile}`,
      genere,
      `S${classeS}`,
      'WR'
    );

    if (!recordWR || !recordWR.tempoCentesimi) {
      return null;
    }

    return this.calcolaPunti(tempoAtletaCentesimi, recordWR.tempoCentesimi);
  }

  /**
   * Calcola il tempo target per raggiungere un determinato punteggio.
   * TempoTarget = RecordMondo / (Punti/1000)^(1/3)
   */
  static calcolaTempoTargetPerPunti(
    puntiObiettivo: number,
    recordMondoCentesimi: number
  ): number {
    if (puntiObiettivo <= 0 || recordMondoCentesimi <= 0) return 0;

    const rapporto = Math.pow(puntiObiettivo / 1000, 1 / 3);
    const tempoTargetSec = recordMondoCentesimi / 100 / rapporto;
    return Math.round(tempoTargetSec * 100);
  }
}
