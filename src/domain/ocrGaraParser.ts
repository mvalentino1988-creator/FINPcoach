import { Stile, ContestoTempo } from '../types';
import { parseTempo } from './tempoUtils';

export interface TempoEstrattoOcr {
  id: string;
  luogo: string;
  data: string; // YYYY-MM-DD
  stile: Stile;
  distanzaMetri: number;
  tempoTesto: string;
  centesimi: number;
  vascaMetri: number;
  contesto: ContestoTempo;
  selezionato: boolean;
}

interface ColonnaEvento {
  distanza: number;
  stile: Stile;
}

export class OcrGaraParser {
  static parseTabellaGare(testoOcr: string): TempoEstrattoOcr[] {
    const risultati: TempoEstrattoOcr[] = [];
    const righe = testoOcr.split('\n');

    // Mappatura colonne predefinita standard per le tabelle FINP (es. Polha Varese con 50 sl, 100 sl, 50 do, 100 do, ecc.)
    let colonneMapping: ColonnaEvento[] = [
      { distanza: 50, stile: 'STILE_LIBERO' },
      { distanza: 100, stile: 'STILE_LIBERO' },
      { distanza: 50, stile: 'DORSO' },
      { distanza: 100, stile: 'DORSO' },
      { distanza: 50, stile: 'RANA' },
      { distanza: 100, stile: 'RANA' },
      { distanza: 50, stile: 'FARFALLA' },
      { distanza: 100, stile: 'FARFALLA' },
      { distanza: 150, stile: 'MISTI' },
      { distanza: 200, stile: 'MISTI' },
    ];

    // Cerca intestazioni nelle prime righe per raffinare il mapping
    for (let i = 0; i < Math.min(6, righe.length); i++) {
      const rigaLower = righe[i].toLowerCase();
      if (rigaLower.includes('50') || rigaLower.includes('100') || rigaLower.includes('s.l.') || rigaLower.includes('do')) {
        const detectedCols: ColonnaEvento[] = [];
        if (rigaLower.includes('50 s.l') || rigaLower.includes('50 sl')) detectedCols.push({ distanza: 50, stile: 'STILE_LIBERO' });
        if (rigaLower.includes('100 s.l') || rigaLower.includes('100 sl')) detectedCols.push({ distanza: 100, stile: 'STILE_LIBERO' });
        if (rigaLower.includes('50 do')) detectedCols.push({ distanza: 50, stile: 'DORSO' });
        if (rigaLower.includes('100 do')) detectedCols.push({ distanza: 100, stile: 'DORSO' });
        if (rigaLower.includes('50 ra')) detectedCols.push({ distanza: 50, stile: 'RANA' });
        if (rigaLower.includes('100 ra')) detectedCols.push({ distanza: 100, stile: 'RANA' });
        if (rigaLower.includes('50 fa')) detectedCols.push({ distanza: 50, stile: 'FARFALLA' });
        if (rigaLower.includes('100 fa')) detectedCols.push({ distanza: 100, stile: 'FARFALLA' });

        if (detectedCols.length >= 2) {
          colonneMapping = detectedCols;
        }
      }
    }

    for (let i = 0; i < righe.length; i++) {
      const riga = righe[i].trim();
      if (!riga) continue;

      const matchData = riga.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (matchData) {
        const giorno = matchData[1].padStart(2, '0');
        const mese = matchData[2].padStart(2, '0');
        let anno = matchData[3];
        if (anno.length === 2) anno = '20' + anno;
        const dataIso = `${anno}-${mese}-${giorno}`;

        const idxData = riga.indexOf(matchData[0]);
        let luogo = riga.substring(0, idxData).replace(/[^a-zA-Z\s]/g, '').trim();
        if (!luogo) luogo = 'Gara Ufficiale';

        const tokenResto = riga.substring(idxData + matchData[0].length);
        const matchesTempi = tokenResto.match(/(\d{1,2})[.:](\d{2})([.:](\d{2}))?|\b(\d{2})[.:](\d{2})\b/g);

        if (matchesTempi && matchesTempi.length > 0) {
          matchesTempi.forEach((tStr, colIdx) => {
            const centesimi = parseTempo(tStr);
            if (centesimi != null && centesimi > 0) {
              const eventoCol = colonneMapping[colIdx % colonneMapping.length];
              const vasca = riga.includes('25') ? 25 : riga.includes('50') ? 50 : 25;

              risultati.push({
                id: `${Date.now()}_${i}_${colIdx}`,
                luogo,
                data: dataIso,
                stile: eventoCol.stile,
                distanzaMetri: eventoCol.distanza,
                tempoTesto: tStr,
                centesimi,
                vascaMetri: vasca,
                contesto: 'GARA',
                selezionato: true
              });
            }
          });
        }
      }
    }

    if (risultati.length === 0) {
      const matchTuttiTempi = testoOcr.match(/(\d{1,2})[.:](\d{2})([.:](\d{2}))?/g);
      if (matchTuttiTempi) {
        matchTuttiTempi.forEach((tStr, idx) => {
          const centesimi = parseTempo(tStr);
          if (centesimi != null && centesimi > 0) {
            risultati.push({
              id: `${Date.now()}_${idx}`,
              luogo: 'Gara OCR',
              data: new Date().toISOString().split('T')[0],
              stile: 'STILE_LIBERO',
              distanzaMetri: 100,
              tempoTesto: tStr,
              centesimi,
              vascaMetri: 25,
              contesto: 'GARA',
              selezionato: true
            });
          }
        });
      }
    }

    return risultati;
  }
}
