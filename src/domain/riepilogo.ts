import { Assenza, Atleta, LogSeduta, Microciclo, RiepilogoSettimana } from '../types';
import { previousOrSameMonday } from './dateUtils';
import { VolumeIndividuale } from './volumeIndividuale';

export class Riepilogo {
  /** Ultime settimane con sedute registrate per l'atleta, dalla più recente. */
  static perAtleta(
    atleta: Atleta,
    log: LogSeduta[],
    micro: Microciclo[],
    assenze: Assenza[],
    maxSettimane: number = 8
  ): RiepilogoSettimana[] {
    const gruppi = new Map<string, LogSeduta[]>();

    for (const l of log) {
      if (l.atletaId !== atleta.id) continue;
      const lunedi = previousOrSameMonday(l.data);
      if (!gruppi.has(lunedi)) {
        gruppi.set(lunedi, []);
      }
      gruppi.get(lunedi)!.push(l);
    }

    const sortedMondays = Array.from(gruppi.keys())
      .sort((a, b) => b.localeCompare(a))
      .slice(0, maxSettimane);

    return sortedMondays.map(lunedi => {
      const l = gruppi.get(lunedi)!;
      const presenti = l.filter(it => it.presente);
      const rpeList = presenti.map(it => it.rpe).filter((r): r is number => r != null);
      const rpeMedio = rpeList.length > 0 ? rpeList.reduce((acc, v) => acc + v, 0) / rpeList.length : null;
      const matchingMicro = micro.find(m => m.inizio === lunedi);
      const metriPrevisti = matchingMicro
        ? VolumeIndividuale.settimana(matchingMicro, atleta, assenze).metri
        : null;

      return {
        lunedi,
        sedute: presenti.length,
        assenze: l.length - presenti.length,
        metri: presenti.reduce((sum, it) => sum + it.metriEffettivi, 0),
        rpeMedio,
        caricoSrpe: presenti.reduce((sum, it) => sum + (it.rpe ?? 0) * it.durataMin, 0),
        metriPrevisti
      };
    });
  }
}
