import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { Atleta, Tempo } from '../types';
import { formattaData, todayISO, yearsBetween, isBefore } from '../domain/dateUtils';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { formattaTempo } from '../domain/tempoUtils';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { Badge, Button, Card, EmptyState, Input, ToastProvider, useToast } from './ui';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  UserPlus,
  Users
} from 'lucide-react';
import { ModalAtleta } from './atletiModali';
import { ModalDettaglioAtleta } from './atletaDettaglioModal';

const AtletiScreenContent: React.FC = () => {
  const {
    atleti,
    condizioni,
    assenze,
    tempi,
    log,
    micro,
    meso,
    gare,
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

  // Indici una tantum (300+ atleti / decine di migliaia di tempi): niente
  // filter dentro la mappa delle righe.
  const tempiPerAtleta = useMemo(() => {
    const map = new Map<number, Tempo[]>();
    for (const t of tempi) {
      const lista = map.get(t.atletaId);
      if (lista) lista.push(t);
      else map.set(t.atletaId, [t]);
    }
    return map;
  }, [tempi]);
  const TEMPI_VUOTI: Tempo[] = [];

  const microCorrente = useMemo(
    () => micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? null,
    [micro, oggi]
  );
  const mesoCorrente = useMemo(
    () => (microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) ?? null : null),
    [meso, microCorrente]
  );

  const classiValide = atleti.map(a => a.classeS).filter((s): s is number => s != null);
  const classiRange = classiValide.length > 0
    ? `S${Math.min(...classiValide)}–S${Math.max(...classiValide)}`
    : '—';
  const atletiConTempi = tempiPerAtleta.size;

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
          const mieiTempi = tempiPerAtleta.get(a.id) ?? TEMPI_VUOTI;
          const eta = a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null;

          const formCheck = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, mieiTempi, mesoCorrente);
          const haTempi = mieiTempi.length > 0;
          let migliorCent = Infinity;
          for (const t of mieiTempi) if (t.centesimi < migliorCent) migliorCent = t.centesimi;
          const migliorTempo = haTempi ? formattaTempo(migliorCent) : '—';

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
                <p className="font-label-caps text-[12px] text-on-surface-variant mt-0.5 truncate">
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
                  <span className="font-label-caps text-[12px] text-on-surface-variant uppercase leading-none">Miglior</span>
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
          gare={gare}
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
