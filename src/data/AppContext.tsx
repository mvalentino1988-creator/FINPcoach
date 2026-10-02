import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Assenza,
  Atleta,
  Avviso,
  Chiusura,
  CondizioneMedica,
  Gara,
  ImpostazioniPiano,
  LogSeduta,
  Macrociclo,
  Mesociclo,
  Microciclo,
  ParametriPiano,
  Stagione,
  Tempo
} from '../types';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { Festivita } from '../domain/festivita';
import { PianoGenerator } from '../domain/pianoGenerator';
import { PianoValidator } from '../domain/validatori';
import { todayISO } from '../domain/dateUtils';
import { FINPStorage } from './storage';

interface AppContextType {
  atleti: Atleta[];
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  log: LogSeduta[];
  stagione: Stagione | null;
  chiusure: Chiusura[];
  gare: Gara[];
  macro: Macrociclo[];
  meso: Mesociclo[];
  micro: Microciclo[];
  impostazioni: ImpostazioniPiano;
  parametriEffettivi: ParametriPiano;
  avvisiPiano: Avviso[];

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
  eliminaStagione: () => void;
  aggiungiChiusura: (dal: string, al: string, motivo: string) => void;
  eliminaChiusura: (id: number) => void;
  aggiungiFestivitaNazionali: () => void;
  aggiungiGara: (nome: string, dal: string, al: string, prioritaria: boolean) => void;
  eliminaGara: (id: number) => void;
  salvaImpostazioni: (imp: ImpostazioniPiano) => void;
  rigeneraPianoCompleto: () => void;
  modificaMicro: (m: Microciclo) => void;
  sbloccaMicro: (m: Microciclo) => void;

  // Tempi e Log
  aggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  eliminaTempo: (id: number) => void;
  salvaSeduta: (data: string, items: Omit<LogSeduta, 'id'>[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [atleti, setAtleti] = useState<Atleta[]>(() => FINPStorage.getAtleti());
  const [condizioni, setCondizioni] = useState<CondizioneMedica[]>(() => FINPStorage.getCondizioni());
  const [assenze, setAssenze] = useState<Assenza[]>(() => FINPStorage.getAssenze());
  const [tempi, setTempi] = useState<Tempo[]>(() => FINPStorage.getTempi());
  const [log, setLog] = useState<LogSeduta[]>(() => FINPStorage.getLogSedute());
  const [stagione, setStagione] = useState<Stagione | null>(() => FINPStorage.getStagione());
  const [chiusure, setChiusure] = useState<Chiusura[]>(() => FINPStorage.getChiusure());
  const [gare, setGare] = useState<Gara[]>(() => FINPStorage.getGare());
  const [macro, setMacro] = useState<Macrociclo[]>(() => FINPStorage.getMacrocicli());
  const [meso, setMeso] = useState<Mesociclo[]>(() => FINPStorage.getMesocicli());
  const [micro, setMicro] = useState<Microciclo[]>(() => FINPStorage.getMicrocicli());
  const [impostazioni, setImpostazioni] = useState<ImpostazioniPiano>(() => FINPStorage.getImpostazioni());

  // Save changes
  useEffect(() => { FINPStorage.saveAtleti(atleti); }, [atleti]);
  useEffect(() => { FINPStorage.saveCondizioni(condizioni); }, [condizioni]);
  useEffect(() => { FINPStorage.saveAssenze(assenze); }, [assenze]);
  useEffect(() => { FINPStorage.saveTempi(tempi); }, [tempi]);
  useEffect(() => { FINPStorage.saveLogSedute(log); }, [log]);
  useEffect(() => { FINPStorage.saveStagione(stagione); }, [stagione]);
  useEffect(() => { FINPStorage.saveChiusure(chiusure); }, [chiusure]);
  useEffect(() => { FINPStorage.saveGare(gare); }, [gare]);
  useEffect(() => { FINPStorage.savePiano(macro, meso, micro); }, [macro, meso, micro]);
  useEffect(() => { FINPStorage.saveImpostazioni(impostazioni); }, [impostazioni]);

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
    return PianoValidator.valida(stagione, micro, gare);
  }, [stagione, micro, gare]);

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
  useEffect(() => {
    if (stagione && micro.length === 0) {
      rigeneraPianoInterno(false);
    }
  }, [stagione]);

  // Auto-volume update for athletes with volumeAuto: true
  useEffect(() => {
    const oggi = todayISO();
    let cambiati = false;
    const aggiornati = atleti.map(a => {
      if (!a.volumeAuto) return a;
      const mie = condizioni.filter(c => c.atletaId === a.id && c.attiva);
      const f = AutoPianificatore.fattoreVolumeSuggerito(a, mie, oggi);
      if (Math.abs(f - a.fattoreVolume) > 0.001) {
        cambiati = true;
        return { ...a, fattoreVolume: f };
      }
      return a;
    });

    if (cambiati) {
      setAtleti(aggiornati);
    }
  }, [condizioni]);

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
      nome,
      inizio,
      fine,
      vascaMetri: 25
    };
    const feste = Festivita.perStagione(nuovaStagione).map((c, i) => ({ ...c, id: i + 1 }));
    setStagione(nuovaStagione);
    setChiusure(feste);
    setGare([]);

    // Immediately generate plan
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

    setMacro(newMacro);
    setMeso(newMeso);
    setMicro(newMicro);
  };

  const eliminaStagione = () => {
    setStagione(null);
    setChiusure([]);
    setGare([]);
    setMacro([]);
    setMeso([]);
    setMicro([]);
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

  const aggiungiFestivitaNazionali = () => {
    if (!stagione) return;
    const giaPresenti = new Set(chiusure.map(c => c.dal));
    const nuove = Festivita.perStagione(stagione).filter(f => !giaPresenti.has(f.dal));
    let nextId = chiusure.length > 0 ? Math.max(...chiusure.map(it => it.id)) + 1 : 1;
    const aggiunte = nuove.map(n => ({ ...n, id: nextId++ }));
    setChiusure(prev => [...prev, ...aggiunte]);
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const aggiungiGara = (nome: string, dal: string, al: string, prioritaria: boolean) => {
    if (!stagione) return;
    const nextId = gare.length > 0 ? Math.max(...gare.map(it => it.id)) + 1 : 1;
    setGare(prev => [...prev, { id: nextId, stagioneId: stagione.id, nome, dal, al, luogo: '', prioritaria }]);
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const eliminaGara = (id: number) => {
    setGare(prev => prev.filter(g => g.id !== id));
    setTimeout(() => rigeneraPianoInterno(true), 50);
  };

  const salvaImpostazioni = (imp: ImpostazioniPiano) => {
    setImpostazioni(imp);
    setTimeout(() => rigeneraPianoInterno(true), 50);
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
    let filtered = log.filter(l => l.data !== data);
    let nextId = filtered.length > 0 ? Math.max(...filtered.map(it => it.id)) + 1 : 1;
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
        macro,
        meso,
        micro,
        impostazioni,
        parametriEffettivi,
        avvisiPiano,
        aggiungiAtleta,
        aggiornaAtleta,
        eliminaAtleta,
        aggiungiCondizione,
        eliminaCondizione,
        aggiungiAssenza,
        eliminaAssenza,
        creaStagione,
        eliminaStagione,
        aggiungiChiusura,
        eliminaChiusura,
        aggiungiFestivitaNazionali,
        aggiungiGara,
        eliminaGara,
        salvaImpostazioni,
        rigeneraPianoCompleto,
        modificaMicro,
        sbloccaMicro,
        aggiungiTempo,
        eliminaTempo,
        salvaSeduta
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
