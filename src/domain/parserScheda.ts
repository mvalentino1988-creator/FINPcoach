/**
 * Parser universale per schede di allenamento in linguaggio naturale.
 * Supporta serie composte e annidate (es. "(3x100 b1 + 2x50 forte) X2"), NxM, e distanze singole.
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
  static calcolaMetriDaTesto(testo: string): number {
    const serie = this.parseSerie(testo);
    return serie.reduce((sum, s) => sum + s.metriTotali, 0);
  }

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
      let metriTotali = 0;

      // 1. Cerca pattern composto con parentesi e moltiplicatore esterno (es. "(3x100 b1 + 2x50 forte) X2")
      const matchParentesiMul = cleanRiga.match(/\(([^)]+)\)\s*[xX](\d+)/i);
      if (matchParentesiMul) {
        const innerText = matchParentesiMul[1];
        const outerMultiplier = parseInt(matchParentesiMul[2], 10);

        const parti = innerText.split('+');
        let innerMetri = 0;
        for (const parte of parti) {
          const mSub = parte.match(/(\d+)\s*[xX]\s*(\d+)/);
          if (mSub) {
            innerMetri += parseInt(mSub[1], 10) * parseInt(mSub[2], 10);
          } else {
            const mNum = parte.match(/^(\d+)\b/);
            if (mNum) {
              const val = parseInt(mNum[1], 10);
              if (val >= 25) innerMetri += val;
            }
          }
        }
        metriTotali = innerMetri * outerMultiplier;
        distanza = Math.round(metriTotali / outerMultiplier);
        ripetizioni = outerMultiplier;
      } else {
        // 2. Cerca pattern standard "NxM" o "N x M" (es. 8x50, 12x50, 10x25)
        const matchNxM = cleanRiga.match(/(\d+)\s*[xX]\s*(\d+)/);
        if (matchNxM) {
          ripetizioni = parseInt(matchNxM[1], 10);
          distanza = parseInt(matchNxM[2], 10);
          metriTotali = ripetizioni * distanza;
        } else {
          // 3. Cerca un numero all'inizio (es. "200", "300 gambe", "6 sciolte")
          const matchNumeroInizio = cleanRiga.match(/^(\d+)\b/);
          if (matchNumeroInizio) {
            const val = parseInt(matchNumeroInizio[1], 10);
            if (val < 25 && cleanRiga.toLowerCase().includes('sciolt')) {
              // Es. "6 sciolte" -> 6 vasche da 25m = 150m
              ripetizioni = val;
              distanza = 25;
              metriTotali = ripetizioni * distanza;
            } else if (val >= 25) {
              distanza = val;
              ripetizioni = 1;
              metriTotali = distanza;
            } else {
              distanza = 0;
              ripetizioni = 1;
              metriTotali = 0;
            }
          } else {
            distanza = 0;
            ripetizioni = 1;
            metriTotali = 0;
          }
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
        attrezzi
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
