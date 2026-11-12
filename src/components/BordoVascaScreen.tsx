import React, { useEffect, useState } from 'react';
import { CronometroLiveMultiCorsia } from './CronometroLiveMultiCorsia';
import { RegiaTecnicaCorsie } from './RegiaTecnicaCorsie';
import { Timer, SlidersHorizontal, Waves } from 'lucide-react';

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
      {/* Intestazione live + toggle stile mockup Stitch (segmentato) */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Waves size={15} className="text-primary shrink-0" />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-bold truncate">
            Bordo Vasca · Deck Stopwatch
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container font-label-caps text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          Live
        </span>
      </div>

      <div className="shrink-0 flex items-center p-0.5 rounded-xl bg-surface-container-high shadow-sm">
        <button
          type="button"
          onClick={() => setVista('cronometro')}
          aria-pressed={vista === 'cronometro'}
          className={`flex-1 min-h-10 px-3 rounded-lg font-headline-sm text-[13px] font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
            vista === 'cronometro'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Timer size={16} />
          <span>Cronometro</span>
        </button>
        <button
          type="button"
          onClick={() => setVista('regia')}
          aria-pressed={vista === 'regia'}
          className={`flex-1 min-h-10 px-3 rounded-lg font-headline-sm text-[13px] font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
            vista === 'regia'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
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
