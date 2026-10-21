import React, { useState, useEffect } from 'react';
import { ClipboardList, Timer, CheckCircle2, Edit2, Save, X, Trash2, Calendar, Users, User, HelpCircle, ChevronLeft, ChevronRight, Layers, Camera, Loader2, RefreshCw } from 'lucide-react';
import { OcrWeb } from '../domain/ocrWeb';
import { OcrPreviewModal } from './OcrPreviewModal';
import { SchedeVascaScreen } from './SchedeVascaScreen';
import { TempiRipartenzeScreen } from './TempiRipartenzeScreen';
import { RegistroScreen } from './RegistroScreen';
import { EsercizioEditor } from './EsercizioEditor';
import { BadgeCodice } from './BadgeCodice';
import { formattaData, todayISO, parseData, addDays, isBefore, daysBetween, toDateObj } from '../domain/dateUtils';
import { useApp } from '../data/AppContext';
import { ParserScheda } from '../domain/parserScheda';
import { ParserApprendimento } from '../domain/parserApprendimento';
import { FINPStorage } from '../data/storage';
import { OcrWorkoutStandardizer } from '../domain/ocrWorkoutStandardizer';
import { Sezione } from './Sezione';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ParaSwimmingAnalyticsView } from './ParaSwimmingAnalyticsView';

type DatiTab = 'schede' | 'tempi' | 'registro' | 'biomeccanica';

type LivelloAtleta = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZATO';

type VistaSchede = 'calendario' | 'lista';

type ModalitaEditor = 'testuale' | 'strutturato';

interface CustomWorkout {
  id: string;
  data: string;
  testo: string;
  creatoIl: string;
  atletaId: number | null; // null = squadra
  metriTotali?: number; // calcolato automaticamente dal testo
}

const STORAGE_KEY = 'finpcoach_custom_workouts';

export const DatiScreen: React.FC = () => {
  const { atleti } = useApp();
  const [tab, setTab] = useState<DatiTab>('schede');
  const [editMode, setEditMode] = useState(false);
  const [modalitaEditor, setModalitaEditor] = useState<ModalitaEditor>('testuale');
  const [customWorkout, setCustomWorkout] = useState('');
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [workoutDate, setWorkoutDate] = useState<string>(formattaData(todayISO()));
  const [selectedAtletaId, setSelectedAtletaId] = useState<number | null>(null); // null = squadra
  const [vistaSchede, setVistaSchede] = useState<VistaSchede>('calendario');
  const [calendarioData, setCalendarioData] = useState<string>(formattaData(todayISO()));
  
  // Dialogo per conferma parser
  const [showDialog, setShowDialog] = useState(false);
  const [rigaNonCompresa, setRigaNonCompresa] = useState<string>('');
  const [suggerimento, setSuggerimento] = useState<ReturnType<typeof ParserApprendimento.suggerisciInterpretazione> | null>(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');

  // Carica allenamenti salvati
  useEffect(() => {
    setCustomWorkouts(FINPStorage.getCustomWorkouts());
  }, []);

  const tabs = [
    { key: 'schede' as DatiTab, label: 'Schede', icon: <ClipboardList size={16} /> },
    { key: 'tempi' as DatiTab, label: 'Tempi', icon: <Timer size={16} /> },
    { key: 'registro' as DatiTab, label: 'Registro', icon: <CheckCircle2 size={16} /> }
  ];

  const handleSave = () => {
    if (!customWorkout.trim()) return;
    salvaAllenamento();
  };

  const salvaAllenamento = () => {
    const metriTotali = ParserScheda.calcolaMetriDaTesto(customWorkout);

    const newWorkout: CustomWorkout = {
      id: Date.now().toString(),
      data: workoutDate,
      testo: customWorkout,
      creatoIl: new Date().toISOString(),
      atletaId: selectedAtletaId,
      metriTotali
    };

    const updated = [newWorkout, ...customWorkouts];
    setCustomWorkouts(updated);
    FINPStorage.saveCustomWorkouts(updated);
    
    setSelectedWorkoutId(newWorkout.id);
    setCustomWorkout('');
    setWorkoutDate(formattaData(todayISO()));
    setSelectedAtletaId(null);
    setEditMode(false);
  };

  const handleSalvaStrutturato = (testo: string, metriTotali: number) => {
    const newWorkout: CustomWorkout = {
      id: Date.now().toString(),
      data: workoutDate,
      testo,
      creatoIl: new Date().toISOString(),
      atletaId: selectedAtletaId,
      metriTotali
    };

    const updated = [newWorkout, ...customWorkouts];
    setCustomWorkouts(updated);
    FINPStorage.saveCustomWorkouts(updated);
    
    setSelectedWorkoutId(newWorkout.id);
    setWorkoutDate(formattaData(todayISO()));
    setSelectedAtletaId(null);
    setEditMode(false);
    setModalitaEditor('testuale');
  };

  const handleConfermaDialog = (conferma: boolean) => {
    if (conferma && suggerimento) {
      // Aggiungi la nuova regola al parser
      ParserApprendimento.aggiungiRegola({
        pattern: suggerimento.pattern,
        tipo: suggerimento.tipo || 'SOLO',
        descrizione: suggerimento.descrizione
      });
    }
    setShowDialog(false);
    setRigaNonCompresa('');
    setSuggerimento(null);
    
    // Riprova il salvataggio
    handleSave();
  };

  const handleDelete = (id: string) => {
    const updated = customWorkouts.filter(w => w.id !== id);
    setCustomWorkouts(updated);
    FINPStorage.saveCustomWorkouts(updated);
    if (selectedWorkoutId === id) setSelectedWorkoutId(null);
  };

  const selectedWorkout = customWorkouts.find(w => w.id === selectedWorkoutId);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => { window.location.reload(); },
    threshold: 100
  });

  return (
    <div className="space-y-4">
      {pullToRefresh.isPulling && (
        <div className="flex items-center justify-center py-2 text-xs text-on-surface-variant">
          <RefreshCw size={16} className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}
      {/* Selettore Sezione (Menu a tendina) */}
      <div className="bg-surface-container-lowest rounded-xl border border-slate-200/70 p-3 shadow-card flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0">
          Sezione Dati:
        </span>
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as DatiTab)}
          className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface text-xs"
        >
          <option value="schede">🏊‍♂️ Schede Vasca</option>
          <option value="tempi">⏱️ Tempi & Ripartenze</option>
          <option value="registro">📋 Registro Presenze & Carico</option>
          <option value="biomeccanica">📈 Analisi Biomeccanica C(v)</option>
        </select>

        {tab === 'schede' && (
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-1.5 px-3 min-h-[48px] bg-primary-container hover:bg-primary text-on-primary rounded-xl text-xs font-bold transition shrink-0 shadow-card"
          >
            {editMode ? <X size={15} /> : <Edit2 size={15} />}
            <span>{editMode ? 'Annulla' : 'Scrivi'}</span>
          </button>
        )}
      </div>

      {/* Editor Allenamento Personalizzato */}
      {tab === 'schede' && editMode && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-slate-200/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <Edit2 size={18} className="text-primary-container" />
              Scrivi l'allenamento
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setModalitaEditor('testuale')}
                className={`px-3 h-12 rounded-lg text-xs font-semibold transition ${
                  modalitaEditor === 'testuale'
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Testuale
              </button>
              <button
                type="button"
                onClick={() => setModalitaEditor('strutturato')}
                className={`px-3 h-12 rounded-lg text-xs font-semibold transition ${
                  modalitaEditor === 'strutturato'
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Strutturato
              </button>
            </div>
          </div>

          {/* Modalità testuale */}
          {modalitaEditor === 'testuale' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">Data allenamento</label>
                <input
                  type="text"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  placeholder="es. 05/10/2026"
                  className="w-full px-3 h-12 border border-outline-variant rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">Destinatario</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAtletaId(null)}
                    className={`inline-flex items-center gap-1.5 px-3 h-12 rounded-xl text-xs font-semibold transition ${
                      selectedAtletaId === null
                        ? 'bg-primary-container text-on-primary shadow-card'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Users size={14} />
                    <span>Tutta la Squadra</span>
                  </button>
                  {atleti.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAtletaId(a.id)}
                      className={`inline-flex items-center gap-1.5 px-3 h-12 rounded-xl text-xs font-semibold transition ${
                        selectedAtletaId === a.id
                          ? 'bg-primary-container text-on-primary font-bold shadow-card'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <User size={14} />
                      <span>{a.cognome} {a.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-semibold text-on-surface">Testo Allenamento / Serie</label>
                <label className="inline-flex items-center gap-1.5 px-3 h-12 bg-surface-container-low hover:bg-primary-fixed text-primary-container rounded-lg text-xs font-bold cursor-pointer transition border border-primary-fixed-dim">
                  {ocrLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  <span>{ocrLoading ? 'Lettura OCR in corso...' : 'Carica Screenshot (OCR)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={ocrLoading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setOcrLoading(true);
                      const testoOcr = await OcrWeb.riconosciTestoDaImmagine(file);
                      setOcrLoading(false);
                      if (testoOcr) {
                        setOcrRawText(testoOcr);
                        setOcrModalOpen(true);
                      }
                    }}
                  />
                </label>
              </div>
              <textarea
                value={customWorkout}
                onChange={(e) => setCustomWorkout(e.target.value)}
                placeholder="Esempio: Riscaldamento 400m stile libero A1&#10;4x100m stile libero a 1'30&quot; (ripartenza)&#10;Serie gambe 200m A1&#10;Defaticamento 200m"
                className="w-full h-48 p-3 border border-outline-variant rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {customWorkout && (
                <div className="text-xs text-on-surface-variant mt-2">
                  Metri totali calcolati: <strong className="text-primary-container">{ParserScheda.calcolaMetriDaTesto(customWorkout)} m</strong>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 h-12 bg-primary-container text-on-primary rounded-lg text-sm font-semibold hover:bg-primary transition"
                >
                  <Save size={16} />
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-4 h-12 bg-surface-container text-on-surface rounded-lg text-sm font-semibold hover:bg-surface-container-high transition"
                >
                  <X size={16} />
                  Annulla
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                L'allenamento viene salvato e mostrato al posto della scheda generata automaticamente. I metri vengono calcolati automaticamente dal testo.
              </p>
            </>
          )}

          {/* Modalità strutturata */}
          {modalitaEditor === 'strutturato' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">Data allenamento</label>
                <input
                  type="text"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  placeholder="es. 05/10/2026"
                  className="w-full px-3 h-12 border border-outline-variant rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">Destinatario</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAtletaId(null)}
                    className={`inline-flex items-center gap-1.5 px-3 h-12 rounded-xl text-xs font-semibold transition ${
                      selectedAtletaId === null
                        ? 'bg-primary-container text-on-primary shadow-card'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Users size={14} />
                    <span>Tutta la Squadra</span>
                  </button>
                  {atleti.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAtletaId(a.id)}
                      className={`inline-flex items-center gap-1.5 px-3 h-12 rounded-xl text-xs font-semibold transition ${
                        selectedAtletaId === a.id
                          ? 'bg-primary-container text-on-primary font-bold shadow-card'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <User size={14} />
                      <span>{a.cognome} {a.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
              <EsercizioEditor
                onSalva={handleSalvaStrutturato}
                onAnnulla={() => {
                  setEditMode(false);
                  setModalitaEditor('testuale');
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Lista allenamenti salvati */}
      {tab === 'schede' && !editMode && customWorkouts.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-slate-200/70">
          <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-primary-container" />
            Allenamenti salvati
          </h3>
          <div className="space-y-2">
            {customWorkouts.map(w => (
              <div
                key={w.id}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  selectedWorkoutId === w.id
                    ? 'bg-primary-container text-on-primary border-primary-container'
                    : 'bg-surface-container-low border-slate-200/70 hover:bg-surface-container'
                }`}
                onClick={() => setSelectedWorkoutId(w.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{w.data}</div>
                    <div className="text-xs opacity-75 line-clamp-1">{w.testo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(w.id);
                    }}
                    className="p-1.5 rounded hover:bg-black/10 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedWorkoutId && (
            <button
              type="button"
              onClick={() => setSelectedWorkoutId(null)}
              className="mt-3 text-xs text-primary-container font-semibold hover:underline"
            >
              ← Torna alla scheda generata automaticamente
            </button>
          )}
        </div>
      )}

      {/* Header schede con toggle vista */}
      {tab === 'schede' && !editMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVistaSchede('calendario')}
              className={`px-3 h-12 rounded-lg text-xs font-semibold transition ${
                vistaSchede === 'calendario'
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setVistaSchede('lista')}
              className={`px-3 h-12 rounded-lg text-xs font-semibold transition ${
                vistaSchede === 'lista'
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              Lista
            </button>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 h-12 bg-primary-container text-on-primary rounded-lg text-xs font-semibold hover:bg-primary transition"
          >
            <Layers size={14} />
            Nuovo Allenamento
          </button>
        </div>
      )}

      {/* Calendario */}
      {tab === 'schede' && !editMode && vistaSchede === 'calendario' && !selectedWorkout && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-slate-200/70">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                const parsed = parseData(calendarioData);
                if (parsed) {
                  setCalendarioData(formattaData(addDays(parsed, -7)));
                }
              }}
              className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center hover:bg-surface-container rounded-lg transition"
            >
              <ChevronLeft size={20} className="text-on-surface-variant" />
            </button>
            <h3 className="font-bold text-on-surface">
              {calendarioData}
            </h3>
            <button
              type="button"
              onClick={() => {
                const parsed = parseData(calendarioData);
                if (parsed) {
                  setCalendarioData(formattaData(addDays(parsed, 7)));
                }
              }}
              className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center hover:bg-surface-container rounded-lg transition"
            >
              <ChevronRight size={20} className="text-on-surface-variant" />
            </button>
          </div>
          
          {/* Grid dei giorni */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(giorno => (
              <div key={giorno} className="text-center text-xs font-semibold text-on-surface-variant h-12">
                {giorno}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const oggi = todayISO();
              const dataCalendarioISO = parseData(calendarioData);
              if (!dataCalendarioISO) return null;
              
              const dataCalendario = toDateObj(dataCalendarioISO);
              const giorni: JSX.Element[] = [];
              
              // Trova il primo lunedì del mese
              const primoGiorno = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth(), 1);
              const giornoSettimana = (primoGiorno.getDay() + 6) % 7; // 0 = lunedì
              
              // Celle vuote prima del primo giorno
              for (let i = 0; i < giornoSettimana; i++) {
                giorni.push(<div key={`empty-${i}`} className="aspect-square" />);
              }
              
              // Giorni del mese
              const giorniMese = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth() + 1, 0).getDate();
              for (let giorno = 1; giorno <= giorniMese; giorno++) {
                const dataISO = `${dataCalendario.getFullYear()}-${String(dataCalendario.getMonth() + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
                const dataFormattata = formattaData(dataISO);
                const workoutGiorno = customWorkouts.find(w => w.data === dataFormattata);
                const isOggi = dataISO === oggi;
                
                giorni.push(
                  <button
                    key={giorno}
                    type="button"
                    onClick={() => {
                      if (workoutGiorno) {
                        setSelectedWorkoutId(workoutGiorno.id);
                      }
                    }}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition ${
                      workoutGiorno 
                        ? 'bg-primary-container text-on-primary cursor-pointer hover:bg-primary' 
                        : isOggi
                        ? 'bg-surface-container-high text-on-surface'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-sm font-semibold">{giorno}</span>
                    {workoutGiorno && (
                      <span className="text-xs mt-1">
                        {workoutGiorno.metriTotali || ParserScheda.calcolaMetriDaTesto(workoutGiorno.testo)}m
                      </span>
                    )}
                  </button>
                );
              }
              
              return giorni;
            })()}
          </div>
        </div>
      )}

      {/* Lista allenamenti salvati */}
      {tab === 'schede' && !editMode && vistaSchede === 'lista' && !selectedWorkout && customWorkouts.length > 0 && (
        <Sezione titolo="Allenamenti Salvati" icon={<ClipboardList size={18} />} badge={customWorkouts.length} riepilogoChiuso={`${customWorkouts.length} schede salvate`} storageKey="dati_allenamenti_salvati" defaultAperto={false}>
          <div className="space-y-2 pt-1">
            {customWorkouts.map(workout => (
              <div
                key={workout.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-slate-200/70 hover:bg-surface-container transition cursor-pointer"
                onClick={() => setSelectedWorkoutId(workout.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-on-surface text-xs">{workout.data}</span>
                    {workout.atletaId && (
                      <span className="text-[10px] bg-primary-container text-on-primary px-2 py-0.5 rounded-full font-bold">
                        Personale
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-on-surface-variant truncate">
                    {workout.testo.split('\n')[0]}
                  </div>
                  <div className="text-xs text-primary-container font-semibold mt-1">
                    {workout.metriTotali || ParserScheda.calcolaMetriDaTesto(workout.testo)} m
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomWorkout(workout.testo);
                      setWorkoutDate(workout.data);
                      setSelectedAtletaId(workout.atletaId ?? null);
                      setEditMode(true);
                      const updated = customWorkouts.filter(w => w.id !== workout.id);
                      setCustomWorkouts(updated);
                      FINPStorage.saveCustomWorkouts(updated);
                    }}
                    className="p-2 text-on-surface-variant hover:text-primary-container transition"
                    title="Modifica allenamento"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = customWorkouts.filter(w => w.id !== workout.id);
                      setCustomWorkouts(updated);
                      FINPStorage.saveCustomWorkouts(updated);
                    }}
                    className="p-2 text-on-surface-variant hover:text-error transition"
                    title="Elimina allenamento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Sezione>
      )}

      {/* Content */}
      {!editMode && (
        <div>
          {tab === 'schede' && (
            selectedWorkout ? (
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-card border border-slate-200/70">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-on-surface text-lg">
                    Allenamento del {selectedWorkout.data}
                    {selectedWorkout.atletaId && (
                      <span className="text-sm font-normal text-on-surface-variant ml-2">
                        (Atleta specifico)
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkoutId(null)}
                    className="text-xs text-on-surface-variant hover:text-on-surface"
                  >
                    Chiudi
                  </button>
                </div>
                
                {/* Analisi della scheda */}
                {(() => {
                  const analisi = ParserScheda.analisiQualitativa(selectedWorkout.testo);
                  const serie = ParserScheda.parseSerie(selectedWorkout.testo);
                  const codiceStimato = ParserScheda.stimaCodiceDaSerie(serie);
                  
                  return (
                    <div className="space-y-3 mb-4 p-4 bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-on-surface-variant">Volume totale:</span>
                          <span className="font-bold text-primary-container ml-1">{ParserScheda.calcolaMetriDaTesto(selectedWorkout.testo)} m</span>
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Serie:</span>
                          <span className="font-bold text-on-surface ml-1">{serie.length}</span>
                        </div>
                        <div>
                          <span className="text-on-surface-variant">Codice stimato:</span>
                          <span className="font-bold text-on-surface ml-1">{codiceStimato}</span>
                        </div>
                      </div>
                      
                      {analisi.attrezzi.length > 0 && (
                        <div className="text-xs">
                          <span className="text-on-surface-variant">Attrezzi:</span>
                          <span className="text-on-surface ml-1">{analisi.attrezzi.join(', ')}</span>
                        </div>
                      )}
                      
                      {analisi.tipiLavoro.length > 0 && (
                        <div className="text-xs">
                          <span className="text-on-surface-variant">Tipi lavoro:</span>
                          <span className="text-on-surface ml-1">{analisi.tipiLavoro.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm text-on-surface leading-relaxed bg-surface-container-low p-4 rounded-xl border border-slate-200/70 font-mono">
                    {selectedWorkout.testo}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200/70">
                    <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
                      Analisi Automatica Serie e Zone Energetiche (A1–D)
                    </h4>
                    <div className="space-y-2">
                      {ParserScheda.parseSerie(selectedWorkout.testo).map((s, idx) => (
                        <div key={idx} className="p-3 bg-surface-container-lowest border border-slate-200/70 rounded-xl flex items-center justify-between gap-2 text-xs shadow-card">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface-variant">#{idx + 1}</span>
                            <span className="text-on-surface font-semibold">{s.descrizione}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {s.attrezzi.length > 0 && (
                              <span className="text-on-surface-variant font-medium italic">[{s.attrezzi.join(', ')}]</span>
                            )}
                            <span className="font-bold text-primary-container text-sm">{s.metriTotali} m</span>
                            <BadgeCodice codice={s.codice as any} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <SchedeVascaScreen />
            )
          )}
          {tab === 'tempi' && <TempiRipartenzeScreen />}
          {tab === 'registro' && <RegistroScreen />}
          {tab === 'biomeccanica' && <ParaSwimmingAnalyticsView />}
        </div>
      )}

      <OcrPreviewModal
        isOpen={ocrModalOpen}
        initialText={ocrRawText}
        onConfirm={(finalText) => {
          const list = OcrWorkoutStandardizer.standardizzaEsepara(finalText, atleti);
          const nuoviWorkouts: CustomWorkout[] = list.map(item => ({
            id: (Date.now() + Math.random()).toString(),
            data: workoutDate,
            testo: item.testo,
            creatoIl: new Date().toISOString(),
            atletaId: item.atletaId,
            metriTotali: ParserScheda.calcolaMetriDaTesto(item.testo)
          }));

          const updated = [...nuoviWorkouts, ...customWorkouts];
          setCustomWorkouts(updated);
          FINPStorage.saveCustomWorkouts(updated);
          if (nuoviWorkouts.length > 0) {
            setSelectedWorkoutId(nuoviWorkouts[0].id);
          }
          setOcrModalOpen(false);
        }}
        onCancel={() => setOcrModalOpen(false)}
      />


    </div>
  );
};
