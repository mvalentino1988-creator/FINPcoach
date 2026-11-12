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
import { Badge, Button, Card, EmptyState, Input, Select, Tabs, ToastProvider, useToast } from './ui';
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
  Sliders,
  Sparkles,
  Timer,
  Trash2,
  UserPlus,
  Users,
  Waves,
  X
} from 'lucide-react';

const AtletiScreenContent: React.FC = () => {
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
  const { toast } = useToast();

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

  const classiBadges = (a: Atleta) => {
    const badges: { label: string; variant: 'blue' | 'secondary' | 'tertiary' }[] = [];
    if (a.classeS != null) badges.push({ label: `S${a.classeS}`, variant: 'blue' });
    if (a.classeSB != null) badges.push({ label: `SB${a.classeSB}`, variant: 'secondary' });
    if (a.classeSM != null) badges.push({ label: `SM${a.classeSM}`, variant: 'tertiary' });
    return badges;
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
      {/* Federal sync pill — stile Stitch Squadra */}
      <section className="shrink-0 w-full">
        <div className="flex items-center justify-between gap-2 bg-surface-container-low px-space-md py-space-sm rounded-xl">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-tertiary font-label-caps uppercase tracking-wider font-bold">WPS & FINP Datahub</span>
                <span className="text-on-surface-variant font-label-caps">· Sincronizzato</span>
              </div>
              <p className="text-on-surface-variant font-body-sm text-xs truncate">Database FINP / World Para Swimming attivo</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Ricarica telemetrie squadra"
            onClick={() => window.location.reload()}
            className="shrink-0 w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </section>

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
            <Button onClick={() => setNuovoOpen(true)} icon={<UserPlus size={16} />} className="shrink-0">
              <span className="hidden xs:inline">Nuovo Atleta</span>
              <span className="xs:hidden">Nuovo</span>
            </Button>
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
          <Input
            icon={<Search size={18} className="text-outline" />}
            type="text"
            placeholder="Cerca atleta per nome o classe..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Cerca atleta"
          />

          {/* Functional Class Horizontal Filter Pill Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {FILTRI_CLASSI.map(f => {
              const attivo = categoriaFiltro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(f.id)}
                  className={`whitespace-nowrap inline-flex items-center min-h-[48px] px-4 rounded-full font-label-caps text-label-caps font-bold transition-all shrink-0 ${
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
          <EmptyState
            icon={<Users size={40} strokeWidth={1.5} />}
            title="Nessun atleta inserito"
            message="Aggiungi il primo atleta per iniziare a gestire classi sportive, condizioni mediche e schede personalizzate."
            actionLabel="Aggiungi atleta"
            onAction={() => setNuovoOpen(true)}
          />
        )}

      {atleti.length > 0 && atletiFiltrati.length === 0 && (
        <EmptyState
          icon={<Search size={40} strokeWidth={1.5} />}
          title="Nessun atleta trovato"
          message="Nessun nuotatore corrisponde ai filtri selezionati. Prova a reimpostare i criteri di ricerca."
          actionLabel="Mostra tutti gli atleti"
          onAction={() => { setSearchQuery(''); setCategoriaFiltro('ALL'); }}
        />
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
            <Card
              key={a.id}
              onClick={() => setSelezionatoId(a.id)}
              padding="sm"
              className="flex items-center gap-3"
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
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {classiBadges(a).map(b => (
                    <Badge key={b.label} variant={b.variant} size="sm">{b.label}</Badge>
                  ))}
                  <Badge variant={a.stato === 'UFFICIALE' ? 'green' : 'neutral'} size="sm">
                    {a.stato === 'UFFICIALE' ? 'Idoneo' : 'Review'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-label-caps text-[8px] text-on-surface-variant uppercase leading-none">Miglior</span>
                  <span className={`font-headline-sm text-[15px] font-bold tabular-nums leading-tight mt-0.5 ${haTempi ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {migliorTempo}
                  </span>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
              </div>
            </Card>
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
            toast({ variant: 'success', title: 'Atleta aggiunto', message: `${dati.cognome} ${dati.nome} è stato registrato.` });
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
          onAggiornaAtleta={a => {
            aggiornaAtleta(a);
            toast({ variant: 'success', title: 'Atleta aggiornato', message: `${a.cognome} ${a.nome} è stato salvato.` });
          }}
          onEliminaAtleta={id => {
            eliminaAtleta(id);
            toast({ variant: 'info', title: 'Atleta eliminato', message: 'Il profilo è stato rimosso.' });
            setSelezionatoId(null);
          }}
          onAggiungiCondizione={c => {
            aggiungiCondizione(c);
            toast({ variant: 'success', title: 'Condizione aggiunta', message: c.descrizione });
          }}
          onEliminaCondizione={id => {
            eliminaCondizione(id);
            toast({ variant: 'info', title: 'Condizione eliminata', message: 'La condizione è stata rimossa.' });
          }}
          onAggiungiAssenza={a => {
            aggiungiAssenza(a);
            toast({ variant: 'success', title: 'Assenza registrata', message: `${formattaData(a.dal)} – ${formattaData(a.al)}` });
          }}
          onEliminaAssenza={id => {
            eliminaAssenza(id);
            toast({ variant: 'info', title: 'Assenza eliminata', message: 'L\'assenza è stata rimossa.' });
          }}
          onAggiungiTempo={t => {
            aggiungiTempo(t);
            toast({ variant: 'success', title: 'Tempo aggiunto', message: `${t.distanzaMetri}m · ${formattaTempo(t.centesimi)}` });
          }}
          onEliminaTempo={id => {
            eliminaTempo(id);
            toast({ variant: 'info', title: 'Tempo eliminato', message: 'Il tempo è stato rimosso.' });
          }}
          parametriEffettivi={parametriEffettivi}
          stagione={stagione}
          impostazioni={impostazioni}
        />
      )}
    </div>
  );
};

export const AtletiScreen: React.FC = () => (
  <ToastProvider>
    <AtletiScreenContent />
  </ToastProvider>
);

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
          <button onClick={onAnnulla} aria-label="Annulla" className="w-12 h-12 -mr-2 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg shrink-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <Input
              label="Cognome *"
              type="text"
              required
              value={cognome}
              onChange={e => setCognome(e.target.value)}
            />
          </div>

          <Input
            label="Anno di nascita (es. 2004)"
            type="number"
            placeholder="es. 2004"
            value={annoNascita}
            onChange={e => setAnnoNascita(e.target.value)}
            error={annoNascita.trim() !== '' && !annoOk ? 'Anno non valido' : undefined}
          />

          <div>
            <span className="ds-label block mb-1">
              Classi FINP / World Para Swimming (S, SB, SM) — SB = senza i 10m
            </span>
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="S"
                type="number"
                placeholder="S"
                value={s}
                onChange={e => setS(e.target.value)}
              />
              <Input
                label="SB"
                type="number"
                placeholder="SB"
                value={sb}
                onChange={e => setSb(e.target.value)}
              />
              <Input
                label="SM"
                type="number"
                placeholder="SM"
                value={sm}
                onChange={e => setSm(e.target.value)}
              />
            </div>
            {errori.map((err, i) => (
              <p key={i} className="text-xs text-error mt-1 font-medium">{err}</p>
            ))}
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl space-y-1 border border-outline-variant">
            <label className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer rounded-lg px-1 -mx-1 hover:bg-surface-container transition-colors">
              <span className="min-w-0">
                <span className="font-semibold text-xs text-on-surface block">Classificazione Ufficiale</span>
                <span className="text-xs text-on-surface-variant">Se disattivato, risulta 'In Attesa'</span>
              </span>
              <input
                type="checkbox"
                checked={ufficiale}
                onChange={e => setUfficiale(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer rounded-lg px-1 -mx-1 hover:bg-surface-container transition-colors pt-2 border-t border-outline-variant">
              <span className="min-w-0">
                <span className="font-semibold text-xs text-on-surface block">Volume Automatico</span>
                <span className="text-xs text-on-surface-variant">Calcolato su età, condizioni mediche e classe</span>
              </span>
              <input
                type="checkbox"
                checked={volumeAuto}
                onChange={e => setVolumeAuto(e.target.checked)}
                className="w-5 h-5 shrink-0 accent-primary"
              />
            </label>

            {!volumeAuto && (
              <div className="pt-2 border-t border-outline-variant">
                <Input
                  label="Volume rispetto alla squadra (10 - 100%)"
                  type="number"
                  min="10"
                  max="100"
                  value={fattore}
                  onChange={e => setFattore(e.target.value)}
                  className="text-center font-bold"
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
              aria-label="Note / Menomazione"
              className="ds-input h-auto min-h-[56px] py-3 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <Button type="button" variant="ghost" onClick={onAnnulla}>
              Annulla
            </Button>
            <Button type="submit" disabled={!valido}>
              Salva Atleta
            </Button>
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
                className="w-12 h-12 flex items-center justify-center text-primary-container hover:bg-surface-container rounded-xl transition"
                title="Modifica anagrafica"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={onChiudi} aria-label="Chiudi dettaglio atleta" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:text-on-surface-variant rounded-xl transition">
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

        </div>

        {/* Tabs profilo — lista fissa, pannello scrollabile */}
        <Tabs
          tabs={[
            { id: 'biomeccanica', label: 'Biomeccanica', icon: <Sliders size={15} /> },
            { id: 'progressione', label: 'Progressione', icon: <Timer size={15} /> },
            { id: 'certificati', label: 'Certificati', icon: <HeartPulse size={15} /> },
          ]}
          activeId={tabDettaglio}
          onChange={(id) => setTabDettaglio(id as 'biomeccanica' | 'progressione' | 'certificati')}
          ariaLabel="Sezioni del profilo atleta"
          className="flex-1 min-h-0"
          panelClassName="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 space-y-4 text-sm"
        >
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
                    className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Condition Form */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2">
                <Input
                  type="text"
                  placeholder="Diagnosi / Condizione medica (es. Paraplegia T6, Acondroplasia...)"
                  aria-label="Diagnosi / Condizione medica"
                  value={nuovaCond}
                  onChange={e => setNuovaCond(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Limitazioni fisiche per l'allenamento in vasca..."
                  aria-label="Limitazioni fisiche"
                  value={nuovaLimitaz}
                  onChange={e => setNuovaLimitaz(e.target.value)}
                />
                <Button
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
                  className="w-full"
                >
                  Aggiungi Condizione Medica
                </Button>
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
                    className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Absence Form */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-2 text-xs">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="Dal (gg/mm/aaaa)"
                    aria-label="Data inizio assenza"
                    value={assDal}
                    onChange={e => setAssDal(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Al (gg/mm/aaaa)"
                    aria-label="Data fine assenza"
                    value={assAl}
                    onChange={e => setAssAl(e.target.value)}
                  />
                </div>
                <Input
                  type="text"
                  placeholder="Motivo (es. Convalescenza, Esami universitari...)"
                  aria-label="Motivo assenza"
                  value={assMotivo}
                  onChange={e => setAssMotivo(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
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
                  className="w-full"
                >
                  Registra Assenza
                </Button>
              </div>
            </div>
          </Sezione>
            </div>
          )}
        </Tabs>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant flex items-center justify-between shrink-0 bg-surface-container-low rounded-b-2xl">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Edit2 size={14} />}
              onClick={() => setModificaOpen(true)}
            >
              Modifica
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => {
                if (window.confirm(`Sei sicuro di voler eliminare ${atleta.nome} ${atleta.cognome}?`)) {
                  onEliminaAtleta(atleta.id);
                }
              }}
            >
              Elimina
            </Button>
          </div>

          <Button variant="secondary" onClick={onChiudi}>
            Chiudi
          </Button>
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
          <button onClick={onChiudi} aria-label="Chiudi" className="w-12 h-12 -mr-2 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="py-3 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
          {/* Add form */}
          <form onSubmit={handleAdd} className="p-3 bg-surface-container-low border border-outline-variant rounded-xl space-y-2.5">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="Data (gg/mm/aaaa)"
                aria-label="Data del tempo"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Distanza metri"
                aria-label="Distanza in metri"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              <Select
                value={stile}
                onChange={e => setStile(e.target.value)}
                aria-label="Stile"
                options={[
                  { value: 'STILE_LIBERO', label: 'Stile libero' },
                  { value: 'DORSO', label: 'Dorso' },
                  { value: 'RANA', label: 'Rana' },
                  { value: 'FARFALLA', label: 'Farfalla' },
                  { value: 'MISTI', label: 'Misti' },
                ]}
              />
              <Select
                value={contesto}
                onChange={e => setContesto(e.target.value)}
                aria-label="Contesto"
                options={[
                  { value: 'GARA', label: 'Gara ufficiale' },
                  { value: 'ALLENAMENTO', label: 'Allenamento' },
                  { value: 'TEST', label: 'Test in vasca' },
                ]}
              />
            </div>

            <Input
              type="text"
              placeholder="Tempo (es. 1:04.20 o 28.50)"
              aria-label="Tempo"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="font-bold"
            />

            <Button type="submit" disabled={!valido} className="w-full">
              Aggiungi Tempo
            </Button>
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
                    aria-label="Elimina tempo"
                    className="w-12 h-12 -m-2 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant flex justify-end">
          <Button variant="secondary" onClick={onChiudi}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
};
