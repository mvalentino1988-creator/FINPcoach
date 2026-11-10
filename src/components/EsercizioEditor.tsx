import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, Star, Clock } from 'lucide-react';
import { GestioneTemplate, Esercizio, EsercizioTemplate } from '../domain/gestioneTemplate';

interface EsercizioEditorProps {
  onSalva: (testo: string, metriTotali: number) => void;
  onAnnulla: () => void;
}

const DISTANZE = [25, 50, 100, 200, 400, 800, 1500];
const STILI = ['Stile libero', 'Dorso', 'Rana', 'Farfalla', 'Misti', 'Gambe', 'Sciolti', 'Nessuno'];
const ATTREZZI = ['Pinne', 'Snorkel', 'Pull buoy', 'Palette', 'Tempo trainer'];

const inputCls = 'w-full px-3 h-11 text-sm border border-outline-variant/60 bg-surface-container-low rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';
const labelCls = 'block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1';

export const EsercizioEditor: React.FC<EsercizioEditorProps> = ({ onSalva, onAnnulla }) => {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [template, setTemplate] = useState<EsercizioTemplate[]>([]);
  const [mostraTemplate, setMostraTemplate] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState('');
  const [salvaComeTemplate, setSalvaComeTemplate] = useState<number | null>(null);

  useEffect(() => {
    setTemplate(GestioneTemplate.getTemplate());
  }, []);

  const aggiungiEsercizio = () => {
    const nuovo: Esercizio = {
      id: Date.now().toString(),
      distanza: 50,
      stile: 'Stile libero',
      ripetizioni: 1,
      attrezzi: []
    };
    setEsercizi([...esercizi, nuovo]);
  };

  const aggiungiDaTemplate = (tmpl: EsercizioTemplate) => {
    GestioneTemplate.usaTemplate(tmpl.id);
    const nuovo: Esercizio = {
      id: Date.now().toString(),
      distanza: tmpl.distanza,
      stile: tmpl.stile,
      ripetizioni: tmpl.ripetizioni,
      tempo: tmpl.tempo,
      descrizione: tmpl.descrizione,
      note: tmpl.note,
      attrezzi: [...tmpl.attrezzi]
    };
    setEsercizi([...esercizi, nuovo]);
    setMostraTemplate(false);
    setTemplate(GestioneTemplate.getTemplate());
  };

  const modificaEsercizio = (id: string, campo: keyof Esercizio, valore: any) => {
    setEsercizi(esercizi.map(es =>
      es.id === id ? { ...es, [campo]: valore } : es
    ));
  };

  const toggleAttrezzo = (id: string, attrezzo: string) => {
    setEsercizi(esercizi.map(es => {
      if (es.id !== id) return es;
      const attrezzi = es.attrezzi.includes(attrezzo)
        ? es.attrezzi.filter(a => a !== attrezzo)
        : [...es.attrezzi, attrezzo];
      return { ...es, attrezzi };
    }));
  };

  const eliminaEsercizio = (id: string) => {
    setEsercizi(esercizi.filter(es => es.id !== id));
  };

  const salvaComeTemplateClick = (index: number) => {
    if (!nomeTemplate.trim()) return;

    const es = esercizi[index];
    GestioneTemplate.aggiungiTemplate({
      nome: nomeTemplate,
      distanza: es.distanza,
      stile: es.stile,
      ripetizioni: es.ripetizioni,
      tempo: es.tempo,
      descrizione: es.descrizione,
      note: es.note,
      attrezzi: es.attrezzi
    });

    setTemplate(GestioneTemplate.getTemplate());
    setNomeTemplate('');
    setSalvaComeTemplate(null);
  };

  const handleSalva = () => {
    if (esercizi.length === 0) return;

    const testo = esercizi.map(es => GestioneTemplate.formattaEsercizio(es)).join('\n');
    const metriTotali = GestioneTemplate.calcolaMetriTotali(esercizi);

    onSalva(testo, metriTotali);
  };

  const testoGenerato = esercizi.map(es => GestioneTemplate.formattaEsercizio(es)).join('\n');
  const metriTotali = GestioneTemplate.calcolaMetriTotali(esercizi);

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="truncate">Editor Allenamento Strutturato</span>
        </h3>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMostraTemplate(!mostraTemplate)}
            className={`flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-label-caps font-bold transition ${
              mostraTemplate
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Star size={14} />
            Template
          </button>
          <button
            type="button"
            onClick={aggiungiEsercizio}
            className="flex items-center gap-1.5 px-3 h-10 bg-primary-container text-on-primary-container rounded-full text-xs font-label-caps font-bold hover:bg-primary transition shadow-sm active:scale-95"
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>
      </div>

      {/* Template */}
      {mostraTemplate && (
        <div className="mb-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">Template salvati</h4>
          {template.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Nessun template salvato</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {template.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/50 hover:border-primary/40 cursor-pointer transition active:scale-[0.99]"
                  onClick={() => aggiungiDaTemplate(tmpl)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-body-bold text-body-bold text-on-surface text-sm truncate">{tmpl.nome}</div>
                    <div className="font-label-caps text-[10px] text-on-surface-variant normal-case tracking-normal truncate">{GestioneTemplate.formattaEsercizio(tmpl)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      GestioneTemplate.eliminaTemplate(tmpl.id);
                      setTemplate(GestioneTemplate.getTemplate());
                    }}
                    className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/50 transition shrink-0"
                    aria-label="Elimina template"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista esercizi */}
      {esercizi.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center mx-auto mb-2">
            <Plus size={18} className="text-outline" />
          </div>
          <p className="text-sm font-semibold text-on-surface">Nessun esercizio aggiunto</p>
          <p className="text-xs mt-1">Clicca "Aggiungi" per iniziare</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {esercizi.map((es, idx) => (
            <div key={es.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                  Esercizio {idx + 1}
                </span>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setSalvaComeTemplate(salvaComeTemplate === idx ? null : idx)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                      salvaComeTemplate === idx ? 'text-primary bg-primary-fixed/40' : 'text-on-surface-variant hover:text-primary hover:bg-primary-fixed/30'
                    }`}
                    title="Salva come template"
                    aria-label="Salva come template"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminaEsercizio(es.id)}
                    className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/50 transition"
                    aria-label="Elimina esercizio"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Salva come template */}
              {salvaComeTemplate === idx && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nomeTemplate}
                    onChange={(e) => setNomeTemplate(e.target.value)}
                    placeholder="Nome template..."
                    className="flex-1 px-3 h-10 text-xs border border-outline-variant/60 rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => salvaComeTemplateClick(idx)}
                    className="px-3 h-10 bg-primary-container text-on-primary-container text-xs font-bold rounded-full hover:bg-primary transition active:scale-95"
                  >
                    Salva
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Distanza */}
                <div>
                  <label className={labelCls}>Distanza</label>
                  <div className="relative">
                    <select
                      value={es.distanza}
                      onChange={(e) => modificaEsercizio(es.id, 'distanza', parseInt(e.target.value))}
                      className={`${inputCls} appearance-none pr-8 font-semibold`}
                    >
                      {DISTANZE.map(d => (
                        <option key={d} value={d}>{d}m</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                {/* Stile */}
                <div>
                  <label className={labelCls}>Stile</label>
                  <div className="relative">
                    <select
                      value={es.stile}
                      onChange={(e) => modificaEsercizio(es.id, 'stile', e.target.value)}
                      className={`${inputCls} appearance-none pr-8 font-semibold`}
                    >
                      {STILI.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Ripetizioni */}
              <div>
                <label className={labelCls}>Ripetizioni</label>
                <input
                  type="number"
                  min="1"
                  value={es.ripetizioni}
                  onChange={(e) => modificaEsercizio(es.id, 'ripetizioni', parseInt(e.target.value) || 1)}
                  className={`${inputCls} font-bold tabular-nums`}
                />
              </div>

              {/* Tempo */}
              <div>
                <label className={labelCls}>Tempo (es. 1'30")</label>
                <input
                  type="text"
                  value={es.tempo || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'tempo', e.target.value)}
                  placeholder="es. 1'30&quot;"
                  className={`${inputCls} font-bold tabular-nums`}
                />
              </div>

              {/* Attrezzi */}
              <div>
                <label className={labelCls}>Attrezzi</label>
                <div className="flex flex-wrap gap-1">
                  {ATTREZZI.map(att => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => toggleAttrezzo(es.id, att)}
                      className={`px-2.5 py-1 min-h-[32px] rounded-full font-label-caps text-[10px] font-bold transition ${
                        es.attrezzi.includes(att)
                          ? 'bg-primary-container text-on-primary-container shadow-sm'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {att}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <label className={labelCls}>Descrizione</label>
                <input
                  type="text"
                  value={es.descrizione || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'descrizione', e.target.value)}
                  placeholder="es. 3 movimenti forti"
                  className={inputCls}
                />
              </div>

              {/* Note */}
              <div>
                <label className={labelCls}>Note</label>
                <input
                  type="text"
                  value={es.note || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'note', e.target.value)}
                  placeholder="es. focus tecnico"
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {esercizi.length > 0 && (
        <div className="mb-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-1.5">
              <Clock size={12} /> Preview
            </span>
            <span className="font-stat-timer-mobile text-[18px] text-primary tabular-nums leading-none">{metriTotali.toLocaleString('it-IT')} <span className="font-label-caps text-[10px]">m</span></span>
          </div>
          <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono leading-relaxed">
            {testoGenerato}
          </pre>
        </div>
      )}

      {/* Pulsanti azione */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSalva}
          disabled={esercizi.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 h-12 bg-primary-container text-on-primary-container rounded-xl text-sm font-headline-sm font-bold hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed shadow-card active:scale-[0.99]"
        >
          <Save size={16} />
          Salva Allenamento
        </button>
        <button
          type="button"
          onClick={onAnnulla}
          className="flex items-center justify-center gap-1.5 px-4 h-12 bg-surface-container text-on-surface-variant rounded-xl text-sm font-headline-sm font-bold hover:bg-surface-container-high hover:text-on-surface transition active:scale-[0.99]"
        >
          <X size={16} />
          Annulla
        </button>
      </div>
    </div>
  );
};
