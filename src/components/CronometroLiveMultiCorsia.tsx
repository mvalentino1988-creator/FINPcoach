import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import { todayISO } from '../domain/dateUtils';
import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, Gauge, LayoutGrid, Pause, Play, Plus, RotateCcw, Save } from 'lucide-react';

interface Split {
  lap: number;
  time: string;
  timestampMs: number;
  recordedAtMs: number;
}

interface AthleteInLane {
  id: string;
  atletaId: number;
  atletaNome: string;
  classe: string;
  startedAtMs: number | null;
  nextStartAtMs: number | null;
  splitList: Split[];
}

interface LaneState {
  id: number;
  laneNumber: number;
  ripartenzaSecondi: number;
  ripartenzaText?: string;
  athletes: AthleteInLane[];
}

const MAX_LANES = 8;
const MAX_ATHLETES_PER_LANE = 6;

const initialsOf = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Notazione: 45 s · 1:30 · 2:00
const formatRipartenza = (totalSec: number): string => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (totalSec < 60) return `${totalSec} s`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// Accetta "45 s", "5 s", "2 m", "1:30", "1.30"/"1,30" e secondi puri ("90").
const parseRipartenza = (raw: string): number | null => {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return null;
  let m = t.match(/^(\d+)m$/);
  if (m) {
    const v = Number(m[1]) * 60;
    return v <= 7200 ? v : null;
  }
  m = t.match(/^(\d+)s$/);
  if (m) {
    const v = Number(m[1]);
    return v >= 0 && v <= 7200 ? v : null;
  }
  if (/^\d+$/.test(t)) {
    const v = Number(t);
    return v >= 0 && v <= 7200 ? v : null;
  }
  m = t.match(/^(\d{1,3})[:.,](\d{1,2})$/);
  if (!m) return null;
  const secs = Number(m[2].padStart(2, '0'));
  if (secs > 59) return null;
  const total = Number(m[1]) * 60 + secs;
  return total <= 7200 ? total : null;
};

const formatMs = (ms: number) => {
  const totalCentiseconds = Math.max(0, Math.floor(ms / 10));
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

const createAthlete = (athlete: { id: number; nome: string; cognome: string; classeS?: number }, id: string): AthleteInLane => ({
  id,
  atletaId: athlete.id,
  atletaNome: `${athlete.cognome} ${athlete.nome}`,
  classe: athlete.classeS != null ? `S${athlete.classeS}` : 'S?',
  startedAtMs: null,
  nextStartAtMs: null,
  splitList: [],
});

const createInitialLanes = (
  athletes: { id: number; nome: string; cognome: string; classeS?: number }[],
  defaultRipartenza: number = 90
): LaneState[] => {
  const laneCount = Math.min(MAX_LANES, Math.max(1, athletes.length));
  const lanes = Array.from({ length: laneCount }, (_, index) => ({
    id: index + 1,
    laneNumber: index + 1,
    ripartenzaSecondi: defaultRipartenza,
    athletes: [] as AthleteInLane[],
  }));

  athletes.slice(0, MAX_LANES * MAX_ATHLETES_PER_LANE).forEach((athlete, index) => {
    lanes[index % laneCount].athletes.push(createAthlete(athlete, `ath-${athlete.id}`));
  });

  return lanes;
};

const getFirstAthletesIds = (laneList: LaneState[]): Set<string> => {
  const ids = new Set<string>();
  laneList.forEach(lane => {
    if (lane.athletes.length > 0) {
      ids.add(lane.athletes[0].id);
    }
  });
  return ids;
};

// Stato corsia per chip di navigazione
const laneStatusOf = (lane: LaneState, sessionStarted: boolean, masterTime: number): 'LIBERA' | 'IN ATTESA' | 'IN ACQUA' | 'PAUSA' => {
  if (lane.athletes.length === 0) return 'LIBERA';
  if (!sessionStarted) return 'IN ATTESA';
  const hasActive = lane.athletes.some(
    a => a.startedAtMs !== null && !(a.nextStartAtMs !== null && masterTime < a.nextStartAtMs)
  );
  if (hasActive) return 'IN ACQUA';
  const hasStarted = lane.athletes.some(a => a.startedAtMs !== null);
  return hasStarted ? 'PAUSA' : 'IN ATTESA';
};

const LANE_DOT: Record<string, string> = {
  'IN ACQUA': 'bg-secondary',
  'PAUSA': 'bg-tertiary',
  'IN ATTESA': 'bg-on-surface-variant/50',
  'LIBERA': 'bg-outline',
};

const LANE_STATUS_LABEL: Record<string, string> = {
  'IN ACQUA': 'In acqua',
  'PAUSA': 'Pausa',
  'IN ATTESA': 'In attesa',
  'LIBERA': 'Libera',
};

const ATHLETE_STATUS_STYLE: Record<string, string> = {
  'AL VIA': 'bg-primary text-on-primary',
  'IN ATTESA': 'bg-surface-container-high text-on-surface-variant',
  'PAUSA': 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'IN ACQUA': 'bg-secondary-container text-on-secondary-container',
};

const ACTION_STYLE: Record<string, string> = {
  LAP: 'bg-primary text-on-primary',
  VIA: 'bg-tertiary text-on-tertiary',
  PAUSA: 'bg-tertiary-container text-on-tertiary',
};

export const CronometroLiveMultiCorsia: React.FC = () => {
  const { atleti, stagione, aggiungiTempo } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lanes, setLanes] = useState<LaneState[]>(() => createInitialLanes(atleti));
  const [selectedStartAthleteIds, setSelectedStartAthleteIds] = useState<Set<string>>(() => {
    const initial = createInitialLanes(atleti);
    return getFirstAthletesIds(initial);
  });
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const savedTimeRef = useRef(0);
  const idRef = useRef(0);
  const [vascaMetri] = useState<25 | 50>(() => (stagione?.vascaMetri === 25 ? 25 : 50));
  const [ripartenzaText, setRipartenzeText] = useState(() => formatRipartenza(90));
  const [ripartenzaSecondi, setRipartenzaSecondi] = useState(90);
  const [salvatoFeedback, setSalvatoFeedback] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [activeLaneId, setActiveLaneId] = useState<number | null>(null);

  // Mantieni lo schermo acceso quando il cronometro è attivo
  useEffect(() => {
    if (isRunning) {
      requestKeepScreenOn();
    } else {
      releaseKeepScreenOn();
    }
  }, [isRunning]);

  useEffect(() => {
    return () => {
      releaseKeepScreenOn();
    };
  }, []);

  const assignedAthleteIds = useMemo(
    () => new Set(lanes.flatMap(lane => lane.athletes.map(athlete => athlete.atletaId))),
    [lanes],
  );
  const availableAthletes = useMemo(
    () => atleti.filter(athlete => !assignedAthleteIds.has(athlete.id)),
    [atleti, assignedAthleteIds],
  );
  const assignedCount = assignedAthleteIds.size;

  // Le corsie vuote non occupano spazio: restano solo quelle con atleti.
  // Se non ce n'è nessuna se ne mostra una sola come slot di lavoro.
  const visibleLanes = useMemo(() => {
    const nonEmpty = lanes.filter(lane => lane.athletes.length > 0);
    if (nonEmpty.length > 0) return nonEmpty;
    const firstEmpty = lanes.find(lane => lane.athletes.length === 0);
    return firstEmpty ? [firstEmpty] : [];
  }, [lanes]);
  const displayIndexById = useMemo(
    () => new Map(visibleLanes.map((lane, index) => [lane.id, index + 1] as const)),
    [visibleLanes],
  );

  // Corsia attiva: se quella salvata non esiste più, si prende la prima
  const activeLane = useMemo(() => {
    if (visibleLanes.length === 0) return null;
    return visibleLanes.find(l => l.id === activeLaneId) ?? visibleLanes[0];
  }, [visibleLanes, activeLaneId]);

  const prevLane = () => {
    if (!activeLane) return;
    const idx = visibleLanes.findIndex(l => l.id === activeLane.id);
    const prev = visibleLanes[(idx - 1 + visibleLanes.length) % visibleLanes.length];
    setActiveLaneId(prev.id);
  };
  const nextLane = () => {
    if (!activeLane) return;
    const idx = visibleLanes.findIndex(l => l.id === activeLane.id);
    const next = visibleLanes[(idx + 1) % visibleLanes.length];
    setActiveLaneId(next.id);
  };

  // Prossimo atleta al via / in attesa di ripartenza (chip "Prossimo al via")
  const nextAthlete = useMemo(() => {
    const now = masterTime;
    let best: { name: string; etaMs: number | null } | null = null;
    for (const lane of lanes) {
      for (const athlete of lane.athletes) {
        if (athlete.startedAtMs === null) {
          return { name: athlete.atletaNome, etaMs: null };
        }
        if (athlete.nextStartAtMs !== null && athlete.nextStartAtMs > now) {
          const eta = athlete.nextStartAtMs - now;
          if (best === null || best.etaMs === null || eta < best.etaMs) {
            best = { name: athlete.atletaNome, etaMs: eta };
          }
        }
      }
    }
    return best;
  }, [lanes, masterTime]);

  // Ultimi 3 split registrati (feed live in coda)
  const latestSplits = useMemo(() => {
    const items: {
      key: string;
      laneIndex: number;
      name: string;
      time: string;
      lap: number;
      recordedAtMs: number;
    }[] = [];
    lanes.forEach(lane => {
      const laneIndex = displayIndexById.get(lane.id) ?? 0;
      lane.athletes.forEach(athlete => {
        const split = athlete.splitList[0];
        if (split) {
          items.push({
            key: athlete.id,
            laneIndex,
            name: athlete.atletaNome,
            time: split.time,
            lap: split.lap,
            recordedAtMs: split.recordedAtMs,
          });
        }
      });
    });
    return items.sort((a, b) => b.recordedAtMs - a.recordedAtMs).slice(0, 3);
  }, [lanes, displayIndexById]);

  useEffect(() => {
    if (selectedAthleteId === '' || !availableAthletes.some(athlete => athlete.id === selectedAthleteId)) {
      setSelectedAthleteId(availableAthletes[0]?.id ?? '');
    }
  }, [availableAthletes, selectedAthleteId]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    startTimeRef.current = performance.now() - savedTimeRef.current;
    timerRef.current = window.setInterval(() => {
      setMasterTime(performance.now() - startTimeRef.current);
    }, 25);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isRunning]);

  const getCurrentTime = () => isRunning ? performance.now() - startTimeRef.current : masterTime;

  const toggleMaster = () => {
    if (isRunning) {
      const currentTime = getCurrentTime();
      savedTimeRef.current = currentTime;
      setMasterTime(currentTime);
      setIsRunning(false);
      localStorage.setItem('finp_stopwatch_running', 'false');
      return;
    }

    if (!sessionStarted) {
      const selectedIds = selectedStartAthleteIds;
      setLanes(current => current.map(lane => ({
        ...lane,
        athletes: lane.athletes.map(athlete => selectedIds.has(athlete.id)
          ? { ...athlete, startedAtMs: 0, nextStartAtMs: null }
          : athlete),
      })));
      setSelectedStartAthleteIds(new Set());
      setSessionStarted(true);
    }

    setIsRunning(true);
    localStorage.setItem('finp_stopwatch_running', 'true');
    navigator.vibrate?.(80);
  };

  const resetMaster = () => {
    setIsRunning(false);
    setMasterTime(0);
    savedTimeRef.current = 0;
    setSessionStarted(false);
    localStorage.setItem('finp_stopwatch_running', 'false');
    releaseKeepScreenOn();
    setLanes(current => {
      const reset = current.map(lane => ({
        ...lane,
        athletes: lane.athletes.map(athlete => ({
          ...athlete,
          startedAtMs: null,
          nextStartAtMs: null,
          splitList: [],
        })),
      }));
      // Di default tutti gli atleti primi in corsia vengono ripristinati per il via generale
      setSelectedStartAthleteIds(getFirstAthletesIds(reset));
      return reset;
    });
  };

  const handleAthletePress = (laneId: number, athleteId: string) => {
    if (!isRunning) return;
    const currentTime = getCurrentTime();

    setLanes(current => current.map(lane => {
      if (lane.id !== laneId) return lane;
      const effectiveRipartenza = lane.ripartenzaSecondi ?? ripartenzaSecondi;

      return {
        ...lane,
        athletes: lane.athletes.map(athlete => {
          if (athlete.id !== athleteId) return athlete;

          if (athlete.startedAtMs === null) {
            return { ...athlete, startedAtMs: currentTime, nextStartAtMs: null };
          }

          const segmentStart = athlete.nextStartAtMs ?? athlete.startedAtMs;
          if (currentTime < segmentStart) return athlete;

          const split = {
            lap: athlete.splitList.length + 1,
            time: formatMs(currentTime - segmentStart),
            timestampMs: currentTime - segmentStart,
            recordedAtMs: currentTime,
          };
          const scheduledStart = segmentStart + effectiveRipartenza * 1000;
          const nextStartAtMs = Math.max(scheduledStart, currentTime);

          return {
            ...athlete,
            startedAtMs: nextStartAtMs,
            nextStartAtMs,
            splitList: [split, ...athlete.splitList],
          };
        }),
      };
    }));
  };

  const handleGeneralLap = () => {
    if (!isRunning) return;
    const currentTime = getCurrentTime();

    setLanes(current => current.map(lane => {
      const effectiveRipartenza = lane.ripartenzaSecondi ?? ripartenzaSecondi;
      return {
        ...lane,
        athletes: lane.athletes.map(athlete => {
          if (athlete.startedAtMs === null) {
            return { ...athlete, startedAtMs: currentTime, nextStartAtMs: null };
          }
          const segmentStart = athlete.nextStartAtMs ?? athlete.startedAtMs;
          if (currentTime < segmentStart) return athlete;

          const split = {
            lap: athlete.splitList.length + 1,
            time: formatMs(currentTime - segmentStart),
            timestampMs: currentTime - segmentStart,
            recordedAtMs: currentTime,
          };
          const scheduledStart = segmentStart + effectiveRipartenza * 1000;
          const nextStartAtMs = Math.max(scheduledStart, currentTime);

          return {
            ...athlete,
            startedAtMs: nextStartAtMs,
            nextStartAtMs,
            splitList: [split, ...athlete.splitList],
          };
        }),
      };
    }));
    navigator.vibrate?.(50);
  };

  const toggleInitialStart = (athleteId: string) => {
    setSelectedStartAthleteIds(current => {
      const next = new Set(current);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  const addLane = () => {
    if (lanes.length >= MAX_LANES) return;
    setLanes(current => {
      const usedNumbers = new Set(current.map(lane => lane.laneNumber));
      const laneNumber = Array.from({ length: MAX_LANES }, (_, index) => index + 1)
        .find(number => !usedNumbers.has(number)) ?? current.length + 1;
      const id = Math.max(0, ...current.map(lane => lane.id)) + 1;
      return [...current, { id, laneNumber, ripartenzaSecondi, athletes: [] }];
    });
  };

  const addAthleteToLane = (laneId: number) => {
    if (selectedAthleteId === '') return;
    const athlete = availableAthletes.find(item => item.id === selectedAthleteId);
    if (!athlete) return;

    setLanes(current => current.map(lane => {
      if (lane.id !== laneId || lane.athletes.length >= MAX_ATHLETES_PER_LANE) return lane;
      idRef.current += 1;
      const newAth = createAthlete(athlete, `ath-${athlete.id}-${idRef.current}`);
      if (!sessionStarted && lane.athletes.length === 0) {
        setSelectedStartAthleteIds(prev => new Set(prev).add(newAth.id));
      }
      return {
        ...lane,
        athletes: [...lane.athletes, newAth],
      };
    }));
  };

  const moveAthleteToLane = (sourceLaneId: number, athleteId: string, destinationLaneId: number) => {
    setLanes(current => {
      const source = current.find(lane => lane.id === sourceLaneId);
      const destination = current.find(lane => lane.id === destinationLaneId);
      const athlete = source?.athletes.find(item => item.id === athleteId);
      if (!source || !destination || !athlete || destination.athletes.length >= MAX_ATHLETES_PER_LANE) {
        return current;
      }

      return current.map(lane => {
        if (lane.id === sourceLaneId) {
          return { ...lane, athletes: lane.athletes.filter(item => item.id !== athleteId) };
        }
        if (lane.id === destinationLaneId) {
          return { ...lane, athletes: [...lane.athletes, athlete] };
        }
        return lane;
      });
    });
  };

  const handleSalvaNelRegistro = (athlete: AthleteInLane) => {
    const last = athlete.splitList[0];
    if (!last) return;

    aggiungiTempo({
      atletaId: athlete.atletaId,
      data: todayISO(),
      stile: 'STILE_LIBERO',
      distanzaMetri: vascaMetri,
      centesimi: Math.round(last.timestampMs / 10),
      contesto: 'ALLENAMENTO',
      vascaMetri,
      note: `Split Cronometro: Lap ${last.lap} (${last.time})`,
    });

    setSalvatoFeedback(`Tempo registrato per ${athlete.atletaNome}`);
    window.setTimeout(() => setSalvatoFeedback(null), 3000);
  };

  const activeLaneIndex = activeLane ? visibleLanes.findIndex(l => l.id === activeLane.id) : -1;
  const activeLaneStatus = activeLane ? laneStatusOf(activeLane, sessionStarted, masterTime) : 'LIBERA';

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden select-none">
      {/* ============================================================
          CONSOLE MASTER — cronometro grande, alto contrasto
          ============================================================ */}
      <section className="shrink-0 rounded-2xl bg-inverse-surface text-inverse-on-surface px-4 py-3 shadow-md flex flex-col gap-2.5 border border-outline/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${isRunning ? 'bg-secondary-fixed animate-ping' : 'bg-on-surface/30'}`} />
            <span className="font-label-caps text-[11px] text-secondary-fixed font-bold tracking-wider uppercase truncate">
              {isRunning ? 'Cronometro Live' : sessionStarted ? 'Sessione in pausa' : 'Pronto'}
            </span>
          </div>
          {!sessionStarted ? (
            <label className="flex items-center gap-2 rounded-xl bg-inverse-on-surface/10 border border-inverse-on-surface/20 px-3 py-1.5 flex-shrink-0">
              <span className="font-label-caps text-[10px] uppercase text-on-surface/60 tracking-wider">Cadenza</span>
              <input
                type="text"
                inputMode="decimal"
                value={ripartenzaText}
                placeholder="45 s / 1.30"
                aria-label="Ripartenza globale in formato 45 s, 2 m o 1.30"
                onChange={event => {
                  const text = event.target.value;
                  setRipartenzeText(text);
                  const parsed = parseRipartenza(text);
                  if (parsed !== null) {
                    setRipartenzaSecondi(parsed);
                    setLanes(curr => curr.map(l => ({ ...l, ripartenzaSecondi: parsed })));
                  }
                }}
                onBlur={() => {
                  const parsed = parseRipartenza(ripartenzaText);
                  const finalVal = parsed === null || parsed < 5 ? 90 : parsed;
                  setRipartenzeText(formatRipartenza(finalVal));
                  setRipartenzaSecondi(finalVal);
                  setLanes(curr => curr.map(l => ({ ...l, ripartenzaSecondi: finalVal })));
                }}
                className="w-16 bg-transparent text-inverse-on-surface font-headline-sm text-lg font-bold text-center focus:outline-none tabular-nums"
              />
            </label>
          ) : (
            <span className="font-label-caps text-[11px] bg-inverse-on-surface/10 text-inverse-on-surface px-2.5 py-1 rounded-lg font-semibold flex-shrink-0">
              Rip: {formatRipartenza(ripartenzaSecondi)}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <output
            aria-label="Tempo squadra"
            className="font-stat-timer text-inverse-on-surface font-bold tracking-tight tabular-nums leading-none"
          >
            {formatMs(masterTime)}
          </output>
          {nextAthlete && (
            <div className="flex items-center gap-2.5 bg-inverse-on-surface/10 border border-inverse-on-surface/20 rounded-2xl px-3.5 py-2 min-w-0">
              <div className="flex flex-col items-end min-w-0">
                <span className="font-label-caps text-[10px] uppercase text-on-surface/60">Prossimo al via</span>
                <span className="font-headline-sm text-base font-bold text-secondary-fixed leading-tight truncate max-w-[10rem]">
                  {nextAthlete.name}
                </span>
              </div>
              {nextAthlete.etaMs !== null && (
                <div className="flex flex-col items-center justify-center bg-secondary text-on-secondary px-3 py-1.5 rounded-xl shadow-sm leading-none flex-shrink-0">
                  <span className="font-stat-timer-mobile text-xl font-bold leading-none tabular-nums">
                    {Math.max(0, Math.ceil(nextAthlete.etaMs / 1000))}s
                  </span>
                  <span className="font-label-caps text-[9px] uppercase tracking-wider mt-0.5">Countdown</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-2">
          <button
            type="button"
            onClick={toggleMaster}
            className={`col-span-6 h-14 rounded-2xl font-headline-sm text-lg font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform select-none ${
              isRunning ? 'bg-secondary text-on-secondary' : 'bg-tertiary text-on-tertiary'
            }`}
            aria-label={isRunning ? 'Pausa sessione' : sessionStarted ? 'Riprendi sessione' : 'Avvia sessione e atleti selezionati'}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            <span>{isRunning ? 'PAUSA' : sessionStarted ? 'RIPRENDI' : 'VIA GENERALE'}</span>
          </button>
          <button
            type="button"
            onClick={handleGeneralLap}
            disabled={!isRunning}
            className={`col-span-4 h-14 rounded-2xl bg-primary-container text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform select-none ${
              !isRunning ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            aria-label="Registra Lap per tutti gli atleti attivi"
            title="Tocco / Lap generale"
          >
            <Flag size={20} />
            <span>TOCCO / LAP</span>
          </button>
          <button
            type="button"
            onClick={resetMaster}
            aria-label="Azzera sessione"
            className="col-span-2 h-14 rounded-2xl bg-inverse-on-surface/15 hover:bg-inverse-on-surface/25 text-inverse-on-surface flex flex-col items-center justify-center active:scale-[0.98] transition-transform"
            title="Azzera sessione"
          >
            <RotateCcw size={20} />
            <span className="font-label-caps text-[10px] uppercase leading-none mt-1">Azzera</span>
          </button>
        </div>
      </section>

      {!sessionStarted && (
        <section
          className="shrink-0 rounded-2xl bg-surface-container-lowest p-3 shadow-sm border border-outline-variant/50 flex flex-col gap-2"
          aria-label="Configurazione corsie e atleti"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <LayoutGrid size={17} className="text-primary shrink-0" />
              <span className="font-headline-sm text-sm uppercase font-bold text-on-surface tracking-wide truncate">
                Matrice Corsie in Vasca
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-2 py-1 rounded-lg bg-surface-container font-label-caps text-[10px] font-bold text-on-surface">
                {assignedCount} atleti
              </span>
              <span className="px-2 py-1 rounded-lg bg-surface-container font-label-caps text-[10px] font-bold text-on-surface-variant">
                {visibleLanes.length}/{MAX_LANES} corsie
              </span>
              {selectedStartAthleteIds.size > 0 && (
                <span className="px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-[10px] font-bold uppercase">
                  {selectedStartAthleteIds.size} al via
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="athlete-to-assign">Atleta da assegnare</label>
            <select
              id="athlete-to-assign"
              value={selectedAthleteId}
              onChange={event => setSelectedAthleteId(event.target.value ? Number(event.target.value) : '')}
              disabled={availableAthletes.length === 0}
              className="flex-1 min-w-0 min-h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-sm font-semibold text-on-surface disabled:opacity-60"
            >
              {availableAthletes.length === 0
                ? <option value="">Tutti assegnati</option>
                : availableAthletes.map(athlete => (
                  <option key={athlete.id} value={athlete.id}>{athlete.cognome} {athlete.nome}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={addLane}
              disabled={lanes.length >= MAX_LANES}
              className="h-11 px-4 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-45"
            >
              <Plus size={16} /> Corsia
            </button>
          </div>
        </section>
      )}

      {salvatoFeedback && (
        <div role="status" className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-success-container text-on-success-container px-3 py-2 font-headline-sm text-sm font-bold">
          <CheckCircle2 size={18} /> {salvatoFeedback}
        </div>
      )}

      {/* ============================================================
          NAVIGAZIONE CORSE — una corsia alla volta, focus totale
          ============================================================ */}
      {activeLane && (
        <>
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevLane}
              disabled={visibleLanes.length < 2}
              aria-label="Corsia precedente"
              className="w-10 h-10 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 flex items-center justify-center text-on-surface disabled:opacity-40 active:scale-95 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {visibleLanes.map((lane, idx) => {
                const status = laneStatusOf(lane, sessionStarted, masterTime);
                const isActive = lane.id === activeLane.id;
                return (
                  <button
                    key={lane.id}
                    type="button"
                    onClick={() => setActiveLaneId(lane.id)}
                    className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-headline-sm text-[13px] font-bold whitespace-nowrap transition active:scale-[0.97] ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface border border-outline-variant/50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-on-primary' : LANE_DOT[status]}`} />
                    Corsia {displayIndexById.get(lane.id) ?? idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={nextLane}
              disabled={visibleLanes.length < 2}
              aria-label="Corsia successiva"
              className="w-10 h-10 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/50 flex items-center justify-center text-on-surface disabled:opacity-40 active:scale-95 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Corsia attiva a tutta larghezza */}
          <article className="flex-1 min-h-0 flex flex-col rounded-2xl bg-surface-container-lowest shadow-card border border-outline-variant/40 overflow-hidden">
            <header className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 border-b border-surface-container-highest/60">
              <span className="w-9 h-9 rounded-xl bg-primary text-on-primary font-headline-sm text-lg font-bold flex items-center justify-center shadow-sm">
                {activeLaneIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-base font-bold text-on-surface">Corsia {activeLaneIndex + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-caps text-[10px] font-bold uppercase tracking-wide ${
                    activeLaneStatus === 'IN ACQUA'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : activeLaneStatus === 'PAUSA'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {LANE_STATUS_LABEL[activeLaneStatus]}
                  </span>
                </div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">
                  {activeLane.athletes.length} {activeLane.athletes.length === 1 ? 'atleta' : 'atleti'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Rip</span>
                {!sessionStarted ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={formatRipartenza(activeLane.ripartenzaSecondi ?? ripartenzaSecondi)}
                    key={`${activeLane.id}-${activeLane.ripartenzaSecondi}`}
                    aria-label={`Ripartenza corsia ${activeLaneIndex + 1}`}
                    onBlur={e => {
                      const parsed = parseRipartenza(e.target.value);
                      const finalVal = parsed === null || parsed < 5 ? 90 : parsed;
                      setLanes(curr => curr.map(l => (l.id === activeLane.id ? { ...l, ripartenzaSecondi: finalVal } : l)));
                      e.target.value = formatRipartenza(finalVal);
                    }}
                    className="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1.5 text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {formatRipartenza(activeLane.ripartenzaSecondi ?? ripartenzaSecondi)}
                  </span>
                )}
              </div>
              {!sessionStarted && activeLane.athletes.length < MAX_ATHLETES_PER_LANE && availableAthletes.length > 0 && (
                <button
                  type="button"
                  onClick={() => addAthleteToLane(activeLane.id)}
                  className="h-10 px-3.5 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 active:scale-95 transition-transform"
                  aria-label="Aggiungi atleta alla corsia"
                >
                  <Plus size={16} /> Aggiungi
                </button>
              )}
            </header>

            {/* Atleti della corsia — card grandi, tempo leggibile a distanza */}
            <div className="flex-1 min-h-0 flex flex-col gap-2 p-2.5 overflow-hidden">
              {activeLane.athletes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <LayoutGrid size={28} className="opacity-40" />
                  <p className="text-sm font-semibold">Corsia vuota</p>
                  <p className="text-xs opacity-70">Scegli un atleta sopra e premi «Aggiungi»</p>
                </div>
              ) : (
                activeLane.athletes.map((athlete, athleteIdx) => {
                  const now = masterTime;
                  const waitingUntil = athlete.nextStartAtMs !== null && now < athlete.nextStartAtMs ? athlete.nextStartAtMs : null;
                  const segmentStart = athlete.nextStartAtMs ?? athlete.startedAtMs;
                  const elapsed = athlete.startedAtMs === null || segmentStart === null || waitingUntil !== null
                    ? 0
                    : Math.max(0, now - segmentStart);
                  const isSelectedForStart = selectedStartAthleteIds.has(athlete.id);
                  const action = athlete.startedAtMs === null
                    ? 'VIA'
                    : waitingUntil !== null
                      ? 'PAUSA'
                      : 'LAP';
                  const isDisabled = sessionStarted && (!isRunning || waitingUntil !== null);
                  const ariaLabel = !sessionStarted
                    ? `${isSelectedForStart ? 'Rimuovi' : 'Aggiungi'} ${athlete.atletaNome} dalla partenza generale`
                    : `${action === 'VIA' ? 'Avvia' : action === 'LAP' ? 'Lap' : 'Attesa'} per ${athlete.atletaNome}`;
                  const athleteStatus = !sessionStarted
                    ? (isSelectedForStart ? 'AL VIA' : 'IN ATTESA')
                    : athlete.startedAtMs === null
                      ? 'IN ATTESA'
                      : waitingUntil !== null
                        ? 'PAUSA'
                        : 'IN ACQUA';
                  const statusSubline = !sessionStarted
                    ? (isSelectedForStart ? 'Partenza generale' : 'Su invito')
                    : athlete.startedAtMs === null
                      ? 'In attesa via'
                      : waitingUntil !== null
                        ? `tra ${formatMs(waitingUntil - now)} · ult. ${athlete.splitList[0]?.time ?? '--'}`
                        : athlete.splitList.length > 0
                          ? `Lap ${athlete.splitList[0].lap}: ${athlete.splitList[0].time}`
                          : 'In vasca';
                  const bigTime = !sessionStarted || athlete.startedAtMs === null
                    ? null
                    : waitingUntil !== null
                      ? formatMs(waitingUntil - now)
                      : formatMs(elapsed);

                  return (
                    <div
                      key={athlete.id}
                      className={`flex-1 min-h-0 flex flex-col rounded-2xl transition ${
                        !sessionStarted && isSelectedForStart ? 'ring-2 ring-primary bg-primary-fixed/30' : 'bg-surface-container-low'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 min-h-0 w-full flex items-center gap-3 px-3.5 py-2 text-left active:scale-[0.99] transition-transform"
                        onClick={() => (sessionStarted ? handleAthletePress(activeLane.id, athlete.id) : toggleInitialStart(athlete.id))}
                        disabled={isDisabled}
                        aria-label={ariaLabel}
                        aria-pressed={!sessionStarted ? isSelectedForStart : undefined}
                      >
                        <span className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-headline-sm text-sm font-bold flex items-center justify-center shrink-0">
                          {athleteIdx + 1}
                        </span>
                        <span className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-headline-sm text-xl font-bold shrink-0 shadow-inner">
                          {initialsOf(athlete.atletaNome)}
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="font-headline-sm text-lg font-bold text-on-surface leading-tight truncate">
                            {athlete.atletaNome}
                          </span>
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-0.5 rounded-full font-label-caps text-[10px] font-bold uppercase tracking-wide shrink-0 ${ATHLETE_STATUS_STYLE[athleteStatus]}`}>
                              {athleteStatus === 'AL VIA' ? 'Al via' : athleteStatus === 'IN ATTESA' ? 'In attesa' : athleteStatus === 'PAUSA' ? 'Pausa' : 'In acqua'}
                            </span>
                            <span className="font-label-caps text-xs text-on-surface-variant truncate">
                              {statusSubline}
                            </span>
                          </span>
                        </span>
                        {sessionStarted && (
                          <span className="flex flex-col items-end gap-1 shrink-0">
                            {bigTime !== null && (
                              <span className={`font-stat-timer-mobile text-4xl font-bold tabular-nums leading-none ${
                                waitingUntil !== null ? 'text-tertiary' : 'text-on-surface'
                              }`}>
                                {bigTime}
                              </span>
                            )}
                            <span className={`font-label-caps text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl ${ACTION_STYLE[action]}`}>
                              {action}
                            </span>
                          </span>
                        )}
                      </button>

                      {/* Salvataggio ultimo split quando il master è fermo */}
                      {!isRunning && athlete.splitList.length > 0 && (
                        <div className="shrink-0 flex items-center justify-between px-3.5 pb-2.5">
                          <span className="text-xs font-semibold text-on-surface-variant">
                            Ultimo split: Lap {athlete.splitList[0].lap} · {athlete.splitList[0].time}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSalvaNelRegistro(athlete)}
                            className="h-9 px-3 rounded-lg bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                          >
                            <Save size={13} /> Salva
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </>
      )}

      {/* Feed ultimi split — sempre leggibile, in fondo */}
      {latestSplits.length > 0 && (
        <section
          className="shrink-0 rounded-2xl bg-surface-container-lowest p-2.5 shadow-sm border border-outline-variant/40"
          aria-label="Ultimi split registrati"
        >
          <div className="flex items-center gap-2 px-1 pb-1.5">
            <Gauge size={15} className="text-primary" />
            <span className="font-label-caps text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
              Ultimi Split
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {latestSplits.map(split => (
              <div
                key={split.key}
                className="rounded-xl bg-secondary-container/50 px-2.5 py-2 flex flex-col leading-tight min-w-0 border border-secondary/30"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-on-secondary-container text-sm truncate">
                    C{split.laneIndex} · {split.name}
                  </span>
                  <span className="text-on-secondary-container/70 font-bold text-[10px] flex-shrink-0">L{split.lap}</span>
                </div>
                <span className="text-on-secondary-container font-bold text-lg tabular-nums mt-0.5">{split.time}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
