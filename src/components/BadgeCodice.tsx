import React, { useState } from 'react';
import { CodiceAllenamentoKey } from '../types';
import { CODICI_ALLENAMENTO } from '../domain/codici';
import { Info, X } from 'lucide-react';

interface Props {
  codice: CodiceAllenamentoKey;
  className?: string;
}

const TONE: Record<CodiceAllenamentoKey, string> = {
  A1: 'bg-tertiary-container/30 text-tertiary border-tertiary/30',
  A2: 'bg-primary-container/30 text-primary border-primary/30',
  B1: 'bg-secondary-container/40 text-secondary border-secondary/30',
  B2: 'bg-secondary-container/40 text-secondary border-secondary/30',
  C1: 'bg-error-container/40 text-error border-error/30',
  C2: 'bg-error-container/40 text-error border-error/30',
  C3: 'bg-error-container/40 text-error border-error/30',
  D: 'bg-tertiary-container/30 text-tertiary border-tertiary/30',
};

export const BadgeCodice: React.FC<Props> = ({ codice, className = '' }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const info = CODICI_ALLENAMENTO[codice];
  if (!info) return null;
  const tone = TONE[codice] ?? TONE.A1;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center px-3.5 min-h-[44px] rounded-full border font-label-caps text-label-caps uppercase tracking-wider transition hover:opacity-90 hover:shadow-md active:scale-[0.97] shadow-sm ${tone} ${className}`}
        title="Clicca per info fisiologiche sul codice"
        aria-label={`Codice allenamento ${info.codice}: ${info.nome}. Tocca per i dettagli fisiologici.`}
      >
        <span>{info.codice}</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl border border-outline-variant border-b-0 sm:border-b shadow-float p-5 w-full sm:max-w-sm sm:w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`px-3 py-1 rounded-full border font-label-caps text-label-caps uppercase shrink-0 ${tone}`}
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
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5">
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
              className="ds-btn-secondary w-full rounded-xl"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
