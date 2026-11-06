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
    <div className="min-h-screen bg-gradient-to-br from-[#07101f] via-[#0F3D99]/30 to-[#07101f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-tertiary/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo card */}
        <div className="text-center mb-10">
          {/* Logo icon */}
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-blue flex items-center justify-center shadow-primary-md">
              <Waves size={36} className="text-white" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-3xl bg-primary animate-ping" style={{ animationDuration: '2.5s' }} />
          </div>

          <h1 className="font-headline font-bold text-white mb-2" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>
            FINP<span className="text-tertiary">coach</span>
          </h1>
          <p className="text-sm text-white/60 font-medium tracking-wide">
            Assistente bordo vasca · Nuoto Paralimpico FINP
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { icon: Zap, label: 'Cronometro live' },
            { icon: Shield, label: 'Dati locali sicuri' },
            { icon: Sparkles, label: 'IA integrata' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold border border-white/15">
              <Icon size={12} />
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
            className="group w-full text-left rounded-2xl p-5 border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/15 hover:border-white/30 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-orange flex items-center justify-center shrink-0 shadow-tertiary-glow group-hover:scale-105 transition-transform">
                <Users size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline font-bold text-white text-base">Squadra Reale</span>
                  <ArrowRight size={18} className="text-white/40 group-hover:text-tertiary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
                  Roster vuoto, stagione {new Date().getFullYear()} già configurata. Aggiungi atleti, tempi e gare.
                </p>
              </div>
            </div>
          </button>

          {/* Demo */}
          <button
            type="button"
            onClick={() => avvia(false)}
            className="group w-full text-left rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                <Sparkles size={22} className="text-white/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline font-bold text-white/80 text-base">Esplora con Dati Esempio</span>
                  <ArrowRight size={18} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-sm text-white/50 mt-0.5 leading-relaxed">
                  3 atleti FINP (S9, S4/T6, S7) con tempi, log e gare italiane. Puoi svuotare dopo da Backup.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/35 mt-8">
          I dati restano sul dispositivo · Cloud opzionale via Firebase
        </p>
      </div>
    </div>
  );
};
