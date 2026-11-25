import {
  Chiusura,
  Gara,
  IscrizioneGara,
  LogSeduta,
  Macrociclo,
  Mesociclo,
  Microciclo,
  Stagione,
} from '../types';
import { isAfter, isBefore } from './dateUtils';

/**
 * Archivio di una stagione chiusa (QUINTO GIRO 3.3): raccoglie tutto ciò che
 * appartiene alla stagione — piano, gare, iscrizioni, chiusure e il registro
 * delle sedute nel periodo — in un unico JSON comprimibile.
 * Atleti e tempi NON entrano nell'archivio: restano come storico attivo.
 */
export interface ArchivioStagione {
  tipo: 'finpcoach-archivio-stagione';
  version: '1.0';
  esportatoIl: string;
  stagione: Stagione;
  chiusure: Chiusura[];
  gare: Gara[];
  iscrizioniGare: IscrizioneGara[];
  macrocicli: Macrociclo[];
  mesocicli: Mesociclo[];
  microcicli: Microciclo[];
  logSedute: LogSeduta[];
}

export function costruisciArchivioStagione(input: {
  stagione: Stagione;
  chiusure: Chiusura[];
  gare: Gara[];
  iscrizioniGare: IscrizioneGara[];
  macrocicli: Macrociclo[];
  mesocicli: Mesociclo[];
  microcicli: Microciclo[];
  log: LogSeduta[];
  esportatoIl?: string;
}): ArchivioStagione {
  const { stagione } = input;
  return {
    tipo: 'finpcoach-archivio-stagione',
    version: '1.0',
    esportatoIl: input.esportatoIl ?? new Date().toISOString(),
    stagione,
    chiusure: input.chiusure,
    gare: input.gare,
    iscrizioniGare: input.iscrizioniGare,
    macrocicli: input.macrocicli,
    mesocicli: input.mesocicli,
    microcicli: input.microcicli,
    // Solo le sedute dentro il periodo della stagione: il registro fuori
    // periodo (es. stagioni precedenti tenute come storico) resta attivo.
    logSedute: input.log.filter(
      l => !isBefore(l.data, stagione.inizio) && !isAfter(l.data, stagione.fine)
    ),
  };
}

/** Predicato per "questo log appartiene alla stagione appena archiviata". */
export function logNellaStagione(data: string, stagione: Pick<Stagione, 'inizio' | 'fine'>): boolean {
  return !isBefore(data, stagione.inizio) && !isAfter(data, stagione.fine);
}

function nomeFile(archivio: ArchivioStagione): string {
  const base = (archivio.stagione.nome || 'stagione')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stagione';
  return `finpcoach-archivio-${base}-${archivio.stagione.fine}.json`;
}

async function gzipJson(testo: string): Promise<Blob> {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const buf = await new Response(new Blob([testo]).stream().pipeThrough(cs)).arrayBuffer();
    return new Blob([buf], { type: 'application/gzip' });
  }
  return new Blob([testo], { type: 'application/json' });
}

/**
 * Scarica l'archivio come file .json.gz (fallback .json se CompressionStream
 * non è disponibile). Stessa tecnica del backup: Blob + click su anchor.
 */
export async function scaricaArchivioStagione(archivio: ArchivioStagione): Promise<void> {
  const testo = JSON.stringify(archivio);
  const compresso = typeof CompressionStream !== 'undefined';
  const blob = compresso ? await gzipJson(testo) : new Blob([testo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = compresso ? `${nomeFile(archivio)}.gz` : nomeFile(archivio);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
