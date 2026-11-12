import React from 'react';
import { Avviso } from '../types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Badge } from './ui';

const SEVERITA_BADGE = {
  ERRORE: { label: 'Errore', variant: 'coral' as const },
  ATTENZIONE: { label: 'Attenzione', variant: 'tertiary' as const },
  INFO: { label: 'Info', variant: 'blue' as const },
};

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
        let cls = 'bg-secondary-fixed border-secondary-fixed-dim';
        let iconCls = 'bg-secondary-container text-on-secondary-container';
        let icon = <Info size={15} className="shrink-0" />;

        if (a.gravita === 'ERRORE') {
          cls = 'bg-error-container/70 border-error/25';
          iconCls = 'bg-error/10 text-error';
          icon = <AlertCircle size={15} className="shrink-0" />;
        } else if (a.gravita === 'ATTENZIONE') {
          cls = 'bg-tertiary-fixed border-tertiary-fixed-dim';
          iconCls = 'bg-tertiary-container text-on-tertiary-container';
          icon = <AlertTriangle size={15} className="shrink-0" />;
        }

        const sev = SEVERITA_BADGE[a.gravita] ?? SEVERITA_BADGE.INFO;

        return (
          <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 shadow-sm ${cls}`}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconCls}`}>
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant={sev.variant} size="sm" className="mb-1">{sev.label}</Badge>
              <div className="font-body-base text-body-base leading-snug text-on-surface">{a.messaggio}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
