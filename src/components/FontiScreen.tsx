import React, { useState, useEffect } from 'react';
import { Trophy, BookOpen, CalendarDays, RefreshCw, CheckCircle2 } from 'lucide-react';
import { RecordScreen } from './RecordScreen';
import { RegolamentiScreen } from './RegolamentiScreen';
import { CalendarioScreen } from './CalendarioScreen';
import { AutoUpdateService, UpdateStatus } from '../domain/autoUpdateService';

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
    <div className="space-y-4">
      <div className="ds-card p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="ds-tabs grid-cols-3">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`ds-tab whitespace-nowrap ${tab === t.key ? 'ds-tab-active' : ''}`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {updateStatus && (
            <span className="ds-label !normal-case truncate max-w-[220px]" title={updateStatus.messaggio}>
              Ultimo check: {updateStatus.ultimaVerifica}
            </span>
          )}
          <button
            type="button"
            disabled={checking}
            onClick={handleVerificaOra}
            className="ds-btn-ghost !border-primary-fixed-dim text-primary-container hover:bg-primary-fixed shrink-0"
            title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
          >
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Controllo...' : 'Verifica aggiornamenti'}</span>
          </button>
        </div>
      </div>

      {tab === 'record' && <RecordScreen />}
      {tab === 'regolamenti' && <RegolamentiScreen />}
      {tab === 'calendario' && <CalendarioScreen />}
    </div>
  );
};
