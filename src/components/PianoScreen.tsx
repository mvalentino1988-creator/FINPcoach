import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  DayOfWeekNum,
  DAY_OF_WEEK_FULL_NAMES,
  DAY_OF_WEEK_NAMES,
  FASE_MESOCICLO_LABEL,
  Microciclo,
  TipoMicrociclo,
  TIPO_MICROCICLO_LABEL
} from '../types';
import { formattaData, parseData, todayISO, isBefore, addDays, daysBetween, formatDataInput } from '../domain/dateUtils';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { CodiciSeduta } from './CodiciSeduta';
import { ElencoAvvisi } from './ElencoAvvisi';
import { PageHeader } from './PageHeader';
import { Badge, Select } from './ui';
import { normalizzaDurata } from '../domain/parametriSeduta';
import { IscrittiGaraPanel } from './IscrittiGaraPanel';
import { NuovaStagioneForm, ModalModificaMicro, tipoMicroVisual } from './pianoModali';
import { PianoEditEventModal, PianoParametriModal, EditEventModalState } from './pianoOverlayModals';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { salvaSnapshotDati } from '../data/snapshotAutomatico';
import { logNellaStagione, scaricaArchivioStagione } from '../domain/archivioStagione';
import {
  Activity,
  AlertCircle,
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Edit2,
  Flag,
  Gauge,
  Layers,
  Lock,
  RefreshCw,
  Sparkles,
  Sliders,
  Timer,
  Trash2,
  Trophy,
  Users,
  Waves,
  X,
  MapPin
} from 'lucide-react';



export const PianoScreen: React.FC = () => {
  const {
    atleti,
    condizioni,
    stagione,
    chiusure,
    gare,
    iscrizioniGare,
    macro,
    meso,
    micro,
    avvisiPiano,
    impostazioni,
    parametriEffettivi,
    creaStagione,
    modificaDateStagione,
    eliminaStagione,
    archiviaStagione,
    log,
    tempi,
    modificaChiusura,
    modificaGara,
    salvaImpostazioni,
    impostaParametriGiorno,
    impostaDurataDefault,
    rigeneraPianoCompleto,
    modificaMicro,
    sbloccaMicro
  } = useApp();

  const [vistaPiano, setVistaPiano] = useState<'parametri' | 'programmazione'>('programmazione');
  const [microSelezionato, setMicroSelezionato] = useState<Microciclo | null>(null);

  const generaDateSedute = (inizioISO: string, fineISO: string, nSedute: number): string[] => {
    const start = parseData(inizioISO) ?? todayISO();
    const end = parseData(fineISO) ?? addDays(start, 6);
    const totalDays = daysBetween(start, end) + 1;
    if (nSedute <= 0) return [];
    const dates: string[] = [];
    for (let i = 0; i < nSedute; i++) {
      const offset = Math.round((i * (totalDays - 1)) / Math.max(1, nSedute - 1));
      dates.push(addDays(start, offset));
    }
    return dates;
  };

  // Edit Event/Race Modal
  const [editEventModal, setEditEventModal] = useState<EditEventModalState | null>(null);

  // Modal Parametri Piano e Disposizione Corsie
  const [modalParametriPianoOpen, setModalParametriPianoOpen] = useState(false);
  const [numCorsieDisponibili, setNumCorsieDisponibili] = useState<number>(4);
  const [atletiPresentiIds, setAtletiPresentiIds] = useState<number[]>(() => atleti.map(a => a.id));

  const toggleAtletaPresente = (id: number) => {
    setAtletiPresentiIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Modifica date stagione esistente
  const [modificaDateOpen, setModificaDateOpen] = useState(false);
  const [modInizio, setModInizio] = useState('');
  const [modFine, setModFine] = useState('');
  const [modError, setModError] = useState<string | null>(null);

  // Archivia stagione (QUINTO GIRO 3.3)
  const [archiviaOpen, setArchiviaOpen] = useState(false);
  const [archiviaConferma, setArchiviaConferma] = useState(false);
  const [archiviaBusy, setArchiviaBusy] = useState(false);
  const [archiviaErrore, setArchiviaErrore] = useState<string | null>(null);
  const logInStagione = stagione ? log.filter(l => logNellaStagione(l.data, stagione)).length : 0;

  // Clickable Menu Navigation for Cycles
  const [selectedMacroId, setSelectedMacroId] = useState<number | null>(null);
  const [selectedMesoId, setSelectedMesoId] = useState<number | null>(null);
  const [microFocusId, setMicroFocusId] = useState<number | null>(null);
  const [espandiTutti, setEspandiTutti] = useState(false);

  // Form nuova stagione
  const oggi = todayISO();
  const [inizioStagione, setInizioStagione] = useState(() => AutoPianificatore.inizioStagioneSuggerito(oggi));
  const inizioParsed = parseData(inizioStagione);
  const fineSuggerita = inizioParsed ? AutoPianificatore.fineStagioneSuggerita(inizioParsed) : '';
  const [fineStagione, setFineStagione] = useState(() => fineSuggerita);
  const fineEffettiva = fineStagione.trim() ? parseData(fineStagione) : fineSuggerita;
  const [nomeStagione, setNomeStagione] = useState('');
  const nomeAuto = inizioParsed && fineEffettiva ? AutoPianificatore.nomeStagione(inizioParsed, fineEffettiva) : '';
  const nomeEffettivo = nomeStagione.trim() || nomeAuto;

  // Settings inputs
  const [metriTxt, setMetriTxt] = useState(impostazioni.metriBaseSeduta?.toString() ?? '');
  const [macroTxt, setMacroTxt] = useState(impostazioni.numeroMacrocicli?.toString() ?? '');
  const [cicloTxt, setCicloTxt] = useState(impostazioni.settimaneCicloCarico?.toString() ?? '');

  // Pull to refresh - disattivato su mouse, ricalcolo semplice invece di reload
  const isPointerFine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      if (isPointerFine || !stagione) return;
      // Ricalcolo semplice invece di reload
      rigeneraPianoCompleto();
    },
    threshold: 100,
    disabled: !stagione
  });

  if (!stagione) {
    return <NuovaStagioneForm
      inizioStagione={inizioStagione}
      setInizioStagione={setInizioStagione}
      fineStagione={fineStagione}
      setFineStagione={setFineStagione}
      nomeStagione={nomeStagione}
      setNomeStagione={setNomeStagione}
      inizioParsed={inizioParsed}
      fineEffettiva={fineEffettiva}
      nomeAuto={nomeAuto}
      nomeEffettivo={nomeEffettivo}
      creaStagione={creaStagione}
    />;
  }

  const volumeMax = micro.length > 0 ? Math.max(...micro.map(m => m.volumeTargetMetri)) : 0;

  const macroCorrente = macro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi));
  const macroAttivo = macro.find(m => m.id === selectedMacroId) ?? macroCorrente ?? macro[0];
  const mesoDiMacroAttivo = meso.filter(me => me.macrocicloId === macroAttivo?.id);
  const mesoCorrente = mesoDiMacroAttivo.find(me => !isBefore(oggi, me.inizio) && !isBefore(me.fine, oggi));
  const mesoAttivo = mesoDiMacroAttivo.find(me => me.id === selectedMesoId) ?? mesoCorrente ?? mesoDiMacroAttivo[0];
  const microDiMesoAttivo = mesoAttivo ? micro.filter(mi => mi.mesocicloId === mesoAttivo.id) : [];
  const microCorrente = microDiMesoAttivo.find(mi => !isBefore(oggi, mi.inizio) && !isBefore(mi.fine, oggi)) ?? microDiMesoAttivo[0];
  const volumeMediaSettimana = microDiMesoAttivo.length > 0
    ? Math.round(microDiMesoAttivo.reduce((sum, mi) => sum + mi.volumeTargetMetri, 0) / microDiMesoAttivo.length)
    : 0;

  const focusMicro = (id: number) => {
    setMicroFocusId(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`micro-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="space-y-5 relative">
      {/* Intestazione pagina — stile dashboard */}
      <PageHeader
        label="Stagione Agonistica FINP"
        title={stagione?.nome ?? 'Stagione'}
        icon={<CalendarDays size={16} />}
        meta={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
            <span>{stagione?.inizio ? formattaData(stagione.inizio) : ''} – {stagione?.fine ? formattaData(stagione.fine) : ''}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/60 px-2 py-0.5 font-label-caps text-label-caps uppercase text-on-secondary-container">
              <Waves size={12} /> Vasca {stagione?.vascaMetri ?? 25}m
            </span>
          </span>
        }
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalParametriPianoOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-border-hairline bg-surface-container-low px-3 text-xs font-headline-sm font-bold text-on-surface transition hover:bg-surface-container"
              title="Configura parametri e corsie"
            >
              <Sliders size={15} className="text-primary" />
              <span className="hidden sm:inline">Parametri</span>
            </button>

            <button
              onClick={() => {
                if (stagione) {
                  setModInizio(formattaData(stagione.inizio));
                  setModFine(formattaData(stagione.fine));
                  setModError(null);
                  setModificaDateOpen(true);
                }
              }}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-headline-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              title="Modifica date stagione"
            >
              <Edit2 size={15} />
              <span className="hidden sm:inline">Date</span>
            </button>

            <button
              onClick={() => { setArchiviaConferma(false); setArchiviaErrore(null); setArchiviaOpen(true); }}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-container px-3 text-xs font-headline-sm font-bold text-on-primary-container transition hover:brightness-95"
              title="Esporta la stagione in un archivio e prepara la stagione successiva"
            >
              <Archive size={15} />
              <span className="hidden sm:inline">Archivia</span>
            </button>

            <button
              onClick={() => {
                const parti = [
                  `stagione "${stagione?.nome ?? ''}" (${formattaData(stagione?.inizio ?? '')} – ${formattaData(stagione?.fine ?? '')})`,
                  `${micro.length} microcicli`, `${macro.length} macrocicli`, `${meso.length} mesocicli`,
                  `${gare.length} gare`, `${iscrizioniGare.length} iscrizioni`, `${chiusure.length} chiusure`,
                ];
                if (window.confirm(`Eliminare la stagione? Verranno eliminati: ${parti.join(', ')}.\n\nGli atleti e i tempi restano salvati. Prima della cancellazione viene creato uno snapshot di sicurezza (max 3, in Dati > Snapshot).`)) {
                  salvaSnapshotDati();
                  eliminaStagione();
                }
              }}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-error/25 bg-error-container px-3 text-xs font-headline-sm font-bold text-on-error-container transition hover:brightness-95"
              title="Elimina stagione"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Elimina</span>
            </button>
          </div>
        }
      />

      <nav className="shrink-0 rounded-xl border border-border-hairline bg-surface-container-high p-1 shadow-card" aria-label="Sezioni della periodizzazione">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            aria-pressed={vistaPiano === 'parametri'}
            onClick={() => setVistaPiano('parametri')}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-2 font-headline-sm text-headline-sm font-bold transition ${
              vistaPiano === 'parametri'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Sliders size={16} /> Parametri
          </button>
          <button
            type="button"
            aria-pressed={vistaPiano === 'programmazione'}
            onClick={() => setVistaPiano('programmazione')}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-2 font-headline-sm text-headline-sm font-bold transition ${
              vistaPiano === 'programmazione'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <CalendarDays size={16} /> Programmazione
          </button>
        </div>
      </nav>

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div className="flex items-center justify-center py-2 text-xs text-on-surface-variant">
          <RefreshCw 
            size={16} 
            className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} 
          />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}

      {/* Modal Modifica Date Stagione */}
      {modificaDateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border-hairline bg-surface-container-lowest shadow-float sm:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-hairline bg-surface-container-low px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                  <CalendarDays size={19} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Modifica date stagione</h3>
                  <p className="truncate text-xs text-on-surface-variant">{stagione.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModificaDateOpen(false)}
                aria-label="Chiudi modifica date stagione"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
              {modError && (
                <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error-container p-3 text-on-error-container">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="font-medium">{modError}</span>
                </div>
              )}

              <p className="text-xs leading-relaxed text-on-surface-variant">
                Modificando le date di inizio e fine, la timeline della stagione, i macrocicli e i mesocicli
                verranno ricalcolati mantenendo tutti i microcicli bloccati manualmente.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="stagione-mod-inizio" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Nuova inizio <span className="text-error">*</span>
                  </label>
                  <input
                    id="stagione-mod-inizio"
                    type="text"
                    value={modInizio}
                    onChange={e => setModInizio(formatDataInput(e.target.value))}
                    placeholder="gg/mm/aaaa"
                    className="ds-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="stagione-mod-fine" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Nuova fine <span className="text-error">*</span>
                  </label>
                  <input
                    id="stagione-mod-fine"
                    type="text"
                    value={modFine}
                    onChange={e => setModFine(formatDataInput(e.target.value))}
                    placeholder="gg/mm/aaaa"
                    className="ds-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline bg-surface-container-low px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setModificaDateOpen(false)}
                className="h-11 rounded-lg px-4 text-xs font-headline-sm font-bold text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const pInizio = parseData(modInizio);
                  const pFine = parseData(modFine);
                  if (!pInizio) {
                    setModError('Data di inizio non valida. Usa il formato gg/mm/aaaa.');
                    return;
                  }
                  if (!pFine) {
                    setModError('Data di fine non valida. Usa il formato gg/mm/aaaa.');
                    return;
                  }
                  if (pInizio >= pFine) {
                    setModError('La data di inizio deve precedere la data di fine.');
                    return;
                  }
                  modificaDateStagione(pInizio, pFine);
                  setModificaDateOpen(false);
                }}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary-container px-4 text-xs font-headline-sm font-bold text-on-primary shadow-card transition hover:bg-primary"
              >
                Salva e ricalcola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parametri Auto-Pianificatore & Controlli */}
      {vistaPiano === 'parametri' && (
      <section className="overflow-hidden rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
        <div className="border-b border-border-hairline bg-surface-container-low px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
              <Sliders size={19} />
            </span>
            <div className="min-w-0">
              <p className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-primary">Auto-pianificatore</p>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Parametri e programmazione giornaliera</h2>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                Il piano si adatta a età media, storico di carico, chiusure e gare. Configura solo i giorni attivi.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 text-xs sm:p-5">
          {avvisiPiano.length > 0 && (
            <div className="rounded-xl border border-warning/25 bg-warning-container/50 p-3">
              <h4 className="mb-2 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-on-warning-container">
                <AlertCircle size={14} /> Controlli e avvisi sul piano
              </h4>
              <ElencoAvvisi avvisi={avvisiPiano} />
            </div>
          )}

          {/* 1. Giorni di Allenamento Settimanali (PRIMA) */}
          <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id="piano-giorni-label" className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Giorni di allenamento
              </span>
              <span className="rounded-full bg-surface-container-highest px-2.5 py-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
                {impostazioni.giorni == null ? 'Automatici' : 'Manuali'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="piano-giorni-label">
              <button
                type="button"
                onClick={() => salvaImpostazioni({ ...impostazioni, giorni: undefined })}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 font-headline-sm text-label-lg transition ${
                  impostazioni.giorni == null
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <CircleDot size={14} /> Auto
              </button>
              {([1, 2, 3, 4, 5, 6, 7] as DayOfWeekNum[]).map(dow => {
                const active = parametriEffettivi.giorniAllenamento.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => {
                      const current = parametriEffettivi.giorniAllenamento;
                      const next = active ? current.filter(d => d !== dow) : [...current, dow];
                      salvaImpostazioni({
                        ...impostazioni,
                        giorni: next.length > 0 ? (next.sort((a, b) => a - b) as DayOfWeekNum[]) : undefined
                      });
                    }}
                    className={`min-h-[44px] rounded-full px-3.5 font-headline-sm text-label-lg transition ${
                      active
                        ? 'bg-primary-fixed text-on-primary-fixed shadow-sm ring-1 ring-primary-fixed-dim'
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {DAY_OF_WEEK_FULL_NAMES[dow]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Programmazione Giornaliera (DOPO, mostra SOLO i giorni selezionati) */}
          <div className="space-y-2 pt-1">
            <span className="block font-headline font-bold text-sm text-on-surface">
              Programmazione Giornaliera (Vasca, Durata, Corsie & Atleti Presenti)
            </span>
            <p className="text-xs text-on-surface-variant">
              Configura vasca, durata, corsie e atleti presenti per ciascuno dei giorni di allenamento selezionati.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {parametriEffettivi.giorniAllenamento.map((dow) => {
                const p = impostazioni.parametriPerGiorno?.[dow] || {
                  vascaMetri: stagione?.vascaMetri || 25,
                  durataMin: impostazioni.durataDefaultMin || 90,
                  numeroCorsie: 4,
                  atletiPresentiIds: atleti.map(a => a.id)
                };
                const dayLanes = p.numeroCorsie || 4;
                const dayPresent = p.atletiPresentiIds || atleti.map(a => a.id);

                return (
                  <div key={dow} className="min-w-0 overflow-hidden rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
                    <div className="flex items-center justify-between gap-2 border-b border-border-hairline bg-surface-container px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                          <CalendarDays size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-headline-sm text-headline-sm font-bold leading-none text-on-surface">{DAY_OF_WEEK_FULL_NAMES[dow]}</p>
                          <p className="mt-1 truncate font-label-caps text-label-caps uppercase text-on-surface-variant">{p.vascaMetri}m · {p.durataMin}' · {dayLanes} corsie</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-surface-container-highest px-2 py-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
                        {dayPresent.length}/{atleti.length}
                      </span>
                    </div>
                    <div className="space-y-3 p-3">

                    {/* Vasca 25/50 */}
                    <div>
                      <span id={`giorno-${dow}-vasca-label`} className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">Vasca impianto</span>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1" role="group" aria-labelledby={`giorno-${dow}-vasca-label`}>
                        {[25, 50].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => impostaParametriGiorno(dow, { ...p, vascaMetri: v })}
                            className={`h-11 rounded-md text-xs font-headline-sm font-bold transition ${p.vascaMetri === v ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          >
                            {v}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Durata Minuti */}
                    <div>
                      <label htmlFor={`giorno-${dow}-durata`} className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">Durata seduta</label>
                      <input
                        id={`giorno-${dow}-durata`}
                        type="number"
                        min={30}
                        max={210}
                        step={5}
                        value={p.durataMin}
                        onChange={(e) => impostaParametriGiorno(dow, { ...p, durataMin: normalizzaDurata(Number(e.target.value)) })}
                        className="h-11 w-full rounded-lg border border-border-hairline bg-surface-container-low px-3 text-xs font-headline-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Numero Corsie per questo giorno */}
                    <div>
                      <span id={`giorno-${dow}-corsie-label`} className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">Corsie disponibili</span>
                      <div className="grid grid-cols-8 gap-1" role="group" aria-labelledby={`giorno-${dow}-corsie-label`}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => impostaParametriGiorno(dow, { ...p, numeroCorsie: n })}
                            className={`h-11 rounded-md text-[12px] font-headline-sm font-bold transition ${dayLanes === n ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Atleti Presenti per questo giorno */}
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant">
                        <Users size={13} className="text-primary" /> Atleti presenti ({dayPresent.length}/{atleti.length})
                      </label>
                      <div className="grid max-h-28 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                        {atleti.map(a => {
                          const isPres = dayPresent.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                const nextList = isPres ? dayPresent.filter(id => id !== a.id) : [...dayPresent, a.id];
                                impostaParametriGiorno(dow, { ...p, atletiPresentiIds: nextList });
                              }}
                              className={`flex min-h-[44px] items-center justify-between gap-1 rounded-lg border px-2 py-1 text-[12px] transition ${
                                isPres ? 'border-primary bg-primary font-headline-sm font-bold text-on-primary' : 'border-border-hairline bg-surface-container-lowest text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
                              }`}
                            >
                              <span className="truncate">{a.cognome} {a.nome?.[0]}.</span>
                              {isPres && <Check size={12} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Disposizione Ideale Corsie per questo giorno */}
                    <div className="rounded-lg border border-border-hairline bg-surface-container-low p-2.5 text-[12px]">
                      <div className="mb-1.5 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary">
                        <Sparkles size={12} />
                        <span>Corsie {DAY_OF_WEEK_NAMES[dow]}</span>
                      </div>
                      <div className="max-h-20 space-y-1 overflow-y-auto font-mono">
                        {Array.from({ length: dayLanes }).map((_, cIdx) => {
                          const laneNum = cIdx + 1;
                          const assignedAthletes = atleti
                            .filter(a => dayPresent.includes(a.id))
                            .filter((_, aIdx) => aIdx % dayLanes === cIdx);

                          return (
                            <div key={laneNum} className="truncate text-on-surface-variant">
                              <strong className="font-headline-sm text-primary">C{laneNum}:</strong>{' '}
                              {assignedAthletes.length === 0 ? 'Libera' : assignedAthletes.map(ath => ath.cognome).join(', ')}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
              <label htmlFor="piano-durata-default" className="font-label-caps text-label-caps uppercase text-on-surface-variant">Durata default stagione</label>
              <div className="flex items-center gap-2">
                <input
                  id="piano-durata-default"
                  type="number"
                  min={30}
                  max={210}
                  step={5}
                  value={impostazioni.durataDefaultMin || 90}
                  onChange={(e) => impostaDurataDefault(normalizzaDurata(Number(e.target.value)))}
                  className="h-11 w-24 rounded-lg border border-border-hairline bg-surface-container-lowest px-3 text-xs font-headline-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                />
                <span className="text-xs text-on-surface-variant">minuti</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border-hairline bg-surface-container-low p-3">
              <label className="mb-1.5 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                Metri base seduta <span className="normal-case text-primary">auto {parametriEffettivi.metriBaseSeduta}m</span>
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.metriBaseSeduta}`}
                value={metriTxt}
                onChange={e => setMetriTxt(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-hairline bg-surface-container-lowest px-3 font-headline-sm font-bold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-border-hairline bg-surface-container-low p-3">
              <label className="mb-1.5 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                Macrocicli <span className="normal-case text-primary">auto {parametriEffettivi.numeroMacrocicli}</span>
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.numeroMacrocicli}`}
                value={macroTxt}
                onChange={e => setMacroTxt(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-hairline bg-surface-container-lowest px-3 font-headline-sm font-bold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-border-hairline bg-surface-container-low p-3">
              <label className="mb-1.5 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                Scarico / N sett. <span className="normal-case text-primary">auto {parametriEffettivi.settimaneCicloCarico}</span>
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.settimaneCicloCarico}`}
                value={cicloTxt}
                onChange={e => setCicloTxt(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-hairline bg-surface-container-lowest px-3 font-headline-sm font-bold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border-hairline pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                salvaImpostazioni({
                  ...impostazioni,
                  metriBaseSeduta: metriTxt.trim() ? parseInt(metriTxt, 10) : undefined,
                  numeroMacrocicli: macroTxt.trim() ? parseInt(macroTxt, 10) : undefined,
                  settimaneCicloCarico: cicloTxt.trim() ? parseInt(cicloTxt, 10) : undefined
                });
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-4 font-headline-sm text-headline-sm font-bold text-on-primary shadow-card transition hover:bg-primary"
            >
              <Check size={16} /> Salva impostazioni
            </button>
            <button
              type="button"
              onClick={rigeneraPianoCompleto}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-container px-4 font-headline-sm text-headline-sm font-bold text-on-surface transition hover:bg-surface-container-high"
            >
              <RefreshCw size={16} className="text-primary" /> Rigenera piano
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Gare della stagione e iscrizioni */}
      {stagione && gare.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
          <div className="flex items-center gap-3 border-b border-border-hairline bg-surface-container-low px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
              <Flag size={17} />
            </span>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Gare e iscrizioni</h2>
              <p className="text-xs text-on-surface-variant">Iscrizioni per gara con eventi ammissibili (programma WPS) e avvisi su assenze.</p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            {[...gare]
              .sort((a, b) => a.dal.localeCompare(b.dal))
              .map(g => (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center gap-2 px-1">
                    <Flag size={13} className={`shrink-0 ${g.prioritaria ? 'text-tertiary' : 'text-on-surface-variant'}`} />
                    <span className="min-w-0 font-headline-sm text-headline-sm font-bold text-on-surface" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.nome}</span>
                    <span className="shrink-0 whitespace-nowrap font-label-caps text-label-caps uppercase text-on-surface-variant">
                      {formattaData(g.dal)}{g.dal !== g.al ? ` – ${formattaData(g.al)}` : ''}
                    </span>
                    {g.prioritaria && <Badge variant="coral" size="sm" className="shrink-0">A-race</Badge>}
                  </div>
                  <IscrittiGaraPanel gara={g} />
                </div>
              ))}
          </div>
        </section>
      )}

      {vistaPiano === 'programmazione' && (
      <section className="overflow-hidden rounded-xl border border-border-hairline bg-surface-container-lowest shadow-card">
        <div className="flex flex-col gap-3 border-b border-border-hairline bg-surface-container-low px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
              <Layers size={19} />
            </span>
            <div className="min-w-0">
              <p className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-primary">Periodizzazione</p>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Macrocicli, mesocicli e microcicli</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant">
              <Gauge size={13} className="text-secondary" />
              {macro.length} macro · {meso.length} meso · {micro.length} sett.
            </span>
            <button
              type="button"
              onClick={() => {
                if (macroCorrente) {
                  setSelectedMacroId(macroCorrente.id);
                  const cMe = meso.filter(me => me.macrocicloId === macroCorrente.id).find(me => !isBefore(oggi, me.inizio) && !isBefore(me.fine, oggi));
                  if (cMe) setSelectedMesoId(cMe.id);
                }
                setEspandiTutti(false);
              }}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-primary-fixed-dim bg-primary-fixed px-3 font-headline-sm text-label-lg font-bold text-on-primary-fixed transition hover:bg-primary-fixed-dim"
            >
              <Sparkles size={15} /> Oggi
            </button>
            <button
              type="button"
              onClick={() => setEspandiTutti(!espandiTutti)}
              className={`inline-flex h-11 items-center gap-1.5 rounded-lg px-3 font-headline-sm text-label-lg font-bold transition ${
                espandiTutti ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {espandiTutti ? 'Menu' : 'Tutti a vista'}
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">

        {/* CLICKABLE MENU MODE (DEFAULT) */}
        {!espandiTutti && (
          <div className="space-y-4">
            {/* Selettori periodo + legenda tipi microciclo */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <Select
                label="Macrociclo"
                value={macroAttivo ? String(macroAttivo.id) : ''}
                onChange={e => {
                  const id = parseInt(e.target.value, 10);
                  if (isNaN(id)) return;
                  setSelectedMacroId(id);
                  const firstMeso = meso.find(me => me.macrocicloId === id);
                  if (firstMeso) setSelectedMesoId(firstMeso.id);
                }}
                options={macro.map(ma => ({ value: String(ma.id), label: ma.nome }))}
              />
              <Select
                label="Mesociclo"
                value={mesoAttivo ? String(mesoAttivo.id) : ''}
                onChange={e => {
                  const id = parseInt(e.target.value, 10);
                  if (!isNaN(id)) setSelectedMesoId(id);
                }}
                options={mesoDiMacroAttivo.map(me => ({
                  value: String(me.id),
                  label: `${FASE_MESOCICLO_LABEL[me.fase]} · ${formattaData(me.inizio)}`
                }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
              {(['ADATTAMENTO', 'CARICO', 'SCARICO', 'RECUPERO', 'GARA', 'PAUSA'] as TipoMicrociclo[]).map(t => {
                const v = tipoMicroVisual(t);
                return (
                  <span key={t} className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant">
                    <span className={`h-2 w-2 rounded-full ${v.dot}`} />
                    {TIPO_MICROCICLO_LABEL[t]}
                  </span>
                );
              })}
            </div>

            {/* LIVELLO 1: Menu Cliccabile Macrocicli */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-fixed font-label-caps text-label-caps font-bold text-on-primary-fixed">1</span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Macrociclo</span>
              </div>
              <div className="ds-scroll-x ds-touch-pan flex w-full max-w-full gap-2 overflow-x-auto pb-1">
                {macro.map(ma => {
                  const isCurrent = !isBefore(oggi, ma.inizio) && !isBefore(ma.fine, oggi);
                  const isSelected = macroAttivo?.id === ma.id;
                  return (
                    <button
                      key={ma.id}
                      type="button"
                      onClick={() => {
                        setSelectedMacroId(ma.id);
                        // Auto-select first meso of this macro
                        const firstMeso = meso.find(me => me.macrocicloId === ma.id);
                        if (firstMeso) setSelectedMesoId(firstMeso.id);
                      }}
                      className={`min-w-[170px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary text-on-primary shadow-md'
                          : 'border-border-hairline bg-surface-container-lowest text-on-surface hover:border-primary/35 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-headline-sm text-headline-sm font-bold">{ma.nome}</span>
                        {isCurrent && (
                          <span className={`h-2 w-2 shrink-0 rounded-full ${isSelected ? 'bg-on-primary/80' : 'bg-status-live'}`} />
                        )}
                      </div>
                      <span className={`mt-1 block truncate font-label-caps text-label-caps ${isSelected ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                        {formattaData(ma.inizio)} – {formattaData(ma.fine)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVELLO 2: Menu Cliccabile Mesocicli del Macrociclo Selezionato */}
            {(() => {
              const currentMacro = macro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? macro[0];
              const activeMacroId = selectedMacroId ?? currentMacro?.id;
              const mesoOfActiveMacro = meso.filter(me => me.macrocicloId === activeMacroId);
              const currentMeso = mesoOfActiveMacro.find(me => !isBefore(oggi, me.inizio) && !isBefore(me.fine, oggi)) ?? mesoOfActiveMacro[0];
              const activeMesoId = selectedMesoId ?? currentMeso?.id;
              const activeMeso = mesoOfActiveMacro.find(me => me.id === activeMesoId) ?? mesoOfActiveMacro[0];
              const microOfActiveMeso = activeMeso ? micro.filter(mi => mi.mesocicloId === activeMeso.id) : [];

              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary-fixed font-label-caps text-label-caps font-bold text-on-secondary-fixed">2</span>
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Mesociclo</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mesoOfActiveMacro.map(me => {
                        const isCurrent = !isBefore(oggi, me.inizio) && !isBefore(me.fine, oggi);
                        const isSelected = activeMeso?.id === me.id;
                        const numMicro = micro.filter(mi => mi.mesocicloId === me.id).length;
                        return (
                          <button
                            key={me.id}
                            type="button"
                            onClick={() => setSelectedMesoId(me.id)}
                            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 font-headline-sm text-label-lg font-bold transition ${
                              isSelected
                                ? 'border-primary bg-primary text-on-primary shadow-sm'
                                : 'border-border-hairline bg-surface-container-lowest text-on-surface hover:border-primary/35 hover:bg-surface-container-low'
                            }`}
                          >
                            <span>{FASE_MESOCICLO_LABEL[me.fase]}</span>
                            <span className={`rounded-md px-1.5 py-0.5 font-label-caps text-label-caps ${
                              isSelected ? 'bg-on-primary/15 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
                            }`}>
                              {numMicro} sett.
                            </span>
                            {isCurrent && (
                              <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-on-primary/80' : 'bg-status-live'}`} title="Settimana corrente attiva" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Mesociclo Banner */}
                  {activeMeso && (
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_210px]">
                      <div className="relative overflow-hidden rounded-xl border border-primary-fixed-dim bg-gradient-to-br from-primary-fixed/45 via-surface-container-low to-surface-container-lowest p-4 shadow-card">
                        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
                        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary px-2.5 py-1 font-label-caps text-label-caps uppercase text-on-primary">
                                {FASE_MESOCICLO_LABEL[activeMeso.fase]}
                              </span>
                              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                                {formattaData(activeMeso.inizio)} – {formattaData(activeMeso.fine)}
                              </span>
                            </div>
                            <h3 className="mt-2 font-headline-sm text-headline-sm font-bold text-on-surface">
                              {microOfActiveMeso.length} settimane programmate
                            </h3>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {microCorrente ? `Settimana in evidenza: ${formattaData(microCorrente.inizio)} – ${formattaData(microCorrente.fine)}` : 'Nessuna microciclo disponibile'}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest/80 px-2.5 py-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant shadow-sm">
                              <Flag size={13} className="text-tertiary" /> Gare mappate
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest/80 px-2.5 py-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant shadow-sm">
                              <Timer size={13} className="text-secondary" /> Media volume
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center rounded-xl border border-border-hairline bg-surface-container-lowest p-4 shadow-card">
                        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Volume medio / settimana</span>
                        <span className="mt-1 font-display-lg-mobile text-display-lg-mobile font-bold text-primary">
                          {volumeMediaSettimana.toLocaleString('it-IT')}
                          <span className="ml-1 font-label-caps text-label-caps text-on-surface-variant">m</span>
                        </span>
                        <span className="mt-1 text-xs text-on-surface-variant">Calcolato sul mesociclo attivo</span>
                      </div>
                    </div>
                  )}

                  {/* Week Timeline Strip */}
                  {microOfActiveMeso.length > 0 && (
                    <div className="rounded-xl border border-border-hairline bg-surface-container-low p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-primary" />
                          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Timeline microcicli</span>
                        </div>
                        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{microOfActiveMeso.length} settimane</span>
                      </div>
                      <div className="ds-scroll-x ds-touch-pan flex gap-2 overflow-x-auto pb-1">
                        {microOfActiveMeso.map(mi => {
                          const visual = tipoMicroVisual(mi.tipo);
                          const isCurrentWeek = !isBefore(oggi, mi.inizio) && !isBefore(mi.fine, oggi);
                          const isFocused = microFocusId === mi.id;
                          return (
                            <button
                              key={mi.id}
                              type="button"
                              onClick={() => focusMicro(mi.id)}
                              className={`min-w-[138px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                                isCurrentWeek
                                  ? 'border-primary bg-primary text-on-primary shadow-md'
                                  : 'border-border-hairline bg-surface-container-lowest text-on-surface hover:border-primary/35 hover:bg-surface-container-low'
                              } ${isFocused && !isCurrentWeek ? 'ring-2 ring-secondary/40' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`truncate font-label-caps text-label-caps uppercase ${isCurrentWeek ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                                  {formattaData(mi.inizio)} – {formattaData(mi.fine)}
                                </span>
                                {isCurrentWeek && <CircleDot size={13} className="shrink-0 text-on-primary" />}
                              </div>
                              <div className="mt-1 flex items-end justify-between gap-2">
                                <span className="font-headline-sm text-headline-sm font-bold">{mi.volumeTargetMetri.toLocaleString('it-IT')}m</span>
                                <span className={`rounded-md px-1.5 py-0.5 font-label-caps text-label-caps ${visual.chip}`}>
                                  {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                </span>
                              </div>
                              <span className={`mt-1 block font-label-caps text-label-caps uppercase ${isCurrentWeek ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                                {mi.sedutePreviste} sedute · {mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste).toLocaleString('it-IT') : 0}m cad.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Microcycles Grid of the selected mesocycle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {microOfActiveMeso.map((mi, index) => {
                      const isCurrentWeek = !isBefore(oggi, mi.inizio) && !isBefore(mi.fine, oggi);
                      const isFocused = microFocusId === mi.id;
                      const gareInSettimana = gare.filter(
                        g => !isBefore(mi.fine, g.dal) && !isBefore(g.al, mi.inizio)
                      );
                      const metriSeduta = mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste) : 0;
                      const visual = tipoMicroVisual(mi.tipo);

                      return (
                        <article
                          key={mi.id}
                          id={`micro-card-${mi.id}`}
                          className={`relative scroll-mt-28 overflow-hidden rounded-xl border bg-surface-container-lowest shadow-card transition ${
                            isCurrentWeek ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border-hairline hover:shadow-pop'
                          } ${isFocused && !isCurrentWeek ? 'ring-2 ring-secondary/40' : ''}`}
                        >
                          <span className={`absolute inset-y-0 left-0 w-1.5 ${visual.bar}`} />
                          <div className="flex min-h-full flex-col justify-between gap-3 p-4 pl-5">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {isCurrentWeek && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 font-label-caps text-label-caps uppercase text-on-primary">
                                        <Sparkles size={11} /> Oggi
                                      </span>
                                    )}
                                    <span className={`rounded-md border px-2 py-1 font-label-caps text-label-caps uppercase ${visual.chip}`}>
                                      {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                    </span>
                                    <span className="rounded-md bg-surface-container px-2 py-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
                                      Sett. {index + 1}
                                    </span>
                                    {mi.bloccato && (
                                      <span title="Bloccato a mano" className="text-tertiary">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="mt-2 font-headline-sm text-headline-sm font-bold leading-snug text-on-surface">
                                    {formattaData(mi.inizio)} – {formattaData(mi.fine)}
                                  </h3>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Volume</span>
                                  <span className="font-stat-timer-mobile text-stat-timer-mobile font-bold text-primary">
                                    {mi.volumeTargetMetri.toLocaleString('it-IT')}
                                    <span className="ml-0.5 font-label-caps text-label-caps text-on-surface-variant">m</span>
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-surface-container-low p-2.5">
                                  <div className="flex items-center gap-1 text-secondary">
                                    <Activity size={14} />
                                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Sedute</span>
                                  </div>
                                  <p className="mt-1 font-headline-sm text-headline-sm font-bold text-on-surface">{mi.sedutePreviste}</p>
                                </div>
                                <div className="rounded-lg bg-surface-container-low p-2.5">
                                  <div className="flex items-center gap-1 text-primary">
                                    <Gauge size={14} />
                                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Media</span>
                                  </div>
                                  <p className="mt-1 font-headline-sm text-headline-sm font-bold text-on-surface">{metriSeduta.toLocaleString('it-IT')}m</p>
                                </div>
                                <div className="rounded-lg bg-surface-container-low p-2.5">
                                  <div className="flex items-center gap-1 text-tertiary">
                                    <Timer size={14} />
                                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Slot</span>
                                  </div>
                                  <p className="mt-1 truncate font-headline-sm text-headline-sm font-bold text-on-surface">
                                    {mi.inizioHHMM && mi.fineHHMM ? `${mi.inizioHHMM}–${mi.fineHHMM}` : '—'}
                                  </p>
                                </div>
                              </div>

                              {(mi.luogo || mi.note) && (
                                <div className="space-y-1 text-xs text-on-surface-variant">
                                  {mi.luogo && (
                                    <p className="flex items-center gap-1.5">
                                      <MapPin size={13} className="text-primary" /> {mi.luogo}
                                    </p>
                                  )}
                                  {mi.note && <p className="italic">{mi.note}</p>}
                                </div>
                              )}

                              {volumeMax > 0 && (
                                <div>
                                  <div className="mb-1 flex items-center justify-between font-label-caps text-label-caps uppercase text-on-surface-variant">
                                    <span>Carico relativo</span>
                                    <span>{Math.round((mi.volumeTargetMetri / volumeMax) * 100)}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                                    <div
                                      className={`h-full rounded-full ${visual.bar}`}
                                      style={{ width: `${(mi.volumeTargetMetri / volumeMax) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2 border-t border-border-hairline pt-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-label-caps text-label-caps uppercase text-primary">Codici per seduta</span>
                                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{generaDateSedute(mi.inizio, mi.fine, mi.sedutePreviste).length} slot</span>
                                </div>
                                <div className="max-h-52 space-y-2 overflow-y-auto pr-0.5">
                                  {generaDateSedute(mi.inizio, mi.fine, mi.sedutePreviste).map((dataSeduta, sIdx) => {
                                    const codici = generaCodiciSeduta({
                                      fase: activeMeso?.fase ?? 'PREPARAZIONE_SPECIFICA',
                                      tipoMicro: mi.tipo,
                                      condizioni: condizioni.filter(c => c.attiva),
                                    }).codici;
                                    return (
                                      <div
                                        key={sIdx}
                                        className="rounded-lg border border-border-hairline bg-surface-container-low p-2.5 transition hover:border-primary/40"
                                      >
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            Seduta {sIdx + 1}
                                          </span>
                                          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{formattaData(dataSeduta)}</span>
                                        </div>
                                        <CodiciSeduta codici={codici} compatto />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {gareInSettimana.length > 0 && (
                                <div className="space-y-1.5">
                                  {gareInSettimana.map(g => (
                                    <div key={g.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold ${
                                      g.prioritaria
                                        ? 'border-tertiary bg-tertiary-container text-on-tertiary-container shadow-sm'
                                        : 'border-tertiary-fixed-dim/60 bg-tertiary-fixed/50 text-on-tertiary-fixed'
                                    }`}>
                                      <Trophy size={14} className="shrink-0 text-tertiary-container" />
                                      <span className="min-w-0 flex-1 truncate">Gara: {g.nome}</span>
                                      {g.prioritaria && <Badge variant="coral" size="sm" className="shrink-0">A-race</Badge>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setMicroSelezionato(mi)}
                            className="flex min-h-[48px] w-full items-center justify-between border-t border-border-hairline px-4 py-2.5 text-left font-headline-sm text-label-lg font-bold text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
                          >
                            <span className="flex items-center gap-2">
                              <Edit2 size={14} /> Modifica sedute o volume
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* EXPAND ALL VIEW (OPTIONAL) */}
        {espandiTutti && (
          <div className="space-y-4">
            {macro.map(ma => {
              const mesoOfMacro = meso.filter(me => me.macrocicloId === ma.id);
              return (
                <div key={ma.id} className="space-y-3">
                  <div className="flex flex-col gap-2 rounded-xl border border-border-hairline bg-surface-container-low px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                        <Flag size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-headline-sm text-headline-sm font-bold text-on-surface">{ma.nome}</p>
                        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                          {formattaData(ma.inizio)} – {formattaData(ma.fine)}
                        </p>
                      </div>
                    </div>
                    {ma.obiettivo && (
                      <span className="w-fit rounded-full bg-primary-fixed px-2.5 py-1 font-label-caps text-label-caps uppercase text-on-primary-fixed">
                        {ma.obiettivo}
                      </span>
                    )}
                  </div>

                  {mesoOfMacro.map(me => {
                    const microOfMeso = micro.filter(mi => mi.mesocicloId === me.id);
                    return (
                      <div key={me.id} className="space-y-3 border-l-2 border-primary-fixed-dim pl-3 sm:pl-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-on-surface-variant">
                          <span className="rounded-full bg-primary-fixed px-3 py-1 font-label-caps text-label-caps uppercase text-on-primary-fixed">
                            {FASE_MESOCICLO_LABEL[me.fase]}
                          </span>
                          <span className="rounded-full bg-surface-container-highest px-2.5 py-1 font-label-caps text-label-caps uppercase">
                            {formattaData(me.inizio)} – {formattaData(me.fine)}
                          </span>
                          <span className="font-label-caps text-label-caps uppercase">{microOfMeso.length} sett.</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {microOfMeso.map(mi => {
                            const gareInSettimana = gare.filter(
                              g => !isBefore(mi.fine, g.dal) && !isBefore(g.al, mi.inizio)
                            );
                            const codici = generaCodiciSeduta({
                              fase: me.fase,
                              tipoMicro: mi.tipo,
                              condizioni: condizioni.filter(c => c.attiva),
                            }).codici;
                            const visual = tipoMicroVisual(mi.tipo);
                            const isCurrentWeek = !isBefore(oggi, mi.inizio) && !isBefore(mi.fine, oggi);

                            return (
                              <article
                                key={mi.id}
                                className={`relative overflow-hidden rounded-xl border bg-surface-container-lowest p-4 pl-5 shadow-card transition hover:shadow-pop ${
                                  isCurrentWeek ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border-hairline'
                                }`}
                              >
                                <span className={`absolute inset-y-0 left-0 w-1.5 ${visual.bar}`} />
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {isCurrentWeek && <span className="rounded-full bg-primary px-2 py-0.5 font-label-caps text-label-caps uppercase text-on-primary">Oggi</span>}
                                        <span className={`rounded-md border px-2 py-0.5 font-label-caps text-label-caps uppercase ${visual.chip}`}>
                                          {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                        </span>
                                        {mi.bloccato && <Lock size={14} className="text-tertiary" />}
                                      </div>
                                      <p className="mt-2 font-headline-sm text-headline-sm font-bold text-on-surface">
                                        {formattaData(mi.inizio)} – {formattaData(mi.fine)}
                                      </p>
                                    </div>
                                    <span className="shrink-0 font-stat-timer-mobile text-stat-timer-mobile font-bold text-primary">
                                      {mi.volumeTargetMetri.toLocaleString('it-IT')}m
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                                    <span className="inline-flex items-center gap-1"><Activity size={13} className="text-secondary" /> {mi.sedutePreviste} sedute</span>
                                    <span className="inline-flex items-center gap-1"><Gauge size={13} className="text-primary" /> {mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste).toLocaleString('it-IT') : 0}m cad.</span>
                                    {mi.luogo && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {mi.luogo}</span>}
                                  </div>

                                  <CodiciSeduta codici={codici} compatto />

                                  {gareInSettimana.map(g => (
                                    <div key={g.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold ${
                                      g.prioritaria
                                        ? 'border-tertiary bg-tertiary-container text-on-tertiary-container shadow-sm'
                                        : 'border-tertiary-fixed-dim/60 bg-tertiary-fixed/50 text-on-tertiary-fixed'
                                    }`}>
                                      <Trophy size={13} className="shrink-0" />
                                      <span className="min-w-0 flex-1 truncate">Gara: {g.nome}</span>
                                      {g.prioritaria && <Badge variant="coral" size="sm" className="shrink-0">A-race</Badge>}
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setMicroSelezionato(mi)}
                                  className="mt-3 flex min-h-[44px] w-full items-center justify-between border-t border-border-hairline px-1 pt-2 text-left font-headline-sm text-label-lg font-bold text-on-surface-variant transition hover:text-primary"
                                >
                                  <span className="flex items-center gap-2"><Edit2 size={14} /> Modifica microciclo</span>
                                  <ChevronRight size={16} />
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </section>
      )}

      {/* Edit Microcycle Modal */}
      {microSelezionato && (
        <ModalModificaMicro
          micro={microSelezionato}
          onChiudi={() => setMicroSelezionato(null)}
          onSalva={agg => {
            modificaMicro(agg);
            setMicroSelezionato(null);
          }}
          onSblocca={m => {
            sbloccaMicro(m);
            setMicroSelezionato(null);
          }}
        />
      )}

      {/* Smart Poolside Session Modal */}
      {/* Modal Modifica Evento / Gara */}
      {editEventModal && (
        <PianoEditEventModal
          evento={editEventModal}
          setEvento={setEditEventModal}
          stagioneId={stagione?.id ?? 1}
          modificaGara={modificaGara}
          modificaChiusura={modificaChiusura}
        />
      )}

      {/* Modal Parametri Piano & Disposizione Ideale Corsie */}
      {modalParametriPianoOpen && (
        <PianoParametriModal
          onChiudi={() => setModalParametriPianoOpen(false)}
          numCorsie={numCorsieDisponibili}
          setNumCorsie={setNumCorsieDisponibili}
          atleti={atleti}
          atletiPresentiIds={atletiPresentiIds}
          onTogglePresente={toggleAtletaPresente}
        />
      )}

      {/* Modal Archivia Stagione */}
      {archiviaOpen && stagione && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border-hairline bg-surface-container-lowest shadow-float sm:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-hairline bg-surface-container-low px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                  <Archive size={19} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Archivia stagione</h3>
                  <p className="truncate text-xs text-on-surface-variant">{stagione.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setArchiviaOpen(false)}
                aria-label="Chiudi archiviazione stagione"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
              {archiviaErrore && (
                <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error-container p-3 text-on-error-container">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="font-medium">{archiviaErrore}</span>
                </div>
              )}

              <p className="text-xs leading-relaxed text-on-surface-variant">
                Viene esportato un archivio compresso (.json.gz) con piano, gare, iscrizioni,
                chiusure e registro delle sedute della stagione. Poi la stagione viene rimossa
                per preparare la successiva.
              </p>

              <ul className="space-y-1.5 rounded-xl bg-surface-container-low p-3 text-on-surface">
                <li className="flex justify-between gap-2"><span className="text-on-surface-variant">Periodo</span><span className="font-semibold">{formattaData(stagione.inizio)} – {formattaData(stagione.fine)}</span></li>
                <li className="flex justify-between gap-2"><span className="text-on-surface-variant">Macrocicli / mesocicli / microcicli</span><span className="font-semibold">{macro.length} / {meso.length} / {micro.length}</span></li>
                <li className="flex justify-between gap-2"><span className="text-on-surface-variant">Gare / iscrizioni / chiusure</span><span className="font-semibold">{gare.length} / {iscrizioniGare.length} / {chiusure.length}</span></li>
                <li className="flex justify-between gap-2"><span className="text-on-surface-variant">Sedute nel registro</span><span className="font-semibold">{logInStagione}</span></li>
                <li className="flex justify-between gap-2"><span className="text-on-surface-variant">Restano attivi</span><span className="font-semibold">{atleti.length} atleti · {tempi.length} tempi · log fuori periodo</span></li>
              </ul>

              {archiviaConferma && (
                <div className="rounded-xl border border-error/30 bg-error-container p-3 text-on-error-container font-medium">
                  Conferma definitiva: l'archivio sostituisce i dati della stagione nell'app.
                  Prima di procedere viene creato uno snapshot di sicurezza.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setArchiviaConferma(false); setArchiviaOpen(false); }}
                  className="min-h-[44px] flex-1 rounded-xl border border-border-hairline bg-surface-container px-3 font-headline-sm text-xs font-bold text-on-surface transition hover:bg-surface-container-high"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={archiviaBusy}
                  onClick={async () => {
                    if (!archiviaConferma) {
                      setArchiviaConferma(true);
                      return;
                    }
                    setArchiviaBusy(true);
                    setArchiviaErrore(null);
                    try {
                      salvaSnapshotDati();
                      const archivio = archiviaStagione();
                      if (archivio) await scaricaArchivioStagione(archivio);
                      setArchiviaOpen(false);
                      setArchiviaConferma(false);
                    } catch (e) {
                      setArchiviaErrore(`Esportazione non riuscita: ${e instanceof Error ? e.message : String(e)}`);
                      setArchiviaConferma(false);
                    } finally {
                      setArchiviaBusy(false);
                    }
                  }}
                  className="min-h-[44px] flex-1 rounded-xl bg-primary px-3 font-headline-sm text-xs font-bold text-on-primary transition hover:brightness-95 disabled:opacity-60"
                >
                  {archiviaBusy
                    ? 'Esportazione…'
                    : archiviaConferma
                      ? 'Conferma ed esporta'
                      : 'Esporta archivio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

