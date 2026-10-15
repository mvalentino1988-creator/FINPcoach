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
}

export const Sezione: React.FC<Props> = ({
  titolo,
  icon,
  badge,
  riepilogoChiuso,
  defaultAperto = true,
  storageKey,
  children,
  className = ''
}) => {
  const [aperto, setAperto] = useState<boolean>(() => {
    if (storageKey) {
      const saved = sessionStorage.getItem(`sec_${storageKey}`);
      if (saved !== null) return saved === 'true';
    }
    if (typeof window !== 'undefined' && window.innerWidth < 640 && storageKey && sessionStorage.getItem(`sec_${storageKey}`) === null) {
      return false;
    }
    return defaultAperto;
  });

  useEffect(() => {
    if (storageKey) {
      sessionStorage.setItem(`sec_${storageKey}`, aperto.toString());
    }
  }, [aperto, storageKey]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs transition overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-expanded={aperto}
        className="w-full px-4 py-3 min-h-[44px] flex items-center justify-between font-bold text-slate-800 text-sm hover:bg-slate-50 transition select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-[#006874] shrink-0">{icon}</span>}
          <span className="truncate">{titolo}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-[#006874] shrink-0">
              {badge}
            </span>
          )}
          {!aperto && riepilogoChiuso && (
            <span className="text-xs text-slate-400 font-normal truncate hidden sm:inline">
              · {riepilogoChiuso}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-slate-400">
          {!aperto && riepilogoChiuso && (
            <span className="text-xs text-slate-400 font-normal sm:hidden">
              {riepilogoChiuso}
            </span>
          )}
          {aperto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {aperto && (
        <div className="p-4 pt-0 border-t border-slate-100 space-y-3 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};
