import React, { useState } from 'react';
import { Atleta, Tempo, Stile } from '../types';
import { todayISO, formattaData } from '../domain/dateUtils';
import { parseTempo, formattaTempo } from '../domain/tempoUtils';
import { Timer, X, Check, Award, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-on-surface">
      <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shadow-primary-sm">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base">Test di Calibrazione</h3>
              <p className="text-xs text-on-surface-variant">{atleta.cognome} {atleta.nome} (S{classeS})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container">
            <X size={20} />
          </button>
        </div>

        <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 space-y-1.5">
          <div className="font-headline font-bold text-xs text-primary flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>{testInfo.titolo}</span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">{testInfo.descrizione}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold block mb-1">Tipologia Vasca</label>
            <div className="flex gap-2">
              {[25, 50].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVasca(v)}
                  className={`flex-1 py-2 rounded-xl font-headline font-bold transition ${vasca === v ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container text-on-surface'}`}
                >
                  Vasca {v}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">Tempo Rilevato nel Test (mm:ss.cc o ss.cc) *</label>
            <input
              type="text"
              value={tempoInput}
              onChange={e => setTempoInput(e.target.value)}
              placeholder="es. 1:12.45 o 29.10"
              className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-sm font-bold text-primary focus:border-primary focus:outline-none"
              autoFocus
            />
            {centesimi && (
              <div className="text-[11px] text-success font-bold mt-1">
                Tempo valido riconosciuto: {formattaTempo(centesimi)}
              </div>
            )}
          </div>

          <div>
            <label className="font-bold block mb-1">Note / Osservazioni</label>
            <input
              type="text"
              value={notaTest}
              onChange={e => setNotaTest(e.target.value)}
              className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-outline-variant/60">
            <button
              type="submit"
              disabled={!centesimi}
              className="ds-btn-primary flex-1 justify-center py-3 disabled:opacity-50"
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
  );
};
