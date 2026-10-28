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
  Timer,
  SlidersHorizontal,
  Gauge,
  Medal,
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

interface Props {
  onNavigateTab: (tab: TabKey) => void;
}

const SquadraVuota: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="ds-card p-space-lg sm:p-space-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-primary-sm">
          <Waves size={28} className="text-primary-fixed" />
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

export const OggiScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { stagione, atleti } = useApp();

  if (!stagione || atleti.length === 0) {
    return <SquadraVuota />;
  }

  return <OggiContent onNavigateTab={onNavigateTab} />;
};

const OggiContent: React.FC<Props> = ({ onNavigateTab }) => {
  const {
    stagione,
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
    <div className="relative flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Desktop 2-Column Layout (lg: 1024px+) vs Mobile 1-Column */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 overflow-hidden">

        {/* LEFT COLUMN (Flexible, scrollable on desktop) */}
        <div className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-1">
          {/* Intestazione giornata */}
          <section className="relative shrink-0 overflow-hidden rounded-2xl bg-surface-container-low p-3 sm:px-4 sm:py-3 border border-outline-variant/60">
            <div className="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-secondary-fixed opacity-30 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="ds-label text-primary flex items-center gap-1.5 truncate">
                  <Waves size={13} className="shrink-0" />
                  <span className="truncate">
                    {dowNome} · {formattaData(oggi)}
                  </span>
                </span>
                <h1 className="text-base xs:text-lg sm:text-headline-lg text-on-surface tracking-tight leading-tight mt-0.5 truncate font-bold">
                  <Marquee text={microCorrente ? `${TIPO_MICROCICLO_LABEL[microCorrente.tipo]} · ${microCorrente.volumeTargetMetri.toLocaleString()} m` : 'Imposta Stagione'} />
                </h1>
              </div>

              <div className="shrink-0">
                {chiusuraOggi ? (
                  <span className="ds-chip-coral !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case shadow-sm">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span className="truncate">Chiusura · {chiusuraOggi.motivo}</span>
                  </span>
                ) : garaOggi ? (
                  <span className="ds-chip bg-tertiary-container text-on-tertiary !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case shadow-sm">
                    <Zap size={13} className="shrink-0" />
                    <span className="truncate">Gara · {garaOggi.nome}</span>
                  </span>
                ) : isGiornoAllenamento ? (
                  <span className="ds-chip bg-primary text-on-primary !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case shadow-primary-sm">
                    <Sparkles size={13} className="text-primary-fixed shrink-0" />
                    <span>In Vasca</span>
                  </span>
                ) : (
                  <span className="ds-chip-neutral !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case">
                    <Coffee size={13} className="shrink-0" />
                    <span>Recupero</span>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Azioni rapide bordo vasca */}
          <section aria-label="Azioni Rapide Bordo Vasca" className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('cronometro')}
              className="ds-card p-2 sm:p-3 bg-gradient-to-br from-[#071A3D] to-[#0A2A66] text-white flex flex-col justify-between gap-1 text-left hover:brightness-110 transition shadow-card group"
            >
              <div className="flex items-center justify-between">
                <Timer size={20} className="text-secondary" />
                <ArrowUpRight size={14} className="text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <div>
                <div className="font-headline font-bold text-xs sm:text-sm">Cronometro</div>
                <div className="text-[10px] text-white/70">Multi-corsia</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('regia')}
              className="ds-card p-2 sm:p-3 bg-gradient-to-br from-[#0A2A66] to-[#1457E0] text-white flex flex-col justify-between gap-1 text-left hover:brightness-110 transition shadow-card group"
            >
              <div className="flex items-center justify-between">
                <SlidersHorizontal size={20} className="text-secondary" />
                <ArrowUpRight size={14} className="text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <div>
                <div className="font-headline font-bold text-xs sm:text-sm">Regia</div>
                <div className="text-[10px] text-white/70">Pianificatore</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('fonti')}
              className="ds-card p-2 sm:p-3 bg-gradient-to-br from-[#1457E0] to-[#1E6BFF] text-white flex flex-col justify-between gap-1 text-left hover:brightness-110 transition shadow-card group"
            >
              <div className="flex items-center justify-between">
                <Medal size={20} className="text-secondary" />
                <ArrowUpRight size={14} className="text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <div>
                <div className="font-headline font-bold text-xs sm:text-sm">Classifiche</div>
                <div className="text-[10px] text-white/70">Record & WPS</div>
              </div>
            </button>
          </section>

          {/* Statistiche (visibili qui su mobile, duplicate o spostate a destra su desktop) */}
          <section className="lg:hidden shrink-0 grid grid-cols-4 gap-1.5">
            <div className="ds-stat !p-2">
              <div className="flex items-center justify-between">
                <span className="ds-label text-[10px]">Atleti</span>
                <Users size={14} className="text-primary shrink-0" />
              </div>
              <div className="text-base font-bold tabular-nums text-primary">{atleti.length}</div>
            </div>
            <div className="ds-stat !p-2">
              <div className="flex items-center justify-between">
                <span className="ds-label text-[10px]">Sedute</span>
                <Calendar size={14} className="text-secondary shrink-0" />
              </div>
              <div className="text-base font-bold tabular-nums text-secondary">{giorniAllenamento.length}</div>
            </div>
            <div className="ds-stat !p-2">
              <div className="flex items-center justify-between">
                <span className="ds-label text-[10px]">Tempi</span>
                <Timer size={14} className="text-tertiary shrink-0" />
              </div>
              <div className="text-base font-bold tabular-nums text-tertiary">{tempi.length}</div>
            </div>
            <div className="ds-stat !p-2">
              <div className="flex items-center justify-between">
                <span className="ds-label text-[10px]">Gare</span>
                <Trophy size={14} className="text-primary shrink-0" />
              </div>
              <div className="text-base font-bold tabular-nums text-primary">{gare.length}</div>
            </div>
          </section>

          {/* COMPACT WORKOUT CARD (Nessuna scheda o Scheda del giorno) */}
          {visualizzaSeduta && !schedaOggi && (
            <div className="shrink-0 ds-card p-2.5 sm:p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardList size={16} className="text-primary shrink-0" />
                  <span className="font-headline font-bold text-xs text-on-surface truncate">Nessuna scheda per oggi</span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium hidden xs:inline">Scrivi, genera o usa proposta</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onNavigateTab('dati')}
                  className="ds-btn-primary !min-h-[38px] !px-2 !py-1 text-xs justify-center"
                >
                  <ClipboardList size={14} />
                  <span className="text-[11px] truncate">Scrivi a mano</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalIAOpen(true)}
                  className="ds-btn-secondary !min-h-[38px] !px-2 !py-1 text-xs justify-center"
                >
                  <Bot size={14} />
                  <span className="text-[11px] truncate">Genera con IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostraProposta(true)}
                  className="ds-btn-secondary !min-h-[38px] !px-2 !py-1 text-xs justify-center"
                >
                  <Sparkles size={14} />
                  <span className="text-[11px] truncate">Proposta</span>
                </button>
              </div>
            </div>
          )}

          {visualizzaSeduta && schedaOggi && (
            <div className={`print-area flex flex-col gap-2 ${maxiDeck ? 'bg-inverse-surface text-inverse-on-surface p-4 rounded-xl' : ''}`}>
              <div className="no-print ds-card p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <select
                    value={atletaSelId ?? ''}
                    onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full min-h-[40px] bg-surface-container-lowest border border-outline-variant rounded-xl px-2 font-headline font-bold text-xs text-on-surface focus:border-primary"
                  >
                    <option value="">Squadra ({volumeSquadra}m)</option>
                    {atleti.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.cognome} {a.nome} (S{a.classeS ?? '?'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setModalParametriOpen(true)}
                    className="ds-btn-ghost !min-h-[38px] !px-2 text-xs"
                    title="Vasca e durata"
                  >
                    <SlidersHorizontal size={15} />
                    <span className="hidden sm:inline">Vasca/Tempo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalIAOpen(true)}
                    className="ds-btn-ghost !min-h-[38px] !px-2 text-xs"
                    title="Genera con IA"
                  >
                    <Bot size={15} />
                    <span className="hidden sm:inline">IA</span>
                  </button>

                  {!isAndroidApp && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="ds-btn-ghost !min-h-[38px] !px-2 text-xs"
                      title="Stampa"
                    >
                      <Printer size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ds-btn-primary !min-h-[38px] !px-3 text-xs"
                    title="Copia WhatsApp"
                  >
                    {copiato ? <Check size={15} /> : <Copy size={15} />}
                    <span className="hidden sm:inline">{copiato ? 'Copiato!' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>

              {/* Tratti della scheda */}
              <div className="ds-card p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    <Marquee text={schedaOggi.titolo} />
                  </h3>
                  <span className="text-xs font-bold font-headline text-primary bg-surface-container px-2.5 py-0.5 rounded-full">
                    {schedaOggi.volumeTotaleMetri} m
                  </span>
                </div>

                <div className="space-y-1.5">
                  {schedaOggi.tratti.map((t, idx) => {
                    const aperto = trattiAperti.has(idx);
                    return (
                      <div key={idx} className="rounded-xl border border-outline-variant/70 bg-surface-container-low overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleTratto(idx)}
                          className="w-full flex items-center gap-2 p-2.5 text-left font-headline text-xs font-bold"
                        >
                          <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{t.sezione}</span>
                          <BadgeCodice codice={t.codice} />
                          <span className="ml-auto text-primary tabular-nums shrink-0">{t.metri} m</span>
                          {aperto ? <ChevronRight size={16} className="rotate-90 text-on-surface-variant" /> : <ChevronRight size={16} className="text-on-surface-variant" />}
                        </button>

                        {(aperto || isDesktop) && (
                          <div className="px-3 pb-3 pt-1 border-t border-outline-variant/50 text-xs space-y-1">
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

        {/* RIGHT COLUMN (Desktop Sidebar ~360px) */}
        <div className="hidden lg:flex flex-col gap-3 min-h-0 overflow-y-auto pl-1">
          {/* Statistiche 2x2 Grid */}
          <div className="ds-card p-3 space-y-2">
            <h3 className="font-headline font-bold text-xs text-primary uppercase tracking-wider">Panoramica Squadra</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-primary tabular-nums">{atleti.length}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold">Atleti</div>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-secondary tabular-nums">{giorniAllenamento.length}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold">Sedute/Sett</div>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-tertiary tabular-nums">{tempi.length}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold">Tempi</div>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-xl text-center">
                <div className="text-lg font-bold font-headline text-primary tabular-nums">{gare.length}</div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold">Gare</div>
              </div>
            </div>
          </div>

          {/* Prossima Gara */}
          {prossimaGara && (
            <div className="ds-card p-3 bg-gradient-to-r from-surface-container-low to-surface-container border border-outline-variant flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-tertiary text-white flex items-center justify-center shrink-0 shadow-orange-glow">
                  <Trophy size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-tertiary tracking-wider font-headline">Prossima Gara</div>
                  <div className="font-headline font-bold text-xs text-on-surface truncate"><Marquee text={prossimaGara.nome} /></div>
                  <div className="text-[10px] text-on-surface-variant">{formattaData(prossimaGara.dal)}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-extrabold text-tertiary font-headline tabular-nums">{prossimaGara.diffDays}</span>
                <span className="text-[9px] block uppercase opacity-80">giorni</span>
              </div>
            </div>
          )}

          {/* Carico Settimana */}
          <div className="ds-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-headline">
              <span className="text-primary flex items-center gap-1.5"><Activity size={14} /> Carico Settimana</span>
              <span className="text-on-surface-variant tabular-nums">{metriCompletatiSettimana} / {volumeSettimanaAtleta} m</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-container h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((metriCompletatiSettimana / Math.max(1, volumeSettimanaAtleta)) * 100))}%` }}
              />
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
                        className="w-full p-2 flex items-center justify-between gap-2 text-left font-bold"
                      >
                        <span className="truncate">{att.athleteName} <span className="opacity-75 font-normal">({att.notes.length} avvisi)</span></span>
                        <ChevronRight size={14} className={`shrink-0 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                      </button>
                      {isExp && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-current/20 space-y-1 text-[11px] opacity-95">
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
                <span className="flex items-center gap-1.5"><Timer size={14} /> Ultimi Tempi</span>
              </div>
              <div className="space-y-1">
                {ultimiTempi.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/50">
                    <span className="font-bold text-on-surface truncate">{t.atletaNome}</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-primary tabular-nums shrink-0">
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
    </div>
  );
};
