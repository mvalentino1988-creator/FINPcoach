import React from 'react';
import { Avviso } from '../types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  avvisi: Avviso[];
}

export const ElencoAvvisi: React.FC<Props> = ({ avvisi }) => {
  if (!avvisi || avvisi.length === 0) return null;

  const sorted = [...avvisi].sort((a, b) => {
    const p = { ERRORE: 3, ATTENZIONE: 2, INFO: 1 };
    return p[b.gravita] - p[a.gravita];
  });

  return (
    <div className="space-y-2">
      {sorted.map((a, i) => {
        let bg = 'bg-blue-50 border-blue-200 text-blue-900';
        let icon = <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />;

        if (a.gravita === 'ERRORE') {
          bg = 'bg-rose-50 border-rose-200 text-rose-900';
          icon = <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />;
        } else if (a.gravita === 'ATTENZIONE') {
          bg = 'bg-amber-50 border-amber-200 text-amber-900';
          icon = <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={i}
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium leading-relaxed ${bg}`}
          >
            {icon}
            <div>{a.messaggio}</div>
          </div>
        );
      })}
    </div>
  );
};
