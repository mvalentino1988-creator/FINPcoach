import React, { useEffect, useRef } from 'react';
import { AthleteHydroProfile, HydrodynamicsEngine } from '../domain/hydrodynamicsEngine';
import { Activity, Shield, Zap } from 'lucide-react';

interface Props {
  mainAtleta: AthleteHydroProfile;
  top10List: AthleteHydroProfile[];
}

const CHART_BG = '#F2F3FF';      // surface-container-low
const GRID_COLOR = '#E2E8F0';
const TICK_COLOR = '#64748B';
const TITLE_COLOR = '#424656';   // on-surface-variant
const LINE_FORCE = '#0B5FFF';    // primary-container
const LINE_POWER = '#006A61';    // secondary
const LINE_BENCHMARK = 'rgba(148, 163, 184, 0.45)';

export const HydrodynamicsChartsView: React.FC<Props> = ({ mainAtleta, top10List }) => {
  const canvasTopRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBottomRef = useRef<HTMLCanvasElement | null>(null);

  const areaAtleta = HydrodynamicsEngine.calcolaAreaResistenza(mainAtleta.kCoeff, mainAtleta.velocitaMedia * 1.2);

  useEffect(() => {
    const canvas = canvasTopRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxV = 2.5;
    const maxF = HydrodynamicsEngine.calcolaForzaResistente(0.85, maxV);

    const toX = (v: number) => padding + (v / maxV) * chartW;
    const toY = (f: number) => height - padding - (f / maxF) * chartH;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let v = 0.5; v <= 2.4; v += 0.5) {
      const x = toX(v);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = TICK_COLOR;
      ctx.font = '9px "Public Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${v.toFixed(1)}m/s`, x, height - padding + 12);
    }

    top10List.forEach(ath => {
      ctx.strokeStyle = LINE_BENCHMARK;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();

      let first = true;
      for (let v = 0.1; v <= maxV; v += 0.05) {
        const f = HydrodynamicsEngine.calcolaForzaResistente(ath.kCoeff, v);
        const x = toX(v);
        const y = toY(f);
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.strokeStyle = LINE_FORCE;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(11, 95, 255, 0.25)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    let firstMain = true;
    for (let v = 0.1; v <= maxV; v += 0.05) {
      const f = HydrodynamicsEngine.calcolaForzaResistente(mainAtleta.kCoeff, v);
      const x = toX(v);
      const y = toY(f);
      if (firstMain) { ctx.moveTo(x, y); firstMain = false; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = TITLE_COLOR;
    ctx.font = 'bold 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Forza Resistente F(v) = k · v² [Newton]', padding, padding - 15);
  }, [mainAtleta, top10List]);

  useEffect(() => {
    const canvas = canvasBottomRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxT = 2.0;
    const maxP = HydrodynamicsEngine.calcolaPotenzaIntraCiclo(0.85, 2.3, 0);

    const toX = (t: number) => padding + (t / maxT) * chartW;
    const toY = (p: number) => height - padding - (p / (maxP || 500)) * chartH;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let t = 0.2; t <= 1.8; t += 0.4) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = TICK_COLOR;
      ctx.font = '9px "Public Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s`, x, height - padding + 12);
    }

    top10List.forEach(ath => {
      ctx.strokeStyle = LINE_BENCHMARK;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();

      let first = true;
      for (let t = 0; t <= maxT; t += 0.05) {
        const p = HydrodynamicsEngine.calcolaPotenzaIntraCiclo(ath.kCoeff, ath.velocitaMedia, t);
        const x = toX(t);
        const y = toY(p);
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.strokeStyle = LINE_POWER;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 106, 97, 0.25)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    let firstMain = true;
    for (let t = 0; t <= maxT; t += 0.05) {
      const p = HydrodynamicsEngine.calcolaPotenzaIntraCiclo(mainAtleta.kCoeff, mainAtleta.velocitaMedia, t);
      const x = toX(t);
      const y = toY(p);
      if (firstMain) { ctx.moveTo(x, y); firstMain = false; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = TITLE_COLOR;
    ctx.font = 'bold 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Potenza Intra-ciclo P(t) = k · v(t)³ [Watt / Bracciata]', padding, padding - 15);
  }, [mainAtleta, top10List]);

  return (
    <div className="ds-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="min-w-0">
          <h3 className="font-headline-sm text-base text-on-surface flex items-center gap-2">
            <Zap size={18} className="text-primary-container shrink-0" />
            <span>Resistenza & Potenza Idrodinamica</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Analisi comparativa per {mainAtleta.nome} ({mainAtleta.classe} · {mainAtleta.stile.replace('_', ' ')}) vs Top 10 Benchmark.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="ds-chip-neutral">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LINE_FORCE }} />
            Forza (F) Atleta
          </span>
          <span className="ds-chip-neutral">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LINE_POWER }} />
            Potenza (P) Atleta
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="ds-card-flat p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="ds-label block">Area di Resistenza Sottostante (R)</span>
            <span className="font-headline-sm text-sm font-bold text-on-surface tabular-nums">{areaAtleta.toFixed(1)} N·m/s</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary-container flex items-center justify-center shrink-0">
            <Shield size={18} />
          </span>
        </div>
        <div className="ds-card-flat p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="ds-label block">Coefficiente di Forma (k)</span>
            <span className="font-headline-sm text-sm font-bold text-on-surface tabular-nums">{mainAtleta.kCoeff} kg/m</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
            <Activity size={18} />
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="ds-label">Grafico Superiore · F = k · v²</span>
          <span className="text-xs text-on-surface-variant">Atleta vs Top 10 (Tratteggiato)</span>
        </div>
        <div className="min-w-0 overflow-hidden bg-surface-container-low p-3 rounded-xl border border-outline-variant">
          <canvas ref={canvasTopRef} width={600} height={220} className="mx-auto block max-w-full h-auto" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="ds-label">Grafico Inferiore · P = k · v³</span>
          <span className="text-xs text-on-surface-variant">Atleta vs Top 10 (Tratteggiato)</span>
        </div>
        <div className="min-w-0 overflow-hidden bg-surface-container-low p-3 rounded-xl border border-outline-variant">
          <canvas ref={canvasBottomRef} width={600} height={220} className="mx-auto block max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
};
