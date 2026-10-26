import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { FASE_MESOCICLO_LABEL, SchedaSeduta, TIPO_MICROCICLO_LABEL } from '../types';
import { formattaData, isBefore, parseData, todayISO } from '../domain/dateUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { BadgeCodice } from './BadgeCodice';
import { IndicatoreCodici } from './IndicatoreCodici';
import {
  Calendar,
  Check,
  Copy,
  Flame,
  HeartPulse,
  List,
  Sparkles,
  Timer,
  User,
  Users,
  Waves,
  Bot
} from 'lucide-react';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { calcolaVolumeSessione, SedutaSettimana } from '../domain/volumePrescritto';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';

export const SchedeVascaScreen: React.FC = () => {
  const {
    atleti,
    stagione,
    condizioni,
    assenze,
    meso,
    micro,
    tempi,
    log,
    impostazioni,
    impostaOverrideSeduta,
    rimuoviOverrideSeduta
  } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(null); // null = Tutta la Squadra
  const [dataTesto, setDataTesto] = useState<string>(formattaData(todayISO()));
  const [metriManual, setMetriManual] = useState<string>('1800');
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [copiato, setCopiato] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // La scheda smart e' una PROPOSTA: viene generata solo su richiesta esplicita
  // e non viene mai salvata in automatico.
  const [scheda, setScheda] = useState<SchedaSeduta | null>(null);
  const [schedaSalvata, setSchedaSalvata] = useState(false);

  const oggi = parseData(dataTesto) ?? todayISO();
  const atletaSel = atleti.find(a => a.id === atletaSelId) ?? null;

  const microCorrente = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? micro[0];
  const mesoCorrente = microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) : null;

  const tempiAtleta = useMemo(() => {
    return atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [];
  }, [atletaSel, tempi]);

  const logAtleta = useMemo(() => {
    return atletaSel ? log.filter(l => l.atletaId === atletaSel.id) : [];
  }, [atletaSel, log]);

  const condizioniAtleta = useMemo(() => {
    return atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id) : [];
  }, [atletaSel, condizioni]);

  const giorniAllenamento = impostazioni.giorni || [1, 2, 3, 4, 5];
  const parametriSeduta = useMemo(
    () => risolviParametriSeduta(oggi, impostazioni, stagione),
    [oggi, impostazioni, stagione]
  );
  const hasOverride = Boolean(impostazioni.overrideSedute?.[oggi]);
  const settimanaISO = useMemo(
    () => seduteSettimana(oggi, giorniAllenamento),
    [oggi, giorniAllenamento]
  );
  const settimanaSedute: SedutaSettimana[] = useMemo(
    () => settimanaISO.map((d) => ({ data: d, parametri: risolviParametriSeduta(d, impostazioni, stagione) })),
    [settimanaISO, impostazioni, stagione]
  );
  const volumeSettimanaAtleta = useMemo(() => {
    if (atletaSel) {
      if (microCorrente) {
        return VolumeIndividuale.settimana(
          microCorrente,
          atletaSel,
          assenze.filter(a => a.atletaId === atletaSel.id)
        ).metri;
      }
      return 1800 * Math.max(1, giorniAllenamento.length);
    }
    // Squadra: il volume settimanale puo' essere corretto a mano.
    const manuale = parseInt(metriManual, 10);
    if (!isNaN(manuale) && manuale > 0) {
      return Math.max(400, Math.min(30000, manuale));
    }
    return microCorrente?.volumeTargetMetri || 1800 * Math.max(1, giorniAllenamento.length);
  }, [atletaSel, microCorrente, assenze, giorniAllenamento, metriManual]);

  const volume = useMemo(() => {
    return calcolaVolumeSessione({
      micro: atletaSel ? microCorrente : null,
      atleta: atletaSel,
      assenze: atletaSel ? assenze.filter(a => a.atletaId === atletaSel.id) : [],
      condizioni: condizioniAtleta,
      tempi: tempiAtleta,
      logSedute: logAtleta,
      parametri: parametriSeduta,
      durateSettimana: settimanaSedute,
      volumeSettimanaFallback: volumeSettimanaAtleta,
    });
  }, [microCorrente, atletaSel, assenze, condizioniAtleta, tempiAtleta, logAtleta, parametriSeduta, settimanaSedute, volumeSettimanaAtleta]);

  const volumeSessione = volume.metriSessione;

  /** La proposta smart viene generata solo su richiesta esplicita dell'allenatore. */
  const generaProposta = () => {
    setSchedaSalvata(false);
    setScheda(
      GeneratoreSmartSeduta.genera(
        oggi,
        volumeSessione,
        mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
        microCorrente?.tipo ?? 'CARICO',
        atletaSel,
        condizioniAtleta,
        tempiAtleta,
        logAtleta,
        mesoCorrente,
        giorniAllenamento,
        parametriSeduta
      )
    );
  };

  /** Salvataggio esplicito della proposta (mai automatico). */
  const salvaProposta = () => {
    if (!scheda) return;
    const testo = [
      scheda.titolo,
      ...scheda.tratti.map(
        t => `${t.sezione}: ${t.ripetizioni} ${t.metri}m ${t.codice} ${t.descrizione}`
      ),
    ].join('\n');
    const metriTotali = ParserScheda.calcolaMetriDaTesto(testo);
    const nuovo = {
      id: Date.now().toString(),
      data: oggi,
      testo,
      creatoIl: new Date().toISOString(),
      atletaId: atletaSel?.id ?? null,
      metriTotali,
    };
    FINPStorage.saveCustomWorkouts([nuovo, ...FINPStorage.getCustomWorkouts()]);
    setSchedaSalvata(true);
  };

  /** Variazione vasca/durata per la data selezionata: override persistito. */
  const applicaVasca = (vasca: number) => {
    if (vasca === parametriSeduta.vascaMetri) return;
    impostaOverrideSeduta(oggi, { ...parametriSeduta, vascaMetri: vasca });
    setScheda(null);
  };

  const applicaDurata = (durata: number) => {
    if (durata === parametriSeduta.durataMin) return;
    impostaOverrideSeduta(oggi, { ...parametriSeduta, durataMin: durata });
    setScheda(null);
  };

  const resetParametriData = () => {
    rimuoviOverrideSeduta(oggi);
    setScheda(null);
  };

  const handleCopy = () => {
    if (!scheda) return;
    const lines: string[] = [];
    lines.push(`🏊‍♂️ ${scheda.titolo}`);
    if (scheda.data) lines.push(`📅 Data: ${formattaData(scheda.data)}`);
    lines.push(`📊 Volume Totale: ${scheda.volumeTotaleMetri} m`);
    lines.push(`🎯 Fase: ${FASE_MESOCICLO_LABEL[scheda.faseStagione]} (${TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})`);
    if (scheda.categoriaEta) lines.push(`👤 Categoria: ${scheda.categoriaEta}`);
    lines.push('');

    if (scheda.avvertenzeMediche.length > 0) {
      lines.push('⚠️ ADATTAMENTI MEDICI:');
      scheda.avvertenzeMediche.forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }

    lines.push('📋 SERIE D\'ALLENAMENTO BORDO VASCA:');
    scheda.tratti.forEach((t, i) => {
      lines.push(`${i + 1}. [${t.codice}] ${t.sezione} - ${t.ripetizioni} (${t.metri}m)`);
      lines.push(`   ${t.descrizione}`);
      if (t.ripartenza) lines.push(`   ⏱️ Ripartenza: ${t.ripartenza}`);
      if (t.notaSpecifica) lines.push(`   • Focus: ${t.notaSpecifica}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  if (!stagione || atleti.length === 0) {
    return (
      <div className="p-4 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2">
        <Waves size={36} className="mx-auto text-outline" />
        <h3 className="font-bold text-on-surface">Nessuna stagione o atleta configurato</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Per generare e visualizzare le schede di vasca, imposta prima una stagione nella scheda <strong>Piano</strong> e aggiungi almeno un atleta nella scheda <strong>Atleti</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Title & Info */}
      <div>
        <h2 className="text-base sm:ds-title flex items-center gap-2">
          <Waves size={18} className="text-primary-container shrink-0" />
          <span>Schede Bordo Vasca</span>
        </h2>
        <p className="hidden sm:block text-xs text-on-surface-variant mt-0.5">
          Generatore intelligente di sedute basato sulla fase agonistica del piano, età, patologie ed andature con ripartenze a 5 secondi.
        </p>
      </div>

      {/* Configuration bar */}
      <div className="p-3 ds-card shadow-card space-y-2.5">
        {/* Recipient Chips */}
        <div>
          <label className="block text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1">
            Destinatario
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAtletaSelId(null)}
              className={`inline-flex items-center gap-1 px-2.5 h-10 rounded-lg text-[11px] font-bold transition ${
                atletaSelId === null
                  ? 'bg-primary-container text-on-primary shadow-card'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Users size={13} />
              <span>Squadra</span>
            </button>

            {atleti.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAtletaSelId(a.id)}
                className={`inline-flex items-center gap-1 px-2.5 h-10 rounded-lg text-[11px] font-semibold transition ${
                  atletaSelId === a.id
                    ? 'bg-primary-container text-on-primary font-bold shadow-card'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <User size={13} />
                <span>{a.cognome} {a.nome}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date and Target Distance — 4 campi: 1 col su telefono, 2 su tablet, 4 su desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-200/70">
          <div>
            <label className="block font-semibold text-on-surface mb-0.5 text-[10px] uppercase tracking-wide">Data</label>
            <input
              type="text"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
              className="w-full px-2 h-10 border border-outline-variant rounded-lg font-medium text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-on-surface mb-0.5 text-[10px] uppercase tracking-wide">Vasca / Durata</label>
            <div className="flex items-center gap-1.5 px-2 h-10 rounded-lg bg-surface-container-low border border-slate-200/70">
              <Waves size={14} className="text-primary shrink-0" />
              <span className="text-xs font-bold">{parametriSeduta.vascaMetri}m</span>
              <span className="text-xs text-on-surface-variant">· {parametriSeduta.durataMin}'</span>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-on-surface mb-1">Volume seduta</label>
            <div className="flex items-center gap-1.5 px-2 h-10 rounded-lg bg-surface-container-low border border-slate-200/70">
              <Timer size={14} className="text-primary shrink-0" />
              <span className="text-xs font-bold">{volumeSessione} m</span>
              <span className="text-[10px] text-on-surface-variant truncate">/ {volumeSettimanaAtleta} m</span>
            </div>
            {volume.note.length > 0 && (
              <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">{volume.note[0]}</p>
            )}
          </div>
          <div>
            <label className="block font-semibold text-on-surface mb-0.5 text-[10px] uppercase tracking-wide truncate">
              {atletaSel ? 'Volume sett. atleta' : 'Volume sett. squadra'}
            </label>
            {atletaSel ? (
              <div className="px-2 h-10 bg-surface-container-low border border-slate-200/70 rounded-lg font-bold text-primary-container text-xs flex items-center">
                {volumeSettimanaAtleta} m
              </div>
            ) : (
              <input
                type="number"
                step="50"
                value={metriManual}
                onChange={e => {
                  setMetriManual(e.target.value);
                  setScheda(null);
                }}
                className="w-full px-2 h-10 border border-outline-variant rounded-lg font-bold text-primary-container text-xs"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          <button type="button" onClick={generaProposta} className="ds-btn-ghost !min-h-[40px] !px-3 text-xs">
            <Sparkles size={15} />
            <span>Genera proposta</span>
          </button>
          <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-primary !min-h-[40px] !px-3 text-xs">
            <Bot size={15} />
            <span>Genera con IA</span>
          </button>
        </div>

        {/* Vasca & Durata Giornaliera (override persistito sulla data) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs">
          <div>
            <label className="block font-semibold text-on-surface mb-0.5 text-[10px] uppercase tracking-wide">Vasca impianto</label>
            <div className="flex gap-1.5">
              {[25, 50].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => applicaVasca(v)}
                  className={`flex-1 h-10 rounded-lg font-bold text-[11px] transition border ${
                    parametriSeduta.vascaMetri === v
                      ? 'bg-primary-container text-on-primary border-primary-container shadow-card'
                      : 'bg-surface-container-low text-on-surface border-slate-200/70 hover:bg-surface-container'
                  }`}
                >
                  {v === 50 ? 'Vasca 50m' : 'Vasca 25m'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-on-surface mb-0.5 text-[10px] uppercase tracking-wide">Durata target</label>
            <div className="flex gap-1.5">
              {[60, 90, 120].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => applicaDurata(d)}
                  className={`flex-1 h-10 rounded-lg font-bold text-[11px] transition border ${
                    parametriSeduta.durataMin === d
                      ? 'bg-primary-container text-on-primary border-primary-container shadow-card'
                      : 'bg-surface-container-low text-on-surface border-slate-200/70 hover:bg-surface-container'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasOverride && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-tertiary-fixed-dim bg-surface-container-low p-2 text-[11px] font-medium text-on-surface-variant">
            <span>
              Vasca/durata personalizzate per {formattaData(oggi)} (override locale, ricalibra gli altri giorni della settimana).
            </span>
            <button type="button" onClick={resetParametriData} className="ds-btn-ghost !py-1 !px-2 shrink-0">
              <Check size={14} />
              <span>Ripristina piano</span>
            </button>
          </div>
        )}
      </div>

      {/* Visualizzatore Scheda Vasca */}
      {!scheda ? (
        <div className="p-4 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2">
          <List size={36} className="mx-auto text-outline" />
          <h3 className="font-bold text-on-surface">Nessuna scheda generata</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Le schede non vengono create in automatico. Genera una proposta con i parametri della data selezionata,
            oppure usa l'IA esterna. La scheda viene salvata solo con un'azione esplicita.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button type="button" onClick={generaProposta} className="ds-btn-primary">
              <Sparkles size={16} />
              <span>Genera proposta</span>
            </button>
            <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-ghost">
              <Bot size={16} />
              <span>Genera con IA</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="ds-card p-3 sm:p-5 shadow-card space-y-3">
        {/* Intestazione */}
        <div className="p-3 bg-surface-container-low/70 border border-primary-fixed-dim rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
              <h3 className="font-bold text-on-surface text-lg sm:text-xl">
                {scheda.titolo}
              </h3>
            </div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">
              Volume Totale: <strong className="text-primary-container text-sm font-bold">{scheda.volumeTotaleMetri} m</strong> · Fase:{' '}
              {FASE_MESOCICLO_LABEL[scheda.faseStagione]} ({TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})
              {scheda.categoriaEta && ` · Categoria: ${scheda.categoriaEta}`}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salvaProposta}
              className="self-start sm:self-center inline-flex items-center gap-2 px-3 h-10 bg-secondary-container hover:bg-secondary text-on-secondary-container rounded-xl text-xs font-bold transition shadow-card"
            >
              <Check size={16} />
              <span>{schedaSalvata ? 'Salvata' : 'Salva scheda'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="self-start sm:self-center inline-flex items-center gap-2 px-3 h-10 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition"
            >
              {showDetails ? 'Semplifica' : 'Dettagli'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="self-start sm:self-center inline-flex items-center gap-2 px-3 h-10 bg-primary-container hover:bg-primary text-on-primary rounded-xl text-xs font-bold transition shadow-card"
            >
              {copiato ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              <span>{copiato ? 'Copiato!' : 'Copia'}</span>
            </button>
          </div>
        </div>

        {/* Medical Alerts - Always Visible */}
        {scheda.avvertenzeMediche.length > 0 && (
          <div className="p-3.5 bg-error-container border border-error/40 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-on-error-container font-bold uppercase tracking-wider">
              <HeartPulse size={15} className="text-error" />
              <span>⚠️ Adattamenti Medici</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-on-error-container font-medium">
              {scheda.avvertenzeMediche.map((avv, i) => (
                <li key={i}>{avv}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Content - Collapsible */}
        {showDetails && (
          <>
            {scheda.adattamentiEta.length > 0 && (
              <div className="p-3.5 bg-surface-container-low border border-outline-variant rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-on-surface font-bold uppercase tracking-wider">
                  <Sparkles size={15} className="text-secondary" />
                  <span>Modifiche Fisiologiche / Età</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-on-surface font-medium">
                  {scheda.adattamentiEta.map((ad, i) => (
                    <li key={i}>{ad}</li>
                  ))}
                </ul>
              </div>
            )}

            {scheda.noteCalibrazione.length > 0 && (
              <div className="p-3.5 bg-surface-container-low border border-tertiary-fixed-dim rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-on-tertiary-fixed font-bold uppercase tracking-wider">
                  <Timer size={15} className="text-tertiary-container" />
                  <span>Calibrazione sui Tempi</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-on-tertiary-fixed font-medium">
                  {scheda.noteCalibrazione.map((nota, i) => (
                    <li key={i}>{nota}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Energy Zones Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-200/70">
              <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={15} className="text-primary-container" />
                <span>Zone Energetiche della Seduta (A1 – D)</span>
              </h4>
              <IndicatoreCodici
                ripartizione={scheda.ripartizioneCodici}
                volumeTotale={scheda.volumeTotaleMetri}
              />
            </div>
          </>
        )}

        {/* Detailed Sets - Always Visible but Simplified */}
        <div className="space-y-3 pt-2 border-t border-slate-200/70">
          <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-1.5">
            <List size={15} className="text-primary-container" />
            <span>Serie per Bordo Vasca</span>
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2.5">
            {scheda.tratti.map((tratto, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200/70 bg-surface-container-low/50 hover:bg-surface-container-low transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-on-surface text-sm">
                    {idx + 1}. {tratto.sezione}
                  </span>
                  <BadgeCodice codice={tratto.codice} />
                </div>

                <div className="text-primary-container font-bold text-sm">
                  {tratto.ripetizioni} · <span className="text-on-surface-variant font-semibold">{tratto.metri} m</span>
                </div>

                {showDetails && (
                  <p className="text-xs text-on-surface-variant leading-relaxed">{tratto.descrizione}</p>
                )}

                {tratto.ripartenza && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-fixed bg-surface-container-low px-2 py-0.5 rounded-md border border-tertiary-fixed-dim">
                    <span>⏱️ Ripartenza:</span>
                    <span>{tratto.ripartenza}</span>
                  </div>
                )}

                {showDetails && tratto.notaSpecifica && (
                  <div className="text-[11px] text-on-surface-variant font-medium italic">
                    • Focus: {tratto.notaSpecifica}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      <GeneraSchedaIAModal
        open={modalIAOpen}
        onClose={() => setModalIAOpen(false)}
        onSchedaGenerata={(testo) => {
          const metriTotali = ParserScheda.calcolaMetriDaTesto(testo);
          const newWorkout = {
            id: Date.now().toString(),
            data: oggi,
            testo,
            creatoIl: new Date().toISOString(),
            atletaId: atletaSel?.id ?? null,
            metriTotali,
          };
          const updated = [newWorkout, ...FINPStorage.getCustomWorkouts()];
          FINPStorage.saveCustomWorkouts(updated);
        }}
        data={oggi}
        atleta={atletaSel ?? null}
        fase={mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA'}
        tipoMicro={microCorrente?.tipo ?? 'CARICO'}
        parametri={parametriSeduta}
        volumeSessione={volumeSessione}
        volumeSettimana={volumeSettimanaAtleta}
        condizioni={atletaSel ? condizioni.filter((c) => c.atletaId === atletaSel.id && c.attiva) : []}
        tempi={atletaSel ? tempi.filter((t) => t.atletaId === atletaSel.id) : []}
        note={volume.note}
      />
    </div>
  );
};
