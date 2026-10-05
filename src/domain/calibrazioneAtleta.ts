import { Atleta, CondizioneMedica, Tempo } from '../types';
import { todayISO, yearsBetween } from './dateUtils';

export interface CalibrazioneAtleta {
  /** Passo 100m stimato (centesimi) */
  passo100mCentesimi: number;
  /** Indice di forma: 0-100, basato su tempi recenti */
  indiceForma: number;
  /** Capacità distanze: true se può sostenere 200m+, false se solo distanze corte */
  puoSostenereDistanzeLunghe: boolean;
  /** Fattore di correzione per età/patologie */
  fattoreCorrezione: number;
  /** Note esplicative della calibrazione */
  note: string[];
}

export class CalibrazioneAtleta {
  /**
   * Calibra automaticamente i parametri dell'atleta basandosi su:
   * - Tempi registrati
   * - Età
   * - Condizioni mediche
   * - Capacità di sostenere distanze lunghe
   */
  static calibra(
    atleta: Atleta,
    tempi: Tempo[],
    condizioni: CondizioneMedica[]
  ): CalibrazioneAtleta {
    const oggi = todayISO();
    const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
    const note: string[] = [];
    let fattoreCorrezione = 1.0;
    let puoSostenereDistanzeLunghe = true;

    // 1. Valutazione tempi
    const tempiAtleta = tempi.filter(t => t.atletaId === atleta.id);
    const tempiRecenti = tempiAtleta.filter(t => t.distanzaMetri >= 50);

    if (tempiRecenti.length === 0) {
      return {
        passo100mCentesimi: 6000, // 1'00" default
        indiceForma: 50,
        puoSostenereDistanzeLunghe: true,
        fattoreCorrezione: 1.0,
        note: ['Nessun tempo registrato: calibrazione di default. Inserisci almeno un 50m o 100m.']
      };
    }

    // 2. Capacità distanze - controlla se ha tempi 200m+
    const tempiLungi = tempiRecenti.filter(t => t.distanzaMetri >= 200);
    if (tempiLungi.length === 0) {
      puoSostenereDistanzeLunghe = false;
      note.push('Atleta con solo distanze corte (50-100m): evita serie >200m e volume eccessivo.');
    }

    // 3. Calcolo passo 100m dal miglior tempo
    const migliorTempo = this.scegliMigliorTempo(tempiRecenti);
    const passo100m = this.convertiA100m(migliorTempo);
    
    // 4. Valutazione età
    if (eta !== null) {
      if (eta < 12) {
        fattoreCorrezione = 0.85;
        note.push('Under 12: volume ridotto al 85%, enfasi su tecnica non lattacido.');
      } else if (eta >= 35) {
        fattoreCorrezione = 0.90;
        note.push('Master 35+: volume ridotto al 90%, recuperi più ampi.');
      } else if (eta >= 12 && eta <= 14) {
        fattoreCorrezione = 0.95;
        note.push('12-14 anni: introduzione graduale lattacido, volume 95%.');
      }
    }

    // 5. Valutazione condizioni mediche
    const attive = condizioni.filter(c => c.attiva);
    const testoMedico = attive.map(c => `${c.descrizione} ${c.limitazioni}`).join(' ').toLowerCase();
    
    if (testoMedico.includes('spalla') || testoMedico.includes('cuffia') || testoMedico.includes('rotator')) {
      fattoreCorrezione *= 0.85;
      note.push('Patologia spalla: ridotto volume B2/C, più A1 tecnica.');
    }
    
    if (testoMedico.includes('spastic') || testoMedico.includes('neurolog') || testoMedico.includes('midoll')) {
      fattoreCorrezione *= 0.80;
      puoSostenereDistanzeLunghe = false;
      note.push('Condizione neurologica: evita C1/C2, distanze corte, recuperi ampi.');
    }
    
    if (testoMedico.includes('cardio') || testoMedico.includes('cuore') || testoMedico.includes('asma')) {
      fattoreCorrezione *= 0.90;
      note.push('Patologia cardiorespiratoria: ritmo costante A2/B1, evita apnee.');
    }

    // 6. Indice di forma (basato su miglioramento tempi)
    const indiceForma = this.calcolaIndiceForma(tempiRecenti, migliorTempo);
    if (indiceForma < 40) {
      note.push('Forma in calo: considera scarico o focus tecnico.');
    } else if (indiceForma > 80) {
      note.push('Forma eccellente: può aumentare leggermente il carico.');
    }

    return {
      passo100mCentesimi: passo100m,
      indiceForma,
      puoSostenereDistanzeLunghe,
      fattoreCorrezione,
      note
    };
  }

  private static scegliMigliorTempo(tempi: Tempo[]): Tempo {
    // Priorità: 100m > 200m > 50m > 400m
    const perDistanza = tempi.reduce((acc, t) => {
      if (!acc[t.distanzaMetri]) acc[t.distanzaMeti] = [];
      acc[t.distanzaMeti].push(t);
      return acc;
    }, {} as Record<number, Tempo[]>);

    // Preferisce 100m se disponibile
    if (perDistanza[100] && perDistanza[100].length > 0) {
      return perDistanza[100].reduce((min, t) => t.centesimi < min.centesimi ? t : min);
    }
    
    // Altrimenti 200m
    if (perDistanza[200] && perDistanza[200].length > 0) {
      return perDistanza[200].reduce((min, t) => t.centesimi < min.centesimi ? t : min);
    }
    
    // Altrimenti 50m
    if (perDistanza[50] && perDistanza[50].length > 0) {
      return perDistanza[50].reduce((min, t) => t.centesimi < min.centesimi ? t : min);
    }
    
    // Altrimenti qualsiasi altro
    return tempi.reduce((min, t) => t.centesimi < min.centesimi ? t : min);
  }

  private static convertiA100m(tempo: Tempo): number {
    const distanza = tempo.distanzaMetri;
    let esponente: number;
    
    if (distanza <= 50) {
      esponente = 1.15; // 50m → 100m: +15% conservativo
    } else if (distanza <= 100) {
      esponente = 1.08; // 100m → 100m: +8%
    } else if (distanza <= 200) {
      esponente = 1.06; // 200m → 100m: +6%
    } else {
      esponente = 1.04; // 400m → 100m: +4%
    }
    
    const vasca = tempo.vascaMetri === 50 ? 0.97 : 1.0;
    return Math.round(tempo.centesimi * vasca * Math.pow(100.0 / distanza, esponente));
  }

  private static calcolaIndiceForma(tempi: Tempo[], migliorTempo: Tempo): number {
    // Indice 0-100 basato su:
    // - Numero di tempi registrati
    // - Se il miglior tempo è recente
    // - Variazione dei tempi
    
    if (tempi.length === 0) return 50;
    
    let punteggio = 50;
    
    // Più tempi registrati = più dati = indice più alto
    punteggio += Math.min(20, tempi.length * 2);
    
    // Tempi recenti = indice più alto
    const tempiDati = tempi.filter(t => t.contesto !== 'ALLENAMENTO');
    if (tempiDati.length > 0) {
      const ultimo = tempiDati.reduce((max, t) => t.data > max.data ? t : max);
      // Se il miglior tempo è uno degli ultimi 3
      const ultimi3 = tempiDati
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 3);
      if (ultimi3.some(t => t.id === migliorTempo.id)) {
        punteggio += 15;
      }
    }
    
    return Math.min(100, Math.max(0, punteggio));
  }
}
