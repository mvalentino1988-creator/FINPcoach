import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  VascaAthlete,
  VascaLane,
  VascaSession,
  athleteStatus,
  formatMs,
  formatRipartenza,
  RIPARTENZA_PRESETS,
  INTERVALLO_PRESETS,
  buildSummary,
} from '../domain/cronometroVasca';
import { Copy, Plus, Save, Trash2, X } from 'lucide-react';
import { STATO_VASCA } from '../lib/semantica';

const LONG_PRESS_MS = 450;

export type SheetKind =
  | { type: 'athlete'; laneNumero: number; athlete: VascaAthlete }
  | { type: 'lane'; lane: VascaLane }
  | { type: 'ripGlobal' }
  | { type: 'picker'; lane: VascaLane }
  | null;

export interface TimerNodes {
  time?: HTMLElement | null;
  bar?: HTMLElement | null;
  sub?: HTMLElement | null;
}

const STATUS_META = STATO_VASCA;

// ---------------------------------------------------------------------------
// Tessera atleta
// ---------------------------------------------------------------------------

interface AthleteCardProps {
  session: VascaSession;
  lane: VascaLane;
  athlete: VascaAthlete;
  compact: boolean;
  tileH: number;
  tileW: number;
  now: number;
  pronta: boolean;
  registerNode: (id: string, kind: keyof TimerNodes) => (el: HTMLElement | null) => void;
  onTap: () => void;
  onLongPress: () => void;
  onToggleStop: () => void;
  ignoredSignal?: number;
}

export const AthleteCard: React.FC<AthleteCardProps> = ({
  session, lane, athlete: a, compact, tileH, tileW, now, pronta, registerNode, onTap, onLongPress, onToggleStop, ignoredSignal,
}) => {
  const [prevIgnoredSignal, setPrevIgnoredSignal] = useState(ignoredSignal ?? 0);
  const [ignoredFlash, setIgnoredFlash] = useState(false);
  if ((ignoredSignal ?? 0) !== prevIgnoredSignal) {
    setPrevIgnoredSignal(ignoredSignal ?? 0);
    if (ignoredSignal) setIgnoredFlash(true);
  }
  useEffect(() => {
    if (!ignoredFlash) return undefined;
    const t = window.setTimeout(() => setIgnoredFlash(false), 320);
    return () => window.clearTimeout(t);
  }, [ignoredFlash]);
  const status = athleteStatus(session, lane, a, now);
  const meta = STATUS_META[status];
  const personalRip = a.ripartenzaAtleta;
  const inherited = lane.ripartenzaCorsia ?? session.ripartenzaGenerale;

  const canStop = !pronta && (a.started || a.laps.length > 0 || a.repStart != null || a.restUntil != null);

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
      // In layout compatto (6x8) la pressione lunga è lo STOP individuale
      // (toggle: riprimi = annulla). Se l'atleta è già fermo si apre il
      // pannello, dove "Riprendi" è sempre disponibile.
      if (compact && canStop && !a.fermo) onToggleStop();
      else onLongPress();
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
    // Il font non scende mai sotto 12px: oltre si tronca con ellissi.
    return Math.min(13, Math.max(12, 12 * scale));
  }, [a.cognome, tileW]);

  // Con tessere basse i testi secondari vengono nascosti del tutto
  // (mai tagliati a meta'): il layout deve restare leggibile.
  const showSub = tileH >= 78;
  const showBar = tileH >= 70;
  const timeFont = tileH >= 78 ? 20 : 16;
  // Nelle tessere compatte niente area ■ dedicata: lo STOP è la pressione
  // lunga (toggle), il pannello resta raggiungibile con atleta fermo o in attesa.
  const stopBtn = !compact && canStop && (
    <button
      type="button"
      aria-label={`Stop ${a.cognome}`}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation();
        onToggleStop();
      }}
      className={`absolute right-0 w-11 h-11 flex items-center justify-center z-10 ${compact ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}`}
    >
      <span className="w-6 h-6 rounded-md bg-surface-container-highest/90 text-on-surface-variant flex items-center justify-center text-[12px] font-black border border-outline-variant/50">
        ■
      </span>
    </button>
  );

  const tileHandlers = {
    role: 'button' as const,
    tabIndex: 0,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: clearPress,
    onPointerCancel: clearPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const tileBorder = `relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest overflow-hidden active:scale-[0.99] transition ${
    status === 'in_ritardo' ? 'border-warning' : status === 'in_ripartenza' ? 'border-primary' : status === 'in_nuoto' ? 'border-secondary' : 'border-outline-variant'
  } ${ignoredFlash ? 'ring-2 ring-warning' : ''}`;

  if (compact && tileH >= 34) {
    // Due righe: cognome (con simbolo di stato) sopra, tempo sotto.
    // Senza area stop dedicata: il nome usa tutta la larghezza e va
    // su due righe se necessario (fino a ~16 caratteri a 12px).
    return (
      <div
        {...tileHandlers}
        title={canStop && !a.fermo ? 'Tenere premuto: stop individuale' : undefined}
        className={`${tileBorder} flex flex-col justify-center gap-0.5 pl-1.5 pr-1.5`}
      >
        <div className="flex items-start gap-1 min-w-0">
          <span
            className="font-semibold text-on-surface min-w-0 flex-1 leading-tight break-words"
            style={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
          >
            {a.cognome}
          </span>
          {canStop && !a.fermo && (
            <span aria-hidden className="shrink-0 text-[12px] leading-none text-on-surface-variant/50 mt-0.5">■</span>
          )}
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span aria-hidden className={`text-[12px] leading-none shrink-0 ${meta.cls}`}>{meta.symbol}</span>
          {a.autoLate && (
            <span className="text-warning text-[12px] leading-none shrink-0" title="Partenza automatica recuperata dopo sospensione" aria-label="partenza recuperata">↺</span>
          )}
          <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface-variant tabular-nums leading-none" style={{ fontSize: 12 }}>
            —
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        {...tileHandlers}
        title={canStop && !a.fermo ? 'Tenere premuto: stop individuale' : undefined}
        className={`${tileBorder} pl-1.5 pr-1.5 flex items-center justify-between gap-1`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span aria-hidden className={`text-[12px] leading-none shrink-0 ${meta.cls}`}>{meta.symbol}</span>
          {a.autoLate && (
            <span className="text-warning text-[12px] leading-none shrink-0" title="Partenza automatica recuperata dopo sospensione" aria-label="partenza recuperata">↺</span>
          )}
          <span className="font-semibold text-on-surface truncate" style={{ fontSize: 12 }}>
            {a.cognome}
          </span>
        </span>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface tabular-nums shrink-0" style={{ fontSize: 13 }}>
          —
        </span>
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
      className={`relative flex-1 min-h-0 rounded-lg bg-surface-container-lowest border border-outline-variant/50 px-1.5 py-1 flex flex-col justify-between overflow-hidden active:scale-[0.99] transition ${ignoredFlash ? 'ring-2 ring-warning' : ''}`}
    >
      {/* 1) Cognome */}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight min-w-0 flex-1" style={{ fontSize: nameFont }}>
          {a.cognome}
        </span>
        {stopBtn}
      </div>

      {/* 2) Tempo grande */}
      <output
        ref={registerNode(a.id, 'time') as React.Ref<HTMLOutputElement>}
        className={`font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center ${canStop ? 'mr-12' : ''}`}
        style={{ fontSize: timeFont }}
      >
        —
      </output>

      {/* 3) Lap + 4) stato + countdown */}
      <div className={`flex flex-col gap-0.5 ${canStop ? 'pr-12' : ''}`}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">
            Giro {a.laps.length}
          </span>
          <span className={`text-[12px] font-bold flex items-center gap-0.5 whitespace-nowrap ${meta.cls}`}>
            <span aria-hidden>{meta.symbol}</span> {meta.label}
            {a.autoLate && (
              <span className="text-warning" title="Partenza automatica recuperata dopo sospensione" aria-label="partenza recuperata"> ↺</span>
            )}
          </span>
        </div>
        {showBar && (
          <div className="h-1 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              ref={showBar ? registerNode(a.id, 'bar') : () => {}}
              className={`h-full rounded-full transition-[width] duration-150 ${meta.bar}`}
              style={{ width: '0%' }}
            />
          </div>
        )}
        {showSub && (
          <span ref={registerNode(a.id, 'sub')} className="text-[12px] font-semibold text-on-surface-variant tabular-nums truncate" />
        )}
        {showSub && personalRip != null && personalRip !== inherited && (
          <span className="text-[12px] font-bold uppercase tracking-wide text-tertiary">rip. {formatRipartenza(personalRip)}</span>
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
        className={`h-11 px-2.5 rounded-lg text-[12px] font-bold ${current == null ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
      >
        Auto
      </button>
    )}
    {values.map(v => (
      <button
        key={v}
        type="button"
        onClick={() => onPick(v)}
        className={`h-11 px-2.5 rounded-lg text-[12px] font-bold tabular-nums ${current === v ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
      >
        {formatRipartenza(v)}
      </button>
    ))}
  </div>
);

export const SheetHost: React.FC<SheetHostProps> = (props) => {
  const { sheet, onClose } = props;
  return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Chiudi finestra" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        className="relative bg-surface-container-lowest w-full sm:max-w-md max-h-[75dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 border border-outline-variant shadow-float"
        role="dialog"
        aria-modal="true"
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
        aria-label="Cerca atleta"
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
    <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Ripartenza tra giri</p>
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
    <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Intervallo di partenza</p>
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
      <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Ripartenza personale</p>
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
          className="mt-2 h-11 px-3 rounded-lg bg-surface-container text-on-surface text-xs font-bold"
        >
          Ripristina ereditata ({formatRipartenza(inherited)})
        </button>
      )}

      <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Lap target (auto-stop)</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, athlete.targetLaps == null ? 1 : Math.max(1, athlete.targetLaps - 1))} className="w-11 h-11 rounded-lg bg-surface-container font-black">−</button>
        <span className="w-14 text-center font-stat-timer text-sm font-bold">{athlete.targetLaps ?? '—'}</span>
        <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, (athlete.targetLaps ?? 0) + 1)} className="w-11 h-11 rounded-lg bg-surface-container font-black">+</button>
        {athlete.targetLaps != null && (
          <button type="button" onClick={() => onSetTargetLaps(laneNumero, athlete.id, null)} className="h-11 px-3 rounded-lg bg-surface-container text-on-surface text-xs font-bold">Auto</button>
        )}
      </div>

      <p className="text-[12px] font-bold uppercase tracking-wide text-on-surface-variant mb-1 mt-4">Correggi ultimo lap</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, -5000)} className="h-11 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">−5s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, -1000)} className="h-11 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">−1s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, 1000)} className="h-11 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">+1s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, 5000)} className="h-11 px-3 rounded-lg bg-surface-container text-xs font-bold disabled:opacity-40">+5s</button>
        <button type="button" disabled={athlete.laps.length === 0} onClick={() => onCorrectLap(laneNumero, athlete.id, Number.MIN_SAFE_INTEGER)} className="h-11 px-3 rounded-lg bg-error-container text-on-error-container text-xs font-bold disabled:opacity-40">Elimina</button>
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

export const SummaryOverlay: React.FC<{
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
                <div className="text-[12px] text-on-surface-variant mt-0.5">
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
