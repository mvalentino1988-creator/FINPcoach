import { Atleta, FasciaAtleta, FASCIA_ATLETA_LABEL, LogSeduta, ProfiloAtleta, Tempo } from '../types';
import { todayISO, yearsBetween, addDays } from './dateUtils';
import { convertiPasso100m } from './tempoUtils';

/**
 * Riferimenti indicativi di ALTO LIVELLO (non record ufficiali) per i 100m stile
 * libero in vasca lunga, espressi in centesimi di secondo, per classe S.
 *
 * Servono a rendere il profilo RELATIVO alla classe di disabilità: un S2 che nuota
 * 2:00 è un atleta di alto livello, mentre lo stesso tempo per un S14 è da principiante.
 *
 * Valori indicativi e aggiornabili: sostituire con i riferimenti FINP/WPS ufficiali
 * della stagione in corso quando disponibili.
 */
export const RIFERIMENTO_100M_SL_PER_CLASSE: Record<number, number> = {
  1: 15000, // 2:30.00
  2: 12000, // 2:00.00
  3: 10000, // 1:40.00
  4: 8000,  // 1:20.00
  5: 7000,  // 1:10.00
  6: 6400,  // 1:04.00
  7: 6000,  // 1:00.00
  8: 5700,  // 0:57.00
  9: 5400,  // 0:54.00
  10: 5100, // 0:51.00
  11: 5700, // 0:57.00
  12: 5200, // 0:52.00
  13: 5100, // 0:51.00
  14: 5200  // 0:52.00
};

/** Riferimento generico (nessuna classe) per adulto, in centesimi. */
const RIFERIMENTO_GENERICO_ADULTO = 6000; // 1:00.00

/**
 * Correzione del riferimento per l'ETÀ (age-grading): un bambino non può essere
 * confrontato con il riferimento di un adulto élite. Il fattore moltiplica il tempo
 * di riferimento (più alto = attesa più lenta). Valori indicativi per nuoto giovanile
 * (i tempi age-group sono tipicamente 40-95% più lenti dei senior).
 */
const FATTORE_ETA_RIFERIMENTO: Array<{ maxEta: number; fattore: number }> = [
  { maxEta: 8, fattore: 1.95 },
  { maxEta: 9, fattore: 1.80 },
  { maxEta: 10, fattore: 1.65 },
  { maxEta: 11, fattore: 1.52 },
  { maxEta: 12, fattore: 1.42 },
  { maxEta: 13, fattore: 1.32 },
  { maxEta: 14, fattore: 1.22 },
  { maxEta: 15, fattore: 1.14 },
  { maxEta: 16, fattore: 1.08 },
  { maxEta: 17, fattore: 1.03 }
];

/**
 * Volume giornaliero TIPICO per un atleta allenato di quell'età (metri/seduta).
 * Bande di riferimento per il nuoto giovanile competitivo (fonte: modelli di
 * sviluppo age-group — es. 10-12 anni: 2-4 km/seduta per un intermedio).
 * Il livello dell'atleta modula questo valore verso il basso/alto.
 */
const VOLUME_BANDA_ETA: Array<{ maxEta: number; metri: number }> = [
  { maxEta: 8, metri: 1500 },
  { maxEta: 9, metri: 1800 },
  { maxEta: 10, metri: 2000 },
  { maxEta: 11, metri: 2200 },
  { maxEta: 12, metri: 2500 },
  { maxEta: 13, metri: 2800 },
  { maxEta: 14, metri: 3200 },
  { maxEta: 15, metri: 3600 },
  { maxEta: 16, metri: 4000 },
  { maxEta: 17, metri: 4300 }
];
const VOLUME_BANDA_ADULTO = 4000;

/** Volume giornaliero consigliato (metri) per fascia — usato come riferimento di prestazione. */
const VOLUME_PER_FASCIA: Record<FasciaAtleta, number> = {
  ESORDIENTE: 600,
  PRINCIPIANTE: 1000,
  INTERMEDIO: 1600,
  AVANZATO: 2500,
  AGONISTA: 3500,
  ELITE: 4500,
  TOP_MONDIALE: 5500
};

/** Sedute settimanali consigliate per fascia. */
const SEDUTE_PER_FASCIA: Record<FasciaAtleta, number> = {
  ESORDIENTE: 2,
  PRINCIPIANTE: 3,
  INTERMEDIO: 4,
  AVANZATO: 5,
  AGONISTA: 6,
  ELITE: 8,
  TOP_MONDIALE: 10
};

/** Soglie dell'indice di prestazione (0-100) che delimitano le fasce. */
const SOGLIE_FASCIA: Array<{ soglia: number; fascia: FasciaAtleta }> = [
  { soglia: 92, fascia: 'TOP_MONDIALE' },
  { soglia: 82, fascia: 'ELITE' },
  { soglia: 70, fascia: 'AGONISTA' },
  { soglia: 55, fascia: 'AVANZATO' },
  { soglia: 40, fascia: 'INTERMEDIO' },
  { soglia: 22, fascia: 'PRINCIPIANTE' },
  { soglia: 0, fascia: 'ESORDIENTE' }
];

function arrotondaA50m(n: number): number {
  return Math.round(n / 50) * 50;
}

export class ProfiloAtletaService {
  /**
   * Profila l'atleta a 360° (dal principiante assoluto all'élite mondiale), in modo
   * RELATIVO alla classe di disabilità e CORRETTO PER L'ETÀ, integrando tempi, età,
   * frequenza e STORICO di allenamento. Il profilo guida volume, frequenza e doppie.
   *
   * Il volume restituito NON include il fattore medico (applicato una sola volta a
   * valle, in `volumePrescritto`), per evitare doppi conteggi.
   */
  static profila(atleta: Atleta, tempi: Tempo[], logSedute: LogSeduta[] = []): ProfiloAtleta {
    const oggi = todayISO();
    const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
    const note: string[] = [];
    const puntiForza: string[] = [];
    const areeMiglioramento: string[] = [];

    const tempiAtleta = tempi.filter(t => t.atletaId === atleta.id && t.distanzaMetri >= 50);
    const frequenza = this.stimaFrequenza(logSedute, atleta.id, oggi);

    // Miglior passo 100m equivalente (il più veloce = potenziale).
    let passo100m: number | null = null;
    if (tempiAtleta.length > 0) {
      passo100m = tempiAtleta
        .map(t => convertiPasso100m(t.centesimi, t.distanzaMetri, t.vascaMetri))
        .reduce((min, p) => Math.min(min, p), Number.POSITIVE_INFINITY);
    }

    // Riferimento per la classe (S preferita, poi SB/SM come approssimazione).
    const classeRif = atleta.classeS ?? atleta.classeSM ?? atleta.classeSB ?? null;
    let riferimentoClasse: number | null = null;
    if (classeRif != null && RIFERIMENTO_100M_SL_PER_CLASSE[classeRif]) {
      riferimentoClasse = RIFERIMENTO_100M_SL_PER_CLASSE[classeRif];
      if (atleta.classeS == null) {
        note.push(
          `Classe S non disponibile: riferimento 100m stimato dalla classe ${atleta.classeSM != null ? 'SM' : 'SB'}${classeRif}.`
        );
      }
    } else {
      riferimentoClasse = RIFERIMENTO_GENERICO_ADULTO;
      note.push('Nessuna classe di disabilità registrata: riferimento generico da adulto.');
    }

    // Correzione del riferimento per l'età (age-grading).
    const fattoreEta = this.fattoreEtaRiferimento(eta);
    const riferimentoAgeGraded = riferimentoClasse != null ? Math.round(riferimentoClasse * fattoreEta) : null;
    if (eta != null && eta < 18) {
      note.push(
        `Riferimento corretto per l'età (${eta} anni): ${fattoreEta.toFixed(2)}× — confronto equo con i coetanei, non con gli adulti.`
      );
    }

    // Indice di prestazione 0-100 (relativo a classe + età).
    let indiceGrezzo = 0;
    let indice = 0;
    if (passo100m != null && riferimentoClasse != null) {
      const rapportoGrezzo = riferimentoClasse / passo100m;
      indiceGrezzo = Math.max(0, Math.min(100, Math.round(100 * Math.pow(rapportoGrezzo, 2))));
    }
    if (passo100m != null && riferimentoAgeGraded != null) {
      const rapporto = riferimentoAgeGraded / passo100m;
      indice = Math.max(0, Math.min(100, Math.round(100 * Math.pow(rapporto, 2))));
    }

    // Fascia dall'indice age-graded.
    let fascia = this.fasciaDaIndice(indice);

    // Senza tempi: profilo prudente basato sull'età.
    if (passo100m == null) {
      fascia = this.fasciaSenzaTempi(eta);
      note.push('Nessun tempo registrato: profilo stimato dall\'età. Inserisci tempi per una valutazione precisa.');
    }

    // Tetto di fascia per età (per la PRESCRIZIONE: sedute/doppie), non per l'indice.
    if (eta != null) {
      if (eta < 12) {
        fascia = this.declassa(fascia, 2);
        note.push('Under 12: fascia di prescrizione ridotta per rispetto dello sviluppo; priorità a tecnica e multilateralità.');
      } else if (eta < 14) {
        fascia = this.declassa(fascia, 1);
        note.push('12-14 anni: introduzione graduale dei carichi; fascia ridotta di un livello.');
      } else if (eta >= 35 && eta < 50) {
        note.push('Master 35+: recuperi ampi e attenzione articolare.');
      } else if (eta >= 50) {
        fascia = this.declassa(fascia, 1);
        note.push('Master 50+: volume e intensità ridotti, priorità a tecnica e salute.');
      }
    }

    // Coerenza con la frequenza reale di allenamento.
    if (frequenza != null) {
      const seduteConsigliate = SEDUTE_PER_FASCIA[fascia];
      if (frequenza < 3 && this.rango(fascia) >= this.rango('AGONISTA')) {
        fascia = 'AVANZATO';
        note.push(
          `Frequenza reale ${frequenza.toFixed(1)} sedute/settimana: fascia limitata ad Avanzato finché il volume di allenamento non cresce.`
        );
      } else if (frequenza + 1 < seduteConsigliate) {
        note.push(
          `Frequenza reale ${frequenza.toFixed(1)} sedute/settimana inferiore alle ${seduteConsigliate} consigliate per la fascia ${FASCIA_ATLETA_LABEL[fascia]}.`
        );
      }
    }

    // Punti di forza / aree di miglioramento.
    if (passo100m != null && riferimentoClasse != null) {
      if (indice >= 82) {
        puntiForza.push('Prestazione di alto livello per classe ed età: margini su dettagli tecnici e gestione gara.');
      } else if (indice >= 55) {
        puntiForza.push('Buona base di velocità: margini su resistenza specifica e soglia.');
      } else {
        areeMiglioramento.push('Costruzione della base aerobica e della tecnica di bracciata.');
      }
    }
    if (tempiAtleta.length < 3) {
      areeMiglioramento.push('Registrare più tempi (50/100/200m) per una profilazione più affidabile.');
    }
    if (frequenza != null && frequenza < 3) {
      areeMiglioramento.push('Aumentare gradualmente la frequenza settimanale per sostenere carichi superiori.');
    }

    // ---- VOLUME A 360° ----
    const volumeDaEta = this.volumeBandaEta(eta);
    const volumeDaPrestazione = VOLUME_PER_FASCIA[this.fasciaDaIndice(indice)];
    const volumeDaStorico = this.volumeDaStorico(logSedute, atleta.id, oggi);

    // Base: banda d'età modulata dal livello (age-graded), con pavimento dallo storico.
    let base = volumeDaEta * this.modulatorePrestazione(indice);
    if (volumeDaStorico != null) base = Math.max(base, volumeDaStorico);
    base = Math.min(base, volumeDaEta * 1.2);
    const volumeBase = Math.max(300, arrotondaA50m(base));

    if (volumeDaStorico != null) {
      note.push(
        `Storico allenamenti: media recente ${volumeDaStorico}m/seduta — il volume non scende sotto il carico già sostenuto.`
      );
    }

    const sedute = SEDUTE_PER_FASCIA[fascia];
    const doppie = this.rango(fascia) >= this.rango('AGONISTA');
    const puoLunghe = indice >= 40 && !(eta != null && eta < 12);

    return {
      fascia,
      etichetta: FASCIA_ATLETA_LABEL[fascia],
      indicePrestazione: indice,
      indiceGrezzo,
      fattoreEta,
      eta,
      passo100mCentesimi: passo100m,
      riferimentoClasseCentesimi: riferimentoClasse,
      volumeBaseGiornaliero: volumeBase,
      volumeDaEta,
      volumeDaPrestazione,
      volumeDaStorico,
      basataSuStorico: volumeDaStorico != null && volumeDaStorico >= volumeDaEta * this.modulatorePrestazione(indice),
      seduteSettimanaliConsigliate: sedute,
      doppieSeduteConsigliate: doppie,
      puoSostenereDistanzeLunghe: puoLunghe,
      frequenzaSettimanale: frequenza,
      puntiForza,
      areeMiglioramento,
      note
    };
  }

  /** Stima la frequenza settimanale (sedute/settimana) dalle ultime 4 settimane di log. */
  static stimaFrequenza(logSedute: LogSeduta[], atletaId: number, oggi: string): number | null {
    const da = addDays(oggi, -28);
    const recenti = logSedute.filter(
      l => l.atletaId === atletaId && l.presente && l.data >= da && l.data <= oggi
    );
    if (recenti.length === 0) return null;
    const giorni = new Set(recenti.map(l => l.data));
    return giorni.size / 4;
  }

  /**
   * Volume medio per seduta sostenuto di recente (ultime 4 settimane), dai metri
   * effettivi registrati. Serve al sovraccarico progressivo: non si scende sotto
   * ciò che l'atleta ha già dimostrato di tollerare. Null se nessun dato.
   */
  static volumeDaStorico(logSedute: LogSeduta[], atletaId: number, oggi: string): number | null {
    const da = addDays(oggi, -28);
    const recenti = logSedute.filter(
      l => l.atletaId === atletaId && l.presente && l.metriEffettivi > 0 && l.data >= da && l.data <= oggi
    );
    if (recenti.length === 0) return null;
    const media = recenti.reduce((acc, l) => acc + l.metriEffettivi, 0) / recenti.length;
    return arrotondaA50m(media);
  }

  /** Fattore di correzione del riferimento per l'età (1.0 = adulto). */
  static fattoreEtaRiferimento(eta: number | null): number {
    if (eta == null) return 1.0;
    for (const { maxEta, fattore } of FATTORE_ETA_RIFERIMENTO) {
      if (eta <= maxEta) return fattore;
    }
    return 1.0;
  }

  /** Volume tipico per età (metri/seduta) per un atleta allenato. */
  static volumeBandaEta(eta: number | null): number {
    if (eta == null) return VOLUME_BANDA_ADULTO;
    for (const { maxEta, metri } of VOLUME_BANDA_ETA) {
      if (eta <= maxEta) return metri;
    }
    return VOLUME_BANDA_ADULTO;
  }

  /** Modulatore del volume in base all'indice di prestazione age-graded (0.65-1.15). */
  static modulatorePrestazione(indice: number): number {
    if (indice >= 92) return 1.15;
    if (indice >= 82) return 1.10;
    if (indice >= 70) return 1.05;
    if (indice >= 55) return 1.00;
    if (indice >= 40) return 0.92;
    if (indice >= 22) return 0.80;
    return 0.65;
  }

  private static fasciaDaIndice(indice: number): FasciaAtleta {
    for (const { soglia, fascia } of SOGLIE_FASCIA) {
      if (indice >= soglia) return fascia;
    }
    return 'ESORDIENTE';
  }

  private static fasciaSenzaTempi(eta: number | null): FasciaAtleta {
    if (eta == null) return 'INTERMEDIO';
    if (eta < 10) return 'ESORDIENTE';
    if (eta < 14) return 'PRINCIPIANTE';
    if (eta < 18) return 'INTERMEDIO';
    return 'INTERMEDIO';
  }

  private static rango(fascia: FasciaAtleta): number {
    return ['ESORDIENTE', 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZATO', 'AGONISTA', 'ELITE', 'TOP_MONDIALE'].indexOf(fascia);
  }

  private static declassa(fascia: FasciaAtleta, livelli: number): FasciaAtleta {
    const ordine: FasciaAtleta[] = ['ESORDIENTE', 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZATO', 'AGONISTA', 'ELITE', 'TOP_MONDIALE'];
    const idx = Math.max(0, ordine.indexOf(fascia) - livelli);
    return ordine[idx];
  }
}
