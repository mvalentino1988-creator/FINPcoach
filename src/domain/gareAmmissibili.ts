import dati from '../data/gare-ammissibili.json';
import type { Stile } from '../types';

/** Famiglia di classe: S (libero, dorso, farfalla), SB (rana), SM (misti). */
export type FamigliaClasse = 'S' | 'SB' | 'SM';
export type Vasca = 'corta' | 'lunga';

export interface GaraProgramma {
  stile: Stile;
  distanza: number;
  famiglia: FamigliaClasse;
  /** Intervalli inclusivi [da, a] di numeri di classe. */
  classi: [number, number][];
  soloVascaCorta?: boolean;
}

export interface ClassiAtleta {
  classeS?: number | null;
  classeSB?: number | null;
  classeSM?: number | null;
}

export type StatoGara = 'ammessa' | 'non_ammessa' | 'classe_mancante';

export interface EsitoGara {
  gara: GaraProgramma;
  stato: StatoGara;
  motivo: string;
}

export const FONTE_PROGRAMMA = dati.meta;
export const PROGRAMMA_WPS = dati.gare as unknown as GaraProgramma[];

function classeDellAtleta(classi: ClassiAtleta, famiglia: FamigliaClasse): number | null {
  const valore =
    famiglia === 'S' ? classi.classeS : famiglia === 'SB' ? classi.classeSB : classi.classeSM;
  return valore ?? null;
}

function inIntervalli(classe: number, intervalli: [number, number][]): boolean {
  return intervalli.some(([da, a]) => classe >= da && classe <= a);
}

/** Es.: "S1–S5, S14" oppure "SB4–SB9, SB11–SB14". */
export function etichettaClassi(gara: GaraProgramma): string {
  const f = gara.famiglia;
  return gara.classi
    .map(([da, a]) => (da === a ? `${f}${da}` : `${f}${da}–${f}${a}`))
    .join(', ');
}

export function valutaGara(gara: GaraProgramma, classi: ClassiAtleta, vasca?: Vasca): EsitoGara {
  const classe = classeDellAtleta(classi, gara.famiglia);

  if (classe === null) {
    return {
      gara,
      stato: 'classe_mancante',
      motivo: `Classe ${gara.famiglia} non inserita: serve per sapere se la gara è ammessa`,
    };
  }
  if (!inIntervalli(classe, gara.classi)) {
    return {
      gara,
      stato: 'non_ammessa',
      motivo: `Non prevista per ${gara.famiglia}${classe} (ammesse: ${etichettaClassi(gara)})`,
    };
  }
  if (gara.soloVascaCorta && vasca === 'lunga') {
    return { gara, stato: 'non_ammessa', motivo: 'Prevista solo in vasca corta (25 m)' };
  }
  return {
    gara,
    stato: 'ammessa',
    motivo: gara.soloVascaCorta
      ? 'Ammessa dal programma WPS (solo vasca corta)'
      : 'Ammessa dal programma WPS',
  };
}

/** Tutte le gare del programma, ciascuna con esito e motivo. */
export function valutaProgramma(classi: ClassiAtleta, vasca?: Vasca): EsitoGara[] {
  return PROGRAMMA_WPS.map((gara) => valutaGara(gara, classi, vasca));
}

/** Solo le gare ammesse. */
export function gareAmmesse(classi: ClassiAtleta, vasca?: Vasca): GaraProgramma[] {
  return valutaProgramma(classi, vasca)
    .filter((e) => e.stato === 'ammessa')
    .map((e) => e.gara);
}

/** Famiglie di classe che mancano all'atleta e bloccano la valutazione. */
export function classiMancanti(classi: ClassiAtleta): FamigliaClasse[] {
  const mancanti: FamigliaClasse[] = [];
  if (classi.classeS == null) mancanti.push('S');
  if (classi.classeSB == null) mancanti.push('SB');
  if (classi.classeSM == null) mancanti.push('SM');
  return mancanti;
}
