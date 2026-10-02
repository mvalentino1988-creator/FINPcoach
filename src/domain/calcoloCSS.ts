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
}
