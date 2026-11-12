import React, { lazy, Suspense, useEffect, useState } from 'react';
import { CalendarDays, Database, Trophy, Waves } from 'lucide-react';

const PianoScreen = lazy(() => import('./PianoScreen').then(m => ({ default: m.PianoScreen })));
const DatiScreen = lazy(() => import('./DatiScreen').then(m => ({ default: m.DatiScreen })));
const FontiScreen = lazy(() => import('./FontiScreen').then(m => ({ default: m.FontiScreen })));

type SezioneAltro = 'piano' | 'dati' | 'fonti';

const SEZIONI: { id: SezioneAltro; label: string; Icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { id: 'piano', label: 'Pianificazione', Icon: CalendarDays },
  { id: 'dati', label: 'Dati & Backup', Icon: Database },
  { id: 'fonti', label: 'Fonti', Icon: Trophy },
];

const Fallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
    <div className="w-12 h-12 rounded-2xl bg-gradient-blue flex items-center justify-center text-white shadow-primary-sm mb-3 animate-pulse">
      <Waves size={24} />
    </div>
    <span className="text-xs font-bold font-headline text-on-surface-variant">Caricamento in corso...</span>
  </div>
);

export const AltroScreen: React.FC = () => {
  const [sezione, setSezione] = useState<SezioneAltro>(() => {
    const saved = sessionStorage.getItem('finp_altro_sezione');
    return saved === 'dati' || saved === 'fonti' ? saved : 'piano';
  });

  useEffect(() => {
    sessionStorage.setItem('finp_altro_sezione', sezione);
  }, [sezione]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Sezioni piano">
        {SEZIONI.map(({ id, label, Icon }) => {
          const attivo = sezione === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSezione(id)}
              className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-full font-label-caps text-label-caps uppercase tracking-wider whitespace-nowrap transition-all ${
                attivo
                  ? 'bg-primary text-on-primary shadow-primary-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className={sezione === 'piano' ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-1 min-h-0 overflow-hidden'}>
        <Suspense fallback={<Fallback />}>
          {sezione === 'piano' && <PianoScreen />}
          {sezione === 'dati' && <DatiScreen />}
          {sezione === 'fonti' && <FontiScreen />}
        </Suspense>
      </div>
    </div>
  );
};
