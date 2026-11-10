import React from 'react';
import { FINPStorage } from '../data/storage';
import { Waves, Users, Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';

interface Props {
  onReady: () => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onReady }) => {
  const avvia = (live: boolean) => {
    if (live) FINPStorage.startLiveSquad();
    else FINPStorage.applyDemoSeed();
    onReady();
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-mesh" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,73,204,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,73,204,0.25) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo card */}
        <div className="text-center mb-10">
          {/* Logo icon */}
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-blue flex items-center justify-center shadow-primary-md">
              <Waves size={36} className="text-white" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping" style={{ animationDuration: '2.5s' }} />
          </div>

          <h1 className="font-headline font-bold text-on-surface tracking-tight mb-2" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>
            FINP<span className="text-primary">coach</span>
          </h1>
          <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
            Assistente bordo vasca · Nuoto Paralimpico FINP
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          {[
            { icon: Zap, label: 'Cronometro live' },
            { icon: Shield, label: 'Dati locali sicuri' },
            { icon: Sparkles, label: 'IA integrata' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wide border border-outline-variant">
              <Icon size={12} className="text-primary" />
              {label}
            </span>
          ))}
        </div>

        {/* Action cards */}
        <div className="space-y-3">
          {/* Live squad */}
          <button
            type="button"
            onClick={() => avvia(true)}
            className="group w-full text-left rounded-2xl p-5 border border-outline-variant bg-surface-container-lowest shadow-card hover:shadow-pop hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-blue flex items-center justify-center shrink-0 shadow-primary-sm group-hover:scale-105 transition-transform">
                <Users size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Squadra Reale</span>
                  <ArrowRight size={18} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Roster vuoto, stagione {new Date().getFullYear()} già configurata. Aggiungi atleti, tempi e gare.
                </p>
              </div>
            </div>
          </button>

          {/* Demo */}
          <button
            type="button"
            onClick={() => avvia(false)}
            className="group w-full text-left rounded-2xl p-5 border border-outline-variant bg-surface-container-low shadow-card hover:shadow-pop hover:bg-surface-container transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 group-hover:bg-surface-variant transition-colors">
                <Sparkles size={22} className="text-on-surface-variant" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Esplora con Dati Esempio</span>
                  <ArrowRight size={18} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  3 atleti FINP (S9, S4/T6, S7) con tempi, log e gare italiane. Puoi svuotare dopo da Backup.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant mt-8">
          I dati restano sul dispositivo · Cloud opzionale via Firebase
        </p>
      </div>
    </div>
  );
};
