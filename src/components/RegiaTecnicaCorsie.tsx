import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Printer,
  Sliders,
  Waves
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Marquee } from './Marquee';
import { IndicatoreCodici } from './IndicatoreCodici';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { formattaData, todayISO } from '../domain/dateUtils';
import { formattaTempo } from '../domain/tempoUtils';
import {
  etichettaTipoLavoro,
  passoMedioCorsia,
  profiloCorsiaAtleta,
  suggerisciComposizioneCorsie,
  tipoPrevalenteCorsia,
  type TipoLavoroCorsia,
} from '../domain/composizioneCorsie';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { CodiceAllenamentoKey } from '../types';

const FOCUS_TIPO: Record<TipoLavoroCorsia, string> = {
  V: 'velocità e reattività',
  M: 'soglia e VO2',
  F: 'fondo e tecnica',
  N: 'lavoro da definire',
};

const CODICI_VALIDI = new Set<CodiceAllenamentoKey>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D']);

// Accenti per corsia (barra laterale + chip numero), stile mockup Stitch
const LANE_ACCENTS = [
  { bar: 'bg-primary', chip: 'bg-primary text-on-primary' },
  { bar: 'bg-secondary', chip: 'bg-secondary text-on-secondary' },
  { bar: 'bg-tertiary-container', chip: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { bar: 'bg-primary-container', chip: 'bg-primary-container text-on-primary' },
];

const initialsOf = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const RegiaTecnicaCorsie: React.FC = () => {
  const { atleti, tempi, condizioni, micro, meso } = useApp();
  const [vascaAttiva, setVascaAttiva] = useState<'50m' | '25m'>('50m');
  const [ripartizioneAperta, setRipartizioneAperta] = useState(false);
  const [corsieAtleti, setCorsieAtleti] = useState<number[][]>(() =>
    Array.from({ length: 4 }, (_, laneIndex) =>
      atleti.filter((_, athleteIndex) => athleteIndex % 4 === laneIndex).map(atleta => atleta.id)
    )
  );

  const profiliCorsia = useMemo(
    () => new Map(atleti.map(a => [a.id, profiloCorsiaAtleta(a, tempi)])),
    [atleti, tempi]
  );

  const microCorrente = useMemo(
    () => micro.find(m => m.inizio <= todayISO() && m.fine >= todayISO()) ?? micro[0] ?? null,
    [micro]
  );
  const mesoCorrente = useMemo(
    () => (microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) ?? null : null),
    [meso, microCorrente]
  );
  const codiciFocus = useMemo(
    () => generaCodiciSeduta({
      fase: mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE',
      tipoMicro: microCorrente?.tipo ?? 'CARICO',
      condizioni: condizioni.filter(c => c.attiva),
    }).codici,
    [mesoCorrente, microCorrente, condizioni]
  );

  const suggerisci = () => {
    setCorsieAtleti(suggerisciComposizioneCorsie(atleti, tempi));
  };
  const azzera = () => {
    setCorsieAtleti(Array.from({ length: 4 }, () => []));
  };

  const sedutaOggi = useMemo(() => {
    const oggi = todayISO();
    const dataIt = formattaData(oggi);
    const workout = FINPStorage.getCustomWorkouts().find(
      w => w.data === dataIt || w.data === oggi
    );
    if (!workout) return null;
    const serie = ParserScheda.parseSerie(workout.testo);
    const volume = workout.metriTotali || ParserScheda.calcolaMetriDaTesto(workout.testo);
    const ripartizione: Partial<Record<CodiceAllenamentoKey, number>> = {};
    for (const s of serie) {
      const codice = s.codice as CodiceAllenamentoKey;
      if (!CODICI_VALIDI.has(codice)) continue;
      ripartizione[codice] = (ripartizione[codice] ?? 0) + s.metriTotali;
    }

    const codiciStrutturati = (workout.codici ?? []).filter((c): c is CodiceAllenamentoKey => CODICI_VALIDI.has(c as CodiceAllenamentoKey));
    if (serie.length === 0 && codiciStrutturati.length > 0 && volume > 0) {
      const quota = Math.round(volume / codiciStrutturati.length);
      for (const codice of codiciStrutturati) ripartizione[codice] = quota;
    }
    return { volume, ripartizione };
  }, []);

  const atletaIdsAssegnati = new Set(corsieAtleti.flat());
  const assegnaAtleta = (laneIndex: number, atletaId: number) => {
    setCorsieAtleti(current => current.map((ids, index) =>
      index === laneIndex && !current.flat().includes(atletaId) ? [...ids, atletaId] : ids
    ));
  };
  const rimuoviAtleta = (laneIndex: number, atletaId: number) => {
    setCorsieAtleti(current => current.map((ids, index) =>
      index === laneIndex ? ids.filter(id => id !== atletaId) : ids
    ));
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
      {/* Intestazione pagina */}
      <div className="shrink-0">
        <PageHeader
          label="Pianificatore"
          title={`Regia Tecnica · Vasca ${vascaAttiva}`}
          icon={<Sliders size={13} />}
          meta="Assegnazione live delle corsie e intensità della seduta"
          right={
            <div className="flex items-center gap-1.5">
              <div className="flex items-center p-0.5 rounded-lg bg-surface-container">
                {(['50m', '25m'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVascaAttiva(v)}
                    aria-pressed={vascaAttiva === v}
                    className={`px-3 py-1.5 rounded-md font-label-caps text-label-caps transition ${
                      vascaAttiva === v
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const bridge = (window as unknown as { AndroidBridge?: { printPage?: () => void } }).AndroidBridge;
                  if (bridge?.printPage) bridge.printPage();
                  else window.print();
                }}
                className="flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg bg-primary-container text-on-primary font-headline-sm text-[13px] font-bold shadow-sm active:scale-[0.98] transition-transform shrink-0"
              >
                <Printer size={15} />
                <span>Stampa</span>
              </button>
            </div>
          }
        />
      </div>

      <section className="shrink-0 rounded-xl bg-surface-container-low px-3.5 py-2.5 shadow-sm border border-outline-variant/30 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setRipartizioneAperta(v => !v)}
          className="w-full flex items-center justify-between gap-2"
          aria-expanded={ripartizioneAperta}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Waves size={16} className="text-primary shrink-0" />
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">Intensità della seduta</span>
            <span className="hidden sm:inline font-label-caps text-[9px] uppercase text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
              {sedutaOggi
                ? `Volume ${sedutaOggi.volume >= 1000 ? `${(sedutaOggi.volume / 1000).toFixed(1).replace('.', ',')} km` : `${sedutaOggi.volume} m`}`
                : 'Nessuna scheda oggi'}
            </span>
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="sm:hidden text-xs text-on-surface-variant font-medium">
              {sedutaOggi
                ? `Vol. ${sedutaOggi.volume >= 1000 ? `${(sedutaOggi.volume / 1000).toFixed(1).replace('.', ',')} km` : `${sedutaOggi.volume} m`}`
                : 'Nessuna scheda'}
            </span>
            {ripartizioneAperta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {sedutaOggi && sedutaOggi.volume > 0 && (
          <IndicatoreCodici
            ripartizione={sedutaOggi.ripartizione}
            volumeTotale={sedutaOggi.volume}
            dettaglio={ripartizioneAperta}
          />
        )}

        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-1.5">
          <span className="font-label-caps text-[9px] font-bold uppercase tracking-wider text-primary">Focus codici</span>
          <span className="font-headline-sm text-headline-sm text-primary font-bold">{codiciFocus.join(' + ')}</span>
        </div>
      </section>

      {/* BLOCCO PRINCIPALE: ASSEGNAZIONE CORSIE — griglia lane-card stile mockup */}
      <section className="flex-1 min-h-0 rounded-xl bg-surface-container-lowest shadow-sm p-3 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-surface-container-highest/60">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders size={16} className="text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold truncate">
                Monitor Corsie · Vasca {vascaAttiva}
              </h3>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider truncate">
                Assegnazione live degli atleti alle corsie
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-[9px] font-bold uppercase">
              {atletaIdsAssegnati.size} assegnati
            </span>
            <button
              type="button"
              onClick={azzera}
              className="h-8 px-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-label-caps text-[10px] font-bold uppercase flex items-center gap-1 transition-colors"
              title="Svuota tutte le corsie"
              aria-label="Svuota tutte le corsie"
            >
              <Minus size={13} />
              <span className="hidden sm:inline">Svuota</span>
            </button>
            <button
              type="button"
              onClick={suggerisci}
              className="h-8 px-2.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-fixed-dim font-label-caps text-[10px] font-bold uppercase flex items-center gap-1 transition-colors"
              title="Composizione suggerita da lavoro e passo 100m"
              aria-label="Composizione corsie suggerita"
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">Suggerisci</span>
            </button>
          </div>
        </div>

        <div className="app-fixed-scroll flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 content-start gap-3 pr-0.5 pb-3 sm:pb-6 pt-3">
          {corsieAtleti.map((atletaIds, laneIndex) => {
            const atletiCorsia = atletaIds
              .map(id => atleti.find(atleta => atleta.id === id))
              .filter((atleta): atleta is typeof atleti[number] => atleta !== undefined);
            const passoMedio = passoMedioCorsia(atletaIds, profiliCorsia);
            const tipoCorsia = tipoPrevalenteCorsia(atletaIds, profiliCorsia);
            const accent = LANE_ACCENTS[laneIndex % LANE_ACCENTS.length];
            return (
            <div
              key={laneIndex}
              className="rounded-xl bg-surface-container-lowest shadow-sm relative overflow-hidden flex flex-col min-w-0"
            >
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${accent.bar}`} />
              <div className="p-2.5 sm:p-3 pl-3.5 flex flex-col gap-2 min-h-0">
                {/* Intestazione corsia */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-7 h-7 rounded-lg ${accent.chip} font-headline-sm text-[13px] font-bold flex items-center justify-center shrink-0`}>
                      {laneIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                          Corsia {laneIndex + 1}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-primary font-label-caps text-[8.5px] font-bold uppercase tracking-wide shrink-0">
                          {atletiCorsia.length > 0 ? etichettaTipoLavoro(tipoCorsia) : 'Libera'}
                        </span>
                      </div>
                      <span className="font-label-caps text-[9px] text-on-surface-variant truncate block">
                        {atletiCorsia.length > 0
                          ? `${atletiCorsia.length} atleti · passo medio ${passoMedio != null ? `~${formattaTempo(passoMedio)}/100` : '—'}`
                          : 'Pronta per assegnazione'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Atleti in corsia */}
                {atletiCorsia.length === 0 ? (
                  <div className="rounded-xl bg-surface-container/50 border border-dashed border-outline-variant/60 p-3 flex items-center justify-center text-xs text-on-surface-variant italic">
                    Nessun atleta assegnato
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {atletiCorsia.map((ath, athleteIdx) => {
                      const profilo = profiliCorsia.get(ath.id);
                      return (
                      <div key={ath.id} className="p-1.5 rounded-xl bg-surface-container-low flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold flex items-center justify-center shrink-0">
                          {athleteIdx + 1}
                        </span>
                        <div className="w-9 h-9 rounded-full bg-surface-variant text-primary flex items-center justify-center font-headline-sm text-[12px] font-bold shrink-0">
                          {initialsOf(`${ath.cognome} ${ath.nome}`)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-body-bold text-[13px] text-on-surface truncate min-w-0 flex-1">
                              <Marquee text={`${ath.cognome} ${ath.nome}`} />
                            </span>
                          </div>
                          {profilo?.passo100mCentesimi != null ? (
                            <div className="font-label-caps text-[9px] text-on-surface-variant truncate">
                              ~{formattaTempo(profilo.passo100mCentesimi)}/100 · {etichettaTipoLavoro(profilo.tipoLavoro)}
                            </div>
                          ) : (
                            <div className="font-label-caps text-[9px] text-on-surface-variant truncate">
                              {etichettaTipoLavoro(profilo?.tipoLavoro ?? 'N')}
                            </div>
                          )}
                        </div>
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" title="Presente in vasca" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => rimuoviAtleta(laneIndex, ath.id)}
                          aria-label={`Rimuovi ${ath.cognome} ${ath.nome} dalla corsia ${laneIndex + 1}`}
                          className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error flex items-center justify-center shrink-0 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Slot libero stile mockup */}
                <label className="block mt-auto">
                  <span className="sr-only">Aggiungi atleta alla corsia {laneIndex + 1}</span>
                  <select
                    value=""
                    disabled={atletaIdsAssegnati.size >= atleti.length}
                    onChange={event => {
                      if (event.target.value) assegnaAtleta(laneIndex, Number(event.target.value));
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-primary font-label-caps text-[10px] font-bold uppercase tracking-wide disabled:opacity-60 disabled:text-on-surface-variant"
                  >
                    <option value="">
                      {atletaIdsAssegnati.size >= atleti.length ? 'Tutti assegnati' : '+ Aggiungi atleta'}
                    </option>
                    {atleti.filter(atleta => !atletaIdsAssegnati.has(atleta.id)).map(atleta => (
                      <option key={atleta.id} value={atleta.id}>{atleta.cognome} {atleta.nome}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Footer focus */}
              <div className="px-3.5 py-2 border-t border-surface-container-highest/60 flex items-center justify-between gap-2">
                <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wide truncate">
                  Focus: {FOCUS_TIPO[tipoCorsia]}
                </span>
                <span className="font-label-caps text-[9px] text-primary font-bold uppercase tracking-wide flex-shrink-0">
                  {etichettaTipoLavoro(tipoCorsia)}
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
