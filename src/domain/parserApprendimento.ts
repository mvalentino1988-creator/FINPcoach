/**
 * Sistema di apprendimento per il parser delle schede.
 *
 * Le regole sono TIPIZZATE e vengono davvero applicate da `ParserScheda`:
 * ogni regola sa dire quante ripetizioni e quanti metri intendere per
 * una riga che non rientra nei pattern standard (NxM, numero semplice).
 *
 * Flusso:
 *   1. il coach scrive/OCR una scheda
 *   2. `ParserScheda.parseSerie` prova i pattern standard, poi le regole apprese
 *   3. le righe non comprese vengono mostrate in `RevisioneSchedaModal`
 *   4. il coach corregge -> `aggiungiRegola` crea una regola tipizzata
 *   5. da quel momento la riga viene interpretata correttamente e in automatico
 */

export type TipoRegola = 'NXM' | 'UNITA' | 'SOLO';

export interface RegolaBase {
  /** Espressione regolare con gruppi di cattura (opzionali). */
  pattern: string;
  /** Descrizione leggibile mostrata al coach. */
  descrizione: string;
  creatoIl: string;
  /** Quante volte la regola ha risolto una riga. */
  usi: number;
  origine: 'manuale' | 'apprendimento';
}

/** "8x50" -> 8 ripetizioni da 50m */
export interface RegolaNXM extends RegolaBase {
  tipo: 'NXM';
  distanza: number;
  ripetizioni: number;
  gruppoRipetizioni?: number;
  gruppoDistanza?: number;
}

/** "400m" / "1.5km" -> distanza con unita' */
export interface RegolaUnita extends RegolaBase {
  tipo: 'UNITA';
  distanza: number;
  unita: string;
  fattoreUnita: number;
  gruppoDistanza?: number;
}

/** "400" -> 400 metri */
export interface RegolaSolo extends RegolaBase {
  tipo: 'SOLO';
  distanza: number;
  gruppoDistanza?: number;
}

export type RegolaParser = RegolaNXM | RegolaUnita | RegolaSolo;

export interface Interpretazione {
  compreso: boolean;
  ripetizioni: number;
  distanza: number;
  metriTotali: number;
  regola?: RegolaParser;
}

export interface RisultatoAnalisi {
  compreso: number;
  nonCompreso: string[];
  interpretazioni: Interpretazione[];
}

export interface NuovaRegola {
  pattern: string;
  tipo: TipoRegola;
  descrizione: string;
  distanza?: number;
  ripetizioni?: number;
  unita?: string;
  fattoreUnita?: number;
  gruppoRipetizioni?: number;
  gruppoDistanza?: number;
  origine?: 'manuale' | 'apprendimento';
}

const STORAGE_KEY = 'finpcoach_parser_regole';

const FATTORI_UNITA: Record<string, number> = {
  m: 1,
  mt: 1,
  metro: 1,
  metri: 1,
  km: 1000,
  chilometro: 1000,
  chilometri: 1000,
};

export function fattoreUnitaDaNome(unita: string): number {
  const k = (unita || 'm').toLowerCase().trim().replace(/\.$/, '');
  return FATTORI_UNITA[k] ?? 1;
}

export function escapeRegExp(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ParserApprendimento {
  private static regole: RegolaParser[] = [];
  private static caricato = false;

  /** Carica le regole da localStorage, migrando il formato legacy. */
  static caricaRegole(forza = false): RegolaParser[] {
    if (this.caricato && !forza) return this.regole;
    this.caricato = true;
    try {
      const salvate = localStorage.getItem(STORAGE_KEY);
      if (salvate) {
        const grezze = JSON.parse(salvate);
        if (Array.isArray(grezze)) {
          this.regole = grezze.map((r) => this.migraRegola(r));
        }
      }
    } catch {
      // storage non disponibile (SSR/test): le regole restano in memoria
    }
    return this.regole;
  }

  static salvaRegole(): void {
    this.caricato = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.regole));
    } catch {
      /* storage non disponibile: le regole restano solo in memoria */
    }
  }

  /** Migra una regola salvata in un formato precedente. */
  private static migraRegola(grezza: any): RegolaParser {
    const base: RegolaBase = {
      pattern: String(grezza?.pattern ?? ''),
      descrizione: String(grezza?.descrizione ?? ''),
      creatoIl: String(grezza?.creatoIl ?? new Date().toISOString()),
      usi: Number(grezza?.usi ?? 0),
      origine: grezza?.origine === 'manuale' ? 'manuale' : 'apprendimento',
    };
    const distanza = Number(grezza?.distanza ?? 0);
    const tipo = (grezza?.tipo ?? 'SOLO') as TipoRegola;

    if (tipo === 'NXM') {
      return {
        ...base,
        tipo: 'NXM',
        distanza: distanza || 50,
        ripetizioni: Number(grezza?.ripetizioni ?? 1),
        gruppoRipetizioni: grezza?.gruppoRipetizioni,
        gruppoDistanza: grezza?.gruppoDistanza,
      };
    }
    if (tipo === 'UNITA') {
      const unita = String(grezza?.unita ?? 'm');
      return {
        ...base,
        tipo: 'UNITA',
        distanza: distanza || 100,
        unita,
        fattoreUnita: Number(grezza?.fattoreUnita ?? fattoreUnitaDaNome(unita)),
        gruppoDistanza: grezza?.gruppoDistanza,
      };
    }
    return {
      ...base,
      tipo: 'SOLO',
      distanza: distanza || 100,
      gruppoDistanza: grezza?.gruppoDistanza,
    };
  }

  static getRegole(): RegolaParser[] {
    if (!this.caricato) {
      this.caricaRegole();
    }
    return [...this.regole];
  }

  /** Regole ordinate per uso (le piu' efficaci per prime). */
  static getRegolePopolari(): RegolaParser[] {
    return this.getRegole().sort((a, b) => b.usi - a.usi);
  }

  /**
   * Aggiunge una regola tipizzata. Se esiste gia' una regola con lo stesso
   * pattern, quella viene aggiornata (niente duplicati).
   */
  static aggiungiRegola(nuova: NuovaRegola): RegolaParser {
    const regole = this.getRegole();
    const base: RegolaBase = {
      pattern: nuova.pattern,
      descrizione: nuova.descrizione,
      creatoIl: new Date().toISOString(),
      usi: 0,
      origine: nuova.origine ?? 'apprendimento',
    };

    let regola: RegolaParser;
    if (nuova.tipo === 'NXM') {
      regola = {
        ...base,
        tipo: 'NXM',
        distanza: Number(nuova.distanza ?? 50),
        ripetizioni: Number(nuova.ripetizioni ?? 1),
        gruppoRipetizioni: nuova.gruppoRipetizioni,
        gruppoDistanza: nuova.gruppoDistanza,
      };
    } else if (nuova.tipo === 'UNITA') {
      const unita = nuova.unita ?? 'm';
      regola = {
        ...base,
        tipo: 'UNITA',
        distanza: Number(nuova.distanza ?? 100),
        unita,
        fattoreUnita: Number(nuova.fattoreUnita ?? fattoreUnitaDaNome(unita)),
        gruppoDistanza: nuova.gruppoDistanza,
      };
    } else {
      regola = {
        ...base,
        tipo: 'SOLO',
        distanza: Number(nuova.distanza ?? 100),
        gruppoDistanza: nuova.gruppoDistanza,
      };
    }

    const idx = regole.findIndex((r) => r.pattern === regola.pattern);
    if (idx >= 0) {
      regola = { ...regole[idx], ...regola, creatoIl: regole[idx].creatoIl, usi: regole[idx].usi };
      regole[idx] = regola;
    } else {
      regole.push(regola);
    }

    this.regole = regole;
    this.salvaRegole();
    return regola;
  }

  static rimuoviRegola(pattern: string): void {
    const regole = this.getRegole().filter((r) => r.pattern !== pattern);
    this.regole = regole;
    this.salvaRegole();
  }

  static svuotaRegole(): void {
    this.regole = [];
    this.caricato = true;
    this.salvaRegole();
  }

  /** Incrementa l'uso di una regola identificata dal pattern. */
  static incrementaUsoRegola(pattern: string): void {
    const regole = this.getRegole();
    const r = regole.find((x) => x.pattern === pattern);
    if (r) {
      r.usi++;
      this.regole = regole;
      this.salvaRegole();
    }
  }

  /** Retrocompatibilita': incremento per indice nell'array corrente. */
  static incrementaUso(index: number): void {
    const regole = this.getRegole();
    if (regole[index]) {
      regole[index].usi++;
      this.regole = regole;
      this.salvaRegole();
    }
  }

  /**
   * Applica le regole apprese a una singola riga.
   * Ritorna null se nessuna regola la riconosce.
   */
  static applicaRegole(riga: string): Interpretazione | null {
    const testo = riga.trim();
    if (!testo) return null;

    for (const regola of this.getRegolePopolari()) {
      let m: RegExpMatchArray | null = null;
      try {
        m = testo.match(new RegExp(regola.pattern, 'i'));
      } catch {
        continue;
      }
      if (!m) continue;

      if (regola.tipo === 'NXM') {
        const rip = regola.gruppoRipetizioni ? parseInt(m[regola.gruppoRipetizioni] ?? '', 10) : regola.ripetizioni;
        const dist = regola.gruppoDistanza ? parseInt(m[regola.gruppoDistanza] ?? '', 10) : regola.distanza;
        if (!Number.isFinite(rip) || !Number.isFinite(dist) || rip <= 0 || dist <= 0) continue;
        this.incrementaUsoRegola(regola.pattern);
        return {
          compreso: true,
          ripetizioni: rip,
          distanza: dist,
          metriTotali: rip * dist,
          regola,
        };
      }

      if (regola.tipo === 'UNITA') {
        const dist = regola.gruppoDistanza ? parseInt(m[regola.gruppoDistanza] ?? '', 10) : regola.distanza;
        if (!Number.isFinite(dist) || dist <= 0) continue;
        this.incrementaUsoRegola(regola.pattern);
        return {
          compreso: true,
          ripetizioni: 1,
          distanza: dist,
          metriTotali: Math.round(dist * regola.fattoreUnita),
          regola,
        };
      }

      const dist = regola.gruppoDistanza ? parseInt(m[regola.gruppoDistanza] ?? '', 10) : regola.distanza;
      if (!Number.isFinite(dist) || dist <= 0) continue;
      this.incrementaUsoRegola(regola.pattern);
      return {
        compreso: true,
        ripetizioni: 1,
        distanza: dist,
        metriTotali: dist,
        regola,
      };
    }

    return null;
  }

  /**
   * Analizza un testo scheda: quante righe sono comprese e quali no.
   */
  static parseConRegole(testo: string): RisultatoAnalisi {
    const righe = (testo || '').split('\n');
    const nonCompreso: string[] = [];
    const interpretazioni: Interpretazione[] = [];
    let compreso = 0;

    for (const riga of righe) {
      const trimRiga = riga.trim();
      if (!trimRiga) {
        compreso++;
        interpretazioni.push({ compreso: true, ripetizioni: 0, distanza: 0, metriTotali: 0 });
        continue;
      }

      const { contenuto } = this.estraiEtichetta(trimRiga);
      const standard = ParserApprendimento.analizzaStandard(contenuto);
      if (standard) {
        compreso++;
        interpretazioni.push(standard);
        continue;
      }

      // Le regole apprese sono cercate sulla riga completa e poi sul contenuto
      const regola = this.applicaRegole(trimRiga) ?? this.applicaRegole(contenuto);
      if (regola) {
        compreso++;
        interpretazioni.push(regola);
        continue;
      }

      nonCompreso.push(trimRiga);
      interpretazioni.push({ compreso: false, ripetizioni: 0, distanza: 0, metriTotali: 0 });
    }

    return { compreso, nonCompreso, interpretazioni };
  }

  /**
   * Pattern standard riconosciuti senza apprendimento:
   * NxM, numero+unita', numero semplice, composizioni con "+".
   */
  static analizzaStandard(riga: string): Interpretazione | null {
    const testo = riga.trim();
    if (!testo) return null;

    // "(3x100 + 2x50) X2"
    const composito = testo.match(/\(([^)]+)\)\s*[xX]\s*(\d+)/);
    if (composito) {
      const inner = composito[1];
      const outer = parseInt(composito[2], 10);
      let innerMetri = 0;
      for (const parte of inner.split('+')) {
        const sub = ParserApprendimento.analizzaStandard(parte.trim());
        if (sub) innerMetri += sub.metriTotali;
      }
      if (innerMetri > 0 && outer > 0) {
        return {
          compreso: true,
          ripetizioni: outer,
          distanza: Math.round(innerMetri / outer),
          metriTotali: innerMetri * outer,
        };
      }
    }

    // "3x100 b1 + 2x50 forte" -> somma delle parti
    if (testo.includes('+')) {
      const parti = testo.split('+').map((p) => p.trim()).filter(Boolean);
      if (parti.length > 1) {
        let totale = 0;
        let ripetizioni = 0;
        let distanza = 0;
        for (const parte of parti) {
          const sub = ParserApprendimento.analizzaStandard(parte);
          if (!sub) return null; // una parte non compresa -> riga intera non compresa
          totale += sub.metriTotali;
          ripetizioni += sub.ripetizioni;
          distanza = Math.max(distanza, sub.distanza);
        }
        return { compreso: true, ripetizioni, distanza, metriTotali: totale };
      }
    }

    // "8x50"
    const nxm = testo.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (nxm) {
      const rip = parseInt(nxm[1], 10);
      const dist = parseInt(nxm[2], 10);
      if (rip > 0 && dist > 0) {
        return { compreso: true, ripetizioni: rip, distanza: dist, metriTotali: rip * dist };
      }
    }

    // "400m", "1.5km", "400 m"
    const conUnita = testo.match(/(\d+(?:[.,]\d+)?)\s*(km|m\b|mt\b|meters?|metri\b)/i);
    if (conUnita) {
      const valore = parseFloat(conUnita[1].replace(',', '.'));
      const unita = conUnita[2].toLowerCase().startsWith('km') ? 'km' : 'm';
      const fattore = fattoreUnitaDaNome(unita);
      if (Number.isFinite(valore) && valore > 0) {
        const metri = Math.round(valore * fattore);
        return { compreso: true, ripetizioni: 1, distanza: metri, metriTotali: metri };
      }
    }

    // Numero semplice (>= 25m), anche preceduto da un'etichetta
    const numero = testo.match(/(\d+)\b/);
    if (numero) {
      const val = parseInt(numero[1], 10);
      if (val >= 25) {
        return { compreso: true, ripetizioni: 1, distanza: val, metriTotali: val };
      }
      if (val > 0 && val < 25 && /sciolt|vaschett/i.test(testo)) {
        return { compreso: true, ripetizioni: val, distanza: 25, metriTotali: val * 25 };
      }
    }

    return null;
  }

  /**
   * Separa una possibile etichetta iniziale dal contenuto numerico.
   * Es. "Riscaldamento 400m" -> { etichetta: "Riscaldamento", contenuto: "400m" }
   *      "Riscaldamento: 4x100" -> { etichetta: "Riscaldamento", contenuto: "4x100" }
   *      "8x50 libero" -> { etichetta: undefined, contenuto: "8x50 libero" }
   */
  static estraiEtichetta(riga: string): { etichetta?: string; contenuto: string } {
    const testo = riga.trim();

    // Etichetta con separatore (":", "-", "–", "—")
    const conSep = testo.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]{0,24}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]{1,24})?)\s*[:\-–—]\s+(.+)$/);
    if (conSep && /\d/.test(conSep[2])) {
      return { etichetta: conSep[1].trim(), contenuto: conSep[2].trim() };
    }

    // Etichetta seguita da un numero ("Riscaldamento 400m", "T finale 4x50")
    const conNumero = testo.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]{0,24}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]{1,24})?)\s+(\d[\d.,]*\s*[xX]?\s*\d*\s*(?:m|km|mt)?\b.*)$/i);
    if (conNumero) {
      const etichetta = conNumero[1].trim();
      if (!/^x$/i.test(etichetta)) {
        return { etichetta, contenuto: conNumero[2].trim() };
      }
    }

    return { contenuto: testo };
  }

  /**
   * Suggerisce una possibile interpretazione per una riga non compresa.
   */
  static suggerisciInterpretazione(riga: string): {
    tipo: TipoRegola;
    pattern: string;
    descrizione: string;
    distanza?: number;
    ripetizioni?: number;
    unita?: string;
  } | null {
    const trimRiga = riga.trim();

    const matchNxM = trimRiga.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (matchNxM) {
      return {
        tipo: 'NXM',
        pattern: escapeRegExp(trimRiga),
        descrizione: `Interpretare come ${matchNxM[1]} ripetizioni da ${matchNxM[2]} metri?`,
        distanza: parseInt(matchNxM[2], 10),
        ripetizioni: parseInt(matchNxM[1], 10),
      };
    }

    const matchUnita = trimRiga.match(/(\d+(?:[.,]\d+)?)\s*(km|m\b|mt\b|meters?|metri\b)/i);
    if (matchUnita) {
      const valore = parseFloat(matchUnita[1].replace(',', '.'));
      const unita = matchUnita[2].toLowerCase().startsWith('km') ? 'km' : 'm';
      const fattore = fattoreUnitaDaNome(unita);
      return {
        tipo: 'UNITA',
        pattern: escapeRegExp(trimRiga),
        descrizione: `Interpretare ${valore} ${unita} come ${Math.round(valore * fattore)} metri?`,
        distanza: Math.round(valore * fattore),
        unita,
      };
    }

    const matchSolo = trimRiga.match(/^(\d+)$/);
    if (matchSolo) {
      const numero = parseInt(matchSolo[1], 10);
      if (numero >= 25 && numero <= 5000) {
        return {
          tipo: 'SOLO',
          pattern: escapeRegExp(trimRiga),
          descrizione: `Interpretare come ${numero} metri?`,
          distanza: numero,
        };
      }
    }

    return null;
  }
}
