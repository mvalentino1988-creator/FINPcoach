import { Stile } from '../types';
import { recordPerRiferimento, LivelloRecord } from './recordBenchmark';

export interface AthleteHydroProfile {
  id: string;
  nome: string;
  classe: string; // S1-S14, SB*, SM*
  stile: Stile;
  distanza: number;
  /** Coefficiente di forma idrodinamica: STIMA INDICATIVA del modello didattico, non una misura. */
  kCoeff: number;
  velocitaMedia: number; // m/s — reale solo per i profili generati da recordBenchmark
  isMainAtleta: boolean;
}

export class HydrodynamicsEngine {
  /**
   * Calcola la Forza Resistente F(v) = k * v^2 [Newton]
   * (modello didattico: l'unità Newton è nominale, non una misura di laboratorio)
   */
  static calcolaForzaResistente(k: number, v: number): number {
    return k * Math.pow(v, 2);
  }

  /**
   * Calcola la Potenza Intra-ciclo P(t) = k * v(t)^3 [Watt]
   * Frequenza di bracciata (1,2 Hz) e ampiezza intra-ciclo (25% della
   * velocità media) sono ipotesi del modello didattico, non misure.
   */
  static calcolaPotenzaIntraCiclo(k: number, vMedia: number, t: number, frequenzaHz: number = 1.2): number {
    const deltaV = vMedia * 0.25;
    const vT = vMedia + deltaV * Math.sin(2 * Math.PI * frequenzaHz * t);
    const vPos = Math.max(0.1, vT);
    return k * Math.pow(vPos, 3);
  }

  /**
   * Calcola l'area di resistenza sottostante 'R'
   */
  static calcolaAreaResistenza(k: number, vMax: number): number {
    let area = 0;
    const steps = 50;
    const dv = vMax / steps;
    for (let i = 0; i <= steps; i++) {
      const v = i * dv;
      const f = this.calcolaForzaResistente(k, v);
      const weight = (i === 0 || i === steps) ? 0.5 : 1.0;
      area += f * dv * weight;
    }
    return area;
  }

  /**
   * Profilo di benchmark basato sul RECORD REALE per (livello, classe, stile,
   * distanza, vasca). La velocità è reale (distanza/tempo del record); il
   * kCoeff resta una stima indicativa del modello didattico.
   * Restituisce [] se non esiste un record: la UI mostra "dato non disponibile".
   */
  static benchmarkRecord(
    livello: LivelloRecord,
    classe: string,
    stile: Stile,
    distanza: number,
    kCoeffStima: number,
    vascaMetri: number = 25
  ): AthleteHydroProfile[] {
    const rif = recordPerRiferimento(livello, classe, stile, distanza, vascaMetri);
    if (!rif.disponibile || rif.velocitaMedia === null) return [];
    const nome = rif.detentore
      ? `Record ${livello}: ${rif.detentore} (${rif.tempoFormattato})`
      : `Record ${livello} (${rif.tempoFormattato})`;
    return [{
      id: `record_${livello}_${classe}`,
      nome,
      classe,
      stile,
      distanza,
      kCoeff: kCoeffStima,
      velocitaMedia: rif.velocitaMedia,
      isMainAtleta: false
    }];
  }
}
