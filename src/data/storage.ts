import {
  Assenza,
  Atleta,
  Chiusura,
  CondizioneMedica,
  Gara,
  ImpostazioniPiano,
  LogSeduta,
  Macrociclo,
  Mesociclo,
  Microciclo,
  Stagione,
  Tempo
} from '../types';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { Festivita } from '../domain/festivita';
import { PianoGenerator } from '../domain/pianoGenerator';

const STORAGE_KEYS = {
  ATLETI: 'finp_atleti',
  CONDIZIONI: 'finp_condizioni',
  ASSENZE: 'finp_assenze',
  TEMPI: 'finp_tempi',
  LOG_SEDUTE: 'finp_log_sedute',
  STAGIONE: 'finp_stagione',
  CHIUSURE: 'finp_chiusure',
  GARE: 'finp_gare',
  MACROCICLI: 'finp_macrocicli',
  MESOCICLI: 'finp_mesocicli',
  MICROCICLI: 'finp_microcicli',
  IMPOSTAZIONI: 'finp_impostazioni',
  FIRMA_PIANO: 'finp_firma_piano',
  CLASSI_STIMATE: 'finp_classi_stimate',
  CUSTOM_WORKOUTS: 'finpcoach_custom_workouts'
};

function load<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export class FINPStorage {
  static getCustomWorkouts(): any[] {
    return load<any[]>(STORAGE_KEYS.CUSTOM_WORKOUTS, []);
  }

  static saveCustomWorkouts(workouts: any[]) {
    save(STORAGE_KEYS.CUSTOM_WORKOUTS, workouts);
  }

  static getAtleti(): Atleta[] {
    const list = load<Atleta[]>(STORAGE_KEYS.ATLETI, []);
    if (list.length === 0) {
      const initial = this.createSeedAtleti();
      save(STORAGE_KEYS.ATLETI, initial);
      return initial;
    }
    return list;
  }

  static saveAtleti(atleti: Atleta[]) {
    save(STORAGE_KEYS.ATLETI, atleti);
  }

  static getCondizioni(): CondizioneMedica[] {
    const list = load<CondizioneMedica[]>(STORAGE_KEYS.CONDIZIONI, []);
    if (list.length === 0) {
      const initial = this.createSeedCondizioni();
      save(STORAGE_KEYS.CONDIZIONI, initial);
      return initial;
    }
    return list;
  }

  static saveCondizioni(cond: CondizioneMedica[]) {
    save(STORAGE_KEYS.CONDIZIONI, cond);
  }

  static getAssenze(): Assenza[] {
    return load<Assenza[]>(STORAGE_KEYS.ASSENZE, []);
  }

  static saveAssenze(ass: Assenza[]) {
    save(STORAGE_KEYS.ASSENZE, ass);
  }

  static getTempi(): Tempo[] {
    const list = load<Tempo[]>(STORAGE_KEYS.TEMPI, []);
    if (list.length === 0) {
      const initial = this.createSeedTempi();
      save(STORAGE_KEYS.TEMPI, initial);
      return initial;
    }
    return list;
  }

  static saveTempi(tempi: Tempo[]) {
    save(STORAGE_KEYS.TEMPI, tempi);
  }

  static getLogSedute(): LogSeduta[] {
    const list = load<LogSeduta[]>(STORAGE_KEYS.LOG_SEDUTE, []);
    if (list.length === 0) {
      const initial = this.createSeedLog();
      save(STORAGE_KEYS.LOG_SEDUTE, initial);
      return initial;
    }
    return list;
  }

  static saveLogSedute(log: LogSeduta[]) {
    save(STORAGE_KEYS.LOG_SEDUTE, log);
  }

  static getStagione(): Stagione | null {
    const s = load<Stagione | null>(STORAGE_KEYS.STAGIONE, null);
    if (!s) {
      const initial = this.createSeedStagione();
      save(STORAGE_KEYS.STAGIONE, initial);
      return initial;
    }
    return s;
  }

  static saveStagione(stagione: Stagione | null) {
    save(STORAGE_KEYS.STAGIONE, stagione);
  }

  static getChiusure(): Chiusura[] {
    const list = load<Chiusura[]>(STORAGE_KEYS.CHIUSURE, []);
    if (list.length === 0) {
      const s = this.getStagione();
      if (s) {
        const initial = Festivita.perStagione(s).map((c, i) => ({ ...c, id: i + 1 }));
        save(STORAGE_KEYS.CHIUSURE, initial);
        return initial;
      }
    }
    return list;
  }

  static saveChiusure(chiusure: Chiusura[]) {
    save(STORAGE_KEYS.CHIUSURE, chiusure);
  }

  static getGare(): Gara[] {
    const list = load<Gara[]>(STORAGE_KEYS.GARE, []);
    if (list.length === 0) {
      const initial = this.createSeedGare();
      save(STORAGE_KEYS.GARE, initial);
      return initial;
    }
    return list;
  }

  static saveGare(gare: Gara[]) {
    save(STORAGE_KEYS.GARE, gare);
  }

  static getMacrocicli(): Macrociclo[] {
    return load<Macrociclo[]>(STORAGE_KEYS.MACROCICLI, []);
  }

  static getMesocicli(): Mesociclo[] {
    return load<Mesociclo[]>(STORAGE_KEYS.MESOCICLI, []);
  }

  static getMicrocicli(): Microciclo[] {
    return load<Microciclo[]>(STORAGE_KEYS.MICROCICLI, []);
  }

  static savePiano(macro: Macrociclo[], meso: Mesociclo[], micro: Microciclo[]) {
    save(STORAGE_KEYS.MACROCICLI, macro);
    save(STORAGE_KEYS.MESOCICLI, meso);
    save(STORAGE_KEYS.MICROCICLI, micro);
  }

  static getImpostazioni(): ImpostazioniPiano {
    return load<ImpostazioniPiano>(STORAGE_KEYS.IMPOSTAZIONI, {});
  }

  static saveImpostazioni(imp: ImpostazioniPiano) {
    save(STORAGE_KEYS.IMPOSTAZIONI, imp);
  }

  static getFirmaPiano(): number | null {
    return load<number | null>(STORAGE_KEYS.FIRMA_PIANO, null);
  }

  static saveFirmaPiano(f: number) {
    save(STORAGE_KEYS.FIRMA_PIANO, f);
  }

  static getClassiStimate(): Set<string> {
    const arr = load<string[]>(STORAGE_KEYS.CLASSI_STIMATE, []);
    return new Set(arr);
  }

  static addClasseStimata(atletaId: number) {
    const set = this.getClassiStimate();
    set.add(atletaId.toString());
    save(STORAGE_KEYS.CLASSI_STIMATE, Array.from(set));
  }

  static exportBackup(): string {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      atleti: this.getAtleti(),
      condizioni: this.getCondizioni(),
      assenze: this.getAssenze(),
      tempi: this.getTempi(),
      logSedute: this.getLogSedute(),
      stagione: this.getStagione(),
      chiusure: this.getChiusure(),
      gare: this.getGare(),
      macrocicli: this.getMacrocicli(),
      mesocicli: this.getMesocicli(),
      microcicli: this.getMicrocicli(),
      impostazioni: this.getImpostazioni()
    };
    return JSON.stringify(data, null, 2);
  }

  static importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.atleti) save(STORAGE_KEYS.ATLETI, data.atleti);
      if (data.condizioni) save(STORAGE_KEYS.CONDIZIONI, data.condizioni);
      if (data.assenze) save(STORAGE_KEYS.ASSENZE, data.assenze);
      if (data.tempi) save(STORAGE_KEYS.TEMPI, data.tempi);
      if (data.logSedute) save(STORAGE_KEYS.LOG_SEDUTE, data.logSedute);
      if (data.stagione) save(STORAGE_KEYS.STAGIONE, data.stagione);
      if (data.chiusure) save(STORAGE_KEYS.CHIUSURE, data.chiusure);
      if (data.gare) save(STORAGE_KEYS.GARE, data.gare);
      if (data.macrocicli) save(STORAGE_KEYS.MACROCICLI, data.macrocicli);
      if (data.mesocicli) save(STORAGE_KEYS.MESOCICLI, data.mesocicli);
      if (data.microcicli) save(STORAGE_KEYS.MICROCICLI, data.microcicli);
      if (data.impostazioni) save(STORAGE_KEYS.IMPOSTAZIONI, data.impostazioni);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  static resetToDefault(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }

  // ---------------- Seed data for authentic FINP paralympic experience
  private static createSeedAtleti(): Atleta[] {
    return [
      {
        id: 1,
        nome: 'Marco',
        cognome: 'Rossi',
        dataNascita: '2004-05-12',
        classeS: 9,
        classeSB: 8,
        classeSM: 9,
        stato: 'UFFICIALE',
        fattoreVolume: 1.0,
        note: 'Amputazione transtibiale arto inferiore sinistro.',
        volumeAuto: true
      },
      {
        id: 2,
        nome: 'Sofia',
        cognome: 'Bianchi',
        dataNascita: '2001-08-20',
        classeS: 4,
        classeSB: 3,
        classeSM: 4,
        stato: 'UFFICIALE',
        fattoreVolume: 0.85,
        note: 'Paraplegia T6 da lesione midollare dorsale, controllo tronco ridotto.',
        volumeAuto: true
      },
      {
        id: 3,
        nome: 'Matteo',
        cognome: 'Galli',
        dataNascita: '2010-03-15',
        classeS: 7,
        classeSB: 6,
        classeSM: 7,
        stato: 'IN_ATTESA',
        fattoreVolume: 0.8,
        note: 'Emiparesi spastica lato destro esito paralisi cerebrale infantile.',
        volumeAuto: true
      }
    ];
  }

  private static createSeedCondizioni(): CondizioneMedica[] {
    return [
      {
        id: 1,
        atletaId: 1,
        descrizione: 'Amputazione transtibiale arto inferiore sinistro',
        limitazioni: 'Spinta dal blocco monolaterale con gamba destra, virata controllata.',
        attiva: true
      },
      {
        id: 2,
        atletaId: 2,
        descrizione: 'Paraplegia dorsale T6 completa',
        limitazioni: 'Assenza spinta gambe, utilizzo pull-buoy in riscaldamento e fondo.',
        attiva: true
      },
      {
        id: 3,
        atletaId: 3,
        descrizione: 'Emiparesi spastica emilato destro',
        limitazioni: 'Evitare serie ad altissimo lattato (C1/C2) che innescano spasticità.',
        attiva: true
      }
    ];
  }

  private static createSeedTempi(): Tempo[] {
    return [
      {
        id: 1,
        atletaId: 1,
        data: '2026-06-20',
        stile: 'STILE_LIBERO',
        distanzaMetri: 100,
        centesimi: 6420, // 1:04.20
        contesto: 'GARA',
        vascaMetri: 25,
        note: 'Campionati Italiani FINP vasca corta'
      },
      {
        id: 2,
        atletaId: 1,
        data: '2026-06-21',
        stile: 'STILE_LIBERO',
        distanzaMetri: 50,
        centesimi: 2910, // 29.10
        contesto: 'GARA',
        vascaMetri: 25,
        note: 'Record personale'
      },
      {
        id: 3,
        atletaId: 1,
        data: '2026-09-25',
        stile: 'STILE_LIBERO',
        distanzaMetri: 400,
        centesimi: 30215, // 5:02.15
        contesto: 'TEST',
        vascaMetri: 25,
        note: 'Test CSS inizio stagione'
      },
      {
        id: 4,
        atletaId: 2,
        data: '2026-05-18',
        stile: 'STILE_LIBERO',
        distanzaMetri: 100,
        centesimi: 10530, // 1:45.30
        contesto: 'GARA',
        vascaMetri: 25,
        note: 'Gara regionale'
      },
      {
        id: 5,
        atletaId: 2,
        data: '2026-05-18',
        stile: 'STILE_LIBERO',
        distanzaMetri: 50,
        centesimi: 4820, // 48.20
        contesto: 'GARA',
        vascaMetri: 25,
        note: 'Primato personale'
      }
    ];
  }

  private static createSeedLog(): LogSeduta[] {
    const logs: LogSeduta[] = [];
    const baseDate = '2026-09-21';
    let id = 1;
    // Generate some sessions for athlete 1 & 2
    for (let w = 0; w < 4; w++) {
      const d1 = `2026-09-${23 + w * 2}`;
      logs.push({
        id: id++,
        atletaId: 1,
        data: d1,
        presente: true,
        durataMin: 75,
        metriEffettivi: 2200,
        rpe: 7,
        note: 'Buona andatura A2/B1'
      });
      logs.push({
        id: id++,
        atletaId: 2,
        data: d1,
        presente: true,
        durataMin: 60,
        metriEffettivi: 1800,
        rpe: 6,
        note: 'Lavoro tecnico e pull-buoy'
      });
    }
    return logs;
  }

  private static createSeedStagione(): Stagione {
    return {
      id: 1,
      nome: '2026/27',
      inizio: '2026-09-14',
      fine: '2027-06-13',
      vascaMetri: 25
    };
  }

  private static createSeedGare(): Gara[] {
    return [
      {
        id: 1,
        stagioneId: 1,
        nome: 'Campionati Italiani Assoluti Invernali FINP',
        dal: '2026-11-28',
        al: '2026-11-29',
        luogo: 'Portici (NA)',
        prioritaria: true
      },
      {
        id: 2,
        stagioneId: 1,
        nome: 'Meeting Interregionale FINP',
        dal: '2027-02-14',
        al: '2027-02-14',
        luogo: 'Bologna',
        prioritaria: false
      },
      {
        id: 3,
        stagioneId: 1,
        nome: 'Campionati Italiani Assoluti Estivi FINP',
        dal: '2027-05-15',
        al: '2027-05-16',
        luogo: 'Brescia',
        prioritaria: true
      }
    ];
  }
}
