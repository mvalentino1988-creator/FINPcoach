import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../data/AppContext';
import { CodiceAllenamentoKey, FaseMesociclo, TipoMicrociclo } from '../types';
import { formattaData, isBefore, parseData, todayISO, yearsBetween } from '../domain/dateUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { CodiciSeduta } from './CodiciSeduta';
import {
  Calendar,
  Check,
  Copy,
  Sparkles,
  Timer,
  User,
  Users,
  Waves,
  Bot,
  Sliders,
  X
} from 'lucide-react';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { calcolaVolumeSessione, SedutaSettimana } from '../domain/volumePrescritto';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';

interface PropostaCodici {
  codici: CodiceAllenamentoKey[];
  data: string;
  volume: number;
  fase: FaseMesociclo;
  tipoMicro: TipoMicrociclo;
}

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
  const [scheda, setScheda] = useState<PropostaCodici | null>(null);
  const [schedaSalvata, setSchedaSalvata] = useState(false);
  const [tabParametri, setTabParametri] = useState<'sessione' | 'destinatario'>('sessione');
  const [durataInput, setDurataInput] = useState('90');
  const [volumeManuale, setVolumeManuale] = useState<number | null>(null);
  const [volumeInput, setVolumeInput] = useState('');

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
  useEffect(() => {
    setDurataInput(String(parametriSeduta.durataMin));
  }, [oggi, parametriSeduta.durataMin]);
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
  const volumeProposta = volumeManuale ?? volumeSessione;

  /** La proposta smart viene generata solo su richiesta esplicita dell'allenatore. */
  const generaProposta = () => {
    setSchedaSalvata(false);
    setScheda({
      codici: generaCodiciSeduta({
        fase: mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
        tipoMicro: microCorrente?.tipo ?? 'CARICO',
        etaAtleta: atletaSel?.dataNascita ? yearsBetween(atletaSel.dataNascita, oggi) : null,
        condizioni: atletaSel ? condizioniAtleta : condizioni.filter(c => c.attiva),
      }).codici,
      data: oggi,
      volume: volumeProposta,
      fase: mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
      tipoMicro: microCorrente?.tipo ?? 'CARICO',
    });
  };

  /** Salvataggio esplicito della proposta (mai automatico). */
  const salvaProposta = () => {
    if (!scheda) return;
    const testo = `Focus seduta: ${scheda.codici.join(' + ')}`;
    const nuovo = {
      id: Date.now().toString(),
      data: oggi,
      testo,
      creatoIl: new Date().toISOString(),
      atletaId: atletaSel?.id ?? null,
      metriTotali: scheda.volume,
      codici: scheda.codici,
      fonte: 'codici' as const,
    };
    FINPStorage.saveCustomWorkouts([nuovo, ...FINPStorage.getCustomWorkouts()]);
    setSchedaSalvata(true);
  };

  /** Variazione vasca/durata per la data selezionata: override persistito. */
  const applicaVasca = (vasca: number) => {
    if (vasca === parametriSeduta.vascaMetri) return;
    impostaOverrideSeduta(oggi, { ...parametriSeduta, vascaMetri: vasca });
    setScheda(null);
    setSchedaSalvata(false);
  };

  const applicaDurata = (durata: number) => {
    if (durata === parametriSeduta.durataMin) return;
    impostaOverrideSeduta(oggi, { ...parametriSeduta, durataMin: durata });
    setScheda(null);
    setSchedaSalvata(false);
  };

  const selezionaAtleta = (id: number | null) => {
    setAtletaSelId(id);
    setVolumeManuale(null);
    setVolumeInput('');
    setScheda(null);
    setSchedaSalvata(false);
  };

  const resetParametriData = () => {
    rimuoviOverrideSeduta(oggi);
    setScheda(null);
  };

  const handleCopy = () => {
    if (!scheda) return;
    const lines: string[] = [];
    lines.push(`📅 Data: ${formattaData(scheda.data)}`);
    lines.push(`🎯 Focus: ${scheda.codici.join(' + ')}`);
    lines.push(`📊 Volume obiettivo: ${scheda.volume} m`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiato(true);
      window.setTimeout(() => setCopiato(false), 2000);
    });
  };

  if (!stagione || atleti.length === 0) {
    return (
      <div className="p-6 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2.5">
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto">
          <Waves size={24} className="text-outline" />
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Nessuna stagione o atleta configurato</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Per generare e visualizzare le schede di vasca, imposta prima una stagione nella scheda <strong>Piano</strong> e aggiungi almeno un atleta nella scheda <strong>Atleti</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title & Info */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Schede Bordo Vasca</h2>
          <p className="font-label-caps text-label-caps text-on-surface-variant hidden sm:block">
            Focus in codici A1–D · fase, microciclo, età e parametri seduta
          </p>
        </div>
      </div>

      <div className="p-3 ds-card shadow-card space-y-3">
        {/* Segmented tabs stile Stitch */}
        <div className="grid grid-cols-2 gap-1 bg-surface-container-high/80 p-1 rounded-xl" role="tablist" aria-label="Parametri proposta">
          <button
            type="button"
            role="tab"
            id="tab-parametri-sessione"
            aria-controls="panel-parametri-sessione"
            aria-selected={tabParametri === 'sessione'}
            onClick={() => setTabParametri('sessione')}
            className={`min-h-[44px] rounded-lg px-2 text-xs font-bold font-headline-sm transition flex items-center justify-center gap-1.5 ${
              tabParametri === 'sessione' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            <Sliders size={15} /> Parametri sessione
          </button>
          <button
            type="button"
            role="tab"
            id="tab-parametri-destinatario"
            aria-controls="panel-parametri-destinatario"
            aria-selected={tabParametri === 'destinatario'}
            onClick={() => setTabParametri('destinatario')}
            className={`min-h-[44px] rounded-lg px-2 text-xs font-bold font-headline-sm transition flex items-center justify-center gap-1.5 ${
              tabParametri === 'destinatario' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            <User size={15} /> Parametri destinatario
          </button>
        </div>

        {tabParametri === 'destinatario' ? (
          <div
            id="panel-parametri-destinatario"
            role="tabpanel"
            aria-labelledby="tab-parametri-destinatario"
            className="space-y-2 pt-2 border-t border-outline-variant animate-fade-in"
          >
            <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Destinatario della proposta
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => selezionaAtleta(null)}
                className={`inline-flex items-center gap-1 px-3 min-h-[44px] rounded-full font-label-caps text-label-caps transition ${
                  atletaSelId === null
                    ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Users size={13} />
                <span>Squadra</span>
              </button>
              {atleti.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selezionaAtleta(a.id)}
                  className={`inline-flex items-center gap-1 px-3 min-h-[44px] rounded-full font-label-caps text-label-caps transition ${
                    atletaSelId === a.id
                      ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <User size={13} />
                  <span>{a.cognome} {a.nome}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant">
              {atletaSel
                ? `Il volume seduta per ${atletaSel.cognome} ${atletaSel.nome} viene consigliato in base al piano e resta modificabile.`
                : 'La proposta viene calcolata per tutta la squadra.'}
            </p>
          </div>
        ) : (
          <div
            id="panel-parametri-sessione"
            role="tabpanel"
            aria-labelledby="tab-parametri-sessione"
            className="space-y-3 pt-2 border-t border-outline-variant animate-fade-in"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="data-seduta" className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Data</label>
                <input
                  id="data-seduta"
                  type="text"
                  value={dataTesto}
                  onChange={event => {
                    setDataTesto(event.target.value);
                    setScheda(null);
                    setSchedaSalvata(false);
                  }}
                  className="ds-input !h-11 font-bold"
                />
              </div>

              <div>
                <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Vasca impianto</span>
                <div className="flex gap-1 bg-surface-container p-0.5 rounded-lg" role="group" aria-label="Vasca impianto">
                  {[25, 50].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => applicaVasca(v)}
                      aria-pressed={parametriSeduta.vascaMetri === v}
                      className={`flex-1 min-h-[40px] rounded-md font-label-caps text-label-caps transition ${
                        parametriSeduta.vascaMetri === v
                          ? 'bg-primary text-on-primary shadow-sm font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {v}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="durata-target" className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Durata target (min)</label>
                <input
                  id="durata-target"
                  type="number"
                  min={30}
                  max={210}
                  step={1}
                  value={durataInput}
                  onChange={event => {
                    const value = event.target.value;
                    setDurataInput(value);
                    const durata = Number(value);
                    if (value !== '' && Number.isInteger(durata) && durata >= 30 && durata <= 210) {
                      applicaDurata(durata);
                    }
                  }}
                  onBlur={() => {
                    const durata = Number(durataInput);
                    if (!Number.isInteger(durata) || durata < 30 || durata > 210) {
                      setDurataInput(String(parametriSeduta.durataMin));
                    } else {
                      applicaDurata(durata);
                    }
                  }}
                  className="ds-input !h-11 font-bold"
                />
              </div>

              <div>
                <label htmlFor="volume-seduta" className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Volume seduta</label>
                <input
                  id="volume-seduta"
                  type="number"
                  min={50}
                  max={20000}
                  step={50}
                  value={volumeInput}
                  placeholder={String(volumeSessione)}
                  onChange={event => {
                    const value = event.target.value;
                    setVolumeInput(value);
                    const volumeScelto = Number(value);
                    setVolumeManuale(
                      value !== '' && Number.isInteger(volumeScelto) && volumeScelto >= 50 && volumeScelto <= 20000
                        ? volumeScelto
                        : null
                    );
                    setScheda(null);
                    setSchedaSalvata(false);
                  }}
                  onBlur={() => {
                    if (volumeInput !== '' && volumeManuale === null) setVolumeInput('');
                  }}
                  className="ds-input !h-11 font-bold"
                />
                <p className="mt-1 font-label-caps text-[10px] text-on-surface-variant normal-case tracking-normal">
                  {volumeManuale === null
                    ? `Consigliati ${volumeSessione.toLocaleString('it-IT')} m`
                    : `Consigliati ${volumeSessione.toLocaleString('it-IT')} m · proposta ${volumeManuale.toLocaleString('it-IT')} m`}
                </p>
              </div>

              <div>
                <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">
                  {atletaSel ? 'Volume settimanale atleta' : 'Volume settimanale squadra'}
                </span>
                {atletaSel ? (
                  <div className="px-3 min-h-[44px] bg-surface-container-low border border-outline-variant/60 rounded-xl font-stat-timer-mobile text-[18px] text-primary-container flex items-center tabular-nums">
                    {volumeSettimanaAtleta.toLocaleString('it-IT')} <span className="font-label-caps text-[10px] ml-1">m</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min={400}
                    max={30000}
                    step={50}
                    value={metriManual}
                    aria-label="Volume settimanale squadra in metri"
                    onChange={event => {
                      setMetriManual(event.target.value);
                      setScheda(null);
                      setSchedaSalvata(false);
                    }}
                    className="ds-input !h-11 font-bold"
                  />
                )}
              </div>
            </div>

            {scheda && (
              <div className="flex flex-wrap justify-end gap-1.5">
                <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-primary !min-h-[44px] !px-3 text-xs">
                  <Bot size={15} />
                  <span>Chiedi esercizi all’IA</span>
                </button>
              </div>
            )}

            {hasOverride && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-tertiary-fixed-dim bg-tertiary-fixed/40 p-3 text-xs font-medium text-on-surface-variant">
                <span>
                  Vasca/durata personalizzate per {formattaData(oggi)} (override locale, ricalibra gli altri giorni della settimana).
                </span>
                <button type="button" onClick={resetParametriData} className="ds-btn-ghost !py-1 !px-3 shrink-0">
                  <Check size={14} />
                  <span>Ripristina piano</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visualizzatore Scheda Vasca */}
      {!scheda ? (
        <div className="p-6 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto">
            <Waves size={24} className="text-outline" />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Nessun focus selezionato</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            La proposta automatica mostra soltanto i codici di allenamento. Gli esercizi dettagliati vengono creati dall’IA solo su tua richiesta.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button type="button" onClick={generaProposta} className="ds-btn-primary">
              <Sparkles size={16} />
              <span>Proponi codici</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="ds-card p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="font-label-caps text-label-caps uppercase text-primary font-bold">
                {atletaSel ? `${atletaSel.nome} ${atletaSel.cognome}` : 'Squadra'}
              </span>
              <p className="mt-1 font-label-caps text-label-caps text-on-surface-variant">
                {formattaData(scheda.data)} · {scheda.fase.replaceAll('_', ' ').toLowerCase()}
              </p>
              <p className="font-stat-timer-mobile text-[28px] leading-none text-on-surface tabular-nums mt-1">
                {scheda.volume.toLocaleString('it-IT')} <span className="font-label-caps text-[11px] text-on-surface-variant">m</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={salvaProposta} className="ds-btn-secondary !min-h-[44px] !px-3 text-xs">
                <Check size={16} />
                <span>{schedaSalvata ? 'Salvata' : 'Salva focus'}</span>
              </button>
              <button type="button" onClick={handleCopy} className="ds-btn-ghost !min-h-[44px] !px-3 text-xs">
                {copiato ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiato ? 'Copiato' : 'Copia'}</span>
              </button>
              <button type="button" onClick={() => setScheda(null)} className="ds-btn-ghost !min-h-[44px] !px-3 text-xs">
                <X size={16} />
                <span>Chiudi</span>
              </button>
            </div>
          </div>
          <CodiciSeduta codici={scheda.codici} titolo="Focus della seduta" />
          <p className="text-sm text-on-surface-variant">
            Nessun esercizio viene creato automaticamente. Puoi chiedere all’IA esterna una scheda dettagliata basata su questi codici.
          </p>
          <button type="button" onClick={() => setModalIAOpen(true)} className="ds-btn-primary !min-h-[48px] justify-center">
            <Bot size={17} />
            <span>Chiedi esercizi all’IA</span>
          </button>
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
            codici: scheda?.codici ?? [],
            fonte: 'ia' as const,
          };
          const updated = [newWorkout, ...FINPStorage.getCustomWorkouts()];
          FINPStorage.saveCustomWorkouts(updated);
        }}
        data={oggi}
        atleta={atletaSel ?? null}
        fase={scheda?.fase ?? mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA'}
        tipoMicro={scheda?.tipoMicro ?? microCorrente?.tipo ?? 'CARICO'}
        parametri={parametriSeduta}
        volumeSessione={volumeProposta}
        volumeSettimana={volumeSettimanaAtleta}
        tempi={atletaSel ? tempi.filter((t) => t.atletaId === atletaSel.id) : []}
        codiciAllenamento={scheda?.codici ?? []}
      />
    </div>
  );
};
