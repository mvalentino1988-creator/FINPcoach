import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import { todayISO } from '../domain/dateUtils';
import { CheckCircle2, Flag, Pause, Play, Plus, RotateCcw, Save, X } from 'lucide-react';

interface Split {
  lap: number;
  time: string;
  timestampMs: number;
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

const RIPARTENZA_PRESETS = [
  { value: 15, label: '15"' },
  { value: 30, label: '30"' },
  { value: 45, label: '45"' },
  { value: 60, label: "1'00\"" },
  { value: 75, label: "1'15\"" },
  { value: 90, label: "1'30\"" },
  { value: 105, label: "1'45\"" },
  { value: 120, label: "2'00\"" },
  { value: 135, label: "2'15\"" },
  { value: 150, label: "2'30\"" },
  { value: 165, label: "2'45\"" },
  { value: 180, label: "3'00\"" },
  { value: 210, label: "3'30\"" },
  { value: 240, label: "4'00\"" },
  { value: 270, label: "4'30\"" },
  { value: 300, label: "5'00\"" },
  { value: 360, label: "6'00\"" },
  { value: 420, label: "7'00\"" },
  { value: 480, label: "8'00\"" },
  { value: 540, label: "9'00\"" },
  { value: 600, label: "10'00\"" },
  { value: 720, label: "12'00\"" },
  { value: 900, label: "15'00\"" },
  { value: 1200, label: "20'00\"" },
  { value: 1500, label: "25'00\"" },
  { value: 1800, label: "30'00\"" },
];

const formatMSS = (totalSec: number): string => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}.${String(secs).padStart(2, '0')}`;
};

// Accetta secondi puri ("90") oppure formato m.ss ("1.30", "1,30").
const parseMSS = (raw: string): number | null => {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const v = Number(t);
    return v >= 0 && v <= 7200 ? v : null;
  }
  const m = t.match(/^(\d{1,3})\.(\d{1,2})$/);
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

export const CronometroLiveMultiCorsia: React.FC = () => {
  const { atleti, stagione, aggiungiTempo } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedStartAthleteIds, setSelectedStartAthleteIds] = useState<Set<string>>(() => new Set());
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const savedTimeRef = useRef(0);
  const idRef = useRef(0);
  const [vascaMetri, setVascaMetri] = useState<25 | 50>(() => stagione?.vascaMetri === 25 ? 25 : 50);
  const [ripartenzaText, setRipartenzeText] = useState(() => formatMSS(90));
  const [ripartenzaSecondi, setRipartenzaSecondi] = useState(90);
  const [salvatoFeedback, setSalvatoFeedback] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [lanes, setLanes] = useState<LaneState[]>(() => createInitialLanes(atleti));

  const assignedAthleteIds = useMemo(
    () => new Set(lanes.flatMap(lane => lane.athletes.map(athlete => athlete.atletaId))),
    [lanes],
  );
  const availableAthletes = useMemo(
    () => atleti.filter(athlete => !assignedAthleteIds.has(athlete.id)),
    [atleti, assignedAthleteIds],
  );
  const assignedCount = assignedAthleteIds.size;

  // Le corsie vuote non occupano spazio: resta solo il primo slot libero in coda.
  const visibleLanes = useMemo(() => {
    const nonEmpty = lanes.filter(lane => lane.athletes.length > 0);
    const firstEmpty = lanes.find(lane => lane.athletes.length === 0);
    return firstEmpty ? [...nonEmpty, firstEmpty] : nonEmpty;
  }, [lanes]);
  const displayIndexById = useMemo(
    () => new Map(visibleLanes.map((lane, index) => [lane.id, index + 1] as const)),
    [visibleLanes],
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
    setSelectedStartAthleteIds(new Set());
    localStorage.setItem('finp_stopwatch_running', 'false');
    setLanes(current => current.map(lane => ({
      ...lane,
      athletes: lane.athletes.map(athlete => ({
        ...athlete,
        startedAtMs: null,
        nextStartAtMs: null,
        splitList: [],
      })),
    })));
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

  const updateLaneRipartenza = (laneId: number, seconds: number) => {
    setLanes(current => current.map(lane =>
      lane.id === laneId ? { ...lane, ripartenzaSecondi: seconds } : lane
    ));
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

  const removeLane = (laneId: number) => {
    setLanes(current => current.length <= 1
      ? current
      : current.filter(lane => lane.id !== laneId || lane.athletes.length > 0));
  };

  const addAthleteToLane = (laneId: number) => {
    if (selectedAthleteId === '') return;
    const athlete = availableAthletes.find(item => item.id === selectedAthleteId);
    if (!athlete) return;

    setLanes(current => current.map(lane => {
      if (lane.id !== laneId || lane.athletes.length >= MAX_ATHLETES_PER_LANE) return lane;
      idRef.current += 1;
      return {
        ...lane,
        athletes: [...lane.athletes, createAthlete(athlete, `ath-${athlete.id}-${idRef.current}`)],
      };
    }));
  };

  const removeAthleteFromLane = (laneId: number, athleteId: string) => {
    setLanes(current => current.map(lane => lane.id === laneId
      ? { ...lane, athletes: lane.athletes.filter(athlete => athlete.id !== athleteId) }
      : lane));
    setSelectedStartAthleteIds(current => {
      if (!current.has(athleteId)) return current;
      const next = new Set(current);
      next.delete(athleteId);
      return next;
    });
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

  const columnClass = visibleLanes.length === 1
    ? 'cronometro-lanes-one'
    : visibleLanes.length === 2
      ? 'cronometro-lanes-count-2'
      : visibleLanes.length === 3
        ? 'cronometro-lanes-count-3'
        : 'cronometro-lanes-count-4';

  return (
    <div className="cronometro-screen flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      <section className="timer-console shrink-0">
        <div className="timer-console-clock">
          <span className="timer-console-label">Tempo squadra</span>
          <output aria-label="Tempo squadra" className={isRunning ? 'is-running' : ''}>{formatMs(masterTime)}</output>
        </div>

        <div className="timer-console-actions">
          <button
            type="button"
            onClick={toggleMaster}
            className={`timer-console-start ${isRunning ? 'is-running' : ''}`}
            aria-label={isRunning ? 'Pausa sessione' : sessionStarted ? 'Riprendi sessione' : 'Avvia sessione e atleti selezionati'}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            {isRunning ? 'Pausa' : sessionStarted ? 'Riprendi sessione' : 'Avvia sessione'}
          </button>
          <button type="button" onClick={resetMaster} aria-label="Azzera sessione" className="timer-console-reset">
            <RotateCcw size={17} />
          </button>
          <label className="timer-setting flex-1 min-w-0">
            <div className="w-full flex items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Vasca</span>
            </div>
            <select
              value={vascaMetri}
              onChange={event => setVascaMetri(Number(event.target.value) as 25 | 50)}
              aria-label="Lunghezza vasca"
              className="bg-transparent font-headline font-bold text-base sm:text-lg text-on-surface focus:outline-none cursor-pointer w-full"
            >
              <option value={25}>25 metri</option>
              <option value={50}>50 metri</option>
            </select>
          </label>
          <label className="timer-setting flex-1 min-w-0">
            <div className="w-full flex items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Ripartenza</span>
            </div>
            <div className="flex items-center gap-1 w-full">
              <input
                type="text"
                inputMode="decimal"
                value={ripartenzaText}
                placeholder="m.ss"
                aria-label="Ripartenza globale in formato minuti.secondi"
                onChange={event => {
                  const text = event.target.value;
                  setRipartenzeText(text);
                  const parsed = parseMSS(text);
                  if (parsed !== null) {
                    setRipartenzaSecondi(parsed);
                    setLanes(curr => curr.map(l => ({ ...l, ripartenzaSecondi: parsed })));
                  }
                }}
                onBlur={() => {
                  const parsed = parseMSS(ripartenzaText);
                  const finalVal = parsed === null || parsed < 5 ? 90 : parsed;
                  setRipartenzeText(formatMSS(finalVal));
                  setRipartenzaSecondi(finalVal);
                  setLanes(curr => curr.map(l => ({ ...l, ripartenzaSecondi: finalVal })));
                }}
                className="w-full bg-transparent font-headline font-bold text-base sm:text-lg text-on-surface focus:outline-none tabular-nums"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="lane-toolbar shrink-0" aria-label="Configurazione corsie e atleti">
        <div className="lane-toolbar-details">
          <div className="lane-toolbar-summary">
            <strong>{assignedCount}</strong><span>atleti</span>
            <span className="lane-toolbar-divider" />
            <strong>{visibleLanes.length}</strong><span>/{MAX_LANES} corsie</span>
          </div>
          {!sessionStarted && selectedStartAthleteIds.size > 0 && (
            <span className="lane-start-hint">
              {selectedStartAthleteIds.size} in partenza generale
            </span>
          )}
        </div>
        <div className="lane-toolbar-actions">
          {sessionStarted && (
            <button
              type="button"
              onClick={handleGeneralLap}
              disabled={!isRunning}
              className="lane-add-button"
              aria-label="Registra un passaggio per tutti gli atleti in vasca"
              title="Lap per tutti"
            >
              <Flag size={15} /> Lap
            </button>
          )}
          <label className="sr-only" htmlFor="athlete-to-assign">Atleta da assegnare</label>
          <select
            id="athlete-to-assign"
            value={selectedAthleteId}
            onChange={event => setSelectedAthleteId(event.target.value ? Number(event.target.value) : '')}
            disabled={availableAthletes.length === 0}
          >
            {availableAthletes.length === 0
              ? <option value="">Tutti assegnati</option>
              : availableAthletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>{athlete.cognome} {athlete.nome}</option>
              ))}
          </select>
          <button type="button" onClick={addLane} disabled={lanes.length >= MAX_LANES} className="lane-add-button">
            <Plus size={15} /> Corsia
          </button>
        </div>
      </section>

      {salvatoFeedback && (
        <div role="status" className="timer-save-feedback">
          <CheckCircle2 size={16} /> {salvatoFeedback}
        </div>
      )}

      <section
        aria-label="Corsie cronometrate"
        className={`cronometro-lanes ${columnClass}`}
        style={{ '--lane-count': visibleLanes.length } as React.CSSProperties}
      >
        {visibleLanes.map((lane, laneIdx) => (
          <article key={lane.id} className="cronometro-lane-card">
            <header className="cronometro-lane-card-header">
              <span className="lane-number">C{laneIdx + 1}</span>
              <span className="lane-athlete-count">{lane.athletes.length}<span>/{MAX_ATHLETES_PER_LANE}</span></span>

              <div className="flex items-center gap-1 ml-auto mr-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Rip:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lane.ripartenzaText ?? formatMSS(lane.ripartenzaSecondi ?? ripartenzaSecondi)}
                  placeholder="m.ss"
                  aria-label={`Ripartenza corsia ${laneIdx + 1} in formato minuti.secondi`}
                  onChange={e => {
                    const text = e.target.value;
                    setLanes(curr => curr.map(l => {
                      if (l.id !== lane.id) return l;
                      const parsed = parseMSS(text);
                      return {
                        ...l,
                        ripartenzaText: text,
                        ripartenzaSecondi: parsed === null ? l.ripartenzaSecondi : parsed
                      };
                    }));
                  }}
                  onBlur={() => {
                    setLanes(curr => curr.map(l => {
                      if (l.id !== lane.id) return l;
                      const parsed = parseMSS(l.ripartenzaText ?? '');
                      const finalVal = parsed === null || parsed < 5 ? 90 : parsed;
                      return {
                        ...l,
                        ripartenzaText: undefined,
                        ripartenzaSecondi: finalVal
                      };
                    }));
                  }}
                  className="w-14 bg-transparent text-primary font-bold text-xs text-right focus:outline-none tabular-nums"
                />
              </div>

              {lane.athletes.length === 0 && lanes.length > 1 && (
                <button type="button" onClick={() => removeLane(lane.id)} className="lane-remove-button" aria-label={`Rimuovi corsia ${laneIdx + 1}`}>
                  <X size={15} />
                </button>
              )}
              {lane.athletes.length < MAX_ATHLETES_PER_LANE && availableAthletes.length > 0 && (
                <button
                  type="button"
                  onClick={() => addAthleteToLane(lane.id)}
                  className="lane-assign-button"
                  aria-label={`Aggiungi ${availableAthletes.find(athlete => athlete.id === selectedAthleteId)?.nome ?? 'atleta'} in corsia ${laneIdx + 1}`}
                >
                  <Plus size={16} />
                </button>
              )}
            </header>

            <div className="cronometro-athletes">
              {lane.athletes.length === 0 ? (
                <div className="lane-empty-state">Scegli un atleta e premi +</div>
              ) : lane.athletes.map(athlete => {
                const now = masterTime;
                const waitingUntil = athlete.nextStartAtMs !== null && now < athlete.nextStartAtMs
                  ? athlete.nextStartAtMs
                  : null;
                const segmentStart = athlete.nextStartAtMs ?? athlete.startedAtMs;
                const elapsed = athlete.startedAtMs === null || segmentStart === null || waitingUntil !== null
                  ? 0
                  : Math.max(0, now - segmentStart);
                const isSelectedForStart = selectedStartAthleteIds.has(athlete.id);
                const action = athlete.startedAtMs === null
                  ? 'AVVIA'
                  : waitingUntil !== null
                    ? `TRA ${formatMs(waitingUntil - now)}`
                    : 'LAP';
                const isDisabled = sessionStarted && (!isRunning || waitingUntil !== null);
                const ariaLabel = !sessionStarted
                  ? `${isSelectedForStart ? 'Rimuovi' : 'Aggiungi'} ${athlete.atletaNome} ${isSelectedForStart ? 'dalla' : 'alla'} partenza generale`
                  : `${action === 'AVVIA' ? 'Avvia crono' : action === 'LAP' ? 'Registra nuotata' : `Ripartenza tra ${formatMs(waitingUntil! - now)}`} per ${athlete.atletaNome}`;

                return (
                  <div className={`athlete-timing-row ${visibleLanes.length > 1 ? 'has-move-select' : ''}`} key={athlete.id}>
                    <button
                      type="button"
                      className={`athlete-timing-button ${athlete.startedAtMs !== null && waitingUntil === null ? 'is-active' : ''} ${waitingUntil !== null ? 'is-waiting' : ''} ${!sessionStarted && isSelectedForStart ? 'is-selected' : ''}`}
                      onClick={() => sessionStarted
                        ? handleAthletePress(lane.id, athlete.id)
                        : toggleInitialStart(athlete.id)}
                      disabled={isDisabled}
                      aria-label={ariaLabel}
                      aria-pressed={!sessionStarted ? isSelectedForStart : undefined}
                    >
                      <span className="athlete-timing-info">
                        <span className="athlete-name">{athlete.atletaNome}</span>
                        <span className="athlete-time">
                          {!sessionStarted
                            ? isSelectedForStart ? 'Partenza generale' : 'Partenza singola'
                            : athlete.startedAtMs === null
                              ? 'In attesa di partenza'
                            : waitingUntil !== null
                              ? `Ultima ${athlete.splitList[0]?.time ?? '--:--.--'}`
                              : formatMs(elapsed)}
                        </span>
                      </span>
                      {sessionStarted && <span className="athlete-action">{action}</span>}
                    </button>
                    {visibleLanes.length > 1 && (
                      <select
                        className="athlete-move-select"
                        value=""
                        aria-label={`Sposta ${athlete.atletaNome} in un'altra corsia`}
                        disabled={!visibleLanes.some(destination =>
                          destination.id !== lane.id && destination.athletes.length < MAX_ATHLETES_PER_LANE
                        )}
                        onChange={event => {
                          const destinationLaneId = Number(event.target.value);
                          if (destinationLaneId) moveAthleteToLane(lane.id, athlete.id, destinationLaneId);
                        }}
                      >
                        <option value="">Sposta</option>
                        {visibleLanes
                          .filter(destination => destination.id !== lane.id && destination.athletes.length < MAX_ATHLETES_PER_LANE)
                          .map(destination => (
                            <option key={destination.id} value={destination.id}>C{displayIndexById.get(destination.id)}</option>
                          ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="athlete-remove-button"
                      onClick={() => removeAthleteFromLane(lane.id, athlete.id)}
                      aria-label={`Rimuovi ${athlete.atletaNome} dalla corsia ${laneIdx + 1}`}
                    >
                      <X size={14} />
                    </button>
                    {athlete.splitList.length > 0 && (
                      <div className="athlete-latest-split">
                        <span>Lap {athlete.splitList[0].lap} · {athlete.splitList[0].time}</span>
                        <button type="button" onClick={() => handleSalvaNelRegistro(athlete)} aria-label={`Salva tempo di ${athlete.atletaNome}`}>
                          <Save size={13} /> Salva
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
