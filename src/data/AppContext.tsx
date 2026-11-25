import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Assenza,
  Atleta,
  Avviso,
  Chiusura,
  CondizioneMedica,
  CustomWorkout,
  DayOfWeekNum,
  Gara,
  ImpostazioniPiano,
  IscrizioneGara,
  LogSeduta,
  Macrociclo,
  Mesociclo,
  Microciclo,
  ParametriPiano,
  ParametriSeduta,
  Stagione,
  Tempo
} from '../types';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { Festivita } from '../domain/festivita';
import { PianoGenerator } from '../domain/pianoGenerator';
import { PianoValidator } from '../domain/validatori';
import { avvisiIscrizioniGare, avvisiTempiInAssenza, presentiEffettiviInData } from '../domain/assenze';
import { todayISO } from '../domain/dateUtils';
import { conOverride, conParametriGiorno, risolviParametriSeduta, senzaOverride, ParametriRisolti } from '../domain/parametriSeduta';
import { AssegnazioneVasca, allineaConParametri, normalizzaAssegnazione } from '../domain/assegnazioneVasca';
import { FINPStorage } from './storage';
import { androidBridge, callNative } from '../lib/nativeBridge';
import { FirebaseSync, SyncData } from './firebaseSync';
import { ArchivioStagione, costruisciArchivioStagione, logNellaStagione } from '../domain/archivioStagione';

interface AppContextType {
  atleti: Atleta[];
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  log: LogSeduta[];
  stagione: Stagione | null;
  chiusure: Chiusura[];
  gare: Gara[];
  iscrizioniGare: IscrizioneGara[];
  macro: Macrociclo[];
  meso: Mesociclo[];
  micro: Microciclo[];
  impostazioni: ImpostazioniPiano;
  parametriEffettivi: ParametriPiano;
  avvisiPiano: Avviso[];

  // Assegnazione Vasca (Regia) e parametri della seduta di oggi
  assegnazioneVasca: AssegnazioneVasca | null;
  salvaAssegnazioneVasca: (a: AssegnazioneVasca | null) => void;
  parametriOggi: ParametriRisolti;

  // Atleti
  aggiungiAtleta: (a: Omit<Atleta, 'id'>) => void;
  aggiornaAtleta: (a: Atleta) => void;
  eliminaAtleta: (id: number) => void;
  aggiungiCondizione: (c: Omit<CondizioneMedica, 'id'>) => void;
  eliminaCondizione: (id: number) => void;
  aggiungiAssenza: (a: Omit<Assenza, 'id'>) => void;
  eliminaAssenza: (id: number) => void;

  // Stagione e Piano
  creaStagione: (nome: string, inizio: string, fine: string) => void;
  modificaDateStagione: (inizio: string, fine: string) => void;
  eliminaStagione: () => void;
  /**
   * Archivia la stagione corrente (QUINTO GIRO 3.3): restituisce
   * l'archivio da scaricare e azzera i dati della stagione (piano, gare,
   * iscrizioni, chiusure e log nel periodo). Atleti, tempi e log fuori
   * periodo restano come storico. Null se non c'è stagione.
   */
  archiviaStagione: () => ArchivioStagione | null;
  aggiungiChiusura: (dal: string, al: string, motivo: string) => void;
  modificaChiusura: (c: Chiusura) => void;
  eliminaChiusura: (id: number) => void;
  aggiungiFestivitaNazionali: () => void;
  aggiungiGara: (nome: string, dal: string, al: string, prioritaria: boolean, luogo?: string) => void;
  modificaGara: (g: Gara) => void;
  eliminaGara: (id: number) => void;
  aggiungiIscrizioneGara: (i: Omit<IscrizioneGara, 'id'>) => void;
  aggiornaIscrizioneGara: (i: IscrizioneGara) => void;
  eliminaIscrizioneGara: (id: number) => void;
  salvaImpostazioni: (imp: ImpostazioniPiano) => void;
  /** Programmazione vasca/durata per un giorno della settimana (senza rigenerare il piano). */
  impostaParametriGiorno: (giorno: DayOfWeekNum, parametri: ParametriSeduta) => void;
  /** Override vasca/durata per una singola data (senza rigenerare il piano). */
  impostaOverrideSeduta: (data: string, parametri: ParametriSeduta) => void;
  rimuoviOverrideSeduta: (data: string) => void;
  impostaDurataDefault: (minuti: number) => void;
  rigeneraPianoCompleto: () => void;
  modificaMicro: (m: Microciclo) => void;
  sbloccaMicro: (m: Microciclo) => void;

  // Tempi e Log
  aggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  eliminaTempo: (id: number) => void;
  salvaSeduta: (data: string, items: Omit<LogSeduta, 'id'>[]) => void;

  layoutScelto: 'classica' | 'flottante' | 'azione-centrale';
  setLayoutScelto: (l: 'classica' | 'flottante' | 'azione-centrale') => void;
  themeMode: 'sistema' | 'chiaro' | 'scuro';
  setThemeMode: (m: 'sistema' | 'chiaro' | 'scuro') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Prima esecuzione (nessun flag mode): getMode() carica il seed demo.
  // Non si risemina qui: una rosa vuota voluta (startLiveSquad) o un import
  // con meno di 48 atleti devono essere preservati.
  FINPStorage.getMode();

  const [atleti, setAtleti] = useState<Atleta[]>(() => FINPStorage.getAtleti());
  const [condizioni, setCondizioni] = useState<CondizioneMedica[]>(() => FINPStorage.getCondizioni());
  const [assenze, setAssenze] = useState<Assenza[]>(() => FINPStorage.getAssenze());
  const [tempi, setTempi] = useState<Tempo[]>(() => FINPStorage.getTempi());
  const [log, setLog] = useState<LogSeduta[]>(() => FINPStorage.getLogSedute());
  const [stagione, setStagione] = useState<Stagione | null>(() => FINPStorage.getStagione());
  const [chiusure, setChiusure] = useState<Chiusura[]>(() => FINPStorage.getChiusure());
  const [gare, setGare] = useState<Gara[]>(() => FINPStorage.getGare());
  const [iscrizioniGare, setIscrizioniGare] = useState<IscrizioneGara[]>(() => FINPStorage.getIscrizioniGare());
  const [macro, setMacro] = useState<Macrociclo[]>(() => FINPStorage.getMacrocicli());
  const [meso, setMeso] = useState<Mesociclo[]>(() => FINPStorage.getMesocicli());
  const [micro, setMicro] = useState<Microciclo[]>(() => FINPStorage.getMicrocicli());
  const [impostazioni, setImpostazioni] = useState<ImpostazioniPiano>(() => FINPStorage.getImpostazioni());
  const [layoutScelto, setLayoutSceltoState] = useState<'classica' | 'flottante' | 'azione-centrale'>(() => FINPStorage.getLayoutScelto());
  const [themeMode, setThemeModeState] = useState<'sistema' | 'chiaro' | 'scuro'>(() => FINPStorage.getThemeMode());
  const [assegnazioneVasca, setAssegnazioneVasca] = useState<AssegnazioneVasca | null>(() => FINPStorage.getAssegnazioneVasca());

  const setLayoutScelto = (l: 'classica' | 'flottante' | 'azione-centrale') => {
    setLayoutSceltoState(l);
    FINPStorage.saveLayoutScelto(l);
  };

  const setThemeMode = (m: 'sistema' | 'chiaro' | 'scuro') => {
    setThemeModeState(m);
    FINPStorage.saveThemeMode(m);
  };

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const getAndroidSystemDark = (): boolean | null => {
      const dark = callNative<boolean>(androidBridge(), 'getSystemIsDark');
      return typeof dark === 'boolean' ? dark : null;
    };

    const updateTheme = () => {
      let isDark = themeMode === 'scuro';
      if (themeMode === 'sistema') {
        const androidDark = getAndroidSystemDark();
        isDark = androidDark !== null ? androidDark : mediaQuery.matches;
      }
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
      callNative(androidBridge(), 'setSystemBarsDark', isDark);
    };

    const handleAndroidThemeChange = (e: CustomEvent<{ isDark?: boolean }>) => {
      if (themeMode === 'sistema' && e.detail && typeof e.detail.isDark === 'boolean') {
        const isDark = e.detail.isDark;
        root.classList.toggle('dark', isDark);
        root.style.colorScheme = isDark ? 'dark' : 'light';
        callNative(androidBridge(), 'setSystemBarsDark', isDark);
      }
    };

    updateTheme();
    window.addEventListener('android-system-theme-changed', handleAndroidThemeChange as EventListener);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateTheme);
      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
        window.removeEventListener('android-system-theme-changed', handleAndroidThemeChange as EventListener);
      };
    }

    mediaQuery.addListener(updateTheme);
    return () => {
      mediaQuery.removeListener(updateTheme);
      window.removeEventListener('android-system-theme-changed', handleAndroidThemeChange as EventListener);
    };
  }, [themeMode]);

  // Save changes
  useEffect(() => { FINPStorage.saveAtleti(atleti); }, [atleti]);
  useEffect(() => { FINPStorage.saveCondizioni(condizioni); }, [condizioni]);
  useEffect(() => { FINPStorage.saveAssenze(assenze); }, [assenze]);
  useEffect(() => { FINPStorage.saveTempi(tempi); }, [tempi]);
  useEffect(() => { FINPStorage.saveLogSedute(log); }, [log]);
  useEffect(() => { FINPStorage.saveStagione(stagione); }, [stagione]);
  useEffect(() => { FINPStorage.saveChiusure(chiusure); }, [chiusure]);
  useEffect(() => { FINPStorage.saveGare(gare); }, [gare]);
  useEffect(() => { FINPStorage.saveIscrizioniGare(iscrizioniGare); }, [iscrizioniGare]);
  useEffect(() => { FINPStorage.savePiano(macro, meso, micro); }, [macro, meso, micro]);
  useEffect(() => { FINPStorage.saveImpostazioni(impostazioni); }, [impostazioni]);
  useEffect(() => { FINPStorage.saveAssegnazioneVasca(assegnazioneVasca); }, [assegnazioneVasca]);

  const applyingCloud = useRef(false);
  const hydrated = useRef(localStorage.getItem('finp_sync_enabled') !== 'true');
  const latestRef = useRef({ atleti, condizioni, assenze, tempi, log, stagione, chiusure, gare, iscrizioniGare, macro, meso, micro, impostazioni, assegnazioneVasca });
  useEffect(() => {
    latestRef.current = { atleti, condizioni, assenze, tempi, log, stagione, chiusure, gare, iscrizioniGare, macro, meso, micro, impostazioni, assegnazioneVasca };
  });

  const buildSyncPayload = (): SyncData => {
    const s = latestRef.current;
    return {
      version: '1.0',
      lastSync: localStorage.getItem('finp_last_sync') || '1970-01-01T00:00:00.000Z',
      atleti: s.atleti,
      condizioni: s.condizioni,
      assenze: s.assenze,
      tempi: s.tempi,
      logSedute: s.log,
      stagione: s.stagione,
      chiusure: s.chiusure,
      gare: s.gare,
      iscrizioniGare: s.iscrizioniGare,
      macrocicli: s.macro,
      mesocicli: s.meso,
      microcicli: s.micro,
      impostazioni: s.impostazioni,
      assegnazioneVasca: s.assegnazioneVasca,
      customWorkouts: FINPStorage.getCustomWorkouts()
    };
  };

  const applyCloud = (cloudData: SyncData) => {
    applyingCloud.current = true;
    if (cloudData.atleti) setAtleti(cloudData.atleti);
    if (cloudData.condizioni) setCondizioni(cloudData.condizioni);
    if (cloudData.assenze) setAssenze(cloudData.assenze);
    if (cloudData.tempi) setTempi(cloudData.tempi);
    if (cloudData.logSedute) setLog(cloudData.logSedute);
    if (cloudData.stagione !== undefined) setStagione(cloudData.stagione);
    if (cloudData.chiusure) setChiusure(cloudData.chiusure);
    if (cloudData.gare) setGare(cloudData.gare);
    if (cloudData.iscrizioniGare) setIscrizioniGare(cloudData.iscrizioniGare);
    if (cloudData.macrocicli) setMacro(cloudData.macrocicli);
    if (cloudData.mesocicli) setMeso(cloudData.mesocicli);
    if (cloudData.microcicli) setMicro(cloudData.microcicli);
    if (cloudData.impostazioni) setImpostazioni(cloudData.impostazioni);
    if (cloudData.assegnazioneVasca !== undefined) {
      const norm = normalizzaAssegnazione(cloudData.assegnazioneVasca);
      if (norm) setAssegnazioneVasca(norm);
    }
    if (cloudData.customWorkouts) FINPStorage.saveCustomWorkouts(cloudData.customWorkouts as CustomWorkout[]);
    if (cloudData.lastSync) localStorage.setItem('finp_last_sync', cloudData.lastSync);
    setTimeout(() => { applyingCloud.current = false; }, 500);
  };

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = FirebaseSync.onAuthStateChange(async (user) => {
      const syncEnabled = localStorage.getItem('finp_sync_enabled') === 'true'
        && localStorage.getItem('finp_sync_consent') === 'true';
      if (!syncEnabled || !user) {
        hydrated.current = true;
        return;
      }
      const loaded = await FirebaseSync.loadFromCloud(buildSyncPayload());
      const localTs = localStorage.getItem('finp_last_sync') || '1970-01-01T00:00:00.000Z';
      if (loaded && loaded.lastSync && loaded.lastSync > localTs) {
        applyCloud(loaded);
      } else if (loaded && loaded.lastSync === undefined && loaded.atleti) {
        applyCloud(loaded);
      }
      hydrated.current = true;
      unsubSnap = FirebaseSync.subscribeToUpdates((cloudData) => {
        if (!cloudData?.lastSync) return;
        const ts = localStorage.getItem('finp_last_sync') || '';
        if (cloudData.lastSync > ts) applyCloud(cloudData);
      });
    });
    return () => {
      unsubAuth();
      unsubSnap?.();
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current || applyingCloud.current) return;
    if (localStorage.getItem('finp_sync_enabled') !== 'true') return;
    if (localStorage.getItem('finp_sync_consent') !== 'true') return;
    if (!FirebaseSync.getCurrentUser()) return;

    const timeoutId = setTimeout(() => {
      if (applyingCloud.current) return;
      FirebaseSync.saveToCloud(buildSyncPayload());
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [atleti, condizioni, assenze, tempi, log, stagione, chiusure, gare, iscrizioniGare, macro, meso, micro, impostazioni, assegnazioneVasca]);

  // Compute effective planning parameters
  const parametriEffettivi = useMemo<ParametriPiano>(() => {
    const auto = AutoPianificatore.parametriAuto(atleti, log, stagione, todayISO());
    return {
      giorniAllenamento: impostazioni.giorni ?? auto.giorniAllenamento,
      numeroMacrocicli: impostazioni.numeroMacrocicli ?? auto.numeroMacrocicli,
      metriBaseSeduta: impostazioni.metriBaseSeduta ?? auto.metriBaseSeduta,
      settimaneCicloCarico: impostazioni.settimaneCicloCarico ?? auto.settimaneCicloCarico
    };
  }, [impostazioni, atleti, log, stagione]);

  // Compute validation warnings on the plan
  const avvisiPiano = useMemo<Avviso[]>(() => {
    if (!stagione || micro.length === 0) return [];
    return [
      ...PianoValidator.valida(stagione, micro, gare),
      ...avvisiIscrizioniGare(iscrizioniGare, assenze, gare, atleti),
      ...avvisiTempiInAssenza(tempi, assenze),
    ];
  }, [stagione, micro, gare, iscrizioniGare, assenze, atleti, tempi]);

  // Parametri della seduta di oggi (override > giorno della settimana > stagione)
  const parametriOggi = useMemo<ParametriRisolti>(() => {
    return risolviParametriSeduta(todayISO(), impostazioni, stagione);
  }, [impostazioni, stagione]);

  // La Regia e' la sola fonte di corsie/presenze: l'assegnazione segue i
  // parametri del giorno (numero corsie, presenti, vasca). Solo per la data
  // di oggi: un'assegnazione di ieri resta intatta finche' la Regia non decide.
  // (adjust state during render: niente effect + setState)
  const [prevAllinea, setPrevAllinea] = useState<{ a: typeof assegnazioneVasca; p: typeof parametriOggi; at: typeof atleti; as: typeof assenze } | null>(null);
  if (
    prevAllinea === null ||
    prevAllinea.a !== assegnazioneVasca ||
    prevAllinea.p !== parametriOggi ||
    prevAllinea.at !== atleti ||
    prevAllinea.as !== assenze
  ) {
    setPrevAllinea({ a: assegnazioneVasca, p: parametriOggi, at: atleti, as: assenze });
    if (assegnazioneVasca && assegnazioneVasca.data === todayISO()) {
      const dataOggi = todayISO();
      const presentiIds = presentiEffettiviInData(dataOggi, atleti, assenze, parametriOggi.atletiPresentiIds);
      const allineata = allineaConParametri(
        assegnazioneVasca,
        parametriOggi.vascaMetri === 50 ? 50 : 25,
        parametriOggi.numeroCorsie ?? 4,
        presentiIds
      );
      if (JSON.stringify(allineata) !== JSON.stringify(assegnazioneVasca)) {
        setAssegnazioneVasca(allineata);
      }
    }
  }

  // Internal helper to regenerate plan
  const rigeneraPianoInterno = (conservaPassato: boolean) => {
    if (!stagione) return;
    const planGen = PianoGenerator.genera(stagione, chiusure, gare, parametriEffettivi);

    const vecchi = new Map<string, Microciclo>();
    micro.forEach(m => vecchi.set(m.inizio, m));

    let macroId = 1;
    let mesoId = 1;
    let microId = 1;

    const newMacro: Macrociclo[] = [];
    const newMeso: Mesociclo[] = [];
    const newMicro: Microciclo[] = [];

    const lunediCorrente = todayISO();

    for (const macroItem of planGen) {
      const maId = macroId++;
      newMacro.push({
        ...macroItem.macro,
        id: maId,
        stagioneId: stagione.id
      });

      for (const mesoItem of macroItem.meso) {
        const meId = mesoId++;
        newMeso.push({
          ...mesoItem.meso,
          id: meId,
          macrocicloId: maId
        });

        for (const microItem of mesoItem.micro) {
          const miId = microId++;
          const vecchio = vecchi.get(microItem.inizio);

          let finalMicro = { ...microItem, id: miId, mesocicloId: meId };
          if (vecchio) {
            if (vecchio.bloccato) {
              finalMicro = {
                ...finalMicro,
                tipo: vecchio.tipo,
                sedutePreviste: vecchio.sedutePreviste,
                volumeTargetMetri: vecchio.volumeTargetMetri,
                note: vecchio.note,
                bloccato: true
              };
            } else if (conservaPassato && microItem.inizio < lunediCorrente) {
              finalMicro = {
                ...finalMicro,
                tipo: vecchio.tipo,
                sedutePreviste: vecchio.sedutePreviste,
                volumeTargetMetri: vecchio.volumeTargetMetri,
                note: vecchio.note,
                bloccato: false
              };
            }
          }
          newMicro.push(finalMicro);
        }
      }
    }

    setMacro(newMacro);
    setMeso(newMeso);
    setMicro(newMicro);
  };

  // Ensure plan exists if a season is set and micro is empty
  // (adjust state during render: niente effect + setState)
  const [pianoGeneratoPer, setPianoGeneratoPer] = useState<number | null>(null);
  if (stagione && micro.length === 0 && pianoGeneratoPer !== stagione.id) {
    setPianoGeneratoPer(stagione.id);
    rigeneraPianoInterno(false);
  }

  // Auto-volume update for athletes with volumeAuto: true
  // (adjust state during render quando cambiano le condizioni)
  const [prevCondizioniAuto, setPrevCondizioniAuto] = useState<typeof condizioni | null>(null);
  if (condizioni !== prevCondizioniAuto) {
    setPrevCondizioniAuto(condizioni);
    const oggi = todayISO();
    const aggiornati = atleti.map(a => {
      if (!a.volumeAuto) return a;
      const mie = condizioni.filter(c => c.atletaId === a.id && c.attiva);
      const f = AutoPianificatore.fattoreVolumeSuggerito(a, mie, oggi);
      return Math.abs(f - a.fattoreVolume) > 0.001 ? { ...a, fattoreVolume: f } : a;
    });

    if (aggiornati.some((a, i) => a !== atleti[i])) {
      setAtleti(aggiornati);
    }
  }

  // Athlete CRUD
  const aggiungiAtleta = (a: Omit<Atleta, 'id'>) => {
    const nextId = atleti.length > 0 ? Math.max(...atleti.map(it => it.id)) + 1 : 1;
    setAtleti(prev => [...prev, { ...a, id: nextId }]);
  };

  const aggiornaAtleta = (a: Atleta) => {
    setAtleti(prev => prev.map(item => item.id === a.id ? a : item));
  };

  const eliminaAtleta = (id: number) => {
    setAtleti(prev => prev.filter(item => item.id !== id));
    setCondizioni(prev => prev.filter(c => c.atletaId !== id));
    setAssenze(prev => prev.filter(a => a.atletaId !== id));
    setTempi(prev => prev.filter(t => t.atletaId !== id));
    setLog(prev => prev.filter(l => l.atletaId !== id));
    setIscrizioniGare(prev => prev.filter(i => i.atletaId !== id));
  };

  const aggiungiCondizione = (c: Omit<CondizioneMedica, 'id'>) => {
    const nextId = condizioni.length > 0 ? Math.max(...condizioni.map(it => it.id)) + 1 : 1;
    setCondizioni(prev => [...prev, { ...c, id: nextId }]);
  };

  const eliminaCondizione = (id: number) => {
    setCondizioni(prev => prev.filter(c => c.id !== id));
  };

  const aggiungiAssenza = (a: Omit<Assenza, 'id'>) => {
    const nextId = assenze.length > 0 ? Math.max(...assenze.map(it => it.id)) + 1 : 1;
    setAssenze(prev => [...prev, { ...a, id: nextId }]);
  };

  const eliminaAssenza = (id: number) => {
    setAssenze(prev => prev.filter(a => a.id !== id));
  };

  // Season and Planning
  const creaStagione = (nome: string, inizio: string, fine: string) => {
    const nuovaStagione: Stagione = {
      id: 1,
      nome: nome.trim() || 'Stagione Agonistica FINP',
      inizio,
      fine,
      vascaMetri: 25
    };
    const feste = Festivita.perStagione(nuovaStagione).map((c, i) => ({ ...c, id: i + 1 }));

    const planGen = PianoGenerator.genera(nuovaStagione, feste, [], parametriEffettivi);
    let macroId = 1;
    let mesoId = 1;
    let microId = 1;

    const newMacro: Macrociclo[] = [];
    const newMeso: Mesociclo[] = [];
    const newMicro: Microciclo[] = [];

    for (const macroItem of planGen) {
      const maId = macroId++;
      newMacro.push({ ...macroItem.macro, id: maId, stagioneId: nuovaStagione.id });
      for (const mesoItem of macroItem.meso) {
        const meId = mesoId++;
        newMeso.push({ ...mesoItem.meso, id: meId, macrocicloId: maId });
        for (const microItem of mesoItem.micro) {
          newMicro.push({ ...microItem, id: microId++, mesocicloId: meId });
        }
      }
    }

    setStagione(nuovaStagione);
    setChiusure(feste);
    setGare([]);
    setIscrizioniGare([]);
    setMacro(newMacro);
    setMeso(newMeso);
    setMicro(newMicro);

    FINPStorage.saveStagione(nuovaStagione);
    FINPStorage.saveChiusure(feste);
    FINPStorage.saveGare([]);
    FINPStorage.saveIscrizioniGare([]);
    FINPStorage.savePiano(newMacro, newMeso, newMicro);
  };

  const modificaDateStagione = (inizio: string, fine: string) => {
    if (!stagione) return;
    const stagioneAggiornata: Stagione = {
      ...stagione,
      inizio,
      fine
    };
    setStagione(stagioneAggiornata);

    // Recompute plan
    const planGen = PianoGenerator.genera(stagioneAggiornata, chiusure, gare, parametriEffettivi);
    let macroId = 1;
    let mesoId = 1;
    let microId = 1;

    const newMacro: Macrociclo[] = [];
    const newMeso: Mesociclo[] = [];
    const newMicro: Microciclo[] = [];
    const vecchi = new Map(micro.map(m => [m.inizio, m]));

    for (const macroItem of planGen) {
      const maId = macroId++;
      newMacro.push({ ...macroItem.macro, id: maId, stagioneId: stagioneAggiornata.id });
      for (const mesoItem of macroItem.meso) {
        const meId = mesoId++;
        newMeso.push({ ...mesoItem.meso, id: meId, macrocicloId: maId });
        for (const microItem of mesoItem.micro) {
          const miId = microId++;
          const vecchio = vecchi.get(microItem.inizio);
          let finalMicro = { ...microItem, id: miId, mesocicloId: meId };
          if (vecchio && vecchio.bloccato) {
            finalMicro = {
              ...finalMicro,
              tipo: vecchio.tipo,
              sedutePreviste: vecchio.sedutePreviste,
              volumeTargetMetri: vecchio.volumeTargetMetri,
              note: vecchio.note,
              bloccato: true
            };
          }
          newMicro.push(finalMicro);
        }
      }
    }

    setMacro(newMacro);
    setMeso(newMeso);
    setMicro(newMicro);
  };

  const eliminaStagione = () => {
    setStagione(null);
    setChiusure([]);
    setGare([]);
    setIscrizioniGare([]);
    setMacro([]);
    setMeso([]);
    setMicro([]);

    FINPStorage.saveStagione(null);
    FINPStorage.saveChiusure([]);
    FINPStorage.saveGare([]);
    FINPStorage.saveIscrizioniGare([]);
    FINPStorage.savePiano([], [], []);
  };

  const archiviaStagione = (): ArchivioStagione | null => {
    if (!stagione) return null;
    const archivio = costruisciArchivioStagione({
      stagione,
      chiusure,
      gare,
      iscrizioniGare,
      macrocicli: macro,
      mesocicli: meso,
      microcicli: micro,
      log,
    });

    const s = stagione;
    setStagione(null);
    setChiusure([]);
    setGare([]);
    setIscrizioniGare([]);
    setMacro([]);
    setMeso([]);
    setMicro([]);
    // Il registro della stagione va nell'archivio: il log attivo perde solo
    // le sedute nel periodo; le stagioni precedenti restano come storico.
    setLog(prev => prev.filter(l => !logNellaStagione(l.data, s)));

    FINPStorage.saveStagione(null);
    FINPStorage.saveChiusure([]);
    FINPStorage.saveGare([]);
    FINPStorage.saveIscrizioniGare([]);
    FINPStorage.savePiano([], [], []);
    // Il log attivo è già persistito dall'effect su `log`.
    return archivio;
  };

  const aggiungiChiusura = (dal: string, al: string, motivo: string) => {
    if (!stagione) return;
    const nextId = chiusure.length > 0 ? Math.max(...chiusure.map(it => it.id)) + 1 : 1;
    const nuoveChiusure = [...chiusure, { id: nextId, stagioneId: stagione.id, dal, al, motivo }];
    setChiusure(nuoveChiusure);

    // Auto-update plan
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const eliminaChiusura = (id: number) => {
    setChiusure(prev => prev.filter(c => c.id !== id));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const modificaChiusura = (chiusura: Chiusura) => {
    setChiusure(prev => prev.map(c => (c.id === chiusura.id ? chiusura : c)));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const aggiungiFestivitaNazionali = () => {
    if (!stagione) return;
    const giaPresenti = new Set(chiusure.map(c => c.dal));
    const nuove = Festivita.perStagione(stagione).filter(f => !giaPresenti.has(f.dal));
    let nextId = chiusure.length > 0 ? Math.max(...chiusure.map(it => it.id)) + 1 : 1;
    const aggiunte = nuove.map(n => ({ ...n, id: nextId++ }));
    setChiusure(prev => [...prev, ...aggiunte]);
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const aggiungiGara = (nome: string, dal: string, al: string, prioritaria: boolean, luogo = '') => {
    if (!stagione) return;
    const nextId = gare.length > 0 ? Math.max(...gare.map(it => it.id)) + 1 : 1;
    setGare(prev => [...prev, { id: nextId, stagioneId: stagione.id, nome, dal, al, luogo, prioritaria }]);
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const modificaGara = (gara: Gara) => {
    setGare(prev => prev.map(g => (g.id === gara.id ? gara : g)));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const eliminaGara = (id: number) => {
    setGare(prev => prev.filter(g => g.id !== id));
    setIscrizioniGare(prev => prev.filter(i => i.garaId !== id));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const aggiungiIscrizioneGara = (i: Omit<IscrizioneGara, 'id'>) => {
    const nextId = iscrizioniGare.length > 0 ? Math.max(...iscrizioniGare.map(it => it.id)) + 1 : 1;
    setIscrizioniGare(prev => [...prev, { ...i, id: nextId }]);
  };

  const aggiornaIscrizioneGara = (i: IscrizioneGara) => {
    setIscrizioniGare(prev => prev.map(it => (it.id === i.id ? i : it)));
  };

  const eliminaIscrizioneGara = (id: number) => {
    setIscrizioniGare(prev => prev.filter(it => it.id !== id));
  };

  const salvaImpostazioni = (imp: ImpostazioniPiano) => {
    setImpostazioni(imp);
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  // Cambi di vasca/durata non devono rigenerare il piano: sono parametri
  // operativi della seduta, non struttura della periodizzazione.
  const commitImpostazioni = (imp: ImpostazioniPiano) => {
    setImpostazioni(imp);
    FINPStorage.saveImpostazioni(imp);
  };

  const impostaParametriGiorno = (giorno: DayOfWeekNum, parametri: ParametriSeduta) => {
    commitImpostazioni(conParametriGiorno(impostazioni, giorno, parametri));
  };

  const impostaOverrideSeduta = (data: string, parametri: ParametriSeduta) => {
    commitImpostazioni(conOverride(impostazioni, data, parametri));
  };

  const rimuoviOverrideSeduta = (data: string) => {
    commitImpostazioni(senzaOverride(impostazioni, data));
  };

  const impostaDurataDefault = (minuti: number) => {
    commitImpostazioni({ ...impostazioni, durataDefaultMin: minuti });
  };

  const rigeneraPianoCompleto = () => {
    rigeneraPianoInterno(false);
  };

  const modificaMicro = (m: Microciclo) => {
    setMicro(prev => prev.map(item => item.id === m.id ? { ...m, bloccato: true } : item));
  };

  const sbloccaMicro = (m: Microciclo) => {
    setMicro(prev => prev.map(item => item.id === m.id ? { ...m, bloccato: false } : item));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  // Tempi and Log
  const aggiungiTempo = (t: Omit<Tempo, 'id'>) => {
    const nextId = tempi.length > 0 ? Math.max(...tempi.map(it => it.id)) + 1 : 1;
    setTempi(prev => [ { ...t, id: nextId }, ...prev ]);
  };

  const eliminaTempo = (id: number) => {
    setTempi(prev => prev.filter(t => t.id !== id));
  };

  const salvaSeduta = (data: string, items: Omit<LogSeduta, 'id'>[]) => {
    // Delete existing logs for this date
    const filtered = log.filter(l => l.data !== data);
    // reduce invece di Math.max(...spread): con >100k log lo spread
    // supera il limite di argomenti della call stack.
    let nextId = 1;
    for (const it of filtered) if (it.id >= nextId) nextId = it.id + 1;
    const newItems = items.map(item => ({ ...item, id: nextId++ }));
    setLog([...newItems, ...filtered]);
  };

  return (
    <AppContext.Provider
      value={{
        atleti,
        condizioni,
        assenze,
        tempi,
        log,
        stagione,
        chiusure,
        gare,
        iscrizioniGare,
        macro,
        meso,
        micro,
        impostazioni,
        parametriEffettivi,
        avvisiPiano,
        assegnazioneVasca,
        salvaAssegnazioneVasca: setAssegnazioneVasca,
        parametriOggi,
        aggiungiAtleta,
        aggiornaAtleta,
        eliminaAtleta,
        aggiungiCondizione,
        eliminaCondizione,
        aggiungiAssenza,
        eliminaAssenza,
        creaStagione,
        modificaDateStagione,
        eliminaStagione,
        archiviaStagione,
        aggiungiChiusura,
        modificaChiusura,
        eliminaChiusura,
        aggiungiFestivitaNazionali,
        aggiungiGara,
        modificaGara,
        eliminaGara,
        aggiungiIscrizioneGara,
        aggiornaIscrizioneGara,
        eliminaIscrizioneGara,
        salvaImpostazioni,
        impostaParametriGiorno,
        impostaOverrideSeduta,
        rimuoviOverrideSeduta,
        impostaDurataDefault,
        rigeneraPianoCompleto,
        modificaMicro,
        sbloccaMicro,
        aggiungiTempo,
        eliminaTempo,
        salvaSeduta,
        layoutScelto,
        setLayoutScelto,
        themeMode,
        setThemeMode
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
