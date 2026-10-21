import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  titolo: string;
  icon?: React.ReactNode;
  badge?: string | number;
  riepilogoChiuso?: string;
  defaultAperto?: boolean;
  storageKey?: string;
  children: React.ReactNode;
  className?: string;
  /** Tono del pannello: normale (card) o "safe" (alert medico). */
  tono?: 'default' | 'safe';
}

export const Sezione: React.FC<Props> = ({
  titolo,
  icon,
  badge,
  riepilogoChiuso,
  defaultAperto = true,
  storageKey,
  children,
  className = '',
  tono = 'default',
}) => {
  const [aperto, setAperto] = useState<boolean>(() => {
    if (storageKey) {
      const saved = sessionStorage.getItem(`sec_${storageKey}`);
      if (saved !== null) return saved === 'true';
    }
    // Smartphone-first: di default chiuso su schermi < 640px per azzerare lo scroll verticale
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return false;
    }
    return defaultAperto;
  });

  useEffect(() => {
    if (storageKey) {
      sessionStorage.setItem(`sec_${storageKey}`, aperto.toString());
    }
  }, [aperto, storageKey]);

  const tonoPannello =
    tono === 'safe'
      ? 'bg-tertiary-fixed/30 border-tertiary-fixed'
      : 'bg-surface-container-lowest border-slate-200/70';

  return (
    <div
      className={`rounded-xl border shadow-card overflow-hidden ${tonoPannello} ${className}`}
    >
      <button
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-expanded={aperto}
        className="w-full px-3 py-2.5 min-h-[48px] flex items-center justify-between gap-2 font-headline-sm text-headline-sm text-on-surface hover:bg-surface-container-low transition select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span className="truncate">{titolo}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-primary-fixed text-on-primary-fixed shrink-0">
              {badge}
            </span>
          )}
          {!aperto && riepilogoChiuso && (
            <span className="font-label-md text-label-md text-on-surface-variant truncate hidden sm:inline">
              · {riepilogoChiuso}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-on-surface-variant">
          {!aperto && riepilogoChiuso && (
            <span className="font-label-md text-label-md sm:hidden">{riepilogoChiuso}</span>
          )}
          {aperto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {aperto && (
        <div className="p-3 pt-0 border-t border-slate-200/70 space-y-2.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
};
