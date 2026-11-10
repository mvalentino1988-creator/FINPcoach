import React, { useEffect, useRef } from 'react';
import { AthleticPerformance, BiomechanicsEngine, EliteClusterPoint } from '../domain/biomechanicsEngine';

interface Props {
  athletePerformances: AthleticPerformance[];
  eliteClusters: EliteClusterPoint[];
  width?: number;
  height?: number;
}

export const ParaSwimmingCanvasChart: React.FC<Props> = ({
  athletePerformances,
  eliteClusters,
  width = 600,
  height = 360
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F2F3FF';
    ctx.fillRect(0, 0, width, height);

    const padding = 50;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const minV = 0.4;
    const maxV = 2.4;
    const minC = 100;
    const maxC = 900;

    const toX = (v: number) => padding + ((v - minV) / (maxV - minV)) * chartW;
    const toY = (c: number) => height - padding - ((c - minC) / (maxC - minC)) * chartH;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let v = 0.5; v <= 2.3; v += 0.3) {
      const x = toX(v);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${v.toFixed(1)}m/s`, x, height - padding + 15);
    }

    for (let c = 200; c <= 800; c += 200) {
      const y = toY(c);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${c}`, padding - 8, y + 3);
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = '#006874';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let first = true;
    for (let v = 0.45; v <= 2.35; v += 0.02) {
      const c = BiomechanicsEngine.calcolaCostoEnergetico(v);
      const x = toX(v);
      const y = toY(c);

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    const classColors: Record<string, string> = {
      S1: '#EF4444',
      S3: '#F97316',
      S5: '#EAB308',
      S7: '#10B981',
      S9: '#3B82F6',
      S10: '#8B5CF6'
    };

    eliteClusters.forEach(p => {
      const x = toX(p.velocitaMedia);
      const y = toY(p.costoEnergetico);
      const col = classColors[p.classeS] || '#006399';

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    if (athletePerformances.length > 0) {
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      athletePerformances.forEach((p, idx) => {
        const x = toX(p.velocitaMedia);
        const y = toY(p.costoEnergetico);

        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      athletePerformances.forEach((p, idx) => {
        const x = toX(p.velocitaMedia);
        const y = toY(p.costoEnergetico);

        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 6, y - 6, 12, 12);

        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 9px "Public Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${idx + 1}`, x, y - 9);
      });
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Velocità Media (m/s)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Costo Energetico C(v) [J/m/kg]', 0, 0);
    ctx.restore();
  }, [athletePerformances, eliteClusters, width, height]);

  return (
    <div className="w-full min-w-0 overflow-hidden ds-card p-3 sm:p-4 shadow-card space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pt-1">
        <div className="min-w-0">
          <h3 className="font-headline-sm text-sm text-on-surface flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0" />
            Curva a U del Costo Energetico C(v)
          </h3>
          <p className="ds-label mt-0.5">J/m/kg vs Velocità (m/s)</p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="ds-chip-neutral">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#006874' }} />
            Curva Teorica
          </span>
          <span className="ds-chip-neutral">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#F59E0B' }} />
            Mio Atleta
          </span>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden bg-surface-container-low rounded-xl border border-outline-variant p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="mx-auto block max-w-full h-auto"
        />
      </div>
    </div>
  );
};
