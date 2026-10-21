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

export const RegiaTecnicaCorsie: React.FC = () => {
  const { atleti, log, impostazioni } = useApp();

  const [vascaAttiva, setVascaAttiva] = useState<'50m' | '25m'>('50m');

  // Assegnazione simulata o reale delle corsie
  const corsie = [
    {
      numero: 1,
      atletaNome: atleti[0]?.nome ?? 'Simone Barlaam',
      classe: atleti[0]?.classeS ?? 'S9',
      specialita: '50m Stile Libero (Velocità)',
      targetPacing: '25"4 /50m',
      focus: 'Frequenza elevata (54 br/m) · DPS 2.15m',
      alert: 'Attenzione cuffia rotatori (max 400m palette)'
    },
    {
      numero: 2,
      atletaNome: atleti[1]?.nome ?? 'Giulia Terzi',
      classe: atleti[1]?.classeS ?? 'S7',
      specialita: '100m SL & 50m Farfalla',
      targetPacing: '1\'12"0 /100m',
      focus: 'Assetto orizzontale e rollio controllato',
      alert: 'Carico spalla destra ridotto del 30%'
    },
    {
      numero: 3,
      atletaNome: atleti[2]?.nome ?? 'Carlotta Gilli',
      classe: atleti[2]?.classeS ?? 'S13',
      specialita: '100m Farfalla & 200m Misti',
      targetPacing: '1\'04"2 /100m',
      focus: 'Tapper con asta 3m in virata e arrivo',
      alert: 'Tapper obbligatorio ai 5 metri'
    },
    {
      numero: 4,
      atletaNome: atleti[3]?.nome ?? 'Manuel Bortuzzo',
      classe: atleti[3]?.classeS ?? 'SB4',
      specialita: '100m Rana Paraplegici',
      targetPacing: '1\'42"0 /100m',
      focus: 'Propulsione arti superiori e scivolamento',
      alert: 'Sollevatore bordo vasca e monitoraggio termoregolazione'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Poolside HUD Telemetry Bar */}
      <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-slate-200/70 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-secondary animate-ping" />
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Sessione Regia Tecnica FINP · {vascaAttiva}
              </span>
              <h2
                className="text-lg font-bold text-primary tracking-tight leading-none mt-0.5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Pianificatore Corsie & Telemetria Biomeccanica
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVascaAttiva(v => (v === '50m' ? '25m' : '50m'))}
              className="px-3 h-11 rounded-xl bg-surface-container text-primary-container text-xs font-bold flex items-center gap-1.5 hover:bg-surface-container-highest transition"
            >
              <Waves size={16} />
              <span>Vasca {vascaAttiva}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 transition shadow-card"
            >
              <Printer size={16} />
              <span>Stampa Griglia A4</span>
            </button>
          </div>
        </div>

        {/* Rapid Telemetry Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/70">
          <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-2.5">
            <Activity size={20} className="text-primary-container shrink-0" />
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Stroke Rate</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                48.4 br/min
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-2.5">
            <Sliders size={20} className="text-secondary shrink-0" />
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase block">DPS Medio</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                2.08 m/bracc
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-2.5">
            <Zap size={20} className="text-tertiary-container shrink-0" />
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Fatica RPE</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                7.8 / 10
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-primary shrink-0" />
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Norma FINP/WPS</span>
              <span className="text-sm font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                100% Conforme
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ripartizione Fisiologica e Prescrizioni Mediche */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metabolic Stacked Bar Card */}
        <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-slate-200/70 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-on-surface tracking-wider">
              Carico Fisiologico Seduta
            </span>
            <span className="text-xs font-bold text-primary-container">
              4.200m Totali
            </span>
          </div>

          <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-surface-container my-2">
            <div className="h-full bg-secondary" style={{ width: '45%' }} title="Aerobico A1/A2: 45%" />
            <div className="h-full bg-primary-container" style={{ width: '38%' }} title="Soglia B1/B2: 38%" />
            <div className="h-full bg-tertiary-fixed-dim" style={{ width: '17%' }} title="Tecnico / Def: 17%" />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-surface-container-low p-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">A1/A2 Aerobico</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.890m</span>
              <span className="text-[10px] text-on-surface-variant">45% fondo</span>
            </div>
            <div className="bg-surface-container-low p-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">B1/B2 Soglia</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.596m</span>
              <span className="text-[10px] text-on-surface-variant">38% VO2max</span>
            </div>
            <div className="bg-surface-container-low p-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Tecnico / Scarico</span>
              <span className="text-sm font-bold text-on-surface" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>714m</span>
              <span className="text-[10px] text-on-surface-variant">17% reset</span>
            </div>
          </div>
        </section>

        {/* Medical Directives & Safeguard */}
        <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-slate-200/70 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-error">
              <ShieldAlert size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Prescrizioni Mediche & Safeguard FINP
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
              3 ATTIVE
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-tertiary-fixed-dim text-on-tertiary-fixed flex items-start gap-2">
              <AlertTriangle size={16} className="text-tertiary-container mt-0.5 shrink-0" />
              <div>
                <strong className="font-bold">M. Bortuzzo (S4/SB4):</strong> Supporto fincatura per ingresso/uscita acqua e controllo termoregolazione post-serie intensa.
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface flex items-start gap-2">
              <EyeOff size={16} className="text-secondary mt-0.5 shrink-0" />
              <div>
                <strong className="font-bold">C. Gilli (S13):</strong> Tapper con asta 3m assegnato in virata e arrivo (doppio tocco muretto).
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-error-container border border-error/40 text-on-error-container flex items-start gap-2">
              <ShieldAlert size={16} className="text-error mt-0.5 shrink-0" />
              <div>
                <strong className="font-bold">S. Barlaam (S9):</strong> Protezione cuffia dei rotatori su serie B2: massimo 400m complessivi con palette grandi.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Griglia Corsie Attive */}
      <section className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-slate-200/70 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold text-on-surface"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Schieramento Corsie Vasca {vascaAttiva}
          </h3>
          <span className="text-xs font-bold text-on-surface-variant">
            4 Atleti in Acqua
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {corsie.map(c => (
            <div
              key={c.numero}
              className="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/80 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                    C{c.numero}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface leading-tight">
                      {c.atletaNome}
                    </h4>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {c.specialita}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-on-primary-fixed text-primary-fixed">
                  {c.classe}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-surface-container-lowest border border-slate-200/60">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Target Pacing</span>
                  <span className="font-mono font-bold text-primary-container">{c.targetPacing}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest border border-slate-200/60">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Focus Tecnico</span>
                  <span className="text-[11px] font-semibold text-on-surface truncate block">{c.focus}</span>
                </div>
              </div>

              <div className="text-[11px] text-on-tertiary-fixed bg-surface-container-low/80 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-tertiary-container shrink-0" />
                <span className="truncate">{c.alert}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
