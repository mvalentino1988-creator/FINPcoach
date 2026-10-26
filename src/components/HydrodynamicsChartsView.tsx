import React, { useEffect, useRef, useState } from 'react';
import { AthleteHydroProfile, HydrodynamicsEngine } from '../domain/hydrodynamicsEngine';
import { Stile } from '../types';
import { Activity, Shield, Zap, Info } from 'lucide-react';

interface Props {
  mainAtleta: AthleteHydroProfile;
  top10List: AthleteHydroProfile[];
}

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

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxV = 2.5;
    const maxF = HydrodynamicsEngine.calcolaForzaResistente(0.85, maxV);

    const toX = (v: number) => padding + (v / maxV) * chartW;
    const toY = (f: number) => height - padding - (f / maxF) * chartH;

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let v = 0.5; v <= 2.4; v += 0.5) {
      const x = toX(v);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${v.toFixed(1)}m/s`, x, height - padding + 12);
    }

    top10List.forEach(ath => {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
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

    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 10;
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

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 11px sans-serif';
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

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxT = 2.0;
    const maxP = HydrodynamicsEngine.calcolaPotenzaIntraCiclo(0.85, 2.3, 0);

    const toX = (t: number) => padding + (t / maxT) * chartW;
    const toY = (p: number) => height - padding - (p / (maxP || 500)) * chartH;

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let t = 0.2; t <= 1.8; t += 0.4) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s`, x, height - padding + 12);
    }

    top10List.forEach(ath => {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
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

    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#39FF14';
    ctx.shadowBlur = 10;
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

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Potenza Intra-ciclo P(t) = k · v(t)³ [Watt / Bracciata]', padding, padding - 15);
  }, [mainAtleta, top10List]);

  return (
    <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-4 sm:p-6 text-white space-y-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-black text-base text-white flex items-center gap-2">
            <Zap size={18} className="text-[#00F0FF]" />
            <span>Biomeccanica Avanzata · Resistenza & Potenza Idrodinamica</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Analisi comparativa in Dark Mode per {mainAtleta.nome} ({mainAtleta.classe} · {mainAtleta.stile.replace('_', ' ')}) vs Top 10 Benchmark.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
            <span className="font-bold text-slate-200">Forza (F) Atleta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="font-bold text-slate-200">Potenza (P) Atleta</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-semibold">Area di Resistenza Sottostante (R)</span>
            <span className="text-white font-mono font-bold text-sm">{areaAtleta.toFixed(1)} N·m/s</span>
          </div>
          <Shield size={20} className="text-[#00F0FF]" />
        </div>
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-semibold">Coefficiente di Forma (k)</span>
            <span className="text-white font-mono font-bold text-sm">{mainAtleta.kCoeff} kg/m</span>
          </div>
          <Activity size={20} className="text-[#39FF14]" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Grafico Superiore · Forza Resistente F = k · v²</span>
          <span className="text-[11px]">Atleta (Neon Blue) vs Top 10 (Tratteggiato)</span>
        </div>
        <div className="overflow-x-auto bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <canvas ref={canvasTopRef} width={600} height={220} className="mx-auto block max-w-full h-auto" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Grafico Inferiore · Potenza Intra-ciclo P = k · v³</span>
          <span className="text-[11px]">Atleta (Lime Green) vs Top 10 (Tratteggiato)</span>
        </div>
        <div className="overflow-x-auto bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <canvas ref={canvasBottomRef} width={600} height={220} className="mx-auto block max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
};
