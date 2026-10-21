import React, { useState } from 'react';
import { CodiceAllenamentoKey } from '../types';
import { CODICI_ALLENAMENTO } from '../domain/codici';
import { Info, X } from 'lucide-react';

interface Props {
  codice: CodiceAllenamentoKey;
  className?: string;
}

export const BadgeCodice: React.FC<Props> = ({ codice, className = '' }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const info = CODICI_ALLENAMENTO[codice];
  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        style={{ backgroundColor: info.containerBg, color: info.textColor }}
        className={`inline-flex items-center px-3 min-h-[36px] rounded-full font-label-caps text-label-caps uppercase tracking-wider transition hover:opacity-90 shadow-card ${className}`}
        title="Clicca per info fisiologiche sul codice"
        aria-label={`Codice allenamento ${info.codice}: ${info.nome}. Tocca per i dettagli fisiologici.`}
      >
        <span>{info.codice}</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-inverse-surface/50 backdrop-blur-[2px]">
          <div className="ds-sheet sm:rounded-xl sm:max-w-sm sm:w-full sm:shadow-float p-5 sm:p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{ backgroundColor: info.containerBg, color: info.textColor }}
                  className="px-2.5 py-1 rounded-full font-label-caps text-label-caps uppercase shrink-0"
                >
                  {info.codice}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {info.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Chiudi"
                className="w-12 h-12 -mr-2 -mt-2 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="font-body-base text-body-base text-on-surface-variant">{info.ambito}</p>
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1.5">
                <div className="flex justify-between gap-3">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Frequenza cardiaca
                  </span>
                  <span className="font-body-bold text-body-bold text-on-surface">{info.hrBpm}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Lattato ematico
                  </span>
                  <span className="font-body-bold text-body-bold text-on-surface">{info.lattato}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="ds-btn-secondary w-full"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
