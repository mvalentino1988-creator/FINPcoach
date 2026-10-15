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
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-[#006874] flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Anteprima OCR & Modifica</h3>
              <p className="text-xs text-slate-500">Verifica e correggi il testo riconosciuto prima di confermare.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Testo Estratto (Modificabile)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-40 p-3 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
          />
        </div>

        {/* Live Parsed Preview */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Volume Totale Calcolato:</span>
            <span className="font-black text-[#006874] text-sm">{metriStimati} m</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {serieParsed.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-medium text-slate-800">{s.descrizione}</span>
                <span className="font-bold text-[#006874]">{s.metriTotali}m ({s.codice})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onConfirm(text)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#006874] hover:bg-[#005a63] text-white rounded-xl text-sm font-bold transition shadow-xs"
          >
            <Check size={16} />
            <span>Conferma e Inserisci</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
