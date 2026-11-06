import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trophy, BookOpen, CalendarDays, RefreshCw, CheckCircle2, Waves } from 'lucide-react';
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

  const tabs: { key: FontiTab; label: string; icon: React.ReactNode }[] = [
    { key: 'record', label: 'Record', icon: <Trophy size={16} /> },
    { key: 'regolamenti', label: 'Regolamenti', icon: <BookOpen size={16} /> },
    { key: 'calendario', label: 'Calendario', icon: <CalendarDays size={16} /> }
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setTab('record')}
          aria-current={tab === 'record' ? 'page' : undefined}
          className={`min-h-[44px] rounded-xl px-3.5 flex items-center gap-2 text-xs font-bold transition ${
            tab === 'record' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-primary border border-outline-variant'
          }`}
        >
          <Trophy size={16} />
          Archivio ufficiale
        </button>
        <button
          type="button"
          disabled={checking}
          onClick={handleVerificaOra}
          className="ds-btn-secondary !min-h-[44px] !px-3 text-xs disabled:opacity-50"
          title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
        >
          <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
          <span>{checking ? 'Controllo...' : 'Verifica'}</span>
        </button>
      </div>

      {updateStatus && (
        <div
          role="status"
          className="shrink-0 flex items-start gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-xs text-on-surface-variant"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-secondary" />
          <span>{updateStatus.messaggio}</span>
        </div>
      )}

      {/* TABS A MENU A TENDINA PULITO E LEGGIBILE */}
      <div className="shrink-0 ds-card p-2 sm:p-2.5">
        <div className="flex items-center gap-2">
          <span className="ds-label shrink-0">Sezione:</span>
          <select
            value={tab}
            onChange={e => setTab(e.target.value as FontiTab)}
            className="w-full min-h-[44px] bg-surface-container-low border border-outline-variant rounded-xl px-3 font-headline font-bold text-xs sm:text-sm text-on-surface focus:border-primary"
          >
            <option value="record">Record FINP / Italia / Europa / Mondo</option>
            <option value="regolamenti">Regolamenti federali e circolari</option>
            <option value="calendario">Calendario gare agonistiche</option>
          </select>
        </div>
      </div>

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
