import { RisultatoACWR, RisultatoCSS } from '../types';
import { formattaTempo } from './tempoUtils';

export class CalcoloScienzaNuoto {
  /**
   * Calcola la Velocità Critica di Nuotata (CSS - Critical Swim Speed), il benchmark scientifico
   * gold-standard nel nuoto agonistico per determinare la soglia anaerobica (B1).
   */
  static calcolaCSS(tempo400mCentesimi: number, tempo100mCentesimi: number): RisultatoCSS | null {
    const t400Sec = tempo400mCentesimi / 100.0;
    const t100Sec = tempo100mCentesimi / 100.0;
    const deltaTempo = t400Sec - t100Sec;
    if (deltaTempo <= 0) return null;

    // CSS (m/s) = (400 - 100) / (t400 - t100)
    const cssMs = 300.0 / deltaTempo;
    const passo100Sec = 100.0 / cssMs;
    const passo100Centesimi = Math.round(passo100Sec * 100);

    return {
      cssVelocitaMs: cssMs,
      passo100mCentesimi: passo100Centesimi,
      passo100mFormatted: formattaTempo(passo100Centesimi),
      spiegazioneMetodologica: `Velocità Critica CSS = ${cssMs.toFixed(2)} m/s. Rappresenta la massima velocità aerobica sostenibile senza accumulo esponenziale di lattato (Passo Soglia B1).`
    };
  }

  /**
   * Calcola il rapporto di carico Acuto:Cronico (ACWR - Acute:Chronic Workload Ratio)
   * utilizzato in medicina dello sport per prevenire infortuni alla spalla ed overtraining.
   */
  static calcolaACWR(caricoSettimanaCorrente: number, carichiPrecedenti: number[]): RisultatoACWR {
    const ultime4 = carichiPrecedenti.slice(0, 4);
    let cronicoMedio: number;
    if (ultime4.length === 0) {
      cronicoMedio = Math.max(caricoSettimanaCorrente, 1.0);
    } else {
      const sum = ultime4.reduce((acc, v) => acc + v, 0);
      cronicoMedio = Math.max(sum / ultime4.length, 1.0);
    }

    const rapporto = caricoSettimanaCorrente / cronicoMedio;
    const rapportoFormatted = rapporto.toFixed(2);

    let livello: string;
    let avviso: string | null = null;

    if (rapporto > 1.45) {
      livello = 'Rischio Elevato ⚠️';
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Aumento del carico troppo brusco rispetto alle ultime 4 settimane. Rischio infortunio/spalla alto: consigliato microciclo di scarico.`;
    } else if (rapporto > 1.25) {
      livello = 'Attenzione ⚡';
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Incremento del carico significativo, monitorare il recupero dell'atleta.`;
    } else if (rapporto >= 0.8 && rapporto <= 1.25) {
      livello = 'Ottimale ✅';
      avviso = null;
    } else {
      livello = 'Sotto-allenamento 🔵';
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Volume significativamente ridotto rispetto alla media abituale.`;
    }

    return {
      caricoAcuto: caricoSettimanaCorrente,
      caricoCronicoMedio: cronicoMedio,
      acwrRapporto: rapporto,
      livelloRischio: livello,
      avvisoInfortunio: avviso
    };
  }

  /**
   * Calcolo della Ripartenza Automatica basata su CSS per serie di ripetute.
   * A seconda del codice energetico (A2, B1 soglia, B2 VO2max, C1 lattacido)
   * calcola tempo di nuotata target + recupero fisiologico standard FINP.
   *
   * @param cssPasso100mCentesimi Passo CSS per 100m
   * @param distanzaRipetutaMetri Distanza della singola frazione (es. 50, 100, 200)
   * @param codice Codice allenamento ('A2' | 'B1' | 'B2' | 'C1')
   * @returns Oggetto con tempoTargetCentesimi, ripartenzaSecondi, ripartenzaFormatted
   */
  static calcolaRipartenzaDaCSS(
    cssPasso100mCentesimi: number,
    distanzaRipetutaMetri: number,
    codice: 'A2' | 'B1' | 'B2' | 'C1' = 'B1'
  ): {
    tempoTargetCentesimi: number;
    tempoTargetFormatted: string;
    recuperoSecondi: number;
    ripartenzaSecondi: number;
    ripartenzaFormatted: string;
  } {
    // Proporzione distanza
    const fattoreDistanza = distanzaRipetutaMetri / 100.0;
    let deltaSec100m = 0;
    let recuperoSec = 15;

    switch (codice) {
      case 'A2':
        deltaSec100m = +3; // 3" più lento del CSS per 100m
        recuperoSec = 15;
        break;
      case 'B1':
        deltaSec100m = 0; // Passo esatto di soglia CSS
        recuperoSec = 15;
        break;
      case 'B2':
        deltaSec100m = -2; // 2" più veloce del CSS per 100m
        recuperoSec = 30;
        break;
      case 'C1':
        deltaSec100m = -5; // 5" più veloce del CSS per 100m
        recuperoSec = 60;
        break;
    }

    const passoSec100m = (cssPasso100mCentesimi / 100.0) + deltaSec100m;
    const tempoNuotataSec = Math.max(10, Math.round(passoSec100m * fattoreDistanza));
    const tempoTargetCentesimi = tempoNuotataSec * 100;

    // Ripartenza: arrotondata a multipli di 5 secondi (standard vasca)
    const ripartenzaGrezzaSec = tempoNuotataSec + recuperoSec;
    const ripartenzaSecondi = Math.ceil(ripartenzaGrezzaSec / 5) * 5;

    const ripMin = Math.floor(ripartenzaSecondi / 60);
    const ripSec = ripartenzaSecondi % 60;
    const ripartenzaFormatted = ripMin > 0
      ? `${ripMin}'${ripSec < 10 ? '0' : ''}${ripSec}"`
      : `${ripSec}"`;

    return {
      tempoTargetCentesimi,
      tempoTargetFormatted: formattaTempo(tempoTargetCentesimi),
      recuperoSecondi: ripartenzaSecondi - tempoNuotataSec,
      ripartenzaSecondi,
      ripartenzaFormatted
    };
  }
}
