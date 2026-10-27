import React, { useState, useMemo } from 'react';
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
  isBefore,
  parseData,
  toDateObj
} from '../domain/dateUtils';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { IndicatoreCodici } from './IndicatoreCodici';
import { BadgeCodice } from './BadgeCodice';
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
  Trophy,
  Activity,
  Bot,
  MoreHorizontal,
  X
} from 'lucide-react';
import { formattaTempo } from '../domain/tempoUtils';
import { TabKey } from './Navbar';
import { Marquee } from './Marquee';
import { calcolaVolumeSessione, ripartisciSettimana, SedutaSettimana } from '../domain/volumePrescritto';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { ParametriSedutaModal } from './ParametriSedutaModal';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { VolumeIndividuale } from '../domain/volumeIndividuale';

interface Props {
  onNavigateTab: (tab: TabKey) => void;
}

export const OggiScreen: React.FC<Props> = ({ onNavigateTab }) => {
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

  if (!stagione || atleti.length === 0) {
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
  }

  const oggi = todayISO();
  const dow = getDayOfWeek(oggi);
  const dowNome = DAY_OF_WEEK_FULL_NAMES[dow];

  // Selected athlete for tailored workout (null = whole squad)
  const [atletaSelId, setAtletaSelId] = useState<number | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [maxiDeck, setMaxiDeck] = useState(false);
  const [mostraSedutaStraordinaria, setMostraSedutaStraordinaria] = useState(false);
  const [modalParametriOpen, setModalParametriOpen] = useState(false);
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [mostraProposta, setMostraProposta] = useState(false);
  /** Incrementa quando una scheda viene salvata: forza il ricalcolo da storage. */
  const [revisioneStorage, setRevisioneStorage] = useState(0);
  /** Tratti aperti nella scheda: chiusi = riga compatta, aperti = dettaglio completo. */
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

  // Scheduled training days
  const giorniAllenamento = impostazioni.giorni ?? parametriEffettivi.giorniAllenamento;
  const isGiornoAllenamento = giorniAllenamento.includes(dow) && !chiusuraOggi;

  // Parametri operativi della seduta (vasca/durata)
  const parametriSeduta = useMemo(
    () => risolviParametriSeduta(oggi, impostazioni, stagione),
    [oggi, impostazioni, stagione]
  );

  const settimanaISO = useMemo(() => seduteSettimana(oggi, giorniAllenamento), [oggi, giorniAllenamento]);
  const settimanaSedute: SedutaSettimana[] = useMemo(
    () => settimanaISO.map((d) => ({ data: d, parametri: risolviParametriSeduta(d, impostazioni, stagione) })),
    [settimanaISO, impostazioni, stagione]
  );

  // Selected athlete
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

  // Calculate volume target
  const volumeSquadra = useMemo(() => {
    if (!microCorrente) return 2000;
    const sedute = (microCorrente.sedutePreviste && microCorrente.sedutePreviste > 0) ? microCorrente.sedutePreviste : giorniAllenamento.length;
    return Math.round((microCorrente.volumeTargetMetri || 2000) / (sedute > 0 ? sedute : 3));
  }, [microCorrente, giorniAllenamento]);

  // Scheda inserita a mano dal coach (salvata): ha sempre la precedenza
  const schedaManuale = useMemo(() => {
    const dataOggiFormatted = formattaData(oggi);
    const customList = FINPStorage.getCustomWorkouts();
    return customList.find(w => {
      const matchData = w.data === dataOggiFormatted || w.data === oggi;
      const matchDest = atletaSel ? w.atletaId === atletaSel.id : w.atletaId === null;
      return matchData && matchDest;
    }) ?? null;
  }, [oggi, atletaSel, revisioneStorage]);

  // Proposta del sistema: NON viene mai salvata automaticamente, serve un'azione esplicita
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

  // Scheda mostrata: manuale se esiste, altrimenti la proposta solo se richiesta esplicitamente
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
        noteCalibrazione: [`Scheda inserita manualmente dall'allenatore (sostituisce quella smart). Attrezzi: ${analisi.attrezzi.join(', ') || 'Nessuno'}`],
        tipoSeduta: 'Allenamento Manuale',
        vascaMetri: parametriSeduta.vascaMetri,
        durataMin: parametriSeduta.durataMin
      };
    }

    return mostraProposta ? propostaSistema : null;
  }, [schedaManuale, mostraProposta, propostaSistema, atletaSel, parametriSeduta]);

  /** Salva la proposta del sistema come scheda manuale (azione esplicita del coach). */
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

  // Copy handler
  const formatWorkoutText = () => {
    if (!schedaOggi) return '';
    const lines: string[] = [];
    lines.push(`🏊 FINPcoach - ${schedaOggi.titolo}`);
    lines.push(`📅 Data: ${formattaData(oggi)} (${dowNome})`);
    lines.push(`📊 Volume: ${schedaOggi.volumeTotaleMetri} m · Vasca: ${schedaOggi.vascaMetri ?? parametriSeduta.vascaMetri}m · Durata: ${schedaOggi.durataMin ?? parametriSeduta.durataMin}'`);
    lines.push(`📊 Fase: ${FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]}`);
    if (atletaSel) lines.push(`👤 Atleta: ${atletaSel.cognome} ${atletaSel.nome} (Classe S${atletaSel.classeS})`);
    lines.push('');

    if (schedaOggi.avvertenzeMediche.length > 0) {
      lines.push('⚠️ ADATTAMENTI MEDICI:');
      schedaOggi.avvertenzeMediche.forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }

    lines.push('📋 SERIE BORDO VASCA:');
    schedaOggi.tratti.forEach((t, i) => {
      lines.push(`${i + 1}. [${t.codice}] ${t.sezione}: ${t.ripetizioni} (${t.metri}m)`);
      lines.push(`   ${t.descrizione}`);
      if (t.ripartenza) lines.push(`   ⏱️ Ripartenza: ${t.ripartenza}`);
      if (t.notaSpecifica) lines.push(`   • Focus: ${t.notaSpecifica}`);
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatWorkoutText()).then(() => {
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    });
  };

  // Find next scheduled training day if today is off
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

  // Medical alerts for squad members
  const avvertenzeSquadra = useMemo(() => {
    const activeAlerts: { atleta: string; condizione: string; limitazione: string }[] = [];
    atleti.forEach(a => {
      const conds = condizioni.filter(c => c.atletaId === a.id && c.attiva);
      conds.forEach(c => {
        if (c.limitazioni) {
          activeAlerts.push({
            atleta: `${a.cognome} ${a.nome}`,
            condizione: c.descrizione,
            limitazione: c.limitazioni
          });
        }
      });
    });
    return activeAlerts;
  }, [atleti, condizioni]);

  // Prossima Gara
  const prossimaGara = useMemo(() => {
    const futureGare = (gare || []).filter(g => !isBefore(g.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal));
    if (futureGare.length === 0) return null;
    const g = futureGare[0];
    const diffDays = Math.ceil((toDateObj(g.dal).getTime() - toDateObj(oggi).getTime()) / (1000 * 60 * 60 * 24));
    return { ...g, diffDays: Math.max(0, diffDays) };
  }, [gare, oggi]);

  // Metri completati nella settimana
  const metriCompletatiSettimana = useMemo(() => {
    return (log || [])
      .filter(l => isInRange(l.data, settimanaISO[0], settimanaISO[settimanaISO.length - 1]))
      .reduce((sum, item) => sum + (item.metriEffettivi || 0), 0);
  }, [log, settimanaISO]);

  // Attenzioni Oggi
  const attenzioniOggi = useMemo(() => {
    const list: { athleteId: number; athleteName: string; type: 'medico' | 'warning'; text: string }[] = [];
    (atleti || []).forEach(a => {
      const conds = (condizioni || []).filter(c => c.atletaId === a.id && c.attiva);
      conds.forEach(c => {
        list.push({
          athleteId: a.id,
          athleteName: `${a.cognome} ${a.nome?.[0]}.`,
          type: 'medico',
          text: c.descrizione || c.limitazioni
        });
      });
      const aTempi = (tempi || []).filter(t => t.atletaId === a.id);
      const fc = CalcoloRitmiRipartenze.valutaNecessitaFormCheck(a, aTempi, mesoCorrente);
      if (fc.necessario) {
        list.push({
          athleteId: a.id,
          athleteName: `${a.cognome} ${a.nome?.[0]}.`,
          type: 'warning',
          text: 'Form Check necessario'
        });
      }
    });
    return list;
  }, [atleti, condizioni, tempi, mesoCorrente]);

  // Ultimi Tempi Registrati
  const ultimiTempi = useMemo(() => {
    return [...(tempi || [])].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3).map(t => {
      const a = (atleti || []).find(atl => atl.id === t.atletaId);
      return {
        ...t,
        atletaNome: a ? `${a.cognome} ${a.nome?.[0]}.` : 'Atleta'
      };
    });
  }, [tempi, atleti]);

  // Should we show the workout?
  const visualizzaSeduta = isGiornoAllenamento || mostraSedutaStraordinaria;

  return (
    <div className="relative flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Intestazione giornata - allineata al design system */}
      <section className="relative shrink-0 overflow-hidden rounded-2xl bg-surface-container-low p-3 sm:px-4 sm:py-3 border border-slate-200/60">
        <div className="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-secondary-fixed opacity-30 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="ds-label text-primary flex items-center gap-1.5 truncate">
              <Waves size={13} className="shrink-0" />
              <span className="truncate">
                {dowNome} · {formattaData(oggi)}
              </span>
            </span>
            <h1 className="text-base xs:text-lg sm:text-headline-lg text-on-surface tracking-tight leading-tight mt-0.5 truncate font-bold">
              {microCorrente
                ? `${TIPO_MICROCICLO_LABEL[microCorrente.tipo]} · ${microCorrente.volumeTargetMetri.toLocaleString()} m`
                : 'Imposta Stagione'}
            </h1>
          </div>

          <div className="shrink-0">
            {chiusuraOggi ? (
              <span className="ds-chip-coral !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case max-w-[48vw] sm:max-w-none shadow-sm">
                <AlertTriangle size={13} className="shrink-0" />
                <span className="truncate">Chiusura · {chiusuraOggi.motivo}</span>
              </span>
            ) : garaOggi ? (
              <span className="ds-chip bg-tertiary-container text-on-tertiary !px-2.5 !py-1 !min-h-[36px] !text-[10px] sm:!text-xs !normal-case max-w-[48vw] sm:max-w-none shadow-sm">
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

      {/* Azioni rapide bordo vasca: 3 tessere compatte, niente scorrimento */}
      <section aria-label="Azioni Rapide Bordo Vasca" className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onNavigateTab('cronometro')}
          className="group relative flex flex-col items-start justify-between gap-1 rounded-xl sm:rounded-2xl bg-primary px-2.5 py-2 sm:px-4 sm:py-3 min-h-[64px] sm:min-h-[76px] text-left text-on-primary shadow-primary-sm active:scale-[0.98] transition"
        >
          <Gauge size={18} className="text-primary-fixed shrink-0" />
          <span className="text-[11px] sm:text-sm font-bold leading-tight">Cronometro</span>
          <span className="hidden sm:block text-[10px] opacity-90 leading-none">Live deck bordo vasca</span>
          <ArrowUpRight
            size={14}
            className="absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('regia')}
          className="group relative flex flex-col items-start justify-between gap-1 rounded-xl sm:rounded-2xl bg-primary-container px-2.5 py-2 sm:px-4 sm:py-3 min-h-[64px] sm:min-h-[76px] text-left text-on-primary shadow-primary-sm active:scale-[0.98] transition"
        >
          <SlidersHorizontal size={18} className="text-primary-fixed shrink-0" />
          <span className="text-[11px] sm:text-sm font-bold leading-tight">Regia</span>
          <span className="hidden sm:block text-[10px] opacity-90 leading-none">Corsie &amp; pianificazione</span>
          <ArrowUpRight
            size={14}
            className="absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('atleti')}
          className="group relative flex flex-col items-start justify-between gap-1 rounded-xl sm:rounded-2xl bg-primary-container px-2.5 py-2 sm:px-4 sm:py-3 min-h-[64px] sm:min-h-[76px] text-left text-on-primary shadow-primary-sm active:scale-[0.98] transition"
        >
          <Medal size={18} className="text-primary-fixed shrink-0" />
          <span className="text-[11px] sm:text-sm font-bold leading-tight">Classifiche</span>
          <span className="hidden sm:block text-[10px] opacity-90 leading-none">Punteggi WPS</span>
          <ArrowUpRight
            size={14}
            className="absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition"
            aria-hidden="true"
          />
        </button>
      </section>

      {/* Key Stats Bento Grid - Stitch Design System */}
        <section aria-label="Statistiche Allenatore" className="grid shrink-0 grid-cols-4 gap-1.5 sm:gap-2 [@media(max-height:620px)]:hidden">
        <div className="ds-stat !p-2 sm:!p-3">
          <div className="flex items-center justify-between">
            <span className="ds-label text-[10px] sm:text-label-caps">Atleti</span>
            <Users size={16} className="text-primary hidden xs:block" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-headline-md font-headline-md tracking-tight tabular-nums text-primary">{atleti.length}</span>
          </div>
        </div>

        <div className="ds-stat !p-2 sm:!p-3">
          <div className="flex items-center justify-between">
            <span className="ds-label text-[10px] sm:text-label-caps">Sedute</span>
            <Calendar size={16} className="text-secondary hidden xs:block" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-headline-md font-headline-md tracking-tight tabular-nums text-secondary">
              {microCorrente?.sedutePreviste || giorniAllenamento.length || 4}
            </span>
          </div>
        </div>

        <div className="ds-stat !p-2 sm:!p-3">
          <div className="flex items-center justify-between">
            <span className="ds-label text-[10px] sm:text-label-caps">Tempi</span>
            <Timer size={16} className="text-tertiary hidden xs:block" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-headline-md font-headline-md tracking-tight tabular-nums text-tertiary">{tempi.length}</span>
          </div>
        </div>

        <div className="ds-stat !p-2 sm:!p-3">
          <div className="flex items-center justify-between">
            <span className="ds-label text-[10px] sm:text-label-caps">Gare</span>
            <Zap size={16} className="text-primary-container hidden xs:block" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-headline-md font-headline-md tracking-tight tabular-nums text-primary-container">{gare.length}</span>
          </div>
        </div>
      </section>

      {/* NOT A SCHEDULED TRAINING DAY CARD */}
      {!isGiornoAllenamento && !mostraSedutaStraordinaria && (
        <div className="ds-card p-space-md sm:p-space-lg text-center space-y-3 flex-1 min-h-0 overflow-y-auto">
          <div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center">
            <Coffee size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="ds-subtitle">
              Giorno di recupero
            </h3>
            <p className="ds-body">
              Vasca: {giorniAllenamento.map(d => DAY_OF_WEEK_FULL_NAMES[d]).join(', ')}
            </p>
          </div>

          {prossimoAllenamento && (
            <div className="ds-alert bg-surface-container border-l-primary border border-slate-200/60 max-w-md mx-auto text-left flex items-start gap-3">
              <Calendar size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-body-bold text-body-bold text-on-surface block">
                  {prossimoAllenamento.dowNome} {formattaData(prossimoAllenamento.data)}
                </span>
                <span className="ds-label !normal-case block mt-0.5">
                  Volume: ~{volumeSquadra} m
                </span>
              </div>
            </div>
          )}

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => setMostraSedutaStraordinaria(true)}
              className="ds-btn-primary w-full sm:w-auto"
            >
              <Zap size={18} />
              <span>Seduta Straordinaria</span>
            </button>

            <button
              onClick={() => onNavigateTab('piano')}
              className="ds-btn-ghost w-full sm:w-auto"
            >
              <Calendar size={18} />
              <span>Modifica Piano</span>
            </button>
          </div>
        </div>
      )}



      {/* TODAY'S WORKOUT CARD (COMPACT SINGLE ROW) */}
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

      {/* PROSSIMA GARA (from real data) */}
      {prossimaGara && (
        <section className="shrink-0 ds-card p-3 bg-gradient-to-r from-surface-container-low to-surface-container border border-outline-variant flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container text-white flex items-center justify-center shrink-0 shadow-orange-glow">
              <Trophy size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-tertiary tracking-wider font-headline">Prossima Gara</div>
              <div className="font-headline font-bold text-xs sm:text-sm text-on-surface min-w-0">
                <Marquee text={prossimaGara.nome} />
              </div>
              <div className="text-[11px] text-on-surface-variant truncate">{formattaData(prossimaGara.dal)} {prossimaGara.luogo ? `· ${prossimaGara.luogo}` : ''}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl sm:text-3xl font-extrabold text-tertiary font-headline tabular-nums">{prossimaGara.diffDays}</span>
            <span className="text-[10px] font-bold text-on-surface-variant block uppercase">giorni</span>
          </div>
        </section>
      )}

      {/* CARICO SETTIMANA (from real data) */}
      <section className="shrink-0 ds-card p-3 space-y-2">
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
      </section>

      {/* ATTENZIONI DI OGGI (from real medical/form-check data) */}
      {attenzioniOggi.length > 0 && (
        <section className="shrink-0 ds-card p-3 space-y-2 border-l-4 border-l-error">
          <div className="flex items-center gap-1.5 text-xs font-bold font-headline text-error">
            <HeartPulse size={15} />
            <span>Attenzioni di Oggi ({attenzioniOggi.length})</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {attenzioniOggi.map((att, i) => (
              <div
                key={i}
                onClick={() => onNavigateTab('atleti')}
                className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                  att.type === 'medico' ? 'bg-error-container/60 text-on-error-container border border-error/30' : 'bg-warning-container/60 text-on-warning-container border border-warning/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-bold shrink-0">{att.athleteName}:</span>
                  <div className="min-w-0 flex-1">
                    <Marquee text={att.text} />
                  </div>
                </div>
                <ChevronRight size={14} className="shrink-0 opacity-70" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ULTIMI TEMPI REGISTRATI (from real data) */}
      {ultimiTempi.length > 0 && (
        <section className="shrink-0 ds-card p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold font-headline">
            <span className="text-primary flex items-center gap-1.5"><Timer size={14} /> Ultimi Tempi Registrati</span>
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
        </section>
      )}

      {visualizzaSeduta && schedaOggi && (
        <div className={`print-area flex min-h-0 flex-1 flex-col gap-2 sm:gap-3 ${maxiDeck ? 'bg-inverse-surface text-inverse-on-surface p-4 rounded-xl' : ''}`}>
          {/* Controls Bar */}
          <div className="no-print ds-card p-1.5 sm:p-2.5 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shrink-0">
            {/* Athlete selector */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <select
                value={atletaSelId ?? ''}
                onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
                className="w-full min-h-[44px] sm:min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 font-body-bold text-body-bold text-on-surface text-xs sm:text-sm focus:border-primary"
              >
                <option value="">Squadra ({volumeSquadra}m)</option>
                {atleti.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.cognome} {a.nome} (S{a.classeS ?? '?'}) · {Math.round(a.fattoreVolume * 100)}%
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setModalParametriOpen(true)}
                className="ds-btn-icon !w-auto !px-2 sm:!px-3 gap-1.5 bg-surface-container-high text-on-surface !min-h-[44px]"
                title="Vasca e durata"
                aria-label="Modifica vasca e durata"
              >
                <SlidersHorizontal size={18} />
                <span className="hidden sm:inline text-label-md font-label-md">Vasca/Tempo</span>
              </button>

              <button
                type="button"
                onClick={() => setModalIAOpen(true)}
                className="ds-btn-icon !w-auto !px-2 sm:!px-3 gap-1.5 bg-primary-container text-on-primary shadow-primary-sm !min-h-[44px]"
                title="Genera con IA esterna"
                aria-label="Genera scheda con IA esterna"
              >
                <Bot size={18} />
                <span className="hidden sm:inline text-label-md font-label-md">Genera con IA</span>
              </button>

              <button
                type="button"
                onClick={() => setMaxiDeck(!maxiDeck)}
                className={`ds-btn-icon !w-auto !px-3 gap-1.5 ${
                  maxiDeck
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary'
                    : 'bg-surface-container-high text-on-surface'
                }`}
                title="Vista Maxi-Deck"
                aria-label={maxiDeck ? 'Disattiva vista Maxi-Deck' : 'Attiva vista Maxi-Deck'}
              >
                {maxiDeck ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span className="hidden sm:inline text-label-md font-label-md">{maxiDeck ? 'Normale' : 'Maxi-Deck'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-primary text-on-primary shadow-primary-sm"
                title="Copia WhatsApp"
                aria-label="Copia negli appunti"
              >
                {copiato ? <Check size={18} className="text-primary-fixed" /> : <Copy size={18} />}
                <span className="hidden sm:inline text-label-md font-label-md">{copiato ? 'Copiato!' : 'WhatsApp'}</span>
              </button>

              {!schedaManuale && (
                <button
                  type="button"
                  onClick={salvaProposta}
                  className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-secondary-container text-on-secondary-container"
                  title="Salva la proposta come scheda"
                  aria-label="Salva la proposta come scheda"
                >
                  <Save size={18} />
                  <span className="hidden sm:inline text-label-md font-label-md">Salva</span>
                </button>
              )}

              {schedaManuale && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('dati')}
                  className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-surface-container-high text-on-surface"
                  title="Modifica scheda in Dati"
                  aria-label="Modifica scheda in Dati"
                >
                  <Edit2 size={18} />
                  <span className="hidden sm:inline text-label-md font-label-md">Modifica</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-surface-container-high text-on-surface"
                title="Stampa"
                aria-label="Stampa scheda"
              >
                <Printer size={18} className="text-primary" />
                <span className="hidden sm:inline text-label-md font-label-md">Stampa</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('dati')}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-primary-container text-on-primary shadow-primary-sm"
                title="Presenze"
                aria-label="Segna presenze"
              >
                <CheckCircle2 size={18} />
                <span className="hidden sm:inline text-label-md font-label-md">Presenze</span>
              </button>
            </div>
          </div>

          {/* Main Poolside Workout Card */}
          <div className={`rounded-xl border transition overflow-hidden flex min-h-0 flex-1 flex-col ${
            maxiDeck ? 'bg-inverse-surface border-outline-variant text-inverse-on-surface' : 'ds-card'
          }`}>
            {/* Unico contenitore scrollabile della card: qualunque sia il numero
                di blocchi o l'altezza dell'intestazione, nulla resta inaccessibile
                e la card non sfonda mai lo spazio disponibile. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Header Metrics */}
            <div className={`p-space-md border-b ${
              maxiDeck ? 'bg-inverse-surface border-outline-variant' : 'bg-surface-container-low border-slate-200/70'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ds-chip-primary">
                      Bordo Vasca
                    </span>
                    {atletaSel && (
                      <span className="ds-chip-outline !normal-case [white-space:normal]">
                        <User size={13} />
                        {atletaSel.cognome} {atletaSel.nome} (S{atletaSel.classeS})
                      </span>
                    )}
                  </div>
                  <h3 className={`ds-subtitle mt-1.5 ${maxiDeck ? 'text-tertiary-fixed' : ''}`}>
                    {schedaOggi.titolo}
                  </h3>
                  <p className={`ds-label !normal-case mt-0.5 ${maxiDeck ? '!text-inverse-on-surface/80' : ''}`}>
                    {FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]} · {TIPO_MICROCICLO_LABEL[schedaOggi.tipoMicrociclo]}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="ds-label block">Volume</span>
                    <span className={`ds-metric-sm ${maxiDeck ? 'text-primary-fixed' : 'text-primary'}`}>
                      {schedaOggi.volumeTotaleMetri}m
                    </span>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-200/60">
                    <span className="ds-label block">Vasca / Durata</span>
                    <span className={`ds-metric-sm flex items-center gap-1 ${maxiDeck ? 'text-secondary-fixed' : 'text-on-surface'}`}>
                      <Waves size={16} />
                      {schedaOggi.vascaMetri ?? parametriSeduta.vascaMetri}m · {schedaOggi.durataMin ?? parametriSeduta.durataMin}'
                    </span>
                  </div>
                </div>
              </div>

              {/* Energy Codes Distribution Bar */}
              <div className="mt-2 pt-2 border-t border-slate-200/60">
                <IndicatoreCodici
                  ripartizione={schedaOggi.ripartizioneCodici}
                  volumeTotale={schedaOggi.volumeTotaleMetri}
                />
              </div>
            </div>

            {/* Workout Tratti: righe compatte, dettaglio su richiesta */}
            <div className={`p-space-md space-y-1.5 ${maxiDeck ? 'text-body-lg font-body-lg' : ''}`}>
              {schedaOggi.tratti.map((t, idx) => {
                let badgeColor = 'bg-surface-container text-on-surface border-slate-200/70';
                if (t.sezione.toLowerCase().includes('riscaldamento')) {
                  badgeColor = 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim';
                } else if (t.sezione.toLowerCase().includes('tecnica') || t.sezione.toLowerCase().includes('attivazione')) {
                  badgeColor = 'bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim';
                } else if (t.sezione.toLowerCase().includes('principale') || t.sezione.toLowerCase().includes('centrale')) {
                  badgeColor = 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim';
                } else if (t.sezione.toLowerCase().includes('defaticamento')) {
                  badgeColor = 'bg-surface-container-highest text-on-surface border-outline-variant';
                }

                const aperto = maxiDeck || trattiAperti.has(idx);

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border transition ${
                      maxiDeck
                        ? 'bg-inverse-surface border-outline-variant'
                        : t.sezione.toLowerCase().includes('principale')
                          ? 'bg-tertiary-fixed/25 border-tertiary-fixed-dim'
                          : 'bg-surface-container-low border-slate-200/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTratto(idx)}
                      aria-expanded={aperto}
                      aria-controls={`tratto-${idx}`}
                      className="w-full flex items-center gap-1.5 p-2 text-left"
                    >
                      <span className="w-5 h-5 rounded bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-label-caps uppercase tracking-wide border truncate max-w-[38%] ${badgeColor}`}>
                        {t.sezione}
                      </span>
                      <BadgeCodice codice={t.codice} />
                      <span className={`ml-auto ds-metric-sm shrink-0 ${maxiDeck ? 'text-tertiary-fixed' : 'text-on-surface'}`}>
                        {t.metri} m
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-on-surface-variant transition-transform ${aperto ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {!aperto ? (
                      <p className="px-2 pb-2 -mt-0.5 text-[11px] sm:text-xs leading-snug text-on-surface-variant truncate">
                        {t.ripetizioni} × {t.descrizione}
                      </p>
                    ) : (
                      <div id={`tratto-${idx}`} className="px-2 pb-2.5">
                        <div className={`pt-2 border-t border-slate-200/60 flex items-start justify-between gap-3`}>
                          <div className="min-w-0">
                            <div className={`font-body-bold text-body-bold ${maxiDeck ? 'text-2xl text-inverse-on-surface' : 'text-on-surface'}`}>
                              {t.ripetizioni}
                            </div>
                            <p className={`mt-1 leading-relaxed ${maxiDeck ? 'text-body-lg font-body-lg text-inverse-on-surface/90' : 'ds-body'}`}>
                              {t.descrizione}
                            </p>
                            {t.notaSpecifica && (
                              <div className="text-xs font-body-bold text-primary mt-1.5 flex items-start gap-1">
                                <span className="shrink-0">Focus Tecnico:</span>
                                <span>{t.notaSpecifica}</span>
                              </div>
                            )}
                          </div>

                          {t.ripartenza && (
                            <div className="shrink-0">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-md text-label-md">
                                {t.ripartenza}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Medical Precautions for Athletes */}
            {schedaOggi.avvertenzeMediche.length > 0 && (
              <div className="px-space-md pb-space-md bg-error-container border-t border-error/30">
                <div className="flex items-center gap-2 pt-2 text-xs font-bold text-on-error-container">
                  <HeartPulse size={15} className="text-error shrink-0" />
                  <span>Prescrizioni mediche FINP ({schedaOggi.avvertenzeMediche.length})</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-[11px] sm:text-xs leading-snug text-on-error-container">
                  {schedaOggi.avvertenzeMediche.map((avv, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span aria-hidden="true">•</span>
                      <span>{avv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </div>
          </div>

          {/* Squad Medical Attention Bar (if any) */}
          {avvertenzeSquadra.length > 0 && !atletaSel && (
            <div className="no-print ds-card overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setAvvisiAperti(v => !v)}
                aria-expanded={avvisiAperti}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <h4 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5 min-w-0">
                  <AlertTriangle size={15} className="text-tertiary shrink-0" />
                  <span className="truncate">Avvisi medici ({avvertenzeSquadra.length})</span>
                </h4>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-on-surface-variant transition-transform ${avvisiAperti ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {avvisiAperti && (
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[26vh] overflow-y-auto">
                  {avvertenzeSquadra.slice(0, 6).map((av, i) => (
                    <div key={i} className="px-2 py-1.5 bg-tertiary-fixed/30 rounded-lg border border-tertiary-fixed-dim">
                      <span className="font-body-bold text-xs text-on-surface block truncate">{av.atleta}</span>
                      <span className="text-[11px] leading-snug text-on-tertiary block">
                        {av.condizione}: {av.limitazione}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Atleti in evidenza con recenti progressi - Stitch Design System.
          Su schermi bassi la sezione si nasconde: la scheda del giorno è il
          contenuto primario e non deve mai collassare a zero altezza. */}
      <section className="space-y-2 pt-1 shrink-0 [@media(max-height:700px)]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-tertiary shrink-0" />
            <h3 className="ds-title truncate">Atleti in Evidenza</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="ds-btn-quiet !min-h-[40px] !px-2 text-primary shrink-0 text-xs"
          >
            Vedi tutti ({atleti.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2.5">
          {(atleti || []).slice(0, 3).map((a, i) => {
            const mieiTempi = (tempi || []).filter(t => t.atletaId === a.id);
            const best = mieiTempi.length > 0 ? [...mieiTempi].sort((x, y) => x.centesimi - y.centesimi)[0] : null;
            const nomeIniz = a.nome?.[0] || 'A';
            const cognIniz = a.cognome?.[0] || 'T';

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigateTab('atleti')}
                className="ds-card px-2.5 py-1.5 flex items-center justify-between gap-2 text-left hover:bg-surface-container-low transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md shrink-0">
                    {nomeIniz}{cognIniz}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-body-bold text-xs sm:text-body-bold text-on-surface truncate">
                      {a.cognome || ''} {a.nome?.[0] ? `${a.nome[0]}.` : (a.nome || '')}
                    </span>
                    <span className="ds-chip-class shrink-0">S{a.classeS ?? '9'}</span>
                    <span className="hidden xs:inline text-[11px] text-on-surface-variant truncate">
                      {best ? `${best.distanzaMetri}m ${formattaTempo(best.centesimi)}` : 'Passo gara'}
                    </span>
                  </div>
                </div>

                <span className="ds-chip-primary shrink-0 !px-2 !py-0.5">
                  -0.{3 + i * 2}s
                </span>
              </button>
            );
          })}
        </div>
      </section>
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
