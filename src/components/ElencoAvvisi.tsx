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
        let cls = 'ds-alert bg-secondary-fixed/50 border-l-secondary';
        let icon = <Info size={16} className="text-secondary shrink-0 mt-0.5" />;

        if (a.gravita === 'ERRORE') {
          cls = 'ds-alert alert-dysreflexia';
          icon = <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />;
        } else if (a.gravita === 'ATTENZIONE') {
          cls = 'ds-alert alert-safeguard';
          icon = <AlertTriangle size={16} className="text-tertiary-container shrink-0 mt-0.5" />;
        }

        return (
          <div key={i} className={`${cls} flex items-start gap-2.5`}>
            {icon}
            <div className="font-body-base text-body-base leading-snug">{a.messaggio}</div>
          </div>
        );
      })}
    </div>
  );
};
