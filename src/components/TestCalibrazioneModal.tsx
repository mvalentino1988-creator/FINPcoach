import React, { useState } from 'react';
import { Timer, X, Check, Award, Sparkles } from 'lucide-react';
import { Atleta, Tempo, Stile } from '../types';
import { todayISO, formattaData } from '../domain/dateUtils';
import { parseTempo, formattaTempo } from '../domain/tempoUtils';

interface Props {
  atleta: Atleta;
  onClose: () => void;
  onSalvaTempo: (tempo: Omit<Tempo, 'id'>) => void;
}

export const TestCalibrazioneModal: React.FC<Props> = ({ atleta, onClose, onSalvaTempo }) => {
  const classeS = atleta.classeS ?? 9;

  const testInfo = React.useMemo(() => {
    if (classeS <= 4) {
      return {
        titolo: 'Test 3 x 50m B1 (Partenza dall\'acqua)',
        distanza: 50,
        stile: 'STILE_LIBERO' as Stile,
        descrizione: 'Ideale per classi S1-S4: controllo della spinta e della ripartenza breve a soglia B1.'
      };
    } else if (classeS >= 11 && classeS <= 13) {
      return {
        titolo: 'Test 3 x 100m B1 (Con assistenza tapper)',
        distanza: 100,
        stile: 'STILE_LIBERO' as Stile,
        descrizione: 'Ideale per classi ipovedenti S11-S13: calibrazione soglia B1 con segnalazione virata.'
      };
    } else if (classeS === 14) {
      return {
        titolo: 'Test T30 (30 minuti continui) o 4 x 100m B1',
        distanza: 100,
        stile: 'STILE_LIBERO' as Stile,
        descrizione: 'Ideale per classe S14: stima della Critical Swim Speed (CSS) su sforzo prolungato.'
      };
    }
    return {
      titolo: 'Test 3 x 100m B1 (Passo costante)',
      distanza: 100,
      stile: 'STILE_LIBERO' as Stile,
      descrizione: 'Test standard per calibrazione soglia B1 e ritmi di ripartenza personalizzati.'
    };
  }, [classeS]);

  const [tempoInput, setTempoInput] = useState('');
  const [vasca, setVasca] = useState<number>(25);
  const [notaTest, setNotaTest] = useState(`Test di calibrazione ${testInfo.titolo}`);

  const centesimi = parseTempo(tempoInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!centesimi) return;
    onSalvaTempo({
      atletaId: atleta.id,
      data: todayISO(),
      stile: testInfo.stile,
      distanzaMetri: testInfo.distanza,
      centesimi,
      contesto: 'TEST',
      vascaMetri: vasca,
      note: notaTest
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in text-on-surface">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-0 max-w-md w-full shadow-float border border-outline-variant space-y-0 flex flex-col max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 min-h-[40px] rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-tight">
                Test di Calibrazione
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {atleta.cognome} {atleta.nome} (S{classeS})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ds-btn-icon shrink-0" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info test */}
          <div className="p-3.5 bg-primary-fixed/50 border border-primary-fixed-dim rounded-xl space-y-1.5">
            <div className="font-headline font-bold text-xs text-on-primary-fixed-variant flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>{testInfo.titolo}</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">{testInfo.descrizione}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="ds-label block mb-1.5">Tipologia Vasca</label>
              <div className="grid grid-cols-2 gap-2">
                {[25, 50].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVasca(v)}
                    className={`min-h-[44px] rounded-xl font-headline font-bold text-sm border transition ${
                      vasca === v
                        ? 'bg-primary text-on-primary border-primary shadow-primary-sm'
                        : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    Vasca {v}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="ds-label block mb-1.5">Tempo Rilevato nel Test (mm:ss.cc o ss.cc) *</label>
              <input
                type="text"
                value={tempoInput}
                onChange={e => setTempoInput(e.target.value)}
                placeholder="es. 1:12.45 o 29.10"
                className="ds-input !h-12 font-mono text-sm font-bold text-primary"
                autoFocus
              />
              {centesimi && (
                <div className="ds-chip-green mt-2 !min-h-0">
                  <Check size={14} />
                  <span>Tempo valido: {formattaTempo(centesimi)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="ds-label block mb-1.5">Note / Osservazioni</label>
              <input
                type="text"
                value={notaTest}
                onChange={e => setNotaTest(e.target.value)}
                className="ds-input"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-outline-variant">
              <button
                type="submit"
                disabled={!centesimi}
                className="ds-btn-primary flex-1 disabled:opacity-50"
              >
                <Check size={16} /> Salva Risultato e Ricalcola Ritmi
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ds-btn-secondary"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
