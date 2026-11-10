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

  const toneClasses =
    tono === 'safe'
      ? 'bg-warning-container/40 border-warning/40'
      : 'bg-surface-container-lowest border-outline-variant';

  return (
    <div className={`rounded-xl border shadow-card overflow-hidden ${toneClasses} ${className}`}>
      <button
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-expanded={aperto}
        className="w-full px-space-md py-space-sm min-h-[52px] flex items-center justify-between gap-3 font-headline-sm text-headline-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors select-none"
        title={titolo}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${
                tono === 'safe'
                  ? 'bg-warning-container text-on-warning-container'
                  : 'bg-primary-fixed text-on-primary-fixed-variant'
              }`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate leading-snug">{titolo}</span>
            {!aperto && riepilogoChiuso && (
              <span className="hidden sm:block text-xs font-normal text-on-surface-variant truncate mt-0.5" title={riepilogoChiuso}>
                {riepilogoChiuso}
              </span>
            )}
          </div>
          {badge !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full font-label-caps text-label-caps uppercase bg-primary-fixed text-on-primary-fixed shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-on-surface-variant">
          {aperto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {!aperto && riepilogoChiuso && (
        <div className="px-4 pb-3 -mt-1 sm:hidden">
          <span className="block text-xs text-on-surface-variant truncate" title={riepilogoChiuso}>
            {riepilogoChiuso}
          </span>
        </div>
      )}

      {aperto && (
        <div className="px-space-md pb-space-md pt-space-sm border-t border-outline-variant space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};
