import React, { useEffect, useState } from 'react';
import { CronometroLiveMultiCorsia } from './CronometroLiveMultiCorsia';
import { RegiaTecnicaCorsie } from './RegiaTecnicaCorsie';
import { Timer, SlidersHorizontal } from 'lucide-react';

export const BordoVascaScreen: React.FC = () => {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  const [vista, setVista] = useState<'cronometro' | 'regia'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? 'regia' : 'cronometro'
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (desktop) setVista('regia');
  }, [desktop]);

  // Su PC il cronometro multi-corsia non serve: Vasca mostra direttamente la regia tecnica.
  if (desktop) {
    return (
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <RegiaTecnicaCorsie />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden h-full">
      {/* Toggle da bordo vasca */}
      <div className="shrink-0 ds-card p-1 sm:p-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setVista('cronometro')}
          className={`flex-1 min-h-10 sm:min-h-11 px-3 rounded-lg sm:rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            vista === 'cronometro' ? 'bg-primary text-on-primary shadow-primary-sm' : 'bg-surface-container text-on-surface'
          }`}
        >
          <Timer size={16} />
          <span>Cronometro</span>
        </button>
        <button
          type="button"
          onClick={() => setVista('regia')}
          className={`flex-1 min-h-10 sm:min-h-11 px-3 rounded-lg sm:rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            vista === 'regia' ? 'bg-primary text-on-primary shadow-primary-sm' : 'bg-surface-container text-on-surface'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span>Regia</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {vista === 'cronometro' ? <CronometroLiveMultiCorsia /> : <RegiaTecnicaCorsie />}
      </div>
    </div>
  );
};
