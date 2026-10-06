import { Atleta, Tempo } from '../types';
import { todayISO, yearsBetween } from './dateUtils';

export type LivelloAtleta = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZATO';

export interface ValutazioneLivello {
  livello: LivelloAtleta;
  etichetta: string;
  volumeBaseGiornaliero: number; // metri consigliati per seduta
  seduteSettimanaliConsigliate: number;
  note: string[];
}

export class RilevamentoLivello {
  /**
   * Valuta il livello dell'atleta basandosi su:
   * - Tempi registrati
   * - Età
   * - Frequenza di allenamento
   */
  static valuta(atleta: Atleta, tempi: Tempo[], logSedute: any[]): ValutazioneLivello {
    const oggi = todayISO();
    const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
    const note: string[] = [];
    
    const tempiAtleta = tempi.filter(t => t.atletaId === atleta.id);
    const tempiRecenti = tempiAtleta.filter(t => t.distanzaMetri >= 50);
    
    // Se non ci sono tempi, valuta dall'età
    if (tempiRecenti.length === 0) {
      if (eta !== null) {
        if (eta < 10) {
          return {
            livello: 'PRINCIPIANTE',
            etichetta: 'Principiante (bambino)',
            volumeBaseGiornaliero: 600,
            seduteSettimanaliConsigliate: 2,
            note: ['Nessun tempo registrato. Volume base ridotto per bambini sotto i 10 anni.']
          };
        } else if (eta < 14) {
          return {
            livello: 'PRINCIPIANTE',
            etichetta: 'Principiante (giovane)',
            volumeBaseGiornaliero: 800,
            seduteSettimanaliConsigliate: 3,
            note: ['Nessun tempo registrato. Volume base ridotto per ragazzi 10-14 anni.']
          };
        } else {
          return {
            livello: 'INTERMEDIO',
            etichetta: 'Intermedio (adulto)',
            volumeBaseGiornaliero: 1200,
            seduteSettimanaliConsigliate: 3,
            note: ['Nessun tempo registrato. Volume base standard per adulti.']
          };
        }
      }
      
      return {
        livello: 'INTERMEDIO',
        etichetta: 'Livello sconosciuto',
        volumeBaseGiornaliero: 1000,
        seduteSettimanaliConsigliate: 3,
        note: ['Inserisci almeno un tempo per valutare meglio il livello.']
      };
    }

    // Calcola il passo 100m medio dai tempi
    const passi100 = tempiRecenti.map(t => this.convertiA100m(t));
    const passoMedio = passi100.reduce((sum, p) => sum + p, 0) / passi100.length;
    
    // Soglie per stile libero (tempi in secondi per 100m)
    const Soglie = {
      principiante: 90, // 1'30" o più lento
      intermedio: 75,  // 1'15"
      avanzato: 60     // 1'00" o più veloce
    };

    let livello: LivelloAtleta;
    let volumeBase: number;
    let seduteBase: number;

    if (passoMedio >= Soglie.principiante) {
      livello = 'PRINCIPIANTE';
      volumeBase = 800;
      seduteBase = 2;
      note.push(`Passo medio ${this.formattaCentesimi(passoMedio)}: livello principiante.`);
    } else if (passoMedio >= Soglie.intermedio) {
      livello = 'INTERMEDIO';
      volumeBase = 1200;
      seduteBase = 3;
      note.push(`Passo medio ${this.formattaCentesimi(passoMedio)}: livello intermedio.`);
    } else {
      livello = 'AVANZATO';
      volumeBase = 1800;
      seduteBase = 4;
      note.push(`Passo medio ${this.formattaCentesimi(passoMedio)}: livello avanzato.`);
    }

    // Adatta per età
    if (eta !== null) {
      if (eta < 12) {
        volumeBase = Math.min(volumeBase, 700);
        seduteBase = Math.min(seduteBase, 2);
        note.push('Under 12: volume e frequenza ridotti per bambini.');
      } else if (eta >= 35) {
        volumeBase = Math.round(volumeBase * 0.85);
        note.push('Master 35+: volume ridotto al 85%.');
      }
    }

    // Adatta per numero di tempi registrati (più dati = più confidenza nel volume)
    if (tempiRecenti.length < 3) {
      volumeBase = Math.round(volumeBase * 0.8);
      note.push('Pochi tempi registrati: volume conservativo finché non hai più dati.');
    }

    return {
      livello,
      etichetta: this.etichettaLivello(livello, eta),
      volumeBaseGiornaliero: volumeBase,
      seduteSettimanaliConsigliate: seduteBase,
      note
    };
  }

  private static convertiA100m(tempo: Tempo): number {
    const distanza = tempo.distanzaMetri;
    let esponente: number;
    
    if (distanza <= 50) {
      esponente = 1.15;
    } else if (distanza <= 100) {
      esponente = 1.08;
    } else if (distanza <= 200) {
      esponente = 1.06;
    } else {
      esponente = 1.04;
    }
    
    const vasca = tempo.vascaMetri === 50 ? 0.97 : 1.0;
    return tempo.centesimi * vasca * Math.pow(100.0 / distanza, esponente);
  }

  private static formattaCentesimi(centesimi: number): string {
    const minuti = Math.floor(centesimi / 6000);
    const secondi = Math.floor((centesimi % 6000) / 100);
    const cent = centesimi % 100;
    
    if (minuti > 0) {
      return `${minuti}'${secondi.toString().padStart(2, '0')}"`;
    }
    return `${secondi}.${cent.toString().padStart(2, '0')}"`;
  }

  private static etichettaLivello(livello: LivelloAtleta, eta: number | null): string {
    const livelloBase = {
      PRINCIPIANTE: 'Principiante',
      INTERMEDIO: 'Intermedio',
      AVANZATO: 'Avanzato'
    }[livello];

    if (eta !== null) {
      if (eta < 12) return `${livelloBase} (giovane)`;
      if (eta >= 35) return `${livelloBase} (master)`;
    }

    return livelloBase;
  }
}
