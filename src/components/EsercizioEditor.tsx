import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, Star, Clock, Edit2 } from 'lucide-react';
import { GestioneTemplate, Esercizio, EsercizioTemplate } from '../domain/gestioneTemplate';

interface EsercizioEditorProps {
  onSalva: (testo: string, metriTotali: number) => void;
  onAnnulla: () => void;
}

const DISTANZE = [25, 50, 100, 200, 400, 800, 1500];
const STILI = ['Stile libero', 'Dorso', 'Rana', 'Farfalla', 'Misti', 'Gambe', 'Sciolti', 'Nessuno'];
const ATTREZZI = ['Pinne', 'Snorkel', 'Pull buoy', 'Palette', 'Tempo trainer'];

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-on-surface flex items-center gap-2">
          <Edit2 size={18} className="text-primary-container" />
          Editor Allenamento Strutturato
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMostraTemplate(!mostraTemplate)}
            className="flex items-center gap-1.5 px-3 h-12 bg-surface-container text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container-high transition"
          >
            <Star size={14} />
            Template
          </button>
          <button
            type="button"
            onClick={aggiungiEsercizio}
            className="flex items-center gap-1.5 px-3 h-12 bg-primary-container text-on-primary rounded-lg text-xs font-semibold hover:bg-primary transition"
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>
      </div>

      {/* Template */}
      {mostraTemplate && (
        <div className="mb-4 p-3 bg-surface-container-low rounded-lg border border-slate-200/70">
          <h4 className="font-semibold text-on-surface text-sm mb-2">Template salvati</h4>
          {template.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Nessun template salvato</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {template.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between p-2 bg-surface-container-lowest rounded border border-slate-200/70 hover:border-primary-container cursor-pointer transition"
                  onClick={() => aggiungiDaTemplate(tmpl)}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-on-surface text-sm">{tmpl.nome}</div>
                    <div className="text-xs text-on-surface-variant">{GestioneTemplate.formattaEsercizio(tmpl)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      GestioneTemplate.eliminaTemplate(tmpl.id);
                      setTemplate(GestioneTemplate.getTemplate());
                    }}
                    className="p-1 text-on-surface-variant hover:text-error transition"
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
          <p className="text-sm">Nessun esercizio aggiunto</p>
          <p className="text-xs mt-1">Clicca "Aggiungi" per iniziare</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {esercizi.map((es, idx) => (
            <div key={es.id} className="p-3 bg-surface-container-low rounded-lg border border-slate-200/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-on-surface-variant">Esercizio {idx + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSalvaComeTemplate(salvaComeTemplate === idx ? null : idx)}
                    className="p-1 text-on-surface-variant hover:text-primary-container transition"
                    title="Salva come template"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminaEsercizio(es.id)}
                    className="p-1 text-on-surface-variant hover:text-error transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Salva come template */}
              {salvaComeTemplate === idx && (
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={nomeTemplate}
                    onChange={(e) => setNomeTemplate(e.target.value)}
                    placeholder="Nome template..."
                    className="flex-1 px-2 py-1 text-xs border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => salvaComeTemplateClick(idx)}
                    className="px-2 py-1 bg-primary-container text-on-primary text-xs rounded hover:bg-primary transition"
                  >
                    Salva
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Distanza */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Distanza</label>
                  <div className="relative">
                    <select
                      value={es.distanza}
                      onChange={(e) => modificaEsercizio(es.id, 'distanza', parseInt(e.target.value))}
                      className="w-full px-2 h-12 text-sm border border-outline-variant rounded appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {DISTANZE.map(d => (
                        <option key={d} value={d}>{d}m</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                {/* Stile */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Stile</label>
                  <div className="relative">
                    <select
                      value={es.stile}
                      onChange={(e) => modificaEsercizio(es.id, 'stile', e.target.value)}
                      className="w-full px-2 h-12 text-sm border border-outline-variant rounded appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STILI.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Ripetizioni */}
              <div className="mb-2">
                <label className="block text-xs font-semibold text-on-surface mb-1">Ripetizioni</label>
                <input
                  type="number"
                  min="1"
                  value={es.ripetizioni}
                  onChange={(e) => modificaEsercizio(es.id, 'ripetizioni', parseInt(e.target.value) || 1)}
                  className="w-full px-2 h-12 text-sm border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Tempo */}
              <div className="mb-2">
                <label className="block text-xs font-semibold text-on-surface mb-1">Tempo (es. 1'30")</label>
                <input
                  type="text"
                  value={es.tempo || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'tempo', e.target.value)}
                  placeholder="es. 1'30&quot;"
                  className="w-full px-2 h-12 text-sm border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Attrezzi */}
              <div className="mb-2">
                <label className="block text-xs font-semibold text-on-surface mb-1">Attrezzi</label>
                <div className="flex flex-wrap gap-1">
                  {ATTREZZI.map(att => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => toggleAttrezzo(es.id, att)}
                      className={`px-2 py-1 text-xs rounded transition ${
                        es.attrezzi.includes(att)
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      {att}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrizione */}
              <div className="mb-2">
                <label className="block text-xs font-semibold text-on-surface mb-1">Descrizione</label>
                <input
                  type="text"
                  value={es.descrizione || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'descrizione', e.target.value)}
                  placeholder="es. 3 movimenti forti"
                  className="w-full px-2 h-12 text-sm border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Note</label>
                <input
                  type="text"
                  value={es.note || ''}
                  onChange={(e) => modificaEsercizio(es.id, 'note', e.target.value)}
                  placeholder="es. focus tecnico"
                  className="w-full px-2 h-12 text-sm border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {esercizi.length > 0 && (
        <div className="mb-4 p-3 bg-surface-container-low rounded-lg border border-slate-200/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-on-surface">Preview</span>
            <span className="text-xs font-bold text-primary-container">{metriTotali}m</span>
          </div>
          <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono">
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
          className="flex-1 flex items-center justify-center gap-1.5 px-4 h-12 bg-primary-container text-on-primary rounded-lg text-sm font-semibold hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          Salva Allenamento
        </button>
        <button
          type="button"
          onClick={onAnnulla}
          className="flex items-center justify-center gap-1.5 px-4 h-12 bg-surface-container text-on-surface rounded-lg text-sm font-semibold hover:bg-surface-container-high transition"
        >
          <X size={16} />
          Annulla
        </button>
      </div>
    </div>
  );
};
