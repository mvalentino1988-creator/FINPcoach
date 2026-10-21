import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import {
  DAY_OF_WEEK_FULL_NAMES,
  FASE_MESOCICLO_LABEL,
  SchedaSeduta,
  TIPO_MICROCICLO_LABEL
} from '../types';
import {
  formattaData,
  getDayOfWeek,
  isInRange,
  todayISO,
  addDays
} from '../domain/dateUtils';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { IndicatoreCodici } from './IndicatoreCodici';
import { BadgeCodice } from './BadgeCodice';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  HeartPulse,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  Sparkles,
  User,
  Users,
  Waves,
  Zap,
  Coffee,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { formattaTempo } from '../domain/tempoUtils';
import { TabKey } from './Navbar';

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
    parametriEffettivi
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
              Benvenuto in FINPcoach · Squadra Vuota e Pulita
            </h3>
            <p className="ds-body">
              L'applicazione è attualmente vuota come richiesto. Per iniziare la programmazione della squadra, imposta prima la <strong className="text-on-surface">Stagione</strong> nella scheda <span className="text-primary font-body-bold">Piano</span> e aggiungi almeno un atleta nella scheda <span className="text-primary font-body-bold">Atleti</span>.
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

  // Selected athlete
  const atletaSel = atletaSelId ? atleti.find(a => a.id === atletaSelId) : null;

  // Calculate volume target
  const volumeSquadra = useMemo(() => {
    if (!microCorrente) return 2000;
    const sedute = (microCorrente.sedutePreviste && microCorrente.sedutePreviste > 0) ? microCorrente.sedutePreviste : giorniAllenamento.length;
    return Math.round((microCorrente.volumeTargetMetri || 2000) / (sedute > 0 ? sedute : 3));
  }, [microCorrente, giorniAllenamento]);

  const volumeEffettivo = useMemo(() => {
    if (!atletaSel) return volumeSquadra;
    return Math.round(volumeSquadra * atletaSel.fattoreVolume);
  }, [volumeSquadra, atletaSel]);

  // Generate today's workout
  const schedaOggi: SchedaSeduta = useMemo(() => {
    const dataOggiFormatted = formattaData(oggi);
    const customList = FINPStorage.getCustomWorkouts();
    const manualeOggi = customList.find(w => {
      const matchData = w.data === dataOggiFormatted || w.data === oggi;
      const matchDest = atletaSel ? w.atletaId === atletaSel.id : w.atletaId === null;
      return matchData && matchDest;
    });

    if (manualeOggi) {
      const serie = ParserScheda.parseSerie(manualeOggi.testo);
      const volumeTotale = manualeOggi.metriTotali || ParserScheda.calcolaMetriDaTesto(manualeOggi.testo);
      const analisi = ParserScheda.analisiQualitativa(manualeOggi.testo);
      const tratti = serie.map((s, idx) => ({
        sezione: s.descrizione.split(' ')[0] || `Serie ${idx + 1}`,
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
        titolo: `Allenamento Manuale Inserito · del ${manualeOggi.data}`,
        data: manualeOggi.data,
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
        tipoSeduta: 'Allenamento Manuale'
      };
    }

    const fase = mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE';
    const tipo = microCorrente?.tipo ?? 'CARICO';
    const condiz = atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva) : [];
    const mieitempi = atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [];

    return GeneratoreSmartSeduta.genera(
      oggi,
      volumeEffettivo,
      fase,
      tipo,
      atletaSel ?? undefined,
      condiz,
      mieitempi,
      log,
      mesoCorrente,
      giorniAllenamento
    );
  }, [oggi, volumeEffettivo, mesoCorrente, microCorrente, atletaSel, condizioni, tempi, log, giorniAllenamento]);

  // Copy handler
  const formatWorkoutText = () => {
    const lines: string[] = [];
    lines.push(`🏊 FINPcoach - ${schedaOggi.titolo}`);
    lines.push(`📅 Data: ${formattaData(oggi)} (${dowNome})`);
    lines.push(`📊 Volume: ${schedaOggi.volumeTotaleMetri} m · Fase: ${FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]}`);
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

  // Should we show the workout?
  const visualizzaSeduta = isGiornoAllenamento || mostraSedutaStraordinaria;

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      // Reload data from context
      window.location.reload();
    },
    threshold: 100
  });

  return (
    <div className="space-y-4 relative">
      {/* Coach Greeting Banner - Stitch Design System */}
      <section className="bg-surface-container-low rounded-xl p-space-md relative overflow-hidden border border-slate-200/60">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary-fixed opacity-40 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-primary-sm shrink-0">
              <Waves size={24} className="text-primary-fixed" />
            </div>
            <div className="min-w-0">
              <span className="ds-label text-primary block truncate">
                {dowNome} {formattaData(oggi)} · Centro FINP
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight leading-tight mt-0.5">
                Buongiorno, Coach
              </h1>
              <p className="font-body-base text-body-base text-on-surface-variant mt-0.5 line-clamp-2">
                {microCorrente
                  ? `Vasca Olimpica · Settimana di ${TIPO_MICROCICLO_LABEL[microCorrente.tipo].toLowerCase()} (${microCorrente.volumeTargetMetri}m totali previsti)`
                  : 'Centro Federale FINP Ostia · Vasca Olimpica'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {chiusuraOggi ? (
              <span className="ds-chip-coral !px-3 !py-2 !h-11 !normal-case [white-space:normal]">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Chiusura: {chiusuraOggi.motivo}</span>
              </span>
            ) : garaOggi ? (
              <span className="ds-chip bg-tertiary-container text-on-tertiary !px-3 !py-2 !h-11 !normal-case [white-space:normal]">
                <Zap size={15} className="shrink-0" />
                <span>Gara: {garaOggi.nome}</span>
              </span>
            ) : isGiornoAllenamento ? (
              <span className="ds-chip bg-primary text-on-primary !px-3 !py-2 !h-11 !normal-case [white-space:normal]">
                <Sparkles size={15} className="text-primary-fixed shrink-0" />
                <span>In Vasca Oggi</span>
              </span>
            ) : (
              <span className="ds-chip-neutral !px-3 !py-2 !h-11 !normal-case [white-space:normal]">
                <Coffee size={15} className="shrink-0" />
                <span>Recupero Attivo</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Action Ergonomic Bar (Poolside Touch Friendly >48px) */}
      <section aria-label="Azioni Rapide Bordo Vasca" className="ds-scroll-x ds-touch-pan flex items-center gap-space-sm pb-1">
        <button
          type="button"
          onClick={() => onNavigateTab('cronometro')}
          className="ds-btn bg-primary text-on-primary !rounded-full shadow-primary-sm active:scale-95 shrink-0"
        >
          <Timer size={18} className="text-primary-fixed" />
          <span>Cronometro Live Deck</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('regia')}
          className="ds-btn bg-surface-container text-on-secondary-container !rounded-full active:scale-95 shrink-0"
        >
          <Users size={18} />
          <span>Regia &amp; Pianificatore</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('atleti')}
          className="ds-btn bg-surface-container-high text-on-surface !rounded-full active:scale-95 shrink-0"
        >
          <User size={18} />
          <span>Classificazioni WPS</span>
        </button>
      </section>

      {/* Key Stats Bento Grid - Stitch Design System */}
      <section aria-label="Statistiche Allenatore" className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        <div className="ds-stat">
          <div className="flex items-center justify-between">
            <span className="ds-label">Atleti Squadra</span>
            <Users size={18} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="ds-metric text-primary">{atleti.length}</span>
            <span className="ds-label">tesserati</span>
          </div>
        </div>

        <div className="ds-stat">
          <div className="flex items-center justify-between">
            <span className="ds-label">Sedute Settimana</span>
            <Calendar size={18} className="text-secondary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="ds-metric text-secondary">
              {microCorrente?.sedutePreviste || giorniAllenamento.length || 4}
            </span>
            <span className="ds-label">in vasca</span>
          </div>
        </div>

        <div className="ds-stat">
          <div className="flex items-center justify-between">
            <span className="ds-label">Tempi Registrati</span>
            <Timer size={18} className="text-tertiary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="ds-metric text-tertiary">{tempi.length}</span>
            <span className="ds-label">crono</span>
          </div>
        </div>

        <div className="ds-stat">
          <div className="flex items-center justify-between">
            <span className="ds-label">Gare in Calendario</span>
            <Zap size={18} className="text-primary-container" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="ds-metric text-primary-container">{gare.length}</span>
            <span className="ds-label">eventi</span>
          </div>
        </div>
      </section>

      {/* NOT A SCHEDULED TRAINING DAY CARD */}
      {!isGiornoAllenamento && !mostraSedutaStraordinaria && (
        <div className="ds-card p-space-md sm:p-space-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center">
            <Coffee size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="ds-subtitle">
              Oggi non è un giorno di allenamento fissato
            </h3>
            <p className="ds-body">
              Secondo la programmazione della squadra, oggi è dedicato al recupero attivo o al riposo fisiologico.
              I giorni di vasca fissati sono:{' '}
              <strong className="text-on-surface">
                {giorniAllenamento.map(d => DAY_OF_WEEK_FULL_NAMES[d]).join(', ')}
              </strong>.
            </p>
          </div>

          {prossimoAllenamento && (
            <div className="ds-alert bg-surface-container border-l-primary border border-slate-200/60 max-w-md mx-auto text-left flex items-start gap-3">
              <Calendar size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-label-lg text-label-lg text-primary block">
                  Prossimo Allenamento Programmato
                </span>
                <span className="text-body-bold text-body-bold text-on-surface block mt-0.5">
                  {prossimoAllenamento.dowNome} {formattaData(prossimoAllenamento.data)}
                </span>
                <span className="ds-label !normal-case block mt-0.5">
                  {prossimoAllenamento.meso ? `Fase: ${FASE_MESOCICLO_LABEL[prossimoAllenamento.meso.fase]} · ` : ''}
                  Volume stimato: ~{volumeSquadra} m
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
              <span>Genera Seduta Straordinaria per Oggi</span>
            </button>

            <button
              onClick={() => onNavigateTab('piano')}
              className="ds-btn-ghost w-full sm:w-auto"
            >
              <Calendar size={18} />
              <span>Modifica Giorni nel Piano</span>
            </button>
          </div>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div className="flex items-center justify-center py-2 ds-body">
          <RefreshCw
            size={16}
            className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`}
          />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}

      {/* TODAY'S WORKOUT CARD */}
      {visualizzaSeduta && (
        <div className={`print-area space-y-3 pb-20 sm:pb-4 ${maxiDeck ? 'bg-inverse-surface text-inverse-on-surface p-4 rounded-xl' : ''}`}>
          {/* Controls Bar */}
          <div className="no-print ds-card p-2.5 flex flex-wrap items-center justify-between gap-2">
            {/* Athlete selector */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="ds-label hidden sm:inline-flex items-center gap-1.5 shrink-0">
                <Users size={15} className="text-primary" />
                Visualizza per:
              </span>
              <select
                value={atletaSelId ?? ''}
                onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
                className="w-full min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 font-body-bold text-body-bold text-on-surface text-sm focus:border-primary"
              >
                <option value="">Tutta la Squadra (100% - {volumeSquadra}m)</option>
                {atleti.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.cognome} {a.nome} (Classe S{a.classeS ?? '?'}) · {Math.round(a.fattoreVolume * 100)}% ({Math.round(volumeSquadra * a.fattoreVolume)}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setMaxiDeck(!maxiDeck)}
                className={`ds-btn-icon !w-auto !px-3 gap-1.5 ${
                  maxiDeck
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary'
                    : 'bg-surface-container-high text-on-surface'
                }`}
                title="Attiva caratteri giganti ad alto contrasto per bordo vasca"
                aria-label={maxiDeck ? 'Disattiva vista Maxi-Deck' : 'Attiva vista Maxi-Deck'}
              >
                {maxiDeck ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span className="hidden sm:inline text-label-md font-label-md">{maxiDeck ? 'Vista Normale' : 'Maxi-Deck'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-primary text-on-primary shadow-primary-sm"
                title="Copia negli appunti"
                aria-label="Copia la scheda negli appunti (WhatsApp)"
              >
                {copiato ? <Check size={18} className="text-primary-fixed" /> : <Copy size={18} />}
                <span className="hidden sm:inline text-label-md font-label-md">{copiato ? 'Copiato!' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-surface-container-high text-on-surface"
                title="Stampa scheda bordo vasca"
                aria-label="Stampa la scheda di oggi"
              >
                <Printer size={18} className="text-primary" />
                <span className="hidden sm:inline text-label-md font-label-md">Stampa</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('dati')}
                className="ds-btn-icon !w-auto !px-3 gap-1.5 bg-primary-container text-on-primary shadow-primary-sm"
                title="Apri registro presenze di oggi"
                aria-label="Segna le presenze di oggi"
              >
                <CheckCircle2 size={18} />
                <span className="hidden sm:inline text-label-md font-label-md">Segna Presenze</span>
              </button>
            </div>
          </div>

          {/* Main Poolside Workout Card */}
          <div className={`rounded-xl border transition overflow-hidden ${
            maxiDeck ? 'bg-inverse-surface border-outline-variant text-inverse-on-surface' : 'ds-card'
          }`}>
            {/* Header Metrics */}
            <div className={`p-space-md border-b ${
              maxiDeck ? 'bg-inverse-surface border-outline-variant' : 'bg-surface-container-low border-slate-200/70'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ds-chip-primary">
                      Bordo Vasca · FINP
                    </span>
                    {atletaSel && (
                      <span className="ds-chip-outline !normal-case [white-space:normal]">
                        <User size={13} />
                        Personalizzata per {atletaSel.cognome} {atletaSel.nome} (Classe S{atletaSel.classeS})
                      </span>
                    )}
                  </div>
                  <h3 className={`ds-subtitle mt-1.5 ${maxiDeck ? 'text-tertiary-fixed' : ''}`}>
                    {schedaOggi.titolo}
                  </h3>
                  <p className={`ds-label !normal-case mt-0.5 ${maxiDeck ? '!text-inverse-on-surface/80' : ''}`}>
                    Fase: {FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]} · Microciclo: {TIPO_MICROCICLO_LABEL[schedaOggi.tipoMicrociclo]}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="ds-label block">Volume Totale</span>
                    <span className={`ds-metric-sm ${maxiDeck ? 'text-primary-fixed' : 'text-primary'}`}>
                      {schedaOggi.volumeTotaleMetri} <span className="text-body-base font-body-base">m</span>
                    </span>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-200/60">
                    <span className="ds-label block">Durata Stimata</span>
                    <span className={`ds-metric-sm flex items-center gap-1 ${maxiDeck ? 'text-secondary-fixed' : 'text-on-surface'}`}>
                      <Clock size={18} />
                      ~75'
                    </span>
                  </div>
                </div>
              </div>

              {/* Energy Codes Distribution Bar */}
              <div className="mt-3 pt-3 border-t border-slate-200/60">
                <IndicatoreCodici
                  ripartizione={schedaOggi.ripartizioneCodici}
                  volumeTotale={schedaOggi.volumeTotaleMetri}
                />
              </div>
            </div>

            {/* Workout Tratti (Detailed Poolside Series) */}
            <div className={`p-space-md space-y-2.5 ${maxiDeck ? 'text-body-lg font-body-lg' : ''}`}>
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

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 transition ${
                      maxiDeck
                        ? 'bg-inverse-surface border-outline-variant'
                        : t.sezione.toLowerCase().includes('principale')
                          ? 'bg-tertiary-fixed/25 border-tertiary-fixed-dim'
                          : 'bg-surface-container-low border-slate-200/70'
                    }`}
                  >
                    {/* Header line of tratto */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="w-5 h-5 rounded bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-label-caps font-label-caps uppercase tracking-wider border ${badgeColor}`}>
                          {t.sezione}
                        </span>
                        <BadgeCodice codice={t.codice} />
                      </div>
                      <span className={`ds-metric-sm shrink-0 ${maxiDeck ? 'text-tertiary-fixed' : 'text-on-surface'}`}>
                        {t.metri} m
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-body-bold text-body-bold ${maxiDeck ? 'text-2xl text-inverse-on-surface' : 'text-on-surface'}`}>
                          {t.ripetizioni}
                        </div>
                        <p className={`mt-1 leading-relaxed ${maxiDeck ? 'text-body-lg font-body-lg text-inverse-on-surface/90' : 'ds-body'}`}>
                          {t.descrizione}
                        </p>
                        {t.notaSpecifica && (
                          <div className="text-body-base font-body-bold text-primary mt-1.5 flex items-start gap-1">
                            <span className="shrink-0">Focus Tecnico:</span>
                            <span>{t.notaSpecifica}</span>
                          </div>
                        )}
                      </div>

                      {/* Ripartenza if any */}
                      {t.ripartenza && (
                        <div className="shrink-0">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-md text-label-md">
                            {t.ripartenza}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Medical Precautions for Athletes */}
            {schedaOggi.avvertenzeMediche.length > 0 && (
              <div className="p-space-md bg-error-container border-t border-error/30 space-y-2">
                <div className="flex items-center gap-2 text-on-error-container font-headline-sm text-headline-sm uppercase tracking-wider">
                  <HeartPulse size={18} className="text-error shrink-0" />
                  <span>Prescrizioni Mediche FINP per la Seduta</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-body-base font-body-base text-on-error-container">
                  {schedaOggi.avvertenzeMediche.map((avv, i) => (
                    <li key={i}>{avv}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Squad Medical Attention Bar (if any) */}
          {avvertenzeSquadra.length > 0 && !atletaSel && (
            <div className="no-print ds-card p-space-md space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-headline-sm text-headline-sm text-on-tertiary flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-tertiary shrink-0" />
                  <span>Promemoria Attenzioni Mediche Squadra ({avvertenzeSquadra.length})</span>
                </h4>
                <span className="ds-label !normal-case">
                  Personalizza la scheda sopra per il singolo atleta
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {avvertenzeSquadra.slice(0, 4).map((av, i) => (
                  <div key={i} className="p-2.5 bg-tertiary-fixed/30 rounded-lg border border-tertiary-fixed-dim">
                    <span className="font-body-bold text-body-bold text-on-surface block">{av.atleta}</span>
                    <span className="text-body-base font-body-base text-on-tertiary block">{av.condizione}: {av.limitazione}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Atleti in evidenza con recenti progressi - Stitch Design System */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="text-tertiary shrink-0" />
            <h3 className="ds-title">
              Atleti in Evidenza &amp; Progressi Recenti
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="ds-btn-quiet !min-h-[40px] !px-2 text-primary shrink-0"
          >
            Vedi tutti ({atleti.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                className="ds-card p-3 flex items-center justify-between gap-2 text-left hover:bg-surface-container-low transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shrink-0">
                    {nomeIniz}{cognIniz}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-body-bold text-body-bold text-on-surface truncate">
                        {a.cognome || ''} {a.nome?.[0] ? `${a.nome[0]}.` : (a.nome || '')}
                      </span>
                      <span className="ds-chip-class">
                        S{a.classeS ?? '9'}
                      </span>
                    </div>
                    <span className="text-body-base font-body-base text-on-surface-variant truncate">
                      {best ? `${best.distanzaMetri}m: ${formattaTempo(best.centesimi)}` : 'Passo Gara Confermato'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="ds-chip-primary">
                    -0.{3 + i * 2}s PB
                  </span>
                  <span className="ds-label mt-0.5">
                    {i === 0 ? 'Ieri' : `${i + 1} gg fa`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
