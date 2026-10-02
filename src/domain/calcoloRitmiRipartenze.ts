import {
  Atleta,
  CodiceAllenamentoKey,
  ContestoTempo,
  FormCheckConsiglio,
  Mesociclo,
  RitmoCodice,
  Stile,
  TabellaRitmiAtleta,
  Tempo,
  TempoImportato
} from '../types';
import { daysBetween, todayISO } from './dateUtils';
import { formattaTempo, parseTempo } from './tempoUtils';

export class CalcoloRitmiRipartenze {
  /**
   * Calcola i ritmi di allenamento, le ripartenze ed il recupero per tutti i codici A1-D
   * partendo dal tempo sui 100m dell'atleta.
   */
  static calcolaTabellaRitmi(
    atletaId: number,
    tempo100mCentesimi: number,
    stile: Stile = 'STILE_LIBERO',
    vascaMetri: number = 25
  ): TabellaRitmiAtleta {
    const base = Math.max(tempo100mCentesimi, 4000); // minimo 40"
    const ritmiMap = {} as Record<CodiceAllenamentoKey, RitmoCodice>;

    const defs: Record<CodiceAllenamentoKey, [number, number, number, string]> = {
      A1: [16, 15, 15, 'Nuoto rilassato e coordinato, frequenza cardiaca contenuta.'],
      A2: [12, 10, 12, 'Passo fondo costante, controllo del numero di bracciate.'],
      B1: [6, 8, 10, 'Passo Soglia Anaerobica: mantenere costante per tutta la serie.'],
      B2: [3, 20, 20, 'Passo VO2 Max: sforzo ad alta frequenza cardiaca.'],
      C1: [0, 75, 75, "Passo Gara 100m: tolleranza all'acidosi con ampio recupero."],
      C2: [-2, 120, 120, 'Sforzo Massimale: picco di potenza lattacida.'],
      C3: [0, 90, 90, 'Simulazione esatta passo gara prioritaria.'],
      D: [-5, 60, 60, 'Velocità pura alattacida sui primi 15m-25m.']
    };

    const keys: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];
    for (const codice of keys) {
      const [deltaPasso100Sec, deltaRipartenzaSec, pausaSec, nota] = defs[codice];
      const passoCentesimi = Math.max(base + deltaPasso100Sec * 100, 2500);
      const ripartenzaSec = (passoCentesimi / 100) + deltaRipartenzaSec;

      // Arrotonda ripartenza e pausa a multipli di 5 secondi
      const ripartenzaSecArrotondata = Math.round(ripartenzaSec / 5) * 5;
      const pausaSecArrotondata = Math.round(pausaSec / 5) * 5;

      const minRip = Math.floor(ripartenzaSecArrotondata / 60);
      const secRip = ripartenzaSecArrotondata % 60;
      const secStr = secRip < 10 ? `0${secRip}` : `${secRip}`;
      const strRipartenza = minRip > 0 ? `a ${minRip}'${secStr}"` : `a ${secRip}"`;

      ritmiMap[codice] = {
        codice,
        passo100mCentesimi: passoCentesimi,
        passo100mFormatted: formattaTempo(passoCentesimi),
        ripartenzaSecondi: ripartenzaSecArrotondata,
        ripartenzaFormatted: strRipartenza,
        pausaSecondi: pausaSecArrotondata,
        pausaFormatted: `recupero ${pausaSecArrotondata}"`,
        noteTecniche: nota
      };
    }

    return {
      atletaId,
      tempoRiferimento100mCentesimi: base,
      stileRiferimento: stile,
      vascaMetri,
      ritmi: ritmiMap
    };
  }

  /**
   * Importa tempi da testo/OCR. Per riga: sceglie il tempo più alto (finale, non i parziali),
   * distanza e stile per parole intere.
   */
  static parseImportaTempi(testo: string): TempoImportato[] {
    const regexTempo = /(?<![\d:.,])(?:(\d{1,2}):)?(\d{1,2})[.,](\d{1,2})(?!\d)(?![.,]\d)/g;
    const regexDistanza = /(?<!\d)(1500|800|400|200|100|50)(?!\d)/;
    const regexParole = /[a-zà-ÿ]+/g;
    const risultati: TempoImportato[] = [];

    const righe = testo.split('\n');
    for (const riga of righe) {
      if (!riga.trim()) continue;
      const matches = Array.from(riga.matchAll(regexTempo));
      const centesimiList = matches.map(m => parseTempo(m[0])).filter((c): c is number => c !== null);
      if (centesimiList.length === 0) continue;
      const maxCentesimi = Math.max(...centesimiList);
      if (maxCentesimi < 1500) continue;

      const resto = riga.replace(regexTempo, ' ').toLowerCase();
      const distMatch = resto.match(regexDistanza);
      const distanza = distMatch ? parseInt(distMatch[1], 10) : 100;
      const parole = new Set(Array.from(resto.matchAll(regexParole)).map(m => m[0]));

      let stile: Stile = 'STILE_LIBERO';
      if (['misti', 'im', 'medley', 'sm'].some(w => parole.has(w))) {
        stile = 'MISTI';
      } else if (['rana', 'br', 'breast', 'breaststroke', 'ra'].some(w => parole.has(w))) {
        stile = 'RANA';
      } else if (['farfalla', 'fa', 'fly', 'delfino', 'butterfly', 'df'].some(w => parole.has(w))) {
        stile = 'FARFALLA';
      } else if (['dorso', 'do', 'back', 'backstroke'].some(w => parole.has(w))) {
        stile = 'DORSO';
      }

      let contesto: ContestoTempo = 'GARA';
      if (Array.from(parole).some(w => w.startsWith('allenam'))) {
        contesto = 'ALLENAMENTO';
      } else if (parole.has('test')) {
        contesto = 'TEST';
      }

      risultati.push({
        stile,
        distanzaMetri: distanza,
        centesimi: maxCentesimi,
        formatted: formattaTempo(maxCentesimi),
        contesto,
        note: 'Importato da testo/OCR'
      });
    }

    return risultati;
  }

  /**
   * Valuta se l'atleta necessita di un Form Check (test in vasca) per aggiornare i ritmi.
   */
  static valutaNecessitaFormCheck(
    atleta: Atleta,
    tempi: Tempo[],
    mesocicloCorrente?: Mesociclo | null
  ): FormCheckConsiglio {
    const oggi = todayISO();
    const tempiAtleta = tempi.filter(t => t.atletaId === atleta.id);
    let ultimoTempoData: string | null = null;
    for (const t of tempiAtleta) {
      if (!ultimoTempoData || t.data > ultimoTempoData) {
        ultimoTempoData = t.data;
      }
    }

    const giorniDallUltimoTempo = ultimoTempoData ? daysBetween(ultimoTempoData, oggi) : 999;

    if (giorniDallUltimoTempo > 60) {
      return {
        necessario: true,
        titoloTest: '⚡ Form Check Necessario: Test T30 / 100m Passo',
        motivazione: `Non ci sono tempi di gara o test registrati da oltre 60 giorni per ${atleta.nome}. È necessario un test per calibrare le ripartenze.`,
        istruzioniVasca: "Esegui un Test T30 (30 minuti continui a passo costante A2/B1) oppure 3 x 100m B1 con ripartenza a 2' per determinare la velocità di soglia."
      };
    }

    if (mesocicloCorrente?.fase === 'PREPARAZIONE_SPECIFICA' && giorniDallUltimoTempo > 30) {
      return {
        necessario: true,
        titoloTest: '⚡ Check della Forma: Test 100m Soglia B1',
        motivazione: 'Inizio della fase di Preparazione Specifica: occorre verificare la velocità di soglia anaerobica B1 prima delle serie VO2 Max B2.',
        istruzioniVasca: 'Esegui 4 x 100m B1 alla massima velocità sostenibile regolare. Registra il tempo medio dei 100m.'
      };
    }

    if (mesocicloCorrente?.fase === 'PRE_GARA' && giorniDallUltimoTempo > 21) {
      return {
        necessario: true,
        titoloTest: '⚡ Check della Forma: Test Ritmo Gara C3 (50m / 100m)',
        motivazione: 'Fase Pre-Gara: verifica il passo gara sui 50m o 100m per perfezionare le ripartenze della fase di tapering.',
        istruzioniVasca: 'Esegui 2 x 50m C3 al passo gara obiettivo con 3 minuti di recupero passivo.'
      };
    }

    return {
      necessario: false,
      titoloTest: 'Forma e Ritmi Aggiornati',
      motivazione: "I tempi dell'atleta sono recenti e calibrati correttamente.",
      istruzioniVasca: 'Prosegui la programmazione standard con la tabella dei ritmi corrente.'
    };
  }
}
