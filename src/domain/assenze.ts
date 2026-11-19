import {
  Assenza,
  Atleta,
  Avviso,
  Gara,
  IscrizioneGara,
  Tempo,
  AmbitoAssenza,
} from '../types';
import { formattaData, isAfter, isBefore } from './dateUtils';

/** Ambiti di contesto per cui una assenza può contare. */
export type AmbitoPresenza = 'ALLENAMENTO' | 'GARA';

/**
 * Vero se l'assenza copre `ambito` per una data. 'TUTTO' copre entrambi;
 * 'ALLENAMENTO' non copre le gare; 'GARA' non copre gli allenamenti.
 * `ambitoEffettivo` dell'assenza: se assente, vale 'TUTTO' (retrocompatibile).
 */
export function assenzaCopreAmbito(a: Assenza, ambito: AmbitoPresenza): boolean {
  const amb = a.ambito ?? 'TUTTO';
  if (amb === 'TUTTO') return true;
  if (amb === 'GARA' && a.garaId != null) {
    // Un'assenza a gara specifica copre solo QUELLA gara, non tutte.
    return ambito === 'GARA';
  }
  return amb === ambito;
}

/**
 * Funzione unica per sapere se un atleta è assente in una data per un
 * ambito (allenamento o gara). Usata da VolumeIndividuale, AtletaValidator,
 * Registro/ACWR, PianoGenerator, parametri seduta, Regia e Cronometro.
 */
export function isAssenteInData(
  atletaId: number,
  data: string,
  assenze: Assenza[],
  ambito: AmbitoPresenza = 'ALLENAMENTO',
  garaId?: number
): boolean {
  return assenze.some(a => {
    if (a.atletaId !== atletaId) return false;
    if (isBefore(data, a.dal) || isAfter(data, a.al)) return false;
    if (!assenzaCopreAmbito(a, ambito)) return false;
    // Se si chiede una gara specifica e l'assenza è legata a un'altra gara, non copre.
    if (ambito === 'GARA' && garaId != null && a.ambito === 'GARA' && a.garaId != null && a.garaId !== garaId) {
      return false;
    }
    return true;
  });
}

/** Giorni di assenza (ambito allenamento) coperti nel periodo [dal, al]. */
export function giorniAssentiInPeriodo(
  atletaId: number,
  dal: string,
  al: string,
  assenze: Assenza[]
): number {
  // Intersezioni tra le assenze dell'atleta e il periodo, unite per non
  // contare due volte periodi sovrapposti.
  const intersezioni: { dal: string; al: string }[] = [];
  for (const a of assenze) {
    if (a.atletaId !== atletaId) continue;
    if (!assenzaCopreAmbito(a, 'ALLENAMENTO')) continue;
    const d1 = a.dal > dal ? a.dal : dal;
    const d2 = a.al < al ? a.al : al;
    if (d1 <= d2) intersezioni.push({ dal: d1, al: d2 });
  }
  intersezioni.sort((x, y) => x.dal.localeCompare(y.dal));
  let giorni = 0;
  let cur: { dal: string; al: string } | null = null;
  const chiudi = () => {
    if (cur) {
      giorni += daysBetweenISO(cur.dal, cur.al) + 1;
      cur = null;
    }
  };
  for (const iv of intersezioni) {
    if (cur && iv.dal <= addDaysISO(cur.al, 1)) {
      if (iv.al > cur.al) cur.al = iv.al;
    } else {
      chiudi();
      cur = { ...iv };
    }
  }
  chiudi();
  return giorni;
}

function daysBetweenISO(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
function addDaysISO(d: string, n: number): string {
  const dt = new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000);
  return dt.toISOString().slice(0, 10);
}

export function normalizzaAmbitoAssenza(v: unknown): AmbitoAssenza {
  return v === 'ALLENAMENTO' || v === 'GARA' ? v : 'TUTTO';
}

export function normalizzaAssenza(a: Assenza): Assenza {
  const ambito = normalizzaAmbitoAssenza(a.ambito);
  const out: Assenza = { ...a, ambito };
  if (ambito !== 'GARA') delete out.garaId;
  else if (typeof out.garaId !== 'number') delete out.garaId;
  return out;
}

export function normalizzaIscrizione(i: IscrizioneGara): IscrizioneGara {
  const stati: IscrizioneGara['stato'][] = ['ISCRITTO', 'RITIRATO', 'ASSENTE'];
  const stato = stati.includes(i.stato) ? i.stato : 'ISCRITTO';
  const eventi = Array.isArray(i.eventi)
    ? i.eventi
        .filter(e => e && typeof e.distanzaMetri === 'number' && e.distanzaMetri > 0)
        .map(e => ({
          stile: e.stile,
          distanzaMetri: e.distanzaMetri,
          ...(typeof e.tempoIscrizioneCentesimi === 'number' && e.tempoIscrizioneCentesimi > 0
            ? { tempoIscrizioneCentesimi: e.tempoIscrizioneCentesimi }
            : {}),
        }))
    : [];
  return { ...i, stato, eventi };
}

/**
 * Avvisi di coerenza iscrizioni/assenze:
 *  - atleta ISCRITTO a una gara in una data coperta da un'assenza (TUTTO o GARA
 *    che copre quella gara) → ATTENZIONE;
 *  - atleta RITIRATO/ASSENTE con assenza GARA coerente → nessun avviso (coerente).
 */
export function avvisiIscrizioniGare(
  iscrizioni: IscrizioneGara[],
  assenze: Assenza[],
  gare: Gara[],
  atleti: Atleta[]
): Avviso[] {
  const avvisi: Avviso[] = [];
  const nomeAtleta = (id: number) => {
    const a = atleti.find(x => x.id === id);
    return a ? `${a.nome} ${a.cognome}`.trim() : `atleta ${id}`;
  };
  for (const is of iscrizioni) {
    if (is.stato !== 'ISCRITTO') continue;
    const gara = gare.find(g => g.id === is.garaId);
    if (!gara) continue;
    // La gara "copre" un intervallo: l'assenza rileva se interseca [gara.dal, gara.al]
    // e in particolare la data di gara (si usa gara.dal come riferimento).
    const coperta = assenze.some(a => {
      if (a.atletaId !== is.atletaId) return false;
      if (!assenzaCopreAmbito(a, 'GARA')) return false;
      // Intersezione periodi
      if (isAfter(a.dal, gara.al) || isBefore(a.al, gara.dal)) return false;
      if (a.ambito === 'GARA' && a.garaId != null && a.garaId !== gara.id) return false;
      return true;
    });
    if (coperta) {
      avvisi.push({
        gravita: 'ATTENZIONE',
        messaggio: `${nomeAtleta(is.atletaId)} risulta ISCRITTO a "${gara.nome}" ma ha un'assenza che copre il periodo della gara`,
      });
    }
  }
  return avvisi;
}

/**
 * Avviso di coerenza: un Tempo con contesto GARA in una data coperta da
 * un'assenza (ambito TUTTO o GARA) per quell'atleta.
 */
export function avvisiTempiInAssenza(tempi: Tempo[], assenze: Assenza[]): Avviso[] {
  const avvisi: Avviso[] = [];
  for (const t of tempi) {
    if (t.contesto !== 'GARA') continue;
    if (!isAssenteInData(t.atletaId, t.data, assenze, 'GARA')) continue;
    avvisi.push({
      gravita: 'ATTENZIONE',
      messaggio: `Tempo di gara del ${formattaData(t.data)} registrato in un periodo di assenza (atleta ${t.atletaId})`,
    });
  }
  return avvisi;
}
