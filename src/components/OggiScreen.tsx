import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  CodiceAllenamentoKey,
  DAY_OF_WEEK_FULL_NAMES,
  ParametriSeduta,
  TIPO_MICROCICLO_LABEL,
} from '../types';
import {
  addDays,
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
import { valutaProgramma } from '../domain/gareAmmissibili';
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  ClipboardList,
  Coffee,
  Copy,
  Gauge,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { TabKey } from './Navbar';

const ORDINE_CODICI: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];

const SquadraVuota: React.FC = () => {
  const vai = (tab: TabKey, sezione?: string) => {
    if (sezione) sessionStorage.setItem('finp_altro_sezione', sezione);
    window.dispatchEvent(new CustomEvent('finp:navigate', { detail: tab }));
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      <PageHeader label="Oggi" title="Seduta e giornata" meta="La schermata operativa quotidiana." />
      <div className="ds-card p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-primary-sm">
          <Waves size={24} />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="ds-subtitle">Inizia da qui</h3>
          <p className="ds-body">
            Crea prima la stagione in <strong className="text-on-surface">Piano</strong>, poi aggiungi gli atleti in <strong className="text-on-surface">Squadra</strong>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
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

  const dettaglioSquadra = useMemo(() => {
    if (atletaSel || atleti.length === 0) return null;

    const items = atleti.map(a => {
      const eta = a.dataNascita ? yearsBetween(a.dataNascita, oggi) : null;
      const opts = {
        fase: faseSeduta,
        tipoMicro: tipoSeduta,
        etaAtleta: eta,
        condizioni: condizioni.filter(c => c.atletaId === a.id && c.attiva),
      };
      return {
        atleta: a,
        codici: generaCodiciSeduta(opts).codici,
        consentiti: new Set(codiciConsentiti(opts)),
      };
    });

    const consentitiItems = items.map(i => i.consentiti);
    const comuniSet = consentitiItems.reduce<Set<CodiceAllenamentoKey>>(
      (acc, set) => new Set([...acc].filter(c => set.has(c))),
      new Set(consentitiItems[0] ?? [])
    );

    const preferenzaTeam = generaCodiciSeduta({
      fase: faseSeduta,
      tipoMicro: tipoSeduta,
      etaAtleta: etaSquadra,
      condizioni: condizioni.filter(c => c.attiva),
    }).codici;

    const comuni = Array.from(new Set([...preferenzaTeam, ...ORDINE_CODICI].filter(c => comuniSet.has(c)))).slice(0, 2);
    if (comuni.length === 0) comuni.push('A1');

    const firmaComuni = comuni.join('+');
    const varianti = items
      .filter(i => i.codici.join('+') !== firmaComuni)
      .slice(0, 6)
      .map(i => ({ nome: `${i.atleta.cognome} ${i.atleta.nome}`, codici: i.codici }));

    return { comuni, varianti };
  }, [atletaSel, atleti, condizioni, oggi, faseSeduta, tipoSeduta, etaSquadra]);

  const propostaCodici = useMemo(() => {
    if (atletaSel) {
      return generaCodiciSeduta({
        fase: faseSeduta,
        tipoMicro: tipoSeduta,
        etaAtleta: etaAtletaSel,
        condizioni: condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva),
      }).codici;
    }
    if (dettaglioSquadra) return dettaglioSquadra.comuni;
    return generaCodiciSeduta({
      fase: faseSeduta,
      tipoMicro: tipoSeduta,
      etaAtleta: etaSquadra,
      condizioni: condizioni.filter(c => c.attiva),
    }).codici;
  }, [atletaSel, etaAtletaSel, dettaglioSquadra, etaSquadra, faseSeduta, tipoSeduta, condizioni]);

  const schedaSalvata = useMemo(() => {
    const dataOggiFormatted = formattaData(oggi);
    const list = FINPStorage.getCustomWorkouts();
    return list.find(w => {
      const matchData = w.data === dataOggiFormatted || w.data === oggi;
      return matchData && (atletaSel ? w.atletaId === atletaSel.id : w.atletaId === null);
    }) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oggi, atletaSel, revisioneStorage]);

  const prossimoAllenamento = useMemo(() => {
    if (isGiornoAllenamento) return null;
    for (let i = 1; i <= 7; i++) {
      const nextDate = addDays(oggi, i);
      const nextDow = getDayOfWeek(nextDate);
      const nextChiusura = chiusure.find(c => isInRange(nextDate, c.dal, c.al));
      if (giorniAllenamento.includes(nextDow) && !nextChiusura) {
        const nextMicro = micro.find(m => isInRange(nextDate, m.inizio, m.fine));
        return { data: nextDate, dowNome: DAY_OF_WEEK_FULL_NAMES[nextDow], micro: nextMicro };
      }
    }
    return null;
  }, [isGiornoAllenamento, oggi, giorniAllenamento, chiusure, micro]);

  const prossimaGara = useMemo(() => {
    const future = gare.filter(g => !isBefore(g.dal, oggi)).sort((a, b) => a.dal.localeCompare(b.dal));
    if (future.length === 0) return null;
    const g = future[0];
    const diffDays = Math.ceil((toDateObj(g.dal).getTime() - toDateObj(oggi).getTime()) / 86400000);
    return { ...g, diffDays: Math.max(0, diffDays) };
  }, [gare, oggi]);

  const [dataSchedaTarget, setDataSchedaTarget] = useState<string>(oggi);

  // 1.1 Prossimo allenamento
  const prossimiParametri = useMemo(() => {
    if (!prossimoAllenamento) return null;
    return risolviParametriSeduta(prossimoAllenamento.data, impostazioni, stagione);
  }, [prossimoAllenamento, impostazioni, stagione]);

  const prossimiCodici: CodiceAllenamentoKey[] = useMemo(() => {
    if (!prossimoAllenamento) return ['A1'];
    const nextMeso = prossimoAllenamento.micro ? meso.find(me => me.id === prossimoAllenamento.micro?.mesocicloId) : null;
    const fase = nextMeso?.fase ?? 'PREPARAZIONE_GENERALE';
    const tipo = prossimoAllenamento.micro?.tipo ?? 'CARICO';
    return generaCodiciSeduta({
      fase,
      tipoMicro: tipo,
      etaAtleta: etaSquadra,
      condizioni: condizioni.filter(c => c.attiva),
    }).codici;
  }, [prossimoAllenamento, meso, etaSquadra, condizioni]);

  const prossimoVolume = useMemo(() => {
    if (!prossimoAllenamento || !prossimiParametri) return 0;
    return calcolaVolumeSessione({
      micro: prossimoAllenamento.micro,
      atleta: atletaSel,
      assenze: [],
      condizioni: atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva) : [],
      tempi: atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [],
      logSedute: atletaSel ? log.filter(l => l.atletaId === atletaSel.id) : log,
      parametri: prossimiParametri,
      durateSettimana: settimanaSedute,
      volumeSettimanaFallback: volumeSettimana,
    }).metriSessione;
  }, [prossimoAllenamento, prossimiParametri, atletaSel, condizioni, tempi, log, settimanaSedute, volumeSettimana]);

  // 1.2 Cruscotto settimanale
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

  // 1.3 Promemoria calibrazione (atleti con ultimo test > 45 giorni o senza test)
  const atletiDaCalibrare = useMemo(() => {
    return atleti.filter(a => {
      const tempiAtleta = tempi.filter(t => t.atletaId === a.id);
      if (tempiAtleta.length === 0) return true;
      const latest = [...tempiAtleta].sort((x, y) => y.data.localeCompare(x.data))[0];
      const diffDays = Math.ceil((toDateObj(oggi).getTime() - toDateObj(latest.data).getTime()) / 86400000);
      return diffDays > 45;
    });
  }, [atleti, tempi, oggi]);

  // 1.4 Countdown Gare & Ammissibilità
  const atletiAmmissibiliProssimaGara = useMemo(() => {
    if (!prossimaGara) return 0;
    const v = (stagione?.vascaMetri === 25 ? 'corta' : 'lunga') as 'corta' | 'lunga';
    return atleti.filter(a => {
      const prog = valutaProgramma({ classeS: a.classeS, classeSB: a.classeSB, classeSM: a.classeSM }, v);
      return prog.some(e => e.stato === 'ammessa');
    }).length;
  }, [prossimaGara, atleti, stagione]);

  const vai = (tab: TabKey, sezione?: string, datiTab?: string) => {
    if (sezione) sessionStorage.setItem('finp_altro_sezione', sezione);
    if (datiTab) sessionStorage.setItem('finp_dati_tab', datiTab);
    window.dispatchEvent(new CustomEvent('finp:navigate', { detail: tab }));
  };

  const testoCodici = useMemo(() => {
    const lines = [
      `FINPcoach · ${formattaData(oggi)} (${dowNome})`,
      `Focus: ${propostaCodici.join(' + ')}`,
      `Volume: ${volumeSessione} m · Vasca: ${parametriSeduta.vascaMetri} m · Durata: ${parametriSeduta.durataMin} min`,
      atletaSel ? `Atleta: ${atletaSel.cognome} ${atletaSel.nome}` : 'Destinatario: Squadra',
    ];
    return lines.join('\n');
  }, [oggi, dowNome, propostaCodici, volumeSessione, parametriSeduta, atletaSel]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(testoCodici);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setCopiato(false);
    }
  };

  const status = chiusuraOggi ? 'closed' : garaOggi ? 'race' : isGiornoAllenamento ? 'training' : 'rest';
  const statusLabel = chiusuraOggi ? 'Piscina chiusa' : garaOggi ? `Gara · ${garaOggi.nome}` : isGiornoAllenamento ? 'Allenamento' : 'Riposo';
  const StatusIcon = chiusuraOggi ? AlertTriangle : garaOggi ? Zap : isGiornoAllenamento ? Sparkles : Coffee;

  return (
    <div className="oggi-screen flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Greeting + environmental strip — layout dashboard Stitch */}
      <section className="shrink-0 flex flex-col gap-1.5 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold block truncate">
              {TIPO_MICROCICLO_LABEL[microCorrente?.tipo ?? 'CARICO']}
              {macroCorrente ? ` · ${macroCorrente.nome}` : ''}
            </span>
            <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface tracking-tight leading-tight">
              Ciao, Coach
            </h1>
            <p className="text-body-base text-on-surface-variant truncate">
              {dowNome} {formattaData(oggi)}
              {microCorrente?.luogo ? ` • ${microCorrente.luogo}` : ''}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
              status === 'training' ? 'bg-primary/10 text-primary'
                : status === 'race' ? 'bg-tertiary/10 text-tertiary'
                : status === 'closed' ? 'bg-error-container text-error'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              <StatusIcon size={24} />
            </div>
            {isGiornoAllenamento && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-surface" />
            )}
          </div>
        </div>

        {/* Strip parametri giornata */}
        <div className="flex items-center justify-between gap-1 bg-surface-container px-3 py-2 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Gauge size={16} className="text-secondary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-none">Focus</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                {isGiornoAllenamento ? propostaCodici.join(' + ') : statusLabel}
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-outline-variant/40 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Waves size={16} className="text-primary-container shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-none">Volume</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                {volumeSessione >= 1000 ? `${(volumeSessione / 1000).toFixed(1).replace('.', ',')} km` : `${volumeSessione} m`}
                <span className="text-secondary font-bold"> · {percVolumeSettimana}%</span>
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-outline-variant/40 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Timer size={16} className="text-on-surface-variant shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-none">Seduta</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                {parametriSeduta.durataMin} min · {parametriSeduta.vascaMetri} m
              </span>
            </div>
          </div>
          {prossimaGara && (
            <>
              <div className="h-6 w-px bg-outline-variant/40 shrink-0 hidden sm:block" />
              <div className="hidden sm:flex flex-col items-end shrink-0">
                <span className="font-stat-timer-mobile text-stat-timer-mobile text-primary leading-none">{prossimaGara.diffDays}</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">gg gara</span>
              </div>
            </>
          )}
        </div>
      </section>

      {isGiornoAllenamento ? (
        <section className="ds-card overflow-hidden flex flex-col shrink-0">
          {/* Striscia colore stato sessione */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-secondary to-primary" />
          <div className="p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-container font-label-caps text-label-caps font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                {statusLabel}
              </span>
              {microCorrente?.inizioHHMM && (
                <span className="text-label-lg text-on-surface-variant flex items-center gap-1">
                  <Timer size={14} />
                  {microCorrente.inizioHHMM}{microCorrente.fineHHMM ? `–${microCorrente.fineHHMM}` : ''}
                </span>
              )}
            </div>

            <CodiciSeduta
              codici={propostaCodici}
              titolo={atletaSel ? `Codici atleta · ${atletaSel.cognome} ${atletaSel.nome}` : 'Codici comuni'}
              compatto
              centrato
            />

            {!atletaSel && dettaglioSquadra && dettaglioSquadra.varianti.length > 0 && (
              <div className="rounded-lg bg-surface-container-low border border-outline-variant p-2 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Varianti individuali</div>
                {dettaglioSquadra.varianti.map(v => (
                  <div key={v.nome} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-on-surface">{v.nome}</span>
                    <span className="font-headline font-bold text-primary shrink-0">{v.codici.join(' + ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Progress tracker volume */}
            <div className="flex flex-col gap-1.5 bg-surface-container-low p-2.5 rounded-lg">
              <div className="flex justify-between items-center text-on-surface">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Carico settimana</span>
                <span className="font-label-lg text-label-lg font-bold text-primary">{percVolumeSettimana}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300" style={{ width: `${percVolumeSettimana}%` }} />
              </div>
              <div className="flex justify-between text-on-surface-variant font-label-caps text-label-caps">
                <span>{volumeSvoltoSettimana.toLocaleString('it-IT')} m</span>
                <span>{seduteSvolteSettimana.length} di {settimanaISO.length} sedute</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-surface-container-low px-1 py-1.5">
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Volume</div>
                <div className="font-headline font-bold text-on-surface text-xs">{volumeSessione.toLocaleString('it-IT')} m</div>
              </div>
              <div className="rounded-lg bg-surface-container-low px-1 py-1.5">
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Durata</div>
                <div className="font-headline font-bold text-on-surface text-xs">{parametriSeduta.durataMin} min</div>
              </div>
              <div className="rounded-lg bg-surface-container-low px-1 py-1.5">
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">Vasca</div>
                <div className="font-headline font-bold text-on-surface text-xs">{parametriSeduta.vascaMetri} m</div>
              </div>
            </div>

            {/* CTA bordo vasca — stile mockup */}
            <button type="button" onClick={() => vai('vasca')} className="w-full h-14 rounded-xl bg-gradient-to-r from-primary-container to-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all">
              <Timer size={22} />
              <span>Entra a Bordo Vasca</span>
              <ArrowUpRight size={18} />
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setModalEsercizioOpen(true)} className="ds-btn-secondary !min-h-[44px] !px-3 !text-xs">
                <ClipboardList size={16} />
                <span>Manuale</span>
              </button>
              <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-secondary !min-h-[44px] !px-3 !text-xs">
                <Bot size={16} />
                <span>IA esercizi</span>
              </button>
              <button type="button" onClick={handleCopy} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
                {copiato ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiato ? 'Copiato' : 'Copia'}</span>
              </button>
              <button type="button" onClick={() => setModalParametriOpen(true)} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
                <SlidersHorizontal size={16} />
                <span>Parametri</span>
              </button>
              <button type="button" onClick={() => vai('altro', 'dati', 'registro')} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
                <Users size={16} />
                <span>Registro</span>
              </button>
            </div>

            {schedaSalvata && (
              <button
                type="button"
                onClick={() => vai('altro', 'dati', 'schede')}
                className="w-full flex items-center justify-between gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-1.5 text-left hover:bg-primary/10 transition"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">Scheda salvata</span>
                  <span className="block truncate text-xs font-semibold text-on-surface" title={schedaSalvata.testo}>{schedaSalvata.testo}</span>
                </span>
                <ArrowUpRight size={16} className="text-primary shrink-0" />
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Statistiche rapide — stile mockup Stitch */}
          <section className="grid grid-cols-3 gap-1.5 shrink-0">
            <div className="flex flex-col p-2 rounded-xl bg-surface-container-lowest shadow-sm gap-0.5">
              <div className="flex items-center justify-between text-primary">
                <Users size={16} />
                <span className="font-label-caps text-label-caps text-secondary font-bold">{atleti.length}</span>
              </div>
              <span className="font-stat-timer-mobile text-stat-timer-mobile text-on-surface tracking-tight leading-none">
                {atleti.length}
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight">Atleti</span>
            </div>
            <div className="flex flex-col p-2 rounded-xl bg-surface-container-lowest shadow-sm gap-0.5">
              <div className="flex items-center justify-between text-secondary">
                <Gauge size={16} />
                <span className="font-label-caps text-label-caps text-on-surface-variant">{percVolumeSettimana}%</span>
              </div>
              <span className="font-stat-timer-mobile text-stat-timer-mobile text-on-surface tracking-tight leading-none">
                {volumeSvoltoSettimana >= 1000 ? `${(volumeSvoltoSettimana / 1000).toFixed(1).replace('.', ',')}k` : volumeSvoltoSettimana}
                <span className="text-headline-sm text-on-surface-variant font-normal"> m</span>
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight">Volume Sett.</span>
            </div>
            <div className="flex flex-col p-2 rounded-xl bg-surface-container-lowest shadow-sm gap-0.5">
              <div className="flex items-center justify-between text-tertiary-container">
                <Calendar size={16} />
                <span className="font-label-caps text-label-caps text-tertiary-container font-bold">{seduteSvolteSettimana.length}/{settimanaISO.length}</span>
              </div>
              <span className="font-stat-timer-mobile text-stat-timer-mobile text-on-surface tracking-tight leading-none">
                {seduteSvolteSettimana.length}
                <span className="text-headline-sm text-on-surface-variant font-normal">/{settimanaISO.length}</span>
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase leading-tight">Sedute</span>
            </div>
          </section>
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto content-start">
          {/* Card 1: Prossimo allenamento */}
          <section className="ds-card p-2.5 sm:p-3 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Calendar size={15} />
                <span>Prossima Seduta</span>
              </div>
              {prossimiParametri && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  {prossimiParametri.vascaMetri} m · {prossimiParametri.durataMin} min
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 flex flex-col justify-center my-1 space-y-1">
              <div className="font-headline font-bold text-sm sm:text-base text-on-surface truncate">
                {prossimoAllenamento ? `${prossimoAllenamento.dowNome} ${formattaData(prossimoAllenamento.data)}` : 'Nessuna seduta programmata'}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Focus: {prossimiCodici.join(' + ')}
                </span>
                <span className="text-on-surface-variant font-medium">
                  ~{prossimoVolume.toLocaleString('it-IT')} m stimati
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDataSchedaTarget(prossimoAllenamento ? prossimoAllenamento.data : oggi);
                  setModalIAOpen(true);
                }}
                disabled={!prossimoAllenamento}
                className="ds-btn-primary flex-1 !min-h-[36px] !py-1 !text-xs"
              >
                <Bot size={14} />
                <span>Prepara con IA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataSchedaTarget(prossimoAllenamento ? prossimoAllenamento.data : oggi);
                  setModalEsercizioOpen(true);
                }}
                disabled={!prossimoAllenamento}
                className="ds-btn-secondary flex-1 !min-h-[36px] !py-1 !text-xs"
              >
                <ClipboardList size={14} />
                <span>Manuale</span>
              </button>
            </div>
          </section>

          {/* Card 2: Cruscotto Settimanale */}
          <section className="ds-card p-2.5 sm:p-3 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <Gauge size={15} />
                <span>Carico Settimanale</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {microCorrente ? TIPO_MICROCICLO_LABEL[microCorrente.tipo] : 'Microciclo'}
              </span>
            </div>

            <div className="min-h-0 flex-1 flex flex-col justify-center my-1 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-headline font-bold text-sm text-on-surface">
                  {volumeSvoltoSettimana.toLocaleString('it-IT')} m
                  <span className="text-xs text-on-surface-variant font-normal"> / {volumeSettimana.toLocaleString('it-IT')} m</span>
                </span>
                <span className="font-bold text-primary">{percVolumeSettimana}%</span>
              </div>

              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percVolumeSettimana}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>{seduteSvolteSettimana.length} di {settimanaISO.length} sedute svolte</span>
                <span>{Math.max(0, settimanaISO.length - seduteSvolteSettimana.length)} rimanenti</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => vai('altro', 'piano')}
                className="ds-btn-ghost !min-h-[36px] !py-1 !text-xs w-full justify-between"
              >
                <span>Dettagli piano microciclo</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>

          {/* Card 3: Promemoria Calibrazione */}
          <section className="ds-card p-2.5 sm:p-3 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <Users size={15} />
                <span>Promemoria Calibrazione</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                atletiDaCalibrare.length > 0 ? 'bg-error-container text-error' : 'bg-success-container text-on-success-container'
              }`}>
                {atletiDaCalibrare.length > 0 ? `${atletiDaCalibrare.length} da calibrare` : 'Tutto aggiornato'}
              </span>
            </div>

            <div className="min-h-0 flex-1 flex flex-col justify-center my-1 space-y-1">
              {atletiDaCalibrare.length > 0 ? (
                <>
                  <div className="text-xs font-semibold text-on-surface">
                    Test o tempi assenti da oltre 45 giorni:
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">
                    {atletiDaCalibrare.slice(0, 3).map(a => `${a.cognome} ${a.nome[0]}.`).join(', ')}
                    {atletiDaCalibrare.length > 3 ? ` e altri ${atletiDaCalibrare.length - 3}` : ''}
                  </div>
                </>
              ) : (
                <div className="text-xs text-on-surface-variant">
                  Tutti gli atleti della squadra hanno tempi o calibrazioni recenti registrati.
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => vai('squadra')}
                className="ds-btn-secondary !min-h-[36px] !py-1 !text-xs w-full justify-between"
              >
                <span>Gestisci atleti e test</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>

          {/* Card 4: Countdown Gara */}
          <section className="ds-card p-2.5 sm:p-3 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tertiary">
                <Trophy size={15} />
                <span>Countdown Gare</span>
              </div>
              {prossimaGara && (
                <span className="font-headline font-bold text-xs text-tertiary">
                  {prossimaGara.diffDays === 0 ? 'OGGI' : `tra ${prossimaGara.diffDays} g`}
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 flex flex-col justify-center my-1 space-y-1">
              {prossimaGara ? (
                <>
                  <div className="font-headline font-bold text-xs sm:text-sm text-on-surface truncate" title={prossimaGara.nome}>
                    {prossimaGara.nome}
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">
                    {formattaData(prossimaGara.dal)} · {prossimaGara.luogo || 'Sede FINP'}
                  </div>
                  <div className="text-[11px] font-semibold text-primary">
                    {atletiAmmissibiliProssimaGara} su {atleti.length} atleti con gare ammissibili
                  </div>
                </>
              ) : (
                <div className="text-xs text-on-surface-variant">
                  Nessuna gara in programma nei prossimi mesi.
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => vai('altro', 'gare')}
                className="ds-btn-ghost !min-h-[36px] !py-1 !text-xs w-full justify-between"
              >
                <span>Consulta calendario gare</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
          </div>
        </div>
      )}

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

      <GeneraSchedaIAModal
        open={modalIAOpen}
        onClose={() => setModalIAOpen(false)}
        onSchedaGenerata={(testo: string) => {
          const customWorkouts = FINPStorage.getCustomWorkouts();
          const targetCodici = dataSchedaTarget === oggi ? propostaCodici : prossimiCodici;
          const newWorkout = {
            id: Date.now().toString(),
            data: formattaData(dataSchedaTarget),
            testo,
            creatoIl: new Date().toISOString(),
            atletaId: atletaSel?.id ?? null,
            metriTotali: 0,
            codici: targetCodici,
            fonte: 'ia' as const,
          };
          FINPStorage.saveCustomWorkouts([newWorkout, ...customWorkouts]);
          setRevisioneStorage(v => v + 1);
        }}
        data={dataSchedaTarget}
        atleta={atletaSel}
        fase={dataSchedaTarget === oggi ? (mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE') : (prossimoAllenamento?.micro ? (meso.find(me => me.id === prossimoAllenamento.micro?.mesocicloId)?.fase ?? 'PREPARAZIONE_GENERALE') : 'PREPARAZIONE_GENERALE')}
        tipoMicro={dataSchedaTarget === oggi ? (microCorrente?.tipo ?? 'CARICO') : (prossimoAllenamento?.micro?.tipo ?? 'CARICO')}
        parametri={dataSchedaTarget === oggi ? parametriSeduta : (prossimiParametri ?? parametriSeduta)}
        volumeSessione={dataSchedaTarget === oggi ? volumeSessione : (prossimoVolume || volumeSessione)}
        volumeSettimana={volumeSettimana}
        tempi={atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : []}
        codiciAllenamento={dataSchedaTarget === oggi ? propostaCodici : prossimiCodici}
      />

      {modalEsercizioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-2xl w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Scheda manuale ({formattaData(dataSchedaTarget)})</h3>
              <button type="button" onClick={() => setModalEsercizioOpen(false)} aria-label="Chiudi" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <EsercizioEditor
              onSalva={(testo: string, metriTotali: number) => {
                const customWorkouts = FINPStorage.getCustomWorkouts();
                const newWorkout = {
                  id: Date.now().toString(),
                  data: formattaData(dataSchedaTarget),
                  testo,
                  creatoIl: new Date().toISOString(),
                  atletaId: atletaSel?.id ?? null,
                  metriTotali,
                  fonte: 'manuale' as const,
                };
                FINPStorage.saveCustomWorkouts([newWorkout, ...customWorkouts]);
                setModalEsercizioOpen(false);
                setRevisioneStorage(v => v + 1);
              }}
              onAnnulla={() => setModalEsercizioOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
