import { Assenza, Atleta, Microciclo, VolumeAtleta } from '../types';
import { addDays, daysBetween, isAfter, isBefore, previousOrSameMonday, weeksBetween } from './dateUtils';

export class VolumeIndividuale {
  /**
   * Volume settimanale di un singolo atleta: parte dal target di squadra e applica
   * fattore volume, giorni di assenza e rientro graduale dopo assenze di almeno 14 giorni
   * (60% nella settimana del rientro, 80% nella successiva).
   */
  static settimana(micro: Microciclo, atleta: Atleta, assenze: Assenza[]): VolumeAtleta {
    const giorni = Array.from({ length: 7 }, (_, i) => addDays(micro.inizio, i));
    const assenti = giorni.filter(d =>
      assenze.some(a => !isBefore(d, a.dal) && !isAfter(d, a.al))
    ).length;

    if (assenti === 7) {
      return { metri: 0, note: ['assente tutta la settimana'] };
    }

    const note: string[] = [];
    let fattore = atleta.fattoreVolume;
    if (atleta.fattoreVolume < 1.0) {
      note.push(`volume al ${Math.round(atleta.fattoreVolume * 100)}%`);
    }

    if (assenti > 0) {
      fattore *= (7 - assenti) / 7.0;
      note.push(`assente ${assenti} giorni`);
    }

    let rientro = 1.0;
    for (const a of assenze) {
      const dur = daysBetween(a.dal, a.al) + 1;
      if (dur < 14) continue;
      const giornoDopo = addDays(a.al, 1);
      const settimanaRientro = previousOrSameMonday(giornoDopo);
      const diffSettimane = weeksBetween(settimanaRientro, micro.inizio);

      let f = 1.0;
      if (diffSettimane === 0) {
        f = 0.6;
      } else if (diffSettimane === 1) {
        f = 0.8;
      }
      rientro = Math.min(rientro, f);
    }

    if (rientro < 1.0) {
      fattore *= rientro;
      note.push('rientro graduale');
    }

    return {
      metri: Math.round(micro.volumeTargetMetri * fattore),
      note
    };
  }
}
