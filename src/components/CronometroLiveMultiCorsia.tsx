import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../data/AppContext';
import { formattaData, todayISO } from '../domain/dateUtils';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  User,
  Activity,
  Waves,
  Save,
  CheckCircle2,
  Plus,
  Minus,
  ArrowLeft
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';

interface AthleteInLane {
  id: string;
  atletaId: number | null;
  atletaNome: string;
  classe: string;
  lastSplit: string;
  splitList: { lap: number; time: string; timestampMs: number }[];
  strokeRate?: number;
}

interface LaneState {
  id: number;
  laneNumber: number;
  athletes: AthleteInLane[];
  statusNote: string;
}

export const CronometroLiveMultiCorsia: React.FC = () => {
  const { atleti, aggiungiTempo } = useApp();
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const isFromAltro = sessionStorage.getItem('finp_from_altro') === 'true';
    setShowBack(isFromAltro);
  }, []);

  const handleBack = () => {
    sessionStorage.removeItem('finp_from_altro');
    window.history.back();
  };

  const [isRunning, setIsRunning] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const savedTimeRef = useRef<number>(0);

  const [salvatoFeedback, setSalvatoFeedback] = useState<string | null>(null);
  const [vascaMetri, setVascaMetri] = useState<50 | 25>(50);

  const formatClasse = (val: number | undefined | null, fallback: string) => {
    return val != null ? `S${val}` : fallback;
  };

  // Inizializzazione 4 corsie con supporto multi-atleta retrocompatibile
  const [lanes, setLanes] = useState<LaneState[]>(() => {
    return [1, 2, 3, 4].map(idx => {
      const a = atleti[idx - 1];
      return {
        id: idx,
        laneNumber: idx,
        athletes: [
          {
            id: `ath-${idx}-1`,
            atletaId: a?.id ?? null,
            atletaNome: a ? `${a.cognome} ${a.nome}` : `Atleta ${idx}`,
            classe: a ? formatClasse(a.classeS, 'S9') : 'S9',
            lastSplit: '00:00.00',
            splitList: [],
            strokeRate: 36
          }
        ],
        statusNote: a ? 'Pronto' : 'Libera'
      };
    });
  });

  useEffect(() => {
    if (atleti.length > 0) {
      setLanes(prev =>
        prev.map((lane, idx) => {
          if (lane.athletes.length === 0 && atleti[idx]) {
            return {
              ...lane,
              athletes: [
                {
                  id: `ath-${idx}-1`,
                  atletaId: atleti[idx].id,
                  atletaNome: `${atleti[idx].cognome} ${atleti[idx].nome}`,
                  classe: formatClasse(atleti[idx].classeS, 'S9'),
                  lastSplit: '00:00.00',
                  splitList: [],
                  strokeRate: 36
                }
              ]
            };
          }
          return lane;
        })
      );
    }
  }, [atleti]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now() - savedTimeRef.current;
      timerRef.current = window.setInterval(() => {
        setMasterTime(performance.now() - startTimeRef.current);
      }, 50);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      savedTimeRef.current = masterTime;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const toggleMaster = () => {
    const next = !isRunning;
    setIsRunning(next);
    if (next) {
      navigator.vibrate?.(200);
      localStorage.setItem('finp_stopwatch_running', 'true');
    } else {
      localStorage.setItem('finp_stopwatch_running', 'false');
    }
  };

  const resetMaster = () => {
    setIsRunning(false);
    setMasterTime(0);
    savedTimeRef.current = 0;
    setLanes(prev =>
      prev.map(l => ({
        ...l,
        athletes: l.athletes.map(ath => ({
          ...ath,
          lastSplit: '00:00.00',
          splitList: []
        }))
      }))
    );
  };

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  // Lap per singolo atleta nella corsia
  const handleAthleteLap = (laneId: number, athleteId: string) => {
    if (masterTime === 0 && !isRunning) return;
    const formatted = formatMs(masterTime);
    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId) {
          return {
            ...l,
            athletes: l.athletes.map(ath => {
              if (ath.id === athleteId) {
                const newSplit = {
                  lap: ath.splitList.length + 1,
                  time: formatted,
                  timestampMs: masterTime
                };
                return {
                  ...ath,
                  lastSplit: formatted,
                  splitList: [newSplit, ...ath.splitList]
                };
              }
              return ath;
            })
          };
        }
        return l;
      })
    );
  };

  // LAP corsia: registra lo split per TUTTI gli atleti della corsia in un colpo solo
  const handleLaneLap = (laneId: number) => {
    if (masterTime === 0 && !isRunning) return;
    const formatted = formatMs(masterTime);
    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId) {
          return {
            ...l,
            athletes: l.athletes.map(ath => {
              const newSplit = {
                lap: ath.splitList.length + 1,
                time: formatted,
                timestampMs: masterTime
              };
              return {
                ...ath,
                lastSplit: formatted,
                splitList: [newSplit, ...ath.splitList]
              };
            })
          };
        }
        return l;
      })
    );
  };

  const handleAddAthleteToLane = (laneId: number) => {
    const available = atleti.find(a => !lanes.some(l => l.athletes.some(ath => ath.atletaId === a.id))) || atleti[0];
    if (!available) return;

    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId) {
          const newAth: AthleteInLane = {
            id: `ath-${laneId}-${Date.now()}`,
            atletaId: available.id,
            atletaNome: `${available.cognome} ${available.nome}`,
            classe: formatClasse(available.classeS, 'S9'),
            lastSplit: '00:00.00',
            splitList: [],
            strokeRate: 34
          };
          return { ...l, athletes: [...l.athletes, newAth] };
        }
        return l;
      })
    );
  };

  const handleRemoveAthleteFromLane = (laneId: number, athleteId: string) => {
    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId && l.athletes.length > 1) {
          return { ...l, athletes: l.athletes.filter(ath => ath.id !== athleteId) };
        }
        return l;
      })
    );
  };

  const handleSalvaNelRegistro = (athlete: AthleteInLane) => {
    if (!athlete.atletaId || athlete.splitList.length === 0) return;
    const last = athlete.splitList[0];
    const centesimi = Math.round(last.timestampMs / 10);

    aggiungiTempo({
      atletaId: athlete.atletaId,
      data: todayISO(),
      stile: 'STILE_LIBERO',
      distanzaMetri: vascaMetri,
      centesimi: centesimi,
      contesto: 'ALLENAMENTO',
      vascaMetri: vascaMetri,
      note: `Split Cronometro: Lap ${last.lap} (${last.time})`
    });

    setSalvatoFeedback(`Tempo registrato per ${athlete.atletaNome}!`);
    setTimeout(() => setSalvatoFeedback(null), 3000);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      {salvatoFeedback && (
        <div className="shrink-0 p-3 bg-primary-container text-on-primary font-bold text-xs rounded-xl flex items-center gap-3 shadow-pop animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{salvatoFeedback}</span>
        </div>
      )}

      {/* Intestazione */}
      <div className="shrink-0">
        <PageHeader
          label="Cronometro"
          title="Cronometro a Bordo Vasca"
          icon={<Timer size={13} />}
          meta="Cronometraggio multi-atleta per corsia con split simultanei"
          right={
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition text-xs font-bold"
                >
                  <ArrowLeft size={14} />
                  <span>Indietro</span>
                </button>
              )}
              <span className={`ds-chip ${isRunning ? 'bg-primary text-on-primary' : 'ds-chip-neutral'} !normal-case`}>
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary-fixed-dim animate-ping' : 'bg-on-surface-variant'}`} />
                {isRunning ? 'In corso' : 'Pronto'}
              </span>
            </div>
          }
        />
      </div>

      {/* Master Timer & Start/Pause/Reset - Giant Tabular Display */}
      <section className="shrink-0 relative overflow-hidden rounded-2xl bg-gradient-blue text-white p-4 shadow-primary-sm">
        {/* BG texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 flex flex-col gap-3">
          {/* Controls row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 text-white font-headline border border-white/20">
                VASCA {vascaMetri}M
              </span>
              <button
                type="button"
                onClick={() => setVascaMetri(v => (v === 50 ? 25 : 50))}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-bold transition border border-white/15"
              >
                Cambia
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMaster}
                className={`min-h-[48px] px-6 rounded-xl font-headline text-sm font-bold flex items-center justify-center gap-3 active:scale-95 transition ${
                  isRunning
                    ? 'bg-gradient-orange text-white shadow-orange-glow'
                    : 'bg-white text-primary shadow-pop'
                }`}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                <span>{isRunning ? 'PAUSA' : 'START'}</span>
              </button>
              <button
                type="button"
                onClick={resetMaster}
                aria-label="Reset cronometro"
                className="min-h-[48px] min-w-[48px] px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95 transition border border-white/20"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Giant timer */}
          <div className="text-center py-3 bg-black/20 rounded-2xl border border-white/15">
            <span
              className={`text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums transition-colors ${
                isRunning ? 'text-white' : 'text-white/70'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatMs(masterTime)}
            </span>
            {isRunning && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-white/60 font-bold uppercase tracking-widest">In corso</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4+ Lanes Grid / List */}
      <section
        aria-label="Corsie Cronometrate"
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto pb-14 sm:pb-6"
      >
        {lanes.map(lane => (
          <article
            key={lane.id}
            className="ds-card p-3 flex flex-col justify-between gap-3 border-l-4 border-l-primary"
          >
            {/* Lane Header with Lane Number & Actions */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary text-white font-headline text-xs font-bold flex items-center justify-center shadow-sm">
                  C{lane.laneNumber}
                </span>
                <span className="text-xs font-bold text-on-surface-variant font-headline">
                  {lane.athletes.length} {lane.athletes.length === 1 ? 'atleta' : 'atleti'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLaneLap(lane.id)}
                  className="px-3.5 py-2 rounded-xl bg-tertiary text-white text-xs sm:text-sm font-bold font-headline shadow-sm hover:brightness-105 active:scale-95 transition min-h-[48px] flex items-center justify-center"
                >
                  LAP Corsia
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAthleteToLane(lane.id)}
                  className="min-w-[48px] min-h-[48px] rounded-xl bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center font-bold"
                  title="Aggiungi atleta in corsia"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Athletes in Lane (internal scroll if multiple) */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lane.athletes.map(ath => (
                <div
                  key={ath.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary text-white shrink-0">
                          {ath.classe}
                        </span>
                        <div className="min-w-0 flex-1 text-xs font-bold text-on-surface">
                          <Marquee text={ath.atletaNome} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className="text-lg font-bold text-primary tabular-nums"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {ath.lastSplit}
                        </span>
                        {ath.strokeRate && (
                          <span className="text-xs text-on-surface-variant font-medium">
                            SR {ath.strokeRate} st/min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {lane.athletes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAthleteFromLane(lane.id, ath.id)}
                          className="w-8 h-8 rounded-lg bg-error-container text-on-error-container flex items-center justify-center hover:brightness-95"
                          title="Rimuovi atleta"
                        >
                          <Minus size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAthleteLap(lane.id, ath.id)}
                        className="min-w-[56px] min-h-[56px] px-3 rounded-xl bg-gradient-to-r from-[#E85D04] to-[#FF7A1A] text-white font-headline text-sm font-bold flex items-center justify-center shadow-orange-glow active:scale-95 transition"
                      >
                        LAP
                      </button>
                    </div>
                  </div>

                  {/* Split History & Save */}
                  {ath.splitList.length > 0 && (
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant text-xs">
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {ath.splitList.slice(0, 3).map(s => (
                          <span
                            key={s.lap}
                            className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono font-bold text-xs shrink-0"
                          >
                            #{s.lap}: {s.time}
                          </span>
                        ))}
                      </div>

                      {ath.atletaId && (
                        <button
                          type="button"
                          onClick={() => handleSalvaNelRegistro(ath)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container hover:bg-primary text-primary hover:text-white font-bold text-xs shrink-0 transition"
                        >
                          <Save size={12} />
                          <span>Salva</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
