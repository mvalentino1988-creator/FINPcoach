import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trophy, BookOpen, CalendarDays, RefreshCw, CheckCircle2, Waves, BookMarked, Database } from 'lucide-react';
import { CalendarioScreen } from './CalendarioScreen';
import { AutoUpdateService, UpdateStatus } from '../domain/autoUpdateService';

const RecordScreen = lazy(() => import('./RecordScreen').then(m => ({ default: m.RecordScreen })));
const RegolamentiScreen = lazy(() => import('./RegolamentiScreen').then(m => ({ default: m.RegolamentiScreen })));

type FontiTab = 'record' | 'regolamenti' | 'calendario';

export const FontiScreen: React.FC = () => {
  const [tab, setTab] = useState<FontiTab>('record');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    AutoUpdateService.verificaAggiornamentiAutonomi(false).then(setUpdateStatus);
  }, []);

  const handleVerificaOra = async () => {
    setChecking(true);
    const res = await AutoUpdateService.verificaAggiornamentiAutonomi(true);
    setUpdateStatus(res);
    setChecking(false);
  };

  const tabs: { key: FontiTab; label: string; icon: React.ReactNode; short: string }[] = [
    { key: 'record', label: 'Record & Minimi', short: 'Record', icon: <Trophy size={16} /> },
    { key: 'calendario', label: 'Calendario Gare', short: 'Calendario', icon: <CalendarDays size={16} /> },
    { key: 'regolamenti', label: 'Regolamento WPS', short: 'Regole', icon: <BookOpen size={16} /> }
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      {/* Sub-header & snapshot pill (Stitch: Fonti & Regolamenti) */}
      <div className="shrink-0 flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-sm shrink-0">
            <BookMarked size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">Fonti &amp; Regolamenti</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">FINP • WORLD PARA SWIMMING</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container shadow-sm shrink-0">
          <Database size={13} />
          <span className="font-label-caps text-[10px] tracking-tight">Snapshot offline</span>
        </div>
      </div>

      {/* Segmented Nav (tactile glass dock) */}
      <div className="shrink-0 bg-surface-container-high/80 p-1 rounded-xl flex items-center shadow-sm gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`flex-1 min-w-0 py-2 px-1 rounded-lg font-label-lg text-label-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline truncate">{t.label}</span>
            <span className="sm:hidden truncate">{t.short}</span>
          </button>
        ))}
        <button
          type="button"
          disabled={checking}
          onClick={handleVerificaOra}
          className="shrink-0 min-h-[44px] px-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest/60 transition-all flex items-center gap-1 disabled:opacity-50"
          title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
          aria-label="Verifica aggiornamenti"
        >
          <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
          <span className="hidden md:inline font-label-caps text-[10px] font-bold uppercase tracking-wide">
            {checking ? 'Controllo…' : 'Verifica'}
          </span>
        </button>
      </div>

      {updateStatus && (
        <div
          role="status"
          className="shrink-0 flex items-start gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2.5 text-xs text-on-surface-variant"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-secondary" />
          <span>{updateStatus.messaggio}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shadow-primary-sm mb-3 animate-pulse">
              <Waves size={24} />
            </div>
            <span className="text-xs font-bold font-headline text-on-surface-variant">Caricamento in corso...</span>
          </div>
        }>
          {tab === 'record' && <RecordScreen />}
          {tab === 'regolamenti' && <RegolamentiScreen />}
          {tab === 'calendario' && <CalendarioScreen />}
        </Suspense>
      </div>
    </div>
  );
};
