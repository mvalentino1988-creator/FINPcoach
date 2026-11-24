import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  VascaSession,
  VascaLane,
  createSession,
  createLane,
  createAthlete,
  sessionNow,
  effectiveRipartenza,
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
  chooseOrientation,
  measureMinTileW,
  buildSummary,
  summaryText,
  MAX_LANES,
  MAX_ATHLETES_PER_LANE,
} from '../domain/cronometroVasca';
import { applyOrientation, releaseOrientation } from '../lib/orientation';
import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';
import { setImmersive, releaseImmersive } from '../lib/immersive';
import { beep, vibrate } from '../lib/beep';
import { cloneSession, useVascaSession } from '../data/VascaSessionContext';
import { leggiSessioneVasca, VASCA_SESSION_KEY } from '../lib/vascaSessione';
import { todayISO } from '../domain/dateUtils';
import { presentiEffettiviInData } from '../domain/assenze';
import { SheetHost, SummaryOverlay, SheetKind, TimerNodes } from './cronometroParts';
import { CronometroLayout } from './CronometroLayout';

/**
 * Attiva/disattiva la modalità "live": nasconde l'intera chrome dell'app
 * (classe CSS vasca-live) e le barre di sistema Android (immersive).
 */
function setLiveChrome(on: boolean) {
  document.body.classList.toggle('vasca-live', on);
  if (on) setImmersive(true);
  else releaseImmersive();
}
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



const UNDO_MAX = 40;
const DOUBLE_TAP_MS = 400;

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
// Componente
// ---------------------------------------------------------------------------




export const CronometroVasca: React.FC<{ attivo?: boolean }> = ({ attivo = true }) => {
  const { atleti, stagione, assenze, aggiungiTempo, assegnazioneVasca, salvaAssegnazioneVasca, parametriOggi, impostaOverrideSeduta } = useApp();
  // 'attivo' governa il possesso dell'orientamento (vedi effetto orientamento).
  const vascaMetri: 25 | 50 = stagione?.vascaMetri === 25 ? 25 : 50;

  // Sessione condivisa a livello app (VascaSessionProvider): il motore
  // (partenze automatiche, beep, persistenza) resta attivo anche quando
  // questa vista e' smontata.
  const { session, sessionRef, setSession, bump, schedulePersist } = useVascaSession();

  const [resumeAsk, setResumeAsk] = useState<boolean>(() => {
    if (sessionStorage.getItem('finp_vasca_resume_asked') === '1') return false;
    const s = leggiSessioneVasca();
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
  const [undoDepth, setUndoDepth] = useState(0);
  const nodesRef = useRef<Map<string, TimerNodes>>(new Map());
  const topBarRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const generalTimeRef = useRef<HTMLOutputElement>(null);
  const tapGuardRef = useRef<Map<string, number>>(new Map());
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setGridSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const appliedOrientRef = useRef<{ mode: 'portrait' | 'landscape'; score: number } | null>(null);
  const desktopRef = useRef(false);
  const didMountEvalRef = useRef(false);
  const [ignoredSignals, setIgnoredSignals] = useState<Record<string, number>>({});

  // -------------------------------------------------------------------------
  // Wake lock durante la permanenza nella schermata
  // -------------------------------------------------------------------------

  useEffect(() => {
    void requestKeepScreenOn();
    return () => {
      void releaseKeepScreenOn();
      releaseOrientation();
      setLiveChrome(false);
    };
  }, []);

  // Sessione ripresa già in corso/ferma: il live parte subito a schermo libero.
  useEffect(() => {
    const st = sessionRef.current.stato;
    if (st === 'in_corso' || st === 'ferma') setLiveChrome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al mount
  }, []);

  // -------------------------------------------------------------------------
  // Undo (snapshot)
  // -------------------------------------------------------------------------

  const pushUndo = useCallback(() => {
    undoRef.current.push(JSON.stringify(sessionRef.current));
    if (undoRef.current.length > UNDO_MAX) undoRef.current.shift();
    setUndoDepth(undoRef.current.length);
  }, [sessionRef]);

  const undo = useCallback(() => {
    const snap = undoRef.current.pop();
    setUndoDepth(undoRef.current.length);
    if (!snap) return;
    try {
      sessionRef.current = JSON.parse(snap) as VascaSession;
      setSession(cloneSession(sessionRef.current));
      schedulePersist();
      setUndoPulse(p => p + 1);
    } catch {
      /* noop */
    }
  }, [schedulePersist, sessionRef, setSession]);

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

  const presentiIds = useMemo(
    () => presentiEffettiviInData(oggi, atleti, assenze, parametriOggi.atletiPresentiIds),
    [parametriOggi.atletiPresentiIds, atleti, assenze, oggi]
  );
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
  }, [assegnazioneCorrente, atleti, syncNonce, setSession, sessionRef]);

  // -------------------------------------------------------------------------
  // Orologio: aggiornamento diretto dei nodi via requestAnimationFrame
  // (il motore di sessione — refresh, auto-start, beep — vive in
  // VascaSessionProvider e resta attivo anche a vista smontata)
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
  }, [sessionRef]);

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

    // Sul montaggio si rivaluta anche una sessione gia' avviata (una sola
    // volta): sceglie l'orientamento per il layout live. In seguito, con una
    // serie in corso, non si rivaluta mai — si riapplica solo l'orientamento
    // gia' scelto (ad es. al ritorno dalla Regia).
    const forceEval = !didMountEvalRef.current;
    didMountEvalRef.current = true;

    const evaluate = (force = false) => {
      const s = sessionRef.current;
      const pronta = s.stato === 'pronta';
      if (!pronta && !force) {
        // Sessione avviata: riapplica l'orientamento scelto, mai una nuova scelta.
        const applied = appliedOrientRef.current;
        if (applied) {
          applyOrientation(applied.mode);
          setLayoutOrient(applied.mode);
        }
        return;
      }
      const lanes = s.lanes.filter(l => l.atleti.length > 0);
      if (lanes.length === 0) return;

      const rootStyle = getComputedStyle(document.documentElement);
      const px = (name: string, fb: number) => {
        const v = parseFloat(rootStyle.getPropertyValue(name));
        return Number.isFinite(v) ? v : fb;
      };
      const safeTop = px('--safe-top', 0);
      const safeBottom = px('--safe-bottom', 8);
      const topH = topBarRef.current?.offsetHeight ?? 52;
      const bottomH = bottomBarRef.current?.offsetHeight ?? 64;
      // La scelta serve al layout live (fullscreen): si usa sempre il chrome
      // della serie — solo le barre del cronometro e la safe area.
      const chromeV = safeTop + safeBottom + topH + bottomH + 8;

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

    evaluate(forceEval);
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
    [bump, noteAction, pushUndo, sessionRef, setSession],
  );

  const findLaneAthlete = useCallback((laneNumero: number, athleteId: string) => {
    const s = sessionRef.current;
    const lane = s.lanes.find(l => l.numero === laneNumero);
    const a = lane?.atleti.find(x => x.id === athleteId);
    return lane && a ? { lane, a } : null;
  }, [sessionRef]);

  const handleCardTap = useCallback(
    (laneNumero: number, athleteId: string) => {
      const now = Date.now();
      const last = tapGuardRef.current.get(athleteId) ?? 0;
      if (now - last < DOUBLE_TAP_MS) return;
      tapGuardRef.current.set(athleteId, now);

      const s = sessionRef.current;
      if (s.stato !== 'in_corso') return;
      if (!findLaneAthlete(laneNumero, athleteId)) return;
      // Clone-first: se l'azione è ignorata non si tocca nulla (né lo stack undo).
      const next = cloneSession(s);
      const nextLane = next.lanes.find(l => l.numero === laneNumero);
      const nextA = nextLane?.atleti.find(x => x.id === athleteId);
      if (!nextLane || !nextA) return;
      const before = nextA.laps.length;
      const res = tapAthlete(next, nextLane, nextA, sessionNow(next));
      if (res === 'ignored') {
        // Feedback visivo leggero: tap durante il recupero (o atleta fermo).
        setIgnoredSignals(m => ({ ...m, [athleteId]: Date.now() }));
        return;
      }
      pushUndo(); // snapshot della sessione precedente (ancora in sessionRef)
      sessionRef.current = next;
      setSession(next);
      if (nextA.laps.length > before) vibrate([0, 60]);
      noteAction();
      bump();
      setLiveChrome(true);
    },
    [bump, findLaneAthlete, noteAction, pushUndo, sessionRef, setSession],
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
    setLiveChrome(true);
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);

  const handleResume = useCallback(() => {
    pushUndo();
    const s = cloneSession(sessionRef.current);
    resumeGenerale(s);
    sessionRef.current = s;
    setSession(s);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);

  const handleStopGenerale = useCallback(() => {
    pushUndo();
    const s = cloneSession(sessionRef.current);
    stopGenerale(s);
    sessionRef.current = s;
    setSession(s);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);

  const handleFine = useCallback(() => {
    const s = sessionRef.current;
    if (s.stato === 'in_corso') handleStopGenerale();
    setLiveChrome(false);
    setSummaryOpen(true);
    setSalvato(false);
  }, [handleStopGenerale, sessionRef]);

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
    setUndoDepth(0);
    setLiveChrome(false);
    setSheet(null);
    setSummaryOpen(false);
    setConfirmReset(false);
    noteAction();
    bump();
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);

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
  }, [aggiungiTempo, vascaMetri, sessionRef]);

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
  }, [vascaMetri, sessionRef]);

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
  }, [mutate, assegnazioneCorrente, parametriOggi, impostaOverrideSeduta, oggi, sessionRef]);

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
    [mutate, assegnazioneCorrente, parametriOggi, impostaOverrideSeduta, oggi, sessionRef],
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
    [mutate, updateAssegnazione, sessionRef],
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
    [mutate, updateAssegnazione, sessionRef],
  );

  // -------------------------------------------------------------------------
  // Ripartenze: modifica con eventuale conferma sovrascrittura
  // -------------------------------------------------------------------------

  const lanesWithPersonal = useCallback((scope: 'lane' | 'global', lane?: VascaLane): number => {
    const lanes = scope === 'global' ? sessionRef.current.lanes : sessionRef.current.lanes.filter(l => l.numero === lane?.numero);
    let n = 0;
    for (const l of lanes) for (const a of l.atleti) if (a.ripartenzaAtleta != null) n++;
    return n;
  }, [sessionRef]);

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
    [mutate, lanesWithPersonal],
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
     
  }, [layoutOrient, laneCount]);

  const laneCellH = useCallback(
    (lane: VascaLane): number => {
      const { h: cellHTotal } = gridSize;
      if (!cellHTotal) return 90;
      const C = Math.max(1, laneCount);
      const rows = layoutOrient === 'landscape' ? 1 : C <= 3 ? 1 : C <= 6 ? 2 : 3;
      const gap = 6;
      const cellH = (cellHTotal - (rows - 1) * gap) / rows;
      const headerH = 30;
      const n = Math.max(1, lane.atleti.length);
      const gapA = 4;
      // Margine di sicurezza: la stima resta sotto l'altezza reale cosi'
      // il layout non va mai in overflow per differenze di 1-2px.
      return Math.max(0, (cellH - headerH - gapA * (n - 1)) / n - 6);
    },
    [layoutOrient, laneCount, gridSize],
  );

  const laneCellW = useCallback((): number => {
    const { w: cellWTotal } = gridSize;
    if (!cellWTotal) return 90;
    const C = Math.max(1, laneCount);
    const cols = layoutOrient === 'landscape' ? C : Math.ceil(C / (C <= 3 ? 1 : C <= 6 ? 2 : 3));
    const gap = 6;
    return Math.max(0, (cellWTotal - (cols - 1) * gap) / cols - 14);
  }, [layoutOrient, laneCount, gridSize]);

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
        // eslint-disable-next-line react-hooks/immutability -- timer è una variabile locale del useMemo usata come debounce dei gesture handler
        timer = null;
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  }, [handleStopGenerale]);

  const handleLapGenerale = () => {
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
  };

  return (
    <CronometroLayout
      s={s}
      now={now}
      inPronta={inPronta}
      topBarRef={topBarRef}
      bottomBarRef={bottomBarRef}
      gridRef={gridRef}
      generalTimeRef={generalTimeRef}
      gridStyle={gridStyle}
      orientNotice={orientNotice}
      lanesVisibili={lanesVisibili}
      laneCellH={laneCellH}
      laneCellW={laneCellW}
      registerNode={registerNode}
      ignoredSignals={ignoredSignals}
      onOpenRipGlobal={() => setSheet({ type: 'ripGlobal' })}
      onOpenLaneSheet={lane => setSheet({ type: 'lane', lane })}
      onOpenPicker={lane => setSheet({ type: 'picker', lane })}
      onOpenAthleteSheet={(laneNumero, athlete) => setSheet({ type: 'athlete', laneNumero, athlete })}
      onCardTap={handleCardTap}
      onToggleFermo={handleToggleFermo}
      onReloadSync={() => setSyncNonce(n => n + 1)}
      onFine={handleFine}
      onRequestReset={() => setConfirmReset(true)}
      addLane={addLane}
      onLapGenerale={handleLapGenerale}
      stopBtnHandlers={stopBtnHandlers}
      onResume={handleResume}
      onVia={handleVia}
      undo={undo}
      undoDepth={undoDepth}
      undoPulse={undoPulse}
      overlays={<>
      {/* ============ OVERLAY: reset ============ */}
      {confirmReset && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <button type="button" aria-label="Chiudi finestra" tabIndex={-1} onClick={() => setConfirmReset(false)} className="absolute inset-0 cursor-default" />
          <div className="relative bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full border border-outline-variant" role="dialog" aria-modal="true" aria-label="Conferma azzeramento">
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
                  sessionStorage.setItem('finp_vasca_resume_asked', '1');
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
                  sessionStorage.setItem('finp_vasca_resume_asked', '1');
                  try { localStorage.removeItem(VASCA_SESSION_KEY); } catch { /* noop */ }
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
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <button type="button" aria-label="Chiudi finestra" tabIndex={-1} onClick={() => resolveOverride('keep')} className="absolute inset-0 cursor-default" />
          <div className="relative bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full border border-outline-variant" role="dialog" aria-modal="true" aria-label="Personalizzazioni atleti">
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

      </>}
      sheetNode={
        <>
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

        </>
      }
      summaryNode={
        <>
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
        </>
      }
    />
  );
};
