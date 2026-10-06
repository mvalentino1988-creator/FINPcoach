import {
  Atleta,
  CodiceAllenamentoKey,
  CondizioneMedica,
  DayOfWeekNum,
  FaseMesociclo,
  FlagMedici,
  LogSeduta,
  Mesociclo,
  RitmoCodice,
  SchedaSeduta,
  Stile,
  TabellaRitmiAtleta,
  Tempo,
  TempoImportato,
  TipoMicrociclo,
  TrattoSeduta
} from '../types';
import { CalcoloRitmiRipartenze } from './calcoloRitmiRipartenze';
import { CalcoloScienzaNuoto } from './calcoloCSS';
import { CalibrazioneAtleta } from './calibrazioneAtleta';
import { addDays, daysBetween, getDayOfWeek, isBefore, todayISO, yearsBetween } from './dateUtils';
import { FINPSpecialistAI } from './finpAnalisiMedica';
import { formattaTempo } from './tempoUtils';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from './parserScheda';

export function arrotondaA50m(n: number): number {
  return Math.round(n / 50) * 50;
}

interface SerieDef {
  codice: CodiceAllenamentoKey;
  sezione: string;
  lunghezza: number;
  n: number;
  descrizione: string;
  notaDefault: string;
}

interface Riferimento {
  tempo: Tempo;
  centesimi100: number;
  stimato: boolean;
  datato: boolean;
  distanzaRiferimento?: number;
}

export class GeneratoreSmartSeduta {
  private static readonly ORDINE_SERIE: CodiceAllenamentoKey[] = ['A2', 'B1', 'B2', 'C1', 'C2', 'C3'];

  private static readonly RECUPERO_FISSO: Record<CodiceAllenamentoKey, number> = {
    A1: 15,
    A2: 20,
    B1: 15,
    B2: 30,
    C1: 60,
    C2: 90,
    C3: 120,
    D: 45
  };

  static genera(
    data: string | null,
    metriTarget: number,
    fase: FaseMesociclo,
    tipoMicro: TipoMicrociclo,
    atleta?: Atleta | null,
    condizioniMediche: CondizioneMedica[] = [],
    tempi: Tempo[] = [],
    logSedute: LogSeduta[] = [],
    mesocicloCorrente?: Mesociclo | null,
    giorniAllenamento: DayOfWeekNum[] = []
  ): SchedaSeduta {
    const oggi = data ?? todayISO();
    const eta = atleta?.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
    let categoria: string | null = null;
    if (eta != null) {
      if (eta < 12) categoria = 'Esordienti (< 12 anni)';
      else if (eta >= 12 && eta <= 14) categoria = 'Ragazzi Giovanissimi (12-14 anni)';
      else if (eta >= 15 && eta <= 17) categoria = 'Juniores (15-17 anni)';
      else if (eta >= 18 && eta <= 34) categoria = 'Assoluti / Cadetti (18-34 anni)';
      else categoria = 'Master / Senior (35+ anni)';
    }

    const adattamentiEta: string[] = [];
    const avvertenze: string[] = [];
    const note: string[] = [];

    // Adaptive Continuity: Adatta il volume target sulla base degli ultimi allenamenti manuali inseriti dall'allenatore
    try {
      const customWorkouts = FINPStorage.getCustomWorkouts();
      if (customWorkouts && customWorkouts.length > 0) {
        const ultimi = customWorkouts.slice(0, 5);
        const sommaMetri = ultimi.reduce((acc, w) => acc + ParserScheda.calcolaMetriDaTesto(w.testo), 0);
        const mediaManuale = Math.round(sommaMetri / ultimi.length);
        if (mediaManuale > 500) {
          metriTarget = Math.round((metriTarget * 0.3) + (mediaManuale * 0.7));
        }
      }
    } catch (e) {
      // Fallback
    }

    // 1. Quote base per codice
    const quote: Record<CodiceAllenamentoKey, number> = {
      A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, C3: 0, D: 0,
      ...this.calcolaQuoteBase(fase, tipoMicro)
    };

    function sposta(da: CodiceAllenamentoKey, a: CodiceAllenamentoKey, frazione: number) {
      const q = quote[da] ?? 0;
      const m = q * frazione;
      quote[da] = q - m;
      quote[a] = (quote[a] ?? 0) + m;
    }

    // 2. Tipo di seduta nella settimana (qualità / mista / aerobica)
    let tipoSeduta = '';
    if (tipoMicro === 'CARICO' && data != null && giorniAllenamento.length >= 2) {
      const dow = getDayOfWeek(data);
      if (giorniAllenamento.includes(dow)) {
        const ordinati = [...giorniAllenamento].sort((a, b) => a - b);
        const idx = ordinati.indexOf(dow);
        if (idx === 0) {
          sposta('A2', 'B1', 0.35);
          tipoSeduta = 'Seduta di qualità';
        } else if (idx === ordinati.length - 1) {
          (['B2', 'C1', 'C2'] as CodiceAllenamentoKey[]).forEach(c => sposta(c, 'A2', 0.4));
          tipoSeduta = 'Seduta aerobica';
        } else {
          tipoSeduta = 'Seduta mista';
        }
      }
    }

    // 3. Età
    if (eta != null) {
      if (eta < 12) {
        (['C1', 'C2'] as CodiceAllenamentoKey[]).forEach(c => {
          sposta(c, 'A1', 0.6);
          sposta(c, 'D', 1.0);
        });
        adattamentiEta.push(
          'Atleta under 12: escluse serie ad alto accumulo lattacido (C1/C2). Enfasi su tecnica (A1) e reattività/giochi veloci (D).'
        );
      } else if (eta >= 35) {
        (['C1', 'C2'] as CodiceAllenamentoKey[]).forEach(c => sposta(c, 'A1', 0.5));
        adattamentiEta.push(
          'Atleta master (35+): più riscaldamento/scioglimento A1 e recuperi ampi per la protezione articolare.'
        );
      } else if (eta >= 12 && eta <= 14) {
        sposta('C2', 'B1', 0.5);
        adattamentiEta.push(
          'Categoria 12-14 anni: introduzione graduale della potenza lattacida, priorità allo sviluppo della soglia (B1).'
        );
      }
    }

    // 4. Condizioni mediche (segnali dall'analisi FINP)
    const attive = condizioniMediche.filter(c => c.attiva);
    const nomi = (filtro: (flag: FlagMedici) => boolean) =>
      attive
        .filter(c => filtro(FINPSpecialistAI.flagMedici(`${c.descrizione} ${c.limitazioni}`)))
        .map(c => c.descrizione)
        .join(', ');

    const flag = FINPSpecialistAI.flagMedici(
      attive.map(c => `${c.descrizione} ${c.limitazioni}`).join(' | ')
    );

    if (flag.spalla) {
      sposta('B2', 'A1', 0.4);
      avvertenze.push(
        `⚠️ Spalla/articolazioni (${nomi(f => f.spalla)}): ridotte le serie B2, evitare palette rigide, più esercizi di sensibilità e gambe.`
      );
    }
    if (flag.neurologica) {
      (['C1', 'C2'] as CodiceAllenamentoKey[]).forEach(c => {
        sposta(c, 'A2', 0.7);
        sposta(c, 'A1', 1.0);
      });
      avvertenze.push(
        `⚠️ Condizione neurologica/funzionale (${nomi(f => f.neurologica)}): azzerate le serie C1/C2 per prevenire spasticità e fatica centrale; recuperi ampi.`
      );
    }
    if (flag.cardiorespiratoria) {
      sposta('C2', 'A2', 1.0);
      sposta('C1', 'A2', 0.5);
      sposta('B2', 'A2', 0.7);
      avvertenze.push(
        `⚠️ Cardiovascolare/respiratoria (${nomi(f => f.cardiorespiratoria)}): evitare apnee prolungate e picchi massimali, ritmo costante A2/B1.`
      );
    }
    if (flag.visiva) {
      avvertenze.push(
        `👁️ Disabilità visiva (${nomi(f => f.visiva)}): tapper per arrivi e virate nelle serie veloci, conteggio costante delle bracciate.`
      );
    }
    if (flag.epilessia) {
      avvertenze.push(
        `⚠️ Epilessia (${nomi(f => f.epilessia)}): sorveglianza continua a bordo vasca, mai in acqua da soli, evitare iperventilazione e apnee.`
      );
    }
    if (flag.termoregolazione) {
      avvertenze.push(
        `🌡️ Termoregolazione alterata (${nomi(f => f.termoregolazione)}): controllare la temperatura dell'acqua e prevedere pause di recupero.`
      );
    }

    attive
      .filter(c => !FINPSpecialistAI.flagMedici(`${c.descrizione} ${c.limitazioni}`).coperta)
      .forEach(c => {
        avvertenze.push(
          `ℹ️ Adattamento personalizzato (${c.descrizione}): ${c.limitazioni.trim() || 'monitorare recupero e resistenza.'}`
        );
      });

    // 5. Calibrazione automatica atleta-specifica
    let fattoreCalibrazione = 1.0;
    let limitaDistanzeLunghe = false;
    let volumeBaseCalibrazione: number | null = null;
    if (atleta != null) {
      const calibrazione = CalibrazioneAtleta.calibra(atleta, tempi, condizioniMediche, logSedute);
      fattoreCalibrazione = calibrazione.fattoreCorrezione;
      limitaDistanzeLunghe = !calibrazione.puoSostenereDistanzeLunghe;
      volumeBaseCalibrazione = calibrazione.volumeBaseGiornaliero;
      note.push(...calibrazione.note);
    }

    // 6. Volume, corretto sul carico recente dell'atleta (ACWR) e calibrazione
    let volume = Math.max(400, arrotondaA50m(metriTarget));
    
    // Se abbiamo un volume base dalla calibrazione, usalo come riferimento
    if (volumeBaseCalibrazione && atleta != null) {
      volume = Math.max(400, arrotondaA50m(volumeBaseCalibrazione));
      note.push(`Volume base calibrato sul livello: ${volumeBaseCalibrazione}m`);
    }
    
    const [fattoreCarico, notaCarico] = this.fattoreDaCarico(logSedute, oggi);
    
    // Applica fattori: prima ACWR, poi calibrazione atleta
    volume = Math.max(400, arrotondaA50m(Math.round(volume * fattoreCarico * fattoreCalibrazione)));
    
    if (notaCarico) note.push(notaCarico);

    // 6. Tempi di riferimento -> tabella ritmi
    const rif = this.scegliRiferimento(tempi, oggi);
    const tabella = rif
      ? CalcoloRitmiRipartenze.calcolaTabellaRitmi(
          atleta?.id ?? 0,
          rif.centesimi100,
          rif.tempo.stile,
          25
        )
      : null;

    if (rif != null) {
      const t = rif.tempo;
      let msg = `Ritmi calibrati su ${formattaTempo(t.centesimi)} nei ${t.distanzaMetri}m ${this.nomeStile(t.stile)}`;
      if (rif.stimato) {
        msg += ` → stimato ${formattaTempo(rif.centesimi100)} sui 100m`;
        if (rif.distanzaRiferimento && rif.distanzaRiferimento < 100) {
          msg += ` (conversione conservativa da distanza corta)`;
        }
      }
      if (t.vascaMetri === 50) msg += ', corretto per vasca 25m';
      note.push(msg);
      if (rif.datato) note.push('⚠️ Tempo di riferimento datato (>8 mesi): fai un test per aggiornare i ritmi.');
      if (rif.distanzaRiferimento && rif.distanzaRiferimento < 100) {
        note.push('ℹ️ Usato tempo su distanza corta: per maggiore precisione inserisci anche un 100m.');
      }
    } else if (atleta != null) {
      note.push('⚠️ Nessun tempo di riferimento: ripartenze a recupero fisso. Inserisci almeno un 50m o 100m di gara/test per calcolarle.');
    } else {
      note.push('Scheda di squadra: ripartenze a recupero fisso. Seleziona un atleta per ritmi personalizzati.');
    }

    // 7. Metri per codice e costruzione della seduta
    const keysAll: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];
    const somma = Math.max(0.01, keysAll.reduce((acc, k) => acc + (quote[k] ?? 0), 0));
    const metriCodice: Partial<Record<CodiceAllenamentoKey, number>> = {};
    for (const k of keysAll) {
      const q = quote[k] ?? 0;
      const m = arrotondaA50m(Math.round((q / somma) * volume));
      if (m > 0) metriCodice[k] = m;
    }

    const tratti = this.costruisciTratti(volume, metriCodice, fase, tabella, limitaDistanzeLunghe);

    const nomeAtleta = atleta ? `${atleta.cognome} ${atleta.nome}` : null;
    const titoloBase = nomeAtleta ? `Scheda Personalizzata · ${nomeAtleta}` : 'Scheda di Squadra';

    const ripartizioneCodici: Partial<Record<CodiceAllenamentoKey, number>> = {};
    for (const t of tratti) {
      ripartizioneCodici[t.codice] = (ripartizioneCodici[t.codice] ?? 0) + t.metri;
    }

    return {
      titolo: tipoSeduta.length > 0 ? `${titoloBase} · ${tipoSeduta}` : titoloBase,
      data,
      nomeAtleta,
      etaAtleta: eta,
      categoriaEta: categoria,
      faseStagione: fase,
      tipoMicrociclo: tipoMicro,
      volumeTotaleMetri: tratti.reduce((acc, t) => acc + t.metri, 0),
      ripartizioneCodici,
      tratti,
      adattamentiEta,
      avvertenzeMediche: avvertenze,
      tempiUtilizzati: rif ? [rif.tempo] : [],
      noteCalibrazione: note,
      tipoSeduta
    };
  }

  private static nomeStile(s: Stile): string {
    return s.replace('_', ' ').toLowerCase();
  }

  private static scegliRiferimento(tempi: Tempo[], oggi: string): Riferimento | null {
    // Accetta anche distanze corte (50m, 100m) - importante per atleti che non possono fare 400m
    const candidati = tempi.filter(t => t.stile !== 'MISTI' && t.distanzaMetri >= 50 && t.distanzaMetri <= 400);
    if (candidati.length === 0) return null;

    const nonAllenamento = candidati.filter(t => t.contesto !== 'ALLENAMENTO');
    const base = nonAllenamento.length > 0 ? nonAllenamento : candidati;

    const limite240d = addDays(oggi, -240);
    const recenti = base.filter(t => isBefore(limite240d, t.data));
    const pool = recenti.length > 0 ? recenti : base;

    let stile: Stile = 'STILE_LIBERO';
    if (!pool.some(t => t.stile === 'STILE_LIBERO')) {
      const counts: Record<string, number> = {};
      for (const t of pool) {
        counts[t.stile] = (counts[t.stile] ?? 0) + 1;
      }
      let maxCount = -1;
      for (const [st, c] of Object.entries(counts)) {
        if (c > maxCount) {
          maxCount = c;
          stile = st as Stile;
        }
      }
    }

    const delloStile = pool.filter(t => t.stile === stile);

    // Conversione a 100m con esponenti più conservativi per distanze corte
    // Per paralimpici, la decelerazione con la distanza può essere più marcata
    const a100 = (t: Tempo): number => {
      let esponente: number;
      if (t.distanzaMetri <= 50) {
        esponente = 1.15; // 50m → 100m: +15% conservativo
      } else if (t.distanzaMetri <= 100) {
        esponente = 1.08; // 100m → 100m: +8%
      } else if (t.distanzaMetri <= 200) {
        esponente = 1.06; // 200m → 100m: +6%
      } else {
        esponente = 1.04; // 400m → 100m: +4%
      }
      const vasca = t.vascaMetri === 50 ? 0.97 : 1.0;
      return Math.round(t.centesimi * vasca * Math.pow(100.0 / t.distanzaMetri, esponente));
    };

    // Priorità: 100m > 200m > 50m > 400m (per atleti che non possono fare 400m)
    const esatti = delloStile.filter(t => t.distanzaMetri === 100);
    let migliore: Tempo;
    if (esatti.length > 0) {
      migliore = esatti.reduce((min, t) => a100(t) < a100(min) ? t : min);
    } else {
      const corti = delloStile.filter(t => t.distanzaMetri <= 100);
      if (corti.length > 0) {
        migliore = corti.reduce((min, t) => a100(t) < a100(min) ? t : min);
      } else {
        migliore = delloStile.reduce((min, t) => a100(t) < a100(min) ? t : min);
      }
    }

    return {
      tempo: migliore,
      centesimi100: a100(migliore),
      stimato: migliore.distanzaMetri !== 100,
      datato: recenti.length === 0,
      distanzaRiferimento: migliore.distanzaMetri
    };
  }

  private static fattoreDaCarico(log: LogSeduta[], oggi: string): [number, string | null] {
    const carico = (da: string, a: string): number => {
      return log
        .filter(l => l.presente && l.rpe != null && !isBefore(l.data, da) && isBefore(l.data, a))
        .reduce((sum, l) => sum + (l.rpe ?? 0) * l.durataMin, 0);
    };

    const acuto = carico(addDays(oggi, -7), oggi);
    const cronici = [1, 2, 3, 4]
      .map(w => carico(addDays(oggi, -7 * (w + 1)), addDays(oggi, -7 * w)))
      .filter(c => c > 0);

    if (acuto === 0 || cronici.length < 2) return [1.0, null];

    const r = CalcoloScienzaNuoto.calcolaACWR(acuto, cronici).acwrRapporto;
    const rs = r.toFixed(2);
    if (r > 1.45) {
      return [0.80, `Carico recente molto alto (ACWR ${rs}): volume ridotto del 20% per proteggere spalle e recupero.`];
    }
    if (r > 1.25) {
      return [0.90, `Carico recente alto (ACWR ${rs}): volume ridotto del 10%.`];
    }
    return [1.0, null];
  }

  private static calcolaQuoteBase(
    fase: FaseMesociclo,
    tipo: TipoMicrociclo
  ): Partial<Record<CodiceAllenamentoKey, number>> {
    switch (tipo) {
      case 'ADATTAMENTO':
      case 'RECUPERO':
        return { A1: 0.50, A2: 0.40, D: 0.10 };
      case 'SCARICO':
        return { A1: 0.45, A2: 0.25, B2: 0.15, D: 0.15 };
      case 'GARA':
        return { A1: 0.45, C3: 0.30, D: 0.25 };
      case 'PAUSA':
        return { A1: 1.0 };
      case 'CARICO':
        switch (fase) {
          case 'PREPARAZIONE_GENERALE':
            return { A1: 0.30, A2: 0.45, B1: 0.20, D: 0.05 };
          case 'PREPARAZIONE_SPECIFICA':
            return { A1: 0.25, A2: 0.30, B1: 0.20, B2: 0.15, D: 0.10 };
          case 'PRE_GARA':
            return { A1: 0.30, A2: 0.20, B2: 0.20, C1: 0.15, D: 0.15 };
          case 'COMPETITIVA':
            return { A1: 0.35, A2: 0.15, C2: 0.20, C3: 0.15, D: 0.15 };
        }
    }
  }

  private static maxRipetizioni(c: CodiceAllenamentoKey): number {
    switch (c) {
      case 'A2': return 8;
      case 'B1': return 12;
      case 'B2': return 10;
      case 'C3': return 6;
      default: return 8;
    }
  }

  private static sezioneSerie(c: CodiceAllenamentoKey): string {
    switch (c) {
      case 'A2': return 'Serie Principale - Fondo e Capacità';
      case 'B1': return 'Serie Principale - Soglia Anaerobica';
      case 'B2': return 'Serie Principale - VO2 Max';
      case 'C1': return 'Serie Principale - Tolleranza Lattacida';
      case 'C2': return 'Serie Principale - Potenza Lattacida';
      case 'C3': return 'Serie Principale - Ritmo Gara';
      default: return 'Serie';
    }
  }

  private static descrizioneSerie(c: CodiceAllenamentoKey, lunghezza: number): string {
    switch (c) {
      case 'A2': return 'Stile principale o misti a ritmo costante, palette corte e boccaglio per la continuità del gesto.';
      case 'B1': return 'Passo soglia regolare e controllato (FC ~165 bpm), numero di bracciate costante.';
      case 'B2': return 'Intervalli ad alta intensità (FC 175+ bpm): massimo sforzo aerobico senza perdere tecnica.';
      case 'C1':
        return lunghezza >= 100
          ? 'Prima metà alla massima velocità sostenibile, seconda metà in tenuta ad alta frequenza.'
          : 'Velocità elevata sostenuta con tenuta tecnica.';
      case 'C2': return 'Sforzo massimale con recupero ampio: la qualità viene prima della quantità.';
      case 'C3': return 'Passo gara obiettivo con precisione cronometrica al decimo di secondo.';
      default: return 'Velocità: 15m massimi (partenza o virata esplosiva) + 35m di scioglimento A1.';
    }
  }

  private static notaDefault(c: CodiceAllenamentoKey): string {
    switch (c) {
      case 'A2': return 'Respirazione regolare e controllo costante dell\'andatura.';
      case 'B1': return 'Lavoro fondamentale per innalzare la soglia anaerobica.';
      case 'B2': return 'Mantenere costante il numero di bracciate per vasca.';
      case 'C1': return 'Resistere all\'acidosi mantenendo assetto e idrodinamicità.';
      case 'C2': return 'Se il passo cala o il gesto si rompe, fermarsi.';
      case 'C3': return 'Massima concentrazione sul ritmo di bracciata della gara prioritaria.';
      default: return 'Focus sulla reattività dei primi metri e sulla frequenza di bracciata.';
    }
  }

  private static ripartenzaPer(ritmo: RitmoCodice, lunghezza: number): [string, string] {
    const passoRepCentesimi = Math.round(ritmo.passo100mCentesimi * lunghezza / 100.0);
    const rip = Math.round(((passoRepCentesimi / 100.0) + ritmo.pausaSecondi) / 5.0) * 5;
    const min = Math.floor(rip / 60);
    const sec = rip % 60;
    const secStr = sec < 10 ? `0${sec}` : `${sec}`;
    const testo = min > 0 ? `a ${min}'${secStr}"` : `a ${sec}"`;
    return [testo, formattaTempo(passoRepCentesimi)];
  }

  private static costruisciTratti(
    volume: number,
    metriCodice: Partial<Record<CodiceAllenamentoKey, number>>,
    fase: FaseMesociclo,
    tabella: TabellaRitmiAtleta | null,
    limitaDistanzeLunghe: boolean = false
  ): TrattoSeduta[] {
    const serie: SerieDef[] = [];

    const mD = metriCodice.D ?? 0;
    if (mD >= 50) {
      const n = Math.max(2, Math.min(8, Math.floor(mD / 50)));
      serie.push({
        codice: 'D',
        sezione: 'Attivazione e Velocità',
        lunghezza: 50,
        n,
        descrizione: this.descrizioneSerie('D', 50),
        notaDefault: this.notaDefault('D')
      });
    }

    for (const c of this.ORDINE_SERIE) {
      const m = metriCodice[c];
      if (!m || m < 50) continue;
      
      let len = 100;
      if (c === 'A2') len = m >= 1200 ? 400 : 200;
      else if (c === 'B1') len = m >= 1000 ? 200 : 100;
      else if (c === 'C2') len = 50;
      else if (c === 'C3') len = (fase === 'COMPETITIVA' || fase === 'PRE_GARA') && m >= 400 ? 100 : 50;

      // Se l'atleta non può sostenere distanze lunghe, limita a 100m
      if (limitaDistanzeLunghe && len > 100) {
        len = 100;
        // Per C1/C2, se limita distanze lunghe, riduce anche il volume
        if (c === 'C1' || c === 'C2') {
          const riduzione = 0.6;
          metriCodice[c] = Math.round((metriCodice[c] ?? 0) * riduzione);
        }
      }

      while (len > m && len > 50) len = Math.floor(len / 2);
      const n = Math.max(1, Math.min(this.maxRipetizioni(c), Math.floor(m / len)));
      serie.push({
        codice: c,
        sezione: this.sezioneSerie(c),
        lunghezza: len,
        n,
        descrizione: this.descrizioneSerie(c, len),
        notaDefault: this.notaDefault(c)
      });
    }

    const metriSerie = () => serie.reduce((sum, s) => sum + s.n * s.lunghezza, 0);
    while (volume - metriSerie() < 300) {
      const s = serie.filter(x => x.n > 1).reduce<SerieDef | null>((max, curr) => {
        if (!max) return curr;
        return (curr.n * curr.lunghezza > max.n * max.lunghezza) ? curr : max;
      }, null);
      if (!s) break;
      s.n -= 1;
    }

    const a1 = Math.max(300, volume - metriSerie());
    const riscaldamento = Math.max(150, Math.min(a1 - 100, arrotondaA50m(Math.round(a1 * 0.65))));
    const defaticamento = a1 - riscaldamento;

    const ritmoA1 = tabella?.ritmi?.A1;
    const tratti: TrattoSeduta[] = [];

    tratti.push({
      sezione: 'Riscaldamento',
      codice: 'A1',
      metri: riscaldamento,
      ripetizioni: `1 x ${riscaldamento} m`,
      descrizione: 'Stile libero e dorso a scelta, con esercizi di sensibilità (bracciata singola, cagnolino) e scivolamento.',
      ripartenza: 'Pausa libera',
      notaSpecifica: ritmoA1
        ? `Passo target: ${ritmoA1.passo100mFormatted} per 100m · ${ritmoA1.noteTecniche}`
        : 'Ritmo sciolto e respirazione bilanciata.'
    });

    for (const s of serie) {
      const ritmo = tabella?.ritmi?.[s.codice];
      let ripartenza: string;
      let nota: string;
      if (ritmo != null) {
        const [r, passoRep] = this.ripartenzaPer(ritmo, s.lunghezza);
        ripartenza = r;
        nota = `Passo target: ${passoRep} su ${s.lunghezza}m · ${ritmo.noteTecniche}`;
      } else {
        ripartenza = `recupero ${this.RECUPERO_FISSO[s.codice] ?? 30}"`;
        nota = s.notaDefault;
      }

      tratti.push({
        sezione: s.sezione,
        codice: s.codice,
        metri: s.n * s.lunghezza,
        ripetizioni: `${s.n} x ${s.lunghezza}m`,
        descrizione: s.descrizione,
        ripartenza,
        notaSpecifica: nota
      });
    }

    tratti.push({
      sezione: 'Defaticamento',
      codice: 'A1',
      metri: defaticamento,
      ripetizioni: `1 x ${defaticamento} m`,
      descrizione: 'Nuoto rilassato a dorso e stile libero con respirazione 3/5 per smaltire e ripristinare.',
      ripartenza: 'Scioglimento libero',
      notaSpecifica: 'Decompressione muscolare e allungamento in acqua.'
    });

    return tratti;
  }
}
