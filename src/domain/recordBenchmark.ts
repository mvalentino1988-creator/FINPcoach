import { Stile, Tempo } from '../types';
import { RecordService, RecordFINP, ConfrontoRecord } from './recordService';
import { parseTempo, formattaTempo } from './tempoUtils';
import { BiomechanicsEngine } from './biomechanicsEngine';

export type LivelloRecord = 'Mondiale' | 'Europeo' | 'Italiano';

const TIPO_PER_LIVELLO: Record<LivelloRecord, RecordFINP['t']> = {
  Mondiale: 'WR',
  Europeo: 'EUR',
  Italiano: 'ITA'
};

/** Riferimento a un record reale (WR/EUR/ITA) per classe, evento e vasca. */
export interface RiferimentoRecord {
  disponibile: boolean;
  livello: LivelloRecord;
  classe: string;
  evento: string;
  stile: Stile;
  distanzaMetri: number;
  vascaMetri: number;
  /** Tempo del record in centesimi (null se non disponibile). */
  centesimi: number | null;
  tempoFormattato: string | null;
  /** Velocità media del record = distanza / tempo (null se non disponibile). */
  velocitaMedia: number | null;
  detentore: string | null;
  anno: number | null;
  data: string | null;
  luogo: string | null;
  manifestazione: string | null;
  tipoRecord: RecordFINP['t'] | null;
}

const STILE_EVENTO: Record<Stile, string> = {
  STILE_LIBERO: 'Stile Libero',
  DORSO: 'Dorso',
  RANA: 'Rana',
  FARFALLA: 'Farfalla',
  MISTI: 'Misti'
};

function eventoDi(stile: Stile, distanzaMetri: number): string {
  return `${distanzaMetri} ${STILE_EVENTO[stile]}`;
}

/** Sceglie il record migliore per (vasca, evento, classe, livello). Per ITA preferisce la categoria Assoluto. */
export function recordPerRiferimento(
  livello: LivelloRecord,
  classe: string,
  stile: Stile,
  distanzaMetri: number,
  vascaMetri: number
): RiferimentoRecord {
  const base: RiferimentoRecord = {
    disponibile: false,
    livello,
    classe,
    evento: eventoDi(stile, distanzaMetri),
    stile,
    distanzaMetri,
    vascaMetri,
    centesimi: null,
    tempoFormattato: null,
    velocitaMedia: null,
    detentore: null,
    anno: null,
    data: null,
    luogo: null,
    manifestazione: null,
    tipoRecord: null
  };

  const tipo = TIPO_PER_LIVELLO[livello];
  const candidati = RecordService.tutti().filter(
    r => r.v === vascaMetri && r.ev === base.evento && r.cl === classe && r.t === tipo
  );
  if (candidati.length === 0) return base;

  // Per ITA preferisci Assoluto; altrimenti il record più veloce.
  const preferiti = tipo === 'ITA' && candidati.some(r => r.cat === 'Assoluto')
    ? candidati.filter(r => r.cat === 'Assoluto')
    : candidati;

  const migliori = preferiti
    .map(r => ({ r, c: parseTempo(r.tm) }))
    .filter((x): x is { r: RecordFINP; c: number } => x.c !== null)
    .sort((a, b) => a.c - b.c);
  if (migliori.length === 0) return base;

  const { r, c } = migliori[0];
  return {
    ...base,
    disponibile: true,
    centesimi: c,
    tempoFormattato: formattaTempo(c),
    velocitaMedia: BiomechanicsEngine.calcolaVelocitaMedia(distanzaMetri, c / 100),
    detentore: r.d,
    anno: r.y,
    data: r.dt,
    luogo: r.l,
    manifestazione: r.m,
    tipoRecord: r.t
  };
}

/** Classi S1-S14 in ordine; SB/SM solo se coerenti con lo stile richiesto. */
export function classiPerStile(stile: Stile): string[] {
  const s = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14'];
  if (stile === 'RANA') return [...s, ...sbClassi()];
  if (stile === 'MISTI') return [...s, ...smClassi()];
  return s;
}

function sbClassi(): string[] {
  return [...new Set(RecordService.tutti().map(r => r.cl).filter(c => /^SB/.test(c)))].sort(
    (a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10)
  );
}

function smClassi(): string[] {
  return [...new Set(RecordService.tutti().map(r => r.cl).filter(c => /^SM/.test(c)))].sort(
    (a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10)
  );
}

export interface PuntoRecord {
  classe: string;
  riferimento: RiferimentoRecord;
}

/** Cluster di record reali per un livello geografico, stile, distanza e vasca. */
export function clusterRecord(
  livello: LivelloRecord,
  stile: Stile,
  distanzaMetri: number,
  filtroClasse?: string | null,
  vascaMetri: number = 25
): PuntoRecord[] {
  const classi = classiPerStile(stile).filter(c => !filtroClasse || c === filtroClasse);
  return classi
    .map(classe => ({ classe, riferimento: recordPerRiferimento(livello, classe, stile, distanzaMetri, vascaMetri) }))
    .filter(p => p.riferimento.disponibile);
}

export interface ConfrontoAtletaRecord {
  evento: string;
  stile: Stile;
  distanzaMetri: number;
  vascaMetri: number;
  classe: string;
  /** Miglior tempo dell'atleta per l'evento (centesimi). */
  tempoAtletaCentesimi: number;
  tempoAtletaFormattato: string;
  velocitaMediaAtleta: number;
  riferimento: RiferimentoRecord;
  confronto: ConfrontoRecord | null;
}

/** Miglior tempo per (evento, vasca) tra i tempi gara/allenamento dell'atleta. */
function migliorPerEvento(tempi: Tempo[], atletaId: number): Map<string, Tempo> {
  const map = new Map<string, Tempo>();
  for (const t of tempi) {
    if (t.atletaId !== atletaId) continue;
    const key = `${t.vascaMetri}|${t.stile}|${t.distanzaMetri}`;
    const prev = map.get(key);
    if (!prev || t.centesimi < prev.centesimi) map.set(key, t);
  }
  return map;
}

/** Confronto atleta vs record per ogni evento con tempo registrato. */
export function confrontoAtletaRecord(
  tempi: Tempo[],
  atletaId: number,
  classeAtleta: string | null,
  livello: LivelloRecord
): ConfrontoAtletaRecord[] {
  if (!classeAtleta) return [];
  const risultati: ConfrontoAtletaRecord[] = [];
  for (const t of migliorPerEvento(tempi, atletaId).values()) {
    const rif = recordPerRiferimento(livello, classeAtleta, t.stile, t.distanzaMetri, t.vascaMetri);
    risultati.push({
      evento: `${t.distanzaMetri} ${STILE_EVENTO[t.stile]}`,
      stile: t.stile,
      distanzaMetri: t.distanzaMetri,
      vascaMetri: t.vascaMetri,
      classe: classeAtleta,
      tempoAtletaCentesimi: t.centesimi,
      tempoAtletaFormattato: formattaTempo(t.centesimi),
      velocitaMediaAtleta: BiomechanicsEngine.calcolaVelocitaMedia(t.distanzaMetri, t.centesimi / 100),
      riferimento: rif,
      confronto: rif.disponibile && rif.centesimi !== null
        ? RecordService.confronta(t.centesimi, rif.centesimi)
        : null
    });
  }
  return risultati.sort((a, b) =>
    a.distanzaMetri - b.distanzaMetri ||
    RecordService.ordineStile(a.stile) - RecordService.ordineStile(b.stile) ||
    a.vascaMetri - b.vascaMetri
  );
}

/** Classe record dell'atleta per uno stile (S/SB/SM), come RecordService.classePerStile ma senza Atleta. */
export function classeRecordPerStile(atleta: { classeS?: number | null; classeSB?: number | null; classeSM?: number | null }, stile: Stile): string | null {
  if (stile === 'RANA') return atleta.classeSB ? `SB${atleta.classeSB}` : null;
  if (stile === 'MISTI') return atleta.classeSM ? `SM${atleta.classeSM}` : null;
  return atleta.classeS ? `S${atleta.classeS}` : null;
}
