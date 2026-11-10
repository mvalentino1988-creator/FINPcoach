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

const inputCompatto =
  'h-9 px-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-0 max-w-3xl w-full shadow-float border border-outline-variant max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
              <Trophy size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-tight">
                Importa Tempi di Gara
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Verifica, seleziona e correggi i tempi rilevati prima dell'importazione.
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="ds-btn-icon shrink-0" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: mode toggle */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-surface-container-low rounded-full">
            <button
              type="button"
              onClick={() => setModoTesto(false)}
              className={`px-3.5 h-9 rounded-full text-xs font-bold transition ${!modoTesto ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Tabella Tempi Rilevati ({righe.length})
            </button>
            <button
              type="button"
              onClick={() => setModoTesto(true)}
              className={`px-3.5 h-9 rounded-full text-xs font-bold transition ${modoTesto ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Testo OCR Grezzo
            </button>
          </div>
          {modoTesto && (
            <button
              type="button"
              onClick={handleRicalcolaDaTesto}
              className="ds-btn-secondary !min-h-[36px] !px-3 !py-1.5 text-xs"
            >
              Ricalcola Tabella da Testo
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4 space-y-3 min-h-0">
          {modoTesto ? (
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="ds-input !h-auto min-h-[16rem] p-3 font-mono text-xs resize-none"
            />
          ) : (
            righe.length === 0 ? (
              <div className="ds-card-flat text-center py-12 text-on-surface-variant text-xs">
                Nessun tempo rilevato automaticamente. Prova a passare a "Testo OCR Grezzo" per correggerlo.
              </div>
            ) : (
              <div className="space-y-2">
                {righe.map((r) => (
                  <div key={r.id} className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center gap-3 text-xs ${r.selezionato ? 'bg-primary-fixed/15 border-primary/40' : 'bg-surface-container-low border-outline-variant opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.selezionato}
                        onChange={(e) => handleAggiornaRiga(r.id, 'selezionato', e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <input
                        type="text"
                        value={r.data}
                        onChange={(e) => handleAggiornaRiga(r.id, 'data', e.target.value)}
                        className={`${inputCompatto} w-24 text-center font-semibold`}
                        placeholder="Data"
                      />
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={r.luogo}
                        onChange={(e) => handleAggiornaRiga(r.id, 'luogo', e.target.value)}
                        className={inputCompatto}
                        placeholder="Luogo / Gara"
                      />

                      <select
                        value={r.stile}
                        onChange={(e) => handleAggiornaRiga(r.id, 'stile', e.target.value)}
                        className={inputCompatto}
                      >
                        {STILI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={r.distanzaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'distanzaMetri', parseInt(e.target.value) || 100)}
                          className={`${inputCompatto} w-16 text-center font-bold`}
                        />
                        <span className="text-on-surface-variant font-bold">m</span>
                        <select
                          value={r.vascaMetri}
                          onChange={(e) => handleAggiornaRiga(r.id, 'vascaMetri', parseInt(e.target.value))}
                          className={`${inputCompatto} !w-auto px-2 font-bold`}
                        >
                          <option value={25}>25m</option>
                          <option value={50}>50m</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={r.tempoTesto}
                          onChange={(e) => handleAggiornaRiga(r.id, 'tempoTesto', e.target.value)}
                          className={`${inputCompatto} flex-1 text-center font-bold text-primary`}
                          placeholder="Tempo"
                        />
                        <button
                          type="button"
                          onClick={() => handleEliminaRiga(r.id)}
                          aria-label="Elimina riga"
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-lg transition"
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

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-5 py-4 border-t border-outline-variant bg-surface-container-low shrink-0">
          <button
            type="button"
            onClick={handleConferma}
            className="ds-btn-primary flex-1"
          >
            <Check size={16} />
            <span>Importa Tempi Selezionati ({righe.filter(r => r.selezionato).length})</span>
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
