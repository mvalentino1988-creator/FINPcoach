import { Stile } from '../types';

export interface AthleteHydroProfile {
  id: string;
  nome: string;
  classe: string; // S1-S14
  stile: Stile;
  distanza: number;
  kCoeff: number; // Coefficiente di forma idrodinamica
  velocitaMedia: number; // m/s
  isMainAtleta: boolean;
}

export class HydrodynamicsEngine {
  /**
   * Calcola la Forza Resistente F(v) = k * v^2 [Newton]
   */
  static calcolaForzaResistente(k: number, v: number): number {
    return k * Math.pow(v, 2);
  }

  /**
   * Calcola la Potenza Intra-ciclo P(t) = k * v(t)^3 [Watt]
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
   * Genera i Top 10 atleti di benchmark per classe e distanza
   */
  static generaTop10Benchmark(classe: string, stile: Stile, distanza: number): AthleteHydroProfile[] {
    const profili: AthleteHydroProfile[] = [];
    const kBase = classe.includes('S1') || classe.includes('S2') || classe.includes('S3') ? 0.65 : 0.35;

    for (let i = 1; i <= 10; i++) {
      const deltaK = (i - 1) * 0.02;
      const k = Number((kBase + deltaK).toFixed(3));
      const vBase = 2.1 - (i * 0.06);
      const v = Math.max(0.6, Number(vBase.toFixed(2)));

      profili.push({
        id: `top10_${i}`,
        nome: `Elite Competitor #${i} (${classe})`,
        classe,
        stile,
        distanza,
        kCoeff: k,
        velocitaMedia: v,
        isMainAtleta: false
      });
    }

    return profili;
  }
}
