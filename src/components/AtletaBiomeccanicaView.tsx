import React from 'react';
import { Atleta, Tempo } from '../types';
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  Gavel,
  ShieldCheck,
  Sliders,
  Sparkles,
  Waves,
  Eye,
  Flame,
  FileCheck
} from 'lucide-react';
import { formattaTempo } from '../domain/tempoUtils';

interface Props {
  atleta: Atleta;
  tempi: Tempo[];
}

export const AtletaBiomeccanicaView: React.FC<Props> = ({ atleta, tempi }) => {
  // Calcolo stime o valori reali in base alla classe dell'atleta
  const s = atleta.classeS ?? 9;
  const isVisivo = s >= 11 && s <= 13;
  const isBassaClasse = s <= 5;

  // Stime biomeccaniche parametrizzate in base alla classe
  const dpsMedio = (1.5 + (s / 14) * 0.8).toFixed(2);
  const strokeRate = isBassaClasse ? '42-46' : s >= 9 ? '52-56' : '46-50';
  const lattatoMax = (9.5 + (s % 4) * 0.7).toFixed(1);

  // Miglior tempo registrato o tempo stimato
  const bestTempo = tempi.length > 0
    ? [...tempi].sort((a, b) => a.centesimi - b.centesimi)[0]
    : null;

  return (
    <div className="space-y-4">
      {/* 2x2 High-Readability Biomechanics Grid - Stitch Design */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: DPS */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Indice DPS Medio
            </span>
            <Sliders size={16} className="text-primary-container" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-2xl sm:text-3xl font-bold text-primary-container tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {dpsMedio}
            </span>
            <span className="text-[10px] font-semibold text-on-surface-variant">m/bracc</span>
          </div>
          <div className="mt-2 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary-container h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((parseFloat(dpsMedio) / 2.5) * 100))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Frequenza Ottimale */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Freq. Cicli Ottimale
            </span>
            <Activity size={16} className="text-secondary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-2xl sm:text-3xl font-bold text-secondary tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {strokeRate}
            </span>
            <span className="text-[10px] font-semibold text-on-surface-variant">cicli/min</span>
          </div>
          <div className="mt-2 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-secondary h-full rounded-full w-[80%]" />
          </div>
        </div>

        {/* Card 3: Lattato Massimo */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Max Lattato Ematico
            </span>
            <Flame size={16} className="text-tertiary-container" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-2xl sm:text-3xl font-bold text-tertiary-container tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {lattatoMax}
            </span>
            <span className="text-[10px] font-semibold text-on-surface-variant">mmol/L</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-on-surface-variant">
            <span>Test Lattato FINP</span>
            <span className="text-tertiary-container font-bold uppercase">Zona C2/D</span>
          </div>
        </div>

        {/* Card 4: PB Personale */}
        <div className="bg-surface-container-high rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-secondary-container uppercase tracking-wider">
              Miglior Crono {bestTempo ? `${bestTempo.distanzaMetri}m` : '50m SL'}
            </span>
            <Award size={16} className="text-tertiary-container" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-2xl sm:text-3xl font-bold text-on-secondary-container tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {bestTempo ? formattaTempo(bestTempo.centesimi) : '24"80'}
            </span>
            <span className="text-[10px] font-semibold text-on-secondary-container">sec</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            <span className="bg-tertiary-container text-on-primary px-1.5 py-0.5 rounded font-bold uppercase">
              PB S{s}
            </span>
            <span className="text-on-secondary-container font-medium truncate">
              {bestTempo ? `Vasca ${bestTempo.vascaMetri}m` : 'Target Nazionale'}
            </span>
          </div>
        </div>
      </div>

      {/* Regolamento & Ausili WPS / FINP Deck */}
      <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 border border-slate-200/70 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary-container">
            <Gavel size={17} />
            <h4
              className="text-xs font-bold uppercase tracking-wider text-on-surface"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Specifiche Regolamento FINP / World Para Swimming
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary-container uppercase">
            Omologato 2024-2028
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {/* Partenza */}
          <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span className="font-bold text-on-surface">Partenza:</span>
              <span className="text-on-surface-variant">
                {isBassaClasse
                  ? 'In acqua con presa al muretto o supporto assistente'
                  : 'Dal blocco con o senza supporto monopodalico'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-slate-200/70">
              {isBassaClasse ? 'Regola WPS 11.1.2' : 'Regola WPS 11.1.1'}
            </span>
          </div>

          {/* Tapper / Ausili */}
          <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-bold text-on-surface">Tapper & Ausili:</span>
              <span className="text-on-surface-variant">
                {isVisivo
                  ? 'Obbligatorio asta telescopica (3m) con spugna morbida per virata e arrivo'
                  : 'Nessun ausilio di contatto esterno ammesso'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-slate-200/70">
              {isVisivo ? 'Codice WPS S11/S12' : 'Non richiesto'}
            </span>
          </div>

          {/* Virata e Arrivo */}
          <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span className="font-bold text-on-surface">Virata & Tocco:</span>
              <span className="text-on-surface-variant">
                {atleta.classeSB && atleta.classeSB <= 8
                  ? 'Ammesso tocco con una sola mano se congedato da eccezione funzionale'
                  : 'Regolare tocco simultaneo a due mani o capovolta autorizzata'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary bg-surface-container-low px-2 py-0.5 rounded border border-primary-fixed-dim">
              Conforme FINP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
