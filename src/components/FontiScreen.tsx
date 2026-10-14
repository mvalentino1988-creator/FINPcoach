import React, { useState } from 'react';
import { Trophy, BookOpen, CalendarDays } from 'lucide-react';
import { RecordScreen } from './RecordScreen';
import { RegolamentiScreen } from './RegolamentiScreen';
import { CalendarioScreen } from './CalendarioScreen';

type FontiTab = 'record' | 'regolamenti' | 'calendario';

export const FontiScreen: React.FC = () => {
  const [tab, setTab] = useState<FontiTab>('record');

  const tabs: { key: FontiTab; label: string; icon: React.ReactNode }[] = [
    { key: 'record', label: 'Record', icon: <Trophy size={16} /> },
    { key: 'regolamenti', label: 'Regolamenti', icon: <BookOpen size={16} /> },
    { key: 'calendario', label: 'Calendario', icon: <CalendarDays size={16} /> }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              tab === t.key
                ? 'bg-[#006874] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'record' && <RecordScreen />}
      {tab === 'regolamenti' && <RegolamentiScreen />}
      {tab === 'calendario' && <CalendarioScreen />}
    </div>
  );
};
