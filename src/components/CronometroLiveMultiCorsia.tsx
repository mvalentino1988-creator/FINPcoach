import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import { todayISO } from '../domain/dateUtils';
import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';
import { CheckCircle2, Flag, Pause, Play, RotateCcw, Save, Plus, Maximize2, Minimize2, Clock, X } from 'lucide-react';
import { Modal } from './ui/Modal';

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
  cognome: string;
  classe: string;
  startedAtMs: number | null;
  nextStartAtMs: number | null;
  ripartenzaCustomSec?: number | null;
  splitList: Split[];
}

interface LaneState {
  id: number;
  laneNumber: number;
  ripartenzaSecondi: number;
  athletes: AthleteInLane[];
}

const MAX_LANES = 6;
const MAX_ATHLETES_PER_LANE = 12;

const RIPARTENZA_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1:00', seconds: 60 },
  { label: '1:15', seconds: 75 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '2:30', seconds: 150 },
  { label: '3:00', seconds: 180 },
];

const formatRipartenza = (totalSec: number): string => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (totalSec < 60) return `${totalSec}s`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const parseRipartenza = (raw: string): number | null => {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return null;
  let m = t.match(/^(\d+)m\s*(\d+)?s?$/);
  if (m) {
    const v = Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
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
  cognome: athlete.cognome || athlete.nome,
  classe: athlete.classeS != null ? `S${athlete.classeS}` : 'S?',
  startedAtMs: null,
  nextStartAtMs: null,
  ripartenzaCustomSec: null,
  splitList: [],
});

const createInitialLanes = (
  athletes: { id: number; nome: string; cognome: string; classeS?: number }[],
  defaultRipartenza: number = 90
): LaneState[] => {
  const laneCount = MAX_LANES;
  const lanes = Array.from({ length: laneCount }, (_, index) => ({
    id: index + 1,
    laneNumber: index + 1,
    ripartenzaSecondi: defaultRipartenza,
    athletes: [] as AthleteInLane[],
  }));

  athletes.forEach((athlete, index) => {
    lanes[index % laneCount].athletes.push(createAthlete(athlete, `ath-${athlete.id}-${index}`));
  });

  return lanes;
};

export const CronometroLiveMultiCorsia: React.FC = () => {
  const { atleti, stagione, aggiungiTempo } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lanes, setLanes] = useState<LaneState[]>(() => createInitialLanes(atleti));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modali
  const [selectedAthleteModal, setSelectedAthleteModal] = useState<{ laneId: number; athlete: AthleteInLane } | null>(null);
  const [ripartenzaPicker, setRipartenzaPicker] = useState<{
    title: string;
    currentSeconds: number;
    onSelect: (seconds: number) => void;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const savedTimeRef = useRef(0);
  const idRef = useRef(0);
  const [vascaMetri] = useState<25 | 50>(() => (stagione?.vascaMetri === 25 ? 25 : 50));
  const [globalRipartenzaSecondi, setGlobalRipartenzaSecondi] = useState(90);
  const [salvatoFeedback, setSalvatoFeedback] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');

  useEffect(() => {
    if (isRunning) {
      requestKeepScreenOn();
      setIsFullscreen(true);
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

  const getCurrentTime = () => (isRunning ? performance.now() - startTimeRef.current : masterTime);

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
      setLanes(current =>
        current.map(lane => ({
          ...lane,
          athletes: lane.athletes.map(athlete => ({
            ...athlete,
            startedAtMs: 0,
            nextStartAtMs: null,
          })),
        }))
      );
      setSessionStarted(true);
    }

    setIsRunning(true);
    setIsFullscreen(true);
    localStorage.setItem('finp_stopwatch_running', 'true');
    try { navigator.vibrate?.(80); } catch {}
  };

  const resetMaster = () => {
    setIsRunning(false);
    setMasterTime(0);
    savedTimeRef.current = 0;
    setSessionStarted(false);
    setIsFullscreen(false);
    localStorage.setItem('finp_stopwatch_running', 'false');
    releaseKeepScreenOn();
    setLanes(current =>
      current.map(lane => ({
        ...lane,
        athletes: lane.athletes.map(athlete => ({
          ...athlete,
          startedAtMs: null,
          nextStartAtMs: null,
          splitList: [],
        })),
      }))
    );
  };

  const handleAthletePress = (laneId: number, athlete: AthleteInLane) => {
    if (!isRunning) {
      setSelectedAthleteModal({ laneId, athlete });
      return;
    }

    const currentTime = getCurrentTime();
    setLanes(current =>
      current.map(lane => {
        if (lane.id !== laneId) return lane;
        return {
          ...lane,
          athletes: lane.athletes.map(ath => {
            if (ath.id !== athlete.id) return ath;

            if (ath.startedAtMs === null) {
              return { ...ath, startedAtMs: currentTime, nextStartAtMs: null };
            }

            const segmentStart = ath.nextStartAtMs ?? ath.startedAtMs;
            if (currentTime < segmentStart) return ath;

            const split = {
              lap: ath.splitList.length + 1,
              time: formatMs(currentTime - segmentStart),
              timestampMs: currentTime - segmentStart,
              recordedAtMs: currentTime,
            };
            const effectiveRipartenza = ath.ripartenzaCustomSec ?? lane.ripartenzaSecondi ?? globalRipartenzaSecondi;
            const scheduledStart = segmentStart + effectiveRipartenza * 1000;
            const nextStartAtMs = Math.max(scheduledStart, currentTime);

            return {
              ...ath,
              startedAtMs: nextStartAtMs,
              nextStartAtMs,
              splitList: [split, ...ath.splitList],
            };
          }),
        };
      })
    );
  };

  const handleGeneralLap = () => {
    if (!isRunning) return;
    const currentTime = getCurrentTime();

    setLanes(current =>
      current.map(lane => {
        const laneRipartenza = lane.ripartenzaSecondi ?? globalRipartenzaSecondi;
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
            const effectiveRipartenza = athlete.ripartenzaCustomSec ?? laneRipartenza;
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
      })
    );
    try { navigator.vibrate?.(50); } catch {}
  };

  const addLane = () => {
    if (lanes.length >= MAX_LANES) return;
    setLanes(current => {
      const usedNumbers = new Set(current.map(lane => lane.laneNumber));
      const laneNumber =
        Array.from({ length: MAX_LANES }, (_, index) => index + 1).find(number => !usedNumbers.has(number)) ??
        current.length + 1;
      const id = Math.max(0, ...current.map(lane => lane.id)) + 1;
      return [...current, { id, laneNumber, ripartenzaSecondi: globalRipartenzaSecondi, athletes: [] }];
    });
  };

  const addAthleteToLane = (laneId: number) => {
    if (selectedAthleteId === '') return;
    const athlete = availableAthletes.find(item => item.id === selectedAthleteId);
    if (!athlete) return;

    setLanes(current =>
      current.map(lane => {
        if (lane.id !== laneId || lane.athletes.length >= MAX_ATHLETES_PER_LANE) return lane;
        idRef.current += 1;
        const newAth = createAthlete(athlete, `ath-${athlete.id}-${idRef.current}`);
        if (sessionStarted) {
          newAth.startedAtMs = masterTime;
        }
        return {
          ...lane,
          athletes: [...lane.athletes, newAth],
        };
      })
    );
  };

  const handleSalvaNelRegistro = (athlete: AthleteInLane, split: Split) => {
    aggiungiTempo({
      atletaId: athlete.atletaId,
      data: todayISO(),
      stile: 'STILE_LIBERO',
      distanzaMetri: vascaMetri,
      centesimi: Math.round(split.timestampMs / 10),
      contesto: 'ALLENAMENTO',
      vascaMetri,
      note: `Split Cronometro: Lap ${split.lap} (${split.time})`,
    });

    setSalvatoFeedback(`Salvato: ${athlete.cognome} (L${split.lap})`);
    window.setTimeout(() => setSalvatoFeedback(null), 2500);
  };

  const displayLanes = lanes.filter(l => l.athletes.length > 0);

  const content = (
    <div className="flex flex-col h-full w-full gap-1 overflow-hidden select-none bg-surface">
      {/* ============================================================
          CRONOMETRO GENERALE IN ALTO (Layout a due righe spazioso)
          ============================================================ */}
      <section className="shrink-0 rounded-xl bg-surface-container-low text-on-surface px-3 py-2 shadow-xs border border-outline-variant/30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${isRunning ? 'bg-tertiary animate-ping' : 'bg-on-surface-variant/40'}`} />
            <output
              aria-label="Tempo generale"
              className="font-stat-timer-mobile text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-primary leading-none whitespace-nowrap"
            >
              {formatMs(masterTime)}
            </output>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={resetMaster}
              aria-label="Azzera cronometro"
              className="w-10 h-10 rounded-xl bg-error-container/60 hover:bg-error-container text-error flex items-center justify-center active:scale-95 transition whitespace-nowrap"
              title="Azzera"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(f => !f)}
              aria-label="Schermo intero"
              className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95 transition whitespace-nowrap"
              title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* Pulsanti di controllo principali */}
        <div className="flex items-center gap-2 w-full">
          {!isRunning ? (
            <button
              type="button"
              onClick={toggleMaster}
              className="flex-1 min-h-[50px] rounded-xl bg-primary text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm whitespace-nowrap"
              aria-label="Avvia cronometro generale"
            >
              <Play size={22} />
              <span>{sessionStarted ? 'RIPRENDI' : 'VIA GENERALE'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGeneralLap}
                className="flex-1 min-h-[50px] rounded-xl bg-secondary text-on-secondary font-headline-sm text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm whitespace-nowrap"
                aria-label="Lap generale"
              >
                <Flag size={20} />
                <span>LAP GENERALE</span>
              </button>
              <button
                type="button"
                onClick={toggleMaster}
                className="flex-1 min-h-[50px] rounded-xl bg-surface-container-high text-on-surface font-headline-sm text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition whitespace-nowrap border border-outline-variant/60 shadow-sm"
                aria-label="Pausa cronometro"
              >
                <Pause size={20} />
                <span>PAUSA / STOP</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* ============================================================
          RIPARTENZA COMUNE & GESTIONE
          ============================================================ */}
      {!isRunning && (
        <section className="shrink-0 flex items-center justify-between gap-2 bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-outline-variant/30 text-xs animate-fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-label-caps text-[10px] uppercase font-bold text-on-surface-variant whitespace-nowrap">
              Rip. Comune:
            </span>
            <button
              type="button"
              onClick={() =>
                setRipartenzaPicker({
                  title: 'Ripartenza Comune Globale',
                  currentSeconds: globalRipartenzaSecondi,
                  onSelect: (sec) => {
                    setGlobalRipartenzaSecondi(sec);
                    setLanes(curr => curr.map(l => ({ ...l, ripartenzaSecondi: sec })));
                  },
                })
              }
              className="h-8 px-3 bg-surface-container border border-outline-variant/50 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition"
            >
              <Clock size={13} />
              <span>{formatRipartenza(globalRipartenzaSecondi)}</span>
            </button>
          </div>

          {!sessionStarted && (
            <div className="flex items-center gap-1 min-w-0">
              <select
                aria-label="Atleta da assegnare"
                value={selectedAthleteId}
                onChange={e => setSelectedAthleteId(e.target.value ? Number(e.target.value) : '')}
                disabled={availableAthletes.length === 0}
                className="max-w-[8rem] h-8 px-1.5 rounded-lg bg-surface-container border border-outline-variant text-[11px] font-semibold text-on-surface truncate disabled:opacity-65 whitespace-nowrap"
              >
                {availableAthletes.length === 0 ? (
                  <option value="">Tutti in vasca</option>
                ) : (
                  availableAthletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.cognome} {a.nome}
                    </option>
                  ))
                )}
              </select>
              {displayLanes.length > 0 && (
                <button
                  type="button"
                  onClick={() => addAthleteToLane(displayLanes[0].id)}
                  disabled={availableAthletes.length === 0}
                  className="h-8 px-2 rounded-lg bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase flex items-center gap-0.5 active:scale-95 transition disabled:opacity-45 whitespace-nowrap"
                >
                  <Plus size={12} /> Atleta
                </button>
              )}
              {lanes.length < MAX_LANES && (
                <button
                  type="button"
                  onClick={addLane}
                  className="h-8 px-2 rounded-lg bg-surface-container-high text-on-surface font-label-caps text-[10px] font-bold uppercase flex items-center gap-0.5 active:scale-95 transition whitespace-nowrap"
                >
                  <Plus size={12} /> Corsia
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {salvatoFeedback && (
        <div role="status" className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-success-container text-on-success-container px-2.5 py-1 text-xs font-bold whitespace-nowrap">
          <CheckCircle2 size={14} /> {salvatoFeedback}
        </div>
      )}

      {/* ============================================================
          MATRICE CORSIE E CASELLE ATLETI (Griglia a 4 colonne per cognomi estesi ben leggibili e mai troncati)
          ============================================================ */}
      <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
        {displayLanes.map(lane => {
          const athleteCount = lane.athletes.length;
          return (
            <div
              key={lane.id}
              className="flex-1 min-h-0 flex flex-col rounded-lg bg-surface-container-lowest border border-outline-variant/40 p-1 shadow-xs"
            >
              {/* Intestazione corsia + ripartenza corsia */}
              <div className="shrink-0 flex items-center justify-between pb-0.5 px-1 border-b border-surface-container-highest/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded bg-primary text-on-primary font-headline-sm text-[11px] font-bold flex items-center justify-center shrink-0">
                    {lane.laneNumber}
                  </span>
                  <span className="font-headline-sm text-[11px] font-bold text-on-surface uppercase whitespace-nowrap truncate">
                    Corsia {lane.laneNumber} ({athleteCount})
                  </span>
                </div>
                {!isRunning && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-label-caps text-[9px] uppercase text-on-surface-variant whitespace-nowrap">Rip:</span>
                    <button
                      type="button"
                      disabled={sessionStarted}
                      onClick={() =>
                        setRipartenzaPicker({
                          title: `Ripartenza Corsia ${lane.laneNumber}`,
                          currentSeconds: lane.ripartenzaSecondi,
                          onSelect: (sec) => {
                            setLanes(curr => curr.map(l => (l.id === lane.id ? { ...l, ripartenzaSecondi: sec } : l)));
                          },
                        })
                      }
                      className="h-6 px-2 bg-surface-container border border-outline-variant/50 rounded text-[10px] font-bold text-primary flex items-center gap-1 whitespace-nowrap disabled:opacity-65 active:scale-95 transition"
                    >
                      <Clock size={11} />
                      <span>{formatRipartenza(lane.ripartenzaSecondi)}</span>
                    </button>
                    {!sessionStarted && availableAthletes.length > 0 && athleteCount < MAX_ATHLETES_PER_LANE && (
                      <button
                        type="button"
                        onClick={() => addAthleteToLane(lane.id)}
                        className="h-5 px-1.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-[10px] font-bold whitespace-nowrap"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Caselle atleti (griglia a 4 colonne per garantire ampiezza sufficiente ai cognomi lunghi) */}
              <div
                className="flex-1 min-h-0 grid grid-cols-4 gap-1 pt-0.5 overflow-hidden"
              >
                {athleteCount === 0 ? (
                  <div className="col-span-full flex items-center justify-center text-[10px] text-on-surface-variant/60 italic whitespace-nowrap">
                    Corsia vuota
                  </div>
                ) : (
                  lane.athletes.map(athlete => {
                    const now = masterTime;
                    const waitingUntil = athlete.nextStartAtMs !== null && now < athlete.nextStartAtMs ? athlete.nextStartAtMs : null;
                    const segmentStart = athlete.nextStartAtMs ?? athlete.startedAtMs;
                    const elapsed = athlete.startedAtMs === null || segmentStart === null || waitingUntil !== null
                      ? 0
                      : Math.max(0, now - segmentStart);

                    const isTimeActive = sessionStarted && athlete.startedAtMs !== null;
                    const athleteTimer = waitingUntil !== null ? formatMs(waitingUntil - now) : formatMs(elapsed);
                    const recentSplits = athlete.splitList.slice(0, 1);

                    return (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => handleAthletePress(lane.id, athlete)}
                        className={`flex-1 min-h-0 flex flex-col items-center justify-center p-1 rounded-lg border transition active:scale-[0.98] ${
                          isTimeActive
                            ? 'bg-secondary-container/40 border-secondary/50 text-on-secondary-container'
                            : 'bg-surface-container-low border-outline-variant/50 text-on-surface hover:bg-surface-container'
                        }`}
                        title={isRunning ? "Clicca per fermare / lap" : "Clicca per dettagli e ripartenza"}
                      >
                        {/* Cognome centrato e integro (ampiezza a 4 colonne) */}
                        <span
                          className={`font-headline-sm text-xs font-bold text-center leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5 transition-opacity ${
                            isTimeActive ? 'opacity-40 text-on-surface' : 'opacity-100 text-on-surface'
                          }`}
                        >
                          {athlete.cognome}
                        </span>

                        {isTimeActive ? (
                          <div className="flex flex-col items-center justify-center mt-1 leading-none w-full">
                            <span className="font-stat-timer-mobile text-xs sm:text-sm font-bold tabular-nums text-primary whitespace-nowrap">
                              {athleteTimer}
                            </span>
                            {recentSplits.map(s => (
                              <span key={s.lap} className="font-label-caps text-[8px] text-on-surface-variant whitespace-nowrap mt-0.5">
                                L{s.lap}: {s.time}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-label-caps text-[9px] text-on-surface-variant mt-1 whitespace-nowrap">
                            {formatRipartenza(athlete.ripartenzaCustomSec ?? lane.ripartenzaSecondi)}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
          MODALE POPUP SELEZIONE RIPARTENZA
          ============================================================ */}
      <Modal
        open={ripartenzaPicker !== null}
        onClose={() => setRipartenzaPicker(null)}
        title={ripartenzaPicker?.title ?? 'Imposta Ripartenza'}
        size="sm"
      >
        {ripartenzaPicker && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-on-surface-variant whitespace-nowrap">Seleziona una cadenza rapida o inserisci un valore:</p>
            <div className="grid grid-cols-4 gap-2">
              {RIPARTENZA_PRESETS.map(preset => (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => {
                    ripartenzaPicker.onSelect(preset.seconds);
                    setRipartenzaPicker(null);
                  }}
                  className={`h-11 rounded-xl font-headline-sm text-xs font-bold flex items-center justify-center transition active:scale-95 whitespace-nowrap ${
                    ripartenzaPicker.currentSeconds === preset.seconds
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant">
              <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Personalizzata:</span>
              <input
                type="text"
                placeholder="es. 50s o 1:10"
                className="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm font-bold text-primary text-center tabular-nums whitespace-nowrap"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseRipartenza((e.target as HTMLInputElement).value);
                    if (val !== null) {
                      ripartenzaPicker.onSelect(val);
                      setRipartenzaPicker(null);
                    }
                  }
                }}
                id="custom-rip-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('custom-rip-input') as HTMLInputElement;
                  if (input) {
                    const val = parseRipartenza(input.value);
                    if (val !== null) {
                      ripartenzaPicker.onSelect(val);
                      setRipartenzaPicker(null);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold uppercase whitespace-nowrap"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          MODALE DETTAGLI ATLETA A CRONOMETRO FERMO
          ============================================================ */}
      <Modal
        open={selectedAthleteModal !== null}
        onClose={() => setSelectedAthleteModal(null)}
        title={selectedAthleteModal ? `${selectedAthleteModal.athlete.atletaNome} (${selectedAthleteModal.athlete.classe})` : ''}
        size="md"
      >
        {selectedAthleteModal && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
              <span className="text-sm font-semibold text-on-surface whitespace-nowrap">Ripartenza individuale:</span>
              <button
                type="button"
                onClick={() => {
                  const laneId = selectedAthleteModal.laneId;
                  const athlete = selectedAthleteModal.athlete;
                  const currentSec = athlete.ripartenzaCustomSec ?? lanes.find(l => l.id === laneId)?.ripartenzaSecondi ?? globalRipartenzaSecondi;
                  setSelectedAthleteModal(null);
                  setRipartenzaPicker({
                    title: `Ripartenza ${athlete.cognome}`,
                    currentSeconds: currentSec,
                    onSelect: (sec) => {
                      setLanes(curr =>
                        curr.map(l =>
                          l.id === laneId
                            ? {
                                ...l,
                                athletes: l.athletes.map(a =>
                                  a.id === athlete.id ? { ...a, ripartenzaCustomSec: sec } : a
                                ),
                              }
                            : l
                        )
                      );
                    },
                  });
                }}
                className="h-9 px-3.5 bg-surface border border-outline-variant rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 whitespace-nowrap"
              >
                <Clock size={15} />
                <span>{formatRipartenza(selectedAthleteModal.athlete.ripartenzaCustomSec ?? lanes.find(l => l.id === selectedAthleteModal.laneId)?.ripartenzaSecondi ?? globalRipartenzaSecondi)}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide whitespace-nowrap">
                Tutti i tempi registrati ({selectedAthleteModal.athlete.splitList.length})
              </h3>
              {selectedAthleteModal.athlete.splitList.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-3 text-center whitespace-nowrap">Nessun tempo registrato</p>
              ) : (
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {selectedAthleteModal.athlete.splitList.map(split => (
                    <div
                      key={split.lap}
                      className="flex items-center justify-between bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center shrink-0">
                          {split.lap}
                        </span>
                        <span className="font-stat-timer-mobile text-base font-bold tabular-nums text-on-surface whitespace-nowrap">
                          {split.time}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSalvaNelRegistro(selectedAthleteModal.athlete, split)}
                        className="h-8 px-3 rounded-lg bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase flex items-center gap-1 active:scale-95 transition whitespace-nowrap"
                      >
                        <Save size={13} /> Salva
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-surface flex flex-col pt-16 pb-safe-bottom px-2 overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
};
