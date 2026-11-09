import React, { lazy, Suspense, useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, Database, Trophy, Waves } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { pushBackHandler } from '../lib/backHandler';

const PianoScreen = lazy(() => import('./PianoScreen').then(m => ({ default: m.PianoScreen })));
const DatiScreen = lazy(() => import('./DatiScreen').then(m => ({ default: m.DatiScreen })));
const FontiScreen = lazy(() => import('./FontiScreen').then(m => ({ default: m.FontiScreen })));

type SezioneAltro = 'home' | 'piano' | 'dati' | 'fonti';

const SEZIONI: { id: Exclude<SezioneAltro, 'home'>; titolo: string; desc: string; Icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { id: 'piano', titolo: 'Piano stagionale', desc: 'Macrocicli, mesocicli, gare e programmazione.', Icon: CalendarDays },
  { id: 'dati', titolo: 'Archivio e dati', desc: 'Schede, tempi, registro presenze e biomeccanica.', Icon: Database },
  { id: 'fonti', titolo: 'Fonti e regolamenti', desc: 'Record, regolamenti FINP/WPS e calendario gare.', Icon: Trophy },
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
    return saved === 'piano' || saved === 'dati' || saved === 'fonti' ? saved : 'home';
  });

  useEffect(() => {
    sessionStorage.setItem('finp_altro_sezione', sezione);
  }, [sezione]);

  useEffect(() => {
    if (sezione === 'home') return undefined;
    return pushBackHandler(() => {
      setSezione('home');
      return true;
    });
  }, [sezione]);

  if (sezione === 'home') {
    return (
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <PageHeader
          label="Altro"
          title="Strumenti e archivio"
          meta="Piano stagionale, dati e fonti ufficiali."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SEZIONI.map(({ id, titolo, desc, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSezione(id)}
              className="ds-card p-4 text-left flex items-center gap-3 hover:-translate-y-0.5 transition-all"
            >
              <span className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                <Icon size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface block">{titolo}</span>
                <span className="text-xs text-on-surface-variant leading-relaxed block mt-0.5">{desc}</span>
              </span>
              <ChevronLeft size={18} className="text-on-surface-variant rotate-180 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const titolo = SEZIONI.find(s => s.id === sezione)?.titolo ?? 'Altro';

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <button
        type="button"
        onClick={() => setSezione('home')}
        className="self-start inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-headline font-bold text-xs"
      >
        <ChevronLeft size={16} />
        <span>Indietro · {titolo}</span>
      </button>
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
