import { Stile } from '../types';

export interface GaraDisponibile {
  distanzaMetri: number;
  stile: Stile;
  descrizione: string;
  minClasse?: number | null;
  maxClasse?: number | null;
  note: string;
}

export interface SuggerimentoGara {
  gara: GaraDisponibile;
  priorita: number; // 1-5
  motivazione: string;
}

export class RegolamentoGare {
  static readonly GARE_S_STILE_LIBERO: GaraDisponibile[] = [
    { distanzaMetri: 50, stile: 'STILE_LIBERO', descrizione: '50m Stile Libero', note: '' },
    { distanzaMetri: 100, stile: 'STILE_LIBERO', descrizione: '100m Stile Libero', note: '' },
    { distanzaMetri: 200, stile: 'STILE_LIBERO', descrizione: '200m Stile Libero', note: '' },
    { distanzaMetri: 400, stile: 'STILE_LIBERO', descrizione: '400m Stile Libero', minClasse: 1, maxClasse: 10, note: '' },
    { distanzaMetri: 800, stile: 'STILE_LIBERO', descrizione: '800m Stile Libero', minClasse: 1, maxClasse: 8, note: '' },
    { distanzaMetri: 1500, stile: 'STILE_LIBERO', descrizione: '1500m Stile Libero', minClasse: 1, maxClasse: 7, note: '' }
  ];

  static readonly GARE_S_DORSO: GaraDisponibile[] = [
    { distanzaMetri: 50, stile: 'DORSO', descrizione: '50m Dorso', note: '' },
    { distanzaMetri: 100, stile: 'DORSO', descrizione: '100m Dorso', note: '' },
    { distanzaMetri: 200, stile: 'DORSO', descrizione: '200m Dorso', note: '' }
  ];

  static readonly GARE_S_RANA: GaraDisponibile[] = [
    { distanzaMetri: 50, stile: 'RANA', descrizione: '50m Rana', note: '' },
    { distanzaMetri: 100, stile: 'RANA', descrizione: '100m Rana', note: '' }
  ];

  static readonly GARE_S_FARFALLA: GaraDisponibile[] = [
    { distanzaMetri: 50, stile: 'FARFALLA', descrizione: '50m Farfalla', note: '' },
    { distanzaMetri: 100, stile: 'FARFALLA', descrizione: '100m Farfalla', note: '' }
  ];

  static readonly GARE_S_MISTI: GaraDisponibile[] = [
    { distanzaMetri: 150, stile: 'MISTI', descrizione: '150m Misti', note: '' },
    { distanzaMetri: 200, stile: 'MISTI', descrizione: '200m Misti', note: '' }
  ];

  static readonly GARE_SB_RANA: GaraDisponibile[] = [
    { distanzaMetri: 50, stile: 'RANA', descrizione: '50m Rana (SB)', note: '' },
    { distanzaMetri: 100, stile: 'RANA', descrizione: '100m Rana (SB)', note: '' }
  ];

  static readonly GARE_SM_MISTI: GaraDisponibile[] = [
    { distanzaMetri: 150, stile: 'MISTI', descrizione: '150m Misti (SM)', note: '' },
    { distanzaMetri: 200, stile: 'MISTI', descrizione: '200m Misti (SM)', note: '' }
  ];

  static suggerisciGare(
    classeS?: number | null,
    classeSB?: number | null,
    classeSM?: number | null,
    tempiDisponibili: Map<string, number> = new Map()
  ): SuggerimentoGara[] {
    const suggerimenti: SuggerimentoGara[] = [];

    if (classeS != null) {
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_S_STILE_LIBERO, classeS, tempiDisponibili, 'S'));
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_S_DORSO, classeS, tempiDisponibili, 'S'));
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_S_FARFALLA, classeS, tempiDisponibili, 'S'));
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_S_MISTI, classeS, tempiDisponibili, 'S'));
    }

    if (classeSB != null) {
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_SB_RANA, classeSB, tempiDisponibili, 'SB'));
    }

    if (classeSM != null) {
      suggerimenti.push(...this.suggerisciPerClasse(this.GARE_SM_MISTI, classeSM, tempiDisponibili, 'SM'));
    }

    if (classeS == null && classeSB == null && classeSM == null) {
      suggerimenti.push(
        ...this.GARE_S_STILE_LIBERO.slice(0, 3).map(gara => ({
          gara,
          priorita: 3,
          motivazione: 'Gara standard consigliata per atleti non classificati'
        }))
      );
    }

    return suggerimenti.sort((a, b) => a.priorita - b.priorita);
  }

  private static suggerisciPerClasse(
    gare: GaraDisponibile[],
    classe: number,
    tempi: Map<string, number>,
    prefissoClasse: string
  ): SuggerimentoGara[] {
    const gareValide = gare.filter(gara => {
      const minOk = gara.minClasse == null || classe >= gara.minClasse;
      const maxOk = gara.maxClasse == null || classe <= gara.maxClasse;
      return minOk && maxOk;
    });

    return gareValide.map((gara, index) => {
      const prioritaBase = index === 0 ? 1 : index === 1 ? 2 : 3;
      const key = `${gara.stile}_${gara.distanzaMetri}`;
      const haTempo = tempi.has(key);
      const priorita = haTempo ? prioritaBase : prioritaBase + 1;

      let motivazione = `Gara ${prefissoClasse}${classe} - `;
      if (haTempo) {
        motivazione += '⭐ Hai già un tempo registrato, gara ideale per migliorare il PB';
      } else {
        motivazione += 'Consigliata per la tua classe di classificazione';
      }
      if (gara.note) {
        motivazione += `. ${gara.note}`;
      }

      return { gara, priorita, motivazione };
    });
  }

  static isGaraConsentita(gara: GaraDisponibile, classe: number, tipoClasse: string): boolean {
    if (tipoClasse === 'S' || tipoClasse === 'SB' || tipoClasse === 'SM') {
      const minOk = gara.minClasse == null || classe >= gara.minClasse;
      const maxOk = gara.maxClasse == null || classe <= gara.maxClasse;
      return minOk && maxOk;
    }
    return true;
  }

  static getGarePerStile(stile: Stile): GaraDisponibile[] {
    switch (stile) {
      case 'STILE_LIBERO': return this.GARE_S_STILE_LIBERO;
      case 'DORSO': return this.GARE_S_DORSO;
      case 'RANA': return this.GARE_S_RANA;
      case 'FARFALLA': return this.GARE_S_FARFALLA;
      case 'MISTI': return this.GARE_S_MISTI;
    }
  }

  static getNoteRegolamento(classe: number): string[] {
    const note: string[] = [];
    if (classe >= 11) {
      note.push('Classi S11-S14: gare di 400m, 800m e 1500m non disponibili in competizioni internazionali');
    }
    if (classe >= 9) {
      note.push('Classi S9-S14: 1500m stile libero non disponibile ai Giochi Paralimpici');
    }
    if (classe >= 8) {
      note.push('Classi S8-S14: 800m stile libero non disponibile ai Giochi Paralimpici');
    }
    return note;
  }
}
