import React, { useState, useEffect } from 'react';
import { Check, X, Trophy, Trash2 } from 'lucide-react';
import { TempoEstrattoOcr, OcrGaraParser } from '../domain/ocrGaraParser';
import { Stile } from '../types';
import { parseTempo } from '../domain/tempoUtils';

interface Props {
  isOpen: boolean;
  initialRawText: string;
  onConfirm: (tempi: TempoEstrattoOcr[]) => void;
  onCancel: () => void;
}

const STILI: { key: Stile; label: string }[] = [
  { key: 'STILE_LIBERO', label: 'Stile libero' },
  { key: 'DORSO', label: 'Dorso' },
  { key: 'RANA', label: 'Rana' },
  { key: 'FARFALLA', label: 'Farfalla' },
  { key: 'MISTI', label: 'Misti' }
];

export const OcrGaraModal: React.FC<Props> = ({ isOpen, initialRawText, onConfirm, onCancel }) => {
  const [righe, setRighe] = useState<TempoEstrattoOcr[]>([]);
  const [rawText, setRawText] = useState(initialRawText);
  const [modoTesto, setModoTesto] = useState(false);

  useEffect(() => {
    setRawText(initialRawText);
    setRighe(OcrGaraParser.parseTabellaGare(initialRawText));
  }, [initialRawText]);

  if (!isOpen) return null;

  const handleAggiornaRiga = (id: string, campo: keyof TempoEstrattoOcr, valore: any) => {
    setRighe(righe.map(r => r.id === id ? { ...r, [campo]: valore } : r));
  };

  const handleEliminaRiga = (id: string) => {
    setRighe(righe.filter(r => r.id !== id));
  };

  const handleRicalcolaDaTesto = () => {
    setRighe(OcrGaraParser.parseTabellaGare(rawText));
  };

  const handleConferma = () => {
    const validi = righe.filter(r => r.selezionato).map(r => {
      const cent = parseTempo(r.tempoTesto) ?? r.centesimi;
      return { ...r, centesimi: cent };
    });
    onConfirm(validi);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-[#006874] flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Importa Tempi di Gara da Screenshot</h3>
              <p className="text-xs text-slate-500">Verifica, seleziona e correggi i tempi rilevati prima dell'importazione.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModoTesto(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${!modoTesto ? 'bg-[#006874] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Tabella Tempi Rilevati ({righe.length})
            </button>
            <button
              type="button"
              onClick={() => setModoTesto(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoTesto ? 'bg-[#006874] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Testo OCR Grezzo
            </button>
          </div>
          {modoTesto && (
            <button
              type="button"
              onClick={handleRicalcolaDaTesto}
              className="px-3 py-1.5 bg-cyan-50 text-[#006874] rounded-lg text-xs font-bold hover:bg-cyan-100 transition"
            >
              Ricalcola Tabella da Testo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-[250px]">
          {modoTesto ? (
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full h-64 p-3 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#006874]"
            />
          ) : (
            righe.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nessun tempo rilevato automaticamente. Prova a passare a "Testo OCR Grezzo" per correggerlo.
              </div>
            ) : (
              <div className="space-y-2">
                {righe.map((r) => (
                  <div key={r.id} className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center gap-2 text-xs ${r.selezionato ? 'bg-cyan-50/40 border-cyan-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.selezionato}
                        onChange={(e) => handleAggiornaRiga(r.id, 'selezionato', e.target.checked)}
                        className="w-4 h-4 rounded text-[#006874]"
                      />
                      <input
                        type="text"
                        value={r.data}
                        onChange={(e) => handleAggiornaRiga(r.id, 'data', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-semibold text-center"
                        placeholder="Data"
                      />
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={r.luogo}
                        onChange={(e) => handleAggiornaRiga(r.id, 'luogo', e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded font-medium"
                        placeholder="Luogo / Gara"
                      />

                      <select
                        value={r.stile}
                        onChange={(e) => handleAggiornaRiga(r.id, 'stile', e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded font-medium"
                      >
                        {STILI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={r.distanzaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'distanzaMetri', parseInt(e.target.value) || 100)}
                          className="w-16 px-2 py-1 border border-slate-300 rounded font-bold text-center"
                        />
                        <span className="text-slate-500 font-bold">m</span>
                        <select
                          value={r.vascaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'vascaMetri', parseInt(e.target.value))}
                          className="px-1.5 py-1 border border-slate-300 rounded font-bold"
                        >
                          <option value={25}>25m</option>
                          <option value={50}>50m</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={r.tempoTesto}
                          onChange={(e) => handleAggiornaRiga(r.id, 'tempoTesto', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded font-black text-[#006874] text-center"
                          placeholder="Tempo"
                        />
                        <button
                          type="button"
                          onClick={() => handleEliminaRiga(r.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleConferma}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#006874] hover:bg-[#005a63] text-white rounded-xl text-sm font-bold transition shadow-xs"
          >
            <Check size={16} />
            <span>Importa Tempi Selezionati ({righe.filter(r => r.selezionato).length})</span>
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
