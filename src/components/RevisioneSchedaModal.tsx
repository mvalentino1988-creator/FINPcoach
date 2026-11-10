import React, { useEffect, useMemo, useState } from 'react';
import { ParserApprendimento, escapeRegExp } from '../domain/parserApprendimento';
import { ParserScheda } from '../domain/parserScheda';
import { Brain, Check, Sparkles, X } from 'lucide-react';

interface Props {
  open: boolean;
  testo: string;
  onClose: () => void;
  onApplica: (testoCorretto: string) => void;
}

export const RevisioneSchedaModal: React.FC<Props> = ({ open, testo, onClose, onApplica }) => {
  const [righe, setRighe] = useState<string[]>(() => testo.split('\n'));
  const [correzioni, setCorrezioni] = useState<Record<number, string>>({});
  const [imparate, setImparate] = useState<Record<number, boolean>>({});

  // Riaprendo il pannello le righe partono sempre dal testo corrente.
  useEffect(() => {
    if (!open) return;
    setRighe(testo.split('\n'));
    setCorrezioni({});
    setImparate({});
  }, [open, testo]);

  const analisi = useMemo(() => {
    try {
      ParserApprendimento.caricaRegole();
      return ParserApprendimento.parseConRegole(righe.join('\n'));
    } catch {
      return { compreso: 0, nonCompreso: [], interpretazioni: [] };
    }
  }, [righe]);

  const nonComprese = useMemo(() => new Set(analisi.nonCompreso), [analisi]);

  if (!open) return null;

  const correggiRiga = (idx: number, valore: string) => {
    setCorrezioni({ ...correzioni, [idx]: valore });
  };

  /** Il coach scrive come la riga va interpretata -> nasce una regola tipizzata. */
  const apprendi = (idx: number) => {
    const originale = righe[idx];
    const corretto = (correzioni[idx] || '').trim();
    if (!corretto) return;

    const nxm = corretto.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (nxm) {
      ParserApprendimento.aggiungiRegola({
        pattern: escapeRegExp(originale),
        tipo: 'NXM',
        descrizione: `"${originale}" → ${nxm[1]}x${nxm[2]}`,
        distanza: parseInt(nxm[2], 10),
        ripetizioni: parseInt(nxm[1], 10),
      });
    } else {
      const conUnita = corretto.match(/(\d+(?:[.,]\d+)?)\s*(km|m\b|mt\b)/i);
      if (conUnita) {
        const valore = parseFloat(conUnita[1].replace(',', '.'));
        const unita = conUnita[2].toLowerCase().startsWith('km') ? 'km' : 'm';
        const fattore = unita === 'km' ? 1000 : 1;
        ParserApprendimento.aggiungiRegola({
          pattern: escapeRegExp(originale),
          tipo: 'UNITA',
          descrizione: `"${originale}" → ${Math.round(valore * fattore)} m`,
          distanza: Math.round(valore * fattore),
          unita,
          fattoreUnita: fattore,
        });
      } else {
        const solo = corretto.match(/^(\d+)$/);
        if (solo) {
          ParserApprendimento.aggiungiRegola({
            pattern: escapeRegExp(originale),
            tipo: 'SOLO',
            descrizione: `"${originale}" → ${solo[1]} m`,
            distanza: parseInt(solo[1], 10),
          });
        }
      }
    }

    const nuoveRighe = [...righe];
    nuoveRighe[idx] = corretto;
    setRighe(nuoveRighe);
    setImparate({ ...imparate, [idx]: true });
  };

  const applicaTutto = () => {
    onApplica(righe.join('\n'));
    onClose();
  };

  const metriAttuali = ParserScheda.calcolaMetriDaTesto(righe.join('\n'));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-2xl bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl border border-outline-variant shadow-float max-h-[94dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
              <Brain size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface truncate">
                Revisione e Apprendimento Parser
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {nonComprese.size} righe da interpretare · {metriAttuali} m riconosciuti
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-btn-icon shrink-0" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {righe.map((riga, idx) => {
            if (!riga.trim()) return null;
            const nonCompreso = nonComprese.has(riga.trim());
            const suggerimento = nonCompreso ? ParserApprendimento.suggerisciInterpretazione(riga) : null;
            const serie = ParserScheda.parseSerie(riga)[0];

            return (
              <div
                key={idx}
                className={`rounded-xl border p-3 space-y-2 ${
                  nonCompreso
                    ? 'border-tertiary/40 bg-tertiary-fixed/20'
                    : 'border-outline-variant bg-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-base font-body-bold text-on-surface truncate">{riga}</span>
                  {nonCompreso ? (
                    <span className="ds-chip-tertiary shrink-0">Da correggere</span>
                  ) : (
                    <span className="ds-chip-secondary shrink-0">
                      {serie?.metriTotali ?? 0} m
                    </span>
                  )}
                </div>

                {nonCompreso && (
                  <div className="flex flex-col gap-2">
                    {suggerimento && (
                      <button
                        type="button"
                        onClick={() => {
                          const val =
                            suggerimento.tipo === 'NXM'
                              ? `${suggerimento.ripetizioni}x${suggerimento.distanza}`
                              : suggerimento.tipo === 'UNITA'
                                ? `${suggerimento.distanza}m`
                                : `${suggerimento.distanza}`;
                          correggiRiga(idx, val);
                        }}
                        className="self-start ds-btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs"
                      >
                        <Sparkles size={14} />
                        <span>{suggerimento.descrizione}</span>
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        value={correzioni[idx] || ''}
                        onChange={(e) => correggiRiga(idx, e.target.value)}
                        placeholder="es. 4x100 stile libero"
                        className="ds-input !h-11 flex-1"
                      />
                      <button type="button" onClick={() => apprendi(idx)} className="ds-btn-primary !min-h-[44px] shrink-0">
                        <Check size={16} />
                        <span>Impara</span>
                      </button>
                    </div>
                    {imparate[idx] && (
                      <span className="ds-chip-green self-start !min-h-0">
                        Regola salvata: verrà usata da ora in poi.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-outline-variant">
            <button type="button" onClick={applicaTutto} className="ds-btn-primary flex-1">
              Applica scheda corretta
            </button>
            <button type="button" onClick={onClose} className="ds-btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
