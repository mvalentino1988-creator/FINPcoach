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
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold transition hover:opacity-90 shadow-sm ${className}`}
        title="Clicca per info fisiologiche sul codice"
      >
        <span>{info.codice}</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: info.containerBg, color: info.textColor }}
                  className="px-2.5 py-1 rounded-lg text-sm font-black"
                >
                  {info.codice}
                </span>
                <h3 className="font-bold text-slate-800 text-base">{info.nome}</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600">
              <p className="text-slate-700">{info.ambito}</p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Frequenza Cardiaca:</span>
                  <span className="font-semibold text-slate-800">{info.hrBpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Lattato Ematico:</span>
                  <span className="font-semibold text-slate-800">{info.lattato}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 rounded-xl text-sm transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
