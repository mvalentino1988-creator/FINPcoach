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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 h-12 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-[#006874] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          {updateStatus && (
            <span className="text-slate-500 font-medium truncate max-w-[220px]" title={updateStatus.messaggio}>
              Ultimo check: {updateStatus.ultimaVerifica}
            </span>
          )}
          <button
            type="button"
            disabled={checking}
            onClick={handleVerificaOra}
            className="flex items-center gap-1.5 px-3 h-12 bg-cyan-50 hover:bg-cyan-100 text-[#006874] border border-cyan-200 rounded-xl font-bold transition shrink-0"
            title="Verifica aggiornamenti con i siti ufficiali FINP/WPS"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
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
