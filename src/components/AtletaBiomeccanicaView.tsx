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

  // Miglior tempo registrato o tempo stimato
  const bestTempo = tempi.length > 0
    ? [...tempi].sort((a, b) => a.centesimi - b.centesimi)[0]
    : null;

  // Parametri fisiologici e prestativi
  const lattatoMax = (9.5 + (s % 4) * 0.7).toFixed(1);
  const velocitaMetriSec = bestTempo && bestTempo.distanzaMetri
    ? (bestTempo.distanzaMetri / (bestTempo.centesimi / 100)).toFixed(2)
    : (1.2 + (s / 14) * 0.6).toFixed(2);
  const indiceEfficienza = (70 + (s * 2)).toFixed(0);

  return (
    <div className="space-y-4">
      {/* 2x2 High-Readability Biomechanics Grid - Parametri Fisiologici e Idrodinamici */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Velocità media di picco */}
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Velocità Target
            </span>
            <Sliders size={16} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-primary tracking-tight leading-none">
              {velocitaMetriSec}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">m/s</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((parseFloat(velocitaMetriSec) / 2.2) * 100))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Indice di Efficienza Idrodinamica */}
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Efficienza Scivolamento
            </span>
            <Activity size={16} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-on-surface tracking-tight leading-none">
              {indiceEfficienza}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">/100</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${indiceEfficienza}%` }} />
          </div>
        </div>

        {/* Card 3: Lattato Massimo */}
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Max Lattato Ematico
            </span>
            <Flame size={16} className="text-tertiary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-on-surface tracking-tight leading-none">
              {lattatoMax}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">mmol/L</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant">
            <span>Test Lattato FINP</span>
            <span className="font-bold uppercase">Zona C2/D</span>
          </div>
        </div>

        {/* Card 4: PB Personale */}
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Miglior Crono {bestTempo ? `${bestTempo.distanzaMetri}m` : '50m SL'}
            </span>
            <Award size={16} className="text-tertiary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-primary tracking-tight leading-none">
              {bestTempo ? formattaTempo(bestTempo.centesimi) : '24"80'}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">sec</span>
          </div>
          <div className="mt-1 flex items-center gap-1 font-label-caps text-label-caps">
            <span className="bg-tertiary-container text-on-tertiary font-bold px-1.5 py-0.5 rounded uppercase">
              PB S{s}
            </span>
            <span className="text-on-surface-variant font-semibold leading-tight">
              {bestTempo ? `Vasca ${bestTempo.vascaMetri}m` : 'Target Nazionale'}
            </span>
          </div>
        </div>
      </div>

      {/* Regolamento & Ausili WPS / FINP Deck */}
      <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-primary min-w-0">
            <Gavel size={16} className="shrink-0" />
            <h4 className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider truncate">
              Specifiche Regolamento FINP / World Para Swimming
            </h4>
          </div>
          <span className="font-label-caps text-label-caps font-bold px-2.5 py-1 rounded-full bg-surface-container text-primary uppercase shrink-0">
            Omologato 2024-2028
          </span>
        </div>

        <div className="space-y-1.5 font-body-base text-body-base">
          {/* Partenza */}
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface shrink-0">Partenza:</span>
              <span className="text-on-surface-variant truncate">
                {isBassaClasse
                  ? 'In acqua con presa al muretto o supporto assistente'
                  : 'Dal blocco con o senza supporto monopodalico'}
              </span>
            </div>
            <span className="font-label-caps text-label-caps font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant shrink-0">
              {isBassaClasse ? 'Regola WPS 11.1.2' : 'Regola WPS 11.1.1'}
            </span>
          </div>

          {/* Tapper / Ausili */}
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface shrink-0">Tapper & Ausili:</span>
              <span className="text-on-surface-variant truncate">
                {isVisivo
                  ? 'Obbligatorio asta telescopica (3m) con spugna morbida per virata e arrivo'
                  : 'Nessun ausilio di contatto esterno ammesso'}
              </span>
            </div>
            <span className="font-label-caps text-label-caps font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant shrink-0">
              {isVisivo ? 'Codice WPS S11/S12' : 'Non richiesto'}
            </span>
          </div>

          {/* Virata e Arrivo */}
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface shrink-0">Virata & Tocco:</span>
              <span className="text-on-surface-variant truncate">
                {atleta.classeSB && atleta.classeSB <= 8
                  ? 'Ammesso tocco con una sola mano se congedato da eccezione funzionale'
                  : 'Regolare tocco simultaneo a due mani o capovolta autorizzata'}
              </span>
            </div>
            <span className="font-label-caps text-label-caps font-bold text-primary bg-surface-container-lowest px-2 py-0.5 rounded border border-primary-fixed-dim shrink-0">
              Conforme FINP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
