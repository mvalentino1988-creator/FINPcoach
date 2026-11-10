import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  CodiceAllenamentoKey,
  DAY_OF_WEEK_FULL_NAMES,
  ParametriSeduta,
  TIPO_MICROCICLO_LABEL,
} from '../types';
import {
  formattaData,
  getDayOfWeek,
  isBefore,
  isInRange,
  toDateObj,
  todayISO,
  yearsBetween,
} from '../domain/dateUtils';
import { FINPStorage } from '../data/storage';
import { CodiciSeduta } from './CodiciSeduta';
import { EsercizioEditor } from './EsercizioEditor';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { PageHeader } from './PageHeader';
import { ParametriSedutaModal } from './ParametriSedutaModal';
import { codiciConsentiti, generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { calcolaVolumeSessione, type SedutaSettimana } from '../domain/volumePrescritto';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import {
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  Gauge,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Waves,
  X,
} from 'lucide-react';
import type { TabKey } from './Navbar';

const ORDINE_CODICI: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];

const SquadraVuota: React.FC = () => {
  const vai = (tab: TabKey, sezione?: string) => {
    if (sezione) sessionStorage.setItem('finp_altro_sezione', sezione);
    window.dispatchEvent(new CustomEvent('finp:navigate', { detail: tab }));
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-space-sm overflow-hidden">
      <PageHeader label="Oggi" title="Seduta e giornata" meta="La schermata operativa quotidiana." />
      <div className="ds-card p-space-lg text-center space-y-space-sm">
        <div className="w-12 h-12 rounded-xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-primary-sm">
          <Waves size={24} />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Inizia da qui</h3>
          <p className="font-body-base text-body-base text-on-surface-variant">
            Crea prima la stagione in <strong className="text-on-surface">Piano</strong>, poi aggiungi gli atleti in <strong className="text-on-surface">Squadra</strong>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-space-sm">
          <button type="button" onClick={() => vai('altro', 'piano')} className="ds-btn-primary">
            <ArrowUpRight size={16} />
            <span>Vai a Piano</span>
          </button>
          <button type="button" onClick={() => vai('squadra')} className="ds-btn-secondary">
            <Users size={16} />
            <span>Vai a Squadra</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const OggiScreen: React.FC = () => {
  const { stagione, atleti } = useApp();
  if (!stagione || atleti.length === 0) return <SquadraVuota />;
  return <OggiContent />;
};

const formattaMetri = (metri: number): string =>
  metri >= 1000 ? `${(metri / 1000).toFixed(1).replace('.', ',')}k` : `${metri.toLocaleString('it-IT')}`;

const OggiContent: React.FC = () => {
  const {
    stagione,
    macro,
    micro,
    meso,
    chiusure,
    gare,
    atleti,
    condizioni,
    tempi,
    log,
    impostazioni,
    parametriEffettivi,
    impostaOverrideSeduta,
    impostaParametriGiorno,
    rimuoviOverrideSeduta,
  } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [modalParametriOpen, setModalParametriOpen] = useState(false);
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [modalEsercizioOpen, setModalEsercizioOpen] = useState(false);
  const [revisioneStorage, setRevisioneStorage] = useState(0);

  // Popup modals per evitare scrolling nella schermata principale
  const [activePopup, setActivePopup] = useState<'squadra' | 'carico' | 'gare' | null>(null);

  const oggi = todayISO();
  const dow = getDayOfWeek(oggi);
  const dowNome = DAY_OF_WEEK_FULL_NAMES[dow];

  const chiusuraOggi = useMemo(() => chiusure.find(c => isInRange(oggi, c.dal, c.al)), [chiusure, oggi]);
  const garaOggi = useMemo(() => gare.find(g => isInRange(oggi, g.dal, g.al)), [gare, oggi]);
  const microCorrente = useMemo(() => micro.find(m => isInRange(oggi, m.inizio, m.fine)), [micro, oggi]);
  const mesoCorrente = useMemo(() => (microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) : null), [meso, microCorrente]);
  const macroCorrente = useMemo(() => (mesoCorrente ? macro.find(ma => ma.id === mesoCorrente.macrocicloId) : null), [macro, mesoCorrente]);

  const giorniAllenamento = impostazioni.giorni ?? parametriEffettivi.giorniAllenamento;
  const isGiornoAllenamento = giorniAllenamento.includes(dow) && !chiusuraOggi;
  const parametriSeduta = useMemo(() => risolviParametriSeduta(oggi, impostazioni, stagione), [oggi, impostazioni, stagione]);
  const settimanaISO = useMemo(() => seduteSettimana(oggi, giorniAllenamento), [oggi, giorniAllenamento]);
  const settimanaSedute: SedutaSettimana[] = useMemo(
    () => settimanaISO.map(d => ({ data: d, parametri: risolviParametriSeduta(d, impostazioni, stagione) })),
    [settimanaISO, impostazioni, stagione]
  );

  const atletaSel = atletaSelId ? atleti.find(a => a.id === atletaSelId) ?? null : null;
  const etaAtletaSel = atletaSel?.dataNascita ? yearsBetween(atletaSel.dataNascita, oggi) : null;
  const etaSquadra = useMemo(
    () => atleti.map(a => (a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null)).filter((e): e is number => e != null).sort((a, b) => a - b)[0] ?? null,
    [atleti, oggi]
  );

  const volumeSettimana = useMemo(() => {
    if (atletaSel && microCorrente) {
      return VolumeIndividuale.settimana(microCorrente, atletaSel, []).metri;
    }
    return microCorrente?.volumeTargetMetri || 1800 * Math.max(1, giorniAllenamento.length);
  }, [atletaSel, microCorrente, giorniAllenamento]);

  const volume = useMemo(() => {
    return calcolaVolumeSessione({
      micro: microCorrente,
      atleta: atletaSel,
      assenze: [],
      condizioni: atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva) : [],
      tempi: atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [],
      logSedute: atletaSel ? log.filter(l => l.atletaId === atletaSel.id) : log,
      parametri: parametriSeduta,
      durateSettimana: settimanaSedute,
      volumeSettimanaFallback: volumeSettimana,
    });
  }, [microCorrente, atletaSel, condizioni, tempi, log, parametriSeduta, settimanaSedute, volumeSettimana]);

  const volumeSessione = volume.metriSessione;

  const faseSeduta = mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE';
  const tipoSeduta = microCorrente?.tipo ?? 'CARICO';

  const rosterDati = useMemo(() => {
    return atleti.map(a => {
      const eta = a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null;
      const opts = {
        fase: faseSeduta,
        tipoMicro: tipoSeduta,
        etaAtleta: eta,
        condizioni: condizioni.filter(c => c.atletaId === a.id && c.attiva),
      };
      return {
        atleta: a,
        eta,
        codici: generaCodiciSeduta(opts).codici,
        consentiti: new Set(codiciConsentiti(opts)),
      };
    });
  }, [atleti, condizioni, oggi, faseSeduta, tipoSeduta]);

  const propostaCodici = useMemo(() => {
    if (atletaSel) {
      return generaCodiciSeduta({
        fase: faseSeduta,
        tipoMicro: tipoSeduta,
        etaAtleta: etaAtletaSel,
        condizioni: condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva),
      }).codici;
    }
    return generaCodiciSeduta({
      fase: faseSeduta,
      tipoMicro: tipoSeduta,
      etaAtleta: etaSquadra,
      condizioni: condizioni.filter(c => c.attiva),
    }).codici;
  }, [atletaSel, etaAtletaSel, etaSquadra, faseSeduta, tipoSeduta, condizioni]);

  const logsOggi = useMemo(() => log.filter(l => l.data === oggi), [log, oggi]);
  const presentiOggi = logsOggi.filter(l => l.presente).length;

  const seduteSvolteSettimana = useMemo(() => {
    return settimanaISO.filter(d => isBefore(d, oggi));
  }, [settimanaISO, oggi]);

  const volumeSvoltoSettimana = useMemo(() => {
    const logsSettimana = log.filter(l => settimanaISO.includes(l.data) && l.presente);
    const totale = logsSettimana.reduce((sum, l) => sum + (l.metriEffettivi || 0), 0);
    return atleti.length > 0 ? Math.round(totale / atleti.length) : totale;
  }, [log, settimanaISO, atleti]);

  const percVolumeSettimana = useMemo(() => {
    if (!volumeSettimana || volumeSettimana <= 0) return 0;
    return Math.min(100, Math.round((volumeSvoltoSettimana / volumeSettimana) * 100));
  }, [volumeSvoltoSettimana, volumeSettimana]);

  const prossimaGara = useMemo(() => {
    const future = gare.filter(g => !isBefore(g.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal));
    if (future.length === 0) return null;
    const g = future[0];
    const diffDays = Math.ceil((toDateObj(g.dal).getTime() - toDateObj(oggi).getTime()) / 86400000);
    return { ...g, diffDays: Math.max(0, diffDays) };
  }, [gare, oggi]);

  const [dataSchedaTarget, setDataSchedaTarget] = useState<string>(oggi);

  const vai = (tab: TabKey, sezione?: string, datiTab?: string) => {
    if (sezione) sessionStorage.setItem('finp_altro_sezione', sezione);
    if (datiTab) sessionStorage.setItem('finp_dati_tab', datiTab);
    window.dispatchEvent(new CustomEvent('finp:navigate', { detail: tab }));
  };

  const status = chiusuraOggi ? 'closed' : garaOggi ? 'race' : isGiornoAllenamento ? 'training' : 'rest';
  const statusLabel = chiusuraOggi ? 'Impianto Chiuso' : garaOggi ? 'Gara Ufficiale' : isGiornoAllenamento ? 'Allenamento Odierno' : 'Giorno di Riposo';
  const microLabel = microCorrente ? TIPO_MICROCICLO_LABEL[microCorrente.tipo] : 'Programmato';

  return (
    <div className="flex flex-col h-full justify-between overflow-hidden gap-2 p-2 sm:p-4 text-on-surface">
      {/* Header compatto */}
      <div className="flex items-center justify-between shrink-0 bg-surface-container-low px-3 py-2 rounded-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0" />
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">
            {dowNome} {formattaData(oggi)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            Micro: <strong className="text-primary">{microLabel}</strong>
          </span>
        </div>
      </div>

      {/* Hero Session Card — Ottimizzata per sfruttare lo spazio senza scorrimenti */}
      <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col justify-between border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-label-caps font-bold">
            {statusLabel}
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            Vasca {parametriSeduta.vascaMetri}m · {parametriSeduta.durataMin} min
          </span>
        </div>

        <div className="space-y-3 my-auto py-2">
          <div className="text-center space-y-1">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-widest">Focus Allenamento Odierno</span>
            <div className="py-1">
              <CodiciSeduta codici={propostaCodici} titolo="" compatto centrato />
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Volume Previsto</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">{formattaMetri(volumeSessione)} metri</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Progresso</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">{percVolumeSettimana}% sett.</span>
            </div>
          </div>
        </div>

        {/* Pulsanti principali d'azione */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            type="button"
            onClick={() => setModalIAOpen(true)}
            className="ds-btn-primary py-3 rounded-xl justify-center shadow-primary-sm"
          >
            <Sparkles size={18} />
            <span>Prepara con IA</span>
          </button>
          <button
            type="button"
            onClick={() => vai('vasca')}
            className="ds-btn-secondary py-3 rounded-xl justify-center"
          >
            <Timer size={18} />
            <span>Bordo Vasca</span>
          </button>
        </div>
      </div>

      {/* Barra inferiore compatta con pulsanti popup (Squadra, Carico, Gare) */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActivePopup('squadra')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition text-on-surface"
        >
          <Users size={20} className="text-primary mb-1" />
          <span className="font-headline-sm text-headline-sm">{atleti.length} Atleti</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Squadra</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopup('carico')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition text-on-surface"
        >
          <Gauge size={20} className="text-secondary mb-1" />
          <span className="font-headline-sm text-headline-sm">{formattaMetri(volumeSvoltoSettimana)}</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Carico Sett.</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopup('gare')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition text-on-surface"
        >
          <Trophy size={20} className="text-tertiary-container mb-1" />
          <span className="font-headline-sm text-headline-sm">{prossimaGara ? `${prossimaGara.diffDays} gg` : '—'}</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Prossima Gara</span>
        </button>
      </div>

      {/* POPUP MODALS */}
      {activePopup === 'squadra' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setActivePopup(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-slide-up max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Atleti in Squadra ({atleti.length})</h3>
              <button type="button" onClick={() => setActivePopup(null)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {rosterDati.map(({ atleta: a, eta }) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                  <span className="font-headline-sm text-on-surface">{a.cognome} {a.nome}</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">{eta != null ? `${eta} anni` : ''}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { setActivePopup(null); vai('squadra'); }} className="ds-btn-primary w-full py-3 rounded-xl justify-center">
              Gestisci Squadra Completa
            </button>
          </div>
        </div>
      )}

      {activePopup === 'carico' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setActivePopup(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Dettaglio Carico Settimanale</h3>
              <button type="button" onClick={() => setActivePopup(null)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="font-body-base text-on-surface-variant">Volume svolto: <strong className="text-on-surface">{volumeSvoltoSettimana.toLocaleString('it-IT')} m</strong> su {volumeSettimana.toLocaleString('it-IT')} m target ({percVolumeSettimana}%).</p>
              <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percVolumeSettimana}%` }} />
              </div>
              <p className="font-body-base text-on-surface-variant">{seduteSvolteSettimana.length} sedute svolte su {settimanaISO.length} totali in programma questa settimana.</p>
            </div>
            <button type="button" onClick={() => { setActivePopup(null); vai('altro', 'piano'); }} className="ds-btn-primary w-full py-3 rounded-xl justify-center">
              Vedi Piano Microciclo
            </button>
          </div>
        </div>
      )}

      {activePopup === 'gare' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setActivePopup(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Prossime Gare FINP</h3>
              <button type="button" onClick={() => setActivePopup(null)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {prossimaGara ? (
                <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                  <h4 className="font-headline-sm text-on-surface">{prossimaGara.nome}</h4>
                  <p className="font-body-base text-on-surface-variant">{formattaData(prossimaGara.dal)} · {prossimaGara.luogo}</p>
                  <p className="font-label-caps text-label-caps text-primary font-bold">Manca {prossimaGara.diffDays} giorni</p>
                </div>
              ) : (
                <p className="font-body-base text-on-surface-variant">Nessuna gara futura in programma.</p>
              )}
            </div>
            <button type="button" onClick={() => { setActivePopup(null); vai('altro', 'fonti'); }} className="ds-btn-primary w-full py-3 rounded-xl justify-center">
              Consulta Calendario Gare
            </button>
          </div>
        </div>
      )}

      {modalParametriOpen && (
        <ParametriSedutaModal
          open={modalParametriOpen}
          dataISO={oggi}
          giorno={dow}
          iniziali={parametriSeduta}
          origine={parametriSeduta.origine}
          settimana={settimanaSedute}
          volumeSettimana={volumeSettimana}
          passo100m={volume.passo100mCentesimi}
          onClose={() => setModalParametriOpen(false)}
          onApplicaOggi={(p: ParametriSeduta) => impostaOverrideSeduta(oggi, p)}
          onApplicaGiorno={(p: ParametriSeduta) => impostaParametriGiorno(dow, p)}
          onRimuoviOverride={() => rimuoviOverrideSeduta(oggi)}
        />
      )}

      {modalIAOpen && (
        <GeneraSchedaIAModal
          open={modalIAOpen}
          onClose={() => setModalIAOpen(false)}
          onSchedaGenerata={(testo: string) => {
            const customWorkouts = FINPStorage.getCustomWorkouts();
            const newWorkout = {
              id: Date.now().toString(),
              data: formattaData(oggi),
              testo,
              creatoIl: new Date().toISOString(),
              atletaId: atletaSel?.id ?? null,
              metriTotali: 0,
              codici: propostaCodici,
              fonte: 'ia' as const,
            };
            FINPStorage.saveCustomWorkouts([newWorkout, ...customWorkouts]);
            setRevisioneStorage(v => v + 1);
          }}
          data={oggi}
          atleta={atletaSel}
          fase={mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE'}
          tipoMicro={microCorrente?.tipo ?? 'CARICO'}
          parametri={parametriSeduta}
          volumeSessione={volumeSessione}
          volumeSettimana={volumeSettimana}
          tempi={atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : []}
          codiciAllenamento={propostaCodici}
        />
      )}

      {modalEsercizioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalEsercizioOpen(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-lg w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <EsercizioEditor
              onSalva={(testo, metri) => {
                const customWorkouts = FINPStorage.getCustomWorkouts();
                const newWorkout = {
                  id: Date.now().toString(),
                  data: formattaData(oggi),
                  testo,
                  creatoIl: new Date().toISOString(),
                  atletaId: atletaSel?.id ?? null,
                  metriTotali: metri,
                  codici: propostaCodici,
                  fonte: 'manuale' as const,
                };
                FINPStorage.saveCustomWorkouts([newWorkout, ...customWorkouts]);
                setModalEsercizioOpen(false);
              }}
              onAnnulla={() => setModalEsercizioOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
