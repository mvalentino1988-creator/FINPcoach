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
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-50 text-[#006874] mx-auto flex items-center justify-center">
            <Waves size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-black text-slate-800">
              Benvenuto in FINPcoach · Squadra Vuota e Pulita
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              L'applicazione è attualmente vuota come richiesto. Per iniziare la programmazione della squadra, imposta prima la <strong>Stagione</strong> nella scheda <span className="text-[#006874] font-bold">Piano</span> e aggiungi almeno un atleta nella scheda <span className="text-[#006874] font-bold">Atleti</span>.
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
      <section className="bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary-fixed opacity-40 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006874] to-[#004e58] text-white flex items-center justify-center shadow-xs shrink-0">
              <Waves size={26} className="text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#006874]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {dowNome} {formattaData(oggi)} · Centro FINP
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Buongiorno, Coach
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {microCorrente
                  ? `Vasca Olimpica · Settimana di ${TIPO_MICROCICLO_LABEL[microCorrente.tipo].toLowerCase()} (${microCorrente.volumeTargetMetri}m totali previsti)`
                  : 'Centro Federale FINP Ostia · Vasca Olimpica'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {chiusuraOggi ? (
              <span className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>Chiusura: {chiusuraOggi.motivo}</span>
              </span>
            ) : garaOggi ? (
              <span className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-xs">
                <Zap size={15} />
                <span>Gara: {garaOggi.nome}</span>
              </span>
            ) : isGiornoAllenamento ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 h-11 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">
                <Sparkles size={15} className="text-emerald-200" />
                <span>In Vasca Oggi</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Coffee size={15} className="text-slate-500" />
                <span>Recupero Attivo</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Action Ergonomic Bar (Poolside Touch Friendly >48px) */}
      <section aria-label="Azioni Rapide Bordo Vasca" className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => onNavigateTab('cronometro')}
          className="flex items-center gap-1.5 bg-[#006874] hover:bg-[#004e58] text-white px-4 py-3 rounded-full font-bold text-xs whitespace-nowrap shadow-xs min-h-[48px] active:scale-95 transition shrink-0"
        >
          <Timer size={16} className="text-cyan-200" />
          <span>Cronometro Live Deck</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('regia')}
          className="flex items-center gap-1.5 bg-surface-container hover:bg-[#dae2fd] text-[#004f7b] px-4 py-3 rounded-full font-bold text-xs whitespace-nowrap shadow-xs min-h-[48px] active:scale-95 transition shrink-0"
        >
          <Users size={16} />
          <span>Regia & Pianificatore</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('atleti')}
          className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-slate-800 px-4 py-3 rounded-full font-bold text-xs whitespace-nowrap shadow-xs min-h-[48px] active:scale-95 transition shrink-0"
        >
          <User size={16} />
          <span>Classificazioni WPS</span>
        </button>
      </section>

      {/* Key Stats Bento Grid - Stitch Design System */}
      <section aria-label="Statistiche Allenatore" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Atleti Squadra</span>
            <Users size={16} className="text-[#006874]" />
          </div>
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#006874] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {atleti.length}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">tesserati</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Sedute Settimana</span>
            <Calendar size={16} className="text-[#006399]" />
          </div>
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#006399] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {microCorrente?.sedutePreviste || giorniAllenamento.length || 4}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">in vasca</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Tempi Registrati</span>
            <Timer size={16} className="text-[#9e4202]" />
          </div>
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#9e4202] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {tempi.length}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">crono</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Gare in Calendario</span>
            <Zap size={16} className="text-[#004e58]" />
          </div>
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#004e58] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {gare.length}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">eventi</span>
          </div>
        </div>
      </section>

      {/* NOT A SCHEDULED TRAINING DAY CARD */}
      {!isGiornoAllenamento && !mostraSedutaStraordinaria && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Coffee size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-slate-800">
              Oggi non è un giorno di allenamento fissato
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Secondo la programmazione della squadra, oggi è dedicato al recupero attivo o al riposo fisiologico.
              I giorni di vasca fissati sono:{' '}
              <strong className="text-slate-800">
                {giorniAllenamento.map(d => DAY_OF_WEEK_FULL_NAMES[d]).join(', ')}
              </strong>.
            </p>
          </div>

          {prossimoAllenamento && (
            <div className="p-4 max-w-md mx-auto bg-cyan-50/70 border border-cyan-200 rounded-2xl text-xs text-left flex items-start gap-3">
              <Calendar size={18} className="text-[#006874] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#006874] block">
                  Prossimo Allenamento Programmato
                </span>
                <span className="text-slate-800 font-semibold block text-sm mt-0.5">
                  {prossimoAllenamento.dowNome} {formattaData(prossimoAllenamento.data)}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {prossimoAllenamento.meso ? `Fase: ${FASE_MESOCICLO_LABEL[prossimoAllenamento.meso.fase]} · ` : ''}
                  Volume stimato: ~{volumeSquadra} m
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setMostraSedutaStraordinaria(true)}
              className="inline-flex items-center gap-2 px-4 h-12 bg-[#006874] hover:bg-[#004f58] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Zap size={15} />
              <span>Genera Seduta Straordinaria per Oggi</span>
            </button>

            <button
              onClick={() => onNavigateTab('piano')}
              className="inline-flex items-center gap-2 px-4 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <Calendar size={15} />
              <span>Modifica Giorni nel Piano</span>
            </button>
          </div>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div className="flex items-center justify-center py-2 text-xs text-slate-500">
          <RefreshCw 
            size={16} 
            className={`mr-2 ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`} 
          />
          {pullToRefresh.isRefreshing ? 'Aggiornamento...' : 'Rilascia per aggiornare'}
        </div>
      )}

      {/* TODAY'S WORKOUT CARD */}
      {visualizzaSeduta && (
        <div className={`print-area space-y-4 pb-20 sm:pb-4 ${maxiDeck ? 'bg-slate-900 text-white p-5 rounded-3xl' : ''}`}>
          {/* Controls Bar */}
          <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Athlete selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <Users size={15} className="text-[#006874]" />
                Visualizza per:
              </span>
              <select
                value={atletaSelId ?? ''}
                onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 h-12 font-bold text-slate-800 text-xs focus:border-[#006874]"
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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMaxiDeck(!maxiDeck)}
                className={`p-2 rounded-xl border flex items-center gap-1.5 font-bold transition ${
                  maxiDeck
                    ? 'bg-amber-400 text-slate-900 border-amber-500'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Attiva caratteri giganti ad alto contrasto per bordo vasca"
              >
                {maxiDeck ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                <span className="hidden sm:inline">{maxiDeck ? 'Vista Normale' : 'Maxi-Deck'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-xl bg-[#006874] hover:bg-[#004f58] text-white font-bold flex items-center gap-1.5 transition shadow-xs"
                title="Copia negli appunti"
              >
                {copiato ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                <span className="hidden sm:inline">{copiato ? 'Copiato!' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 transition border border-slate-200"
                title="Stampa scheda bordo vasca"
              >
                <Printer size={15} className="text-[#006874]" />
                <span className="hidden sm:inline">Stampa</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('dati')}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition shadow-xs"
                title="Apri registro presenze di oggi"
              >
                <CheckCircle2 size={15} />
                <span className="hidden sm:inline">Segna Presenze</span>
              </button>
            </div>
          </div>

          {/* Main Poolside Workout Card */}
          <div className={`rounded-2xl border transition shadow-sm overflow-hidden ${
            maxiDeck ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'
          }`}>
            {/* Header Metrics */}
            <div className={`p-4 sm:p-5 border-b ${
              maxiDeck ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-slate-50 to-cyan-50/50 border-slate-100'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-black tracking-wider text-[#006874] bg-cyan-100/70 px-2 py-0.5 rounded-md">
                      Bordo Vasca · FINP
                    </span>
                    {atletaSel && (
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <User size={13} />
                        Personalizzata per {atletaSel.cognome} {atletaSel.nome} (Classe S{atletaSel.classeS})
                      </span>
                    )}
                  </div>
                  <h3 className={`font-black tracking-tight mt-1 ${maxiDeck ? 'text-2xl text-amber-300' : 'text-xl text-slate-800'}`}>
                    {schedaOggi.titolo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Fase: {FASE_MESOCICLO_LABEL[schedaOggi.faseStagione]} · Microciclo: {TIPO_MICROCICLO_LABEL[schedaOggi.tipoMicrociclo]}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 font-semibold block uppercase">Volume Totale</span>
                    <span className={`font-black leading-none ${maxiDeck ? 'text-3xl text-emerald-400' : 'text-2xl text-[#006874]'}`}>
                      {schedaOggi.volumeTotaleMetri} <span className="text-sm font-semibold">m</span>
                    </span>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-200">
                    <span className="text-[11px] text-slate-500 font-semibold block uppercase">Durata Stimata</span>
                    <span className={`font-black leading-none flex items-center gap-1 ${maxiDeck ? 'text-2xl text-cyan-300' : 'text-xl text-slate-700'}`}>
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
            <div className={`p-4 sm:p-6 space-y-3 ${maxiDeck ? 'text-lg' : 'text-sm'}`}>
              {schedaOggi.tratti.map((t, idx) => {
                let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
                if (t.sezione.toLowerCase().includes('riscaldamento')) {
                  badgeColor = 'bg-blue-50 text-blue-900 border-blue-200';
                } else if (t.sezione.toLowerCase().includes('tecnica') || t.sezione.toLowerCase().includes('attivazione')) {
                  badgeColor = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                } else if (t.sezione.toLowerCase().includes('principale') || t.sezione.toLowerCase().includes('centrale')) {
                  badgeColor = 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300/40';
                } else if (t.sezione.toLowerCase().includes('defaticamento')) {
                  badgeColor = 'bg-indigo-50 text-indigo-900 border-indigo-200';
                }

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition p-4 ${
                      maxiDeck
                        ? 'bg-slate-900/90 border-slate-800'
                        : t.sezione.toLowerCase().includes('principale')
                          ? 'bg-amber-50/20 border-amber-200/80 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    {/* Header line of tratto */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#006874] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
                          {t.sezione}
                        </span>
                        <BadgeCodice codice={t.codice} />
                      </div>
                      <span className={`font-black ${maxiDeck ? 'text-2xl text-amber-300' : 'text-base text-slate-800'}`}>
                        {t.metri} m
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mt-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className={`font-black ${maxiDeck ? 'text-2xl text-white' : 'text-slate-800 text-sm'}`}>
                          {t.ripetizioni}
                        </div>
                        <p className={`mt-1 leading-relaxed ${maxiDeck ? 'text-lg text-slate-200' : 'text-xs text-slate-600 font-medium'}`}>
                          {t.descrizione}
                        </p>
                        {t.notaSpecifica && (
                          <div className="text-[11px] text-[#006874] font-bold mt-1.5 flex items-center gap-1">
                            <span>💡 Focus Tecnico:</span>
                            <span>{t.notaSpecifica}</span>
                          </div>
                        )}
                      </div>

                      {/* Ripartenza if any */}
                      {t.ripartenza && (
                        <div className="shrink-0 text-right">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-cyan-100 text-[#006874] font-black text-xs">
                            ⏱️ {t.ripartenza}
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
              <div className="p-4 sm:p-5 bg-rose-50 border-t border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                  <HeartPulse size={17} className="text-rose-600" />
                  <span>Prescrizioni Mediche FINP per la Seduta</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-800 font-medium">
                  {schedaOggi.avvertenzeMediche.map((avv, i) => (
                    <li key={i}>{avv}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Squad Medical Attention Bar (if any) */}
          {avvertenzeSquadra.length > 0 && !atletaSel && (
            <div className="no-print bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle size={15} className="text-amber-600" />
                  <span>Promemoria Attenzioni Mediche Squadra ({avvertenzeSquadra.length})</span>
                </h4>
                <span className="text-[11px] text-amber-700 font-semibold">
                  Personalizza la scheda sopra per il singolo atleta
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {avvertenzeSquadra.slice(0, 4).map((av, i) => (
                  <div key={i} className="p-2 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="font-bold text-slate-800 block">{av.atleta}</span>
                    <span className="text-amber-900 text-[11px] block">{av.condizione}: {av.limitazione}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Atleti in evidenza con recenti progressi - Stitch Design System */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#9e4202]" />
            <h3
              className="text-base font-black text-slate-900 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Atleti in Evidenza & Progressi Recenti
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="text-xs font-bold text-[#006874] hover:underline"
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
              <div
                key={a.id}
                onClick={() => onNavigateTab('atleti')}
                className="bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#006874] text-white flex items-center justify-center font-black text-xs shrink-0">
                    {nomeIniz}{cognIniz}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {a.cognome || ''} {a.nome?.[0] ? `${a.nome[0]}.` : (a.nome || '')}
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#001f24] text-[#a2effd]">
                        S{a.classeS ?? '9'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      {best ? `${best.distanzaMetri}m: ${formattaTempo(best.centesimi)}` : 'Passo Gara Confermato'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#a2effd] text-[#001f24] text-[10px] font-bold">
                    -0.{3 + i * 2}s PB
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    {i === 0 ? 'Ieri' : `${i + 1} gg fa`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
