import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Timer,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Trash2,
  Calendar,
  Users,
  User,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Camera,
  Loader2,
  RefreshCw,
  Plus,
  Bot,
  Sparkles,
  Waves,
  Clock,
  Activity
} from 'lucide-react';
import { OCRService } from '../domain/ocrService';
import { OcrPreviewModal } from './OcrPreviewModal';
import { RevisioneSchedaModal } from './RevisioneSchedaModal';
import { SchedeVascaScreen } from './SchedeVascaScreen';
import { TempiRipartenzeScreen } from './TempiRipartenzeScreen';
import { RegistroScreen } from './RegistroScreen';
import { EsercizioEditor } from './EsercizioEditor';
import { BadgeCodice } from './BadgeCodice';
import { formattaData, todayISO, parseData, addDays, isBefore, daysBetween, toDateObj, formatDataInput } from '../domain/dateUtils';
import { useApp } from '../data/AppContext';
import { ParserScheda } from '../domain/parserScheda';
import { ParserApprendimento } from '../domain/parserApprendimento';
import { FINPStorage } from '../data/storage';
import { OcrWorkoutStandardizer } from '../domain/ocrWorkoutStandardizer';
import { Sezione } from './Sezione';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ParaSwimmingAnalyticsView } from './ParaSwimmingAnalyticsView';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';

type DatiTab = 'schede' | 'tempi' | 'registro' | 'biomeccanica';
type VistaSchede = 'calendario' | 'lista';
type ModalitaEditor = 'testuale' | 'strutturato';

interface CustomWorkout {
  id: string;
  data: string;
  testo: string;
  creatoIl: string;
  atletaId: number | null;
  metriTotali?: number;
}

export const DatiScreen: React.FC = () => {
  const { atleti } = useApp();
  const [tab, setTab] = useState<DatiTab>('schede');
  const [editMode, setEditMode] = useState(false);
  const [modalitaEditor, setModalitaEditor] = useState<ModalitaEditor>('testuale');
  const [customWorkout, setCustomWorkout] = useState('');
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [workoutDate, setWorkoutDate] = useState<string>(formattaData(todayISO()));
  const [selectedAtletaId, setSelectedAtletaId] = useState<number | null>(null);
  const [vistaSchede, setVistaSchede] = useState<VistaSchede>('calendario');
  const [calendarioData, setCalendarioData] = useState<string>(formattaData(todayISO()));
  const [modalitaNuovoModal, setModalitaNuovoModal] = useState(false);

  // Parameter chips state
  const [vascaMetri, setVascaMetri] = useState<25 | 50>(25);
  const [durataMin, setDurataMin] = useState<60 | 90 | 120>(90);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [pendingGaraText, setPendingGaraText] = useState<string | null>(null);
  const [revisioneOpen, setRevisioneOpen] = useState(false);

  const customWorkoutsRef = useRef<CustomWorkout[]>([]);
  useEffect(() => {
    customWorkoutsRef.current = customWorkouts;
  }, [customWorkouts]);

  useEffect(() => {
    setCustomWorkouts(FINPStorage.getCustomWorkouts());
  }, []);

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
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {pullToRefresh.isPulling && (
        <div className="shrink-0 flex items-center justify-center py-1 text-xs text-on-surface-variant">
          <RefreshCw size={16} className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}

      {/* Intestazione pagina */}
      <div className="shrink-0">
        <PageHeader
          label="Archivio Allenatore"
          title="Dati"
          icon={<ClipboardList size={13} />}
          meta="Schede vasca, tempi di ripartenza, registro presenze e analisi biomeccanica"
          right={
            tab === 'schede' ? (
              <button
                type="button"
                onClick={() => setModalitaNuovoModal(true)}
                className="ds-btn-primary !min-h-[40px] !px-3 shrink-0"
              >
                <Plus size={16} />
                <span className="hidden xs:inline">Nuovo Allenamento</span>
              </button>
            ) : undefined
          }
        />
      </div>

      {/* TABS SU UNA SOLA RIGA COMPATTA */}
      <div className="shrink-0 ds-card p-1.5 sm:p-2">
        <div className="grid grid-cols-4 gap-1">
          {[
            { key: 'schede' as DatiTab, label: 'Schede', icon: <ClipboardList size={16} /> },
            { key: 'tempi' as DatiTab, label: 'Tempi', icon: <Timer size={16} /> },
            { key: 'registro' as DatiTab, label: 'Registro', icon: <CheckCircle2 size={16} /> },
            { key: 'biomeccanica' as DatiTab, label: 'Biomeccanica', icon: <Layers size={16} /> },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-headline font-bold transition ${
                tab === t.key
                  ? 'bg-primary text-white shadow-primary-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {/* TAB SCHEDE: Calendario / Lista / Form */}
        {tab === 'schede' && (
          <>
            {/* Header controlli Calendario / Lista (Segmented Control) */}
            {!editMode && (
              <div className="shrink-0 flex items-center justify-between gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant">
                <div className="flex items-center bg-surface-container rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setVistaSchede('calendario')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-headline transition ${
                      vistaSchede === 'calendario' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'
                    }`}
                  >
                    Calendario
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaSchede('lista')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-headline transition ${
                      vistaSchede === 'lista' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'
                    }`}
                  >
                    Lista
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setModalitaNuovoModal(true)}
                  className="ds-btn-primary !min-h-[38px] !px-3 text-xs"
                >
                  <Plus size={15} />
                  <span>Nuovo</span>
                </button>
              </div>
            )}

            {/* COMPACT CALENDAR (Month with Dots) */}
            {!editMode && vistaSchede === 'calendario' && !selectedWorkout && (
              <div className="ds-card p-3 max-w-2xl mx-auto space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseData(calendarioData);
                      if (parsed) setCalendarioData(formattaData(addDays(parsed, -7)));
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-container"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="font-headline font-bold text-xs sm:text-sm text-on-surface">
                    {calendarioData}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseData(calendarioData);
                      if (parsed) setCalendarioData(formattaData(addDays(parsed, 7)));
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-container"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => (
                    <div key={g} className="text-center text-[10px] font-bold text-on-surface-variant uppercase">
                      {g}
                    </div>
                  ))}
                  {(() => {
                    const dataCalendarioISO = parseData(calendarioData);
                    if (!dataCalendarioISO) return null;
                    const dataObj = toDateObj(dataCalendarioISO);
                    const primoGiorno = new Date(dataObj.getFullYear(), dataObj.getMonth(), 1);
                    const giornoSettimana = (primoGiorno.getDay() + 6) % 7;
                    const giorniMese = new Date(dataObj.getFullYear(), dataObj.getMonth() + 1, 0).getDate();
                    const cells: JSX.Element[] = [];

                    for (let i = 0; i < giornoSettimana; i++) {
                      cells.push(<div key={`e-${i}`} className="h-9" />);
                    }

                    for (let g = 1; g <= giorniMese; g++) {
                      const dataISO = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
                      const dataFormattata = formattaData(dataISO);
                      const workoutGiorno = customWorkouts.find(w => w.data === dataFormattata);
                      const isOggi = dataISO === todayISO();

                      cells.push(
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            if (workoutGiorno) setSelectedWorkoutId(workoutGiorno.id);
                          }}
                          className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition ${
                            workoutGiorno
                              ? 'bg-primary text-white font-bold shadow-sm'
                              : isOggi
                              ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                              : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          <span className="text-xs leading-none">{g}</span>
                          {workoutGiorno && (
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary mt-0.5" />
                          )}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            )}

            {/* UNIFIED PARAMETERS BLOCK (Shown Once, No Duplication) */}
            {!editMode && (
              <div className="ds-card p-3 space-y-2.5">
                <div className="font-headline font-bold text-xs text-primary uppercase tracking-wider">
                  Parametri Sessione
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Vasca Impianto</label>
                    <div className="flex gap-1">
                      {[25, 50].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVascaMetri(v as any)}
                          className={`flex-1 py-1.5 rounded-xl font-headline font-bold transition ${
                            vascaMetri === v ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container-low text-on-surface'
                          }`}
                        >
                          {v}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Durata Target</label>
                    <div className="flex gap-1">
                      {[60, 90, 120].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDurataMin(d as any)}
                          className={`flex-1 py-1.5 rounded-xl font-headline font-bold transition ${
                            durataMin === d ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container-low text-on-surface'
                          }`}
                        >
                          {d}'
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Volume Seduta</label>
                    <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/60 flex items-center justify-between">
                      <span className="font-headline font-bold text-primary">350 / 1800 m</span>
                      <Activity size={16} className="text-primary-container" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EDITOR WORKOUT MODE */}
            {editMode && (
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-sm text-on-surface">Nuovo Allenamento</h3>
                  <button onClick={() => setEditMode(false)} className="p-1 rounded-lg hover:bg-surface-container">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Data Allenamento</label>
                    <input
                      type="text"
                      value={workoutDate}
                      onChange={e => setWorkoutDate(formatDataInput(e.target.value))}
                      className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-on-surface mb-1 block">Testo Scheda / Serie</label>
                    <textarea
                      value={customWorkout}
                      onChange={e => setCustomWorkout(e.target.value)}
                      placeholder="Esempio: 400m Stile libero A1, 4x100m B1 a 1'30''..."
                      className="w-full h-36 p-3 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-xs resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={salvaAllenamento} className="ds-btn-primary flex-1">
                      <Save size={16} /> Salva Allenamento
                    </button>
                    <button type="button" onClick={() => setEditMode(false)} className="ds-btn-secondary">
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DISPLAY SELECTED WORKOUT OR AUTO GENERATED */}
            {!editMode && selectedWorkout ? (
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Allenamento del {selectedWorkout.data}
                  </h3>
                  <button onClick={() => setSelectedWorkoutId(null)} className="text-xs font-bold text-primary">
                    Chiudi
                  </button>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl font-mono text-xs whitespace-pre-wrap">
                  {selectedWorkout.testo}
                </div>
              </div>
            ) : (
              !editMode && <SchedeVascaScreen />
            )}
          </>
        )}

        {tab === 'tempi' && (
          <TempiRipartenzeScreen
            initialOcrText={pendingGaraText}
            onInitialOcrConsumed={() => setPendingGaraText(null)}
            onTestoScheda={(testo) => {
              setTab('schede');
              setEditMode(true);
              setSelectedWorkoutId(null);
              setCustomWorkout(testo);
            }}
          />
        )}

        {tab === 'registro' && <RegistroScreen />}
        {tab === 'biomeccanica' && <ParaSwimmingAnalyticsView />}
      </div>

      {/* MODAL MODALITÀ NUOVO ALLENAMENTO (3 OPZIONI) */}
      {modalitaNuovoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-sm w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">Nuovo Allenamento</h3>
              <button onClick={() => setModalitaNuovoModal(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setModalitaNuovoModal(false);
                  setEditMode(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-left flex items-center gap-3 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 font-bold">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div className="font-headline font-bold text-xs">Scrivi a mano</div>
                  <div className="text-[11px] text-on-surface-variant">Inserisci liberamente testo o serie</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalitaNuovoModal(false);
                  setEditMode(true);
                  setOcrModalOpen(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-left flex items-center gap-3 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0 font-bold">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="font-headline font-bold text-xs">Genera con IA</div>
                  <div className="text-[11px] text-on-surface-variant">Carica uno screenshot o usa l'IA</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalitaNuovoModal(false);
                  setTab('schede');
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-left flex items-center gap-3 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-tertiary text-white flex items-center justify-center shrink-0 font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="font-headline font-bold text-xs">Proposta sistema</div>
                  <div className="text-[11px] text-on-surface-variant">Usa la scheda calcolata dal piano</div>
                </div>
              </button>
            </div>
          </div>
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

      <RevisioneSchedaModal
        open={revisioneOpen}
        testo={customWorkout}
        onClose={() => setRevisioneOpen(false)}
        onApplica={(testoCorretto) => {
          setCustomWorkout(testoCorretto);
          const metriTotali = ParserScheda.calcolaMetriDaTesto(testoCorretto);
          const updated = customWorkoutsRef.current.map((w) =>
            w.id === selectedWorkoutId ? { ...w, testo: testoCorretto, metriTotali } : w
          );
          customWorkoutsRef.current = updated;
          setCustomWorkouts(updated);
          FINPStorage.saveCustomWorkouts(updated);
        }}
      />
    </div>
  );
};
