import React, { useState, useEffect } from 'react';
import { ClipboardList, Timer, CheckCircle2, Edit2, Save, X, Trash2, Calendar, Users, User, HelpCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
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

type DatiTab = 'schede' | 'tempi' | 'registro';

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

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              tab === t.key
                ? 'bg-[#006874] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}

        {tab === 'schede' && (
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ml-auto ${
              editMode
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {editMode ? <X size={16} /> : <Edit2 size={16} />}
            <span>{editMode ? 'Annulla' : 'Scrivi Allenamento'}</span>
          </button>
        )}
      </div>

      {/* Editor Allenamento Personalizzato */}
      {tab === 'schede' && editMode && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Edit2 size={18} className="text-[#006874]" />
              Scrivi l'allenamento
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setModalitaEditor('testuale')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  modalitaEditor === 'testuale'
                    ? 'bg-[#006874] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Testuale
              </button>
              <button
                type="button"
                onClick={() => setModalitaEditor('strutturato')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  modalitaEditor === 'strutturato'
                    ? 'bg-[#006874] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data allenamento</label>
                <input
                  type="text"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  placeholder="es. 05/10/2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatario</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAtletaId(null)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedAtletaId === null
                        ? 'bg-[#006874] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        selectedAtletaId === a.id
                          ? 'bg-[#006874] text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <User size={14} />
                      <span>{a.cognome} {a.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={customWorkout}
                onChange={(e) => setCustomWorkout(e.target.value)}
                placeholder="Esempio: Riscaldamento 400m stile libero A1&#10;4x100m stile libero a 1'30&quot; (ripartenza)&#10;Serie gambe 200m A1&#10;Defaticamento 200m"
                className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
              />
              {customWorkout && (
                <div className="text-xs text-slate-500 mt-2">
                  Metri totali calcolati: <strong className="text-[#006874]">{ParserScheda.calcolaMetriDaTesto(customWorkout)} m</strong>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#006874] text-white rounded-lg text-sm font-semibold hover:bg-[#005663] transition"
                >
                  <Save size={16} />
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
                >
                  <X size={16} />
                  Annulla
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                L'allenamento viene salvato e mostrato al posto della scheda generata automaticamente. I metri vengono calcolati automaticamente dal testo.
              </p>
            </>
          )}

          {/* Modalità strutturata */}
          {modalitaEditor === 'strutturato' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data allenamento</label>
                <input
                  type="text"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  placeholder="es. 05/10/2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#006874] focus:border-transparent"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatario</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAtletaId(null)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedAtletaId === null
                        ? 'bg-[#006874] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        selectedAtletaId === a.id
                          ? 'bg-[#006874] text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-[#006874]" />
            Allenamenti salvati
          </h3>
          <div className="space-y-2">
            {customWorkouts.map(w => (
              <div
                key={w.id}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  selectedWorkoutId === w.id
                    ? 'bg-[#006874] text-white border-[#006874]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
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
              className="mt-3 text-xs text-[#006874] font-semibold hover:underline"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                vistaSchede === 'calendario'
                  ? 'bg-[#006874] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setVistaSchede('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                vistaSchede === 'lista'
                  ? 'bg-[#006874] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Lista
            </button>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006874] text-white rounded-lg text-xs font-semibold hover:bg-[#005663] transition"
          >
            <Layers size={14} />
            Nuovo Allenamento
          </button>
        </div>
      )}

      {/* Calendario */}
      {tab === 'schede' && !editMode && vistaSchede === 'calendario' && !selectedWorkout && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                const parsed = parseData(calendarioData);
                if (parsed) {
                  setCalendarioData(formattaData(addDays(parsed, -7)));
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <h3 className="font-bold text-slate-800">
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
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
          
          {/* Grid dei giorni */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(giorno => (
              <div key={giorno} className="text-center text-xs font-semibold text-slate-500 py-2">
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
                        ? 'bg-[#006874] text-white cursor-pointer hover:bg-[#005663]' 
                        : isOggi
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#006874]" />
            Allenamenti salvati
          </h3>
          <div className="space-y-2">
            {customWorkouts.map(workout => (
              <div
                key={workout.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                onClick={() => setSelectedWorkoutId(workout.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{workout.data}</span>
                    {workout.atletaId && (
                      <span className="text-xs bg-[#006874] text-white px-2 py-0.5 rounded-full">
                        Personale
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {workout.testo.split('\n')[0]}
                  </div>
                  <div className="text-xs text-[#006874] font-semibold mt-1">
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
                    className="p-2 text-slate-400 hover:text-[#006874] transition"
                    title="Modifica allenamento"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(workout.id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition"
                    title="Elimina allenamento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!editMode && (
        <div>
          {tab === 'schede' && (
            selectedWorkout ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">
                    Allenamento del {selectedWorkout.data}
                    {selectedWorkout.atletaId && (
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        (Atleta specifico)
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkoutId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
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
                    <div className="space-y-3 mb-4 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Volume totale:</span>
                          <span className="font-bold text-[#006874] ml-1">{ParserScheda.calcolaMetriDaTesto(selectedWorkout.testo)} m</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Serie:</span>
                          <span className="font-bold text-slate-700 ml-1">{serie.length}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Codice stimato:</span>
                          <span className="font-bold text-slate-700 ml-1">{codiceStimato}</span>
                        </div>
                      </div>
                      
                      {analisi.attrezzi.length > 0 && (
                        <div className="text-xs">
                          <span className="text-slate-500">Attrezzi:</span>
                          <span className="text-slate-700 ml-1">{analisi.attrezzi.join(', ')}</span>
                        </div>
                      )}
                      
                      {analisi.tipiLavoro.length > 0 && (
                        <div className="text-xs">
                          <span className="text-slate-500">Tipi lavoro:</span>
                          <span className="text-slate-700 ml-1">{analisi.tipiLavoro.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
                    {selectedWorkout.testo}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Analisi Automatica Serie e Zone Energetiche (A1–D)
                    </h4>
                    <div className="space-y-2">
                      {ParserScheda.parseSerie(selectedWorkout.testo).map((s, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-400">#{idx + 1}</span>
                            <span className="text-slate-800 font-semibold">{s.descrizione}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {s.attrezzi.length > 0 && (
                              <span className="text-slate-500 font-medium italic">[{s.attrezzi.join(', ')}]</span>
                            )}
                            <span className="font-black text-[#006874] text-sm">{s.metriTotali} m</span>
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
        </div>
      )}


    </div>
  );
};
