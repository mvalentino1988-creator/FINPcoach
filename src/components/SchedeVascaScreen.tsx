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
          Generatore di focus in codici basato su fase agonistica, microciclo, età e parametri della seduta; gli esercizi dettagliati restano su richiesta IA.
        </p>
      </div>

      <div className="p-3 ds-card shadow-card space-y-3">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Parametri proposta">
          <button
            type="button"
            role="tab"
            id="tab-parametri-sessione"
            aria-controls="panel-parametri-sessione"
            aria-selected={tabParametri === 'sessione'}
            onClick={() => setTabParametri('sessione')}
            className={`min-h-[44px] rounded-xl px-2 text-xs font-bold font-headline transition flex items-center justify-center gap-1.5 ${
              tabParametri === 'sessione' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
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
            className={`min-h-[44px] rounded-xl px-2 text-xs font-bold font-headline transition flex items-center justify-center gap-1.5 ${
              tabParametri === 'destinatario' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
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
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
              Destinatario della proposta
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => selezionaAtleta(null)}
                className={`inline-flex items-center gap-1 px-3 min-h-[48px] rounded-lg text-xs font-bold transition ${
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
                  onClick={() => selezionaAtleta(a.id)}
                  className={`inline-flex items-center gap-1 px-3 min-h-[48px] rounded-lg text-xs font-semibold transition ${
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
                <label htmlFor="data-seduta" className="block font-semibold text-on-surface-variant mb-1 text-xs uppercase tracking-wide">Data</label>
                <input
                  id="data-seduta"
                  type="text"
                  value={dataTesto}
                  onChange={event => {
                    setDataTesto(event.target.value);
                    setScheda(null);
                    setSchedaSalvata(false);
                  }}
                  className="w-full px-3 min-h-[44px] border border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1 text-xs uppercase tracking-wide">Vasca impianto</label>
                <div className="flex gap-1.5">
                  {[25, 50].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => applicaVasca(v)}
                      className={`flex-1 min-h-[44px] rounded-lg font-bold text-xs transition border ${
                        parametriSeduta.vascaMetri === v
                          ? 'bg-primary-container text-on-primary border-primary-container shadow-card'
                          : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
                      }`}
                    >
                      {v}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="durata-target" className="block font-semibold text-on-surface-variant mb-1 text-xs uppercase tracking-wide">Durata target (minuti)</label>
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
                  className="w-full px-3 min-h-[44px] border border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg font-bold text-xs"
                />
              </div>

              <div>
                <label htmlFor="volume-seduta" className="block font-semibold text-on-surface-variant mb-1 text-xs uppercase tracking-wide">Volume seduta</label>
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
                  className="w-full px-3 min-h-[44px] border border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg font-bold text-xs"
                />
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {volumeManuale === null
                    ? `Consigliati ${volumeSessione} m · lascia vuoto per usare il valore suggerito`
                    : `Consigliati ${volumeSessione} m · proposta personalizzata ${volumeManuale} m`}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1 text-xs uppercase tracking-wide">
                  {atletaSel ? 'Volume settimanale atleta' : 'Volume settimanale squadra'}
                </label>
                {atletaSel ? (
                  <div className="px-3 min-h-[44px] bg-surface-container-low border border-outline-variant rounded-lg font-bold text-primary-container text-xs flex items-center">
                    {volumeSettimanaAtleta} m
                  </div>
                ) : (
                  <input
                    type="number"
                    min={400}
                    max={30000}
                    step={50}
                    value={metriManual}
                    onChange={event => {
                      setMetriManual(event.target.value);
                      setScheda(null);
                      setSchedaSalvata(false);
                    }}
                    className="w-full px-3 min-h-[44px] border border-outline-variant bg-surface-container-lowest rounded-lg font-bold text-on-surface text-xs"
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-tertiary-fixed-dim bg-surface-container-low p-3 text-xs font-medium text-on-surface-variant">
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
        <div className="p-4 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2">
          <Waves size={36} className="mx-auto text-outline" />
          <h3 className="font-bold text-on-surface">Nessun focus selezionato</h3>
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
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {atletaSel ? `${atletaSel.nome} ${atletaSel.cognome}` : 'Squadra'}
              </span>
              <p className="mt-1 text-sm text-on-surface-variant">
                {formattaData(scheda.data)} · {scheda.volume.toLocaleString('it-IT')} m · {scheda.fase.replaceAll('_', ' ').toLowerCase()}
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
