import React, { useState } from 'react';
import { CronometroLiveMultiCorsia } from './CronometroLiveMultiCorsia';
import { RegiaTecnicaCorsie } from './RegiaTecnicaCorsie';
import { Timer, SlidersHorizontal } from 'lucide-react';

export const BordoVascaScreen: React.FC = () => {
  const [vista, setVista] = useState<'cronometro' | 'regia'>('cronometro');

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Toggle Bar */}
      <div className="shrink-0 ds-card p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setVista('cronometro')}
            className={`flex-1 min-h-[40px] px-3 rounded-xl font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              vista === 'cronometro' ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Timer size={16} />
            <span>Cronometro Multi-corsia</span>
          </button>
          <button
            type="button"
            onClick={() => setVista('regia')}
            className={`flex-1 min-h-[40px] px-3 rounded-xl font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              vista === 'regia' ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Regia & Telemetria</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {vista === 'cronometro' ? <CronometroLiveMultiCorsia /> : <RegiaTecnicaCorsie />}
      </div>
    </div>
  );
};
