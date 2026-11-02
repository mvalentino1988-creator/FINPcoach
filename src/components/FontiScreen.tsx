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
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Intestazione pagina — stile dashboard */}
      <div className="shrink-0">
        <PageHeader
          label="Riferimenti Ufficiali"
          title="Gare & Record"
          icon={<Trophy size={13} />}
          meta="Record FINP, regolamenti federali e calendario gare"
          right={
            <button
              type="button"
              disabled={checking}
              onClick={handleVerificaOra}
              className="ds-btn-ghost !min-h-[40px] !px-2.5 shrink-0"
              title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
            >
              <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{checking ? 'Controllo...' : 'Verifica'}</span>
            </button>
          }
        />
      </div>

      {/* Fonti & Gare Hero Card */}
      <section className="shrink-0 rounded-2xl bg-gradient-to-br from-[#0A2A66] via-[#1457E0] to-[#0A2A66] text-white p-3.5 sm:p-4 shadow-primary-sm space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">Archivio Ufficiale</span>
            <h2 className="text-sm sm:text-base font-bold font-headline">Record, Regolamenti e Calendario FINP</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-white font-bold text-[11px]">
              Edizione 2026
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/90 pt-1 border-t border-white/20">
          <span>🏆 Tabelle Nazionali & WPS</span>
          <span className="font-bold text-tertiary-fixed">Aggiornato</span>
        </div>
      </section>

      <div className="shrink-0 ds-card p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="ds-tabs grid-cols-3">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`ds-tab ${tab === t.key ? 'ds-tab-active' : ''}`}
            >
              <span className="hidden xs:inline-flex shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
          {updateStatus && (
            <span className="ds-label !normal-case min-w-0 flex-1 sm:flex-none sm:max-w-[260px] leading-snug" title={updateStatus.messaggio}>
              Ultimo check: {updateStatus.ultimaVerifica}
            </span>
          )}
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
