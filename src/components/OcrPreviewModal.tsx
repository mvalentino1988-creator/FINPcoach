import React, { useState } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { ParserScheda } from '../domain/parserScheda';

interface Props {
  isOpen: boolean;
  initialText: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

export const OcrPreviewModal: React.FC<Props> = ({ isOpen, initialText, onConfirm, onCancel }) => {
  const [text, setText] = useState(initialText);

  // Sincronizza lo stato quando initialText cambia
  React.useEffect(() => {
    setText(initialText);
  }, [initialText]);

  if (!isOpen) return null;

  const metriStimati = ParserScheda.calcolaMetriDaTesto(text);
  const serieParsed = ParserScheda.parseSerie(text);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-0 max-w-lg w-full shadow-float border border-outline-variant max-h-[92dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-tight">
                Anteprima OCR
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Verifica e correggi il testo riconosciuto prima di confermare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Chiudi anteprima OCR"
            className="ds-btn-icon shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <label className="ds-label block">
              Testo Estratto (Modificabile)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="ds-input !h-auto min-h-[10rem] p-3 font-mono text-xs resize-none"
            />
          </div>

          {/* Live Parsed Preview */}
          <div className="p-3 bg-surface-container-low border border-outline-variant rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface-variant">Volume Totale Calcolato:</span>
              <span className="ds-chip-blue !min-h-0 !py-0.5">{metriStimati} m</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5">
              {serieParsed.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant">
                  <span className="font-medium text-on-surface">{s.descrizione}</span>
                  <span className="font-bold text-primary">{s.metriTotali}m ({s.codice})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-5 py-4 border-t border-outline-variant bg-surface-container-low shrink-0">
          <button
            type="button"
            onClick={() => onConfirm(text)}
            className="ds-btn-primary flex-1"
          >
            <Check size={16} />
            <span>Conferma e Inserisci</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ds-btn-secondary"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
