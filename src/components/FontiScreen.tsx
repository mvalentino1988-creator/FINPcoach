import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Trophy, BookOpen, CalendarDays, RefreshCw, CheckCircle2, Waves } from 'lucide-react';
import { CalendarioScreen } from './CalendarioScreen';
import { AutoUpdateService, UpdateStatus } from '../domain/autoUpdateService';
import { PageHeader } from './PageHeader';

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
      {/* Fonti & Gare Hero Card with integrated Verifica button */}
      <section className="shrink-0 rounded-2xl bg-gradient-to-br from-[#0A2A66] via-[#1457E0] to-[#0A2A66] text-white p-3.5 sm:p-4 shadow-primary-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">Archivio Ufficiale</span>
            <h2 className="text-sm sm:text-base font-bold font-headline">Record, Regolamenti e Calendario FINP</h2>
          </div>
          <button
            type="button"
            disabled={checking}
            onClick={handleVerificaOra}
            className="px-3.5 py-2 rounded-xl bg-tertiary text-on-tertiary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:scale-105 transition shrink-0 disabled:opacity-50"
            title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Controllo...' : 'Verifica'}</span>
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/90 pt-1.5 border-t border-white/20">
          <span>🏆 Tabelle Nazionali & WPS · Edizione 2026</span>
          <span className="font-bold text-tertiary-fixed">
            {updateStatus ? `Ultimo check: ${updateStatus.ultimaVerifica}` : 'Aggiornato'}
          </span>
        </div>
      </section>

      {/* TABS A MENU A TENDINA PULITO E LEGGIBILE */}
      <div className="shrink-0 ds-card p-2 sm:p-2.5">
        <div className="flex items-center gap-2">
          <span className="ds-label shrink-0">Sezione:</span>
          <select
            value={tab}
            onChange={e => setTab(e.target.value as FontiTab)}
            className="w-full min-h-[44px] bg-surface-container-low border border-outline-variant rounded-xl px-3 font-headline font-bold text-xs sm:text-sm text-on-surface focus:border-primary"
          >
            <option value="record">🏆 Record FINP / Italia / Europa / Mondo</option>
            <option value="regolamenti">📖 Regolamenti Federali & Circolari</option>
            <option value="calendario">📅 Calendario Gare Agonistiche</option>
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
