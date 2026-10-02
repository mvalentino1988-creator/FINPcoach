import React from 'react';
import { CodiceAllenamentoKey } from '../types';
import { CODICI_ALLENAMENTO, CODICI_KEYS } from '../domain/codici';

interface Props {
  ripartizione: Partial<Record<CodiceAllenamentoKey, number>>;
  volumeTotale: number;
}

export const IndicatoreCodici: React.FC<Props> = ({ ripartizione, volumeTotale }) => {
  if (volumeTotale <= 0 || !ripartizione) return null;

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
        {CODICI_KEYS.map(k => {
          const metri = ripartizione[k] ?? 0;
          if (metri <= 0) return null;
          const pct = (metri / volumeTotale) * 100;
          const info = CODICI_ALLENAMENTO[k];
          return (
            <div
              key={k}
              style={{
                width: `${pct}%`,
                backgroundColor: info.textColor
              }}
              title={`${info.codice} (${info.nome}): ${metri}m (${Math.round(pct)}%)`}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
        {CODICI_KEYS.map(k => {
          const metri = ripartizione[k] ?? 0;
          if (metri <= 0) return null;
          const pct = Math.round((metri / volumeTotale) * 100);
          const info = CODICI_ALLENAMENTO[k];
          return (
            <div key={k} className="flex items-center gap-1.5 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: info.textColor }}
              />
              <span>
                {info.codice} <span className="text-slate-400 font-normal">{pct}% ({metri}m)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
