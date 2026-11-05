import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../data/AppContext';
import {
  Atleta,
  DAY_OF_WEEK_FULL_NAMES,
  FASE_MESOCICLO_LABEL,
  ParametriSeduta,
  SchedaSeduta,
  TIPO_MICROCICLO_LABEL
} from '../types';
import {
  formattaData,
  getDayOfWeek,
  isInRange,
  todayISO,
  addDays,
  parseData,
  isBefore,
  toDateObj
} from '../domain/dateUtils';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { IndicatoreCodici } from './IndicatoreCodici';
import { BadgeCodice } from './BadgeCodice';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Edit2,
  HeartPulse,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  User,
  Users,
  Waves,
  Zap,
  Coffee,
  AlertTriangle,
  SlidersHorizontal,
  Gauge,
  Medal,
  Timer,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Bot,
  MoreHorizontal,
  X,
  Trophy,
  Activity
} from 'lucide-react';
import { formattaTempo } from '../domain/tempoUtils';
import { TabKey } from './Navbar';
import { calcolaVolumeSessione, ripartisciSettimana, SedutaSettimana } from '../domain/volumePrescritto';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { ParametriSedutaModal } from './ParametriSedutaModal';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { Marquee } from './Marquee';
import { EsercizioEditor } from './EsercizioEditor';

const SquadraVuota: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="ds-card p-space-lg sm:p-space-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-primary-sm">
          <Waves size={28} />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="ds-subtitle">
            Squadra Vuota
          </h3>
          <p className="ds-body">
            Imposta la <strong className="text-on-surface">Stagione</strong> nel <span className="text-primary font-body-bold">Piano</span> e aggiungi atleti in <span className="text-primary font-body-bold">Atleti</span> per iniziare.
          </p>
        </div>
      </div>
    </div>
  );
};

export const OggiScreen: React.FC = () => {
  const { stagione, atleti } = useApp();

  if (!stagione || atleti.length === 0) {
    return <SquadraVuota />;
  }

  return <OggiContent />;
};

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
    rimuoviOverrideSeduta
  } = useApp();

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const oggi = todayISO();
  const dow = getDayOfWeek(oggi);
  const dowNome = DAY_OF_WEEK_FULL_NAMES[dow];

  const [atletaSelId, setAtletaSelId] = useState<number | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [maxiDeck, setMaxiDeck] = useState(false);
  const [mostraSedutaStraordinaria, setMostraSedutaStraordinaria] = useState(false);
  const [modalParametriOpen, setModalParametriOpen] = useState(false);
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [modalEsercizioOpen, setModalEsercizioOpen] = useState(false);
  const [modalAtletiOpen, setModalAtletiOpen] = useState(false);
  const [modalTempiOpen, setModalTempiOpen] = useState(false);
  const [modalGareOpen, setModalGareOpen] = useState(false);
  const [mostraProposta, setMostraProposta] = useState(false);
  const [revisioneStorage, setRevisioneStorage] = useState(0);
  const [expandedAttenzioni, setExpandedAttenzioni] = useState<Set<number>>(new Set());
  const toggleAttenzione = (athleteId: number) =>
    setExpandedAttenzioni(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  const [trattiAperti, setTrattiAperti] = useState<Set<number>>(new Set());
  const toggleTratto = (idx: number) =>
    setTrattiAperti(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  const [avvisiAperti, setAvvisiAperti] = useState(false);

  // Check closure for today
  const chiusuraOggi = useMemo(() => {
    return chiusure.find(c => isInRange(oggi, c.dal, c.al));
  }, [chiusure, oggi]);

  // Check race for today
  const garaOggi = useMemo(() => {
    return gare.find(g => isInRange(oggi, g.dal, g.al));
  }, [gare, oggi]);

  // Current microcycle and mesocycle
  const microCorrente = useMemo(() => {
    return micro.find(m => isInRange(oggi, m.inizio, m.fine));
  }, [micro, oggi]);

  const mesoCorrente = useMemo(() => {
    if (!microCorrente) return null;
    return meso.find(me => me.id === microCorrente.mesocicloId);
  }, [meso, microCorrente]);

  const macroCorrente = useMemo(() => {
    if (!mesoCorrente) return null;
    return macro.find(ma => ma.id === mesoCorrente.macrocicloId);
  }, [macro, mesoCorrente]);

  const progressoStagione = useMemo(() => {
    if (!stagione?.inizio || !stagione.fine) return null;
    const inizio = toDateObj(stagione.inizio).getTime();
    const fine = toDateObj(stagione.fine).getTime();
    if (!Number.isFinite(inizio) || !Number.isFinite(fine) || fine <= inizio) return null;
    const corrente = toDateObj(oggi).getTime();
    return Math.round(Math.max(0, Math.min(1, (corrente - inizio) / (fine - inizio))) * 100);
  }, [stagione, oggi]);

  const numeroMicrociclo = microCorrente
    ? micro.findIndex(m => m.id === microCorrente.id) + 1
    : 0;

  const giorniAllenamento = impostazioni.giorni ?? parametriEffettivi.giorniAllenamento;
  const isGiornoAllenamento = giorniAllenamento.includes(dow) && !chiusuraOggi;
  const visualizzaSeduta = isGiornoAllenamento || mostraSedutaStraordinaria;

  const parametriSeduta = useMemo(
    () => risolviParametriSeduta(oggi, impostazioni, stagione),
    [oggi, impostazioni, stagione]
  );

  const settimanaISO = useMemo(() => seduteSettimana(oggi, giorniAllenamento), [oggi, giorniAllenamento]);
  const settimanaSedute: SedutaSettimana[] = useMemo(
    () => settimanaISO.map((d) => ({ data: d, parametri: risolviParametriSeduta(d, impostazioni, stagione) })),
    [settimanaISO, impostazioni, stagione]
  );

  const atletaSel = atletaSelId ? atleti.find(a => a.id === atletaSelId) : null;

  const volumeSettimanaAtleta = useMemo(() => {
    if (!microCorrente) return 1800 * Math.max(1, giorniAllenamento.length);
    if (atletaSel) {
      return VolumeIndividuale.settimana(microCorrente, atletaSel, []).metri;
    }
    return microCorrente.volumeTargetMetri || 1800 * Math.max(1, giorniAllenamento.length);
  }, [microCorrente, atletaSel, giorniAllenamento]);

  const volumeSessione = useMemo(() => {
    const res = calcolaVolumeSessione({
      micro: microCorrente,
      atleta: atletaSel,
      assenze: [],
      condizioni: atletaSel ? condizioni.filter((c) => c.atletaId === atletaSel.id && c.attiva) : [],
      tempi: atletaSel ? tempi.filter((t) => t.atletaId === atletaSel.id) : [],
      logSedute: log,
      parametri: parametriSeduta,
      durateSettimana: settimanaSedute,
      volumeSettimanaFallback: volumeSettimanaAtleta,
    });
    return res.metriSessione;
  }, [microCorrente, atletaSel, condizioni, tempi, log, parametriSeduta, settimanaSedute, volumeSettimanaAtleta]);

  const volumeSquadra = useMemo(() => {
    if (!microCorrente) return 2000;
    const sedute = (microCorrente.sedutePreviste && microCorrente.sedutePreviste > 0) ? microCorrente.sedutePreviste : giorniAllenamento.length;
    return Math.round((microCorrente.volumeTargetMetri || 2000) / (sedute > 0 ? sedute : 3));
  }, [microCorrente, giorniAllenamento]);

  const schedaManuale = useMemo(() => {
    const dataOggiFormatted = formattaData(oggi);
    const customList = FINPStorage.getCustomWorkouts();
    return customList.find(w => {
      const matchData = w.data === dataOggiFormatted || w.data === oggi;
      const matchDest = atletaSel ? w.atletaId === atletaSel.id : w.atletaId === null;
      return matchData && matchDest;
    }) ?? null;
  }, [oggi, atletaSel, revisioneStorage]);

  const propostaSistema: SchedaSeduta | null = useMemo(() => {
    const fase = mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE';
    const tipo = microCorrente?.tipo ?? 'CARICO';
    const condiz = atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva) : [];
    const mieitempi = atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [];

    return GeneratoreSmartSeduta.genera(
      oggi,
      volumeSessione,
      fase,
      tipo,
      atletaSel ?? undefined,
      condiz,
      mieitempi,
      log,
      mesoCorrente,
      giorniAllenamento,
      parametriSeduta
    );
  }, [oggi, volumeSessione, mesoCorrente, microCorrente, atletaSel, condizioni, tempi, log, giorniAllenamento, parametriSeduta]);

  const schedaOggi: SchedaSeduta | null = useMemo(() => {
    if (schedaManuale) {
      const serie = ParserScheda.parseSerie(schedaManuale.testo);
      const volumeTotale = schedaManuale.metriTotali || ParserScheda.calcolaMetriDaTesto(schedaManuale.testo);
      const analisi = ParserScheda.analisiQualitativa(schedaManuale.testo);
      const tratti = serie.map((s, idx) => ({
        sezione: s.sezione || s.descrizione.split(' ')[0] || `Serie ${idx + 1}`,
        codice: s.codice as any,
        ripetizioni: s.ripetizioni > 1 ? `${s.ripetizioni}x` : '1x',
        metri: s.metriTotali,
        descrizione: s.descrizione,
        attrezzi: s.attrezzi
      }));
      const ripartizioneCodici: Partial<Record<any, number>> = {};
      for (const t of tratti) {
        ripartizioneCodici[t.codice] = (ripartizioneCodici[t.codice] ?? 0) + t.metri;
      }
      return {
        titolo: `Allenamento Manuale Inserito · del ${schedaManuale.data}`,
        data: schedaManuale.data,
        nomeAtleta: atletaSel ? `${atletaSel.cognome} ${atletaSel.nome}` : null,
        etaAtleta: null,
        categoriaEta: null,
        faseStagione: 'PREPARAZIONE_SPECIFICA',
        tipoMicrociclo: 'CARICO',
        volumeTotaleMetri: volumeTotale,
        ripartizioneCodici,
        tratti,
        adattamentiEta: [],
        avvertenzeMediche: [],
        tempiUtilizzati: [],
        noteCalibrazione: [`Scheda inserita manualmente dall'allenatore. Attrezzi: ${analisi.attrezzi.join(', ') || 'Nessuno'}`],
        tipoSeduta: 'Allenamento Manuale',
        vascaMetri: parametriSeduta.vascaMetri,
        durataMin: parametriSeduta.durataMin
      };
    }

    return mostraProposta ? propostaSistema : null;
  }, [schedaManuale, mostraProposta, propostaSistema, atletaSel, parametriSeduta]);

  useEffect(() => {
    if (isDesktop && schedaOggi) {
      setTrattiAperti(new Set(schedaOggi.tratti.map((_, idx) => idx)));
    }
  }, [isDesktop, schedaOggi]);

  const salvaProposta = () => {
    if (!propostaSistema) return;
    const testo = propostaSistema.tratti
      .map(t => `${t.sezione}: ${t.ripetizioni} ${t.metri}m ${t.descrizione}`.trim())
      .join('\n');
    const newWorkout = {
      id: Date.now().toString(),
      data: formattaData(oggi),
      testo,
      creatoIl: new Date().toISOString(),
      atletaId: atletaSel?.id ?? null,
      metriTotali: propostaSistema.volumeTotaleMetri,
    };
    FINPStorage.saveCustomWorkouts([newWorkout, ...FINPStorage.getCustomWorkouts()]);
    setMostraProposta(false);
    setRevisioneStorage(v => v + 1);
  };

  const formatWorkoutText = useCallback(() => {
    if (!schedaOggi) return '';
    const lines: string[] = [];
    lines.push(`🏊 FINPcoach - ${schedaOggi.titolo}`);
    lines.push(`📅 Data: ${formattaData(oggi)} (${dowNome})`);
    lines.push(`📊 Volume: ${schedaOggi.volumeTotaleMetri} m · Vasca: ${schedaOggi.vascaMetri ?? parametriSeduta.vascaMetri}m · Durata: ${schedaOggi.durataMin ?? parametriSeduta.durataMin}'`);
    lines.push(`📊 Fase: ${FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]}`);
    if (atletaSel) lines.push(`👤 Atleta: ${atletaSel.cognome} ${atletaSel.nome} (Classe S${atletaSel.classeS})`);
    lines.push('');
    return lines.join('\n');
  }, [schedaOggi, oggi, dowNome, parametriSeduta, atletaSel]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formatWorkoutText()).then(() => {
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    });
  }, [formatWorkoutText]);

  // Keyboard shortcut 'C' for WhatsApp copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]);

  const isAndroidApp = typeof window !== 'undefined' && Boolean((window as any).AndroidBridge);

  const prossimoAllenamento = useMemo(() => {
    if (isGiornoAllenamento) return null;
    for (let i = 1; i <= 7; i++) {
      const nextDate = addDays(oggi, i);
      const nextDow = getDayOfWeek(nextDate);
      const nextChiusura = chiusure.find(c => isInRange(nextDate, c.dal, c.al));
      if (giorniAllenamento.includes(nextDow) && !nextChiusura) {
        const nextMicro = micro.find(m => isInRange(nextDate, m.inizio, m.fine));
        const nextMeso = nextMicro ? meso.find(me => me.id === nextMicro.mesocicloId) : null;
        return {
          data: nextDate,
          dowNome: DAY_OF_WEEK_FULL_NAMES[nextDow],
          micro: nextMicro,
          meso: nextMeso
        };
      }
    }
    return null;
  }, [isGiornoAllenamento, oggi, giorniAllenamento, chiusure, micro, meso]);

  const prossimaGara = useMemo(() => {
    const futureGare = (gare || []).filter(g => !isBefore(g.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal));
    if (futureGare.length === 0) return null;
    const g = futureGare[0];
    const diffDays = Math.ceil((toDateObj(g.dal).getTime() - toDateObj(oggi).getTime()) / (1000 * 60 * 60 * 24));
    return { ...g, diffDays: Math.max(0, diffDays) };
  }, [gare, oggi]);

  const metriCompletatiSettimana = useMemo(() => {
    return (log || [])
      .filter(l => isInRange(l.data, settimanaISO[0], settimanaISO[settimanaISO.length - 1]))
      .reduce((sum, item) => sum + (item.metriEffettivi || 0), 0);
  }, [log, settimanaISO]);

  const volumeSettimanaPercentuale = Math.min(
    100,
    Math.round((metriCompletatiSettimana / Math.max(1, volumeSettimanaAtleta)) * 100)
  );

  const attenzioniRaggruppate = useMemo(() => {
    const map = new Map<number, { athleteId: number; athleteName: string; notes: string[]; hasMedical: boolean }>();
    (atleti || []).forEach(a => {
      const conds = (condizioni || []).filter(c => c.atletaId === a.id && c.attiva);
      const aTempi = (tempi || []).filter(t => t.atletaId === a.id);
      const fc = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, aTempi, mesoCorrente);

      const notes: string[] = [];
      let hasMedical = false;

      conds.forEach(c => {
        if (c.descrizione || c.limitazioni) {
          notes.push(c.descrizione || c.limitazioni);
          hasMedical = true;
        }
      });
      if (fc.necessario) {
        notes.push('Form Check necessario');
      }

      if (notes.length > 0) {
        map.set(a.id, {
          athleteId: a.id,
          athleteName: `${a.cognome} ${a.nome?.[0]}.`,
          notes,
          hasMedical
        });
      }
    });
    return Array.from(map.values());
  }, [atleti, condizioni, tempi, mesoCorrente]);

  const ultimiTempi = useMemo(() => {
    return [...(tempi || [])].sort((a, b) => b.data.localeCompare(b.data)).slice(0, 3).map(t => {
      const a = (atleti || []).find(atl => atl.id === t.atletaId);
      return {
        ...t,
        atletaNome: a ? `${a.cognome} ${a.nome?.[0]}.` : 'Atleta'
      };
    });
  }, [tempi, atleti]);

  return (
    <div className={`oggi-screen relative flex flex-1 min-h-0 flex-col gap-2 overflow-hidden ${visualizzaSeduta && schedaOggi ? 'oggi-screen-with-workout' : ''}`}>
      {/* Desktop 2-Column Layout (lg: 1024px+) vs Mobile 1-Column */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-2 lg:gap-4 overflow-hidden">

        <div className="oggi-main-column flex flex-col gap-2 min-h-0">
          <section className="oggi-day-card relative shrink-0 rounded-3xl bg-surface-container-low border border-outline-variant shadow-card px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4">
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/80 font-headline flex items-center gap-1.5 mb-1">
                  <Waves size={13} className="shrink-0" />
                  <span className="whitespace-normal break-words">
                    <span className="oggi-date-weekday">{dowNome} · </span>{formattaData(oggi)}
                  </span>
                </span>
                <h1 className="text-xl sm:text-headline-lg text-on-surface tracking-tight leading-tight font-bold font-headline whitespace-normal break-words">
                  {chiusuraOggi
                    ? 'Piscina chiusa'
                    : garaOggi
                      ? `Gara · ${garaOggi.nome}`
                      : isGiornoAllenamento
                        ? 'Seduta di oggi'
                        : 'Giorno di recupero'}
                </h1>
                {microCorrente && (
                  <p className="text-sm text-on-surface-variant mt-1 whitespace-normal break-words">
                    {microCorrente.tipo === 'CARICO'
                      ? 'Settimana di carico'
                      : microCorrente.tipo === 'SCARICO'
                        ? 'Settimana di scarico'
                        : TIPO_MICROCICLO_LABEL[microCorrente.tipo]}
                    {volumeSessione > 0 && isGiornoAllenamento
                      ? ` · seduta ${volumeSessione >= 1000 ? `${(volumeSessione / 1000).toFixed(1).replace('.', ',')} km` : `${volumeSessione} m`}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {chiusuraOggi ? (
                  <span className="ds-chip-coral !px-3 !py-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span className="truncate text-xs">Chiusa</span>
                  </span>
                ) : garaOggi ? (
                  <span className="ds-chip-tertiary !px-3 !py-2">
                    <Zap size={14} className="shrink-0" />
                    <span className="text-xs truncate">Gara</span>
                  </span>
                ) : isGiornoAllenamento ? (
                  <span className="ds-chip bg-primary/10 text-primary border border-primary/20 !px-4 !py-2">
                    <Sparkles size={14} className="shrink-0" />
                    <span className="text-xs">Seduta prevista</span>
                  </span>
                ) : (
                  <span className="ds-chip-neutral !px-3 !py-2">
                    <Coffee size={14} className="shrink-0" />
                    <span className="text-xs">Recupero</span>
                  </span>
                )}
              </div>
            </div>
          </section>



          {/* Current season and training phase */}
          {stagione && (
            <section className="oggi-season-card shrink-0 rounded-2xl bg-surface-container-lowest text-on-surface px-3 py-2.5 border border-outline-variant shadow-card animate-fade-in space-y-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <Activity size={13} className="shrink-0 text-primary" />
                    <span>Momento attuale</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{macroCorrente?.nome ?? stagione.nome}</span>
                  </div>
                  <h2 className="font-headline font-bold text-sm truncate mt-0.5">
                    {mesoCorrente?.fase
                      ? FASE_MESOCICLO_LABEL[mesoCorrente.fase]
                      : microCorrente
                        ? TIPO_MICROCICLO_LABEL[microCorrente.tipo]
                        : 'Piano stagionale'}
                  </h2>
                </div>
                <span className="shrink-0 rounded-lg bg-surface-container px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                  {stagione.vascaMetri} m
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-outline-variant pt-2">
                <div className="min-w-0">
                  <span className="block text-[10px] text-on-surface-variant">Microciclo</span>
                  <span className="block truncate text-xs font-bold">
                    {numeroMicrociclo > 0 ? `${numeroMicrociclo} / ${micro.length}` : 'Non pianificato'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-on-surface-variant">Volume settimana</span>
                  <span className="block truncate text-xs font-bold">
                    {microCorrente?.volumeTargetMetri
                      ? `${microCorrente.volumeTargetMetri.toLocaleString('it-IT')} m`
                      : '—'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-on-surface-variant">Stagione</span>
                  <span className="block truncate text-xs font-bold">
                    {progressoStagione !== null ? `${progressoStagione}%` : `${formattaData(stagione.inizio)} – ${formattaData(stagione.fine)}`}
                  </span>
                </div>
              </div>

              {progressoStagione !== null && (
                <div
                  className="h-1 overflow-hidden rounded-full bg-surface-container"
                  role="progressbar"
                  aria-label="Progresso della stagione"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressoStagione}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressoStagione}%` }}
                  />
                </div>
              )}
              <span className="sr-only">
                Stagione {stagione.nome}, dal {formattaData(stagione.inizio)} al {formattaData(stagione.fine)}
              </span>
            </section>
          )}

          {/* Statistiche in griglia 2x2 simmetrica e interamente cliccabile */}
          <section className="oggi-statistics lg:hidden shrink-0 grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setModalAtletiOpen(true)}
              aria-label={`Atleti: ${atleti.length}`}
              className="ds-card p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left hover:bg-surface-container-low transition cursor-pointer group"
            >
              <div>
                <span className="oggi-stat-label ds-label">Atleti</span>
                <div className="text-sm sm:text-base font-bold tabular-nums text-on-surface">{atleti.length}</div>
              </div>
              <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Users size={14} className="sm:hidden" /><Users size={18} className="hidden sm:block" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModalParametriOpen(true)}
              aria-label={`Allenamenti settimanali: ${giorniAllenamento.length}`}
              className="ds-card p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left hover:bg-surface-container-low transition cursor-pointer group"
            >
              <div>
                <span className="oggi-stat-label ds-label">Sedute</span>
                <div className="text-sm sm:text-base font-bold tabular-nums text-on-surface">{giorniAllenamento.length}</div>
              </div>
              <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Calendar size={14} className="sm:hidden" /><Calendar size={18} className="hidden sm:block" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModalTempiOpen(true)}
              aria-label={`Tempi registrati: ${tempi.length}`}
              className="ds-card p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left hover:bg-surface-container-low transition cursor-pointer group"
            >
              <div>
                <span className="oggi-stat-label ds-label">Tempi</span>
                <div className="text-sm sm:text-base font-bold tabular-nums text-on-surface">{tempi.length}</div>
              </div>
              <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Clock size={14} className="sm:hidden" /><Clock size={18} className="hidden sm:block" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModalGareOpen(true)}
              aria-label={`Gare: ${gare.length}`}
              className="ds-card p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left hover:bg-surface-container-low transition cursor-pointer group"
            >
              <div>
                <span className="oggi-stat-label ds-label">Gare</span>
                <div className="text-sm sm:text-base font-bold tabular-nums text-on-surface">{gare.length}</div>
              </div>
              <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Trophy size={14} className="sm:hidden" /><Trophy size={18} className="hidden sm:block" />
              </div>
            </button>
          </section>

          {/* Utility widgets */}
          <div className="oggi-secondary-cards flex flex-col gap-2 sm:gap-3 shrink-0">
          {gare.length > 0 && (
            <button
              type="button"
              onClick={() => setModalGareOpen(true)}
              className="oggi-events-card w-full shrink-0 ds-card p-2 sm:p-4 space-y-1 sm:space-y-2 bg-surface-container-low border border-outline-variant hover:bg-surface-container transition cursor-pointer text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy size={18} className="text-primary shrink-0" />
                  <span className="font-headline font-bold text-sm text-on-surface">Prossime Gare</span>
                </div>
                <span className="text-xs text-primary font-bold">{gare.length} eventi</span>
              </div>
              <div className="space-y-1.5">
                {gare.slice(0, 2).map((g, index) => (
                  <div key={g.id} className={`${index > 0 ? 'hidden sm:flex' : 'flex'} items-start justify-between gap-2 text-xs py-1.5 px-3 rounded-xl bg-surface-container border border-outline-variant`}>
                    <span className="min-w-0 whitespace-normal break-words font-bold text-on-surface">{g.nome}</span>
                    <span className="text-on-surface-variant tabular-nums shrink-0">{formattaData(g.dal)}</span>
                  </div>
                ))}
              </div>
            </button>
          )}

          </div>

          {(!visualizzaSeduta || !schedaOggi) && (
            <section className="oggi-weekly-progress lg:hidden ds-card p-3 sm:p-4 space-y-3 flex flex-col justify-between min-h-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity size={17} className="text-primary shrink-0" />
                    <h2 className="font-headline font-bold text-sm text-on-surface truncate">Programma della settimana</h2>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-primary">{volumeSettimanaPercentuale}%</span>
                </div>
                <div className="space-y-1.5">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-container"
                    role="progressbar"
                    aria-label="Volume settimanale completato"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={volumeSettimanaPercentuale}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${volumeSettimanaPercentuale}%` }}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {(metriCompletatiSettimana / 1000).toFixed(1).replace('.', ',')} / {(volumeSettimanaAtleta / 1000).toFixed(1).replace('.', ',')} km registrati
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Sedute previste</h3>
                  {settimanaISO.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {settimanaISO.map(data => {
                        const registrata = log.some(sessione => sessione.data === data);
                        const giornoNome = DAY_OF_WEEK_FULL_NAMES[getDayOfWeek(data)];
                        const stato = registrata ? 'Registrata' : data === oggi ? 'Oggi' : 'Prevista';
                        return (
                          <div
                            key={data}
                            aria-label={`${giornoNome} ${formattaData(data)} · ${stato}`}
                            className={`rounded-xl border p-2 text-center ${
                              registrata
                                ? 'bg-success-container border-success/20 text-on-success-container'
                                : data === oggi
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase">{giornoNome.slice(0, 3)}</span>
                            <span className="block text-lg font-bold font-headline tabular-nums">{data.slice(8, 10)}</span>
                            <span className="block text-[9px] font-semibold">{stato}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant">Nessuna seduta configurata per questa settimana.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-outline-variant pt-2.5">
                <Calendar size={16} className="text-on-surface-variant shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Prossimo allenamento</span>
                  <span className="block text-xs font-bold text-on-surface truncate">
                    {prossimoAllenamento
                      ? `${prossimoAllenamento.dowNome} · ${formattaData(prossimoAllenamento.data)}`
                      : isGiornoAllenamento
                        ? `Oggi · ${dowNome}`
                        : 'Non programmato'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-primary text-right shrink-0">
                  {prossimoAllenamento?.micro
                    ? TIPO_MICROCICLO_LABEL[prossimoAllenamento.micro.tipo]
                    : microCorrente
                      ? TIPO_MICROCICLO_LABEL[microCorrente.tipo]
                      : ''}
                </span>
              </div>
            </section>
          )}

          {/* COMPACT WORKOUT CARD (Nessuna scheda o Scheda del giorno) */}
          {visualizzaSeduta && !schedaOggi && (
            <div className="oggi-workout-prompt shrink-0 ds-card p-2 sm:p-3 space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList size={16} className="text-primary shrink-0" />
                  <span className="font-headline font-bold text-xs text-on-surface truncate">Nessuna scheda per oggi</span>
                </div>
                <span className="text-[12px] text-on-surface-variant font-medium hidden xs:inline">Scrivi, genera o usa proposta</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalEsercizioOpen(true)}
                  className="ds-btn-secondary !min-h-[40px] sm:!min-h-[52px] !px-1.5 text-xs justify-center flex flex-col items-center py-1"
                >
                  <ClipboardList size={16} />
                  <span className="text-[11px] font-bold whitespace-nowrap leading-tight text-center">A mano</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalIAOpen(true)}
                  className="ds-btn-secondary !min-h-[40px] sm:!min-h-[52px] !px-1.5 text-xs justify-center flex flex-col items-center py-1"
                >
                  <Bot size={16} />
                  <span className="text-[11px] font-bold whitespace-nowrap leading-tight text-center">Genera IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostraProposta(true)}
                  className="ds-btn-primary !min-h-[40px] sm:!min-h-[52px] !px-1.5 text-xs justify-center flex flex-col items-center py-1"
                >
                  <Sparkles size={16} />
                  <span className="text-[11px] font-bold whitespace-nowrap leading-tight text-center">Proposta</span>
                </button>
              </div>
            </div>
          )}

          {visualizzaSeduta && schedaOggi && (
            <div className={`print-area flex flex-col gap-3 ${maxiDeck ? 'bg-inverse-surface text-inverse-on-surface p-4 rounded-xl' : ''}`}>
              <div className="no-print ds-card p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <select
                    value={atletaSelId ?? ''}
                    onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 font-headline font-bold text-xs sm:text-sm text-on-surface focus:border-primary"
                  >
                    <option value="">Squadra ({volumeSquadra}m)</option>
                    {atleti.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.cognome} {a.nome} (S{a.classeS ?? '?'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setModalParametriOpen(true)}
                    className="ds-btn-ghost !min-h-[48px] !px-3 text-xs"
                    title="Vasca e durata"
                  >
                    <SlidersHorizontal size={16} />
                    <span className="hidden sm:inline">Vasca/Tempo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalIAOpen(true)}
                    className="ds-btn-ghost !min-h-[48px] !px-3 text-xs"
                    title="Genera con IA"
                  >
                    <Bot size={16} />
                    <span className="hidden sm:inline">IA</span>
                  </button>

                  {!isAndroidApp && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="ds-btn-ghost !min-h-[48px] !px-3 text-xs"
                      title="Stampa"
                    >
                      <Printer size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ds-btn-primary !min-h-[48px] !px-3.5 text-xs"
                    title="Copia WhatsApp"
                  >
                    {copiato ? <Check size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{copiato ? 'Copiato!' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>

              {/* Tratti della scheda */}
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    <Marquee text={schedaOggi.titolo} />
                  </h3>
                  <span className="text-xs font-bold font-headline text-primary bg-surface-container px-3 py-1 rounded-full">
                    {schedaOggi.volumeTotaleMetri} m
                  </span>
                </div>

                <div className="space-y-2">
                  {schedaOggi.tratti.map((t, idx) => {
                    const aperto = trattiAperti.has(idx);
                    return (
                      <div key={idx} className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleTratto(idx)}
                          className="w-full flex items-center gap-3 p-3 text-left font-headline text-xs font-bold min-h-[48px]"
                        >
                          <span className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{t.sezione}</span>
                          <BadgeCodice codice={t.codice} />
                          <span className="ml-auto text-primary tabular-nums shrink-0">{t.metri} m</span>
                          {aperto ? <ChevronRight size={18} className="rotate-90 text-on-surface-variant" /> : <ChevronRight size={18} className="text-on-surface-variant" />}
                        </button>

                        {(aperto || isDesktop) && (
                          <div className="px-4 pb-4 pt-2 border-t border-outline-variant text-xs space-y-1.5">
                            <div className="font-bold text-on-surface">{t.ripetizioni} · {t.descrizione}</div>
                            {t.notaSpecifica && <div className="text-primary italic">Focus: {t.notaSpecifica}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (Desktop Sidebar 384px fixed) */}
        <div className="oggi-sidebar hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden pl-1 w-[384px]">
          {/* Statistiche 2x2 Grid */}
          <div className="ds-card p-3 space-y-2">
            <h3 className="font-headline font-bold text-xs text-primary uppercase tracking-wider">Panoramica Squadra</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-on-surface tabular-nums">{atleti.length}</div>
                <div className="text-[12px] text-on-surface-variant uppercase font-bold">Atleti</div>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-on-surface tabular-nums">{giorniAllenamento.length}</div>
                <div className="text-[12px] text-on-surface-variant uppercase font-bold">Sedute/sett.</div>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-on-surface tabular-nums">{tempi.length}</div>
                <div className="text-[12px] text-on-surface-variant uppercase font-bold">Tempi</div>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-on-surface tabular-nums">{gare.length}</div>
                <div className="text-[12px] text-on-surface-variant uppercase font-bold">Gare</div>
              </div>
            </div>
          </div>

          {/* Prossima Gara */}
          {prossimaGara && (
            <div className="ds-card p-3 bg-gradient-to-r from-surface-container-low to-surface-container border border-outline-variant flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-tertiary text-white flex items-center justify-center shrink-0 shadow-orange-glow">
                  <Trophy size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] uppercase font-bold text-tertiary tracking-wider font-headline">Prossima Gara</div>
                  <div className="font-headline font-bold text-xs text-on-surface truncate"><Marquee text={prossimaGara.nome} /></div>
                  <div className="text-[12px] text-on-surface-variant">{formattaData(prossimaGara.dal)}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-extrabold text-tertiary font-headline tabular-nums">{prossimaGara.diffDays}</span>
                <span className="text-xs block uppercase opacity-80">giorni</span>
              </div>
            </div>
          )}

          {/* Volume Settimanale */}
          <div className="ds-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-headline">
              <span className="text-primary flex items-center gap-1.5"><Activity size={14} /> Volume Settimanale</span>
              <span className="text-on-surface-variant tabular-nums">{Math.round((metriCompletatiSettimana / Math.max(1, volumeSettimanaAtleta)) * 100)}%</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-container h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((metriCompletatiSettimana / Math.max(1, volumeSettimanaAtleta)) * 100))}%` }}
              />
            </div>
            <div className="text-xs text-on-surface-variant text-center">
              {(metriCompletatiSettimana / 1000).toFixed(1).replace('.', ',')} / {(volumeSettimanaAtleta / 1000).toFixed(1).replace('.', ',')} km nuotati in settimana
            </div>
          </div>

          {/* Attenzioni di Oggi */}
          {attenzioniRaggruppate.length > 0 && (
            <div className="ds-card p-3 space-y-2 border-l-4 border-l-error">
              <div className="flex items-center gap-1.5 text-xs font-bold font-headline text-error">
                <HeartPulse size={14} />
                <span>Attenzioni di Oggi ({attenzioniRaggruppate.length} atleti)</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {attenzioniRaggruppate.map((att) => {
                  const isExp = expandedAttenzioni.has(att.athleteId);
                  return (
                    <div
                      key={att.athleteId}
                      className={`rounded-xl text-xs border transition ${
                        att.hasMedical ? 'bg-error-container/60 text-on-error-container border-error/30' : 'bg-warning-container/60 text-on-warning-container border-warning/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAttenzione(att.athleteId)}
                        className="w-full min-h-[44px] p-3 flex items-center justify-between gap-3 text-left font-bold"
                      >
                        <span className="truncate">{att.athleteName} <span className="opacity-75 font-normal">({att.notes.length} avvisi)</span></span>
                        <ChevronRight size={14} className={`shrink-0 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                      </button>
                      {isExp && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-current/20 space-y-1 text-xs opacity-95">
                          {att.notes.map((note, nIdx) => (
                            <div key={nIdx}>• <Marquee text={note} /></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ultimi Tempi Registrati */}
          {ultimiTempi.length > 0 && (
            <div className="ds-card p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-headline text-primary">
                <span className="flex items-center gap-1.5"><Clock size={14} /> Ultimi tempi</span>
              </div>
              <div className="space-y-1">
                {ultimiTempi.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-container-low border border-outline-variant">
                    <span className="font-bold text-on-surface truncate">{t.atletaNome}</span>
                    <div className="flex items-center gap-3 font-mono font-bold text-primary tabular-nums shrink-0">
                      <span>{t.distanzaMetri}m</span>
                      <span>{formattaTempo(t.centesimi)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ParametriSedutaModal
        open={modalParametriOpen}
        dataISO={oggi}
        giorno={dow}
        iniziali={parametriSeduta}
        origine={parametriSeduta.origine}
        settimana={settimanaSedute}
        volumeSettimana={volumeSettimanaAtleta}
        passo100m={6000}
        onClose={() => setModalParametriOpen(false)}
        onApplicaOggi={(p) => impostaOverrideSeduta(oggi, p)}
        onApplicaGiorno={(p) => impostaParametriGiorno(dow, p)}
        onRimuoviOverride={() => rimuoviOverrideSeduta(oggi)}
      />
      <GeneraSchedaIAModal
        open={modalIAOpen}
        onClose={() => setModalIAOpen(false)}
        onSchedaGenerata={(testo) => {
          const metriTotali = ParserScheda.calcolaMetriDaTesto(testo);
          const newWorkout = {
            id: Date.now().toString(),
            data: formattaData(oggi),
            testo,
            creatoIl: new Date().toISOString(),
            atletaId: atletaSel?.id ?? null,
            metriTotali,
          };
          const updated = [newWorkout, ...FINPStorage.getCustomWorkouts()];
          FINPStorage.saveCustomWorkouts(updated);
          setRevisioneStorage(v => v + 1);
        }}
        data={oggi}
        atleta={atletaSel ?? null}
        fase={mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE'}
        tipoMicro={microCorrente?.tipo ?? 'CARICO'}
        parametri={parametriSeduta}
        volumeSessione={volumeSessione}
        volumeSettimana={volumeSettimanaAtleta}
        condizioni={atletaSel ? condizioni.filter((c) => c.atletaId === atletaSel.id && c.attiva) : []}
        tempi={atletaSel ? tempi.filter((t) => t.atletaId === atletaSel.id) : []}
        note={schedaOggi?.noteCalibrazione ?? propostaSistema?.noteCalibrazione}
        ripartizioneCodici={propostaSistema?.ripartizioneCodici}
      />

      {modalEsercizioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-2xl w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Scrivi scheda a mano</h3>
              <button
                type="button"
                onClick={() => setModalEsercizioOpen(false)}
                aria-label="Chiudi"
                className="w-10 min-h-[48px] rounded-full flex items-center justify-center hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>
            <EsercizioEditor
              onSalva={(testo, metriTotali) => {
                const customWorkouts = FINPStorage.getCustomWorkouts();
                const newWorkout = {
                  id: Date.now().toString(),
                  data: formattaData(oggi),
                  testo,
                  creatoIl: new Date().toISOString(),
                  atletaId: atletaSel?.id ?? null,
                  metriTotali
                };
                const updated = [newWorkout, ...customWorkouts];
                FINPStorage.saveCustomWorkouts(updated);
                setModalEsercizioOpen(false);
                setRevisioneStorage(v => v + 1);
              }}
              onAnnulla={() => setModalEsercizioOpen(false)}
            />
          </div>
        </div>
      )}

      {modalAtletiOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Rosa Atleti ({atleti.length})</h3>
              <button type="button" onClick={() => setModalAtletiOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {atleti.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <div>
                    <div className="font-bold text-sm text-on-surface">{a.cognome} {a.nome}</div>
                    <div className="text-xs text-on-surface-variant">Classe S{a.classeS ?? '?'}</div>
                  </div>
                  <span className="ds-chip-primary text-xs">S{a.classeS ?? '?'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalTempiOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Ultimi Tempi Registrati ({tempi.length})</h3>
              <button type="button" onClick={() => setModalTempiOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {tempi.slice(0, 10).map(t => {
                const atl = atleti.find(a => a.id === t.atletaId);
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant text-xs">
                    <div>
                      <div className="font-bold text-on-surface">{atl ? `${atl.cognome} ${atl.nome}` : 'Atleta'}</div>
                      <div className="text-on-surface-variant">{t.stile} · {t.distanzaMetri}m · {formattaData(t.data)}</div>
                    </div>
                    <div className="font-mono font-bold text-primary">{formattaTempo(t.centesimi)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalGareOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Gare in Programma ({gare.length})</h3>
              <button type="button" onClick={() => setModalGareOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {gare.map(g => (
                <div key={g.id} className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant space-y-1">
                  <div className="font-bold text-sm text-on-surface">{g.nome}</div>
                  <div className="text-xs text-on-surface-variant">Dal {g.dal} al {g.al} {g.prioritaria ? '⭐ (Prioritaria A-Race)' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
