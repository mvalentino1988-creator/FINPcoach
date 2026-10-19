import { Stile } from '../types';
import { AthleticPerformance, BiomechanicsEngine, EliteClusterPoint, LivelloGeografico } from './biomechanicsEngine';

export class ParaSwimmingViewModel {
  private static STORAGE_PERFORMANCES = 'finp_para_performances';
  private static STORAGE_MONTHLY_TIMESTAMP = 'finp_para_monthly_timestamp';
  private static CHECK_INTERVAL_MS = 30 * 24 * 3600 * 1000; // 30 giorni

  static getPerformances(): AthleticPerformance[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_PERFORMANCES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static savePerformances(list: AthleticPerformance[]): void {
    try {
      localStorage.setItem(this.STORAGE_PERFORMANCES, JSON.stringify(list));
    } catch (e) {
      console.error('Save performance error:', e);
    }
  }

  static addPerformance(
    atletaId: number | undefined,
    data: string,
    classeParalimpica: string,
    stile: Stile,
    distanza: number,
    tempoSecondi: number
  ): AthleticPerformance {
    const velocitaMedia = BiomechanicsEngine.calcolaVelocitaMedia(distanza, tempoSecondi);
    const costoEnergetico = BiomechanicsEngine.calcolaCostoEnergetico(velocitaMedia);

    const perf: AthleticPerformance = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      atletaId,
      data,
      classeParalimpica,
      stile,
      distanza,
      tempoSecondi,
      velocitaMedia,
      costoEnergetico
    };

    const current = this.getPerformances();
    const next = [...current, perf];
    this.savePerformances(next);
    return perf;
  }

  static checkAndFetchMonthlyData(): { refreshed: boolean; lastUpdateDate: string } {
    const ora = Date.now();
    const lastCheckStr = localStorage.getItem(this.STORAGE_MONTHLY_TIMESTAMP);
    const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;

    let refreshed = false;
    if (ora - lastCheck > this.CHECK_INTERVAL_MS) {
      localStorage.setItem(this.STORAGE_MONTHLY_TIMESTAMP, ora.toString());
      refreshed = true;
    }

    return {
      refreshed,
      lastUpdateDate: new Date(lastCheck || ora).toLocaleDateString('it-IT')
    };
  }

  static getFilteredPerformances(
    atletaId: number | null,
    stile: Stile,
    distanza: number
  ): AthleticPerformance[] {
    const list = this.getPerformances();
    return list
      .filter(p => {
        const matchAtleta = atletaId != null ? p.atletaId === atletaId : true;
        return matchAtleta && p.stile === stile && p.distanza === distanza;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }
}
