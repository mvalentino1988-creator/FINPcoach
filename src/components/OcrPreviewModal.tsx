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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-xl p-6 max-w-lg w-full shadow-float space-y-4 border border-slate-200/70">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary-container flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Anteprima OCR & Modifica</h3>
              <p className="text-xs text-on-surface-variant">Verifica e correggi il testo riconosciuto prima di confermare.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
            Testo Estratto (Modificabile)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-40 p-3 border border-outline-variant rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Live Parsed Preview */}
        <div className="p-3 bg-surface-container-low border border-slate-200/70 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-on-surface-variant">Volume Totale Calcolato:</span>
            <span className="font-bold text-primary-container text-sm">{metriStimati} m</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {serieParsed.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] bg-surface-container-lowest p-2 rounded-lg border border-slate-200/70">
                <span className="font-medium text-on-surface">{s.descrizione}</span>
                <span className="font-bold text-primary-container">{s.metriTotali}m ({s.codice})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200/70">
          <button
            type="button"
            onClick={() => onConfirm(text)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 h-12.5 bg-primary-container hover:bg-primary text-on-primary rounded-xl text-sm font-bold transition shadow-card"
          >
            <Check size={16} />
            <span>Conferma e Inserisci</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-12.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-sm font-bold transition"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
