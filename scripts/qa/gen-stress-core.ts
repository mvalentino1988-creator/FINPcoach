/**
 * Generatore deterministico del dataset di stress "100 atleti / 48 presenti".
 *
 * - PRNG mulberry32 con seme fisso: stesso seme => stesso JSON.
 * - Produce un oggetto nel formato esatto del backup validato dall'app
 *   (vedi src/data/backupValidate.ts e FINPStorage.exportBackup).
 * - Tutti i dati sono SIMULATI: cognomi con prefisso "SIM-", gare con nome
 *   "SIM-..." e meta.simulato = true. MAI usare in file reali dell'app.
 * - I tempi sono calibrati sui record reali di public/data/records.json
 *   (record ITA della classe/evento/vasca × fattore, mai sotto il record).
 *
 * Usato da scripts/qa/gen-stress.mjs (bundle esbuild) e da Vitest (C1).
 */
import recordsPayload from '../../public/data/records.json';
import { GaraProgramma, gareAmmesse } from '../../src/domain/gareAmmissibili';
import { Festivita } from '../../src/domain/festivita';
import { PianoGenerator } from '../../src/domain/pianoGenerator';
import { addDays, getDayOfWeek, isAfter, isBefore, setDayOfWeekInWeek } from '../../src/domain/dateUtils';
import {
  Assenza,
  Atleta,
  Chiusura,
  CondizioneMedica,
  Gara,
  ImpostazioniPiano,
  IscrizioneGara,
  LogSeduta,
  MacroGen,
  Macrociclo,
  Mesociclo,
  Microciclo,
  Stagione,
  Stile,
  Tempo,
} from '../../src/types';

export const SEME_DEFAULT = 20261119;
export const OGGI_PROVA = '2026-11-19';
export const NUMERO_PROVA_PRESENTI = 48;

/** Opzioni del generatore (QUINTO GIRO 3.1). Tutte deterministiche. */
export interface OpzioniStress {
  /** Numero di atleti (default 100). */
  atleti?: number;
  /** Numero di stagioni: 1 = solo l'attiva; >1 aggiunge stagioni passate come storico. */
  stagioni?: number;
  /** Presenti attesi nel giorno di prova (default 48). */
  presenti?: number;
  /** Data del giorno di prova (default OGGI_PROVA = 2026-11-19). */
  oggiProva?: string;
}

/** Lunghezza in giorni di una stagione simulata (per lo storico). */
const GIORNI_STAGIONE = 274;

// ---------------------------------------------------------------- PRNG

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  f(): number {
    return this.next();
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

// ---------------------------------------------------------------- records

interface RecordFINP {
  v: number;
  g: string;
  ev: string;
  cl: string;
  t: string;
  cat: string;
  tm: string;
}

const RECORDS = (recordsPayload as { records: RecordFINP[] }).records;

/** "01:36.57" -> centesimi (6235 = 1:02.35). */
function parseTm(tm: string): number | null {
  const m = /^(\d+):(\d{2})\.(\d{2})$/.exec(tm.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 6000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
}

/** Indice record ITA per (classe, evento, vasca). Preferisce cat 'Assoluto'. */
const RECORD_ITA = new Map<string, { centesimi: number; cat: string }>();
for (const r of RECORDS) {
  if (r.t !== 'ITA') continue;
  const c = parseTm(r.tm);
  if (c == null) continue;
  const key = `${r.cl}|${r.ev}|${r.v}`;
  const cur = RECORD_ITA.get(key);
  if (!cur || (cur.cat !== 'Assoluto' && r.cat === 'Assoluto')) {
    RECORD_ITA.set(key, { centesimi: c, cat: r.cat });
  }
}

const STILE_EVENTO: Record<Stile, string> = {
  STILE_LIBERO: 'Stile Libero',
  DORSO: 'Dorso',
  RANA: 'Rana',
  FARFALLA: 'Farfalla',
  MISTI: 'Misti',
};

function classePerFamiglia(atleta: Atleta, famiglia: GaraProgramma['famiglia']): string | null {
  const n = famiglia === 'S' ? atleta.classeS : famiglia === 'SB' ? atleta.classeSB : atleta.classeSM;
  return n == null ? null : `${famiglia}${n}`;
}

function recordPer(classe: string, gara: GaraProgramma, vasca: number): number | null {
  const ev = `${gara.distanza} ${STILE_EVENTO[gara.stile]}`;
  return RECORD_ITA.get(`${classe}|${ev}|${vasca}`)?.centesimi ?? null;
}

// ---------------------------------------------------------------- date

function randomDateISO(rng: Rng, da: string, a: string): string {
  const t0 = Date.parse(da + 'T00:00:00Z');
  const t1 = Date.parse(a + 'T00:00:00Z');
  const t = t0 + Math.floor(rng.f() * ((t1 - t0) / 86400000 + 1)) * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- generator

export interface DatasetStress {
  backup: Record<string, unknown>;
  manifest: Record<string, unknown>;
}

export function generaDatasetStress(seme: number = SEME_DEFAULT, opts: OpzioniStress = {}): DatasetStress {
  const rng = new Rng(seme);
  const incongruenze: Record<string, unknown>[] = [];
  const N_ATLETI = Math.max(1, Math.floor(opts.atleti ?? 100));
  const N_STAGIONI = Math.max(1, Math.floor(opts.stagioni ?? 1));
  const N_PRESENTI = Math.max(1, Math.floor(opts.presenti ?? NUMERO_PROVA_PRESENTI));

  // ---------------- Stagione e calendario gare SIMULATO ----------------
  const stagione: Stagione & { meta?: { simulato: boolean } } = {
    id: 1,
    nome: 'SIM-Stagione 2026/27 (dati simulati)',
    inizio: '2026-09-07',
    fine: '2027-06-13',
    vascaMetri: 25,
    meta: { simulato: true },
  };

  const nomiGara = [
    'SIM-Trofeo Regionale Estivo',
    'SIM-Meeting Invernale Nord',
    'SIM-Coppa Primaverile',
    'SIM-Giochi della Gioventù SIM',
    'SIM-Championship SIM-Open',
    'SIM-Trofeo del Sud',
    'SIM-Meeting Assoluti',
    'SIM-Coppa delle Classifiche',
    'SIM-Trofeo Estivo Finale',
    'SIM-Meeting ParaYouth',
    'SIM-Gare della Salute SIM',
    'SIM-Trofeo Inclusione',
    'SIM-Meeting Nazionale Under',
    'SIM-Campionato SIM 2027',
    'SIM-Trofeo di Chiusura',
  ];
  const luoghiGara = ['SIM-Piscina Nord', 'SIM-Polisportivo Est', 'SIM-Centro Caribe', 'SIM-Impianto Ovest'];

  const gare: (Gara & { meta?: { simulato: boolean } })[] = [];
  const N_GARE = rng.int(13, 16);
  for (let i = 0; i < N_GARE; i++) {
    // Date distribuite tra ottobre 2026 e giugno 2027, passo ~3-4 settimane.
    const base = Date.parse('2026-10-10T00:00:00Z') + i * Math.floor(240 * 86400000 / N_GARE) + rng.int(0, 13) * 86400000;
    const d0 = new Date(base).toISOString().slice(0, 10);
    const d1 = addDays(d0, rng.int(0, 2));
    gare.push({
      id: i + 1,
      stagioneId: 1,
      nome: `${nomiGara[i % nomiGara.length]} ${i + 1}`,
      dal: d0,
      al: d1,
      luogo: rng.pick(luoghiGara),
      prioritaria: i < rng.int(2, 4),
      meta: { simulato: true },
    });
  }

  // ---------------- Chiusure ----------------
  const chiusureBase = Festivita.perStagione(stagione).map((c, i) => ({ ...c, id: i + 1 }));
  const chiusure: Chiusura[] = [
    ...chiusureBase,
    { id: 9001, stagioneId: 1, dal: '2026-12-24', al: '2027-01-03', motivo: 'SIM-Pausa natalizia' },
    { id: 9002, stagioneId: 1, dal: '2027-04-05', al: '2027-04-07', motivo: 'SIM-Ponte pasquale' },
  ];

  // ---------------- Atleti ----------------
  const NOMI = [
    'Andrea', 'Beatrice', 'Carlo', 'Daria', 'Elena', 'Fabio', 'Ginevra', 'Hugo', 'Irene', 'Juri',
    'Katia', 'Lorenzo', 'Marta', 'Nicolò', 'Olga', 'Paolo', 'Rosa', 'Samuele', 'Teresa', 'Ugo',
    'Valeria', 'Walter', 'Xenia', 'Yuri', 'Zoe', 'Alessia', 'Bruno', 'Clara', 'Domenico', 'Emma',
    'Francesco', 'Giorgia', 'Ivan', 'Livia', 'Marco', 'Nadia', 'Oscar', 'Paola', 'Riccardo', 'Sara',
  ];
  const COGNOMI = [
    'SIM-Rossi', 'SIM-Bianchi', 'SIM-Esport', 'SIM-Giallo', 'SIM-Blu', 'SIM-Verde', 'SIM-Rosso',
    'SIM-Gialli', 'SIM-Azzurri', 'SIM-Nei', 'SIM-Bianchi2', 'SIM-DelVecchio', 'SIM-DiMarco',
    'SIM-DellaRossa', 'SIM-DegliEs', 'SIM-DeLuca', 'SIM-DiPietro', 'SIM-DaVinci', 'SIM-Santa',
    'SIM-SanGiovanni', 'SIM-VillaNuova', 'SIM-Picozzi', 'SIM-Casazza', 'SIM-Lombra',
  ];
  // Cognomi composti extra per superare i 12 caratteri (totale con "SIM-" fino a 16).
  const COGNOMI_LUNGHI = [
    'SIM-DellaPorta', 'SIM-DiSanLorenzo', 'SIM-DeiMontiVerdi', 'SIM-SantaMargherita',
    'SIM-VillaDelLago', 'SIM-DeiColliAzzurri',
  ];

  const NOTE_POOL = [
    '',
    'Atleta simulato per test di carico.',
    'Richiede attrezzatura specifica (simulato).',
    'Doppio allenamento some weeks (simulato).',
    'Preferisce vasca da 50m (simulato).',
    'In fase di rientro programmato (simulato).',
    'Simulazione dati stress: nessun dato reale.',
    'Atleta con disponibilità ridotta nel weekend (simulato).',
  ];
  const ECCEZIONI = ['*', 'T', 'A', 'Y', 'E', '7', '9'];

  const atleti: Atleta[] = [];
  for (let i = 1; i <= N_ATLETI; i++) {
    const eta = rng.int(12, 65);
    const annoNascita = 2026 - eta;
    const mese = rng.int(1, 12);
    const giorno = rng.int(1, 28);
    const classeS = rng.int(1, 14);
    // SB1-SB9 e SB11-SB14 (SB10 non esiste), coerente con S +/-1.
    const sbPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14];
    const sbVicino = Math.min(14, Math.max(1, classeS + rng.int(-1, 1)));
    const classeSB = sbVicino === 10 ? 9 : sbPool.includes(sbVicino) ? sbVicino : rng.pick(sbPool);
    const classeSM = Math.min(14, Math.max(1, classeS + rng.int(-1, 1)));

    const cognomeBase = rng.chance(0.2) ? rng.pick(COGNOMI_LUNGHI) : rng.pick(COGNOMI);
    atleti.push({
      id: i,
      nome: rng.pick(NOMI),
      cognome: cognomeBase,
      dataNascita: `${annoNascita}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`,
      classeS,
      classeSB,
      classeSM,
      stato: rng.chance(0.82) ? 'UFFICIALE' : 'IN_ATTESA',
      fattoreVolume: Math.round((0.6 + rng.f() * 0.4) * 100) / 100,
      note: rng.pick(NOTE_POOL),
      volumeAuto: rng.chance(0.75),
      ...(rng.chance(0.15)
        ? { codiciEccezione: [rng.pick(ECCEZIONI), ...(rng.chance(0.3) ? [rng.pick(ECCEZIONI)] : [])] }
        : {}),
    });
  }

  // ---------------- Condizioni mediche (~40 atleti) ----------------
  const CONDIZIONI = [
    ['Minorazione visiva simulata', 'Allenamenti con illuminazione ridotta e segnali acustici.'],
    ['Limitazione arti inferiori simulata', 'Evitare pull-buoy nei primissimi anni; tecnica di virata curata.'],
    ['Condizione neurologica simulata', 'Recupero più lungo tra le serie intense.'],
    ['Condizione cardiorespiratoria simulata', 'Monitorare RPE oltre 8; niente serie lattacido estreme.'],
    ['Condizione osteoarticolare simulata', 'Limitare i chilometri di rana e farfalla ad alto volume.'],
    ['Condizione visiva parziale simulata', 'Tappetini di segnalazione sempre posizionati.'],
    ['Condizione metabolica simulata', 'Idratazione controllata; evitare doppie sedute consecutive intense.'],
    ['Condizione muscolo-scheletrica simulata', 'Carico di spalle monitorato; niente pull-infiniti.'],
    ['Condizione termoregolazione simulata', 'Attenzione a vasca fredda e recupero post-allenamento.'],
    ['Condizione coordinazione simulata', 'Esercizi di virata semplificati nelle prime settimane.'],
  ];
  const condizioni: CondizioneMedica[] = [];
  const atletiConCondizione = new Set<number>();
  while (atletiConCondizione.size < Math.max(1, Math.round(N_ATLETI * 0.4))) {
    atletiConCondizione.add(rng.int(1, N_ATLETI));
  }
  let condId = 1;
  for (const atletaId of [...atletiConCondizione].sort((a, b) => a - b)) {
    const [descrizione, limitazioni] = rng.pick(CONDIZIONI);
    condizioni.push({ id: condId++, atletaId, descrizione: `SIM-${descrizione}`, limitazioni: `${limitazioni} (simulato)`, attiva: true });
  }

  // ---------------- Assenze (~60 atleti) ----------------
  const assenze: Assenza[] = [];
  let assenzaId = 1;
  const atletiConAssenze = new Set<number>();
  while (atletiConAssenze.size < Math.max(1, Math.round(N_ATLETI * 0.6))) {
    atletiConAssenze.add(rng.int(1, N_ATLETI));
  }
  // 20 atleti con assenza che copre il giorno di prova (2026-11-19).
  const atletiAssentiProva = new Set<number>();
  while (atletiAssentiProva.size < Math.min(N_ATLETI - N_PRESENTI, Math.max(1, Math.round(N_ATLETI * 0.2)))) {
    atletiAssentiProva.add(rng.int(1, N_ATLETI));
  }

  const garePerAssenza = gare.filter(g => g.dal >= stagione.inizio && g.al <= stagione.fine);

  for (const atletaId of [...atletiConAssenze].sort((a, b) => a - b)) {
    const nPeriodi = rng.int(1, 3);
    for (let p = 0; p < nPeriodi; p++) {
      const tipo = rng.f();
      let dal: string;
      let al: string;
      let ambito: Assenza['ambito'] = 'TUTTO';
      let garaId: number | undefined;
      if (tipo < 0.35) {
        // Infortunio lungo: 3-8 settimane, TUTTO.
        dal = randomDateISO(rng, stagione.inizio, addDays(stagione.fine, -60));
        al = addDays(dal, rng.int(20, 55));
        if (isAfter(al, stagione.fine)) al = stagione.fine;
        ambito = 'TUTTO';
      } else if (tipo < 0.6) {
        // Periodo di sola astensione dagli allenamenti.
        dal = randomDateISO(rng, stagione.inizio, addDays(stagione.fine, -14));
        al = addDays(dal, rng.int(4, 14));
        ambito = 'ALLENAMENTO';
      } else if (tipo < 0.85 && garePerAssenza.length > 0) {
        // Assenza a una gara specifica.
        const g = rng.pick(garePerAssenza);
        garaId = g.id;
        dal = addDays(g.dal, -rng.int(0, 3));
        al = addDays(g.dal, rng.int(0, 3));
        ambito = 'GARA';
      } else {
        // Breve stop totale.
        dal = randomDateISO(rng, stagione.inizio, addDays(stagione.fine, -10));
        al = addDays(dal, rng.int(3, 8));
        ambito = 'TUTTO';
      }
      assenze.push({
        id: assenzaId++,
        atletaId,
        dal,
        al: isAfter(al, stagione.fine) ? stagione.fine : al,
        motivo: rng.pick(['SIM-Infortunio', 'SIM-Esami', 'SIM-Vacanze', 'SIM-Carico eccessivo', 'SIM-Recupero']),
        ambito,
        ...(garaId != null ? { garaId } : {}),
      });
    }
  }

  // Assenze che coprono il giorno di prova per 20 atleti designati.
  for (const atletaId of atletiAssentiProva) {
    assenze.push({
      id: assenzaId++,
      atletaId,
      dal: '2026-11-17',
      al: '2026-11-21',
      motivo: 'SIM-Assenza prova',
      ambito: 'TUTTO',
    });
  }

  // ---------------- Piano (PianoGenerator reale) ----------------
  const parametriPerGiorno: NonNullable<ImpostazioniPiano['parametriPerGiorno']> = {};
  for (const dow of [1, 2, 4, 6] as const) {
    parametriPerGiorno[dow] = { vascaMetri: 25, durataMin: 90, numeroCorsie: 6 };
  }
  const impostazioni: ImpostazioniPiano = {
    giorni: [1, 2, 4, 6],
    metriBaseSeduta: 2500,
    numeroMacrocicli: 2,
    settimaneCicloCarico: 3,
    durataDefaultMin: 90,
    parametriPerGiorno,
  };

  const parametriPiano = {
    giorniAllenamento: [1, 2, 4, 6] as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
    numeroMacrocicli: 2,
    metriBaseSeduta: 2500,
    settimaneCicloCarico: 3,
  };

  const planGen = PianoGenerator.genera(stagione, chiusure, gare, parametriPiano);
  let macroId = 1, mesoId = 1, microId = 1;
  const macro: Macrociclo[] = [];
  const meso: Mesociclo[] = [];
  const micro: Microciclo[] = [];
  for (const mg of planGen as MacroGen[]) {
    const maId = macroId++;
    macro.push({ ...mg.macro, id: maId, stagioneId: stagione.id });
    for (const me of mg.meso) {
      const meId = mesoId++;
      meso.push({ ...me.meso, id: meId, macrocicloId: maId });
      for (const mi of me.micro) {
        micro.push({ ...mi, id: microId++, mesocicloId: meId });
      }
    }
  }

  // ---------------- Iscrizioni alle gare ----------------
  const iscrizioniGare: IscrizioneGara[] = [];
  let iscrizioneId = 1;
  const gareOrdinatate = [...gare].sort((a, b) => a.dal.localeCompare(b.dal));
  for (const gara of gareOrdinatate) {
    for (const atleta of atleti) {
      const ammesse = gareAmmesse({ classeS: atleta.classeS, classeSB: atleta.classeSB, classeSM: atleta.classeSM });
      if (ammesse.length === 0) continue;
      if (!rng.chance(0.38)) continue;
      const nEventi = rng.int(1, Math.min(3, ammesse.length));
      const scelte = new Set<number>();
      const eventi = [];
      while (eventi.length < nEventi) {
        const idx = rng.int(0, ammesse.length - 1);
        if (scelte.has(idx)) continue;
        scelte.add(idx);
        const g = ammesse[idx];
        eventi.push({ stile: g.stile, distanzaMetri: g.distanza });
      }
      // Coerenza con le assenze: se un'assenza copre il periodo della gara,
      // l'iscrizione NON può essere ISCRITTO (salvo incongruenze volute sotto).
      const garaObj = gare.find(g => g.id === gara.id)!;
      const assenzaCheCopre = assenze.some(a => {
        if (a.atletaId !== atleta.id) return false;
        const amb = a.ambito ?? 'TUTTO';
        if (amb === 'ALLENAMENTO') return false;
        if (amb === 'GARA' && a.garaId != null && a.garaId !== gara.id) return false;
        return !(isAfter(a.dal, garaObj.al) || isBefore(a.al, garaObj.dal));
      });
      const r = rng.f();
      iscrizioniGare.push({
        id: iscrizioneId++,
        garaId: gara.id,
        atletaId: atleta.id,
        eventi,
        stato: assenzaCheCopre ? 'ASSENTE' : r < 0.88 ? 'ISCRITTO' : r < 0.95 ? 'RITIRATO' : 'ASSENTE',
      });
    }
  }

  // Incongruenze volute: alcune iscrizioni ISCRITTO con assenza che copre la gara.
  const iscrizioniConAssenza = iscrizioniGare.filter(is => {
    const gara = gare.find(g => g.id === is.garaId);
    if (!gara) return false;
    return assenze.some(a => {
      if (a.atletaId !== is.atletaId) return false;
      const amb = a.ambito ?? 'TUTTO';
      if (amb === 'ALLENAMENTO') return false;
      if (amb === 'GARA' && a.garaId != null && a.garaId !== gara.id) return false;
      return !(isAfter(a.dal, gara.al) || isBefore(a.al, gara.dal));
    });
  });
  for (const is of iscrizioniConAssenza.slice(0, 6)) {
    is.stato = 'ISCRITTO';
    const gara = gare.find(g => g.id === is.garaId)!;
    const a = assenze.find(x => x.atletaId === is.atletaId && !(isAfter(x.dal, gara.al) || isBefore(x.al, gara.dal)))!;
    incongruenze.push({
      tipo: 'iscritto_con_assenza',
      iscrizioneId: is.id,
      garaId: gara.id,
      atletaId: is.atletaId,
      assenzaId: a.id,
      descrizione: 'Atleta ISCRITTO con assenza che copre il periodo della gara (avviso atteso).',
    });
  }

  // ---------------- Tempi (20-80 per atleta, 12 mesi) ----------------
  const INIZIO_TEMPI = '2025-11-19';
  const FINE_TEMPI = '2026-11-19';
  const t0 = Date.parse(INIZIO_TEMPI + 'T00:00:00Z');
  const t1 = Date.parse(FINE_TEMPI + 'T00:00:00Z');
  const spanGiorni = (t1 - t0) / 86400000;

  const tempi: Tempo[] = [];
  let tempoId = 1;
  const copertaDaAssenza = (atletaId: number, data: string, contesto: Tempo['contesto']): boolean => {
    const ambito = contesto === 'GARA' ? 'GARA' : 'ALLENAMENTO';
    return assenze.some(a => {
      if (a.atletaId !== atletaId) return false;
      if (isBefore(data, a.dal) || isAfter(data, a.al)) return false;
      const amb = a.ambito ?? 'TUTTO';
      if (amb === 'TUTTO') return true;
      if (amb === 'GARA') return ambito === 'GARA';
      return ambito === 'ALLENAMENTO';
    });
  };
  for (const atleta of atleti) {
    const ammesse = gareAmmesse({ classeS: atleta.classeS, classeSB: atleta.classeSB, classeSM: atleta.classeSM });
    const nTempi = rng.int(20, 80);
    for (let i = 0; i < nTempi; i++) {
      const g = rng.pick(ammesse);
      const classe = classePerFamiglia(atleta, g.famiglia);
      if (!classe) continue;
      const vasca = rng.chance(0.8) ? 25 : 50;
      const record = recordPer(classe, g, vasca);
      if (record == null) continue;
      const r = rng.f();
      const contesto: Tempo['contesto'] = r < 0.7 ? 'ALLENAMENTO' : r < 0.85 ? 'TEST' : 'GARA';
      // La data non deve cadere in un'assenza che copre il contesto del tempo.
      let data = randomDateISO(rng, INIZIO_TEMPI, FINE_TEMPI);
      for (let tent = 0; tent < 12 && copertaDaAssenza(atleta.id, data, contesto); tent++) {
        data = randomDateISO(rng, INIZIO_TEMPI, FINE_TEMPI);
      }
      if (copertaDaAssenza(atleta.id, data, contesto)) continue;
      const progresso = (Date.parse(data + 'T00:00:00Z') - t0) / (t1 - t0);
      // Miglioramento nel tempo: fattore da ~1.9 a ~1.05 + rumore.
      let fattore = 1.9 - (1.9 - 1.05) * progresso + (rng.f() - 0.5) * 0.06;
      let centesimi = Math.round(record * fattore);
      if (centesimi < record + 1) centesimi = record + 1; // mai sotto il record ITA
      tempi.push({
        id: tempoId++,
        atletaId: atleta.id,
        data,
        stile: g.stile,
        distanzaMetri: g.distanza,
        centesimi,
        contesto,
        vascaMetri: vasca,
        note: contesto === 'GARA' ? 'SIM-Gara' : '',
      });
    }
    // Qualche tempo di gara in data coperta da assenza (incongruenza voluta, ~3 atleti).
    if (rng.chance(0.05)) {
      const mieAssenze = assenze.filter(a => a.atletaId === atleta.id);
      if (mieAssenze.length > 0) {
        const a = rng.pick(mieAssenze);
        const g = rng.pick(ammesse);
        const classe = classePerFamiglia(atleta, g.famiglia);
        const record = classe ? recordPer(classe, g, 25) : null;
        const data = addDays(a.dal, rng.int(0, Math.max(0, Math.round((Date.parse(a.al) - Date.parse(a.dal)) / 86400000))));
        if (record != null) {
          const tempo: Tempo = {
            id: tempoId++,
            atletaId: atleta.id,
            data,
            stile: g.stile,
            distanzaMetri: g.distanza,
            centesimi: record + rng.int(50, 900),
            contesto: 'GARA',
            vascaMetri: 25,
            note: 'SIM-Incongruenza voluta',
          };
          tempi.push(tempo);
          incongruenze.push({
            tipo: 'tempo_gara_in_assenza',
            tempoId: tempo.id,
            atletaId: atleta.id,
            assenzaId: a.id,
            data,
            descrizione: 'Tempo di gara in data coperta da assenza (avviso atteso).',
          });
        }
      }
    }
  }

  // ---------------- Log sedute (tutta la stagione) ----------------
  const chiusuraInData = (data: string) => chiusure.some(c => !isBefore(data, c.dal) && !isAfter(data, c.al));
  const logSedute: LogSeduta[] = [];
  let logId = 1;
  const giorniAllenamento = impostazioni.giorni ?? [];
  for (const m of micro) {
    for (const dow of giorniAllenamento) {
      const data = setDayOfWeekInWeek(m.inizio, dow as 1 | 2 | 3 | 4 | 5 | 6 | 7);
      if (isBefore(data, stagione.inizio) || isAfter(data, stagione.fine)) continue;
      if (chiusuraInData(data)) continue;
      const param = impostazioni.parametriPerGiorno?.[dow] ?? { vascaMetri: 25, durataMin: impostazioni.durataDefaultMin ?? 90 };
      const durata = param.durataMin ?? 90;
      for (const atleta of atleti) {
        const assente = assenze.some(a => {
          if (a.atletaId !== atleta.id) return false;
          if (isBefore(data, a.dal) || isAfter(data, a.al)) return false;
          const amb = a.ambito ?? 'TUTTO';
          return amb === 'TUTTO' || amb === 'ALLENAMENTO';
        });
        const nonConvocato = !assente && rng.chance(0.08);
        const presente = !assente && !nonConvocato;
        const rpe = presente ? rng.int(4, 9) : undefined;
        // Metri coerenti con la durata: ~20-32 m/min effettivi.
        const metri = presente ? Math.round(durata * (20 + rng.f() * 12)) : 0;
        logSedute.push({
          id: logId++,
          atletaId: atleta.id,
          data,
          presente,
          durataMin: presente ? durata : 0,
          metriEffettivi: metri,
          ...(rpe != null ? { rpe } : {}),
          note: assente ? 'SIM-Assente' : nonConvocato ? 'SIM-Non convocato' : '',
        });
      }
    }
  }

  // ---------------- Storico stagioni precedenti (QUINTO GIRO 3.1) ----------------
  // Con `stagioni` > 1 le stagioni passate sono rappresentate come storico:
  // log di seduta e tempi con date coerenti nelle stagioni precedenti,
  // senza toccare il modello della stagione attiva (una sola stagione).
  const N_LOG_PRECEDENTI = { n: 0 };
  const N_TEMPI_PRECEDENTI = { n: 0 };
  for (let s = 1; s < N_STAGIONI; s++) {
    // Stagione s (1 = la più recente): fine = giorno prima dell'inizio della
    // stagione successiva, inizio = fine - GIORNI_STAGIONE.
    const fineS = addDays(stagione.inizio, -((s - 1) * GIORNI_STAGIONE + 1));
    const inizioS = addDays(fineS, -(GIORNI_STAGIONE - 1));
    const tS0 = Date.parse(inizioS + 'T00:00:00Z');
    const tS1 = Date.parse(fineS + 'T00:00:00Z');

    // Tempi della stagione passata (stessa calibrazione record, avanzamento
    // temporale coerente dentro la stagione).
    for (const atleta of atleti) {
      const ammesse = gareAmmesse({ classeS: atleta.classeS, classeSB: atleta.classeSB, classeSM: atleta.classeSM });
      if (ammesse.length === 0) continue;
      const nTempi = rng.int(8, 20);
      for (let i = 0; i < nTempi; i++) {
        const g = rng.pick(ammesse);
        const classe = classePerFamiglia(atleta, g.famiglia);
        if (!classe) continue;
        const vasca = rng.chance(0.8) ? 25 : 50;
        const record = recordPer(classe, g, vasca);
        if (record == null) continue;
        const data = randomDateISO(rng, inizioS, fineS);
        const r = rng.f();
        const contesto: Tempo['contesto'] = r < 0.65 ? 'ALLENAMENTO' : r < 0.85 ? 'TEST' : 'GARA';
        const progresso = (Date.parse(data + 'T00:00:00Z') - tS0) / Math.max(1, tS1 - tS0);
        let fattore = 1.9 - (1.9 - 1.05) * progresso + (rng.f() - 0.5) * 0.06;
        let centesimi = Math.round(record * fattore);
        if (centesimi < record + 1) centesimi = record + 1;
        tempi.push({
          id: tempoId++,
          atletaId: atleta.id,
          data,
          stile: g.stile,
          distanzaMetri: g.distanza,
          centesimi,
          contesto,
          vascaMetri: vasca,
          note: contesto === 'GARA' ? 'SIM-Gara' : 'SIM-Stagione precedente',
        });
        N_TEMPI_PRECEDENTI.n++;
      }
    }

    // Log di seduta della stagione passata: stessi giorni di allenamento,
    // ~12% di assenze simulate (non correlate alle assenze della stagione
    // attiva, che sono datate dopo).
    const paramS = { vascaMetri: 25 as const, durataMin: 90 };
    for (let t = tS0; t <= tS1; t += 86400000) {
      const data = new Date(t).toISOString().slice(0, 10);
      const dow = getDayOfWeek(data);
      if (!giorniAllenamento.includes(dow)) continue;
      for (const atleta of atleti) {
        const presente = rng.f() >= 0.12;
        const rpe = presente ? rng.int(4, 9) : undefined;
        const metri = presente ? Math.round(paramS.durataMin * (20 + rng.f() * 12)) : 0;
        logSedute.push({
          id: logId++,
          atletaId: atleta.id,
          data,
          presente,
          durataMin: presente ? paramS.durataMin : 0,
          metriEffettivi: metri,
          ...(rpe != null ? { rpe } : {}),
          note: presente ? 'SIM-Stagione precedente' : 'SIM-Assente',
        });
        N_LOG_PRECEDENTI.n++;
      }
    }
  }

  // ---------------- Giorno di prova: esattamente 48 presenti ----------------
  const provaData = opts.oggiProva ?? OGGI_PROVA;
  const provaDow = getDayOfWeek(provaData);
  // Garantisce che il giorno di prova sia un giorno di allenamento.
  if (!impostazioni.giorni!.includes(provaDow)) {
    impostazioni.giorni = [...impostazioni.giorni!, provaDow].sort() as ImpostazioniPiano['giorni'];
    parametriPerGiorno[provaDow] = { vascaMetri: 25, durataMin: 90, numeroCorsie: 6 };
    impostazioni.parametriPerGiorno = parametriPerGiorno;
    impostazioni.overrideSedute = {
      ...(impostazioni.overrideSedute ?? {}),
      [provaData]: { vascaMetri: 25, durataMin: 90, numeroCorsie: 6 },
    };
  }

  const assenteInProva = (atletaId: number) =>
    assenze.some(a => {
      if (a.atletaId !== atletaId) return false;
      if (isBefore(provaData, a.dal) || isAfter(provaData, a.al)) return false;
      const amb = a.ambito ?? 'TUTTO';
      return amb === 'TUTTO' || amb === 'ALLENAMENTO';
    });

  const nonAssenti = atleti.filter(a => !assenteInProva(a.id)).map(a => a.id);
  const presentiIds = nonAssenti.slice(0, N_PRESENTI);
  const manifestPresenti = {
    data: provaData,
    giornoSettimana: provaDow,
    presenti: presentiIds.length,
    attesi: N_PRESENTI,
    assentiPerAssenza: atleti.filter(a => assenteInProva(a.id)).length,
    nonConvocati: N_ATLETI - presentiIds.length - atleti.filter(a => assenteInProva(a.id)).length,
  };

  impostazioni.overrideSedute = {
    ...(impostazioni.overrideSedute ?? {}),
    [provaData]: { vascaMetri: 25, durataMin: 90, numeroCorsie: 6, atletiPresentiIds: presentiIds },
  };

  // ---------------- Backup finale ----------------
  const backup: Record<string, unknown> = {
    version: '1.1',
    timestamp: '2026-11-19T08:00:00.000Z',
    atleti,
    condizioni,
    assenze,
    tempi,
    logSedute,
    stagione,
    chiusure,
    gare,
    iscrizioniGare,
    macrocicli: macro,
    mesocicli: meso,
    microcicli: micro,
    impostazioni,
    customWorkouts: [],
    assegnazioneVasca: null,
    mode: 'live',
    meta: { simulato: true, generatore: 'gen-stress.mjs', seme, atleti: N_ATLETI, stagioni: N_STAGIONI, presenti: N_PRESENTI },
  };

  const manifest = {
    meta: { simulato: true, seme, generatoPer: `collaudo stress ${N_ATLETI} atleti x ${N_STAGIONI} stagioni` },
    parametri: { atleti: N_ATLETI, stagioni: N_STAGIONI, presenti: N_PRESENTI },
    conteggi: {
      atleti: atleti.length,
      condizioni: condizioni.length,
      assenze: assenze.length,
      tempi: tempi.length,
      logSedute: logSedute.length,
      gare: gare.length,
      iscrizioniGare: iscrizioniGare.length,
      macrocicli: macro.length,
      mesocicli: meso.length,
      microcicli: micro.length,
      logSedutePrecedenti: N_LOG_PRECEDENTI.n,
      tempiPrecedenti: N_TEMPI_PRECEDENTI.n,
    },
    giornoProva: manifestPresenti,
    incongruenzeVolute: incongruenze,
    note: 'Tutti i dati sono simulati. Le incongruenze elencate in incongruenzeVolute sono volute e devono generare avvisi, non errori di validazione.',
  };

  return { backup, manifest };
}
