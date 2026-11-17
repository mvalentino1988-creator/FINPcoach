import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  VascaSession,
  VascaLane,
  VascaAthlete,
  AthleteStatus,
  createSession,
  createLane,
  createAthlete,
  sessionNow,
  effectiveRipartenza,
  refreshSession,
  tapAthlete,
  lapGenerale,
  viaGenerale,
  stopGenerale,
  resumeGenerale,
  athleteStatus,
  currentRepMs,
  lastLapMs,
  formatMs,
  formatClock,
  formatRipartenza,
  chooseOrientation,
  measureMinTileW,
  buildSummary,
  summaryText,
  RIPARTENZA_PRESETS,
  INTERVALLO_PRESETS,
  MAX_LANES,
  MAX_ATHLETES_PER_LANE,
} from '../domain/cronometroVasca';
import { applyOrientation, releaseOrientation } from '../lib/orientation';
import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';
import { beep, vibrate } from '../lib/beep';
import { todayISO } from '../domain/dateUtils';
import { Atleta } from '../types';
import {
  AssegnazioneVasca,
  RIPARTENZA_GENERALE_DEFAULT,
  assegnaAtleta,
  atletiAssegnati,
  impostaIntervalloCorsia,
  impostaRipartenzaAtleta,
  impostaRipartenzaCorsia,
  impostaRipartenzaGenerale,
  rimuoviDaCorsia,
} from '../domain/assegnazioneVasca';
import {
  Flag,
  OctagonX,
  Play,
  RotateCcw,
  Undo2,
  Plus,
  X,
  Save,
  Copy,
  Timer,
  ChevronDown,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const STORAGE_KEY = 'finp_vasca_session_v1';
const UNDO_MAX = 40;
const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 400;

// ---------------------------------------------------------------------------
// Persistenza
// ---------------------------------------------------------------------------

function loadSession(): VascaSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as VascaSession;
    if (!s || !Array.isArray(s.lanes) || typeof s.stato !== 'string') return null;
    return s;
  } catch {
    return null;
  }
}

function persistSession(s: VascaSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new Event('finp:vasca-session'));
  } catch {
    /* quota o private mode */
  }
}

const cloneSession = (s: VascaSession): VascaSession => JSON.parse(JSON.stringify(s)) as VascaSession;

/** Costruisce le corsie della sessione partendo dall'AssegnazioneVasca (Regia).
 *  Solo in stato 'pronta': in corsa la composizione e' congelata. */
function buildLanesDaAssegnazione(
  a: AssegnazioneVasca | null,
  atleti: Atleta[],
  prevAthletes: Map<number, { id: string; targetLaps: number | null }>
): { ripGenerale: number; lanes: VascaLane[] } {
  if (!a) return { ripGenerale: RIPARTENZA_GENERALE_DEFAULT, lanes: [] };
  const perId = new Map(atleti.map(x => [x.id, x]));
  const lanes = a.corsie.map(c => {
    const lane = createLane(c.numero);
    lane.ripartenzaCorsia = c.ripartenzaCorsia;
    lane.intervalloPartenza = c.intervalloPartenza;
    lane.atleti = c.atletiIds
      .map(id => perId.get(id))
      .filter((x): x is Atleta => !!x)
      .map(x => {
        const created = createAthlete(x.id, x.cognome || x.nome);
        const prev = prevAthletes.get(x.id);
        if (prev) {
          created.id = prev.id;
          created.targetLaps = prev.targetLaps;
        }
        created.ripartenzaAtleta = a.ripartenzeAtleta[x.id] ?? null;
        return created;
      });
    return lane;
  });
  return { ripGenerale: a.ripartenzaGenerale, lanes };
}

// ---------------------------------------------------------------------------
// Audio/eventi
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

type SheetKind =
  | { type: 'athlete'; laneNumero: number; athlete: VascaAthlete }
  | { type: 'lane'; lane: VascaLane }
  | { type: 'ripGlobal' }
  | { type: 'picker'; lane: VascaLane }
  | null;

interface TimerNodes {
  time?: HTMLElement | null;
  bar?: HTMLElement | null;
  sub?: HTMLElement | null;
}

const STATUS_META: Record<AthleteStatus, { label: string; symbol: string; cls: string; bar: string }> = {
  in_attesa:     { label: 'Attesa',     symbol: '○', cls: 'text-on-surface-variant',        bar: 'bg-outline-variant' },
  in_nuoto:      { label: 'In nuoto',   symbol: '●', cls: 'text-secondary',                 bar: 'bg-secondary' },
  in_ripartenza: { label: 'Recupero',   symbol: '◔', cls: 'text-primary',                   bar: 'bg-primary' },
  in_ritardo:    { label: 'In ritardo', symbol: '▲', cls: 'text-warning',                   bar: 'bg-warning' },
  fermo:         { label: 'Fermo',      symbol: '■', cls: 'text-on-surface-variant',        bar: 'bg-outline' },
};

export const CronometroVasca: React.FC<{ attivo?: boolean }> = ({ attivo = true }) => {
  const { atleti, stagione, aggiungiTempo, assegnazioneVasca, salvaAssegnazioneVasca, parametriOggi, impostaOverrideSeduta } = useApp();
  // 'attivo' governa il possesso dell'orientamento (vedi effetto orientamento).
  const vascaMetri: 25 | 50 = stagione?.vascaMetri === 25 ? 25 : 50;

  const [session, setSession] = useState<VascaSession>(() => loadSession() ?? createSession());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [resumeAsk, setResumeAsk] = useState<boolean>(() => {
    const s = loadSession();
    return !!s && (s.stato === 'in_corso' || s.stato === 'ferma');
  });
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [undoPulse, setUndoPulse] = useState(0);
  const [orientNotice, setOrientNotice] = useState(false);
  const [layoutOrient, setLayoutOrient] = useState<'portrait' | 'landscape'>('portrait');
  const [pickerQuery, setPickerQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [overrideAsk, setOverrideAsk] = useState<{ scope: 'lane' | 'global'; lane?: VascaLane; apply: (s: VascaSession) => void } | null>(null);
  const overrideChoiceRef = useRef<'keep' | 'overwrite' | null>(null);

  const undoRef = useRef<string[]>([]);
  const nodesRef = useRef<Map<string, TimerNodes>>(new Map());
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const generalTimeRef = useRef<HTMLOutputElement | null>(null);
  const lastSigRef = useRef('');
  const warnRef = useRef<Set<string>>(new Set());
  const tapGuardRef = useRef<Map<string, number>>(new Map());
  const saveTimerRef = useRef<number | null>(null);
  const appliedOrientRef = useRef<{ mode: 'portrait' | 'landscape'; score: number } | null>(null);
  const desktopRef = useRef(false);

  const bump = useCallback(() => setSession(s => ({ ...s })), []);

  // -------------------------------------------------------------------------
  // Persistenza
  // -------------------------------------------------------------------------

  const persist = useCallback((s: VascaSession) => {
    persistSession(s);
  }, []);

  const schedulePersist = useCallback(() => {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => persist(sessionRef.current), 250);
  }, [persist]);

  const flushPersist = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    persist(sessionRef.current);
  }, [persist]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Wake lock durante la permanenza nella schermata
  // -------------------------------------------------------------------------

  useEffect(() => {
    void requestKeepScreenOn();
    return () => {
      void releaseKeepScreenOn();
      releaseOrientation();
      document.body.classList.remove('vasca-live');
    };
  }, []);

  // -------------------------------------------------------------------------
  // Undo (snapshot)
  // -------------------------------------------------------------------------

  const pushUndo = useCallback(() => {
    undoRef.current.push(JSON.stringify(sessionRef.current));
    if (undoRef.current.length > UNDO_MAX) undoRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const snap = undoRef.current.pop();
    if (!snap) return;
    try {
      sessionRef.current = JSON.parse(snap) as VascaSession;
      setSession(cloneSession(sessionRef.current));
      schedulePersist();
      setUndoPulse(p => p + 1);
    } catch {
      /* noop */
    }
  }, [schedulePersist]);

  const noteAction = useCallback(() => {
    setUndoPulse(p => p + 1);
    schedulePersist();
  }, [schedulePersist]);

  // Il banner "Annulla" resta evidenziato per 5 s dopo ogni azione.
  useEffect(() => {
    if (undoPulse === 0) return undefined;
    const t = window.setTimeout(() => setUndoPulse(0), 5000);
    return () => window.clearTimeout(t);
  }, [undoPulse]);

  // -------------------------------------------------------------------------
  // Assegnazione Vasca (Regia): in stato 'pronta' la composizione delle corsie
  // segue l'assegnazione persistita; in corsa e' congelata nella sessione.
  // -------------------------------------------------------------------------

  const oggi = todayISO();
  const assegnazioneCorrente = assegnazioneVasca && assegnazioneVasca.data === oggi ? assegnazioneVasca : null;
  const [syncNonce, setSyncNonce] = useState(0);
  const lastSyncSigRef = useRef('');

  const presentiIds = useMemo(() => {
    const tutti = atleti.map(x => x.id);
    const validi = new Set(tutti);
    const base = parametriOggi.atletiPresentiIds ?? tutti;
    return base.filter(id => validi.has(id));
  }, [parametriOggi.atletiPresentiIds, atleti]);
  const presentiSet = useMemo(() => new Set(presentiIds), [presentiIds]);

  const updateAssegnazione = useCallback(
    (fn: (a: AssegnazioneVasca) => AssegnazioneVasca | null) => {
      const cur = assegnazioneCorrente;
      if (!cur) return;
      const next = fn(cur);
      if (next && next !== cur) salvaAssegnazioneVasca(next);
    },
    [assegnazioneCorrente, salvaAssegnazioneVasca],
  );

  // Sincronizza le corsie della sessione con la Regia (solo in 'pronta').
  useEffect(() => {
    const s = sessionRef.current;
    if (s.stato !== 'pronta') {
      lastSyncSigRef.current = '';
      return;
    }
    const prevAthletes = new Map<number, { id: string; targetLaps: number | null }>();
    for (const l of s.lanes) {
      for (const at of l.atleti) {
        if (at.atletaId != null) prevAthletes.set(at.atletaId, { id: at.id, targetLaps: at.targetLaps });
      }
    }
    const built = buildLanesDaAssegnazione(assegnazioneCorrente, atleti, prevAthletes);
    const sig = JSON.stringify({
      g: built.ripGenerale,
      l: built.lanes.map(l => [l.numero, l.ripartenzaCorsia, l.intervalloPartenza, l.atleti.map(x => x.atletaId)]),
    });
    if (sig === lastSyncSigRef.current) return;
    lastSyncSigRef.current = sig;
    const next = cloneSession(s);
    next.ripartenzaGenerale = built.ripGenerale;
    next.lanes = built.lanes;
    sessionRef.current = next;
    setSession(next);
    persist(next);
  }, [assegnazioneCorrente, atleti, syncNonce, persist]);

  // -------------------------------------------------------------------------
  // Scheduler: refresh sessione (auto-start, fine recuperi) + transizioni stato
  // -------------------------------------------------------------------------

  useEffect(() => {
    const iv = window.setInterval(() => {
      const s = sessionRef.current;
      const events = refreshSession(s);
      emitEvents(events);
      // Firma degli stati per evitare render inutili.
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
      // Vibrazione leggera negli ultimi 5 s prima del fine turno (in nuoto/ritardo).
      for (const lane of s.lanes) {
        for (const a of lane.atleti) {
          if (a.repStart == null || a.fermo) continue;
          const rip = effectiveRipartenza(s, lane, a);
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
    }, 200);
    return () => window.clearInterval(iv);
  }, [bump, schedulePersist]);

  // -------------------------------------------------------------------------
  // Orologio: aggiornamento diretto dei nodi via requestAnimationFrame
  // -------------------------------------------------------------------------

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = sessionRef.current;
      const now = sessionNow(s);
      const gen = generalTimeRef.current;
      if (gen) {
        const txt = s.stato === 'pronta' ? '00:00.00' : formatMs(now - (s.t0 ?? now));
        if (gen.textContent !== txt) gen.textContent = txt;
      }
      for (const lane of s.lanes) {
        for (const a of lane.atleti) {
          const nodes = nodesRef.current.get(a.id);
          if (!nodes) continue;
          const st = athleteStatus(s, lane, a, now);
          if (nodes.time) {
            let txt = '—';
            if (st === 'in_nuoto' || st === 'in_ritardo') {
              txt = formatMs(currentRepMs(s, lane, a, now) ?? 0);
            } else if (st === 'in_ripartenza' && a.restUntil != null) {
              txt = formatClock(a.restUntil - now);
            } else if (st === 'fermo' || st === 'in_attesa') {
              const lap = lastLapMs(a);
              txt = lap != null ? formatMs(lap) : '—';
            } else {
              const lap = lastLapMs(a);
              txt = lap != null ? formatMs(lap) : '—';
            }
            if (nodes.time.textContent !== txt) nodes.time.textContent = txt;
          }
          if (nodes.bar) {
            const rip = effectiveRipartenza(s, lane, a);
            let pct = 0;
            if (st === 'in_ripartenza' && a.restUntil != null && rip > 0) {
              // countdown: quanto manca al via rispetto al recupero totale
              const total = rip * 1000;
              const lastTap = a.laps.length > 0 ? a.laps[a.laps.length - 1].t : now;
              const elapsed = Math.min(total, Math.max(0, now - lastTap));
              pct = 1 - elapsed / total;
            } else if ((st === 'in_nuoto' || st === 'in_ritardo') && a.repStart != null && rip > 0) {
              pct = Math.min(1, Math.max(0, (now - a.repStart) / (rip * 1000)));
            }
            const w = `${Math.round(pct * 100)}%`;
            if (nodes.bar.style.width !== w) nodes.bar.style.width = w;
          }
          if (nodes.sub) {
            let txt = '';
            if (st === 'in_ripartenza' && a.restUntil != null) {
              txt = `tra ${formatClock(a.restUntil - now)}`;
            } else if ((st === 'in_nuoto' || st === 'in_ritardo') && a.repStart != null) {
              const rip = effectiveRipartenza(s, lane, a);
              if (rip > 0) {
                const rem = a.repStart + rip * 1000 - now;
                txt = rem > 0 ? `manca ${formatClock(rem)}` : `+${formatClock(-rem)}`;
              }
            }
            if (nodes.sub.textContent !== txt) nodes.sub.textContent = txt;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // -------------------------------------------------------------------------
  // Orientamento automatico
  // -------------------------------------------------------------------------

  const lanesSignature = useMemo(
    () => session.lanes.map(l => `${l.numero}:${l.atleti.map(a => a.cognome).join(',')}`).join('|'),
    [session.lanes],
  );

  useEffect(() => {
    desktopRef.current = window.matchMedia('(min-width: 1024px)').matches;
    // Con la Regia aperta (o il cronometro nascosto) l'orientamento torna al
    // sistema; alla riattivazione si rivaluta e si riapplica.
    if (!attivo || desktopRef.current) {
      if (!attivo) releaseOrientation();
      return;
    }

    const evaluate = () => {
      const s = sessionRef.current;
      // Mai ruotare durante una serie (in_corso o ferma).
      if (s.stato !== 'pronta') return;
      const lanes = s.lanes.filter(l => l.atleti.length > 0);
      if (lanes.length === 0) return;

      const rootStyle = getComputedStyle(document.documentElement);
      const px = (name: string, fb: number) => {
        const v = parseFloat(rootStyle.getPropertyValue(name));
        return Number.isFinite(v) ? v : fb;
      };
      const headerH = px('--header-h', 60);
      const dockH = px('--dock-h', 76);
      const safeTop = px('--safe-top', 0);
      const safeBottom = px('--safe-bottom', 8);
      const topH = topBarRef.current?.offsetHeight ?? 52;
      const bottomH = bottomBarRef.current?.offsetHeight ?? 64;
      const chromeV = headerH + dockH + safeTop + safeBottom + topH + bottomH + 12;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const shortSide = Math.min(w, h);
      const longSide = Math.max(w, h);
      const C = lanes.length;
      const A = Math.max(...lanes.map(l => l.atleti.length));
      const cognomi = lanes.flatMap(l => l.atleti.map(a => a.cognome));
      const minTileW = measureMinTileW(cognomi);

      const inp = { corsie: C, maxAtleti: A, minTileW, shortSide, longSide, chromeV };
      const applied = appliedOrientRef.current;
      const choice = chooseOrientation(inp, applied?.mode ?? null, applied?.score ?? 0);

      if (!choice.changed && applied != null) {
        setLayoutOrient(applied.mode);
        return;
      }

      const result = applyOrientation(choice.orientation);
      if (result === 'none') {
        setOrientNotice(true);
        // Layout sul orientamento reale corrente.
        setLayoutOrient(window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');
        return;
      }
      setOrientNotice(false);
      appliedOrientRef.current = { mode: choice.orientation, score: choice.score };
      setLayoutOrient(choice.orientation);
    };

    evaluate();
    const onResize = () => evaluate();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanesSignature, session.stato, attivo]);

  // -------------------------------------------------------------------------
  // Azioni
  // -------------------------------------------------------------------------

  const mutate = useCallback(
    (fn: (s: VascaSession) => void, undoable = true) => {
      if (undoable) pushUndo();
      const s = cloneSession(sessionRef.current);
      fn(s);
      sessionRef.current = s;
      setSession(s);
      noteAction();
      bump();
    },
    [bump, noteAction, pushUndo],
  );

  const findLaneAthlete = useCallback((laneNumero: number, athleteId: string) => {
    const s = sessionRef.current;
    const lane = s.lanes.find(l => l.numero === laneNumero);
    const a = lane?.atleti.find(x => x.id === athleteId);
    return lane && a ? { lane, a } : null;
  }, []);

  const handleCardTap = useCallback(
    (laneNumero: number, athleteId: string) => {
      const now = Date.now();
      const last = tapGuardRef.current.get(athleteId) ?? 0;
      if (now - last < DOUBLE_TAP_MS) return;
      tapGuardRef.current.set(athleteId, now);

      const s = sessionRef.current;
      if (s.stato !== 'in_corso') return;
      const found = findLaneAthlete(laneNumero, athleteId);
      if (!found) return;
      const { lane, a } = found;
      // Clone-first: se l'azione è ignorata non si tocca nulla (né lo stack undo).
      const next = cloneSession(s);
      const nextLane = next.lanes.find(l => l.numero === laneNumero);
      const nextA = nextLane?.atleti.find(x => x.id === athleteId);
      if (!nextLane || !nextA) return;
      const before = nextA.laps.length;
      const res = tapAthlete(next, nextLane, nextA, sessionNow(next));
      if (res === 'ignored') return;
      pushUndo(); // snapshot della sessione precedente (ancora in sessionRef)
      sessionRef.current = next;
      setSession(next);
      if (nextA.laps.length > before) vibrate([0, 60]);
      noteAction();
      bump();
      document.body.classList.add('vasca-live');
    },
    [bump, findLaneAthlete, noteAction, pushUndo],
  );

  const handleVia = useCallback(() => {
    pushUndo();
    const s = cloneSession(sessionRef.current);
    viaGenerale(s, sessionNow(s));
    sessionRef.current = s;
    setSession(s);
    noteAction();
    bump();
    beep(880, 200);
    vibrate([0, 160, 60, 160, 60, 400]);
    document.body.classList.add('vasca-live');
  }, [bump, noteAction, pushUndo]);

  const handleResume = useCallback(() => {
    pushUndo();
    const s = cloneSession(sessionRef.current);
    resumeGenerale(s);
    sessionRef.current = s;
    setSession(s);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo]);

  const handleStopGenerale = useCallback(() => {
    pushUndo();
    const s = cloneSession(sessionRef.current);
    stopGenerale(s);
    sessionRef.current = s;
    setSession(s);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo]);

  const handleFine = useCallback(() => {
    const s = sessionRef.current;
    if (s.stato === 'in_corso') handleStopGenerale();
    setSummaryOpen(true);
    setSalvato(false);
  }, [handleStopGenerale]);

  const handleReset = useCallback(() => {
    pushUndo();
    const s = sessionRef.current;
    const fresh = createSession(s.ripartenzaGenerale);
    // Mantieni la composizione corsie/atleti, azzera solo i tempi.
    fresh.lanes = s.lanes.map(l => ({
      ...createLane(l.numero),
      ripartenzaCorsia: l.ripartenzaCorsia,
      intervalloPartenza: l.intervalloPartenza,
      atleti: l.atleti.map(a => ({
        ...createAthlete(a.atletaId, a.cognome),
        id: a.id,
        ripartenzaAtleta: a.ripartenzaAtleta,
        targetLaps: a.targetLaps,
      })),
      pendingAuto: null,
    }));
    fresh.stato = 'pronta';
    sessionRef.current = fresh;
    setSession(fresh);
    undoRef.current = [];
    warnRef.current.clear();
    document.body.classList.remove('vasca-live');
    setSheet(null);
    setSummaryOpen(false);
    setConfirmReset(false);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo]);

  const handleToggleFermo = useCallback(
    (laneNumero: number, athleteId: string) => {
      mutate(cur => {
        const l = cur.lanes.find(x => x.numero === laneNumero);
        const a = l?.atleti.find(x => x.id === athleteId);
        if (a) a.fermo = !a.fermo;
      });
    },
    [mutate],
  );

  const handleSalvaRegistro = useCallback(() => {
    const s = sessionRef.current;
    const now = sessionNow(s);
    for (const item of buildSummary(s, now)) {
      const a = item.athlete;
      if (a.atletaId == null || item.total == null || item.total <= 0) continue;
      aggiungiTempo({
        atletaId: a.atletaId,
        data: todayISO(),
        stile: 'STILE_LIBERO',
        distanzaMetri: vascaMetri,
        centesimi: Math.round(item.total / 10),
        contesto: 'ALLENAMENTO',
        vascaMetri,
        note: `Sessione bordo vasca · ${a.laps.length} ripetizioni · ultimo ${item.laps.length ? formatMs(item.laps[item.laps.length - 1].dur) : '—'}`,
      });
    }
    setSalvato(true);
  }, [aggiungiTempo, vascaMetri]);

  const handleCopia = useCallback(async () => {
    const s = sessionRef.current;
    const txt = summaryText(s, sessionNow(s), vascaMetri);
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }, [vascaMetri]);

  // -------------------------------------------------------------------------
  // Setup helpers (stato 'pronta')
  // -------------------------------------------------------------------------

  const assignedIds = useMemo(() => {
    const set = new Set<number>();
    if (session.stato === 'pronta' && assegnazioneCorrente) {
      for (const id of atletiAssegnati(assegnazioneCorrente)) set.add(id);
    } else {
      for (const l of session.lanes) for (const a of l.atleti) if (a.atletaId != null) set.add(a.atletaId);
    }
    // Gli atleti non presenti non sono assegnabili dal picker.
    for (const a of atleti) if (!presentiSet.has(a.id)) set.add(a.id);
    return set;
  }, [session.lanes, session.stato, assegnazioneCorrente, atleti, presentiSet]);

  const addLane = useCallback(() => {
    if (sessionRef.current.stato === 'pronta') {
      const n = Math.min(8, (assegnazioneCorrente?.numeroCorsie ?? 4) + 1);
      impostaOverrideSeduta(oggi, { ...parametriOggi, numeroCorsie: n });
      return;
    }
    mutate(s => {
      if (s.lanes.length >= MAX_LANES) return;
      const used = new Set(s.lanes.map(l => l.numero));
      let n = 1;
      while (used.has(n)) n++;
      s.lanes.push(createLane(n));
    });
  }, [mutate, assegnazioneCorrente, parametriOggi, impostaOverrideSeduta, oggi]);

  const removeLane = useCallback(
    (lane: VascaLane) => {
      if (sessionRef.current.stato === 'pronta') {
        // Si puo' rimuovere solo l'ultima corsia (le corsie sono 1..N continue);
        // per le altre si usa la Regia.
        const n = assegnazioneCorrente?.numeroCorsie ?? 0;
        if (lane.numero === n && n > 1) {
          impostaOverrideSeduta(oggi, { ...parametriOggi, numeroCorsie: n - 1 });
        }
        return;
      }
      mutate(s => {
        s.lanes = s.lanes.filter(l => l.numero !== lane.numero);
      });
    },
    [mutate, assegnazioneCorrente, parametriOggi, impostaOverrideSeduta, oggi],
  );

  const addAthleteToLane = useCallback(
    (laneNumero: number, atleta: { id: number; nome: string; cognome: string }) => {
      if (sessionRef.current.stato === 'pronta') {
        updateAssegnazione(a => assegnaAtleta(a, atleta.id, laneNumero));
      } else {
        mutate(s => {
          const lane = s.lanes.find(l => l.numero === laneNumero);
          if (!lane || lane.atleti.length >= MAX_ATHLETES_PER_LANE) return;
          lane.atleti.push(createAthlete(atleta.id, atleta.cognome || atleta.nome));
        });
      }
      setSheet(null);
    },
    [mutate, updateAssegnazione],
  );

  const removeAthlete = useCallback(
    (laneNumero: number, athleteId: string) => {
      if (sessionRef.current.stato === 'pronta') {
        const at = sessionRef.current.lanes
          .find(l => l.numero === laneNumero)
          ?.atleti.find(x => x.id === athleteId);
        if (at?.atletaId != null) updateAssegnazione(a => rimuoviDaCorsia(a, at.atletaId as number));
      } else {
        mutate(s => {
          const lane = s.lanes.find(l => l.numero === laneNumero);
          if (!lane) return;
          lane.atleti = lane.atleti.filter(a => a.id !== athleteId);
          if (lane.pendingAuto?.athleteId === athleteId) lane.pendingAuto = null;
        });
      }
      setSheet(null);
    },
    [mutate, updateAssegnazione],
  );

  // -------------------------------------------------------------------------
  // Ripartenze: modifica con eventuale conferma sovrascrittura
  // -------------------------------------------------------------------------

  const lanesWithPersonal = (scope: 'lane' | 'global', lane?: VascaLane): number => {
    const lanes = scope === 'global' ? sessionRef.current.lanes : sessionRef.current.lanes.filter(l => l.numero === lane?.numero);
    let n = 0;
    for (const l of lanes) for (const a of l.atleti) if (a.ripartenzaAtleta != null) n++;
    return n;
  };

  /**
   * Applica una modifica di ripartenza. Se nello scope ci sono personalizzazioni
   * atleti e non è ancora stata espressa una scelta, chiede una sola volta
   * (la scelta viene ricordata per il resto della sessione).
   */
  const withOverrideCheck = useCallback(
    (scope: 'lane' | 'global', lane: VascaLane | undefined, mutator: (s: VascaSession) => void) => {
      const applyWithClear = (s: VascaSession) => {
        if (overrideChoiceRef.current === 'overwrite') {
          const lanes = scope === 'global' ? s.lanes : s.lanes.filter(l => l.numero === lane?.numero);
          for (const l of lanes) for (const a of l.atleti) a.ripartenzaAtleta = null;
        }
        mutator(s);
      };

      if (lanesWithPersonal(scope, lane) === 0 || overrideChoiceRef.current != null) {
        mutate(applyWithClear);
        return;
      }
      setOverrideAsk({ scope, lane, apply: mutator });
    },
    [mutate],
  );

  const resolveOverride = useCallback(
    (choice: 'keep' | 'overwrite') => {
      overrideChoiceRef.current = choice;
      const req = overrideAsk;
      setOverrideAsk(null);
      if (!req) return;
      mutate(s => {
        if (choice === 'overwrite') {
          const lanes = req.scope === 'global' ? s.lanes : s.lanes.filter(l => l.numero === req.lane?.numero);
          for (const l of lanes) for (const a of l.atleti) a.ripartenzaAtleta = null;
        }
        req.apply(s);
      });
    },
    [mutate, overrideAsk],
  );

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  const laneCount = session.stato === 'pronta'
    ? session.lanes.length
    : session.lanes.filter(l => l.atleti.length > 0).length;

  const gridStyle = useMemo<React.CSSProperties>(() => {
    const C = Math.max(1, laneCount);
    const cols = layoutOrient === 'landscape' ? C : Math.ceil(C / (C <= 3 ? 1 : C <= 6 ? 2 : 3));
    const rows = layoutOrient === 'landscape' ? 1 : C <= 3 ? 1 : C <= 6 ? 2 : 3;
    return {
      gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
      gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutOrient, laneCount]);

  const laneCellH = useCallback(
    (lane: VascaLane): number => {
      const el = gridRef.current;
      if (!el) return 90;
      const C = Math.max(1, laneCount);
      const rows = layoutOrient === 'landscape' ? 1 : C <= 3 ? 1 : C <= 6 ? 2 : 3;
      const gap = 6;
      const cellH = (el.clientHeight - (rows - 1) * gap) / rows;
      const headerH = 30;
      const n = Math.max(1, lane.atleti.length);
      const gapA = 4;
      return Math.max(0, (cellH - headerH - gapA * (n - 1)) / n);
    },
    [layoutOrient, laneCount],
  );

  const laneCellW = useCallback((): number => {
    const el = gridRef.current;
    if (!el) return 90;
    const C = Math.max(1, laneCount);
    const cols = layoutOrient === 'landscape' ? C : Math.ceil(C / (C <= 3 ? 1 : C <= 6 ? 2 : 3));
    const gap = 6;
    return Math.max(0, (el.clientWidth - (cols - 1) * gap) / cols - 14);
  }, [layoutOrient, laneCount]);

  const registerNode = useCallback((athleteId: string, kind: keyof TimerNodes) => {
    return (el: HTMLElement | null) => {
      let nodes = nodesRef.current.get(athleteId);
      if (!nodes) {
        nodes = {};
        nodesRef.current.set(athleteId, nodes);
      }
      nodes[kind] = el;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const s = session;
  const now = sessionNow(s);
  const inPronta = s.stato === 'pronta';
  const lanesVisibili = s.lanes.filter(l => l.atleti.length > 0 || inPronta);

  const stopBtnHandlers = useMemo(() => {
    let lastTap = 0;
    let timer: number | null = null;
    let longFired = false;
    return {
      onPointerDown: () => {
        longFired = false;
        timer = window.setTimeout(() => {
          longFired = true;
          handleStopGenerale();
        }, 600);
      },
      onPointerUp: () => {
        if (timer != null) window.clearTimeout(timer);
        timer = null;
        if (longFired) return;
        const t = Date.now();
        if (t - lastTap < DOUBLE_TAP_MS) {
          lastTap = 0;
          handleStopGenerale();
        } else {
          lastTap = t;
        }
      },
      onPointerLeave: () => {
        if (timer != null) window.clearTimeout(timer);
        timer = null;
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  }, [handleStopGenerale]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full select-none bg-surface text-on-surface overflow-hidden">
      {/* ============ BARRA SUPERIORE ============ */}
      <div
        ref={topBarRef}
        className="shrink-0 flex items-center gap-2 px-1.5 pb-1.5"
        style={{ paddingTop: 'max(0.375rem, calc(var(--safe-top, 0px) + 0.125rem))' }}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.stato === 'in_corso' ? 'bg-status-live animate-pulse' : s.stato === 'ferma' ? 'bg-warning' : 'bg-outline'}`}
          aria-hidden
        />
        <output
          ref={generalTimeRef}
          aria-label="Tempo generale"
          className="font-stat-timer-mobile text-2xl sm:text-3xl font-bold tabular-nums text-primary leading-none whitespace-nowrap"
        >
          00:00.00
        </output>

        {/* Ripartenza generale */}
        <button
          type="button"
          onClick={() => setSheet({ type: 'ripGlobal' })}
          className="h-11 px-2.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs font-bold text-primary flex items-center gap-1 whitespace-nowrap active:scale-95 transition"
          aria-label="Ripartenza generale"
        >
          <Timer size={14} />
          <span>{formatRipartenza(s.ripartenzaGenerale)}</span>
          <ChevronDown size={12} className="text-on-surface-variant" />
        </button>

        <div className="flex-1" />

        {/* Ricarica composizione dalla Regia (solo in setup) */}
        {inPronta && (
          <button
            type="button"
            onClick={() => setSyncNonce(n => n + 1)}
            aria-label="Ricarica composizione dalla Regia"
            title="Ricarica composizione dalla Regia"
            className="h-11 w-11 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center active:scale-95 transition"
          >
            <RefreshCw size={16} />
          </button>
        )}

        {/* Fine sessione */}
        <button
          type="button"
          onClick={handleFine}
          disabled={inPronta}
          className="h-11 px-2.5 rounded-xl bg-surface-container-high text-on-surface text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 active:scale-95 transition disabled:opacity-45 whitespace-nowrap"
        >
          <Flag size={14} /> Fine
        </button>
        {/* Azzera */}
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          aria-label="Azzera sessione"
          className="h-11 w-11 rounded-xl bg-error-container/70 hover:bg-error-container text-on-error-container flex items-center justify-center active:scale-95 transition"
        >
          <RotateCcw size={17} />
        </button>
      </div>

      {orientNotice && (
        <div className="shrink-0 mx-1.5 mb-1 px-2.5 py-1 rounded-lg bg-warning-container text-on-warning-container text-[11px] font-semibold text-center">
          Ruota il telefono per più spazio
        </div>
      )}

      {/* ============ GRIGLIA CORSI E ATLETI ============ */}
      <div
        ref={gridRef}
        className="flex-1 min-h-0 grid gap-1.5 px-0.5"
        style={gridStyle}
      >
        {lanesVisibili.map(lane => {
          const tileH = laneCellH(lane);
          const tileW = laneCellW();
          const compact = tileH < 46;
          return (
            <section
              key={lane.numero}
              className="flex flex-col min-h-0 min-w-0 rounded-xl bg-surface-container-low border border-outline-variant/40 overflow-hidden"
            >
              {/* Intestazione corsia */}
              <button
                type="button"
                onClick={() => setSheet({ type: 'lane', lane })}
                className="shrink-0 min-h-[30px] px-2 flex items-center justify-between gap-1 bg-surface-container-high/70 text-on-surface active:scale-[0.99] transition"
                aria-label={`Corsia ${lane.numero}`}
              >
                <span className="font-label-caps text-label-caps font-bold uppercase tracking-wider truncate">
                  C{lane.numero}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary whitespace-nowrap">
                  {formatRipartenza(lane.ripartenzaCorsia ?? session.ripartenzaGenerale)}
                  {lane.intervalloPartenza != null && (
                    <span className="text-on-surface-variant">·↻{lane.intervalloPartenza}s</span>
                  )}
                  <ChevronDown size={11} className="text-on-surface-variant" />
                </span>
              </button>

              {/* Atleti */}
              <div className="flex-1 min-h-0 flex flex-col gap-1 p-1">
                {lane.atleti.map(a => (
                  <AthleteCard
                    key={a.id}
                    session={s}
                    lane={lane}
                    athlete={a}
                    compact={compact}
                    tileW={tileW}
                    now={now}
                    pronta={inPronta}
                    registerNode={registerNode}
                    onTap={inPronta
                      ? () => setSheet({ type: 'athlete', laneNumero: lane.numero, athlete: a })
                      : () => handleCardTap(lane.numero, a.id)}
                    onLongPress={() => setSheet({ type: 'athlete', laneNumero: lane.numero, athlete: a })}
                    onToggleStop={() => handleToggleFermo(lane.numero, a.id)}
                  />
                ))}
                {lane.atleti.length === 0 && inPronta && (
                  <button
                    type="button"
                    onClick={() => setSheet({ type: 'picker', lane })}
                    className="flex-1 min-h-[44px] rounded-lg border border-dashed border-outline-variant text-on-surface-variant text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 active:scale-[0.98] transition"
                  >
                    <Plus size={13} /> Aggiungi atleta
                  </button>
                )}
                {lane.atleti.length === 0 && !inPronta && (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-on-surface-variant font-semibold uppercase">
                    Corsia vuota
                  </div>
                )}
              </div>

              {inPronta && lane.atleti.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSheet({ type: 'picker', lane })}
                  className="shrink-0 h-8 mx-1 mb-1 rounded-lg bg-surface-container text-on-surface text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 active:scale-[0.98] transition"
                >
                  <Plus size={12} /> Atleta
                </button>
              )}
            </section>
          );
        })}

        {inPronta && session.lanes.length < MAX_LANES && (
          <button
            type="button"
            onClick={addLane}
            className="min-h-[64px] rounded-xl border-2 border-dashed border-outline-variant/70 text-on-surface-variant font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition"
          >
            <Plus size={18} /> Corsia
          </button>
        )}
      </div>

      {/* ============ BARRA INFERIORE ============ */}
      <div
        ref={bottomBarRef}
        className="shrink-0 flex items-stretch gap-2 px-1.5 pt-1.5"
        style={{ paddingBottom: 'max(0.5rem, calc(var(--safe-bottom, 8px) + 0.25rem))' }}
      >
        {s.stato === 'in_corso' ? (
          <>
            <button
              type="button"
              onClick={() => {
                const cur = cloneSession(sessionRef.current);
                const n = lapGenerale(cur, sessionNow(cur));
                if (n > 0) {
                  pushUndo();
                  sessionRef.current = cur;
                  setSession(cur);
                  vibrate([0, 50]);
                  noteAction();
                  bump();
                }
              }}
              className="flex-1 min-h-[52px] rounded-xl bg-secondary text-on-secondary font-headline-sm text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm whitespace-nowrap"
            >
              <Flag size={19} /> LAP GENERALE
            </button>
            <button
              type="button"
              {...stopBtnHandlers}
              className="flex-1 min-h-[52px] rounded-xl bg-surface-container-high text-on-surface font-headline-sm text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition border border-outline-variant/60 shadow-sm whitespace-nowrap"
              title="Long-press o doppio tap per STOP"
            >
              <OctagonX size={19} /> STOP
            </button>
          </>
        ) : s.stato === 'ferma' ? (
          <button
            type="button"
            onClick={handleResume}
            className="flex-1 min-h-[52px] rounded-xl bg-primary text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm whitespace-nowrap"
          >
            <Play size={20} /> RIPRENDI
          </button>
        ) : (
          <button
            type="button"
            onClick={handleVia}
            disabled={s.lanes.every(l => l.atleti.length === 0)}
            className="flex-1 min-h-[52px] rounded-xl bg-primary text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm disabled:opacity-45 whitespace-nowrap"
          >
            <Play size={20} /> {session.t0 != null ? 'RIPRENDI SESSIONE' : 'VIA GENERALE'}
          </button>
        )}

        <button
          type="button"
          onClick={undo}
          disabled={undoRef.current.length === 0}
          aria-label="Annulla ultima azione"
          className={`w-14 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.95] transition border ${
            undoPulse > 0
              ? 'bg-primary-container text-on-primary border-primary-container animate-pulse'
              : 'bg-surface-container-high text-on-surface border-outline-variant/60'
          } disabled:opacity-40`}
        >
          <Undo2 size={18} />
          <span>Annulla</span>
        </button>
      </div>

      {/* ============ OVERLAY: reset ============ */}
      {confirmReset && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirmReset(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full border border-outline-variant" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline-sm text-base font-bold mb-2">Azzera sessione?</h3>
            <p className="text-sm text-on-surface-variant mb-4">Tutti i tempi e le ripetizioni verranno cancellati. La composizione di corsie e atleti resta.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="flex-1 h-11 rounded-xl bg-surface-container font-bold">Annulla</button>
              <button type="button" onClick={handleReset} className="flex-1 h-11 rounded-xl bg-error text-on-error font-bold">Azzera</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ OVERLAY: resume ============ */}
      {resumeAsk && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full border border-outline-variant shadow-float">
            <h3 className="font-headline-sm text-base font-bold mb-2">Sessione interrotta</h3>
            <p className="text-sm text-on-surface-variant mb-4">Trovata una sessione vasca non conclusa. Riprenderla con i tempi salvati?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setResumeAsk(false);
                  const s = sessionRef.current;
                  if (s.stato === 'ferma') resumeGenerale(s);
                  setSession(cloneSession(s));
                  bump();
                }}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-bold"
              >
                Riprendi
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
                  const fresh = createSession();
                  sessionRef.current = fresh;
                  setSession(fresh);
                  setResumeAsk(false);
                  bump();
                }}
                className="flex-1 h-11 rounded-xl bg-surface-container font-bold"
              >
                Nuova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ OVERLAY: sovrascrittura ripartenze ============ */}
      {overrideAsk && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => resolveOverride('keep')}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full border border-outline-variant" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline-sm text-base font-bold mb-2">Personalizzazioni atleti</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Alcuni atleti hanno una ripartenza personale. Mantenerle (predefinito) o sovrascriverle con il nuovo valore?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => resolveOverride('keep')} className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-bold">
                Mantieni
              </button>
              <button type="button" onClick={() => resolveOverride('overwrite')} className="flex-1 h-11 rounded-xl bg-surface-container font-bold">
                Sovrascrivi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ BOTTOM SHEET ============ */}
      {sheet && (
        <SheetHost
          sheet={sheet}
          session={s}
          atleti={atleti}
          assignedIds={assignedIds}
          pickerQuery={pickerQuery}
          setPickerQuery={setPickerQuery}
          onClose={() => { setSheet(null); setPickerQuery(''); }}
          onAddAthlete={addAthleteToLane}
          onRemoveAthlete={removeAthlete}
          onSetLaneRip={(lane, v) =>
            inPronta
              ? updateAssegnazione(a => impostaRipartenzaCorsia(a, lane.numero, v))
              : withOverrideCheck('lane', lane, cur => {
                  const l = cur.lanes.find(x => x.numero === lane.numero);
                  if (l) l.ripartenzaCorsia = v;
                })
          }
          onSetLaneIntervallo={(lane, v) =>
            inPronta
              ? updateAssegnazione(a => impostaIntervalloCorsia(a, lane.numero, v))
              : mutate(cur => {
                  const l = cur.lanes.find(x => x.numero === lane.numero);
                  if (l) l.intervalloPartenza = v;
                })
          }
          onSetGlobalRip={(v) =>
            inPronta
              ? updateAssegnazione(a => impostaRipartenzaGenerale(a, v))
              : withOverrideCheck('global', undefined, cur => { cur.ripartenzaGenerale = v; })
          }
          onSetAthleteRip={(laneNumero, athleteId, v) => {
            if (inPronta) {
              const at = sessionRef.current.lanes
                .find(l => l.numero === laneNumero)
                ?.atleti.find(x => x.id === athleteId);
              if (at?.atletaId != null) updateAssegnazione(a => impostaRipartenzaAtleta(a, at.atletaId as number, v));
              return;
            }
            mutate(cur => {
              const l = cur.lanes.find(x => x.numero === laneNumero);
              const a = l?.atleti.find(x => x.id === athleteId);
              if (a) a.ripartenzaAtleta = v;
            });
          }}
          onSetTargetLaps={(laneNumero, athleteId, v) =>
            mutate(cur => {
              const l = cur.lanes.find(x => x.numero === laneNumero);
              const a = l?.atleti.find(x => x.id === athleteId);
              if (a) {
                a.targetLaps = v;
                if (v != null && a.laps.length >= v) a.fermo = true;
              }
            })
          }
          onCorrectLap={(laneNumero, athleteId, deltaMs) =>
            mutate(cur => {
              const l = cur.lanes.find(x => x.numero === laneNumero);
              const a = l?.atleti.find(x => x.id === athleteId);
              if (!a || a.laps.length === 0) return;
              const last = a.laps[a.laps.length - 1];
              if (deltaMs === Number.MIN_SAFE_INTEGER) {
                a.laps.pop();
                a.fermo = false;
              } else {
                last.t += deltaMs;
                last.wall += deltaMs;
              }
            })
          }
          onToggleFermo={(laneNumero, athleteId) =>
            mutate(cur => {
              const l = cur.lanes.find(x => x.numero === laneNumero);
              const a = l?.atleti.find(x => x.id === athleteId);
              if (a) a.fermo = !a.fermo;
            })
          }
          onRemoveLane={(lane) => { removeLane(lane); setSheet(null); }}
        />
      )}

      {/* ============ RIEPILOGO FINE SESSIONE ============ */}
      {summaryOpen && (
        <SummaryOverlay
          session={s}
          now={now}
          vascaMetri={vascaMetri}
          salvato={salvato}
          onSalva={handleSalvaRegistro}
          onCopia={handleCopia}
          onClose={() => setSummaryOpen(false)}
          onNuovaSessione={() => {
            setSummaryOpen(false);
            handleReset();
          }}
          onRiprendi={() => {
            setSummaryOpen(false);
            if (s.stato === 'ferma') handleResume();
          }}
          canRiprendi={s.stato === 'ferma' || s.stato === 'in_corso'}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tessera atleta
// ---------------------------------------------------------------------------

interface AthleteCardProps {
  session: VascaSession;
  lane: VascaLane;
  athlete: VascaAthlete;
  compact: boolean;
  tileW: number;
  now: number;
  pronta: boolean;
  registerNode: (id: string, kind: keyof TimerNodes) => (el: HTMLElement | null) => void;
  onTap: () => void;
  onLongPress: () => void;
  onToggleStop: () => void;
}

const AthleteCard: React.FC<AthleteCardProps> = ({
  session, lane, athlete: a, compact, tileW, now, pronta, registerNode, onTap, onLongPress, onToggleStop,
}) => {
  const status = athleteStatus(session, lane, a, now);
  const meta = STATUS_META[status];
  const personalRip = a.ripartenzaAtleta;
  const inherited = lane.ripartenzaCorsia ?? session.ripartenzaGenerale;

  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const downAt = useRef(0);

  const clearPress = () => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handlePointerDown = () => {
    downAt.current = Date.now();
    longFired.current = false;
    if (pronta) return;
    pressTimer.current = window.setTimeout(() => {
      longFired.current = true;
      navigator.vibrate?.([0, 30]);
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearPress();
    if (longFired.current) return;
    if (Date.now() - downAt.current < 700) onTap();
  };

  // Font del cognome: ridotto se il nome più lungo non sta nella tessera.
  const nameFont = useMemo(() => {
    const len = Math.max(1, a.cognome.trim().length);
    const widthAt12 = len * 6.6;
    const avail = Math.max(26, tileW - 22);
    const scale = Math.min(1.1, avail / widthAt12);
    return Math.max(9.5, Math.min(12.5, 12 * scale));
  }, [a.cognome, tileW]);

  const canStop = !pronta && (a.started || a.laps.length > 0 || a.repStart != null || a.restUntil != null);
  const stopBtn = canStop && (
    <button
      type="button"
      aria-label={`Stop ${a.cognome}`}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation();
        onToggleStop();
      }}
      className="absolute top-0 right-0 w-12 h-12 flex items-start justify-end pt-0.5 pr-0.5 z-10"
    >
      <span className="w-6 h-6 rounded-md bg-surface-container-highest/90 text-on-surface-variant flex items-center justify-center text-[10px] font-black border border-outline-variant/50">
        ■
      </span>
    </button>
  );

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={e => e.preventDefault()}
        className={`relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest px-1.5 flex items-center justify-between gap-1 overflow-hidden active:scale-[0.99] transition ${
          status === 'in_ritardo' ? 'border-warning' : status === 'in_ripartenza' ? 'border-primary' : status === 'in_nuoto' ? 'border-secondary' : 'border-outline-variant'
        }`}
      >
        <span className="font-semibold text-on-surface truncate" style={{ fontSize: 11 }}>
          {a.cognome}
        </span>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface tabular-nums shrink-0" style={{ fontSize: 13 }}>
          —
        </span>
        {stopBtn}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onContextMenu={e => e.preventDefault()}
      className="relative flex-1 min-h-0 rounded-lg bg-surface-container-lowest border border-outline-variant/50 px-1.5 py-1 flex flex-col justify-between overflow-hidden active:scale-[0.99] transition"
    >
      {/* 1) Cognome */}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight" style={{ fontSize: nameFont }}>
          {a.cognome}
        </span>
        {stopBtn}
      </div>

      {/* 2) Tempo grande */}
      <output
        ref={registerNode(a.id, 'time') as React.Ref<HTMLOutputElement>}
        className="font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center"
        style={{ fontSize: 20 }}
      >
        —
      </output>

      {/* 3) Lap + 4) stato + countdown */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
            Giro {a.laps.length}
          </span>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${meta.cls}`}>
            <span aria-hidden>{meta.symbol}</span> {meta.label}
          </span>
        </div>
        <div className="h-1 rounded-full bg-surface-container-highest overflow-hidden">
          <div
            ref={registerNode(a.id, 'bar')}
            className={`h-full rounded-full transition-[width] duration-150 ${meta.bar}`}
            style={{ width: '0%' }}
          />
        </div>
        <span ref={registerNode(a.id, 'sub')} className="text-[9px] font-semibold text-on-surface-variant tabular-nums truncate" />
        {personalRip != null && personalRip !== inherited && (
          <span className="text-[8px] font-bold uppercase tracking-wide text-tertiary">rip. {formatRipartenza(personalRip)}</span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bottom sheet generico
// ---------------------------------------------------------------------------

interface SheetHostProps {
  sheet: NonNullable<SheetKind>;
  session: VascaSession;
  atleti: { id: number; nome: string; cognome: string }[];
  assignedIds: Set<number>;
  pickerQuery: string;
  setPickerQuery: (q: string) => void;
  onClose: () => void;
  onAddAthlete: (laneNumero: number, a: { id: number; nome: string; cognome: string }) => void;
  onRemoveAthlete: (laneNumero: number, athleteId: string) => void;
  onSetLaneRip: (lane: VascaLane, v: number | null) => void;
  onSetLaneIntervallo: (lane: VascaLane, v: number | null) => void;
  onSetGlobalRip: (v: number) => void;
  onSetAthleteRip: (laneNumero: number, athleteId: string, v: number | null) => void;
  onSetTargetLaps: (laneNumero: number, athleteId: string, v: number | null) => void;
  onCorrectLap: (laneNumero: number, athleteId: string, deltaMs: number) => void;
  onToggleFermo: (laneNumero: number, athleteId: string) => void;
  onRemoveLane: (lane: VascaLane) => void;
}

const Stepper: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}> = ({ value, onChange, min = 0, max = 600, step = 5, format = v => `${v}s` }) => (
  <div className="flex items-center gap-1">
    <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="w-11 h-11 rounded-lg bg-surface-container font-black text-lg active:scale-95">−</button>
    <span className="w-16 text-center font-stat-timer text-sm font-bold tabular-nums">{format(value)}</span>
    <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="w-11 h-11 rounded-lg bg-surface-container font-black text-lg active:scale-95">+</button>
  </div>
);

const PresetRow: React.FC<{ values: readonly number[]; current: number | null; onPick: (v: number | null) => void; allowNull?: boolean }> = ({
  values, current, onPick, allowNull,
}) => (
  <div className="flex flex-wrap gap-1.5">
    {allowNull && (
      <button
        type="button"
        onClick={() => onPick(null)}
        className={`h-9 px-2.5 rounded-lg text-[11px] font-bold ${current == null ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
      >
        Auto
      </button>
    )}
    {values.map(v => (
      <button
        key={v}
        type="button"
        onClick={() => onPick(v)}
        className={`h-9 px-2.5 rounded-lg text-[11px] font-bold tabular-nums ${current === v ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
      >
        {formatRipartenza(v)}
      </button>
    ))}
  </div>
);

const SheetHost: React.FC<SheetHostProps> = (props) => {
  const { sheet, onClose } = props;
  return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full sm:max-w-md max-h-[75dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 border border-outline-variant shadow-float"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Opzioni"
      >
        {sheet.type === 'picker' && <PickerSheet {...props} lane={sheet.lane} />}
        {sheet.type === 'lane' && <LaneSheet {...props} lane={sheet.lane} />}
        {sheet.type === 'ripGlobal' && <GlobalRipSheet {...props} />}
        {sheet.type === 'athlete' && (
          <AthleteSheet
            {...props}
            laneNumero={sheet.laneNumero}
            athlete={sheet.athlete}
          />
        )}
      </div>
    </div>
  );
};

const SheetHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-headline-sm text-base font-bold text-on-surface">{title}</h3>
    <button type="button" onClick={onClose} aria-label="Chiudi" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-surface-container">
      <X size={18} />
    </button>
  </div>
);

const PickerSheet: React.FC<SheetHostProps & { lane: VascaLane }> = ({ lane, atleti, assignedIds, pickerQuery, setPickerQuery, onAddAthlete, onClose }) => {
  const q = pickerQuery.trim().toLowerCase();
  const list = atleti.filter(a => !assignedIds.has(a.id) && (!q || `${a.cognome} ${a.nome}`.toLowerCase().includes(q)));
  return (
    <div>
      <SheetHeader title={`Corsia ${lane.numero} — scegli atleta`} onClose={onClose} />
      <input
        autoFocus
        value={pickerQuery}
        onChange={e => setPickerQuery(e.target.value)}
        placeholder="Cerca cognome…"
        className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant/60 text-sm mb-2"
      />
      <div className="flex flex-col gap-1">
        {list.length === 0 && <p className="text-sm text-on-surface-variant py-4 text-center">Nessun atleta disponibile</p>}
        {list.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAddAthlete(lane.numero, a)}
            className="min-h-[48px] px-3 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold text-left flex items-center justify-between active:scale-[0.99]"
          >
            <span className="truncate">{a.cognome} {a.nome}</span>
            <Plus size={16} className="text-primary shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

const LaneSheet: React.FC<SheetHostProps & { lane: VascaLane }> = ({
  lane: laneProp, session, onSetLaneRip, onSetLaneIntervallo, onRemoveLane, onClose,
}) => {
  // Risolvi sempre la corsia fresca (lo sheet può restare aperto durante le modifiche).
  const lane = session.lanes.find(l => l.numero === laneProp.numero) ?? laneProp;
  return (
  <div>
    <SheetHeader title={`Corsia ${lane.numero}`} onClose={onClose} />
    <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Ripartenza tra giri</p>
    <PresetRow values={RIPARTENZA_PRESETS} current={lane.ripartenzaCorsia} onPick={v => onSetLaneRip(lane, v)} allowNull />
    <div className="mt-2 mb-1">
      <Stepper
        value={lane.ripartenzaCorsia ?? session.ripartenzaGenerale}
        onChange={v => onSetLaneRip(lane, v)}
        min={5}
        max={600}
        format={formatRipartenza}
      />
    </div>
    <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Intervallo di partenza</p>
    <PresetRow values={INTERVALLO_PRESETS} current={lane.intervalloPartenza} onPick={v => onSetLaneIntervallo(lane, v)} allowNull />
    <div className="mt-2">
      <Stepper
        value={lane.intervalloPartenza ?? 10}
        onChange={v => onSetLaneIntervallo(lane, v === 0 ? null : v)}
        min={5}
        max={120}
        format={v => `${v}s`}
      />
    </div>
    <p className="text-xs text-on-surface-variant mt-3">«Auto» eredita la ripartenza generale. L'intervallo fa partire in automatici gli atleti in attesa, uno ogni N secondi.</p>
    {session.stato === 'pronta' && (
      <button
        type="button"
        onClick={() => onRemoveLane(lane)}
        className="mt-4 w-full h-11 rounded-xl bg-error-container text-on-error-container font-bold text-sm flex items-center justify-center gap-2"
      >
        <Trash2 size={15} /> Rimuovi corsia
      </button>
    )}
  </div>
  );
};

const GlobalRipSheet: React.FC<SheetHostProps> = ({ session, onSetGlobalRip, onClose }) => (
  <div>
    <SheetHeader title="Ripartenza generale" onClose={onClose} />
    <PresetRow values={RIPARTENZA_PRESETS} current={session.ripartenzaGenerale} onPick={v => { if (v != null) onSetGlobalRip(v); }} />
    <div className="mt-3">
      <Stepper
        value={session.ripartenzaGenerale}
        onChange={onSetGlobalRip}
        min={5}
        max={600}
        format={formatRipartenza}
      />
    </div>
    <p className="text-xs text-on-surface-variant mt-3">Valore predefinito per gli atleti senza ripartenza personale o di corsia.</p>
  </div>
);

const AthleteSheet: React.FC<SheetHostProps & { laneNumero: number; athlete: VascaAthlete }> = ({
  laneNumero, athlete: athleteProp, session, onSetAthleteRip, onSetTargetLaps, onCorrectLap, onToggleFermo, onRemoveAthlete, onClose,
}) => {
  // Risolvi l'atleta fresco dalla sessione (lo sheet può restare aperto).
  const athlete = session.lanes
    .find(l => l.numero === laneNumero)
    ?.atleti.find(x => x.id === athleteProp.id) ?? athleteProp;
  const lane = session.lanes.find(l => l.numero === laneNumero);
  const inherited = lane?.ripartenzaCorsia ?? session.ripartenzaGenerale;
  const current = athlete.ripartenzaAtleta ?? inherited;
  const isPronta = session.stato === 'pronta';
  return (
    <div>
      <SheetHeader title={athlete.cognome} onClose={onClose} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Ripartenza personale</p>
      <PresetRow
        values={RIPARTENZA_PRESETS}
        current={athlete.ripartenzaAtleta}
        onPick={v => onSetAthleteRip(laneNumero, athlete.id, v)}
        allowNull
      />
      <div className="mt-2">
        <Stepper
          value={current}
          onChange={v => onSetAthleteRip(laneNumero, athlete.id, v)}
          min={5}
          max={600}
          format={formatRipartenza}
        />
      </div>
      {athlete.ripartenzaAtleta != null && (
        <button
          type="button"
          onClick={() => onSetAthleteRip(laneNumero, athlete.id, null)}
          className="mt-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface text-xs font-bold"
        >
          Ripristina ereditata ({formatRipartenza(inherited)})
        </button>
      )}

      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Lap target (auto-stop)</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, athlete.targetLaps == null ? 1 : Math.max(1, athlete.targetLaps - 1))} className="w-11 h-11 rounded-lg bg-surface-container font-black">−</button>
        <span className="w-14 text-center font-stat-timer text-sm font-bold">{athlete.targetLaps ?? '—'}</span>
        <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, (athlete.targetLaps ?? 0) + 1)} className="w-11 h-11 rounded-lg bg-surface-container font-black">+</button>
        {athlete.targetLaps != null && (
          <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, null)} className="h-11 px-3 rounded-lg bg-surface-container text-on-surface text-xs font-bold">Auto</button>
        )}
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Correggi ultimo lap</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, -5000)} className="h-10 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">−5s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, -1000)} className="h-10 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">−1s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, 1000)} className="h-10 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">+1s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, 5000)} className="h-10 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">+5s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, Number.MIN_SAFE_INTEGER)} className="h-10 px-3 rounded-lg bg-error-container text-on-error-container text-xs font-bold disabled:opacity-40">Elimina</button>
      </div>

      <div className="flex gap-2 mt-4">
        {!isPronta && (
          <button type="button" onClick={() => onToggleFermo(laneNumero, athlete.id)} className="flex-1 h-11 rounded-xl bg-surface-container-high font-bold text-sm">
            {athlete.fermo ? 'Riprendi' : 'Stop individuale'}
          </button>
        )}
        {isPronta && (
          <button type="button" onClick={() => onRemoveAthlete(laneNumero, athlete.id)} className="flex-1 h-11 rounded-xl bg-error-container text-on-error-container font-bold text-sm flex items-center justify-center gap-1">
            <Trash2 size={14} /> Rimuovi
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Riepilogo
// ---------------------------------------------------------------------------

const SummaryOverlay: React.FC<{
  session: VascaSession;
  now: number;
  vascaMetri: number;
  salvato: boolean;
  onSalva: () => void;
  onCopia: () => void;
  onClose: () => void;
  onNuovaSessione: () => void;
  onRiprendi: () => void;
  canRiprendi: boolean;
}> = ({ session, now, vascaMetri, salvato, onSalva, onCopia, onClose, onNuovaSessione, onRiprendi, canRiprendi }) => {
  const items = buildSummary(session, now);
  const conTempi = items.filter(i => i.total != null && i.total > 0);
  return (
    <div className="fixed inset-0 z-[65] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg max-h-[85dvh] flex flex-col border border-outline-variant shadow-float overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="font-headline-sm text-lg font-bold">Riepilogo sessione</h3>
            <p className="text-xs text-on-surface-variant">{conTempi.length} atleti con tempi · vasca {vascaMetri}m</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-surface-container">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 flex flex-col gap-2">
          {items.map(item => {
            const a = item.athlete;
            if (item.total == null && a.laps.length === 0) return null;
            return (
              <div key={a.id} className="rounded-xl bg-surface-container-low border border-outline-variant/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-on-surface truncate">C{item.laneNumero} · {a.cognome}</span>
                  <span className="font-stat-timer text-sm font-bold text-primary tabular-nums shrink-0">
                    {item.total != null ? formatMs(item.total) : '—'}
                  </span>
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {a.laps.length} ripetizioni
                  {item.laps.length > 0 && (
                    <span className="block mt-0.5 tabular-nums">
                      {item.laps.map(l => formatMs(l.dur)).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {conTempi.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-8">Nessun tempo registrato.</p>
          )}
        </div>
        <div className="shrink-0 grid grid-cols-2 gap-2 p-4 border-t border-outline-variant/40">
          <button type="button" onClick={onSalva} disabled={salvato || conTempi.length === 0} className="h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={16} /> {salvato ? 'Salvato' : 'Salva registro'}
          </button>
          <button type="button" onClick={onCopia} className="h-12 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm flex items-center justify-center gap-2">
            <Copy size={16} /> Copia testo
          </button>
          {canRiprendi && (
            <button type="button" onClick={onRiprendi} className="h-12 rounded-xl bg-surface-container font-bold text-sm col-span-2">
              Torna alla seduta
            </button>
          )}
          <button type="button" onClick={onNuovaSessione} className="h-12 rounded-xl bg-error-container text-on-error-container font-bold text-sm col-span-2">
            Nuova sessione
          </button>
        </div>
      </div>
    </div>
  );
};
