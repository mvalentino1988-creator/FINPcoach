/**
 * Parser universale per schede di allenamento in linguaggio naturale.
 * Riconosce perfettamente NxM (es. 8x50, 12x50) e distanze singole (200 misti, 400 sciolti) senza mai perdere cifre.
 */

export interface SeriaParsata {
  ripetizioni: number;
  distanza: number;
  descrizione: string;
  metriTotali: number;
  codice: string; // A1, A2, B1, B2, C1, C2, C3, D
  attrezzi: string[];
}

export class ParserScheda {
  /**
   * Calcola i metri totali da qualsiasi testo inserito
   */
  static calcolaMetriDaTesto(testo: string): number {
    const serie = this.parseSerie(testo);
    return serie.reduce((sum, s) => sum + s.metriTotali, 0);
  }

  /**
   * Analizza tutte le righe estraendo metri, ripetizioni, attrezzi e zona energetica
   */
  static parseSerie(testo: string): SeriaParsata[] {
    const serie: SeriaParsata[] = [];
    if (!testo) return serie;
    const righe = testo.split('\n');
    
    for (const riga of righe) {
      const trimRiga = riga.trim();
      if (!trimRiga) continue;

      const cleanRiga = trimRiga.replace(/^([-*•]|\d+[\.\)])\s+/, '').trim();

      let ripetizioni = 1;
      let distanza = 0;

      // 1. Cerca pattern "NxM" o "N x M" (es. 8x50, 12x50, 10x25)
      const matchNxM = cleanRiga.match(/(\d+)\s*[xX]\s*(\d+)/);
      if (matchNxM) {
        ripetizioni = parseInt(matchNxM[1], 10);
        distanza = parseInt(matchNxM[2], 10);
      } else {
        // 2. Cerca un numero all'inizio seguito da parola (es. "200 misti", "400 sciolti")
        const matchNumeroInizio = cleanRiga.match(/^(\d+)\b/);
        if (matchNumeroInizio) {
          distanza = parseInt(matchNumeroInizio[1], 10);
          ripetizioni = 1;
        } else {
          distanza = 0;
          ripetizioni = 1;
        }
      }

      const metriTotali = ripetizioni * distanza;
      const attrezzi = this.estraiAttrezzi(cleanRiga);
      const codice = this.stimaCodiceSet(distanza, ripetizioni, cleanRiga.toLowerCase());

      serie.push({
        ripetizioni,
        distanza,
        descrizione: cleanRiga,
        metriTotali,
        codice,
        attrezzi
      });
    }

    return serie;
  }

  /**
   * Estrae gli attrezzi menzionati
   */
  static estraiAttrezzi(testoLower: string): string[] {
    const t = testoLower.toLowerCase();
    const attrezziSet = new Set<string>();

    if (t.includes('pinne')) attrezziSet.add('Pinne');
    if (t.includes('snorkel')) attrezziSet.add('Snorkel');
    if (t.includes('pull') || t.includes('tappo')) attrezziSet.add('Pull buoy');
    if (t.includes('palette') || t.includes('pad')) attrezziSet.add('Palette');
    if (t.includes('monopinna')) attrezziSet.add('Monopinna');
    if (t.includes('chianchi')) attrezziSet.add('Chianchi');

    return Array.from(attrezziSet);
  }

  /**
   * Stima intelligente della zona energetica (A1-D)
   */
  static stimaCodiceSet(distanza: number, ripetizioni: number, desc: string): string {
    if (
      desc.includes('sciolt') ||
      desc.includes('riscald') ||
      desc.includes('defatic') ||
      desc.includes('piano') ||
      desc.includes('lento') ||
      desc.includes('recupero')
    ) {
      return 'A1';
    }

    if (
      desc.includes('forte') ||
      desc.includes('veloce') ||
      desc.includes('sprint') ||
      desc.includes('massimale') ||
      desc.includes('bracciate')
    ) {
      if (distanza <= 25 || desc.includes('bracciate')) return 'D';
      if (distanza <= 50) return 'C2';
      return 'C1';
    }

    if (desc.includes('gambe')) {
      return distanza >= 200 ? 'A2' : 'B1';
    }

    const metriTotali = distanza * ripetizioni;
    if (distanza <= 25 && ripetizioni >= 8) return 'D';
    if (distanza <= 50 && ripetizioni >= 6) return 'B2';
    if (distanza <= 100 && ripetizioni >= 4) return 'B1';
    if (distanza >= 200) return 'A2';
    
    return 'A1';
  }

  /**
   * Analisi qualitativa complessiva
   */
  static analisiQualitativa(testo: string): {
    attrezzi: string[];
    tipiLavoro: string[];
    note: string[];
  } {
    const attrezziSet = new Set<string>();
    const tipiLavoroSet = new Set<string>();

    const serie = this.parseSerie(testo);
    for (const s of serie) {
      s.attrezzi.forEach(a => attrezziSet.add(a));
      const desc = s.descrizione.toLowerCase();
      if (desc.includes('gambe')) tipiLavoroSet.add('Lavoro gambe');
      if (desc.includes('sciolt')) tipiLavoroSet.add('Nuoto sciolto');
      if (desc.includes('bracciate')) tipiLavoroSet.add('Esercizi bracciata');
      if (desc.includes('forte') || desc.includes('sprint')) tipiLavoroSet.add('Velocità / Intensità');
    }

    return {
      attrezzi: Array.from(attrezziSet),
      tipiLavoro: Array.from(tipiLavoroSet),
      note: []
    };
  }

  /**
   * Stima il codice di allenamento globale
   */
  static stimaCodiceDaSerie(serie: SeriaParsata[]): string {
    if (serie.length === 0) return 'A1';
    
    const conteggi: Record<string, number> = {};
    for (const s of serie) {
      conteggi[s.codice] = (conteggi[s.codice] || 0) + s.metriTotali;
    }
    
    let codicePrevalente = 'A1';
    let maxMetri = -1;
    for (const [codice, metri] of Object.entries(conteggi)) {
      if (metri > maxMetri) {
        maxMetri = metri;
        codicePrevalente = codice;
      }
    }

    return codicePrevalente;
  }
}
