import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Layers,
  Printer,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
  Waves,
  Zap,
  EyeOff
} from 'lucide-react';
import { PageHeader } from './PageHeader';

export const RegiaTecnicaCorsie: React.FC = () => {
  const { atleti, log, impostazioni } = useApp();

  const [vascaAttiva, setVascaAttiva] = useState<'50m' | '25m'>('50m');

  // Assegnazione dinamica delle corsie basata sugli atleti reali della squadra
  const corsie = [1, 2, 3, 4].map(num => {
    const a = atleti[num - 1];
    if (a) {
      return {
        numero: num,
        atletaNome: `${a.cognome} ${a.nome}`,
        classe: a.classeS != null ? `S${a.classeS}` : 'S9',
        specialita: 'Stile Libero',
        targetPacing: 'Passo Gara Personalizzato',
        focus: 'Assetto orizzontale e spinta uniforme',
        alert: a.note || 'Nessuna limitazione segnalata'
      };
    }
    return {
      numero: num,
      atletaNome: `Corsia ${num}`,
      classe: '—',
      specialita: 'Libera',
      targetPacing: '—',
      focus: 'Corsia disponibile per riscaldamento o defaticamento',
      alert: 'Nessun atleta assegnato'
    };
  });

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Intestazione pagina — shrink-0 */}
      <div className="shrink-0">
        <PageHeader
          label="Pianificatore"
          title={`Regia Tecnica · ${vascaAttiva}`}
          icon={<Sliders size={13} />}
          meta="Assegnazione corsie, telemetria e prescrizioni mediche"
          right={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVascaAttiva(v => (v === '50m' ? '25m' : '50m'))}
                className="ds-btn-ghost !min-h-[40px] !px-2.5 shrink-0"
                title="Cambia vasca"
              >
                <Waves size={15} />
                <span className="hidden sm:inline">Vasca {vascaAttiva}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="ds-btn-primary !min-h-[40px] !px-2.5 shrink-0"
                title="Stampa"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Stampa</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Top Poolside HUD Telemetry Bar: compatta shrink-0 */}
      <section className="shrink-0 ds-card p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            <h2
              className="text-sm sm:text-base font-bold text-primary tracking-tight leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Telemetria Bordo Vasca
            </h2>
          </div>
        </div>

        {/* Rapid Telemetry Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-200/70">
          <div className="p-1.5 rounded-xl bg-surface-container-low flex items-center gap-2">
            <Activity size={15} className="text-primary-container shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Corsie Attive: {atleti.length > 0 ? Math.min(4, atleti.length) : 0}/4
              </span>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-surface-container-low flex items-center gap-2">
            <Sliders size={15} className="text-secondary shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Vasca {vascaAttiva}
              </span>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-surface-container-low flex items-center gap-2">
            <Zap size={15} className="text-tertiary-container shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Squadra FINP
              </span>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-surface-container-low flex items-center gap-2">
            <CheckCircle2 size={15} className="text-primary shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Pronto Bordo Vasca
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ripartizione Fisiologica e Prescrizioni Mediche: shrink-0 compatto */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Metabolic Stacked Bar Card */}
        <section className="ds-card p-2 sm:p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase text-on-surface tracking-wider">
              Carico Fisiologico
            </span>
            <span className="text-[11px] font-bold text-primary-container">
              4.200m
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-surface-container my-1">
            <div className="h-full bg-secondary" style={{ width: '45%' }} title="Aerobico A1/A2: 45%" />
            <div className="h-full bg-primary-container" style={{ width: '38%' }} title="Soglia B1/B2: 38%" />
            <div className="h-full bg-tertiary-fixed-dim" style={{ width: '17%' }} title="Tecnico / Def: 17%" />
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <div className="bg-surface-container-low p-1.5 rounded-lg flex flex-col">
              <span className="text-xs font-bold text-on-surface tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.890m</span>
              <span className="text-[10px] text-on-surface-variant">A1/A2 45%</span>
            </div>
            <div className="bg-surface-container-low p-1.5 rounded-lg flex flex-col">
              <span className="text-xs font-bold text-on-surface tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.596m</span>
              <span className="text-[10px] text-on-surface-variant">B1/B2 38%</span>
            </div>
            <div className="bg-surface-container-low p-1.5 rounded-lg flex flex-col">
              <span className="text-xs font-bold text-on-surface tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>714m</span>
              <span className="text-[10px] text-on-surface-variant">Tec 17%</span>
            </div>
          </div>
        </section>

        {/* Medical Directives & Safeguard */}
        <section className="ds-card p-2 sm:p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-error">
              <ShieldAlert size={15} />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Prescrizioni Mediche
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container">
              3
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="px-2 py-1 rounded-lg bg-surface-container-low border border-tertiary-fixed-dim text-on-tertiary-fixed flex items-start gap-1.5">
              <AlertTriangle size={13} className="text-tertiary-container mt-0.5 shrink-0" />
              <div className="text-[11px] leading-tight truncate">
                <strong className="font-bold">M. Bortuzzo (S4/SB4):</strong> Fincatura e termoregolazione
              </div>
            </div>

            <div className="px-2 py-1 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface flex items-start gap-1.5">
              <EyeOff size={13} className="text-secondary mt-0.5 shrink-0" />
              <div className="text-[11px] leading-tight truncate">
                <strong className="font-bold">C. Gilli (S13):</strong> Tapper asta 3m virata/arrivo
              </div>
            </div>

            <div className="px-2 py-1 rounded-lg bg-error-container border border-error/40 text-on-error-container flex items-start gap-1.5">
              <ShieldAlert size={13} className="text-error mt-0.5 shrink-0" />
              <div className="text-[11px] leading-tight truncate">
                <strong className="font-bold">S. Barlaam (S9):</strong> Max 400m palette B2
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Griglia Corsie Attive: riempie lo spazio restante ed è scrollabile internamente se serve */}
      <section className="flex-1 min-h-0 ds-card p-2 sm:p-3 space-y-1.5 flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3
            className="text-xs sm:text-sm font-bold text-on-surface"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Corsie Vasca {vascaAttiva}
          </h3>
          <span className="text-xs font-bold text-on-surface-variant">
            4
          </span>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 overflow-y-auto">
          {corsie.map(c => (
            <div
              key={c.numero}
              className="p-2 sm:p-2.5 rounded-xl bg-surface-container-low border border-slate-200/80 flex flex-col justify-between gap-1 min-w-0"
            >
              <div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-primary-container text-on-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                    C{c.numero}
                  </span>
                  <h4 className="text-xs font-bold text-on-surface leading-tight truncate min-w-0">
                    {c.atletaNome}
                  </h4>
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-on-primary-fixed text-primary-fixed shrink-0">
                    {c.classe}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-1 min-w-0 mt-1">
                  <span className="font-mono font-bold text-xs text-primary-container shrink-0">{c.targetPacing}</span>
                  <span className="text-[10px] text-on-surface-variant truncate">{c.specialita}</span>
                </div>

                <p className="text-[11px] leading-tight text-on-surface-variant line-clamp-2 mt-1">{c.focus}</p>
              </div>

              <div className="text-[10px] leading-tight text-on-tertiary-fixed bg-surface-container-lowest px-1.5 py-1 rounded-md flex items-start gap-1 mt-1">
                <AlertTriangle size={11} className="text-tertiary-container shrink-0 mt-0.2" />
                <span className="line-clamp-2">{c.alert}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
