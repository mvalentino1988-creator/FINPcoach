import { Assenza, Gara, IscrizioneGara, Microciclo, Atleta, TIPO_MICROCICLO_LABEL } from '../types';
import { VolumeIndividuale } from './volumeIndividuale';
import { formattaData } from './dateUtils';

export interface RigaPianoAtleta {
  micro: Microciclo;
  /** Volume settimanale prescritto all'atleta (dopo fattori individuali). */
  volumeMetri: number;
  /** Volume target della squadra per la settimana (al 100%). */
  volumeTargetMetri: number;
  tipoLabel: string;
  tapering: boolean;
  note?: string;
}

/** Volume individuale per ogni microciclo della stagione, in ordine. */
export function pianoAtletaSettimane(
  atleta: Atleta,
  micro: Microciclo[],
  assenze: Assenza[]
): RigaPianoAtleta[] {
  const mieAssenze = assenze.filter(a => a.atletaId === atleta.id);
  return [...micro]
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map(m => {
      const v = VolumeIndividuale.settimana(m, atleta, mieAssenze);
      return {
        micro: m,
        volumeMetri: v.metri,
        volumeTargetMetri: m.volumeTargetMetri,
        tipoLabel: TIPO_MICROCICLO_LABEL[m.tipo] ?? m.tipo,
        tapering: m.tipo === 'SCARICO' || m.tipo === 'GARA' || m.tipo === 'RECUPERO',
        note: v.note.length > 0 ? v.note.join('; ') : undefined
      };
    });
}

export interface GaraIscrittaAtleta {
  iscrizione: IscrizioneGara;
  gara: Gara;
}

/** Gare in cui l'atleta è iscritto (stato ISCRITTO) o ha una scheda. */
export function gareAtleta(
  iscrizioni: IscrizioneGara[],
  gare: Gara[],
  atletaId: number
): GaraIscrittaAtleta[] {
  return iscrizioni
    .filter(i => i.atletaId === atletaId)
    .map(i => ({ iscrizione: i, gara: gare.find(g => g.id === i.garaId) }))
    .filter((x): x is GaraIscrittaAtleta => x.gara != null)
    .sort((a, b) => a.gara.dal.localeCompare(b.gara.dal));
}

/** CSV dell'intera squadra: una riga per atleta (100 righe con 100 atleti). */
export function csvSquadra(
  atleti: Atleta[],
  micro: Microciclo[],
  assenze: Assenza[],
  iscrizioni: IscrizioneGara[],
  gare: Gara[]
): string {
  const intestazione = 'Nome;Cognome;Classe;VolumeTotale_m;Settimane;GareIscritte';
  const righe = atleti.map(a => {
    const piano = pianoAtletaSettimane(a, micro, assenze);
    const volume = piano.reduce((s, r) => s + r.volumeMetri, 0);
    const classe = a.classeS ? `S${a.classeS}` : a.classeSB ? `SB${a.classeSB}` : a.classeSM ? `SM${a.classeSM}` : '';
    const nGare = gareAtleta(iscrizioni, gare, a.id).filter(g => g.iscrizione.stato === 'ISCRITTO').length;
    return [
      a.nome.replace(/;/g, ','),
      a.cognome.replace(/;/g, ','),
      classe,
      Math.round(volume),
      piano.filter(r => r.volumeMetri > 0).length,
      nGare
    ].join(';');
  });
  return [intestazione, ...righe].join('\n');
}

/** Testo leggibile del piano di un atleta (per stampa). */
export function pianoAtletaTesto(
  atleta: Atleta,
  righe: RigaPianoAtleta[],
  gare: GaraIscrittaAtleta[]
): string {
  const nome = `${atleta.nome} ${atleta.cognome}`.trim();
  const righeTesto = righe.map(r =>
    `${formattaData(r.micro.inizio)}–${formattaData(r.micro.fine)} · ${r.tipoLabel}${r.tapering ? ' (tapering)' : ''} · ${Math.round(r.volumeMetri).toLocaleString('it-IT')} m${r.note ? ` · ${r.note}` : ''}`
  );
  const gareTesto = gare.length === 0
    ? 'Nessuna gara iscritta.'
    : gare.map(g => `${g.gara.nome} (${formattaData(g.gara.dal)}–${formattaData(g.gara.al)}) · ${g.iscrizione.stato}`).join('\n');
  return `PIANO ATLETA — ${nome}\n\n${righeTesto.join('\n')}\n\nGARE ISCRITTE\n${gareTesto}`;
}
