import React, { useState } from 'react';
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
import { formattaData, parseData, todayISO, isBefore, addDays, daysBetween } from '../domain/dateUtils';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { IndicatoreCodici } from './IndicatoreCodici';
import { ElencoAvvisi } from './ElencoAvvisi';
import { SchedaSedutaModal } from './SchedaSedutaModal';
import { Sezione } from './Sezione';
import { PageHeader } from './PageHeader';
import { normalizzaDurata } from '../domain/parametriSeduta';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
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
  Trash2,
  Trophy,
  Unlock,
  Waves,
  X
} from 'lucide-react';

export const PianoScreen: React.FC = () => {
  const {
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
    eliminaChiusura,
    aggiungiFestivitaNazionali,
    aggiungiGara,
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
    return (
      <div className="max-w-xl mx-auto p-6 ds-card shadow-card space-y-5">
        <div>
          <h2 className="ds-title">Nuova Stagione Agonistica FINP</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Basta inserire la data di inizio: nome, fine stagione, festività nazionali e piano di carico
            vengono creati in automatico in base alla metodologia paralimpica.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Inizio stagione (Seleziona da calendario) *</label>
            <input
              type="date"
              value={inizioStagione}
              onChange={e => {
                setInizioStagione(e.target.value);
                const p = parseData(e.target.value);
                if (p) setFineStagione(AutoPianificatore.fineStagioneSuggerita(p));
              }}
              className="w-full px-3 h-12 border rounded-xl border-outline-variant font-bold bg-surface-container-low text-on-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Fine stagione (Seleziona da calendario)</label>
            <input
              type="date"
              value={fineStagione}
              onChange={e => setFineStagione(e.target.value)}
              className="w-full px-3 h-12 border rounded-xl border-outline-variant font-bold bg-surface-container-low text-on-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nome stagione (auto)</label>
            <input
              type="text"
              placeholder={nomeAuto}
              value={nomeStagione}
              onChange={e => setNomeStagione(e.target.value)}
              className="w-full px-3 h-12 border rounded-xl border-outline-variant font-semibold"
            />
          </div>

          <button
            onClick={() => {
              if (inizioParsed && fineEffettiva && inizioParsed < fineEffettiva) {
                creaStagione(nomeEffettivo, inizioParsed, fineEffettiva);
              }
            }}
            disabled={!inizioParsed || !fineEffettiva || inizioParsed >= fineEffettiva}
            className="w-full h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-sm transition shadow-card mt-2"
          >
            Crea Stagione e Genera Piano
          </button>
        </div>
      </div>
    );
  }

  const volumeMax = micro.length > 0 ? Math.max(...micro.map(m => m.volumeTargetMetri)) : 0;

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
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
                    onChange={e => setModInizio(e.target.value)}
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
                    onChange={e => setModFine(e.target.value)}
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

      {/* Chiusure e Festività */}
      <Sezione titolo="Chiusure e Festività" icon={<Calendar size={16} />} badge={chiusure.length} riepilogoChiuso={`${chiusure.length} registrate`} storageKey="piano_chiusure" defaultAperto={false}>
        <div className="space-y-3 text-xs pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aggiungiFestivitaNazionali}
              className="px-3 h-12 bg-surface-container-low hover:bg-primary-fixed text-primary-container border border-primary-fixed-dim rounded-lg font-bold"
            >
              + Aggiungi Festività Nazionali Italiane
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {chiusure.map(c => (
              <div
                key={c.id}
                className="p-2 bg-surface-container-low border border-slate-200/70 rounded-lg flex items-center justify-between"
              >
                <span>
                  {c.dal === c.al ? formattaData(c.dal) : `${formattaData(c.dal)} – ${formattaData(c.al)}`}:{' '}
                  <strong className="text-on-surface">{c.motivo}</strong>
                </span>
                <button
                  onClick={() => eliminaChiusura(c.id)}
                  className="text-on-surface-variant hover:text-error p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Custom Closure */}
          <div className="p-3 bg-surface-container-low border border-dashed border-outline-variant rounded-xl space-y-2">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Dal (gg/mm/aaaa)"
                value={cDal}
                onChange={e => setCDal(e.target.value)}
                className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg"
              />
              <input
                type="text"
                placeholder="Al (gg/mm/aaaa)"
                value={cAl}
                onChange={e => setCAl(e.target.value)}
                className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Motivo (es. Chiusura natalizia impianto, festa patronale...)"
              value={cMotivo}
              onChange={e => setCMotivo(e.target.value)}
              className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg"
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
              className="w-full h-12 bg-primary-container hover:bg-primary text-on-primary rounded-lg font-bold"
            >
              Aggiungi Chiusura Vasca
            </button>
          </div>
        </div>
      </Sezione>

      {/* Gare Agonistiche */}
      <Sezione titolo="Gare Agonistiche" icon={<Trophy size={16} />} badge={gare.length} riepilogoChiuso={`${gare.length} programmate`} storageKey="piano_gare" defaultAperto={false}>
        <div className="space-y-3 pt-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Calendario Gare</span>
            <button
              type="button"
              onClick={() => setModalGaraOpen(true)}
              className="px-3 py-2 bg-primary-container hover:bg-primary text-on-primary rounded-xl font-bold transition shadow-card flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Aggiungi Nuova Gara 🏆</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {gare.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-1">Nessuna gara inserita nel calendario.</p>
            ) : (
              gare.map(g => (
                <div
                  key={g.id}
                  className="p-3 bg-surface-container-low border border-slate-200/70 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {g.prioritaria && <Star size={16} className="text-tertiary-container fill-tertiary-container shrink-0" />}
                    <div>
                      <span className="font-bold text-on-surface block">
                        {g.nome} {g.prioritaria && <span className="text-tertiary font-semibold">(A-Race Prioritaria)</span>}
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        {formattaData(g.dal)}{g.al && g.al !== g.dal ? ` – ${formattaData(g.al)}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => eliminaGara(g.id)}
                    className="p-1 text-on-surface-variant hover:text-error rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
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
                    onChange={e => setGDal(e.target.value)}
                    className="w-full px-3 h-12 bg-surface-container-low border border-outline-variant rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">Data Fine (opz.)</label>
                  <input
                    type="text"
                    placeholder="gg/mm/aaaa"
                    value={gAl}
                    onChange={e => setGAl(e.target.value)}
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
      <Sezione titolo="Parametri Auto-Pianificatore & Controlli sul Piano" icon={<Sparkles size={16} />} badge={avvisiPiano.length > 0 ? avvisiPiano.length : undefined} riepilogoChiuso={avvisiPiano.length > 0 ? `${avvisiPiano.length} avvisi sul carico` : "Configurazione e controlli"} storageKey="piano_parametri" defaultAperto={false}>
        <div className="space-y-4 pt-1 text-xs">
          {avvisiPiano.length > 0 && (
            <div className="space-y-1.5 pb-3 border-b border-slate-200/70">
              <h4 className="font-bold text-on-tertiary-fixed text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️ Controlli e Avvisi sul Piano di Carico</span>
              </h4>
              <ElencoAvvisi avvisi={avvisiPiano} />
            </div>
          )}

          <p className="text-xs text-on-surface-variant">
            Il piano si adatta automaticamente all'età media, ai dati storici di carico e alle gare.
            I campi lasciati vuoti usano il calcolo intelligente.
          </p>

          {/* Programmazione vasca/durata per giorno */}
          <div className="space-y-1.5">
            <label className="block text-body-bold font-body-bold text-on-surface">
              Programmazione vasca e durata per giorno
            </label>
            <p className="text-xs text-on-surface-variant">
              Imposta vasca e durata per ogni giorno di allenamento. Usati da "Oggi" e dal calcolo volume.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {([1, 2, 3, 4, 5, 6, 7] as DayOfWeekNum[]).map((dow) => {
                const p = impostazioni.parametriPerGiorno?.[dow] || { vascaMetri: stagione?.vascaMetri || 25, durataMin: impostazioni.durataDefaultMin || 90 };
                return (
                  <div key={dow} className="rounded-xl border border-slate-200/70 bg-surface-container-low p-2.5 space-y-2 min-w-0">
                    <div className="flex items-baseline justify-between gap-x-2 gap-y-0.5 min-w-0">
                      <span className="text-body-bold font-body-bold text-on-surface truncate">{DAY_OF_WEEK_NAMES[dow]}</span>
                      <span className="ds-label shrink-0">{p.vascaMetri}m · {p.durataMin}'</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[25, 50].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => impostaParametriGiorno(dow, { vascaMetri: v, durataMin: p.durataMin })}
                          className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold ${p.vascaMetri === v ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
                        >
                          {v}m
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={30}
                      max={210}
                      step={5}
                      value={p.durataMin}
                      onChange={(e) => impostaParametriGiorno(dow, { vascaMetri: p.vascaMetri, durataMin: normalizzaDurata(Number(e.target.value)) })}
                      className="w-full px-2 h-9 border border-outline-variant rounded-lg text-xs font-bold"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label className="text-xs text-on-surface-variant">Durata default stagione</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-body-bold font-body-bold text-on-surface">
              Giorni di Allenamento Settimanali{' '}
              <span className="font-normal text-on-surface-variant">
                {impostazioni.giorni == null ? '(attualmente automatici)' : '(impostati a mano)'}
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => salvaImpostazioni({ ...impostazioni, giorni: undefined })}
                className={`min-h-[40px] px-3 rounded-full text-label-md font-label-md transition ${
                  impostazioni.giorni == null
                    ? 'bg-primary-container text-on-primary'
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



      <Sezione titolo="Programmazione & Cicli di Carico" icon={<Calendar size={18} />} badge={`${micro.length} sett.`} riepilogoChiuso={`${macro.length} macrocicli · ${meso.length} mesocicli`} storageKey="piano_programmazione" defaultAperto={true}>
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

                              <button
                                type="button"
                                onClick={() => setSchedaSmart(schedaAnteprima)}
                                className="text-label-md font-label-md text-primary-container hover:underline flex items-center gap-1 bg-surface-container-lowest px-3 min-h-[44px] rounded-lg border border-slate-200/70 shrink-0"
                              >
                                <Waves size={13} />
                                <span>Scheda Smart</span>
                              </button>
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

                            {/* Energy codes preview */}
                            <IndicatoreCodici
                              ripartizione={schedaAnteprima.ripartizioneCodici}
                              volumeTotale={schedaAnteprima.volumeTotaleMetri}
                            />

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

                          {/* Sedute del giorno cliccabili direttamente dal calendario */}
                          <div className="pt-2 border-t border-slate-200/70 space-y-1">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              Schede Giornaliere (Varietà):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {generaDateSedute(mi.inizio, mi.fine, mi.sedutePreviste).map((dataSeduta, sIdx) => {
                                const schedaSedutaGiorno = GeneratoreSmartSeduta.genera(
                                  dataSeduta,
                                  metriSeduta,
                                  activeMeso?.fase ?? 'PREPARAZIONE_SPECIFICA',
                                  mi.tipo
                                );
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => setSchedaSmart(schedaSedutaGiorno)}
                                    className="ds-chip-tap !px-3 bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-primary-container rounded-md text-[11px] font-bold transition border border-primary-fixed-dim items-center gap-1 shadow-card"
                                    title={`Apri scheda per il ${formattaData(dataSeduta)}`}
                                  >
                                    <Waves size={11} />
                                    <span>S.{sIdx + 1} ({formattaData(dataSeduta).substring(0, 5)})</span>
                                  </button>
                                );
                              })}
                            </div>
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
                  className={`p-2 rounded-lg text-center font-bold transition min-h-[44px] ${
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
