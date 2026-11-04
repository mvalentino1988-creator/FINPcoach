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
      ? 'bg-warning/5 border-warning/30'
      : 'bg-surface-container-lowest border-outline-variant';

  return (
    <div className={`rounded-2xl border shadow-card overflow-hidden ${toneClasses} ${className}`}>
      <button
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-expanded={aperto}
        className="w-full px-4 py-3 min-h-[52px] flex items-center justify-between gap-3 font-headline text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors select-none"
        title={titolo}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <span className={`shrink-0 ${tono === 'safe' ? 'text-warning' : 'text-primary'}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate leading-snug">{titolo}</span>
            {!aperto && riepilogoChiuso && (
              <span className="hidden sm:block text-xs font-normal text-on-surface-variant truncate mt-0.5">
                {riepilogoChiuso}
              </span>
            )}
          </div>
          {badge !== undefined && (
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-primary text-primary shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-on-surface-variant">
          {aperto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {!aperto && riepilogoChiuso && (
        <div className="px-4 pb-3 -mt-1 sm:hidden">
          <span className="block text-xs text-on-surface-variant truncate">
            {riepilogoChiuso}
          </span>
        </div>
      )}

      {aperto && (
        <div className="p-4 pt-0 border-t border-outline-variant space-y-3 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};
