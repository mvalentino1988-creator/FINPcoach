import { Atleta, CondizioneMedica, DayOfWeekNum, LogSeduta, ParametriPiano, Stagione } from '../types';
import {
  addDays,
  addWeeks,
  getDayOfWeek,
  isAfter,
  isBefore,
  nextOrSameMonday,
  previousOrSameMonday,
  weeksBetween,
  yearsBetween
} from './dateUtils';
import { FINPSpecialistAI } from './finpAnalisiMedica';

const GIORNI_DEFAULT: DayOfWeekNum[] = [3, 6]; // Mercoledì, Sabato
const PAROLE_GARA_IMPORTANTE = [
  'campionat', 'assolut', 'italian', 'nazional', 'final', 'mondial', 'europe', 'paralimp', 'world', 'coni'
];

export class AutoPianificatore {
  static inizioStagioneSuggerito(oggi: string): string {
    const [yStr, mStr] = oggi.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const anno = m >= 7 ? y : y - 1;
    const sett1 = `${anno}-09-01`;
    return nextOrSameMonday(sett1);
  }

  static fineStagioneSuggerita(inizio: string): string {
    const [yStr, mStr] = inizio.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const anno = m >= 7 ? y + 1 : y;
    return `${anno}-06-30`;
  }

  static nomeStagione(inizio: string, fine: string): string {
    const y1 = parseInt(inizio.substring(0, 4), 10);
    const y2 = parseInt(fine.substring(0, 4), 10);
    if (y1 === y2) return `${y1}`;
    const part2 = String(y2 % 100).padStart(2, '0');
    return `${y1}/${part2}`;
  }

  static garaProbabilmentePrioritaria(nome: string): boolean {
    const n = nome.toLowerCase().trim();
    return n.length > 0 && PAROLE_GARA_IMPORTANTE.some(p => n.includes(p));
  }

  static parametriAuto(
    atleti: Atleta[],
    log: LogSeduta[],
    stagione: Stagione | null,
    oggi: string
  ): ParametriPiano {
    const settimane = stagione ? weeksBetween(stagione.inizio, stagione.fine) : 40;
    const eta = this.etaMediana(atleti, oggi);
    const giorniStorico = this.giorniDaStorico(log, oggi);

    return {
      giorniAllenamento: giorniStorico ?? GIORNI_DEFAULT,
      numeroMacrocicli: settimane > 40 ? 2 : 1,
      metriBaseSeduta: this.metriBaseDaStorico(log, atleti, oggi) ?? this.metriBaseDaEta(eta),
      settimaneCicloCarico: eta != null && (eta < 12 || eta >= 35) ? 3 : 4
    };
  }

  /**
   * Fattore volume suggerito (multipli di 5%).
   * Punto di partenza: l'allenatore può passare a manuale.
   */
  static fattoreVolumeSuggerito(
    atleta: Atleta,
    condizioniAttive: CondizioneMedica[],
    oggi: string
  ): number {
    const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
    let f = 1.0;
    if (eta == null) {
      f = 1.0;
    } else if (eta < 10) {
      f = 0.5;
    } else if (eta < 12) {
      f = 0.6;
    } else if (eta <= 14) {
      f = 0.8;
    } else if (eta <= 17) {
      f = 0.9;
    } else if (eta >= 60) {
      f = 0.7;
    } else if (eta >= 50) {
      f = 0.8;
    } else if (eta >= 35) {
      f = 0.9;
    } else {
      f = 1.0;
    }

    const testo = condizioniAttive.map(c => `${c.descrizione} ${c.limitazioni}`).join(' | ');
    if (testo.trim().length > 0) {
      const stima = FINPSpecialistAI.analizza(testo, '', eta).stimaClassi;
      const s = atleta.classeS ?? (stima.eleggibile ? stima.classeS : null);
      if (s != null) {
        if (s >= 1 && s <= 3) {
          f *= 0.7;
        } else if (s >= 4 && s <= 6) {
          f *= 0.85;
        }
      }
      const flag = FINPSpecialistAI.flagMedici(testo);
      if (flag.cardiorespiratoria) f *= 0.85;
      if (flag.spalla) f *= 0.9;
    }

    const arrotondato = Math.round(f * 20) / 20.0;
    return Math.max(0.4, Math.min(1.0, arrotondato));
  }

  // ---------------------------------------------------------------- Interni

  private static giorniDaStorico(log: LogSeduta[], oggi: string): DayOfWeekNum[] | null {
    const limite8w = addWeeks(oggi, -8);
    const date = log
      .filter(l => l.presente && !isBefore(l.data, limite8w) && !isAfter(l.data, oggi))
      .map(l => l.data);

    const dateUniche = Array.from(new Set(date));
    if (dateUniche.length < 4) return null;

    const settimaneUniche = new Set(dateUniche.map(d => previousOrSameMonday(d))).size;
    const denom = Math.max(settimaneUniche, 1);

    const countByDow: Record<number, number> = {};
    for (const d of dateUniche) {
      const dow = getDayOfWeek(d);
      countByDow[dow] = (countByDow[dow] ?? 0) + 1;
    }

    const scelti: DayOfWeekNum[] = [];
    for (const [dowStr, count] of Object.entries(countByDow)) {
      if (count >= denom * 0.4) {
        scelti.push(parseInt(dowStr, 10) as DayOfWeekNum);
      }
    }

    return scelti.length > 0 ? scelti.sort((a, b) => a - b) : null;
  }

  private static metriBaseDaStorico(
    log: LogSeduta[],
    atleti: Atleta[],
    oggi: string
  ): number | null {
    const fattori = new Map<number, number>();
    for (const a of atleti) {
      fattori.set(a.id, Math.max(a.fattoreVolume, 0.1));
    }

    const limite8w = addWeeks(oggi, -8);
    const validLog = log.filter(
      l => l.presente && l.metriEffettivi >= 400 && !isBefore(l.data, limite8w) && !isAfter(l.data, oggi)
    );

    const byData = new Map<string, LogSeduta[]>();
    for (const l of validLog) {
      if (!byData.has(l.data)) byData.set(l.data, []);
      byData.get(l.data)!.push(l);
    }

    if (byData.size < 4) return null;

    const perGiorno: number[] = [];
    for (const [, list] of byData.entries()) {
      const normalized = list.map(l => {
        const factor = fattori.get(l.atletaId) ?? 1.0;
        return Math.round(l.metriEffettivi / factor);
      });
      perGiorno.push(this.mediana(normalized));
    }

    const med = this.mediana(perGiorno);
    const rounded = Math.round((med + 50) / 100) * 100;
    return Math.max(600, Math.min(6000, rounded));
  }

  private static metriBaseDaEta(eta: number | null): number {
    if (eta == null) return 1800;
    if (eta < 12) return 1200;
    if (eta <= 14) return 1800;
    if (eta <= 17) return 2200;
    if (eta <= 34) return 2400;
    return 1800;
  }

  private static etaMediana(atleti: Atleta[], oggi: string): number | null {
    const anni: number[] = [];
    for (const a of atleti) {
      if (a.dataNascita) {
        anni.push(yearsBetween(a.dataNascita, oggi));
      }
    }
    return anni.length === 0 ? null : this.mediana(anni);
  }

  private static mediana(v: number[]): number {
    const sorted = [...v].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}
