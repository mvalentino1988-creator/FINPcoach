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
  Eye,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { PageHeader } from './PageHeader';

interface LaneState {
  id: number;
  laneNumber: number;
  atletaId: number | null;
  atletaNome: string;
  classe: string;
  lastSplit: string;
  splitList: { lap: number; time: string; timestampMs: number }[];
  statusNote: string;
  isTapperActive?: boolean;
}

export const CronometroLiveMultiCorsia: React.FC = () => {
  const { atleti, aggiungiTempo } = useApp();

  const [isRunning, setIsRunning] = useState(false);
  const [masterTime, setMasterTime] = useState(0); // in millisecondi
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const savedTimeRef = useRef<number>(0);

  const [salvatoFeedback, setSalvatoFeedback] = useState<string | null>(null);
  const [vascaMetri, setVascaMetri] = useState<50 | 25>(50);

  const formatClasse = (val: number | undefined | null, fallback: string) => {
    return val != null ? `S${val}` : fallback;
  };

  // Inizializzazione 4 corsie con atleti reali se presenti o default olimpici
  // Inizializzazione 4 corsie prioritariamente con gli atleti reali della squadra
  const [lanes, setLanes] = useState<LaneState[]>(() => {
    return [1, 2, 3, 4].map(idx => {
      const a = atleti[idx - 1];
      return {
        id: idx,
        laneNumber: idx,
        atletaId: a?.id ?? null,
        atletaNome: a ? `${a.cognome} ${a.nome}` : `Corsia ${idx}`,
        classe: a ? formatClasse(a.classeS, 'S9') : 'S9',
        lastSplit: '00:00.00',
        splitList: [],
        statusNote: a ? 'Pronto' : 'Libera'
      };
    });
  });

  // Aggiorna gli atleti nelle corsie quando cambia la lista atleti se prima era vuota
  useEffect(() => {
    if (atleti.length > 0) {
      setLanes(prev =>
        prev.map((lane, idx) => {
          if (atleti[idx]) {
            return {
              ...lane,
              atletaId: atleti[idx].id,
              atletaNome: `${atleti[idx].cognome} ${atleti[idx].nome}`,
              classe: formatClasse(atleti[idx].classeS, lane.classe)
            };
          }
          return lane;
        })
      );
    }
  }, [atleti]);

  // Gestione Master Timer
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
    setIsRunning(prev => !prev);
  };

  const resetMaster = () => {
    setIsRunning(false);
    setMasterTime(0);
    savedTimeRef.current = 0;
    setLanes(prev =>
      prev.map(l => ({
        ...l,
        lastSplit: '00:00.00',
        splitList: []
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

  const handleLap = (laneId: number) => {
    if (masterTime === 0 && !isRunning) return;
    const formatted = formatMs(masterTime);
    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId) {
          const newSplit = {
            lap: l.splitList.length + 1,
            time: formatted,
            timestampMs: masterTime
          };
          return {
            ...l,
            lastSplit: formatted,
            splitList: [newSplit, ...l.splitList]
          };
        }
        return l;
      })
    );
  };

  const handleSalvaNelRegistro = (lane: LaneState) => {
    if (!lane.atletaId || lane.splitList.length === 0) return;
    const last = lane.splitList[0];
    const centesimi = Math.round(last.timestampMs / 10);

    aggiungiTempo({
      atletaId: lane.atletaId,
      data: todayISO(),
      stile: 'STILE_LIBERO',
      distanzaMetri: vascaMetri,
      centesimi: centesimi,
      contesto: 'ALLENAMENTO',
      vascaMetri: vascaMetri,
      note: `Split cronometrato Live Deck: Lap ${last.lap} (${last.time})`
    });

    setSalvatoFeedback(`Tempo registrato con successo per ${lane.atletaNome}!`);
    setTimeout(() => setSalvatoFeedback(null), 3000);
  };

  const handleSelectAtletaCorsia = (laneId: number, newAtletaId: number) => {
    const atl = atleti.find(a => a.id === newAtletaId);
    if (!atl) return;
    setLanes(prev =>
      prev.map(l => {
        if (l.id === laneId) {
          return {
            ...l,
            atletaId: atl.id,
            atletaNome: atl.nome,
            classe: formatClasse(atl.classeS, l.classe)
          };
        }
        return l;
      })
    );
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Toast feedback */}
      {salvatoFeedback && (
        <div className="shrink-0 p-2 sm:p-3 bg-primary-container text-on-primary font-bold text-xs rounded-xl flex items-center gap-2 shadow-pop animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{salvatoFeedback}</span>
        </div>
      )}

      {/* Intestazione pagina — compatta shrink-0 */}
      <div className="shrink-0">
        <PageHeader
          label="Live Deck"
          title="Cronometro Multi-Corsia"
          icon={<Timer size={13} />}
          meta="Cronometraggio simultaneo a bordo vasca con split e stroke rate"
          right={
            <span className={`ds-chip ${isRunning ? 'bg-primary text-on-primary' : 'ds-chip-neutral'} !normal-case`}>
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary-fixed-dim animate-ping' : 'bg-on-surface-variant'}`} />
              {isRunning ? 'In corso' : 'Pronto'}
            </span>
          }
        />
      </div>

      {/* Master Poolside Bar - Design System Stitch */}
      <section className="shrink-0 ds-card p-2 sm:p-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-bold text-xs tracking-wider uppercase">
              <span className={`w-2 h-2 rounded-full bg-primary-fixed-dim ${isRunning ? 'animate-ping' : ''}`} />
              Live Deck
            </span>
            <button
              type="button"
              onClick={() => setVascaMetri(v => (v === 50 ? 25 : 50))}
              className="flex items-center gap-1 px-2.5 min-h-[40px] rounded-full bg-surface-container text-on-surface font-bold text-xs hover:bg-surface-container-highest transition"
              title="Cambia vasca"
            >
              <Waves size={14} className="text-primary-container" />
              <span>{vascaMetri}m</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMaster}
              className={`min-h-[44px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-card transition active:scale-95 ${
                isRunning
                  ? 'bg-tertiary-container hover:brightness-95 text-on-tertiary'
                  : 'bg-primary-container hover:bg-primary text-on-primary'
              }`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              <span>{isRunning ? 'STOP' : 'START'}</span>
            </button>
            <button
              type="button"
              onClick={resetMaster}
              aria-label="Reset cronometro master"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center active:scale-95 transition"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Master Time & Big Digits */}
        <div className="flex items-baseline justify-between bg-surface-container-low px-3 py-1.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-highest text-primary-container">
              4 CORSIE
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl sm:text-3xl font-bold text-primary-container tracking-tight tabular-nums"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatMs(masterTime)}
            </span>
          </div>
        </div>
      </section>

      {/* 4-Lane Simultaneous Compact Monitoring Grid: flex-1 a riempimento perfetto */}
      <section
        aria-label="Corsie Cronometrate Attive"
        className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 overflow-y-auto"
      >
        {lanes.map(lane => (
          <article
            key={lane.id}
            className="ds-card p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 hover:border-primary-fixed-dim transition min-h-0"
          >
            {/* Header corsia con atleta e classe */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-highest text-primary-container">
                    C{lane.laneNumber}
                  </span>
                  
                  {atleti.length > 0 ? (
                    <select
                      value={lane.atletaId ?? ''}
                      onChange={e => handleSelectAtletaCorsia(lane.id, Number(e.target.value))}
                      className="text-sm font-bold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary-container outline-none max-w-[120px] sm:max-w-[160px] lg:max-w-[200px] truncate"
                    >
                      {atleti.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h3 className="text-sm font-bold text-on-surface truncate">
                      {lane.atletaNome}
                    </h3>
                  )}

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-on-primary-fixed text-primary-fixed tracking-wide">
                    {lane.classe}
                  </span>

                  {lane.isTapperActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed flex items-center gap-0.5">
                      <Eye size={11} /> Tapper ON
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className="text-xl sm:text-2xl font-bold text-primary-container tabular-nums"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {lane.lastSplit}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                    Split {vascaMetri}m
                  </span>
                </div>

                {/* Stato corsia */}
                <div className="flex items-center gap-2 mt-1 text-on-surface-variant text-xs font-semibold">
                  <span className="text-[11px] text-secondary font-bold min-w-0 truncate">
                    {lane.statusNote}
                  </span>
                </div>
              </div>

              {/* Tasto LAP poolside */}
              <button
                type="button"
                onClick={() => handleLap(lane.id)}
                className="shrink-0 min-w-[56px] min-h-[44px] px-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold text-sm flex flex-col items-center justify-center active:scale-95 transition shadow-card"
              >
                <span className="tracking-tight">LAP</span>
              </button>
            </div>

            {/* Split List & Salva */}
            {lane.splitList.length > 0 && (
              <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
                  {lane.splitList.slice(0, 3).map(s => (
                    <span
                      key={s.lap}
                      className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface font-mono text-[11px] font-semibold shrink-0"
                    >
                      #{s.lap}: {s.time}
                    </span>
                  ))}
                  {lane.splitList.length > 3 && (
                    <span className="text-[10px] text-on-surface-variant font-bold shrink-0">
                      +{lane.splitList.length - 3}
                    </span>
                  )}
                </div>

                {lane.atletaId && (
                  <button
                    type="button"
                    onClick={() => handleSalvaNelRegistro(lane)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary-fixed text-primary-container font-bold text-xs shrink-0 transition"
                    title="Salva"
                  >
                    <Save size={13} />
                    <span>Salva</span>
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
};
