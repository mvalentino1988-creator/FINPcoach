/**
 * Sistema di apprendimento per il parser delle schede
 * Quando il parser non capisce qualcosa, chiede conferma e memorizza la regola
 */

interface RegolaParser {
  pattern: string;          // Pattern da riconoscere
  tipo: 'NXM' | 'UNITA' | 'SOLO'; // Tipo di parsing
  descrizione: string;     // Descrizione per l'utente
  distanza?: number;       // Se pattern contiene numero, questo è la distanza
  unita?: string;         // Unità di misura (m, km, ecc)
  creatoIl: string;       // Timestamp
  usi: number;            // Quante volte è stata usata
}

const STORAGE_KEY = 'finpcoach_parser_regole';

export class ParserApprendimento {
  private static regole: RegolaParser[] = [];

  static caricaRegole() {
    try {
      const salvate = localStorage.getItem(STORAGE_KEY);
      if (salvate) {
        this.regole = JSON.parse(salvate);
      }
    } catch (e) {
      this.regole = [];
    }
  }

  static salvaRegole() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.regole));
  }

  /**
   * Tenta di parsare il testo con le regole esistenti
   * Ritorna le righe non comprese
   */
  static parseConRegole(testo: string): {
    compreso: number;
    nonCompreso: string[];
  } {
    if (this.regole.length === 0) {
      this.caricaRegole();
    }

    const righe = testo.split('\n');
    const nonCompreso: string[] = [];
    let compreso = 0;

    for (const riga of righe) {
      const trimRiga = riga.trim();
      if (!trimRiga) {
        compreso++;
        continue;
      }

      let match = false;

      // Prova le regole NXM
      for (const regola of this.regole.filter(r => r.tipo === 'NXM')) {
        const regex = new RegExp(regola.pattern, 'i');
        const m = trimRiga.match(regex);
        if (m) {
          match = true;
          break;
        }
      }

      // Prova le regole UNITA
      if (!match) {
        for (const regola of this.regole.filter(r => r.tipo === 'UNITA')) {
          const regex = new RegExp(regola.pattern, 'i');
          const m = trimRiga.match(regex);
          if (m) {
            match = true;
            break;
          }
        }
      }

      // Prova le regole SOLO
      if (!match) {
        for (const regola of this.regole.filter(r => r.tipo === 'SOLO')) {
          const regex = new RegExp(regola.pattern, 'i');
          const m = trimRiga.match(regex);
          if (m) {
            match = true;
            break;
          }
        }
      }

      if (match) {
        compreso++;
      } else {
        nonCompreso.push(trimRiga);
      }
    }

    return { compreso, nonCompreso };
  }

  /**
   * Aggiunge una nuova regola di parsing
   */
  static aggiungiRegola(regola: Omit<RegolaParser, 'creatoIl' | 'usi'>) {
    const nuovaRegola: RegolaParser = {
      ...regola,
      creatoIl: new Date().toISOString(),
      usi: 0
    };

    this.regole.push(nuovaRegola);
    this.salvaRegole();
  }

  /**
   * Incrementa l'uso di una regola (usato per ottimizzare quali mostrare prima)
   */
  static incrementaUso(index: number) {
    if (this.regole[index]) {
      this.regole[index].usi++;
      this.salvaRegole();
    }
  }

  /**
   * Ottiene le regole più usate
   */
  static getRegolePopolari(): RegolaParser[] {
    if (this.regole.length === 0) {
      this.caricaRegole();
    }
    return [...this.regole].sort((a, b) => b.usi - a.usi).slice(0, 10);
  }

  /**
   * Suggerisce una possibile interpretazione per una riga non compresa
   */
  static suggerisciInterpretazione(riga: string): {
    tipo: 'NXM' | 'UNITA' | 'SOLO' | null;
    pattern: string;
    descrizione: string;
  } | null {
    const trimRiga = riga.trim();

    // Controlla se sembra NxM (es. "8x50")
    const matchNxM = trimRiga.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (matchNxM) {
      return {
        tipo: 'NXM',
        pattern: trimRiga,
        descrizione: `Interpretare come ${matchNxM[1]} ripetizioni da ${matchNxM[2]} metri?`
      };
    }

    // Controlla se sembra numero + unità
    const matchUnita = trimRiga.match(/^(\d+)\s+(.+)$/);
    if (matchUnita) {
      const unita = matchUnita[2].toLowerCase();
      const numero = parseInt(matchUnita[1], 10);
      
      if (numero >= 50 && numero <= 5000) {
        return {
          tipo: 'UNITA',
          pattern: trimRiga,
          descrizione: `Interpretare ${numero} metri di ${unita}?`
        };
      }
    }

    // Controlla se è solo un numero ragionevole
    const matchSolo = trimRiga.match(/^(\d+)$/);
    if (matchSolo) {
      const numero = parseInt(matchSolo[1], 10);
      if (numero >= 50 && numero <= 5000) {
        return {
          tipo: 'SOLO',
          pattern: trimRiga,
          descrizione: `Interpretare come ${numero} metri?`
        };
      }
    }

    return null;
  }
}
