/**
 * Servizio per la composizione e validazione delle Staffette a Punti FINP
 * Calcola automaticamente la somma dei punti di classe dei 4 frazionisti
 * e verifica il rispetto del tetto regolamentare.
 */

import { Atleta } from '../types';

export interface StaffettaConfig {
  tipo: '4x50m' | '4x100m';
  tettoPuntiMax: number; // Es. 20, 34, 49
  atleti: Array<{
    atleta: Atleta;
    ordine: 1 | 2 | 3 | 4;
    stile?: string; // Stile assegnato al frazionista
  }>;
}

export interface StaffettaResult {
  valida: boolean;
  puntiTotali: number;
  tettoPuntiMax: number;
  eccedenzaPunti: number;
  avvisi: string[];
  composizione: Array<{
    ordine: number;
    atletaNome: string;
    classeS: number | undefined;
    puntiClasse: number;
    stileAssegnato?: string;
  }>;
}

export class StaffetteService {
  /**
   * Tabella punti di classe FINP per le classi S1-S14.
   * Valori ufficiali FINP per il calcolo del tetto staffetta.
   */
  private static readonly PUNTI_CLASSE: Record<number, number> = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
    11: 11, 12: 12, 13: 13, 14: 14
  };

  /**
   * Tetti regolamentari FINP per le staffette (esempi comuni).
   * Valori possono variare in base al regolamento specifico della competizione.
   */
  private static readonly TETTI_REGOLAMENTARI: Record<string, number> = {
    '4x50m_20pt': 20,
    '4x50m_34pt': 34,
    '4x50m_49pt': 49,
    '4x100m_20pt': 20,
    '4x100m_34pt': 34,
    '4x100m_49pt': 49,
  };

  /**
   * Ottiene i punti di classe per un atleta.
   */
  static getPuntiClasse(atleta: Atleta): number {
    if (atleta.classeS == null) return 0;
    return this.PUNTI_CLASSE[atleta.classeS] || 0;
  }

  /**
   * Calcola la composizione di una staffetta e valida il rispetto del tetto punti.
   */
  static calcolaStaffetta(config: StaffettaConfig): StaffettaResult {
    const composizione = config.atleti.map(({ atleta, ordine, stile }) => ({
      ordine,
      atletaNome: `${atleta.cognome} ${atleta.nome?.[0] || ''}.`,
      classeS: atleta.classeS,
      puntiClasse: this.getPuntiClasse(atleta),
      stileAssegnato: stile
    }));

    const puntiTotali = composizione.reduce((sum, c) => sum + c.puntiClasse, 0);
    const eccedenzaPunti = Math.max(0, puntiTotali - config.tettoPuntiMax);
    const valida = puntiTotali <= config.tettoPuntiMax;

    const avvisi: string[] = [];

    if (!valida) {
      avvisi.push(
        `⚠️ TETTO PUNTI SUPERATO: ${puntiTotali} punti (${eccedenzaPunti} in eccesso rispetto al limite di ${config.tettoPuntiMax}).`
      );
    }

    // Verifica assegnazione stili
    const stiliAssegnati = composizione.filter(c => c.stileAssegnato);
    if (stiliAssegnati.length > 0 && stiliAssegnati.length < 4) {
      avvisi.push(
        `ℹ️ Attenzione: ${stiliAssegnati.length}/4 frazionisti hanno stile assegnato. In staffetta mista, verificare compatibilità regolamentare.`
      );
    }

    // Verifica atleti senza classe
    const senzaClasse = composizione.filter(c => c.classeS == null);
    if (senzaClasse.length > 0) {
      avvisi.push(
        `⚠️ ${senzaClasse.length} atleti senza classe S assegnata. Impossibile calcolare punti correttamente.`
      );
    }

    if (valida && avvisi.length === 0) {
      avvisi.push(
        `✅ Staffetta valida: ${puntiTotali} punti totali (limite: ${config.tettoPuntiMax}).`
      );
    }

    return {
      valida,
      puntiTotali,
      tettoPuntiMax: config.tettoPuntiMax,
      eccedenzaPunti,
      avvisi,
      composizione
    };
  }

  /**
   * Suggerisce combinazioni di staffetta valide data una lista di atleti.
   */
  static suggerisciStaffette(
    atletiDisponibili: Atleta[],
    tipo: '4x50m' | '4x100m',
    tettoPuntiMax: number
  ): StaffettaResult[] {
    if (atletiDisponibili.length < 4) return [];

    const suggerimenti: StaffettaResult[] = [];

    // Genera combinazioni semplici (top 4 atleti per punti classe)
    const ordinatiPerPunti = [...atletiDisponibili]
      .filter(a => a.classeS != null)
      .sort((a, b) => this.getPuntiClasse(a) - this.getPuntiClasse(b));

    // Combinazione con i 4 atleti con punti più bassi
    if (ordinatiPerPunti.length >= 4) {
      const config: StaffettaConfig = {
        tipo,
        tettoPuntiMax,
        atleti: ordinatiPerPunti.slice(0, 4).map((atleta, idx) => ({
          atleta,
          ordine: (idx + 1) as 1 | 2 | 3 | 4
        }))
      };
      suggerimenti.push(this.calcolaStaffetta(config));
    }

    return suggerimenti;
  }

  /**
   * Ottiene i tetti regolamentari disponibili.
   */
  static getTettiDisponibili(tipo: '4x50m' | '4x100m'): number[] {
    const prefix = `${tipo}_`;
    return Object.entries(this.TETTI_REGOLAMENTARI)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .sort((a, b) => a - b);
  }
}
