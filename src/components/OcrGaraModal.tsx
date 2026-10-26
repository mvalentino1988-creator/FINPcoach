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
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl p-4 sm:p-6 max-w-3xl w-full shadow-float space-y-4 border border-slate-200/70 max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary-container flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Importa Tempi di Gara da Screenshot</h3>
              <p className="text-xs text-on-surface-variant">Verifica, seleziona e correggi i tempi rilevati prima dell'importazione.</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModoTesto(false)}
              className={`px-3 h-12 rounded-lg text-xs font-bold transition ${!modoTesto ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface'}`}
            >
              Tabella Tempi Rilevati ({righe.length})
            </button>
            <button
              type="button"
              onClick={() => setModoTesto(true)}
              className={`px-3 h-12 rounded-lg text-xs font-bold transition ${modoTesto ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface'}`}
            >
              Testo OCR Grezzo
            </button>
          </div>
          {modoTesto && (
            <button
              type="button"
              onClick={handleRicalcolaDaTesto}
              className="px-3 h-12 bg-surface-container-low text-primary-container rounded-lg text-xs font-bold hover:bg-primary-fixed transition"
            >
              Ricalcola Tabella da Testo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {modoTesto ? (
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full h-64 p-3 border border-outline-variant rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            righe.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-xs">
                Nessun tempo rilevato automaticamente. Prova a passare a "Testo OCR Grezzo" per correggerlo.
              </div>
            ) : (
              <div className="space-y-2">
                {righe.map((r) => (
                  <div key={r.id} className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center gap-2 text-xs ${r.selezionato ? 'bg-surface-container-low/40 border-primary-fixed-dim' : 'bg-surface-container-low border-slate-200/70 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.selezionato}
                        onChange={(e) => handleAggiornaRiga(r.id, 'selezionato', e.target.checked)}
                        className="w-4 h-4 rounded text-primary-container"
                      />
                      <input
                        type="text"
                        value={r.data}
                        onChange={(e) => handleAggiornaRiga(r.id, 'data', e.target.value)}
                        className="w-24 px-2 py-1 border border-outline-variant rounded font-semibold text-center"
                        placeholder="Data"
                      />
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={r.luogo}
                        onChange={(e) => handleAggiornaRiga(r.id, 'luogo', e.target.value)}
                        className="px-2 py-1 border border-outline-variant rounded font-medium"
                        placeholder="Luogo / Gara"
                      />

                      <select
                        value={r.stile}
                        onChange={(e) => handleAggiornaRiga(r.id, 'stile', e.target.value)}
                        className="px-2 py-1 border border-outline-variant rounded font-medium"
                      >
                        {STILI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={r.distanzaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'distanzaMetri', parseInt(e.target.value) || 100)}
                          className="w-16 px-2 py-1 border border-outline-variant rounded font-bold text-center"
                        />
                        <span className="text-on-surface-variant font-bold">m</span>
                        <select
                          value={r.vascaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'vascaMetri', parseInt(e.target.value))}
                          className="px-1.5 py-1 border border-outline-variant rounded font-bold"
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
                          className="flex-1 px-2 py-1 border border-outline-variant rounded font-bold text-primary-container text-center"
                          placeholder="Tempo"
                        />
                        <button
                          type="button"
                          onClick={() => handleEliminaRiga(r.id)}
                          className="p-1 text-on-surface-variant hover:text-error transition"
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

        <div className="flex gap-2 pt-3 border-t border-slate-200/70 shrink-0">
          <button
            type="button"
            onClick={handleConferma}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 h-12 bg-primary-container hover:bg-primary text-on-primary rounded-xl text-sm font-bold transition shadow-card"
          >
            <Check size={16} />
            <span>Importa Tempi Selezionati ({righe.filter(r => r.selezionato).length})</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-sm font-bold transition"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
