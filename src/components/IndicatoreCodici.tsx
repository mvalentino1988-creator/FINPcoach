import React from 'react';
import { CodiceAllenamentoKey } from '../types';
import { CODICI_ALLENAMENTO, CODICI_KEYS } from '../domain/codici';

interface Props {
  ripartizione: Partial<Record<CodiceAllenamentoKey, number>>;
  volumeTotale: number;
  /** Legend estesa: mostra i metri per codice (default) o solo la quota. */
  dettaglio?: boolean;
}

export const IndicatoreCodici: React.FC<Props> = ({
  ripartizione,
  volumeTotale,
  dettaglio = true,
}) => {
  if (volumeTotale <= 0 || !ripartizione) return null;

  const attivi = CODICI_KEYS.filter(k => (ripartizione[k] ?? 0) > 0);
  if (attivi.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Barra segmentata proporzionale */}
      <div
        className="h-2.5 w-full bg-surface-container rounded-full flex overflow-hidden gap-0.5"
        role="img"
        aria-label="Ripartizione fisiologica del carico"
      >
        {attivi.map(k => {
          const metri = ripartizione[k] ?? 0;
          const pct = (metri / volumeTotale) * 100;
          const info = CODICI_ALLENAMENTO[k];
          return (
            <div
              key={k}
              style={{ width: `${pct}%`, backgroundColor: info.textColor }}
              title={`${info.codice} (${info.nome}): ${metri}m (${Math.round(pct)}%)`}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {attivi.map(k => {
          const metri = ripartizione[k] ?? 0;
          const pct = Math.round((metri / volumeTotale) * 100);
          const info = CODICI_ALLENAMENTO[k];
          return (
            <div key={k} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: info.textColor }}
              />
              <span className="font-label-md text-label-md text-on-surface">
                {info.codice}
                <span className="text-on-surface-variant font-normal">
                  {dettaglio ? ` ${pct}% · ${metri}m` : ` ${pct}%`}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
