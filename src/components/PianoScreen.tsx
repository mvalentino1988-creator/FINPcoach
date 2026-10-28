import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../data/AppContext';
import {
  DayOfWeekNum,
  DAY_OF_WEEK_NAMES,
  FaseMesociclo,
  FASE_MESOCICLO_LABEL,
  Microciclo,
  ParametriSeduta,
  SchedaSeduta,
  TipoMicrociclo,
  TIPO_MICROCICLO_LABEL
} from '../types';
import { formattaData, parseData, todayISO, isBefore, addDays, daysBetween, toDateObj, isInRange, formatDataInput } from '../domain/dateUtils';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { IndicatoreCodici } from './IndicatoreCodici';
import { ElencoAvvisi } from './ElencoAvvisi';
import { SchedaSedutaModal } from './SchedaSedutaModal';
import { Sezione } from './Sezione';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';
import { normalizzaDurata } from '../domain/parametriSeduta';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Sliders,
  Trash2,
  Trophy,
  Unlock,
  Waves,
  X
} from 'lucide-react';

const NuovaStagioneForm: React.FC<any> = ({
  inizioStagione, setInizioStagione, fineStagione, setFineStagione, nomeStagione, setNomeStagione, inizioParsed, fineEffettiva, nomeAuto, nomeEffettivo, creaStagione
}) => {
  return (
    <div className="space-y-4 max-w-xl mx-auto p-6 ds-card">
      <h2 className="font-headline text-lg font-bold text-on-surface">Crea Nuova Stagione Agonistica</h2>
      <div className="space-y-3 text-xs">
        <div>
          <label className="block font-bold mb-1">Data Inizio (gg/mm/aaaa)</label>
          <input
            type="text"
            value={inizioStagione}
            onChange={e => setInizioStagione(formatDataInput(e.target.value))}
            className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Data Fine (gg/mm/aaaa)</label>
          <input
            type="text"
            value={fineStagione}
            onChange={e => setFineStagione(formatDataInput(e.target.value))}
            placeholder={fineEffettiva ? formattaData(fineEffettiva) : ''}
            className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Nome Stagione</label>
          <input
            type="text"
            value={nomeStagione}
            onChange={e => setNomeStagione(e.target.value)}
            placeholder={nomeAuto}
            className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const ini = parseData(inizioStagione);
            const fin = parseData(fineStagione) || parseData(fineEffettiva);
            if (ini && fin) {
              creaStagione(nomeEffettivo || 'Stagione Agonistica', ini, fin);
            }
          }}
          className="w-full ds-btn-primary justify-center py-3"
        >
          Crea Stagione e Piano Automatico
        </button>
      </div>
    </div>
  );
};

export const PianoScreen: React.FC = () => {
  const {
    atleti,
    stagione,
    chiusure,
    gare,
    macro,
    meso,
    micro,
    avvisiPiano,
    impostazioni,
    parametriEffettivi,
    creaStagione,
    modificaDateStagione,
    eliminaStagione,
    aggiungiChiusura,
    modificaChiusura,
    eliminaChiusura,
    aggiungiFestivitaNazionali,
    aggiungiGara,
    modificaGara,
    eliminaGara,
    salvaImpostazioni,
    impostaParametriGiorno,
    impostaDurataDefault,
    rigeneraPianoCompleto,
    modificaMicro,
    sbloccaMicro
  } = useApp();

  const [chiusureEspanso, setChiusureEspanso] = useState(false);
  const [gareEspanso, setGareEspanso] = useState(false);
  const [parametriEspanso, setParametriEspanso] = useState(false);
  const [microSelezionato, setMicroSelezionato] = useState<Microciclo | null>(null);
  const [schedaSmart, setSchedaSmart] = useState<SchedaSeduta | null>(null);

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
  const [editEventModal, setEditEventModal] = useState<{
    open: boolean;
    type: 'gara' | 'chiusura';
    id: number;
    title: string;
    dal: string;
    al: string;
    luogo: string;
    prioritaria: boolean;
  } | null>(null);

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

  // Clickable Menu Navigation for Cycles
  const [selectedMacroId, setSelectedMacroId] = useState<number | null>(null);
  const [selectedMesoId, setSelectedMesoId] = useState<number | null>(null);
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

  // Form nuova chiusura
  const [cDal, setCDal] = useState('');
  const [cAl, setCAl] = useState('');
  const [cMotivo, setCMotivo] = useState('');

  // Form nuova gara
  const [modalGaraOpen, setModalGaraOpen] = useState(false);

  // Season Statistics & Timeline Computation
  const seasonStats = React.useMemo(() => {
    if (!stagione) return null;
    const startStr = stagione.inizio;
    const endStr = stagione.fine;
    if (!startStr || !endStr) return null;

    const startMs = toDateObj(startStr).getTime();
    const endMs = toDateObj(endStr).getTime();
    const currentMs = toDateObj(oggi).getTime();
    const totalDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((currentMs - startMs) / (1000 * 60 * 60 * 24))));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const progress = Math.round((elapsedDays / totalDays) * 100);
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const weekNum = Math.min(totalWeeks, Math.max(1, Math.ceil(elapsedDays / 7)));

    const microCurr = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi));
    const mesoCurr = microCurr ? meso.find(me => me.id === microCurr.mesocicloId) : null;
    const macroCurr = mesoCurr ? macro.find(ma => ma.id === mesoCurr.macrocicloId) : null;

    const nextGara = gare.filter(g => !isBefore(g.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal))[0];
    const garaDiffDays = nextGara ? Math.max(0, Math.ceil((toDateObj(nextGara.dal).getTime() - currentMs) / (1000 * 60 * 60 * 24))) : null;

    const nextChiusura = chiusure.filter(c => !isBefore(c.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal))[0];

    return {
      progress,
      elapsedDays,
      remainingDays,
      weekNum,
      totalWeeks,
      microCurr,
      mesoCurr,
      macroCurr,
      nextGara,
      garaDiffDays,
      nextChiusura
    };
  }, [stagione, oggi, micro, meso, macro, gare, chiusure, rigeneraPianoCompleto]);
  const [gNome, setGNome] = useState('');
  const [gDal, setGDal] = useState('');
  const [gAl, setGAl] = useState('');
  const [gPrioManuale, setGPrioManuale] = useState<boolean | null>(null);
  const gPrioritaria = gPrioManuale ?? AutoPianificatore.garaProbabilmentePrioritaria(gNome);

  // Settings inputs
  const [metriTxt, setMetriTxt] = useState(impostazioni.metriBaseSeduta?.toString() ?? '');
  const [macroTxt, setMacroTxt] = useState(impostazioni.numeroMacrocicli?.toString() ?? '');
  const [cicloTxt, setCicloTxt] = useState(impostazioni.settimaneCicloCarico?.toString() ?? '');

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

  // Pull to refresh - disattivato su mouse, ricalcolo semplice invece di reload
  const isPointerFine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      if (isPointerFine) return;
      // Ricalcolo semplice invece di reload
      rigeneraPianoCompleto();
    },
    threshold: 100
  });

  return (
    <div className="space-y-5 relative">
      {/* Intestazione pagina — stile dashboard */}
      <PageHeader
        label="Stagione Agonistica FINP"
        title={stagione?.nome ?? 'Stagione'}
        icon={<Calendar size={13} />}
        meta={`${stagione?.inizio ? formattaData(stagione.inizio) : ''} – ${stagione?.fine ? formattaData(stagione.fine) : ''} · Vasca da ${stagione?.vascaMetri ?? 25} m`}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalParametriPianoOpen(true)}
              className="ds-btn-secondary !min-h-[40px] !px-2.5 shrink-0 text-xs"
              title="Configura parametri e corsie"
            >
              <Sliders size={15} />
              <span className="hidden sm:inline">Parametri & Corsie</span>
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
              className="ds-btn-ghost !min-h-[40px] !px-2.5 shrink-0"
              title="Modifica date stagione"
            >
              <Edit2 size={15} />
              <span className="hidden sm:inline">Date</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Eliminare la stagione? Verranno eliminati chiusure, gare e piano. Gli atleti restano salvati.')) {
                  eliminaStagione();
                }
              }}
              className="ds-btn-danger !min-h-[40px] !px-2.5 shrink-0"
              title="Elimina stagione"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Elimina</span>
            </button>
          </div>
        }
      />

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

      {/* SEASON VIBRANT HERO CARD */}
      {seasonStats && (
        <section className="ds-card p-4 bg-gradient-to-br from-[#0A2A66] via-[#1457E0] to-[#0A2A66] text-white shadow-primary-sm space-y-4">
          {/* Row 1: Week info & Season progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-xs uppercase tracking-wider font-headline">
                  Settimana {seasonStats.weekNum} di {seasonStats.totalWeeks}
                </span>
                {seasonStats.mesoCurr && (
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-white font-bold text-xs font-headline">
                    {seasonStats.mesoCurr.fase ? FASE_MESOCICLO_LABEL[seasonStats.mesoCurr.fase] : 'Fase Attiva'}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-headline mt-1">
                {seasonStats.macroCurr ? seasonStats.macroCurr.nome : 'Stagione 2026/27'}
                {seasonStats.mesoCurr ? ` · ${FASE_MESOCICLO_LABEL[seasonStats.mesoCurr.fase]}` : ''}
              </h2>
            </div>

            {/* Countdown Prossima Gara */}
            {seasonStats.nextGara && (
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 flex items-center gap-3 shrink-0">
                <Trophy size={20} className="text-tertiary-fixed shrink-0" />
                <div>
                  <div className="text-[10px] text-white/80 uppercase font-bold tracking-wider">Prossima Gara</div>
                  <div className="font-bold text-xs truncate max-w-[140px]">{seasonStats.nextGara.nome}</div>
                </div>
                <div className="text-right pl-2 border-l border-white/20">
                  <span className="text-xl font-extrabold font-headline tabular-nums">{seasonStats.garaDiffDays}</span>
                  <span className="text-[9px] block uppercase opacity-80">giorni</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold font-headline text-white/90">
              <span>Progresso Stagione: {seasonStats.progress}%</span>
              <span>{seasonStats.elapsedDays} giorni trascorsi ({seasonStats.remainingDays} rimanenti)</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-tertiary to-tertiary-fixed h-full rounded-full transition-all duration-500"
                style={{ width: `${seasonStats.progress}%` }}
              />
            </div>
          </div>

          {/* Row 3: Horizontal Timeline Bar of Full Season */}
          <div className="space-y-1 pt-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-white/70">Timeline Stagione (Macrocicli e Gare)</div>
            <div className="relative h-6 bg-black/20 rounded-xl overflow-hidden flex items-center p-0.5">
              {macro.map((m, i) => (
                <div
                  key={m.id}
                  className="h-full rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-[10px] font-bold text-white/90 border-r border-black/20 truncate px-1 cursor-pointer"
                  style={{ width: `${100 / Math.max(1, macro.length)}%` }}
                  title={`${m.nome} (${formattaData(m.inizio)} - ${formattaData(m.fine)})`}
                  onClick={() => setSelectedMacroId(m.id)}
                >
                  {m.nome}
                </div>
              ))}
              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-tertiary shadow-orange-glow z-10"
                style={{ left: `${seasonStats.progress}%` }}
                title={`Oggi: ${formattaData(oggi)}`}
              />
            </div>
          </div>

          {/* Row 4: Mini Weekly Load Chart */}
          {micro.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/80 font-bold">
                <span>Carico Settimanale (Microcicli)</span>
                <span className="text-[10px] text-tertiary-fixed-dim">{avvisiPiano.length} avvisi carico</span>
              </div>
              <div className="h-10 flex items-end gap-1 overflow-x-auto pb-1">
                {micro.slice(0, 16).map((mc, idx) => {
                  const maxVol = Math.max(...micro.map(m => m.volumeTargetMetri || 2000));
                  const hPercent = Math.max(15, Math.round(((mc.volumeTargetMetri || 1500) / maxVol) * 100));
                  const isCurrent = isInRange(oggi, mc.inizio, mc.fine);
                  return (
                    <div
                      key={mc.id}
                      className="flex-1 min-w-[12px] flex flex-col items-center gap-0.5 group cursor-pointer"
                      onClick={() => setMicroSelezionato(mc)}
                      title={`Micro ${idx + 1}: ${mc.volumeTargetMetri}m (${mc.tipo})`}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          isCurrent
                            ? 'bg-tertiary shadow-orange-glow'
                            : mc.tipo === 'SCARICO'
                            ? 'bg-secondary'
                            : 'bg-white/40 group-hover:bg-white'
                        }`}
                        style={{ height: `${hPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modal Modifica Date Stagione */}
      {modificaDateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-md w-full border border-slate-200/70 max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/70 flex items-center justify-between gap-2 bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-on-surface text-sm">Modifica Date Stagione</h3>
                  <span className="text-[11px] text-on-surface-variant">{stagione.nome}</span>
                </div>
              </div>
              <button
                onClick={() => setModificaDateOpen(false)}
                aria-label="Chiudi modifica date stagione"
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
              {modError && (
                <div className="p-3 bg-error-container text-on-error-container border border-error/40 rounded-xl font-medium">
                  {modError}
                </div>
              )}

              <p className="text-on-surface-variant leading-relaxed text-[11px]">
                Modificando le date di inizio e fine, la timeline della stagione, i macrocicli e i mesocicli
                verranno ricalcolati mantenendo tutti i microcicli bloccati manualmente.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Nuova data di inizio (gg/mm/aaaa) *
                  </label>
                  <input
                    type="text"
                    value={modInizio}
                    onChange={e => setModInizio(formatDataInput(e.target.value))}
                    placeholder="es. 01/09/2026"
                    className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Nuova data di fine (gg/mm/aaaa) *
                  </label>
                  <input
                    type="text"
                    value={modFine}
                    onChange={e => setModFine(formatDataInput(e.target.value))}
                    placeholder="es. 30/06/2027"
                    className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low border-t border-slate-200/70 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModificaDateOpen(false)}
                className="px-4 h-12 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl"
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
                className="px-4 h-12 text-xs font-bold bg-primary-container hover:bg-primary text-on-primary rounded-xl shadow-card transition"
              >
                Salva e Ricalcola Piano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Eventi & Gare della Stagione (Unificati) */}
      <Sezione
        titolo="Eventi & Gare della Stagione"
        icon={<Trophy size={16} />}
        badge={chiusure.length + gare.length}
        riepilogoChiuso={`${gare.length} gare · ${chiusure.length} chiusure/festività`}
        storageKey="piano_eventi_gare"
        defaultAperto={false}
      >
        <div className="space-y-3 pt-1 text-xs">
          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={aggiungiFestivitaNazionali}
                className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-primary rounded-xl font-bold border border-outline-variant/60"
              >
                + Festività Nazionali
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalGaraOpen(true)}
              className="ds-btn-primary !min-h-[36px] !px-3 text-xs"
            >
              <Plus size={14} />
              <span>Aggiungi Gara 🏆</span>
            </button>
          </div>

          {/* Unified Event List (Races + Closures) */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {[
              ...gare.map(g => ({ id: `gara-${g.id}`, rawId: g.id, type: 'gara' as const, date: g.dal, endDate: g.al, title: g.nome, detail: g.luogo, priority: g.prioritaria })),
              ...chiusure.map(c => ({ id: `chiusura-${c.id}`, rawId: c.id, type: 'chiusura' as const, date: c.dal, endDate: c.al, title: c.motivo, detail: 'Chiusura vasca', priority: false }))
            ]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(evt => (
              <div
                key={evt.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                  evt.type === 'gara'
                    ? evt.priority ? 'bg-tertiary-fixed/30 border-tertiary-fixed-dim' : 'bg-surface-container-low border-outline-variant'
                    : 'bg-error-container/40 border-error/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {evt.type === 'gara' ? (
                    <Trophy size={16} className={evt.priority ? 'text-tertiary' : 'text-primary'} />
                  ) : (
                    <Calendar size={16} className="text-error" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-on-surface truncate">
                      {evt.title} {evt.priority && <span className="text-tertiary font-bold">(A-Race)</span>}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      {formattaData(evt.date)}{evt.endDate && evt.endDate !== evt.date ? ` – ${formattaData(evt.endDate)}` : ''} {evt.detail ? `· ${evt.detail}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditEventModal({
                        open: true,
                        type: evt.type,
                        id: evt.rawId,
                        title: evt.title,
                        dal: formattaData(evt.date),
                        al: evt.endDate ? formattaData(evt.endDate) : formattaData(evt.date),
                        luogo: evt.detail || '',
                        prioritaria: evt.priority
                      });
                    }}
                    className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg"
                    title="Modifica"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (evt.type === 'gara') eliminaGara(evt.rawId);
                      else eliminaChiusura(evt.rawId);
                    }}
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-lg"
                    title="Elimina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form Aggiungi Chiusura Custom */}
          <div className="p-3 bg-surface-container-low border border-dashed border-outline-variant rounded-xl space-y-2">
            <div className="font-headline font-bold text-xs text-primary">Aggiungi Chiusura Vasca Personalizzata</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Dal (gg/mm/aaaa)"
                value={cDal}
                onChange={e => setCDal(formatDataInput(e.target.value))}
                className="w-full px-3 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Al (gg/mm/aaaa)"
                value={cAl}
                onChange={e => setCAl(formatDataInput(e.target.value))}
                className="w-full px-3 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              />
            </div>
            <input
              type="text"
              placeholder="Motivo (es. Chiusura impianti)"
              value={cMotivo}
              onChange={e => setCMotivo(e.target.value)}
              className="w-full px-3 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={() => {
                const d1 = parseData(cDal);
                const d2 = parseData(cAl) ?? d1;
                if (d1 && d2 && cMotivo.trim()) {
                  aggiungiChiusura(d1, d2, cMotivo.trim());
                  setCDal('');
                  setCAl('');
                  setCMotivo('');
                }
              }}
              className="w-full ds-btn-secondary !min-h-[38px] text-xs justify-center"
            >
              Salva Chiusura
            </button>
          </div>
        </div>
      </Sezione>

      {/* Modal Nuova Gara Ad Hoc */}
      {modalGaraOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-md w-full p-5 border border-slate-200/70 space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
              <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                <Trophy size={18} className="text-tertiary-container" />
                <span>Inserisci Nuova Gara Agonistica</span>
              </h3>
              <button onClick={() => setModalGaraOpen(false)} className="p-1 text-on-surface-variant hover:text-on-surface-variant rounded">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-on-surface mb-1">Nome Gara / Manifestazione *</label>
                <input
                  type="text"
                  placeholder="es. Campionati Italiani Assoluti FINP..."
                  value={gNome}
                  onChange={e => setGNome(e.target.value)}
                  className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-on-surface mb-1">Data Inizio *</label>
                  <input
                    type="text"
                    placeholder="gg/mm/aaaa"
                    value={gDal}
                    onChange={e => setGDal(formatDataInput(e.target.value))}
                    className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">Data Fine (opz.)</label>
                  <input
                    type="text"
                    placeholder="gg/mm/aaaa"
                    value={gAl}
                    onChange={e => setGAl(formatDataInput(e.target.value))}
                    className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 bg-surface-container-low/50 border border-tertiary-fixed-dim rounded-xl cursor-pointer font-medium text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={gPrioritaria}
                  onChange={e => setGPrioManuale(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <div>
                  <span className="block font-bold">Gara Prioritaria (A-Race)</span>
                  <span className="text-[11px] text-on-surface-variant">Attiva picco di forma, scarico e tapering pre-gara.</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/70">
              <button
                type="button"
                onClick={() => setModalGaraOpen(false)}
                className="px-4 h-12 text-on-surface-variant hover:bg-surface-container rounded-xl font-semibold text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={!gNome.trim() || !parseData(gDal)}
                onClick={() => {
                  const d1 = parseData(gDal);
                  const d2 = parseData(gAl) ?? d1;
                  if (d1 && d2) {
                    aggiungiGara(gNome.trim(), d1, d2, gPrioritaria);
                    setGNome('');
                    setGDal('');
                    setGAl('');
                    setGPrioManuale(null);
                    setModalGaraOpen(false);
                  }
                }}
                className="px-5 h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary rounded-xl font-bold text-xs shadow-card"
              >
                Salva Gara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parametri Auto-Pianificatore & Controlli */}
      <Sezione
        titolo="Parametri Auto-Pianificatore & Controlli sul Piano"
        icon={<Sparkles size={16} />}
        badge={avvisiPiano.length > 0 ? avvisiPiano.length : undefined}
        riepilogoChiuso={avvisiPiano.length > 0 ? `${avvisiPiano.length} avvisi sul carico attivi` : "Pianificazione e controlli ottimali"}
        storageKey="piano_parametri"
        defaultAperto={false}
      >
        <div className="space-y-4 pt-1 text-xs">
          {avvisiPiano.length > 0 && (
            <div className="space-y-1.5 pb-3 border-b border-slate-200/70">
              <h4 className="font-bold text-on-tertiary-fixed text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️ Controlli e Avvisi sul Piano di Carico</span>
              </h4>
              <ElencoAvvisi avvisi={avvisiPiano} />
            </div>
          )}

          <p className="text-xs text-on-surface-variant mb-2">
            Il piano si adatta automaticamente all'età media, ai dati storici di carico e alle gare.
            Seleziona i giorni di allenamento e configura vasca, durata e corsie per i soli giorni attivi.
          </p>

          {/* 1. Giorni di Allenamento Settimanali (PRIMA) */}
          <div className="space-y-2 pb-3 border-b border-outline-variant/60">
            <label className="block font-headline font-bold text-sm text-on-surface">
              Giorni di Allenamento Settimanali{' '}
              <span className="font-normal text-xs text-on-surface-variant">
                {impostazioni.giorni == null ? '(attualmente automatici)' : '(impostati a mano)'}
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => salvaImpostazioni({ ...impostazioni, giorni: undefined })}
                className={`min-h-[40px] px-3 rounded-full text-label-md font-label-md transition ${
                  impostazioni.giorni == null
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Auto
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
                    className={`min-h-[40px] px-3 rounded-full text-label-md font-label-md transition ${
                      active ? 'bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim font-bold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {DAY_OF_WEEK_NAMES[dow]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Programmazione Giornaliera (DOPO, mostra SOLO i giorni selezionati) */}
          <div className="space-y-2 pt-1">
            <label className="block font-headline font-bold text-sm text-on-surface">
              Programmazione Giornaliera (Vasca, Durata, Corsie & Atleti Presenti)
            </label>
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
                  <div key={dow} className="rounded-2xl border border-outline-variant bg-surface-container-low p-3 space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
                      <span className="font-headline font-bold text-sm text-on-surface">{DAY_OF_WEEK_NAMES[dow]}</span>
                      <span className="ds-label text-primary font-mono">{p.vascaMetri}m · {p.durataMin}' · {dayLanes} corsie</span>
                    </div>

                    {/* Vasca 25/50 */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Vasca Impianto</label>
                      <div className="flex items-center gap-1">
                        {[25, 50].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => impostaParametriGiorno(dow, { ...p, vascaMetri: v })}
                            className={`flex-1 h-8 rounded-lg text-xs font-bold font-headline transition ${p.vascaMetri === v ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface'}`}
                          >
                            {v}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Durata Minuti */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Durata Seduta (minuti)</label>
                      <input
                        type="number"
                        min={30}
                        max={210}
                        step={5}
                        value={p.durataMin}
                        onChange={(e) => impostaParametriGiorno(dow, { ...p, durataMin: normalizzaDurata(Number(e.target.value)) })}
                        className="w-full px-2.5 h-8 border border-outline-variant rounded-lg text-xs font-bold bg-surface-container-lowest"
                      />
                    </div>

                    {/* Numero Corsie per questo giorno */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Numero Corsie Disponibili</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => impostaParametriGiorno(dow, { ...p, numeroCorsie: n })}
                            className={`flex-1 h-7 rounded-md text-[10px] font-bold transition ${dayLanes === n ? 'bg-primary text-white' : 'bg-surface-container text-on-surface'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Atleti Presenti per questo giorno */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
                        Atleti Presenti ({dayPresent.length}/{atleti.length})
                      </label>
                      <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-0.5">
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
                              className={`px-1.5 py-1 rounded-md text-[10px] border truncate flex items-center justify-between transition ${
                                isPres ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-surface-container-lowest border-outline-variant/60 text-on-surface-variant'
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
                    <div className="pt-2 border-t border-outline-variant/60 text-[10px]">
                      <div className="font-bold text-primary mb-1 flex items-center gap-1 font-headline">
                        <Sparkles size={11} />
                        <span>Disposizione Corsie {DAY_OF_WEEK_NAMES[dow]}:</span>
                      </div>
                      <div className="space-y-0.5 max-h-20 overflow-y-auto font-mono">
                        {Array.from({ length: dayLanes }).map((_, cIdx) => {
                          const laneNum = cIdx + 1;
                          const assignedAthletes = atleti
                            .filter(a => dayPresent.includes(a.id))
                            .filter((_, aIdx) => aIdx % dayLanes === cIdx);

                          return (
                            <div key={laneNum} className="truncate text-on-surface-variant">
                              <strong className="text-primary">C{laneNum}:</strong>{' '}
                              {assignedAthletes.length === 0 ? 'Libera' : assignedAthletes.map(ath => ath.cognome).join(', ')}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <label className="text-xs text-on-surface-variant font-bold">Durata default stagione:</label>
              <input
                type="number"
                min={30}
                max={210}
                step={5}
                value={impostazioni.durataDefaultMin || 90}
                onChange={(e) => impostaDurataDefault(normalizzaDurata(Number(e.target.value)))}
                className="w-24 px-2 h-9 border border-outline-variant rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          {/* Metric inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-on-surface mb-1">
                Metri base seduta (auto {parametriEffettivi.metriBaseSeduta}m)
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.metriBaseSeduta}`}
                value={metriTxt}
                onChange={e => setMetriTxt(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-on-surface mb-1">
                Macrocicli (auto {parametriEffettivi.numeroMacrocicli})
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.numeroMacrocicli}`}
                value={macroTxt}
                onChange={e => setMacroTxt(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-on-surface mb-1">
                Scarico ogni N sett. (auto {parametriEffettivi.settimaneCicloCarico})
              </label>
              <input
                type="number"
                placeholder={`Auto: ${parametriEffettivi.settimaneCicloCarico}`}
                value={cicloTxt}
                onChange={e => setCicloTxt(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200/70">
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
              className="px-4 h-12 bg-primary-container hover:bg-primary text-on-primary font-bold rounded-xl text-xs transition"
            >
              Salva Impostazioni
            </button>
            <button
              type="button"
              onClick={rigeneraPianoCompleto}
              className="flex items-center gap-1.5 px-4 h-12 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl text-xs transition"
            >
              <RefreshCw size={14} />
              Rigenera Piano
            </button>
          </div>
        </div>
      </Sezione>



      <Sezione
        titolo="Programmazione & Cicli di Carico"
        icon={<Calendar size={18} />}
        badge={`${micro.length} sett.`}
        riepilogoChiuso={`Macro: ${macro.length} · Meso: ${meso.length} · Micro: ${micro.length}`}
        storageKey="piano_programmazione"
        defaultAperto={true}
      >
        <div className="space-y-4 pt-1">
          {/* Navigation & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/70">
            <div>
              <span className="text-xs text-on-surface-variant font-medium">
                {macro.length} macrocicli · {meso.length} mesocicli · {micro.length} settimane totali
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Jump to current week */}
            <button
              type="button"
              onClick={() => {
                const cMa = macro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi));
                if (cMa) {
                  setSelectedMacroId(cMa.id);
                  const cMe = meso.filter(me => me.macrocicloId === cMa.id).find(me => !isBefore(oggi, me.inizio) && !isBefore(me.fine, oggi));
                  if (cMe) setSelectedMesoId(cMe.id);
                }
                setEspandiTutti(false);
              }}
              className="px-3 h-12 rounded-xl bg-surface-container-low hover:bg-primary-fixed text-primary-container border border-primary-fixed-dim text-xs font-bold transition flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Vai a Settimana di Oggi</span>
            </button>

            {/* Toggle Expand All */}
            <button
              type="button"
              onClick={() => setEspandiTutti(!espandiTutti)}
              className="px-3 h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition"
            >
              {espandiTutti ? 'Menu Cliccabile' : 'Tutti a Vista'}
            </button>
          </div>
        </div>

        {/* CLICKABLE MENU MODE (DEFAULT) */}
        {!espandiTutti && (
          <div className="space-y-4">
            {/* LIVELLO 1: Menu Cliccabile Macrocicli */}
            <div className="space-y-1.5">
              <span className="ds-label block">
                1. Seleziona Macrociclo:
              </span>
              <div className="ds-scroll-x ds-touch-pan flex gap-2 pb-1">
                {macro.map(ma => {
                  const isCurrent = !isBefore(oggi, ma.inizio) && !isBefore(ma.fine, oggi);
                  const isSelected = (selectedMacroId ?? macro[0]?.id) === ma.id;
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
                      className={`px-3.5 min-h-[48px] rounded-xl text-label-lg font-label-lg transition shrink-0 border text-left flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-primary-container text-on-primary border-primary-container shadow-card'
                          : 'bg-surface-container-lowest text-on-surface border-slate-200/70 hover:border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{ma.nome}</span>
                        {isCurrent && (
                          <span className="text-label-caps px-1.5 py-0.5 rounded-full font-label-caps bg-primary-fixed text-on-primary-fixed">
                            In corso
                          </span>
                        )}
                      </div>
                      <span className={`text-label-caps font-normal ${isSelected ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>
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
                  <div className="space-y-1.5">
                    <span className="ds-label block">
                      2. Seleziona Mesociclo:
                    </span>
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
                            className={`px-3 min-h-[48px] rounded-xl text-label-lg font-label-lg transition border flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-primary-container text-on-primary border-primary shadow-card'
                                : 'bg-surface-container-lowest text-on-surface border-slate-200/70 hover:bg-surface-container-low'
                            }`}
                          >
                            <span>{FASE_MESOCICLO_LABEL[me.fase]}</span>
                            <span className={`text-label-caps px-1.5 py-0.5 rounded-md font-label-caps ${
                              isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              {numMicro} sett.
                            </span>
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-primary-fixed shrink-0" title="Settimana corrente attiva" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Mesociclo Banner */}
                  {activeMeso && (
                    <div className="p-3.5 bg-surface-container-low rounded-xl border border-primary-fixed-dim flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="ds-subtitle text-primary-container">
                            {FASE_MESOCICLO_LABEL[activeMeso.fase]}
                          </span>
                          <span className="text-body-base font-body-base text-on-surface-variant">
                            ({formattaData(activeMeso.inizio)} – {formattaData(activeMeso.fine)})
                          </span>
                        </div>
                        <span className="text-body-base font-body-base text-on-surface-variant">
                          {microOfActiveMeso.length} settimane di allenamento programmate in questa fase
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-body-base font-body-base text-on-surface-variant">
                        <span>Volume medio seduta:{' '}
                          <strong className="text-primary-container">
                            {microOfActiveMeso.length > 0 && microOfActiveMeso[0].sedutePreviste > 0
                              ? Math.round(microOfActiveMeso[0].volumeTargetMetri / microOfActiveMeso[0].sedutePreviste)
                              : 1800} m
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Microcycles Grid of the selected mesocycle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {microOfActiveMeso.map(mi => {
                      const isCurrentWeek = !isBefore(oggi, mi.inizio) && !isBefore(mi.fine, oggi);
                      const gareInSettimana = gare.filter(
                        g => !isBefore(mi.fine, g.dal) && !isBefore(g.al, mi.inizio)
                      );
                      const metriSeduta = mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste) : 1800;
                      const schedaAnteprima = GeneratoreSmartSeduta.genera(
                        mi.inizio,
                        metriSeduta,
                        activeMeso.fase,
                        mi.tipo
                      );

                      let cardBg = 'bg-surface-container-lowest border-slate-200/70';
                      if (isCurrentWeek) cardBg = 'bg-primary-container/10 border-primary ring-2 ring-primary/30 shadow-pop';
                      else if (mi.tipo === 'CARICO') cardBg = 'bg-primary-fixed/25 border-primary-fixed-dim';
                      else if (mi.tipo === 'GARA') cardBg = 'bg-tertiary-fixed/30 border-tertiary-fixed-dim';
                      else if (mi.tipo === 'SCARICO' || mi.tipo === 'RECUPERO') cardBg = 'bg-surface-container border-outline-variant';

                      const tipoChip =
                        mi.tipo === 'CARICO' ? 'bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim'
                        : mi.tipo === 'GARA' ? 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim'
                        : mi.tipo === 'SCARICO' || mi.tipo === 'RECUPERO' ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant';

                      return (
                        <div
                          key={mi.id}
                          className={`p-4 rounded-xl border transition shadow-card flex flex-col justify-between space-y-2.5 ${cardBg}`}
                        >
                          <div className="space-y-2">
                            {isCurrentWeek && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-bold uppercase tracking-wider mb-0.5">
                                <Sparkles size={11} className="text-primary-fixed" />
                                <span>Settimana di Oggi (In Corso)</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span className="font-body-bold text-body-bold text-on-surface">
                                  {formattaData(mi.inizio)} – {formattaData(mi.fine)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-label-caps font-label-caps uppercase tracking-wider border ${tipoChip}`}>
                                  {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                </span>
                                {mi.bloccato && (
                                  <span title="Bloccato a mano">
                                    <Lock size={14} className="text-tertiary-container" />
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-body-base font-body-base text-on-surface-variant flex items-center justify-between gap-2">
                              <span>{mi.sedutePreviste} sedute previste (~{metriSeduta}m cad.)</span>
                              <span className="ds-metric-sm text-primary-container">
                                {mi.volumeTargetMetri} m
                              </span>
                            </div>

                            {/* Progress bar compared to max volume */}
                            {volumeMax > 0 && (
                              <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-container rounded-full"
                                  style={{ width: `${(mi.volumeTargetMetri / volumeMax) * 100}%` }}
                                />
                              </div>
                            )}

                            {/* Recommended training energy codes per single session */}
                            <div className="pt-1.5 border-t border-outline-variant/60 space-y-1.5">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block font-headline">
                                Codici Consigliati per Seduta:
                              </span>
                              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                {generaDateSedute(mi.inizio, mi.fine, mi.sedutePreviste).map((dataSeduta, sIdx) => {
                                  const schedaSedutaGiorno = GeneratoreSmartSeduta.genera(
                                    dataSeduta,
                                    metriSeduta,
                                    activeMeso?.fase ?? 'PREPARAZIONE_SPECIFICA',
                                    mi.tipo
                                  );
                                  return (
                                    <div
                                      key={sIdx}
                                      className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1 hover:border-primary transition"
                                    >
                                      <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-primary font-headline">
                                          Seduta {sIdx + 1} ({formattaData(dataSeduta)})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setSchedaSmart(schedaSedutaGiorno)}
                                          className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-md"
                                        >
                                          <Waves size={10} />
                                          <span>Scheda</span>
                                        </button>
                                      </div>
                                      <IndicatoreCodici
                                        ripartizione={schedaSedutaGiorno.ripartizioneCodici}
                                        volumeTotale={schedaSedutaGiorno.volumeTotaleMetri}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {gareInSettimana.map(g => (
                              <div key={g.id} className="text-[11px] font-bold text-on-tertiary-fixed flex items-center gap-1 bg-tertiary-fixed/60 p-1.5 rounded-lg">
                                <Trophy size={13} className="text-tertiary-container" />
                                <span>Gara: {g.nome} {g.prioritaria ? '⭐' : ''}</span>
                              </div>
                            ))}

                            {mi.note && (
                              <p className="text-[11px] text-on-surface-variant italic">{mi.note}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setMicroSelezionato(mi)}
                            className="text-[12px] text-on-surface-variant hover:text-on-surface font-semibold py-2 min-h-[48px] border-t border-slate-200/60 flex items-center justify-between w-full"
                          >
                            <span>Modifica sedute o volume</span>
                            <Edit2 size={12} />
                          </button>
                        </div>
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
                  <div className="p-3 bg-surface-container/80 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="font-bold text-on-surface text-sm">{ma.nome}</span>
                      <span className="text-xs text-on-surface-variant ml-2">
                        {formattaData(ma.inizio)} – {formattaData(ma.fine)}
                      </span>
                    </div>
                    {ma.obiettivo && (
                      <span className="text-xs font-semibold text-primary-container">{ma.obiettivo}</span>
                    )}
                  </div>

                  {mesoOfMacro.map(me => {
                    const microOfMeso = micro.filter(mi => mi.mesocicloId === me.id);
                    return (
                      <div key={me.id} className="pl-2 sm:pl-4 space-y-2 border-l-2 border-primary-fixed-dim">
                        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                          <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed">
                            {FASE_MESOCICLO_LABEL[me.fase]}
                          </span>
                          <span>
                            {formattaData(me.inizio)} – {formattaData(me.fine)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {microOfMeso.map(mi => {
                            const gareInSettimana = gare.filter(
                              g => !isBefore(mi.fine, g.dal) && !isBefore(g.al, mi.inizio)
                            );
                            const metriSeduta = mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste) : 1800;
                            const schedaAnteprima = GeneratoreSmartSeduta.genera(
                              mi.inizio,
                              metriSeduta,
                              me.fase,
                              mi.tipo
                            );

                            return (
                              <div
                                key={mi.id}
                                className="p-3.5 rounded-xl border border-slate-200/70 bg-surface-container-lowest transition shadow-card flex flex-col justify-between space-y-2"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-on-surface text-sm">
                                        {formattaData(mi.inizio)}
                                      </span>
                                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/80 border border-slate-200/70 text-on-surface">
                                        {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                      </span>
                                      {mi.bloccato && (
                                        <span title="Bloccato a mano">
                                          <Lock size={14} className="text-tertiary-container" />
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setSchedaSmart(schedaAnteprima)}
                                      className="text-[11px] font-bold text-primary-container hover:underline flex items-center gap-1"
                                    >
                                      <Waves size={13} />
                                      <span>Scheda</span>
                                    </button>
                                  </div>

                                  <div className="text-xs text-on-surface-variant flex items-center justify-between">
                                    <span>{mi.sedutePreviste} sedute previste</span>
                                    <span className="font-bold text-primary-container text-sm">
                                      {mi.volumeTargetMetri} m
                                    </span>
                                  </div>

                                  <IndicatoreCodici
                                    ripartizione={schedaAnteprima.ripartizioneCodici}
                                    volumeTotale={schedaAnteprima.volumeTotaleMetri}
                                  />

                                  {gareInSettimana.map(g => (
                                    <div key={g.id} className="text-[11px] font-bold text-on-tertiary-fixed flex items-center gap-1">
                                      <Trophy size={13} />
                                      <span>Gara: {g.nome}</span>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setMicroSelezionato(mi)}
                                  className="text-[11px] text-on-surface-variant hover:text-on-surface-variant font-semibold pt-1 border-t border-slate-200/70 flex items-center justify-between w-full"
                                >
                                  <span>Modifica microciclo</span>
                                  <Edit2 size={12} />
                                </button>
                              </div>
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
      </Sezione>

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
      {schedaSmart && (
        <SchedaSedutaModal
          scheda={schedaSmart}
          onChiudi={() => setSchedaSmart(null)}
        />
      )}

      {/* Modal Modifica Evento / Gara */}
      {editEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-on-surface">
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
              <h3 className="font-headline font-bold text-base flex items-center gap-2">
                <Edit2 size={18} className="text-primary" />
                <span>Modifica {editEventModal.type === 'gara' ? 'Gara' : 'Chiusura/Festività'}</span>
              </h3>
              <button onClick={() => setEditEventModal(null)} className="p-1 rounded-lg hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Titolo / Nome *</label>
                <input
                  type="text"
                  value={editEventModal.title}
                  onChange={e => setEditEventModal({ ...editEventModal, title: e.target.value })}
                  className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Dal *</label>
                  <input
                    type="text"
                    value={editEventModal.dal}
                    onChange={e => setEditEventModal({ ...editEventModal, dal: formatDataInput(e.target.value) })}
                    className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Al</label>
                  <input
                    type="text"
                    value={editEventModal.al}
                    onChange={e => setEditEventModal({ ...editEventModal, al: formatDataInput(e.target.value) })}
                    className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl font-bold"
                  />
                </div>
              </div>

              {editEventModal.type === 'gara' && (
                <>
                  <div>
                    <label className="font-bold block mb-1">Luogo / Impianto</label>
                    <input
                      type="text"
                      value={editEventModal.luogo}
                      onChange={e => setEditEventModal({ ...editEventModal, luogo: e.target.value })}
                      className="w-full px-3 h-10 bg-surface-container-low border border-outline-variant rounded-xl"
                    />
                  </div>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-xl border border-outline-variant cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={editEventModal.prioritaria}
                      onChange={e => setEditEventModal({ ...editEventModal, prioritaria: e.target.checked })}
                      className="w-4 h-4 accent-tertiary"
                    />
                    <span>Gara Prioritaria (A-Race)</span>
                  </label>
                </>
              )}

              <div className="flex gap-2 pt-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => {
                    const d1 = parseData(editEventModal.dal);
                    const d2 = parseData(editEventModal.al) ?? d1;
                    if (d1 && editEventModal.title.trim()) {
                      if (editEventModal.type === 'gara') {
                        modificaGara({
                          id: editEventModal.id,
                          stagioneId: stagione?.id ?? 1,
                          nome: editEventModal.title.trim(),
                          dal: d1,
                          al: d2 ?? d1,
                          luogo: editEventModal.luogo || '',
                          prioritaria: !!editEventModal.prioritaria
                        });
                      } else {
                        modificaChiusura({
                          id: editEventModal.id,
                          stagioneId: stagione?.id ?? 1,
                          dal: d1,
                          al: d2 ?? d1,
                          motivo: editEventModal.title.trim()
                        });
                      }
                      setEditEventModal(null);
                    }
                  }}
                  className="ds-btn-primary flex-1 justify-center"
                >
                  Salva Modifiche
                </button>
                <button
                  type="button"
                  onClick={() => setEditEventModal(null)}
                  className="ds-btn-secondary"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Parametri Piano & Disposizione Ideale Corsie */}
      {modalParametriPianoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-on-surface animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-lg w-full shadow-float border border-outline-variant space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
              <h3 className="font-headline font-bold text-base flex items-center gap-2">
                <Sliders size={18} className="text-primary" />
                <span>Parametri Piano & Disposizione Corsie</span>
              </h3>
              <button onClick={() => setModalParametriPianoOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selezione Numero Corsie Disponibili */}
              <div className="space-y-1.5">
                <label className="font-bold text-primary uppercase tracking-wider block">Numero Corsie Disponibili</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumCorsieDisponibili(n)}
                      className={`flex-1 h-9 rounded-xl font-headline font-bold transition ${
                        numCorsieDisponibili === n ? 'bg-primary text-white shadow-primary-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selezione Atleti Presenti di Default */}
              <div className="space-y-1.5">
                <label className="font-bold text-primary uppercase tracking-wider block">
                  Atleti Presenti di Default ({atletiPresentiIds.length}/{atleti.length})
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {atleti.map(a => {
                    const isPres = atletiPresentiIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAtletaPresente(a.id)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition ${
                          isPres ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-surface-container-low border-outline-variant/60 text-on-surface'
                        }`}
                      >
                        <span className="truncate">{a.cognome} {a.nome?.[0]}. (S{a.classeS ?? '9'})</span>
                        {isPres && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calcolo Automatico Disposizione Ideale Corsie */}
              <div className="p-3 bg-surface-container-low rounded-2xl border border-primary/20 space-y-2">
                <div className="font-headline font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={15} />
                  <span>Disposizione Ideale Corsie (Calcolo Automatico)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: numCorsieDisponibili }).map((_, cIdx) => {
                    const laneNum = cIdx + 1;
                    const assignedAthletes = atleti
                      .filter(a => atletiPresentiIds.includes(a.id))
                      .filter((_, aIdx) => aIdx % numCorsieDisponibili === cIdx);

                    return (
                      <div key={laneNum} className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant text-[11px] space-y-1">
                        <div className="font-bold text-primary flex items-center justify-between">
                          <span>Corsia {laneNum}</span>
                          <span className="text-[10px] text-on-surface-variant">{assignedAthletes.length} atleti</span>
                        </div>
                        {assignedAthletes.length === 0 ? (
                          <div className="text-on-surface-variant italic">Libera</div>
                        ) : (
                          <div className="font-medium text-on-surface space-y-0.5">
                            {assignedAthletes.map(ath => (
                              <div key={ath.id} className="truncate">• {ath.cognome} {ath.nome} (S{ath.classeS ?? '9'})</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalParametriPianoOpen(false)}
                className="w-full ds-btn-primary justify-center py-3"
              >
                Conferma e Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------ Submodal Modifica Microciclo
interface ModalModificaMicroProps {
  micro: Microciclo;
  onChiudi: () => void;
  onSalva: (micro: Microciclo) => void;
  onSblocca: (micro: Microciclo) => void;
}

const ModalModificaMicro: React.FC<ModalModificaMicroProps> = ({
  micro,
  onChiudi,
  onSalva,
  onSblocca
}) => {
  const [tipo, setTipo] = useState<TipoMicrociclo>(micro.tipo);
  const [sedute, setSedute] = useState(micro.sedutePreviste.toString());
  const [metri, setMetri] = useState(micro.volumeTargetMetri.toString());
  const [note, setNote] = useState(micro.note);

  const seduteInt = parseInt(sedute, 10);
  const metriInt = parseInt(metri, 10);
  const valido = !isNaN(seduteInt) && seduteInt >= 0 && seduteInt <= 14 && !isNaN(metriInt) && metriInt >= 0;

  const tipi: TipoMicrociclo[] = ['CARICO', 'SCARICO', 'RECUPERO', 'GARA', 'ADATTAMENTO', 'PAUSA'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-md w-full p-5 border border-slate-200/70 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 sticky top-0 bg-surface-container-lowest -mx-5 -mt-5 px-5 pt-5 z-10">
          <h3 className="font-bold text-on-surface text-base">
            Settimana del {formattaData(micro.inizio)}
          </h3>
          <button onClick={onChiudi} className="p-1 text-on-surface-variant hover:text-on-surface-variant rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-on-surface mb-1">Tipo Microciclo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {tipi.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`p-2 rounded-lg text-left font-bold transition min-h-[44px] ${
                    tipo === t ? 'bg-primary-container text-on-primary shadow-card' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {TIPO_MICROCICLO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-on-surface mb-1">Sedute Previste</label>
              <input
                type="number"
                min="0"
                max="14"
                value={sedute}
                onChange={e => setSedute(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-on-surface mb-1">Volume Squadra (m)</label>
              <input
                type="number"
                step="50"
                value={metri}
                onChange={e => setMetri(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-on-surface mb-1">Note settimana</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 h-12 border border-outline-variant rounded-lg"
            />
          </div>

          <p className="text-[11px] text-on-surface-variant">
            Salvare bloccherà la settimana (🔒): le modifiche manuali non verranno sovrascritte durante le rigenerazioni automatiche.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
          <div>
            {micro.bloccato && (
              <button
                type="button"
                onClick={() => onSblocca(micro)}
                className="inline-flex items-center gap-1 px-3 h-12 bg-tertiary-fixed hover:brightness-95 text-on-tertiary-fixed rounded-xl text-xs font-bold transition"
              >
                <Unlock size={14} />
                <span>Sblocca</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onChiudi}
              className="px-4 h-12 text-on-surface-variant hover:bg-surface-container font-semibold rounded-xl text-xs"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!valido}
              onClick={() => {
                onSalva({
                  ...micro,
                  tipo,
                  sedutePreviste: seduteInt,
                  volumeTargetMetri: metriInt,
                  note: note.trim()
                });
              }}
              className="px-4 h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-xs transition shadow-card"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
