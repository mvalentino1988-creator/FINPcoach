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
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Toggle da bordo vasca */}
      <div className="shrink-0 ds-card p-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setVista('cronometro')}
          className={`flex-1 min-h-[44px] px-3 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 transition ${
            vista === 'cronometro' ? 'bg-primary text-on-primary shadow-primary-sm' : 'bg-surface-container text-on-surface'
          }`}
        >
          <Timer size={18} />
          <span>Cronometro</span>
        </button>
        <button
          type="button"
          onClick={() => setVista('regia')}
          className={`flex-1 min-h-[44px] px-3 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 transition ${
            vista === 'regia' ? 'bg-primary text-on-primary shadow-primary-sm' : 'bg-surface-container text-on-surface'
          }`}
        >
          <SlidersHorizontal size={18} />
          <span>Regia</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {vista === 'cronometro' ? <CronometroLiveMultiCorsia /> : <RegiaTecnicaCorsie />}
      </div>
    </div>
  );
};
