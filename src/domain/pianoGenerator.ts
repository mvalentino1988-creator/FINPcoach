import {
  Chiusura,
  FaseMesociclo,
  Gara,
  MacroGen,
  Macrociclo,
  MesoGen,
  Mesociclo,
  Microciclo,
  ParametriPiano,
  Stagione,
  TipoMicrociclo
} from '../types';
import {
  addDays,
  addWeeks,
  isAfter,
  isBefore,
  nextOrSameSunday,
  previousOrSameMonday,
  setDayOfWeekInWeek
} from './dateUtils';

const PROPORZIONI: [FaseMesociclo, number][] = [
  ['PREPARAZIONE_GENERALE', 0.35],
  ['PREPARAZIONE_SPECIFICA', 0.30],
  ['PRE_GARA', 0.15],
  ['COMPETITIVA', 0.20]
];

const FATTORE_FASE: Record<FaseMesociclo, number> = {
  PREPARAZIONE_GENERALE: 1.0,
  PREPARAZIONE_SPECIFICA: 1.0,
  PRE_GARA: 0.9,
  COMPETITIVA: 0.8
};

const SETTIMANE_PRE_GARA = 3;
const QUOTA_SPECIFICA = 0.45;

class Blocco {
  constructor(
    public settimane: [string, FaseMesociclo][],
    public obiettivo: string
  ) {}
}

export class PianoGenerator {
  static genera(
    stagione: Stagione,
    chiusure: Chiusura[],
    gare: Gara[],
    p: ParametriPiano
  ): MacroGen[] {
    const primoLunedi = previousOrSameMonday(stagione.inizio);

    let fineEffettiva = stagione.fine;
    for (const g of gare) {
      if (isAfter(g.al, fineEffettiva)) {
        fineEffettiva = g.al;
      }
    }
    const ultimaDomenica = nextOrSameSunday(fineEffettiva);

    const settimane: string[] = [];
    let cur = primoLunedi;
    while (!isAfter(cur, ultimaDomenica)) {
      settimane.push(cur);
      cur = addWeeks(cur, 1);
    }

    if (settimane.length === 0 || p.giorniAllenamento.length === 0) {
      return [];
    }

    const stato = { caricoNelCiclo: 0, settimanaStagioneIndex: 0 };
    const blocchi = this.costruisciBlocchi(settimane, gare, p);

    return blocchi.map((blocco, indice) => {
      const gruppi = this.raggruppa(blocco.settimane);
      const mesoList: MesoGen[] = gruppi.map(([fase, settList]) => {
        const mesoStart = settList[0];
        const mesoEnd = addDays(settList[settList.length - 1], 6);

        const microList = this.microcicli(
          settList,
          fase,
          settimane[0],
          stagione,
          chiusure,
          gare,
          p,
          stato
        );

        const meso: Mesociclo = {
          id: 0,
          macrocicloId: 0,
          fase,
          inizio: mesoStart,
          fine: mesoEnd
        };

        return { meso, micro: microList };
      });

      const macroStart = blocco.settimane[0][0];
      const macroEnd = addDays(blocco.settimane[blocco.settimane.length - 1][0], 6);

      const macro: Macrociclo = {
        id: 0,
        stagioneId: stagione.id,
        nome: `Macrociclo ${indice + 1}`,
        inizio: macroStart,
        fine: macroEnd,
        obiettivo: blocco.obiettivo
      };

      return { macro, meso: mesoList };
    });
  }

  private static costruisciBlocchi(
    settimane: string[],
    gare: Gara[],
    p: ParametriPiano
  ): Blocco[] {
    const ultimaDomenica = addDays(settimane[settimane.length - 1], 6);
    const indiciGara: number[] = [];
    const nomiGara: string[] = [];

    const prioritarie = gare.filter(g => g.prioritaria).sort((a, b) => a.dal.localeCompare(b.dal));
    for (const g of prioritarie) {
      let idx = -1;
      for (let i = 0; i < settimane.length; i++) {
        if (!isAfter(settimane[i], g.dal)) {
          idx = i;
        }
      }
      const distanteAbbastanza = indiciGara.length === 0 || idx >= indiciGara[indiciGara.length - 1] + 2;
      if (idx >= 0 && !isAfter(g.dal, ultimaDomenica) && distanteAbbastanza) {
        indiciGara.push(idx);
        nomiGara.push(g.nome);
      }
    }

    if (indiciGara.length === 0) {
      const nMacro = Math.max(1, Math.min(p.numeroMacrocicli, settimane.length));
      const dimensione = Math.ceil(settimane.length / nMacro);

      const blocchi: Blocco[] = [];
      for (let i = 0; i < settimane.length; i += dimensione) {
        const chunk = settimane.slice(i, i + dimensione);
        const fasiDivise = this.dividiInFasi(chunk);
        const pairs: [string, FaseMesociclo][] = [];
        for (const [fase, sList] of fasiDivise) {
          for (const s of sList) {
            pairs.push([s, fase]);
          }
        }
        blocchi.push(new Blocco(pairs, 'Programmazione Agonistica Generale'));
      }
      return blocchi;
    }

    const ultimo = settimane.length - 1;
    return indiciGara.map((r, k) => {
      const inizio = k === 0 ? 0 : indiciGara[k - 1] + 2;
      const fine = k === indiciGara.length - 1 ? ultimo : Math.min(r + 1, ultimo);
      const rLocale = r - inizio;

      const pairs: [string, FaseMesociclo][] = [];
      for (let i = inizio; i <= fine; i++) {
        pairs.push([settimane[i], this.faseAttorno(i - inizio, rLocale)]);
      }

      return new Blocco(pairs, `Obiettivo A-Race (Gara Prioritaria): ${nomiGara[k]}`);
    });
  }

  private static faseAttorno(j: Int, r: Int): FaseMesociclo {
    const d = r - j;
    if (d < -1) return 'PREPARAZIONE_GENERALE';
    if (d <= 0) return 'COMPETITIVA';
    if (d <= SETTIMANE_PRE_GARA) return 'PRE_GARA';

    const n = r - SETTIMANE_PRE_GARA;
    const nSpecifica = Math.round(n * QUOTA_SPECIFICA);
    if (j >= n - nSpecifica) return 'PREPARAZIONE_SPECIFICA';
    return 'PREPARAZIONE_GENERALE';
  }

  private static raggruppa(
    fasi: [string, FaseMesociclo][]
  ): [FaseMesociclo, string[]][] {
    const risultato: [FaseMesociclo, string[]][] = [];
    for (const [data, fase] of fasi) {
      if (risultato.length > 0 && risultato[risultato.length - 1][0] === fase) {
        risultato[risultato.length - 1][1].push(data);
      } else {
        risultato.push([fase, [data]]);
      }
    }
    return risultato;
  }

  private static dividiInFasi(
    sett: string[]
  ): [FaseMesociclo, string[]][] {
    const n = sett.length;
    let cumulato = 0.0;
    let precedente = 0;
    const risultato: [FaseMesociclo, string[]][] = [];

    PROPORZIONI.forEach(([fase, quota], i) => {
      cumulato += quota;
      const limite = i === PROPORZIONI.length - 1 ? n : Math.round(n * cumulato);
      if (limite > precedente) {
        risultato.push([fase, sett.slice(precedente, limite)]);
      }
      precedente = Math.max(precedente, limite);
    });

    return risultato;
  }

  private static microcicli(
    sett: string[],
    fase: FaseMesociclo,
    primaSettimanaStagione: string,
    stagione: Stagione,
    chiusure: Chiusura[],
    gare: Gara[],
    p: ParametriPiano,
    stato: { caricoNelCiclo: number; settimanaStagioneIndex: number }
  ): Microciclo[] {
    return sett.map(lunedi => {
      const domenica = addDays(lunedi, 6);
      const idxSettimana = stato.settimanaStagioneIndex++;

      const giorniUtili = p.giorniAllenamento
        .map(dow => setDayOfWeekInWeek(lunedi, dow))
        .filter(d => {
          const withinSeason = !isBefore(d, stagione.inizio) && !isAfter(d, stagione.fine);
          const closed = chiusure.some(c => !isBefore(d, c.dal) && !isAfter(d, c.al));
          return withinSeason && !closed;
        });

      const gareInSettimana = gare.filter(g => !isAfter(g.dal, domenica) && !isBefore(g.al, lunedi));
      const garaPrioritariaInSettimana = gareInSettimana.some(g => g.prioritaria);
      const garaSecondariaInSettimana = gareInSettimana.some(g => !g.prioritaria);

      const lunediMeno1w = addWeeks(lunedi, -1);
      const domenicaMeno1w = addWeeks(domenica, -1);
      const dopoGaraPrioritaria = gare.some(g =>
        g.prioritaria &&
        !isBefore(g.al, lunediMeno1w) &&
        !isAfter(g.al, domenicaMeno1w)
      );

      const lunediPiu1w = addWeeks(lunedi, 1);
      const domenicaPiu1w = addWeeks(domenica, 1);
      const prePrioritaria = gare.some(g =>
        g.prioritaria &&
        !isBefore(g.dal, lunediPiu1w) &&
        !isAfter(g.dal, domenicaPiu1w)
      );

      let tipo: TipoMicrociclo;
      if (giorniUtili.length === 0) {
        tipo = 'PAUSA';
      } else if (gareInSettimana.length > 0) {
        tipo = 'GARA';
      } else if (lunedi === primaSettimanaStagione) {
        tipo = 'ADATTAMENTO';
      } else if (dopoGaraPrioritaria) {
        tipo = 'RECUPERO';
      } else if (prePrioritaria) {
        tipo = 'SCARICO';
      } else if (stato.caricoNelCiclo >= p.settimaneCicloCarico - 1) {
        tipo = 'SCARICO';
      } else {
        tipo = 'CARICO';
      }

      // Rientro da stop estivo (settimana 1, 2, 3)
      let coefficienteInizioStagione = 1.0;
      if (idxSettimana === 0) {
        coefficienteInizioStagione = 0.85;
      } else if (idxSettimana === 1) {
        coefficienteInizioStagione = 0.90;
      } else if (idxSettimana === 2) {
        coefficienteInizioStagione = 0.95;
      }

      let fattoreBase: number;
      switch (tipo) {
        case 'PAUSA':
          fattoreBase = 0.0;
          break;
        case 'ADATTAMENTO':
          fattoreBase = 0.85;
          break;
        case 'SCARICO':
          fattoreBase = 0.75;
          break;
        case 'RECUPERO':
          fattoreBase = 0.60;
          break;
        case 'GARA':
          fattoreBase = garaPrioritariaInSettimana ? 0.65 : 0.90;
          break;
        case 'CARICO':
          fattoreBase = (FATTORE_FASE[fase] ?? 1.0) * (1.0 + 0.05 * stato.caricoNelCiclo);
          break;
      }

      const fattoreFinale = fattoreBase * coefficienteInizioStagione;

      if (tipo === 'CARICO') {
        stato.caricoNelCiclo++;
      } else if (tipo === 'GARA') {
        if (garaPrioritariaInSettimana) stato.caricoNelCiclo = 0;
      } else {
        stato.caricoNelCiclo = 0;
      }

      const previste = p.giorniAllenamento.length;
      const noteSpecifiche: string[] = [];
      if (idxSettimana >= 0 && idxSettimana <= 2) {
        noteSpecifiche.push(
          `Rientro da pausa estiva: volume agonistico ${Math.round(coefficienteInizioStagione * 100)}% (focus A1/A2 e reattività D, no lattacido)`
        );
      }
      if (garaSecondariaInSettimana && !garaPrioritariaInSettimana) {
        noteSpecifiche.push('Gara di passaggio B-Race: mantenuta la continuità di carico');
      }
      if (tipo !== 'PAUSA' && giorniUtili.length < previste) {
        noteSpecifiche.push(`${giorniUtili.length} sedute su ${previste} (chiusure/festività)`);
      }

      return {
        id: 0,
        mesocicloId: 0,
        inizio: lunedi,
        fine: domenica,
        tipo,
        sedutePreviste: giorniUtili.length,
        volumeTargetMetri: Math.round(giorniUtili.length * p.metriBaseSeduta * fattoreFinale),
        note: noteSpecifiche.join(' · '),
        bloccato: false
      };
    });
  }
}

type Int = number;
