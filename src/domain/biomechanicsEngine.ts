import { Stile } from '../types';

export type LivelloGeografico = 'Mondiale' | 'Europeo' | 'Italiano';

export interface AthleticPerformance {
  id: string;
  atletaId?: number;
  data: string; // YYYY-MM-DD
  classeParalimpica: string; // "S1" - "S10"
  stile: Stile;
  distanza: number; // 50, 100, 200, 400
  tempoSecondi: number;
  velocitaMedia: number; // m/s
  costoEnergetico: number; // C(v)
}

export interface EliteClusterPoint {
  classeS: string;
  velocitaMedia: number;
  costoEnergetico: number;
  atletaNome?: string;
}

export class BiomechanicsEngine {
  /**
   * Calcola il Costo Energetico del nuoto C(v) [J/m/kg]
   * Formula ufficiale: C(v) = (220 / v) + 75 * v^2
   */
  static calcolaCostoEnergetico(velocitaMedia: number): number {
    if (velocitaMedia <= 0) return 0;
    return (220 / velocitaMedia) + 75 * Math.pow(velocitaMedia, 2);
  }

  /**
   * Calcola la velocità media v = distanza / tempoSecondi
   */
  static calcolaVelocitaMedia(distanzaMetri: number, tempoSecondi: number): number {
    if (tempoSecondi <= 0) return 0;
    return distanzaMetri / tempoSecondi;
  }

  private static FATTORE_GEOGRAFICO: Record<LivelloGeografico, number> = {
    Mondiale: 1.00,
    Europeo: 0.96,
    Italiano: 0.92
  };

  private static VELOCITA_BASE_S50M: Record<string, number> = {
    S1: 0.85,
    S2: 1.05,
    S3: 1.25,
    S4: 1.42,
    S5: 1.58,
    S6: 1.72,
    S7: 1.84,
    S8: 1.95,
    S9: 2.05,
    S10: 2.18
  };

  private static FATTORE_DISTANZA(distanzaMetri: number): number {
    if (distanzaMetri <= 50) return 1.00;
    if (distanzaMetri <= 100) return 0.92;
    if (distanzaMetri <= 200) return 0.84;
    return 0.78;
  }

  static generaClusterElite(
    livello: LivelloGeografico,
    stile: Stile,
    distanza: number,
    filtroClasseS?: string | null
  ): EliteClusterPoint[] {
    const punti: EliteClusterPoint[] = [];
    const fatGeo = this.FATTORE_GEOGRAFICO[livello];
    const fatDist = this.FATTORE_DISTANZA(distanza);

    let fatStile = 1.0;
    if (stile === 'DORSO') fatStile = 0.93;
    if (stile === 'RANA') fatStile = 0.82;
    if (stile === 'FARFALLA') fatStile = 0.96;
    if (stile === 'MISTI') fatStile = 0.88;

    const tutteClassi = ['S1', 'S3', 'S5', 'S7', 'S9', 'S10'];
    const classiS = (filtroClasseS && tutteClassi.includes(filtroClasseS))
      ? [filtroClasseS]
      : (filtroClasseS ? [filtroClasseS] : tutteClassi);

    classiS.forEach(cl => {
      const vBase = (this.VELOCITA_BASE_S50M[cl] || 1.50) * fatGeo * fatDist * fatStile;
      for (let i = 0; i < 3; i++) {
        const delta = (i - 1) * 0.025;
        const v = Math.max(0.4, vBase + delta);
        punti.push({
          classeS: cl,
          velocitaMedia: v,
          costoEnergetico: this.calcolaCostoEnergetico(v),
          atletaNome: `Top10 ${cl} (#${i + 1})`
        });
      }
    });

    return punti;
  }
}
