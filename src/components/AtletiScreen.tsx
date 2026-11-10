import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { Atleta, CodiceAllenamentoKey, CondizioneMedica, Assenza, Tempo, StimaClassiFINP, LogSeduta } from '../types';
import { formattaData, parseData, todayISO, yearsBetween, isBefore } from '../domain/dateUtils';
import { AtletaValidator } from '../domain/validatori';
import { ClassiSportive } from '../domain/classiSportive';
import { FINPSpecialistAI } from '../domain/finpAnalisiMedica';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { calcolaVolumeSessione } from '../domain/volumePrescritto';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { formattaTempo, parseTempo } from '../domain/tempoUtils';
import { ElencoAvvisi } from './ElencoAvvisi';
import { CodiciSeduta } from './CodiciSeduta';
import { Sezione } from './Sezione';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { AtletaBiomeccanicaView } from './AtletaBiomeccanicaView';
import { GareAmmissibiliCard } from './GareAmmissibiliCard';
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Check,
  ChevronRight,
  Edit2,
  HeartPulse,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Timer,
  Trash2,
  User,
  UserPlus,
  Users,
  Waves,
  X
} from 'lucide-react';

export const AtletiScreen: React.FC = () => {
  const {
    atleti,
    condizioni,
    assenze,
    tempi,
    log,
    micro,
    meso,
    parametriEffettivi,
    stagione,
    impostazioni,
    aggiungiAtleta,
    aggiornaAtleta,
    eliminaAtleta,
    aggiungiCondizione,
    eliminaCondizione,
    aggiungiAssenza,
    eliminaAssenza,
    aggiungiTempo,
    eliminaTempo
  } = useApp();

  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [selezionatoId, setSelezionatoId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'ALL' | 'S1-S6' | 'S7-S10' | 'S11-S13' | 'S14'>('ALL');

  const oggi = todayISO();
  const atletaSel = atleti.find(a => a.id === selezionatoId);

  const atletiFiltrati = atleti.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    const matchName = !q || a.nome.toLowerCase().includes(q) || a.cognome.toLowerCase().includes(q);
    if (!matchName) return false;

    if (categoriaFiltro === 'ALL') return true;
    const s = a.classeS;
    if (s == null) return false;
    if (categoriaFiltro === 'S1-S6') return s >= 1 && s <= 6;
    if (categoriaFiltro === 'S7-S10') return s >= 7 && s <= 10;
    if (categoriaFiltro === 'S11-S13') return s >= 11 && s <= 13;
    if (categoriaFiltro === 'S14') return s === 14;
    return true;
  });

  const formatClassi = (a: Atleta) => {
    const list: string[] = [];
    if (a.classeS != null) list.push(`S${a.classeS}`);
    if (a.classeSB != null) list.push(`SB${a.classeSB}`);
    if (a.classeSM != null) list.push(`SM${a.classeSM}`);
    return list.length > 0 ? list.join(' · ') : 'Classi non indicate';
  };

  const contaCategoria = (cat: typeof categoriaFiltro): number => {
    if (cat === 'ALL') return atleti.length;
    return atleti.filter(a => {
      const s = a.classeS;
      if (s == null) return false;
      if (cat === 'S1-S6') return s >= 1 && s <= 6;
      if (cat === 'S7-S10') return s >= 7 && s <= 10;
      if (cat === 'S11-S13') return s >= 11 && s <= 13;
      if (cat === 'S14') return s === 14;
      return true;
    }).length;
  };

  const classiValide = atleti.map(a => a.classeS).filter((s): s is number => s != null);
  const classiRange = classiValide.length > 0
    ? `S${Math.min(...classiValide)}–S${Math.max(...classiValide)}`
    : '—';
  const atletiConTempi = atleti.filter(a => tempi.some(t => t.atletaId === a.id)).length;

  const FILTRI_CLASSI: { id: typeof categoriaFiltro; label: string }[] = [
    { id: 'ALL', label: 'TUTTI' },
    { id: 'S1-S6', label: 'S1–S6' },
    { id: 'S7-S10', label: 'S7–S10' },
    { id: 'S11-S13', label: 'S11–S13' },
    { id: 'S14', label: 'S14' }
  ];

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 100
  });

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      {/* Team Metrics Micro-Card + Stat Tiles (Stitch: gestione_atleti) */}
      <section className="shrink-0 bg-surface-container-lowest rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">Squadra Agonistica FINP</h2>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider truncate">
                {atleti.length} {atleti.length === 1 ? 'atleta registrato' : 'atleti registrati'} · World Para Swimming
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              ROSA ATTIVA
            </span>
            <button
              onClick={() => setNuovoOpen(true)}
              className="h-10 px-3.5 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center gap-1.5 shadow-primary-sm hover:brightness-110 transition shrink-0"
            >
              <UserPlus size={16} />
              <span className="hidden xs:inline">Nuovo Atleta</span>
              <span className="xs:hidden">Nuovo</span>
            </button>
          </div>
        </div>

        {/* Top Stats Bar: Squad Summary */}
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Atleti FINP</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-lg text-headline-lg text-primary leading-none">{atleti.length}</span>
              <span className="font-label-caps text-label-caps text-secondary">Attivi</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Classi WPS</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-lg text-headline-lg text-on-surface leading-none">{classiRange}</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Con Tempi</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-lg text-headline-lg text-secondary leading-none">{atletiConTempi}</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">/ {atleti.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Classification Filter Hub */}
      {atleti.length > 0 && (
        <div className="shrink-0 flex flex-col gap-2">
          <div className="relative w-full flex items-center">
            <Search size={18} className="absolute left-3 text-outline pointer-events-none" />
            <input
              type="text"
              placeholder="Cerca atleta per nome o classe..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-3 bg-surface-container-low text-on-surface placeholder:text-outline font-body-base text-body-base rounded-xl outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 transition-colors shadow-sm"
            />
          </div>

          {/* Functional Class Horizontal Filter Pill Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {FILTRI_CLASSI.map(f => {
              const attivo = categoriaFiltro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(f.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full font-label-caps text-label-caps font-bold transition-all shrink-0 ${
                    attivo
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {f.label} ({contaCategoria(f.id)})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Area elenco scrollabile internamente per bloccare lo scroll di pagina */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {atleti.length === 0 && (
        <div className="p-10 text-center bg-surface-container-low rounded-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-outline mx-auto mb-3">
            <User size={26} />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Nessun atleta inserito</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1 max-w-sm mx-auto">
            Aggiungi il primo atleta per iniziare a gestire classi sportive, condizioni mediche e schede personalizzate.
          </p>
        </div>
      )}

      {atleti.length > 0 && atletiFiltrati.length === 0 && (
        <div className="p-10 text-center bg-surface-container-low rounded-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-outline mx-auto mb-3">
            <Search size={24} />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Nessun atleta trovato</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            Nessun nuotatore corrisponde ai filtri selezionati. Prova a reimpostare i criteri di ricerca.
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setCategoriaFiltro('ALL'); }}
            className="mt-3 px-4 py-2 bg-primary-fixed text-on-primary-fixed-variant rounded-xl font-headline-sm text-headline-sm active:scale-95 transition-transform"
          >
            Mostra tutti gli atleti
          </button>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div className="flex items-center justify-center py-2 font-label-caps text-label-caps text-on-surface-variant uppercase">
          <RefreshCw 
            size={16} 
            className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} 
          />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}

      {/* Athletes roster — righe compatte: la squadra intera resta in vista senza scroll */}
      <div className="flex flex-col gap-1.5">
        {atletiFiltrati.map(a => {
          const mieiTempi = tempi.filter(t => t.atletaId === a.id);
          const eta = a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null;

          const microCorrente = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi));
          const mesoCorrente = microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) : null;
          const formCheck = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, mieiTempi, mesoCorrente);
          const haTempi = mieiTempi.length > 0;
          const migliorTempo = haTempi
            ? formattaTempo([...mieiTempi].sort((x, y) => x.centesimi - y.centesimi)[0].centesimi)
            : '—';

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelezionatoId(a.id)}
              className="w-full text-left bg-surface-container-lowest rounded-xl px-3 py-2 shadow-card hover:shadow-pop transition flex items-center gap-3 min-h-[56px]"
            >
              <div className="relative w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline-sm text-[13px] font-bold shrink-0">
                {a.nome?.[0] || 'A'}{a.cognome?.[0] || 'T'}
                {a.stato === 'UFFICIALE' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest flex items-center justify-center">
                    <Check size={8} strokeWidth={3.5} className="text-on-secondary" />
                  </span>
                )}
                {formCheck.necessario && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-error-container text-error ring-2 ring-surface-container-lowest flex items-center justify-center"
                    title="Aggiorna i tempi di riferimento"
                  >
                    <AlertTriangle size={8} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-headline-sm text-[15px] text-on-surface font-bold truncate">
                    {a.cognome} {a.nome}
                  </h3>
                  {a.stato === 'UFFICIALE' && (
                    <BadgeCheck size={14} className="text-primary shrink-0" />
                  )}
                </div>
                <p className="font-label-caps text-[10px] text-on-surface-variant mt-0.5 truncate">
                  {eta != null ? `${eta} anni · ` : ''}{a.stato === 'UFFICIALE' ? 'Squadra Nazionale' : 'In attesa di revisione'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-label-caps text-[8px] text-on-surface-variant uppercase leading-none">Miglior</span>
                  <span className={`font-headline-sm text-[15px] font-bold tabular-nums leading-tight mt-0.5 ${haTempi ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {migliorTempo}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-caps text-[9px] font-bold uppercase shrink-0 ${
                  a.stato === 'UFFICIALE'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {a.stato === 'UFFICIALE' ? 'Idoneo' : 'Review'}
                </span>
                <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
      </div>

      {/* Modal Nuovo Atleta */}
      {nuovoOpen && (
        <ModalAtleta
          iniziale={null}
          onAnnulla={() => setNuovoOpen(false)}
          onSalva={dati => {
            aggiungiAtleta(dati);
            setNuovoOpen(false);
          }}
        />
      )}

      {/* Modal Dettaglio Atleta */}
      {atletaSel && (
        <ModalDettaglioAtleta
          atleta={atletaSel}
          condizioni={condizioni.filter(c => c.atletaId === atletaSel.id)}
          assenze={assenze.filter(ass => ass.atletaId === atletaSel.id)}
          tempi={tempi.filter(t => t.atletaId === atletaSel.id)}
          log={log.filter(l => l.atletaId === atletaSel.id)}
          meso={meso}
          micro={micro}
          onChiudi={() => setSelezionatoId(null)}
          onAggiornaAtleta={aggiornaAtleta}
          onEliminaAtleta={id => {
            eliminaAtleta(id);
            setSelezionatoId(null);
          }}
          onAggiungiCondizione={aggiungiCondizione}
          onEliminaCondizione={eliminaCondizione}
          onAggiungiAssenza={aggiungiAssenza}
          onEliminaAssenza={eliminaAssenza}
          onAggiungiTempo={aggiungiTempo}
          onEliminaTempo={eliminaTempo}
          parametriEffettivi={parametriEffettivi}
          stagione={stagione}
          impostazioni={impostazioni}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Modal Crea / Modifica Atleta
interface ModalAtletaProps {
  iniziale: Atleta | null;
  onAnnulla: () => void;
  onSalva: (atleta: Omit<Atleta, 'id'>) => void;
}

const ModalAtleta: React.FC<ModalAtletaProps> = ({ iniziale, onAnnulla, onSalva }) => {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [cognome, setCognome] = useState(iniziale?.cognome ?? '');
  const [annoNascita, setAnnoNascita] = useState(
    iniziale?.dataNascita ? iniziale.dataNascita.substring(0, 4) : ''
  );
  const [s, setS] = useState(iniziale?.classeS?.toString() ?? '');
  const [sb, setSb] = useState(iniziale?.classeSB?.toString() ?? '');
  const [sm, setSm] = useState(iniziale?.classeSM?.toString() ?? '');
  const [ufficiale, setUfficiale] = useState(iniziale?.stato === 'UFFICIALE');
  const [volumeAuto, setVolumeAuto] = useState(iniziale?.volumeAuto ?? true);
  const [fattore, setFattore] = useState(
    iniziale?.fattoreVolume ? Math.round(iniziale.fattoreVolume * 100).toString() : '100'
  );
  const [note, setNote] = useState(iniziale?.note ?? '');
  const [codiciEccezione, setCodiciEccezione] = useState<string[]>(iniziale?.codiciEccezione ?? []);

  const cS = s.trim() ? parseInt(s, 10) : null;
  const cSB = sb.trim() ? parseInt(sb, 10) : null;
  const cSM = sm.trim() ? parseInt(sm, 10) : null;

  const errori = ClassiSportive.valida(cS, cSB, cSM);
  const annoVal = parseInt(annoNascita.trim(), 10);
  const annoOk = annoNascita.trim() === '' || (!isNaN(annoVal) && annoVal >= 1930 && annoVal <= new Date().getFullYear());
  const dataNascitaFormatted = !isNaN(annoVal) && annoVal >= 1930 ? `${annoVal}-01-01` : undefined;

  const fattVal = parseInt(fattore, 10);
  const fattoreOk = volumeAuto || (!isNaN(fattVal) && fattVal >= 10 && fattVal <= 100);

  const valido =
    nome.trim().length > 0 &&
    cognome.trim().length > 0 &&
    errori.length === 0 &&
    annoOk &&
    fattoreOk;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;

    onSalva({
      nome: nome.trim(),
      cognome: cognome.trim(),
      dataNascita: dataNascitaFormatted,
      classeS: cS ?? undefined,
      classeSB: cSB ?? undefined,
      classeSM: cSM ?? undefined,
      stato: ufficiale ? 'UFFICIALE' : 'IN_ATTESA',
      fattoreVolume: volumeAuto ? (iniziale?.fattoreVolume ?? 1.0) : fattVal / 100.0,
      volumeAuto,
      note: note.trim(),
      codiciEccezione: codiciEccezione.length > 0 ? codiciEccezione : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-lg w-full p-4 sm:p-6 border border-outline-variant max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant gap-2">
          <h3 className="font-bold text-on-surface text-lg whitespace-normal break-words">
            {iniziale ? 'Modifica Atleta' : 'Nuovo Atleta'}
          </h3>
          <button onClick={onAnnulla} aria-label="Annulla" className="p-3 -mr-2 text-on-surface-variant hover:text-on-surface-variant rounded-lg shrink-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nome *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-3 h-12 border rounded-xl border-outline-variant focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Cognome *</label>
              <input
                type="text"
                required
                value={cognome}
                onChange={e => setCognome(e.target.value)}
                className="w-full px-3 h-12 border rounded-xl border-outline-variant focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Anno di nascita (es. 2004)
            </label>
            <input
              type="number"
              placeholder="es. 2004"
              value={annoNascita}
              onChange={e => setAnnoNascita(e.target.value)}
              className={`w-full px-3 h-12 border rounded-xl font-bold ${!annoOk ? 'border-error/50 bg-error-container' : 'border-outline-variant'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Classi FINP / World Para Swimming (S, SB, SM) — SB = senza i 10m
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="S"
                value={s}
                onChange={e => setS(e.target.value)}
                className="w-full px-3 h-12 border rounded-xl border-outline-variant text-center"
              />
              <input
                type="number"
                placeholder="SB"
                value={sb}
                onChange={e => setSb(e.target.value)}
                className="w-full px-3 h-12 border rounded-xl border-outline-variant text-center"
              />
              <input
                type="number"
                placeholder="SM"
                value={sm}
                onChange={e => setSm(e.target.value)}
                className="w-full px-3 h-12 border rounded-xl border-outline-variant text-center"
              />
            </div>
            {errori.map((err, i) => (
              <p key={i} className="text-xs text-error mt-1 font-medium">{err}</p>
            ))}
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl space-y-3 border border-outline-variant">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-on-surface block">Classificazione Ufficiale</span>
                <span className="text-xs text-on-surface-variant">Se disattivato, risulta 'In Attesa'</span>
              </div>
              <input
                type="checkbox"
                checked={ufficiale}
                onChange={e => setUfficiale(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
              <div>
                <span className="font-semibold text-xs text-on-surface block">Volume Automatico</span>
                <span className="text-xs text-on-surface-variant">Calcolato su età, condizioni mediche e classe</span>
              </div>
              <input
                type="checkbox"
                checked={volumeAuto}
                onChange={e => setVolumeAuto(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
            </div>

            {!volumeAuto && (
              <div className="pt-2 border-t border-outline-variant">
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Volume rispetto alla squadra (10 - 100%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={fattore}
                  onChange={e => setFattore(e.target.value)}
                  className="w-full px-3 h-12 border rounded-xl border-outline-variant text-center font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Codici di Eccezione WPS
              <span className="text-xs text-on-surface-variant font-normal ml-1">
                (es. * T A Y E 7 9 - Regole speciali per partenze, virate, tapper)
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['*', 'T', 'A', 'Y', 'E', '7', '9'].map(codice => (
                <button
                  key={codice}
                  type="button"
                  onClick={() => {
                    setCodiciEccezione(prev =>
                      prev.includes(codice)
                        ? prev.filter(c => c !== codice)
                        : [...prev, codice]
                    );
                  }}
                  className={`w-10 min-h-[48px] rounded-lg font-headline font-bold text-sm transition ${
                    codiciEccezione.includes(codice)
                      ? 'bg-primary text-on-primary shadow-primary-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {codice}
                </button>
              ))}
            </div>
            {codiciEccezione.length > 0 && (
              <div className="mt-2 text-xs text-primary font-semibold">
                Codici attivi: {codiciEccezione.join(', ')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Note / Menomazione</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="es. Amputazione transtibiale arto inferiore sinistro..."
              className="w-full px-3 h-12 border rounded-xl border-outline-variant text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onAnnulla}
              className="px-4 h-12 text-on-surface hover:bg-surface-container font-semibold rounded-xl text-xs transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!valido}
              className="px-5 h-12 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-headline-sm text-headline-sm rounded-xl transition shadow-primary-sm"
            >
              Salva Atleta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ------------------------------------------------ Modal Dettaglio Atleta
interface ModalDettaglioProps {
  atleta: Atleta;
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  log: LogSeduta[];
  meso: any[];
  micro: any[];
  onChiudi: () => void;
  onAggiornaAtleta: (a: Atleta) => void;
  onEliminaAtleta: (id: number) => void;
  onAggiungiCondizione: (c: Omit<CondizioneMedica, 'id'>) => void;
  onEliminaCondizione: (id: number) => void;
  onAggiungiAssenza: (a: Omit<Assenza, 'id'>) => void;
  onEliminaAssenza: (id: number) => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
  parametriEffettivi: any;
  stagione: any;
  impostazioni: any;
}

const ModalDettaglioAtleta: React.FC<ModalDettaglioProps> = ({
  atleta,
  condizioni,
  assenze,
  tempi,
  log,
  meso,
  micro,
  onChiudi,
  onAggiornaAtleta,
  onEliminaAtleta,
  onAggiungiCondizione,
  onEliminaCondizione,
  onAggiungiAssenza,
  onEliminaAssenza,
  onAggiungiTempo,
  onEliminaTempo,
  parametriEffettivi,
  stagione,
  impostazioni
}) => {
  const [modificaOpen, setModificaOpen] = useState(false);
  const [codiciProposti, setCodiciProposti] = useState<CodiceAllenamentoKey[] | null>(null);
  const [gestioneTempiOpen, setGestioneTempiOpen] = useState(false);

  // New condition inputs
  const [nuovaCond, setNuovaCond] = useState('');
  const [nuovaLimitaz, setNuovaLimitaz] = useState('');

  // New absence inputs
  const [assDal, setAssDal] = useState('');
  const [assAl, setAssAl] = useState('');
  const [assMotivo, setAssMotivo] = useState('');

  const oggi = todayISO();
  const eta = atleta.dataNascita ? yearsBetween(atleta.dataNascita, oggi) : null;
  const avvisi = AtletaValidator.valida(atleta, condizioni, assenze, oggi);

  const dalParsed = parseData(assDal);
  const alParsed = parseData(assAl);
  const assenzaValida = dalParsed != null && alParsed != null && !isBefore(alParsed, dalParsed);

  const generaCodici = () => {
    const microCorrente = micro.find((m: any) => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? micro[0];
    const mesoCorrente = microCorrente ? meso.find((me: any) => me.id === microCorrente.mesocicloId) : null;

    setCodiciProposti(generaCodiciSeduta({
      fase: mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
      tipoMicro: microCorrente?.tipo ?? 'CARICO',
      etaAtleta: eta,
      condizioni,
    }).codici);
  };

  const [tabDettaglio, setTabDettaglio] = useState<'biomeccanica' | 'progressione' | 'certificati'>('biomeccanica');

  const applicaClassiStimate = (stima: StimaClassiFINP) => {
    onAggiornaAtleta({
      ...atleta,
      classeS: stima.classeS,
      classeSB: stima.classeSB,
      classeSM: stima.classeSM
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-xl shadow-float max-w-2xl w-full max-h-[92vh] flex flex-col border border-outline-variant">
        {/* Athlete Top Bio Capsule - Stitch Aquatic Design System */}
        <div className="p-4 sm:p-5 border-b border-outline-variant flex flex-col gap-3 shrink-0 bg-surface-container-low rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-headline-sm font-bold shadow-card ring-2 ring-primary-fixed-dim">
                  {atleta.nome?.[0] || 'A'}{atleta.cognome?.[0] || 'T'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary p-0.5 rounded-full flex items-center justify-center shadow-card ring-2 ring-surface-container-low">
                  <Check size={10} strokeWidth={3.5} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-headline-sm text-headline-md text-on-surface leading-tight max-w-full">
                    {atleta.cognome} {atleta.nome}
                  </h2>
                  {eta != null && (
                    <span className="font-label-caps text-label-caps font-bold px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant uppercase shrink-0">
                      {eta} anni
                    </span>
                  )}
                </div>
                <div className="font-label-caps text-label-caps text-on-surface-variant font-semibold mt-0.5 leading-snug uppercase tracking-wider">
                  Fed. FINP / World Para Swimming · Squadra Nazionale
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setModificaOpen(true)}
                className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary-container hover:bg-surface-container rounded-xl transition"
                title="Modifica anagrafica"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={onChiudi} aria-label="Chiudi dettaglio atleta" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-on-surface-variant hover:text-on-surface-variant rounded-xl transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Paralympic Passport & Class Badges */}
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 bg-surface-container-lowest rounded-xl p-3 border border-outline-variant">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-label-caps text-label-caps font-bold bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                {atleta.classeS != null ? `S${atleta.classeS}` : 'S-'}
              </span>
              {atleta.classeSB != null && (
                <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded uppercase">
                  SB{atleta.classeSB}
                </span>
              )}
              {atleta.classeSM != null && (
                <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-0.5 rounded uppercase">
                  SM{atleta.classeSM}
                </span>
              )}
              <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold leading-snug">
                Passaporto Ufficiale FINP / WPS
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 font-label-caps text-label-caps font-bold px-3 py-1 rounded-full uppercase self-start xs:self-auto shrink-0 ${
              atleta.stato === 'UFFICIALE'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${atleta.stato === 'UFFICIALE' ? 'bg-secondary' : 'bg-tertiary'}`} />
              {atleta.stato === 'UFFICIALE' ? 'Ufficiale' : 'In revisione'}
            </span>
          </div>

          {/* WPS Exception Codes Display */}
          {atleta.codiciEccezione && atleta.codiciEccezione.length > 0 && (
            <div className="bg-warning-container text-on-warning-container rounded-xl p-3 border border-warning/30">
              <div className="flex items-center gap-3 mb-1">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Codici di Eccezione WPS</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {atleta.codiciEccezione.map(codice => (
                  <span
                    key={codice}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-warning text-on-warning font-headline font-bold text-sm"
                  >
                    {codice}
                  </span>
                ))}
              </div>
              <div className="text-xs mt-1 opacity-90">
                Regole speciali per partenze, virate, uso tapper
              </div>
            </div>
          )}

          {/* Tabs — segmented control (Stitch view toggle) */}
          <div className="flex items-center gap-1 bg-surface-container-low rounded-xl p-1">
            <button
              type="button"
              onClick={() => setTabDettaglio('biomeccanica')}
              className={`flex-1 min-h-[44px] py-2 px-2 rounded-lg font-label-caps text-label-caps uppercase tracking-wider font-bold transition flex items-center justify-center gap-1.5 ${
                tabDettaglio === 'biomeccanica'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Sliders size={15} />
              <span className="hidden xs:inline">Biomeccanica</span>
              <span className="xs:hidden">Bio</span>
            </button>
            <button
              type="button"
              onClick={() => setTabDettaglio('progressione')}
              className={`flex-1 min-h-[44px] py-2 px-2 rounded-lg font-label-caps text-label-caps uppercase tracking-wider font-bold transition flex items-center justify-center gap-1.5 ${
                tabDettaglio === 'progressione'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Timer size={15} />
              <span className="hidden xs:inline">Progressione</span>
              <span className="xs:hidden">Tempi</span>
            </button>
            <button
              type="button"
              onClick={() => setTabDettaglio('certificati')}
              className={`flex-1 min-h-[44px] py-2 px-2 rounded-lg font-label-caps text-label-caps uppercase tracking-wider font-bold transition flex items-center justify-center gap-1.5 ${
                tabDettaglio === 'certificati'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <HeartPulse size={15} />
              <span className="hidden xs:inline">Certificati</span>
              <span className="xs:hidden">Note</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body per Tab */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1 min-h-0">
          {avvisi.length > 0 && <ElencoAvvisi avvisi={avvisi} />}

          {/* TAB 1: BIOMECCANICA & WPS */}
          {tabDettaglio === 'biomeccanica' && (
            <div className="space-y-4">
              <AtletaBiomeccanicaView atleta={atleta} tempi={tempi} />

              <GareAmmissibiliCard atleta={atleta} />

              <Sezione 
                titolo="Analisi Specialistica AI & Stima Classi" 
                icon={<Sparkles size={16} />}
                riepilogoChiuso={condizioni.filter(c => c.attiva).length > 0 ? `${condizioni.filter(c => c.attiva).length} condizioni analizzate` : 'Nessuna condizione'}
                storageKey="atleta_analisi"
                defaultAperto={true}
              >
                {condizioni.filter(c => c.attiva).length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Nessuna condizione medica registrata: aggiungine una nella scheda Certificati per ottenere l'analisi biomeccanica
                    e la stima indicativa delle classi FINP.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {condizioni.filter(c => c.attiva).map(c => {
                      const analisi = FINPSpecialistAI.analizza(c.descrizione, c.limitazioni, eta);
                      return (
                        <div key={c.id} className="p-3 bg-surface-container-low rounded-lg border border-primary-fixed-dim/60 space-y-2 text-xs">
                          <div className="font-headline-sm text-headline-sm text-on-surface">
                            Condizione: {c.descrizione}
                          </div>
                          <p className="text-on-surface-variant leading-relaxed">{analisi.riassuntoIdrodinamico}</p>

                          {analisi.fattoriNuotata.length > 0 && (
                            <div>
                              <span className="font-bold text-on-surface block mb-0.5">Fattori di nuotata:</span>
                              <ul className="list-disc list-inside text-on-surface-variant space-y-0.5">
                                {analisi.fattoriNuotata.map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}

                          {atleta.stato === 'IN_ATTESA' && (
                            <div className="p-3 bg-surface-container-low border border-tertiary-fixed-dim rounded-lg space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-on-surface">
                                  Stima WPS: S{analisi.stimaClassi.classeS} · SB{analisi.stimaClassi.classeSB} · SM{analisi.stimaClassi.classeSM}
                                </span>
                                <span className="text-[12px] text-on-surface-variant font-semibold uppercase">
                                  Affidabilità: {analisi.stimaClassi.affidabilita}
                                </span>
                              </div>
                              <p className="text-on-surface-variant text-xs">{analisi.stimaClassi.motivazione}</p>

                              {(atleta.classeS !== analisi.stimaClassi.classeS ||
                                atleta.classeSB !== analisi.stimaClassi.classeSB ||
                                atleta.classeSM !== analisi.stimaClassi.classeSM) && (
                                <button
                                  type="button"
                                  onClick={() => applicaClassiStimate(analisi.stimaClassi)}
                                  className="mt-1 px-3 py-1 bg-tertiary-container hover:brightness-95 text-on-tertiary rounded-md text-xs font-bold transition"
                                >
                                  Applica classi stimate provvisorie
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Sezione>
            </div>
          )}

          {/* TAB 2: PROGRESSIONE & TEMPI */}
          {tabDettaglio === 'progressione' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={generaCodici}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm transition shadow-primary-sm hover:brightness-110 active:scale-[0.98]"
                >
                  <Waves size={16} />
                  <span>Proponi codici di oggi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGestioneTempiOpen(true)}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-headline-sm transition active:scale-[0.98]"
                >
                  <Timer size={16} />
                  <span>Storico Tempi & Test ({tempi.length})</span>
                </button>
              </div>
              {codiciProposti && <CodiciSeduta codici={codiciProposti} titolo="Focus codici per oggi" compatto />}

              {/* Volume Target delle prossime 4 settimane */}
              <Sezione 
                titolo="Volume Previsto Prossime Settimane" 
                icon={<Calendar size={15} />}
                riepilogoChiuso="Prossime 4 settimane"
                storageKey="atleta_volume"
                defaultAperto={true}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {micro.filter((m: any) => !isBefore(m.fine, oggi)).slice(0, 4).map((m: any) => {
                    const v = VolumeIndividuale.settimana(m, atleta, assenze);
                    return (
                      <div key={m.id} className="p-2.5 bg-surface-container-low rounded-lg text-center shadow-sm">
                        <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">{formattaData(m.inizio)}</div>
                        <div className="font-headline-md text-headline-md text-primary mt-0.5 tabular-nums">{v.metri} m</div>
                        <div className="font-label-caps text-label-caps text-on-surface-variant capitalize mt-0.5">{m.tipo.toLowerCase()}</div>
                      </div>
                    );
                  })}
                </div>
              </Sezione>
            </div>
          )}

          {/* TAB 3: CERTIFICATI & LIMITAZIONI */}
          {tabDettaglio === 'certificati' && (
            <div className="space-y-4">
              <Sezione 
                titolo="Condizioni Mediche & Limitazioni" 
                icon={<HeartPulse size={15} />}
                badge={condizioni.length}
                riepilogoChiuso={`${condizioni.length} registrate`}
                storageKey="atleta_condizioni"
                defaultAperto={true}
              >
                <div className="space-y-2">
                  {condizioni.map(c => (
                <div
                  key={c.id}
                  className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface block break-words">{c.descrizione}</span>
                    {c.limitazioni && (
                      <span className="text-on-surface-variant block mt-0.5 break-words">Limitazioni: {c.limitazioni}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onEliminaCondizione(c.id)}
                    aria-label="Elimina condizione"
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Condition Form */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                <input
                  type="text"
                  placeholder="Diagnosi / Condizione medica (es. Paraplegia T6, Acondroplasia...)"
                  value={nuovaCond}
                  onChange={e => setNuovaCond(e.target.value)}
                  className="w-full h-12 px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Limitazioni fisiche per l'allenamento in vasca..."
                  value={nuovaLimitaz}
                  onChange={e => setNuovaLimitaz(e.target.value)}
                  className="w-full h-12 px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
                />
                <button
                  type="button"
                  disabled={!nuovaCond.trim()}
                  onClick={() => {
                    onAggiungiCondizione({
                      atletaId: atleta.id,
                      descrizione: nuovaCond.trim(),
                      limitazioni: nuovaLimitaz.trim(),
                      attiva: true
                    });
                    setNuovaCond('');
                    setNuovaLimitaz('');
                  }}
                  className="w-full h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary rounded-lg text-xs font-bold transition"
                >
                  Aggiungi Condizione Medica
                </button>
              </div>
            </div>
          </Sezione>

          {/* Assenze Programmate Management */}
          <Sezione 
            titolo="Assenze Programmate" 
            icon={<Calendar size={15} />}
            badge={assenze.length}
            riepilogoChiuso={`${assenze.length} programmate`}
            storageKey="atleta_assenze"
            defaultAperto={false}
          >
            <div className="space-y-2">
              {assenze.map(a => (
                <div
                  key={a.id}
                  className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      {formattaData(a.dal)} – {formattaData(a.al)}
                    </span>
                    {a.motivo && <span className="text-on-surface-variant ml-2 break-words">({a.motivo})</span>}
                  </div>
                  <button
                    onClick={() => onEliminaAssenza(a.id)}
                    aria-label="Elimina assenza"
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-lg shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Absence Form */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2 text-xs">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dal (gg/mm/aaaa)"
                    value={assDal}
                    onChange={e => setAssDal(e.target.value)}
                    className="w-full h-12 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Al (gg/mm/aaaa)"
                    value={assAl}
                    onChange={e => setAssAl(e.target.value)}
                    className="w-full h-12 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Motivo (es. Convalescenza, Esami universitari...)"
                  value={assMotivo}
                  onChange={e => setAssMotivo(e.target.value)}
                  className="w-full h-12 px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg"
                />
                <button
                  type="button"
                  disabled={!assenzaValida}
                  onClick={() => {
                    if (dalParsed && alParsed) {
                      onAggiungiAssenza({
                        atletaId: atleta.id,
                        dal: dalParsed,
                        al: alParsed,
                        motivo: assMotivo.trim()
                      });
                      setAssDal('');
                      setAssAl('');
                      setAssMotivo('');
                    }
                  }}
                  className="w-full h-12 bg-tertiary-container hover:brightness-95 disabled:opacity-50 text-on-tertiary rounded-lg font-bold transition"
                >
                  Registra Assenza
                </button>
              </div>
            </div>
          </Sezione>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant flex items-center justify-between shrink-0 bg-surface-container-low rounded-b-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setModificaOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-12 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold rounded-xl text-xs transition"
            >
              <Edit2 size={14} />
              <span>Modifica</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Sei sicuro di voler eliminare ${atleta.nome} ${atleta.cognome}?`)) {
                  onEliminaAtleta(atleta.id);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 h-12 bg-error-container hover:bg-error-container text-on-error-container font-semibold rounded-xl text-xs transition"
            >
              <Trash2 size={14} />
              <span>Elimina</span>
            </button>
          </div>

          <button
            onClick={onChiudi}
            className="px-5 h-12 bg-inverse-surface hover:brightness-110 text-inverse-on-surface font-bold rounded-xl text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>

      {modificaOpen && (
        <ModalAtleta
          iniziale={atleta}
          onAnnulla={() => setModificaOpen(false)}
          onSalva={dati => {
            onAggiornaAtleta({ ...dati, id: atleta.id });
            setModificaOpen(false);
          }}
        />
      )}

      {gestioneTempiOpen && (
        <ModalTempiAtleta
          atleta={atleta}
          tempi={tempi}
          onChiudi={() => setGestioneTempiOpen(false)}
          onAggiungiTempo={onAggiungiTempo}
          onEliminaTempo={onEliminaTempo}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Submodal Quick Times per Athlete
interface ModalTempiAtletaProps {
  atleta: Atleta;
  tempi: Tempo[];
  onChiudi: () => void;
  onAggiungiTempo: (t: Omit<Tempo, 'id'>) => void;
  onEliminaTempo: (id: number) => void;
}

const ModalTempiAtleta: React.FC<ModalTempiAtletaProps> = ({
  atleta,
  tempi,
  onChiudi,
  onAggiungiTempo,
  onEliminaTempo
}) => {
  const [dataTesto, setDataTesto] = useState(formattaData(todayISO()));
  const [stile, setStile] = useState<any>('STILE_LIBERO');
  const [distanza, setDistanza] = useState('100');
  const [tempoTesto, setTempoTesto] = useState('');
  const [contesto, setContesto] = useState<any>('GARA');
  const [note, setNote] = useState('');

  const dataParsed = parseData(dataTesto);
  const distInt = parseInt(distanza, 10);
  const centesimi = parseTempo(tempoTesto);

  const valido = dataParsed != null && !isNaN(distInt) && distInt >= 25 && centesimi != null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    onAggiungiTempo({
      atletaId: atleta.id,
      data: dataParsed!,
      stile,
      distanzaMetri: distInt,
      centesimi: centesimi!,
      contesto,
      vascaMetri: 25,
      note: note.trim()
    });
    setTempoTesto('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-float max-w-lg w-full p-4 sm:p-5 border border-outline-variant max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant gap-3 shrink-0">
          <h3 className="font-bold text-on-surface text-base truncate">
            Tempi di {atleta.nome} {atleta.cognome} ⏱️
          </h3>
          <button onClick={onChiudi} aria-label="Chiudi" className="p-3 -mr-2 text-on-surface-variant hover:text-on-surface-variant rounded-lg shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="py-3 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
          {/* Add form */}
          <form onSubmit={handleAdd} className="p-3 bg-surface-container-low border border-outline-variant rounded-xl space-y-2.5">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Data (gg/mm/aaaa)"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              />
              <input
                type="number"
                placeholder="Distanza metri"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <select
                value={stile}
                onChange={e => setStile(e.target.value)}
                aria-label="Stile"
                className="w-full min-w-0 px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              >
                <option value="STILE_LIBERO">Stile libero</option>
                <option value="DORSO">Dorso</option>
                <option value="RANA">Rana</option>
                <option value="FARFALLA">Farfalla</option>
                <option value="MISTI">Misti</option>
              </select>

              <select
                value={contesto}
                onChange={e => setContesto(e.target.value)}
                aria-label="Contesto"
                className="w-full min-w-0 px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
              >
                <option value="GARA">Gara ufficiale</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="TEST">Test in vasca</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Tempo (es. 1:04.20 o 28.50)"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="w-full px-3 h-12 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-bold"
            />

            <button
              type="submit"
              disabled={!valido}
              className="w-full h-12 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary rounded-xl font-headline-sm text-headline-sm transition shadow-primary-sm"
            >
              Aggiungi Tempo
            </button>
          </form>

          {/* List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {tempi.length === 0 ? (
              <p className="text-center text-on-surface-variant py-4">Nessun tempo registrato</p>
            ) : (
              tempi.map(t => (
                <div
                  key={t.id}
                  className="p-3 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-on-surface">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri}m: {formattaTempo(t.centesimi)}
                    </span>
                    <span className="text-xs text-on-surface-variant block">
                      {formattaData(t.data)} · {t.contesto.toLowerCase()}
                      {t.note && ` · ${t.note}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onEliminaTempo(t.id)}
                    className="p-1 text-on-surface-variant hover:text-error rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant flex justify-end">
          <button
            onClick={onChiudi}
            className="px-4 h-12 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold rounded-xl text-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
