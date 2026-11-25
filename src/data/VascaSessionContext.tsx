import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  VascaSession,
  createSession,
  sessionNow,
  refreshSession,
  athleteStatus,
  migrateSession,
} from '../domain/cronometroVasca';
import { kvGet, kvSet } from './kvStore';
import { beep, vibrate } from '../lib/beep';

const STORAGE_KEY = 'finp_vasca_session_v1';
const PERSIST_DEBOUNCE_MS = 250;
const ENGINE_TICK_MS = 200;

function loadSession(): VascaSession | null {
  try {
    const raw = kvGet(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as VascaSession;
    if (!s || !Array.isArray(s.lanes) || typeof s.stato !== 'string') return null;
    return migrateSession(s);
  } catch {
    return null;
  }
}

function persistSession(s: VascaSession): void {
  try {
    kvSet(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new Event('finp:vasca-session'));
  } catch {
    /* quota o private mode */
  }
}

export const cloneSession = (s: VascaSession): VascaSession =>
  JSON.parse(JSON.stringify(s)) as VascaSession;

function emitEvents(events: { type: string; athleteId: string; laneNumero: number }[]): void {
  for (const e of events) {
    if (e.type === 'autoWarn') {
      beep(660, 120);
      vibrate([0, 120, 60, 120]);
    } else if (e.type === 'autoStart') {
      beep(880, 160);
      vibrate([0, 140, 60, 140, 60, 300]);
    }
  }
}

interface VascaSessionContextType {
  /** Sessione corrente (oggetto mutato dal motore; `version` força il rerender). */
  session: VascaSession;
  sessionRef: React.MutableRefObject<VascaSession>;
  /** Sostituisce la sessione (gia' clonata), persiste e notifica. */
  setSession: (s: VascaSession) => void;
  /** Forza un rerender dei consumatori. */
  bump: () => void;
  /** Persistenza debounced. */
  schedulePersist: () => void;
  /** Persistenza immediata (es. hide/ unload). */
  flushPersist: () => void;
}

const VascaSessionContext = createContext<VascaSessionContextType | null>(null);

/**
 * Motore della sessione cronometro a livello app: resta attivo anche quando
 * la pagina Vasca e' smontata (cambio tab), cosi' le partenze automatiche,
 * i beep e i cambi di stato non si fermano mai.
 */
export const VascaSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionRef = useRef<VascaSession>(loadSession() ?? createSession());
  const [version, setVersion] = useState(0);
  const saveTimerRef = useRef<number | null>(null);
  const warnRef = useRef<Set<string>>(new Set());
  const lastSigRef = useRef('');

  // Handle di collaudo (script QA su device): accesso in sola lettura/
  // scrittura al riferimento di sessione, senza aggirare la persistenza.
  useEffect(() => {
    (window as unknown as { __FINP_VASCA_SESSION__?: typeof sessionRef }).__FINP_VASCA_SESSION__ = sessionRef;
  }, []);

  const bump = useCallback(() => setVersion(v => v + 1), []);

  const persistNow = useCallback(() => {
    persistSession(sessionRef.current);
  }, []);

  const schedulePersist = useCallback(() => {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
  }, [persistNow]);

  const flushPersist = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    persistNow();
  }, [persistNow]);

  const setSession = useCallback(
    (s: VascaSession) => {
      sessionRef.current = s;
      bump();
      schedulePersist();
    },
    [bump, schedulePersist],
  );

  // Motore: refresh sessione (partenze automatiche, fini recupero), beep,
  // vibrazioni di avviso e firma di stato per il rerender dei consumatori.
  useEffect(() => {
    const iv = window.setInterval(() => {
      const s = sessionRef.current;
      const events = refreshSession(s);
      emitEvents(events);
      const now = sessionNow(s);
      let sig = `${s.stato}|`;
      for (const lane of s.lanes) {
        for (const a of lane.atleti) {
          sig += `${a.id}:${athleteStatus(s, lane, a, now)};`;
        }
      }
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        bump();
        schedulePersist();
      }
      // Vibrazione leggera negli ultimi 5 s prima del fine turno.
      for (const lane of s.lanes) {
        for (const a of lane.atleti) {
          if (a.repStart == null || a.fermo) continue;
          const rip = (a.ripartenzaAtleta ?? lane.ripartenzaCorsia ?? s.ripartenzaGenerale);
          if (rip <= 0) continue;
          const remaining = a.repStart + rip * 1000 - now;
          const key = `${a.id}:${a.repStart}`;
          if (remaining <= 5000 && remaining > 0 && !warnRef.current.has(key)) {
            warnRef.current.add(key);
            vibrate([0, 50]);
          }
          if (remaining <= 0) warnRef.current.delete(key);
        }
      }
    }, ENGINE_TICK_MS);
    return () => window.clearInterval(iv);
  }, [bump, schedulePersist]);

  // Persistenza su hide/unload.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushPersist();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', flushPersist);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', flushPersist);
      flushPersist();
    };
  }, [flushPersist]);

  const value = useMemo<VascaSessionContextType>(
    () => ({
      // `version` garantisce che `session` sia la lettura più recente dopo ogni bump.
      // eslint-disable-next-line react-hooks/refs -- pattern intenzionale: session è letta da sessionRef e il bump di `version` forza il nuovo value
      session: sessionRef.current,
      sessionRef,
      setSession,
      bump,
      schedulePersist,
      flushPersist,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSession, bump, schedulePersist, flushPersist, version],
  );

  // eslint-disable-next-line react-hooks/refs -- value è memoizzato con `version` nella deps: legge sessionRef di proposito
  return <VascaSessionContext.Provider value={value}>{children}</VascaSessionContext.Provider>;
};

export const useVascaSession = (): VascaSessionContextType => {
  const ctx = useContext(VascaSessionContext);
  if (!ctx) throw new Error('useVascaSession must be used within VascaSessionProvider');
  return ctx;
};
