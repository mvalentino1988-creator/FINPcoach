import { Stile } from '../types';
import { clusterRecord, PuntoRecord } from './recordBenchmark';
import type { LivelloRecord } from './recordBenchmark';

export type LivelloGeografico = LivelloRecord;

export interface AthleticPerformance {
  id: string;
  atletaId?: number;
  data: string; // YYYY-MM-DD
  classeParalimpica: string; // "S1" - "S14"
  stile: Stile;
  distanza: number; // 50, 100, 200, 400
  tempoSecondi: number;
  velocitaMedia: number; // m/s
  costoEnergetico: number; // indice di costo energetico (modello interno, adimensionale, non validato)
}

export interface EliteClusterPoint {
  classeS: string;
  velocitaMedia: number;
  costoEnergetico: number;
  /** Nome reale del detentore del record (mai un nome inventato). */
  atletaNome?: string;
}

export class BiomechanicsEngine {
  /**
   * Indice di costo energetico C(v) = (220 / v) + 75 * v^2.
   * ATTENZIONE: modello interno didattico, adimensionale e NON validato
   * scientificamente. Non è una misura né una formula ufficiale: non usarlo
   * per decisioni di allenamento o di carico.
   */
  static calcolaCostoEnergetico(velocitaMedia: number): number {
    if (velocitaMedia <= 0) return 0;
    return (220 / velocitaMedia) + 75 * Math.pow(velocitaMedia, 2);
  }

  /** Alias esplicito per chiarezza nei chiamanti. */
  static indiceCostoEnergetico(velocitaMedia: number): number {
    return this.calcolaCostoEnergetico(velocitaMedia);
  }

  /**
   * Calcola la velocità media v = distanza / tempoSecondi
   */
  static calcolaVelocitaMedia(distanzaMetri: number, tempoSecondi: number): number {
    if (tempoSecondi <= 0) return 0;
    return distanzaMetri / tempoSecondi;
  }

  /**
   * Cluster di riferimento basato sui RECORD REALI (vedi recordBenchmark).
   * Per ogni classe con un record disponibile per (livello, stile, distanza,
   * vasca) restituisce un punto con la velocità del record e il nome reale
   * del detentore. Le classi senza record non compaiono: la UI deve
   * mostrare "dato non disponibile".
   */
  static generaClusterElite(
    livello: LivelloGeografico,
    stile: Stile,
    distanza: number,
    filtroClasseS?: string | null,
    vascaMetri: number = 25
  ): EliteClusterPoint[] {
    return clusterRecord(livello, stile, distanza, filtroClasseS, vascaMetri).map(
      (p: PuntoRecord): EliteClusterPoint => ({
        classeS: p.classe,
        velocitaMedia: p.riferimento.velocitaMedia ?? 0,
        costoEnergetico: this.calcolaCostoEnergetico(p.riferimento.velocitaMedia ?? 0),
        atletaNome: p.riferimento.detentore ?? undefined
      })
    );
  }
}
