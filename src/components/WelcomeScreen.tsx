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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#006874] flex items-center justify-center">
            <Waves size={32} className="text-cyan-200" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">
            FINP<span className="text-[#006874]">coach</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Deck bordo vasca per il nuoto paralimpico</p>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed text-center">
          Scegli come partire. I dati restano sul dispositivo (e sul cloud se attivi la sincronizzazione).
        </p>

        <button
          type="button"
          onClick={() => avvia(true)}
          className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#006874] hover:bg-[#004f58] text-white text-left transition"
        >
          <span className="flex items-start gap-3">
            <Users size={20} className="shrink-0 mt-0.5" />
            <span>
              <span className="block font-bold">Squadra reale</span>
              <span className="block text-xs text-cyan-100 font-normal mt-0.5">
                Roster vuoto, stagione {new Date().getFullYear()} già creata. Aggiungi atleti, tempi e gare.
              </span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => avvia(false)}
          className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left transition"
        >
          <span className="flex items-start gap-3">
            <Sparkles size={20} className="shrink-0 mt-0.5 text-[#006874]" />
            <span>
              <span className="block font-bold">Esplora con dati esempio</span>
              <span className="block text-xs text-slate-500 font-normal mt-0.5">
                Tre atleti FINP (S9, S4/T6, S7) con tempi, log e gare italiane. Puoi svuotare dopo da Backup.
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};
