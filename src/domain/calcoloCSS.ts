import { LivelloACWR, RisultatoACWR, RisultatoCSS } from '../types';
import { formattaTempo } from './tempoUtils';

/**
 * Soglie ACWR (Acute:Chronic Workload Ratio) — UNICA fonte di verita' per
 * dominio, UI e documentazione. Modello Gabbett rivisto per il nuoto:
 *  - acuto = carico della settimana corrente (sRPE)
 *  - cronico = media dei carichi delle ultime 4 settimane (almeno 1.0)
 *  - < 0.8            : sotto-allenamento (volume ridotto)
 *  - 0.8 - 1.3        : ottimale (sweet spot)
 *  - > 1.3 - 1.5      : attenzione (incremento significativo)
 *  - > 1.5            : elevato (rischio, microciclo di scarico)
 * L'ACWR e' un indicatore di monitoraggio del carico, NON una previsione
 * di infortunio.
 */
export const ACWR_SOTTO_CARICO = 0.8;
export const ACWR_ATTENZIONE = 1.3;
export const ACWR_ELEVATO = 1.5;

export const ACWR_DISCLAIMER =
  "L'ACWR e' un indicatore di monitoraggio del carico di allenamento, non una previsione di infortunio.";

export function livelloACWR(rapporto: number): LivelloACWR {
  if (rapporto < ACWR_SOTTO_CARICO) return 'sotto-allenamento';
  if (rapporto <= ACWR_ATTENZIONE) return 'ottimale';
  if (rapporto <= ACWR_ELEVATO) return 'attenzione';
  return 'elevato';
}

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
   * Calcola il CSS con protocolli ridotti per classi basse (S1-S4).
   * Supporta protocolli 200m-50m o 100m-25m per evitare 400m massimali controindicati.
   */
  static calcolaCSSRidotto(
    tempoLungoCentesimi: number,
    tempoBreveCentesimi: number,
    distanzaLungaMetri: 200 | 100,
    distanzaBreveMetri: 50 | 25
  ): RisultatoCSS | null {
    const tLungoSec = tempoLungoCentesimi / 100.0;
    const tBreveSec = tempoBreveCentesimi / 100.0;
    const deltaTempo = tLungoSec - tBreveSec;
    if (deltaTempo <= 0) return null;

    const deltaDistanza = distanzaLungaMetri - distanzaBreveMetri;
    const cssMs = deltaDistanza / deltaTempo;
    const passo100Sec = 100.0 / cssMs;
    const passo100Centesimi = Math.round(passo100Sec * 100);

    return {
      cssVelocitaMs: cssMs,
      passo100mCentesimi: passo100Centesimi,
      passo100mFormatted: formattaTempo(passo100Centesimi),
      spiegazioneMetodologica: `Velocità Critica CSS (Protocollo ridotto ${distanzaLungaMetri}m-${distanzaBreveMetri}m) = ${cssMs.toFixed(2)} m/s. Rappresenta la massima velocità aerobica sostenibile senza accumulo esponenziale di lattato (Passo Soglia B1).`
    };
  }

  /**
   * Calcola il rapporto di carico Acuto:Cronico (ACWR - Acute:Chronic Workload Ratio)
   * utilizzato in medicina dello sport per prevenire infortuni alla spalla ed overtraining.
   */
  static calcolaACWR(
    caricoSettimanaCorrente: number,
    carichiPrecedenti: number[],
    asimmetriaPropulsiva?: boolean // True per atleti con trazione esclusiva di braccia (paraplegie, amputazioni arti inferiori)
  ): RisultatoACWR {
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

    const livello = livelloACWR(rapporto);
    let avviso: string | null = null;
    let avvisoSpalla: string | null = null;

    if (livello === 'elevato') {
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Aumento del carico troppo brusco rispetto alle ultime 4 settimane. Rischio infortunio/spalla alto: consigliato microciclo di scarico.`;
    } else if (livello === 'attenzione') {
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Incremento del carico significativo, monitorare il recupero dell'atleta.`;
    } else if (livello === 'sotto-allenamento') {
      avviso = `Rapporto carico ACWR = ${rapportoFormatted}. Volume significativamente ridotto rispetto alla media abituale.`;
    }

    // Alert specifico per spalla in caso di asimmetria propulsiva
    if (asimmetriaPropulsiva && rapporto > 1.15) {
      avvisoSpalla = `ATLETA CON ASIMMETRIA PROPULSIVA: Carico sulla spalla dominante superiore al 15% rispetto alla media. Rischio sovraccarico scapolo-omerale elevato. Considerare serie compensatorie o riduzione volume unilateralmente.`;
    }

    return {
      caricoAcuto: caricoSettimanaCorrente,
      caricoCronicoMedio: cronicoMedio,
      acwrRapporto: rapporto,
      livelloRischio: livello,
      avvisoInfortunio: avviso,
      avvisoSpalla
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
