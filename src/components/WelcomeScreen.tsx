import React from 'react';
import { FINPStorage } from '../data/storage';
import { Waves, Users, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="ds-card w-full max-w-lg p-5 sm:p-6 space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-primary flex items-center justify-center shadow-primary-md">
            <Waves size={28} className="text-primary-fixed" />
          </div>
          <h1 className="font-display-lg text-display-lg text-primary tracking-tight">
            FINP<span className="text-secondary">coach</span>
          </h1>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            Deck bordo vasca per il nuoto paralimpico
          </p>
        </div>

        <p className="font-body-base text-body-base text-on-surface-variant leading-relaxed text-center">
          Scegli come partire. I dati restano sul dispositivo (e sul cloud se attivi la sincronizzazione).
        </p>

        <button
          type="button"
          onClick={() => avvia(true)}
          className="ds-btn-primary w-full !min-h-[56px] !justify-start !px-4 text-left"
        >
          <span className="flex items-start gap-3 w-full">
            <Users size={20} className="shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block font-headline-sm text-headline-sm">Squadra reale</span>
              <span className="block font-body-base text-body-base text-primary-fixed mt-0.5">
                Roster vuoto, stagione {new Date().getFullYear()} già creata. Aggiungi atleti, tempi e gare.
              </span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => avvia(false)}
          className="ds-btn-ghost w-full !min-h-[56px] !justify-start !px-4 text-left"
        >
          <span className="flex items-start gap-3 w-full">
            <Sparkles size={20} className="shrink-0 mt-0.5 text-primary" />
            <span className="min-w-0">
              <span className="block font-headline-sm text-headline-sm text-on-surface">
                Esplora con dati esempio
              </span>
              <span className="block font-body-base text-body-base text-on-surface-variant mt-0.5">
                Tre atleti FINP (S9, S4/T6, S7) con tempi, log e gare italiane. Puoi svuotare dopo da Backup.
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};
