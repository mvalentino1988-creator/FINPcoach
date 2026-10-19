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

interface LaneState {
  id: number;
  laneNumber: number;
  atletaId: number | null;
  atletaNome: string;
  classe: string;
  lastSplit: string;
  splitList: { lap: number; time: string; timestampMs: number }[];
  strokeRate: number;
  dps: number;
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
  const [lanes, setLanes] = useState<LaneState[]>(() => {
    return [
      {
        id: 1,
        laneNumber: 1,
        atletaId: atleti[0]?.id ?? null,
        atletaNome: atleti[0]?.nome ?? 'Simone Barlaam',
        classe: formatClasse(atleti[0]?.classeS, 'S9'),
        lastSplit: '00:00.00',
        splitList: [],
        strokeRate: 54,
        dps: 2.15,
        statusNote: 'Passo Gara -0.2s'
      },
      {
        id: 2,
        laneNumber: 2,
        atletaId: atleti[1]?.id ?? null,
        atletaNome: atleti[1]?.nome ?? 'Giulia Terzi',
        classe: formatClasse(atleti[1]?.classeS, 'S7'),
        lastSplit: '00:00.00',
        splitList: [],
        strokeRate: 48,
        dps: 1.85,
        statusNote: 'Freq. Costante'
      },
      {
        id: 3,
        laneNumber: 3,
        atletaId: atleti[2]?.id ?? null,
        atletaNome: atleti[2]?.nome ?? 'Carlotta Gilli',
        classe: formatClasse(atleti[2]?.classeS, 'S13'),
        lastSplit: '00:00.00',
        splitList: [],
        strokeRate: 51,
        dps: 2.02,
        statusNote: 'Ipovedente',
        isTapperActive: true
      },
      {
        id: 4,
        laneNumber: 4,
        atletaId: atleti[3]?.id ?? null,
        atletaNome: atleti[3]?.nome ?? 'Manuel Bortuzzo',
        classe: formatClasse(atleti[3]?.classeS, 'SB4'),
        lastSplit: '00:00.00',
        splitList: [],
        strokeRate: 42,
        dps: 1.70,
        statusNote: 'Assetto Stabile'
      }
    ];
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
              atletaNome: atleti[idx].nome,
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
      note: `Split cronometrato Live Deck: Lap ${last.lap} (${last.time}) - SR: ${lane.strokeRate} br/m`
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
    <div className="space-y-4">
      {/* Toast feedback */}
      {salvatoFeedback && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{salvatoFeedback}</span>
        </div>
      )}

      {/* Master Poolside Bar - Design System Stitch */}
      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006874] text-white font-bold text-xs tracking-wider uppercase">
              <span className={`w-2 h-2 rounded-full bg-cyan-300 ${isRunning ? 'animate-ping' : ''}`} />
              Live Deck
            </span>
            <button
              type="button"
              onClick={() => setVascaMetri(v => (v === 50 ? 25 : 50))}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-[#131b2e] font-bold text-xs hover:bg-[#dae2fd] transition"
              title="Cambia vasca (50m / 25m)"
            >
              <Waves size={14} className="text-[#006874]" />
              <span>{vascaMetri}m {vascaMetri === 50 ? 'Olimpionica' : 'Corta'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMaster}
              className={`min-h-[48px] px-5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#006874] hover:bg-[#004e58] text-white'
              }`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              <span>{isRunning ? 'STOP' : 'START'}</span>
            </button>
            <button
              type="button"
              onClick={resetMaster}
              aria-label="Reset cronometro master"
              className="min-h-[48px] min-w-[48px] px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-slate-700 flex items-center justify-center active:scale-95 transition"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Master Time & Big Digits */}
        <div className="flex items-baseline justify-between bg-surface-container-low px-4 py-3 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Master Timer
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-surface-container-highest text-[#006874]">
              4 CORSIE
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-3xl sm:text-4xl font-black text-[#006874] tracking-tight tabular-nums"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatMs(masterTime)}
            </span>
          </div>
        </div>
      </section>

      {/* 4-Lane Simultaneous Compact Monitoring Grid */}
      <section aria-label="Corsie Cronometrate Attive" className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lanes.map(lane => (
          <article
            key={lane.id}
            className="bg-surface-container-lowest rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-cyan-300 transition"
          >
            {/* Header corsia con atleta e classe */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded bg-surface-container-highest text-[#006874]">
                    C{lane.laneNumber}
                  </span>
                  
                  {atleti.length > 0 ? (
                    <select
                      value={lane.atletaId ?? ''}
                      onChange={e => handleSelectAtletaCorsia(lane.id, Number(e.target.value))}
                      className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#006874] outline-none max-w-[150px] sm:max-w-[180px] truncate"
                    >
                      {atleti.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {lane.atletaNome}
                    </h3>
                  )}

                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#001f24] text-[#a2effd] tracking-wide">
                    {lane.classe}
                  </span>

                  {lane.isTapperActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-0.5">
                      <Eye size={11} /> Tapper ON
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span
                    className="text-2xl sm:text-3xl font-black text-[#006874] tabular-nums"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {lane.lastSplit}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Ultimo Split {vascaMetri}m
                  </span>
                </div>

                {/* Telemetria e biomeccanica */}
                <div className="flex items-center gap-3 mt-1 text-slate-600 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <Activity size={13} className="text-[#006874]" />
                    {lane.strokeRate} br/m
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Sliders size={13} className="text-[#006874]" />
                    DPS {lane.dps}m
                  </span>
                  <span>•</span>
                  <span className="text-[11px] text-[#006399] font-bold">
                    {lane.statusNote}
                  </span>
                </div>
              </div>

              {/* Tasto LAP gigante poolside (a prova di dita bagnate) */}
              <button
                type="button"
                onClick={() => handleLap(lane.id)}
                className="shrink-0 min-w-[82px] min-h-[54px] px-3 rounded-xl bg-[#006874] hover:bg-[#004e58] text-white font-black text-sm flex flex-col items-center justify-center active:scale-95 transition shadow-sm"
              >
                <span className="tracking-tight">LAP</span>
                <span className="text-[9px] uppercase tracking-widest text-cyan-200 mt-0.5">
                  SPLIT
                </span>
              </button>
            </div>

            {/* Split List & Salva */}
            {lane.splitList.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                  {lane.splitList.slice(0, 3).map(s => (
                    <span
                      key={s.lap}
                      className="px-2 py-0.5 rounded bg-surface-container-low text-slate-700 font-mono text-[11px] font-semibold shrink-0"
                    >
                      #{s.lap}: {s.time}
                    </span>
                  ))}
                  {lane.splitList.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      +{lane.splitList.length - 3}
                    </span>
                  )}
                </div>

                {lane.atletaId && (
                  <button
                    type="button"
                    onClick={() => handleSalvaNelRegistro(lane)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[#006874] font-bold text-xs shrink-0 transition"
                    title="Salva tempo nel registro dell'atleta"
                  >
                    <Save size={13} />
                    <span>Registra</span>
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
