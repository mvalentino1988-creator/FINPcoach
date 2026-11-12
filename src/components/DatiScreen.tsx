import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import {
  ClipboardList,
  Timer,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Trash2,
  Calendar,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Camera,
  Loader2,
  RefreshCw,
  Plus,
  Bot,
  Waves,
  Clock,
  Activity,
  Copy
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
import { CodiceAllenamentoKey } from '../types';
import { ParserScheda } from '../domain/parserScheda';
import { ParserApprendimento } from '../domain/parserApprendimento';
import { FINPStorage } from '../data/storage';
import { OcrWorkoutStandardizer } from '../domain/ocrWorkoutStandardizer';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';
import { Badge, Button, Card, Modal, ToastProvider, useToast } from './ui';
import type { SwimZone } from './ui';
import type { SeriaParsata } from '../domain/parserScheda';

const ParaSwimmingAnalyticsView = lazy(() => import('./ParaSwimmingAnalyticsView').then(m => ({ default: m.ParaSwimmingAnalyticsView })));

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
  codici?: CodiceAllenamentoKey[];
  fonte?: 'manuale' | 'ia' | 'codici' | 'ocr';
}

const CODICI_VALIDI_DATI = new Set<CodiceAllenamentoKey>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D']);

export const DatiScreen: React.FC = () => {
  const { atleti } = useApp();
  const [tab, setTab] = useState<DatiTab>(() => {
    const saved = sessionStorage.getItem('finp_dati_tab');
    return saved === 'schede' || saved === 'tempi' || saved === 'registro' || saved === 'biomeccanica' ? saved : 'schede';
  });
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
  const [calendarioEspanso, setCalendarioEspanso] = useState(false);
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
      metriTotali,
      fonte: 'manuale'
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
      metriTotali,
      fonte: 'manuale'
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
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
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
                className="ds-btn-primary !min-h-[44px] !px-3 shrink-0"
              >
                <Plus size={16} />
                <span className="hidden xs:inline">Nuovo Allenamento</span>
              </button>
            ) : undefined
          }
        />
      </div>

      {/* TABS — segmented dock stile Stitch */}
      <div className="shrink-0 bg-surface-container-high/80 p-1 rounded-xl flex items-center shadow-sm gap-1 overflow-x-auto ds-hscroll">
        {([
          { key: 'schede', label: 'Schede Vasca', icon: <ClipboardList size={16} /> },
          { key: 'tempi', label: 'Tempi & Ripartenze', icon: <Timer size={16} /> },
          { key: 'registro', label: 'Registro & Carico', icon: <CheckCircle2 size={16} /> },
          { key: 'biomeccanica', label: 'Biomeccanica & WPS', icon: <Activity size={16} /> },
        ] as { key: DatiTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              sessionStorage.setItem('finp_dati_tab', t.key);
            }}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`flex-1 min-w-[120px] py-2 px-2 rounded-lg font-label-lg text-label-lg text-center transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === t.key
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {/* TAB SCHEDE: Calendario / Lista / Form */}
        {tab === 'schede' && (
          <>
            {/* Header controlli Calendario / Lista (Segmented Control) */}
            {!editMode && (
              <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-surface-container-lowest p-2.5 rounded-xl shadow-sm border border-outline-variant/50">
                <div className="flex items-center bg-surface-container-high/80 p-0.5 rounded-lg gap-0.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setVistaSchede('calendario')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 min-h-[40px] whitespace-nowrap rounded-md font-label-caps text-label-caps transition ${
                      vistaSchede === 'calendario' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    Calendario
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaSchede('lista')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 min-h-[40px] whitespace-nowrap rounded-md font-label-caps text-label-caps transition ${
                      vistaSchede === 'lista' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    Lista
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarioEspanso(v => !v)}
                    className={`ds-btn-secondary !min-h-[44px] !px-3 text-xs whitespace-nowrap justify-center ${calendarioEspanso ? 'bg-primary-fixed/40 border-primary/30 text-on-primary-fixed-variant' : ''}`}
                  >
                    <Calendar size={15} />
                    <span>{calendarioEspanso ? 'Chiudi Mese' : 'Mese'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalitaNuovoModal(true)}
                    className="ds-btn-primary !min-h-[44px] !px-3 text-xs whitespace-nowrap justify-center"
                  >
                    <Plus size={15} />
                    <span>Nuovo</span>
                  </button>
                </div>
              </div>
            )}

            {/* COMPACT CALENDAR (Collapsible) */}
            {!editMode && calendarioEspanso && vistaSchede === 'calendario' && !selectedWorkout && (
              <div className="ds-card p-3 max-w-2xl mx-auto space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseData(calendarioData);
                      if (parsed) setCalendarioData(formattaData(addDays(parsed, -7)));
                    }}
                    className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition"
                    aria-label="Settimana precedente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex flex-col items-center">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {calendarioData}
                    </h3>
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wide">Settimana</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseData(calendarioData);
                      if (parsed) setCalendarioData(formattaData(addDays(parsed, 7)));
                    }}
                    className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition"
                    aria-label="Settimana successiva"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => (
                    <div key={g} className="text-center font-label-caps text-[10px] text-on-surface-variant uppercase">
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
                      cells.push(<div key={`e-${i}`} className="h-10" />);
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
                          className={`h-10 rounded-lg flex flex-col items-center justify-center relative transition active:scale-95 ${
                            workoutGiorno
                              ? 'bg-primary text-on-primary font-bold shadow-sm'
                              : isOggi
                              ? 'bg-primary-fixed/50 text-on-primary-fixed-variant font-bold border border-primary/30'
                              : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          <span className="font-headline-sm text-[13px] leading-none tabular-nums">{g}</span>
                          {workoutGiorno && (
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed mt-0.5" />
                          )}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            )}

            {/* EDITOR WORKOUT MODE */}
            {editMode && (
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Nuovo Allenamento
                  </h3>
                  <button onClick={() => setEditMode(false)} className="ds-btn-icon" aria-label="Chiudi">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1 block">Data Allenamento</label>
                    <input
                      type="text"
                      value={workoutDate}
                      onChange={e => setWorkoutDate(formatDataInput(e.target.value))}
                      className="ds-input !h-12 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1 block">Testo Scheda / Serie</label>
                    <textarea
                      value={customWorkout}
                      onChange={e => setCustomWorkout(e.target.value)}
                      placeholder="Esempio: 400m Stile libero A1, 4x100m B1 a 1'30''..."
                      className="w-full h-36 p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl font-mono text-xs resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              <ToastProvider>
                <SchedaDettaglio
                  workout={selectedWorkout}
                  onIndietro={() => setSelectedWorkoutId(null)}
                />
              </ToastProvider>
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
        {tab === 'biomeccanica' && (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shadow-primary-sm mb-3 animate-pulse">
                <Waves size={24} />
              </div>
              <span className="text-xs font-bold font-headline text-on-surface-variant">Caricamento in corso...</span>
            </div>
          }>
            <ParaSwimmingAnalyticsView />
          </Suspense>
        )}
      </div>

      {/* MODAL MODALITÀ NUOVO ALLENAMENTO */}
      {modalitaNuovoModal && (
        <Modal
          open={modalitaNuovoModal}
          onClose={() => setModalitaNuovoModal(false)}
          title="Nuovo Allenamento"
          size="sm"
        >
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setModalitaNuovoModal(false);
                  setEditMode(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-left flex items-center gap-3 transition active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold shadow-primary-sm">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm font-bold">Scrivi a mano</div>
                  <div className="text-xs text-on-surface-variant">Inserisci liberamente testo o serie</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalitaNuovoModal(false);
                  setEditMode(true);
                  setOcrModalOpen(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-left flex items-center gap-3 transition active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 font-bold">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm font-bold">Genera con IA</div>
                  <div className="text-xs text-on-surface-variant">Carica uno screenshot o usa l'IA</div>
                </div>
              </button>
            </div>
        </Modal>
      )}

      <OcrPreviewModal
        isOpen={ocrModalOpen}
        initialText={ocrRawText}
        onConfirm={(finalText) => {
          const list = OcrWorkoutStandardizer.standardizzaEsepara(finalText, atleti);
          const nuoviWorkouts: CustomWorkout[] = list.map(item => {
            const serie = ParserScheda.parseSerie(item.testo);
            const codici = Array.from(new Set(
              serie
                .map(s => s.codice)
                .filter((c): c is CodiceAllenamentoKey => CODICI_VALIDI_DATI.has(c as CodiceAllenamentoKey))
            ));
            return {
              id: (Date.now() + Math.random()).toString(),
              data: workoutDate,
              testo: item.testo,
              creatoIl: new Date().toISOString(),
              atletaId: item.atletaId,
              metriTotali: ParserScheda.calcolaMetriDaTesto(item.testo),
              codici: codici.length > 0 ? codici : undefined,
              fonte: 'ocr'
            };
          });

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

// ------------------------------------------------ Visualizzatore scheda generata

const ORDINE_FASI = ['riscaldamento', 'tecnico', 'tecnica', 'serie', 'principale', 'defaticamento'];

function SchedaDettaglio({ workout, onIndietro }: { workout: CustomWorkout; onIndietro: () => void }) {
  const { toast } = useToast();
  const [copiato, setCopiato] = useState(false);

  const serie = useMemo(() => ParserScheda.parseSerie(workout.testo), [workout.testo]);

  const sezioni = useMemo(() => {
    const map = new Map<string, SeriaParsata[]>();
    for (const s of serie) {
      const key = s.sezione?.trim() || 'Allenamento';
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    const rank = (k: string) => {
      const i = ORDINE_FASI.findIndex(f => k.toLowerCase().includes(f));
      return i === -1 ? ORDINE_FASI.length : i;
    };
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [serie]);

  const copia = () => {
    navigator.clipboard.writeText(workout.testo).then(() => {
      setCopiato(true);
      toast({ variant: 'success', title: 'Scheda copiata', message: 'Il testo è negli appunti.' });
      window.setTimeout(() => setCopiato(false), 2000);
    });
  };

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={onIndietro}>
          Indietro
        </Button>
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          {workout.data}
        </span>
      </div>

      <div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          Allenamento del {workout.data}
        </h3>
        {workout.metriTotali != null && (
          <p className="font-label-caps text-[10px] text-primary font-bold mt-0.5">
            {workout.metriTotali.toLocaleString('it-IT')} m · {workout.fonte ?? 'manuale'}
          </p>
        )}
      </div>

      {serie.length === 0 ? (
        <div className="p-3 bg-surface-container-low rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed">
          {workout.testo}
        </div>
      ) : (
        <div className="space-y-3">
          {sezioni.map(([nome, items]) => {
            const metriFase = items.reduce((sum, s) => sum + s.metriTotali, 0);
            return (
              <section
                key={nome}
                className="rounded-xl border border-outline-variant bg-surface-container-low/60 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">
                    {nome}
                  </h4>
                  <span className="font-label-caps text-[10px] text-on-surface-variant tabular-nums">
                    {metriFase.toLocaleString('it-IT')} m
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-surface-container-lowest px-3 py-2.5"
                    >
                      <Badge zone={s.codice as SwimZone} className="shrink-0">
                        {s.codice}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        {s.metriTotali > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-on-surface">
                              {s.ripetizioni}×{s.distanza}m
                            </span>
                            <span className="font-label-caps text-label-caps text-primary font-bold tabular-nums">
                              {s.metriTotali.toLocaleString('it-IT')} m
                            </span>
                          </div>
                        )}
                        <p className="text-body-sm text-on-surface-variant truncate">
                          {s.descrizione}
                          {s.attrezzi.length > 0 ? ` · ${s.attrezzi.join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1"
          icon={copiato ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          onClick={copia}
        >
          {copiato ? 'Copiato' : 'Copia scheda'}
        </Button>
      </div>
    </Card>
  );
}
