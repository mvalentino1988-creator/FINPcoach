import { ParserApprendimento } from './parserApprendimento';

/**
 * Parser universale per schede di allenamento in linguaggio naturale.
 * Supporta serie composte e annidate (es. "(3x100 b1 + 2x50 forte) X2"), NxM, e distanze singole.
 * Integra le regole apprese da ParserApprendimento.
 */

export interface SeriaParsata {
  ripetizioni: number;
  distanza: number;
  descrizione: string;
  metriTotali: number;
  codice: string; // A1, A2, B1, B2, C1, C2, C3, D
  attrezzi: string[];
  /** Etichetta di sezione riconosciuta (es. "Riscaldamento", "T finale"). */
  sezione?: string;
  /** Regola apprese che ha risolto la riga, se presente. */
  regolaAppresa?: string;
}

export class ParserScheda {
  static calcolaMetriDaTesto(testo: string): number {
    const serie = this.parseSerie(testo);
    return serie.reduce((sum, s) => sum + s.metriTotali, 0);
  }

  /**
   * Separa una possibile etichetta iniziale dal contenuto numerico.
   * Es. "Riscaldamento 400m" -> { etichetta: "Riscaldamento", contenuto: "400m" }
   *      "Riscaldamento: 4x100" -> { etichetta: "Riscaldamento", contenuto: "4x100" }
   *      "8x50 libero" -> { etichetta: undefined, contenuto: "8x50 libero" }
   */
  static estraiEtichetta(riga: string): { etichetta?: string; contenuto: string } {
    return ParserApprendimento.estraiEtichetta(riga);
  }

  static parseSerie(testo: string): SeriaParsata[] {
    const serie: SeriaParsata[] = [];
    if (!testo) return serie;
    const righe = testo.split('\n');

    for (const riga of righe) {
      const trimRiga = riga.trim();
      if (!trimRiga) continue;

      const senzaElenco = trimRiga.replace(/^([-*•]|\d+[\.\)])\s+/, '').trim();

      // Separa etichetta (es. "Riscaldamento 400m")
      const { etichetta, contenuto } = this.estraiEtichetta(senzaElenco);
      const cleanRiga = contenuto;

      let ripetizioni = 1;
      let distanza = 0;
      let metriTotali = 0;
      let regolaAppresa: string | undefined;

      // 1. Pattern standard + regole apprese (unica fonte di verita)
      const interpretazione = ParserApprendimento.analizzaStandard(cleanRiga);
      if (interpretazione) {
        ripetizioni = interpretazione.ripetizioni;
        distanza = interpretazione.distanza;
        metriTotali = interpretazione.metriTotali;
      } else {
        // 2. Regole apprese dal coach: prima sulla riga completa, poi sul contenuto
        const regola =
          ParserApprendimento.applicaRegole(senzaElenco) ??
          ParserApprendimento.applicaRegole(cleanRiga);
        if (regola) {
          ripetizioni = regola.ripetizioni;
          distanza = regola.distanza;
          metriTotali = regola.metriTotali;
          regolaAppresa = regola.regola?.descrizione;
        } else {
          // 3. Non compreso: nessun metro conteggiato, la riga resta in revisione
          distanza = 0;
          ripetizioni = 1;
          metriTotali = 0;
        }
      }

      const attrezzi = this.estraiAttrezzi(cleanRiga);
      const codice = this.stimaCodiceSet(distanza || 100, ripetizioni, cleanRiga.toLowerCase());

      serie.push({
        ripetizioni,
        distanza: distanza || metriTotali,
        descrizione: cleanRiga,
        metriTotali,
        codice,
        attrezzi,
        sezione: etichetta,
        regolaAppresa,
      });
    }

    return serie;
  }

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

  static stimaCodiceSet(distanza: number, ripetizioni: number, desc: string): string {
    if (desc.includes('b1') || desc.includes('soglia')) return 'B1';
    if (desc.includes('b2')) return 'B2';
    if (desc.includes('a2')) return 'A2';

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
      desc.includes('massimale')
    ) {
      if (distanza <= 25) return 'D';
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
      if (desc.includes('forte') || desc.includes('sprint')) tipiLavoroSet.add('Velocità / Intensità');
    }

    return {
      attrezzi: Array.from(attrezziSet),
      tipiLavoro: Array.from(tipiLavoroSet),
      note: []
    };
  }

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
