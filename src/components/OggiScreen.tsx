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
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  ClipboardList,
  Clock,
  Coffee,
  Copy,
  SlidersHorizontal,
  Sparkles,
  Users,
  Waves,
  X,
  Zap,
  MapPin,
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
      <section className="shrink-0 ds-card p-3 flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${status === 'training' ? 'bg-primary/10 text-primary' : status === 'race' ? 'bg-tertiary/10 text-tertiary' : status === 'closed' ? 'bg-error-container text-error' : 'bg-surface-container text-on-surface-variant'}`}>
          <StatusIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant leading-snug"
            title={`${dowNome} ${formattaData(oggi)} · ${macroCorrente?.nome ?? stagione?.nome ?? ''}${microCorrente ? ` · ${TIPO_MICROCICLO_LABEL[microCorrente.tipo]}` : ''}`}>
            {dowNome} {formattaData(oggi)} · {macroCorrente?.nome ?? stagione?.nome ?? ''}
            {microCorrente ? ` · ${TIPO_MICROCICLO_LABEL[microCorrente.tipo]}` : ''}
          </div>
          <div className="font-headline font-bold text-on-surface truncate" title={statusLabel}>
            {statusLabel}
            {isGiornoAllenamento && (microCorrente?.luogo || microCorrente?.inizioHHMM) ? (
              <>
                {' · '}
                {microCorrente.luogo || ''}
                {microCorrente.inizioHHMM && microCorrente.fineHHMM && ` ${microCorrente.inizioHHMM}-${microCorrente.fineHHMM}`}
              </>
            ) : isGiornoAllenamento ? (
              ` · ${volumeSessione >= 1000 ? `${(volumeSessione / 1000).toFixed(1).replace('.', ',')} km` : `${volumeSessione} m`}`
            ) : ''}
          </div>
        </div>
        {prossimaGara && (
          <div className="text-right shrink-0 min-w-0">
            <div className="text-[11px] uppercase font-bold text-on-surface-variant truncate">Prossima gara</div>
            <div className="font-headline font-bold text-tertiary text-sm">{prossimaGara.diffDays} g</div>
          </div>
        )}
      </section>

      {isGiornoAllenamento ? (
        <section className="ds-card p-3 sm:p-4 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {atletaSel ? (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary">Codici atleta</div>
                  <div className="font-headline font-bold text-on-surface truncate" title={`${atletaSel.cognome} ${atletaSel.nome}`}>{atletaSel.cognome} {atletaSel.nome}</div>
                </>
              ) : (
                <div className="font-headline font-bold text-on-surface">Codici comuni</div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant shrink-0">
              <Clock size={13} />
              <span>{parametriSeduta.durataMin} min · {parametriSeduta.vascaMetri} m</span>
            </div>
          </div>

          {(microCorrente?.luogo || microCorrente?.inizioHHMM) && (
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              <MapPin size={13} />
              <span>{microCorrente.luogo || ''}</span>
              {microCorrente.inizioHHMM && microCorrente.fineHHMM && (
                <>
                  <span>·</span>
                  <span>{microCorrente.inizioHHMM} - {microCorrente.fineHHMM}</span>
                </>
              )}
            </div>
          )}

          <CodiciSeduta codici={propostaCodici} compatto />
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-on-surface-variant">
            <Clock size={13} />
            <span>{parametriSeduta.durataMin} min · {parametriSeduta.vascaMetri} m</span>
          </div>

          {!atletaSel && dettaglioSquadra && dettaglioSquadra.varianti.length > 0 && (
            <div className="rounded-xl bg-surface-container-low border border-outline-variant p-2 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Varianti individuali</div>
              {dettaglioSquadra.varianti.map(v => (
                <div key={v.nome} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-on-surface">{v.nome}</span>
                  <span className="font-headline font-bold text-primary shrink-0">{v.codici.join(' + ')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-surface-container-low px-1 py-1">
              <div className="text-[11px] uppercase font-bold text-on-surface-variant">Volume</div>
              <div className="font-headline font-bold text-on-surface text-xs">{volumeSessione.toLocaleString('it-IT')} m</div>
            </div>
            <div className="rounded-lg bg-surface-container-low px-1 py-1">
              <div className="text-[11px] uppercase font-bold text-on-surface-variant">Durata</div>
              <div className="font-headline font-bold text-on-surface text-xs">{parametriSeduta.durataMin} min</div>
            </div>
            <div className="rounded-lg bg-surface-container-low px-1 py-1">
              <div className="text-[11px] uppercase font-bold text-on-surface-variant">Vasca</div>
              <div className="font-headline font-bold text-on-surface text-xs">{parametriSeduta.vascaMetri} m</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => vai('vasca')} className="ds-btn-primary !min-h-[44px] !px-3 !text-sm">
              <Waves size={16} />
              <span>Apri Vasca</span>
            </button>
            <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-secondary !min-h-[44px] !px-3 !text-sm">
              <Bot size={16} />
              <span>IA esercizi</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={handleCopy} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
              {copiato ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiato ? 'Copiato' : 'Copia'}</span>
            </button>
            <button type="button" onClick={() => setModalParametriOpen(true)} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
              <SlidersHorizontal size={16} />
              <span>Parametri</span>
            </button>
            <button type="button" onClick={() => setModalEsercizioOpen(true)} className="ds-btn-ghost !min-h-[44px] !px-3 !text-xs">
              <ClipboardList size={16} />
              <span>Manuale</span>
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
              className="w-full flex items-center justify-between gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-1.5 text-left hover:bg-primary/10 transition"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">Scheda salvata</span>
                <span className="block truncate text-xs font-semibold text-on-surface" title={schedaSalvata.testo}>{schedaSalvata.testo}</span>
              </span>
              <ArrowUpRight size={16} className="text-primary shrink-0" />
            </button>
          )}
        </section>
      ) : (
        <section className="ds-card p-4 text-center space-y-2">
          <Coffee size={24} className="mx-auto text-on-surface-variant" />
          <div>
            <div className="font-headline font-bold text-on-surface text-sm">Nessuna seduta oggi</div>
            <p className="text-xs text-on-surface-variant">
              {prossimoAllenamento ? `Prossimo: ${prossimoAllenamento.dowNome} ${formattaData(prossimoAllenamento.data)}.` : 'Controlla il piano stagionale.'}
            </p>
          </div>
          <button type="button" onClick={() => vai('altro', 'piano')} className="ds-btn-secondary !min-h-[40px] !px-3 !text-sm">
            <ArrowUpRight size={15} />
            <span>Vedi piano</span>
          </button>
        </section>
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

      {modalEsercizioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-2xl w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Scheda manuale</h3>
              <button type="button" onClick={() => setModalEsercizioOpen(false)} aria-label="Chiudi" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <EsercizioEditor
              onSalva={(testo: string, metriTotali: number) => {
                const customWorkouts = FINPStorage.getCustomWorkouts();
                const newWorkout = {
                  id: Date.now().toString(),
                  data: formattaData(oggi),
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
