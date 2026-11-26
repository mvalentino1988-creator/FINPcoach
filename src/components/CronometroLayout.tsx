import React from 'react';
import {
  Flag,
  OctagonX,
  Play,
  RotateCcw,
  Undo2,
  Plus,
  Timer,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import {
  VascaSession,
  VascaLane,
  VascaAthlete,
  formatRipartenza,
  MAX_LANES,
} from '../domain/cronometroVasca';
import { AthleteCard, TimerNodes } from './cronometroParts';

interface Props {
  s: VascaSession;
  now: number;
  inPronta: boolean;
  topBarRef: React.RefObject<HTMLDivElement>;
  bottomBarRef: React.RefObject<HTMLDivElement>;
  gridRef: React.RefObject<HTMLDivElement>;
  generalTimeRef: React.RefObject<HTMLOutputElement>;
  gridStyle: React.CSSProperties;
  orientNotice: boolean;
  lanesVisibili: VascaLane[];
  laneCellH: (lane: VascaLane) => number;
  laneCellW: () => number;
  registerNode: (athleteId: string, kind: keyof TimerNodes) => (el: HTMLElement | null) => void;
  ignoredSignals: Record<string, number>;
  onOpenRipGlobal: () => void;
  onOpenLaneSheet: (lane: VascaLane) => void;
  onOpenPicker: (lane: VascaLane) => void;
  onOpenAthleteSheet: (laneNumero: number, athlete: VascaAthlete) => void;
  onCardTap: (laneNumero: number, athleteId: string) => void;
  onToggleFermo: (laneNumero: number, athleteId: string) => void;
  onReloadSync: () => void;
  onFine: () => void;
  onRequestReset: () => void;
  addLane: () => void;
  onLapGenerale: () => void;
  stopBtnHandlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
  };
  onResume: () => void;
  onVia: () => void;
  undo: () => void;
  undoDepth: number;
  undoPulse: number;
  overlays: React.ReactNode;
  sheetNode: React.ReactNode;
  summaryNode: React.ReactNode;
}

export const CronometroLayout: React.FC<Props> = ({
  s, now, inPronta, topBarRef, bottomBarRef, gridRef, generalTimeRef, gridStyle,
  orientNotice, lanesVisibili, laneCellH, laneCellW, registerNode, ignoredSignals,
  onOpenRipGlobal, onOpenLaneSheet, onOpenPicker, onOpenAthleteSheet, onCardTap,
  onToggleFermo, onReloadSync, onFine, onRequestReset, addLane, onLapGenerale,
  stopBtnHandlers, onResume, onVia, undo, undoDepth, undoPulse,
  overlays, sheetNode, summaryNode,
}) => (
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
        onClick={onOpenRipGlobal}
        className="shrink-0 h-12 px-2.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs font-bold text-primary flex items-center gap-1 whitespace-nowrap active:scale-95 transition"
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
          onClick={onReloadSync}
          aria-label="Ricarica composizione dalla Regia"
          title="Ricarica composizione dalla Regia"
          className="shrink-0 h-12 w-12 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center active:scale-95 transition"
        >
          <RefreshCw size={16} />
        </button>
      )}

      {/* Fine sessione */}
      <button
        type="button"
        onClick={onFine}
        disabled={inPronta}
        className="shrink-0 h-12 px-2.5 rounded-xl bg-surface-container-high text-on-surface text-[12px] font-bold uppercase tracking-wide flex items-center gap-1 active:scale-95 transition disabled:opacity-60 whitespace-nowrap"
      >
        <Flag size={14} /> Fine
      </button>
      {/* Azzera */}
      <button
        type="button"
        onClick={onRequestReset}
        aria-label="Azzera sessione"
        className="shrink-0 h-12 w-12 rounded-xl bg-error-container/70 hover:bg-error-container text-on-error-container flex items-center justify-center active:scale-95 transition"
      >
        <RotateCcw size={17} />
      </button>
    </div>

    {orientNotice && (
      <div className="orient-notice shrink-0 mx-1.5 mb-1 px-2.5 py-1 rounded-lg bg-warning-container text-on-warning-container text-[12px] font-semibold text-center">
        Ruota il telefono per più spazio
      </div>
    )}

    {/* ============ GRIGLIA CORSI E ATLETI ============ */}
    <div
      ref={gridRef}
      className="flex-1 min-h-0 grid gap-1.5 px-0.5"
      style={gridStyle}
    >
      {inPronta && lanesVisibili.every(l => l.atleti.length === 0) && (
        <div className="col-span-full row-span-full min-h-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/50 p-4 text-center">
          <Timer size={28} className="text-on-surface-variant" />
          <div className="max-w-[260px]">
            <p className="font-headline-sm text-headline-sm font-bold text-on-surface">Nessun atleta in vasca</p>
            <p className="mt-1 text-[12px] text-on-surface-variant leading-snug">
              Se hai già impostato le corsie nella Regia, carica la composizione da lì. Altrimenti aggiungi gli atleti alle singole corsie.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onReloadSync}
              className="h-12 px-4 rounded-xl bg-primary text-on-primary font-headline-sm text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-sm"
            >
              <RefreshCw size={17} /> Carica dalla Regia
            </button>
            <button
              type="button"
              onClick={() => onOpenPicker(lanesVisibili[0])}
              className="h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-headline-sm text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Plus size={16} /> Aggiungi atleta
            </button>
          </div>
        </div>
      )}
      {!(inPronta && lanesVisibili.every(l => l.atleti.length === 0)) && lanesVisibili.map(lane => {
        const tileH = laneCellH(lane);
        const tileW = laneCellW();
        const compact = tileH < 68;
        return (
          <section
            key={lane.numero}
            className="flex flex-col min-h-0 min-w-0 rounded-xl bg-surface-container-low border border-outline-variant/40 overflow-hidden"
          >
            {/* Intestazione corsia */}
            <button
              type="button"
              onClick={() => onOpenLaneSheet(lane)}
              className="shrink-0 min-h-[48px] px-2 flex items-center justify-between gap-1 bg-surface-container-high/70 text-on-surface active:scale-[0.99] transition"
              aria-label={`Corsia ${lane.numero}`}
            >
              <span className="font-label-caps text-label-caps font-bold uppercase tracking-wider truncate">
                C{lane.numero}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-bold text-primary whitespace-nowrap">
                {formatRipartenza(lane.ripartenzaCorsia ?? s.ripartenzaGenerale)}
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
                  tileH={tileH}
                  tileW={tileW}
                  now={now}
                  pronta={inPronta}
                  registerNode={registerNode}
                  onTap={inPronta
                    ? () => onOpenAthleteSheet(lane.numero, a)
                    : () => onCardTap(lane.numero, a.id)}
                  onLongPress={() => onOpenAthleteSheet(lane.numero, a)}
                  onToggleStop={() => onToggleFermo(lane.numero, a.id)}
                  ignoredSignal={ignoredSignals[a.id] ?? 0}
                />
              ))}
              {lane.atleti.length === 0 && inPronta && (
                <button
                  type="button"
                  onClick={() => onOpenPicker(lane)}
                  className="flex-1 min-h-[44px] rounded-lg border border-dashed border-outline-variant text-on-surface-variant text-[12px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 active:scale-[0.98] transition"
                >
                  <Plus size={13} /> Aggiungi atleta
                </button>
              )}
              {lane.atleti.length === 0 && !inPronta && (
                <div className="flex-1 flex items-center justify-center text-[12px] text-on-surface-variant font-semibold uppercase">
                  Corsia vuota
                </div>
              )}
            </div>

            {inPronta && lane.atleti.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenPicker(lane)}
                className="shrink-0 h-12 mx-1 mb-1 rounded-lg bg-surface-container text-on-surface text-[12px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 active:scale-[0.98] transition"
              >
                <Plus size={12} /> Atleta
              </button>
            )}
          </section>
        );
      })}

      {inPronta && s.lanes.length < MAX_LANES && !(inPronta && lanesVisibili.every(l => l.atleti.length === 0)) && (
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
            onClick={onLapGenerale}
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
          onClick={onResume}
          className="flex-1 min-h-[52px] rounded-xl bg-primary text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm whitespace-nowrap"
        >
          <Play size={20} /> RIPRENDI
        </button>
      ) : (
        <button
          type="button"
          onClick={onVia}
          disabled={s.lanes.every(l => l.atleti.length === 0)}
          className="flex-1 min-h-[52px] rounded-xl bg-primary text-on-primary font-headline-sm text-base font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm disabled:opacity-60 whitespace-nowrap"
        >
          <Play size={20} /> {s.t0 != null ? 'RIPRENDI SESSIONE' : 'VIA GENERALE'}
        </button>
      )}

      <button
        type="button"
        onClick={undo}
        disabled={undoDepth === 0}
        aria-label="Annulla ultima azione"
        className={`w-14 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.95] transition border ${
          undoPulse > 0
            ? 'bg-primary-container text-on-primary border-primary-container animate-pulse'
            : 'bg-surface-container-high text-on-surface border-outline-variant/60'
        } disabled:opacity-60`}
      >
        <Undo2 size={18} />
        <span>Annulla</span>
      </button>
    </div>

    {overlays}
    {sheetNode}
    {summaryNode}
  </div>
);
