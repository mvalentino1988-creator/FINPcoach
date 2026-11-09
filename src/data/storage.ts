import {
  Assenza,
  Atleta,
  Chiusura,
  CondizioneMedica,
  CustomWorkout,
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
import { todayISO } from '../domain/dateUtils';
import { IA_CONFIG_DEFAULT, IAConfig } from '../domain/iaEsterna';

const MODE_KEY = 'finp_mode';

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
  CUSTOM_WORKOUTS: 'finpcoach_custom_workouts',
  IA_CONFIG: 'finp_ia_config'
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
  static getMode(): 'demo' | 'live' | null {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'live') return 'live';
    if (m !== 'demo') {
      this.applyDemoSeed();
    }
    return 'demo';
  }

  static setMode(mode: 'demo' | 'live') {
    localStorage.setItem(MODE_KEY, mode);
  }

  static isDemo(): boolean {
    return this.getMode() === 'demo';
  }

  static applyDemoSeed(): void {
    this.setMode('demo');
    const atleti = this.createSeedAtleti();
    save(STORAGE_KEYS.ATLETI, atleti);
    save(STORAGE_KEYS.CONDIZIONI, this.createSeedCondizioni());
    save(STORAGE_KEYS.ASSENZE, []);
    save(STORAGE_KEYS.TEMPI, this.createSeedTempi());
    save(STORAGE_KEYS.LOG_SEDUTE, this.createSeedLog());
    const stagione = this.createSeedStagione();
    save(STORAGE_KEYS.STAGIONE, stagione);
    save(STORAGE_KEYS.CHIUSURE, Festivita.perStagione(stagione).map((c, i) => ({ ...c, id: i + 1 })));
    save(STORAGE_KEYS.GARE, this.createSeedGare());
    save(STORAGE_KEYS.MACROCICLI, []);
    save(STORAGE_KEYS.MESOCICLI, []);
    save(STORAGE_KEYS.MICROCICLI, []);
    save(STORAGE_KEYS.IMPOSTAZIONI, {});
    save(STORAGE_KEYS.CUSTOM_WORKOUTS, []);
  }

  static startLiveSquad(): void {
    this.setMode('live');
    save(STORAGE_KEYS.ATLETI, []);
    save(STORAGE_KEYS.CONDIZIONI, []);
    save(STORAGE_KEYS.ASSENZE, []);
    save(STORAGE_KEYS.TEMPI, []);
    save(STORAGE_KEYS.LOG_SEDUTE, []);
    save(STORAGE_KEYS.STAGIONE, null);
    save(STORAGE_KEYS.CHIUSURE, []);
    save(STORAGE_KEYS.GARE, []);
    save(STORAGE_KEYS.MACROCICLI, []);
    save(STORAGE_KEYS.MESOCICLI, []);
    save(STORAGE_KEYS.MICROCICLI, []);
    save(STORAGE_KEYS.IMPOSTAZIONI, {});
    save(STORAGE_KEYS.CUSTOM_WORKOUTS, []);
  }

  static getCustomWorkouts(): CustomWorkout[] {
    return load<CustomWorkout[]>(STORAGE_KEYS.CUSTOM_WORKOUTS, []);
  }

  static saveCustomWorkouts(workouts: CustomWorkout[]) {
    save(STORAGE_KEYS.CUSTOM_WORKOUTS, workouts);
  }

  static getAtleti(): Atleta[] {
    return load<Atleta[]>(STORAGE_KEYS.ATLETI, []);
  }

  static saveAtleti(atleti: Atleta[]) {
    save(STORAGE_KEYS.ATLETI, atleti);
  }

  static getCondizioni(): CondizioneMedica[] {
    return load<CondizioneMedica[]>(STORAGE_KEYS.CONDIZIONI, []);
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
    return load<Tempo[]>(STORAGE_KEYS.TEMPI, []);
  }

  static saveTempi(tempi: Tempo[]) {
    save(STORAGE_KEYS.TEMPI, tempi);
  }

  static getLogSedute(): LogSeduta[] {
    return load<LogSeduta[]>(STORAGE_KEYS.LOG_SEDUTE, []);
  }

  static saveLogSedute(log: LogSeduta[]) {
    save(STORAGE_KEYS.LOG_SEDUTE, log);
  }

  static getStagione(): Stagione | null {
    return load<Stagione | null>(STORAGE_KEYS.STAGIONE, null);
  }

  static saveStagione(stagione: Stagione | null) {
    save(STORAGE_KEYS.STAGIONE, stagione);
  }

  static getChiusure(): Chiusura[] {
    return load<Chiusura[]>(STORAGE_KEYS.CHIUSURE, []);
  }

  static saveChiusure(chiusure: Chiusura[]) {
    save(STORAGE_KEYS.CHIUSURE, chiusure);
  }

  static getGare(): Gara[] {
    return load<Gara[]>(STORAGE_KEYS.GARE, []);
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

  static getIAConfig(): IAConfig {
    return { ...IA_CONFIG_DEFAULT, ...load<Partial<IAConfig>>(STORAGE_KEYS.IA_CONFIG, {}) };
  }

  static saveIAConfig(config: IAConfig) {
    save(STORAGE_KEYS.IA_CONFIG, config);
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

  static getLayoutScelto(): 'classica' | 'flottante' | 'azione-centrale' {
    return load<'classica' | 'flottante' | 'azione-centrale'>('finp_layout_scelto', 'classica');
  }

  static saveLayoutScelto(layout: 'classica' | 'flottante' | 'azione-centrale') {
    save('finp_layout_scelto', layout);
  }

  static getThemeMode(): 'sistema' | 'chiaro' | 'scuro' {
    return load<'sistema' | 'chiaro' | 'scuro'>('finp_theme_mode', 'sistema');
  }

  static saveThemeMode(mode: 'sistema' | 'chiaro' | 'scuro') {
    save('finp_theme_mode', mode);
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
      impostazioni: this.getImpostazioni(),
      customWorkouts: this.getCustomWorkouts(),
      iaConfig: this.getIAConfig(),
      mode: this.getMode()
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
      if (data.customWorkouts) save(STORAGE_KEYS.CUSTOM_WORKOUTS, data.customWorkouts);
      if (data.iaConfig) save(STORAGE_KEYS.IA_CONFIG, data.iaConfig);
      if (data.mode === 'demo' || data.mode === 'live') this.setMode(data.mode);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  static resetToDefault(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.applyDemoSeed();
  }

  // ---------------- Seed data for authentic FINP paralympic experience
  private static createSeedAtleti(): Atleta[] {
    return [
      { id: 1, nome: 'Marco', cognome: 'Rossi', dataNascita: '2004-05-12', classeS: 9, classeSB: 8, classeSM: 9, stato: 'UFFICIALE', fattoreVolume: 1.0, note: 'Amputazione transtibiale arto inferiore sinistro.', volumeAuto: true },
      { id: 2, nome: 'Sofia', cognome: 'Bianchi', dataNascita: '2001-08-20', classeS: 4, classeSB: 3, classeSM: 4, stato: 'UFFICIALE', fattoreVolume: 0.85, note: 'Paraplegia T6 da lesione midollare dorsale.', volumeAuto: true },
      { id: 3, nome: 'Matteo', cognome: 'Galli', dataNascita: '2010-03-15', classeS: 7, classeSB: 6, classeSM: 7, stato: 'IN_ATTESA', fattoreVolume: 0.8, note: 'Emiparesi spastica lato destro.', volumeAuto: true },
      { id: 4, nome: 'Elena', cognome: 'Moretti', dataNascita: '1998-11-04', classeS: 11, classeSB: 11, classeSM: 11, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Ipovisione profonda / cecità legale.', volumeAuto: true },
      { id: 5, nome: 'Alessandro', cognome: 'Conti', dataNascita: '2006-02-18', classeS: 6, classeSB: 5, classeSM: 6, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Acondroplasia, displasia scheletrica.', volumeAuto: true },
      { id: 6, nome: 'Giulia', cognome: 'Romano', dataNascita: '2003-07-22', classeS: 8, classeSB: 7, classeSM: 8, stato: 'UFFICIALE', fattoreVolume: 0.95, note: 'Danno plesso brachiale arto superiore destro.', volumeAuto: true },
      { id: 7, nome: 'Davide', cognome: 'Ferrari', dataNascita: '1995-09-30', classeS: 10, classeSB: 9, classeSM: 10, stato: 'UFFICIALE', fattoreVolume: 1.0, note: 'Amputazione transradiale braccio destro.', volumeAuto: true },
      { id: 8, nome: 'Chiara', cognome: 'Ricci', dataNascita: '2008-12-05', classeS: 13, classeSB: 13, classeSM: 13, stato: 'IN_ATTESA', fattoreVolume: 0.85, note: 'Sindrome di Stargardt (minorazione visiva).', volumeAuto: true },
      { id: 9, nome: 'Lorenzo', cognome: 'Marino', dataNascita: '1990-04-14', classeS: 5, classeSB: 4, classeSM: 5, stato: 'UFFICIALE', fattoreVolume: 0.8, note: 'Tetraparesi spastica lieve.', volumeAuto: true },
      { id: 10, nome: 'Francesca', cognome: 'Barbieri', dataNascita: '2005-06-25', classeS: 9, classeSB: 9, classeSM: 9, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Atassia cerebellare lieve.', volumeAuto: true },
      { id: 11, nome: 'Simone', cognome: 'De Luca', dataNascita: '2000-01-19', classeS: 14, classeSB: 14, classeSM: 14, stato: 'UFFICIALE', fattoreVolume: 1.0, note: 'Disabilità intellettiva (S14).', volumeAuto: true },
      { id: 12, nome: 'Martina', cognome: 'Colombo', dataNascita: '2007-10-08', classeS: 6, classeSB: 6, classeSM: 6, stato: 'IN_ATTESA', fattoreVolume: 0.85, note: 'Artrogriposi multipla congenita.', volumeAuto: true },
      { id: 13, nome: 'Federico', cognome: 'Rinaldi', dataNascita: '1992-03-27', classeS: 8, classeSB: 8, classeSM: 8, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Esiti poliomielite arto inferiore destro.', volumeAuto: true },
      { id: 14, nome: 'Alice', cognome: 'Gatti', dataNascita: '2009-08-14', classeS: 10, classeSB: 9, classeSM: 10, stato: 'IN_ATTESA', fattoreVolume: 0.8, note: 'Spina bifida mielomeningocele.', volumeAuto: true },
      { id: 15, nome: 'Tommaso', cognome: 'Esposito', dataNascita: '1996-05-02', classeS: 7, classeSB: 7, classeSM: 7, stato: 'UFFICIALE', fattoreVolume: 0.95, note: 'Amputazione tibiale bilaterale.', volumeAuto: true },
      { id: 16, nome: 'Giorgia', cognome: 'Vitale', dataNascita: '2002-09-11', classeS: 12, classeSB: 12, classeSM: 12, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Retinite pigmentosa.', volumeAuto: true },
      { id: 17, nome: 'Luca', cognome: 'Fontana', dataNascita: '2004-01-30', classeS: 5, classeSB: 5, classeSM: 5, stato: 'UFFICIALE', fattoreVolume: 0.85, note: 'Sclerosi multipla in fase stabile.', volumeAuto: true },
      { id: 18, nome: 'Sara', cognome: 'Santoro', dataNascita: '2011-06-17', classeS: 9, classeSB: 8, classeSM: 9, stato: 'IN_ATTESA', fattoreVolume: 0.75, note: 'Focomelia arto superiore sinistro.', volumeAuto: true },
      { id: 19, nome: 'Andrea', cognome: 'Landi', dataNascita: '1988-02-09', classeS: 11, classeSB: 11, classeSM: 11, stato: 'UFFICIALE', fattoreVolume: 0.9, note: 'Cecità totale acquisita.', volumeAuto: true },
      { id: 20, nome: 'Valentina', cognome: 'Costa', dataNascita: '2006-11-23', classeS: 14, classeSB: 14, classeSM: 14, stato: 'UFFICIALE', fattoreVolume: 0.95, note: 'Disabilità intellettivo-relazionale.', volumeAuto: true }
    ];
  }

  private static createSeedCondizioni(): CondizioneMedica[] {
    return [
      { id: 1, atletaId: 1, descrizione: 'Amputazione transtibiale arto inferiore sinistro', limitazioni: 'Spinta dal blocco monolaterale con gamba destra.', attiva: true },
      { id: 2, atletaId: 2, descrizione: 'Paraplegia dorsale T6 completa', limitazioni: 'Assenza spinta gambe, utilizzo pull-buoy in riscaldamento.', attiva: true },
      { id: 3, atletaId: 3, descrizione: 'Emiparesi spastica emilato destro', limitazioni: 'Evitare serie ad altissimo lattato.', attiva: true },
      { id: 4, atletaId: 4, descrizione: 'Ipovisione profonda S11', limitazioni: 'Utilizzo di tappetini di segnalazione prima del muro.', attiva: true },
      { id: 5, atletaId: 5, descrizione: 'Acondroplasia', limitazioni: 'Attenzione alle frequenze di bracciata nel misto.', attiva: true },
      { id: 6, atletaId: 6, descrizione: 'Danno plesso brachiale destro', limitazioni: 'Recupero braccio destro modificato.', attiva: true },
      { id: 7, atletaId: 7, descrizione: 'Amputazione transradiale braccio destro', limitazioni: 'Virata e subacquea simmetrica.', attiva: true },
      { id: 8, atletaId: 8, descrizione: 'Sindrome di Stargardt', limitazioni: 'Controllo illuminazione a bordo vasca.', attiva: true },
      { id: 9, atletaId: 9, descrizione: 'Tetraparesi spastica lieve', limitazioni: 'Gestione del recupero tra le serie.', attiva: true },
      { id: 10, atletaId: 10, descrizione: 'Atassia cerebellare lieve', limitazioni: 'Attenzione all’equilibrio sui blocchi di partenza.', attiva: true },
      { id: 11, atletaId: 11, descrizione: 'Disabilità intellettiva S14', limitazioni: 'Spiegazioni visive e ripetizione dei set.', attiva: true },
      { id: 12, atletaId: 12, descrizione: 'Artrogriposi multipla congenita', limitazioni: 'Mobilità articolare ridotta agli arti.', attiva: true },
      { id: 13, atletaId: 13, descrizione: 'Esiti poliomielite arto inferiore', limitazioni: 'Propulsione prevalente superiore.', attiva: true },
      { id: 14, atletaId: 14, descrizione: 'Spina bifida', limitazioni: 'Monitoraggio sensibilità e affaticamento.', attiva: true },
      { id: 15, atletaId: 15, descrizione: 'Amputazione tibiale bilaterale', limitazioni: 'Partenza da dentro l’acqua o blocco adattato.', attiva: true },
      { id: 16, atletaId: 16, descrizione: 'Retinite pigmentosa', limitazioni: 'Campo visivo ridotto.', attiva: true },
      { id: 17, atletaId: 17, descrizione: 'Sclerosi multipla stabile', limitazioni: 'Gestione della temperatura dell’acqua.', attiva: true },
      { id: 18, atletaId: 18, descrizione: 'Focomelia arto superiore sinistro', limitazioni: 'Adattamento asimmetrico della bracciata.', attiva: true },
      { id: 19, atletaId: 19, descrizione: 'Cecità totale S11', limitazioni: 'Taping obbligatorio e tappers ai 5 metri.', attiva: true },
      { id: 20, atletaId: 20, descrizione: 'Disabilità intellettivo-relazionale', limitazioni: 'Supporto costante nella gestione dei recuperi.', attiva: true }
    ];
  }

  private static createSeedTempi(): Tempo[] {
    return [
      { id: 1, atletaId: 1, data: '2026-06-20', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6420, contesto: 'GARA', vascaMetri: 25, note: 'Campionati Italiani FINP' },
      { id: 2, atletaId: 2, data: '2026-06-21', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 4820, contesto: 'GARA', vascaMetri: 25, note: 'Record personale' },
      { id: 3, atletaId: 3, data: '2026-09-25', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 7850, contesto: 'TEST', vascaMetri: 25, note: 'Test iniziale' },
      { id: 4, atletaId: 4, data: '2026-07-10', stile: 'DORSO', distanzaMetri: 100, centesimi: 8210, contesto: 'GARA', vascaMetri: 25, note: 'Meeting estivo' },
      { id: 5, atletaId: 5, data: '2026-06-15', stile: 'RANA', distanzaMetri: 50, centesimi: 4120, contesto: 'GARA', vascaMetri: 25, note: 'Ottima prova' },
      { id: 6, atletaId: 6, data: '2026-08-01', stile: 'STILE_LIBERO', distanzaMetri: 200, centesimi: 15400, contesto: 'TEST', vascaMetri: 25, note: 'Test aerobico' },
      { id: 7, atletaId: 7, data: '2026-06-20', stile: 'FARFALLA', distanzaMetri: 50, centesimi: 3150, contesto: 'GARA', vascaMetri: 25, note: 'Finale nazionale' },
      { id: 8, atletaId: 8, data: '2026-09-12', stile: 'STILE_LIBERO', distanzaMetri: 400, centesimi: 31020, contesto: 'TEST', vascaMetri: 25, note: 'Test CSS' },
      { id: 9, atletaId: 9, data: '2026-05-18', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 5900, contesto: 'GARA', vascaMetri: 25, note: 'Gara regionale' },
      { id: 10, atletaId: 10, data: '2026-06-21', stile: 'MISTI', distanzaMetri: 200, centesimi: 17200, contesto: 'GARA', vascaMetri: 25, note: 'Campionato' },
      { id: 11, atletaId: 11, data: '2026-06-20', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6110, contesto: 'GARA', vascaMetri: 25, note: 'Podio nazionale' },
      { id: 12, atletaId: 12, data: '2026-07-02', stile: 'RANA', distanzaMetri: 100, centesimi: 11200, contesto: 'TEST', vascaMetri: 25, note: 'Verifica tecnica' },
      { id: 13, atletaId: 13, data: '2026-06-18', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 3640, contesto: 'GARA', vascaMetri: 25, note: 'Gara di velocità' },
      { id: 14, atletaId: 14, data: '2026-08-15', stile: 'DORSO', distanzaMetri: 50, centesimi: 4320, contesto: 'TEST', vascaMetri: 25, note: 'Test rapido' },
      { id: 15, atletaId: 15, data: '2026-06-20', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 7210, contesto: 'GARA', vascaMetri: 25, note: 'Italiani FINP' },
      { id: 16, atletaId: 16, data: '2026-07-22', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6980, contesto: 'GARA', vascaMetri: 25, note: 'Meeting regionale' },
      { id: 17, atletaId: 17, data: '2026-09-01', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 5410, contesto: 'TEST', vascaMetri: 25, note: 'Test ripresa' },
      { id: 18, atletaId: 18, data: '2026-06-21', stile: 'STILE_LIBERO', distanzaMetri: 50, centesimi: 4210, contesto: 'GARA', vascaMetri: 25, note: 'Esordio' },
      { id: 19, atletaId: 19, data: '2026-06-20', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 7450, contesto: 'GARA', vascaMetri: 25, note: 'Campionato S11' },
      { id: 20, atletaId: 20, data: '2026-06-20', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6320, contesto: 'GARA', vascaMetri: 25, note: 'Finale S14' }
    ];
  }

  private static createSeedLog(): LogSeduta[] {
    const logs: LogSeduta[] = [];
    let id = 1;
    for (let atletaId = 1; atletaId <= 20; atletaId++) {
      for (let w = 0; w < 3; w++) {
        logs.push({
          id: id++,
          atletaId,
          data: `2026-09-${22 + w * 2}`,
          presente: true,
          durataMin: 75,
          metriEffettivi: 2000 + (atletaId % 5) * 100,
          rpe: 6 + (atletaId % 4),
          note: 'Allenamento completato regolarmente'
        });
      }
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
