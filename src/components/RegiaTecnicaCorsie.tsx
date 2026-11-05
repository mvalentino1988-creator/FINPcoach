import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
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
import { CodiceAllenamentoKey } from '../types';

export const RegiaTecnicaCorsie: React.FC = () => {
  const { atleti } = useApp();
  const [vascaAttiva, setVascaAttiva] = useState<'50m' | '25m'>('50m');
  const [ripartizioneAperta, setRipartizioneAperta] = useState(false);
  const [corsieAtleti, setCorsieAtleti] = useState<number[][]>(() =>
    Array.from({ length: 4 }, (_, laneIndex) =>
      atleti.filter((_, athleteIndex) => athleteIndex % 4 === laneIndex).map(atleta => atleta.id)
    )
  );

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
      ripartizione[codice] = (ripartizione[codice] ?? 0) + s.metriTotali;
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
              <button
                type="button"
                onClick={() => setVascaAttiva(v => (v === '50m' ? '25m' : '50m'))}
                className="ds-btn-secondary !min-h-[48px] !px-3.5 text-xs shrink-0 font-bold"
              >
                <Waves size={15} />
                <span>Vasca {vascaAttiva}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="ds-btn-primary !min-h-[48px] !px-3.5 text-xs shrink-0 font-bold"
              >
                <Printer size={15} />
                <span>Stampa</span>
              </button>
            </div>
          }
        />
      </div>

      <section className="shrink-0 ds-card p-3 space-y-1.5">
        <button
          type="button"
          onClick={() => setRipartizioneAperta(v => !v)}
          className="w-full flex items-center justify-between text-xs font-bold font-headline text-on-surface"
        >
          <span className="flex items-center gap-1.5 text-primary">
            <Activity size={15} /> Intensità della seduta
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">
              {sedutaOggi
                ? `Volume ${sedutaOggi.volume >= 1000 ? `${(sedutaOggi.volume / 1000).toFixed(1).replace('.', ',')} km` : `${sedutaOggi.volume} m`}`
                : 'Nessuna scheda oggi'}
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
      </section>

      {/* 4. BLOCCO PRINCIPALE: ASSEGNAZIONE CORSIE (CARD COMPATTE CON INDICATORE MEDICO) */}
      <section className="flex-1 min-h-0 ds-card p-3 space-y-2 flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">
              Assegnazione Corsie (Vasca {vascaAttiva})
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Modifica gli atleti direttamente durante la seduta.</p>
          </div>
          <span className="text-xs font-bold text-primary font-headline">{corsieAtleti.length} Corsie</span>
        </div>

        <div className="app-fixed-scroll flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 content-start gap-2 sm:gap-3 pr-0.5 pb-3 sm:pb-6">
          {corsieAtleti.map((atletaIds, laneIndex) => {
            const atletiCorsia = atletaIds
              .map(id => atleti.find(atleta => atleta.id === id))
              .filter((atleta): atleta is typeof atleti[number] => atleta !== undefined);
            return (
            <div
              key={laneIndex}
              className="p-2 sm:p-3 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between gap-2 sm:gap-3 min-w-0"
            >
              <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1.5 border-b border-outline-variant pb-1.5">
                <span className="w-7 h-7 rounded-xl bg-primary text-on-primary font-headline text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
                    C{laneIndex + 1}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-container text-primary font-mono truncate">Passo gara</span>
                </div>

                {atletiCorsia.length === 0 ? (
                  <div className="text-xs text-on-surface-variant italic py-2">Corsia libera</div>
                ) : (
                  <div className="space-y-1.5">
                    {atletiCorsia.map(ath => (
                      <div key={ath.id} className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center gap-1 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-on-surface truncate min-w-0 flex-1">
                              <Marquee text={`${ath.cognome} ${ath.nome}`} />
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary text-on-primary font-bold text-xs shrink-0 font-headline">
                              {ath.classeS != null ? `S${ath.classeS}` : 'S?'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => rimuoviAtleta(laneIndex, ath.id)}
                          aria-label={`Rimuovi ${ath.cognome} ${ath.nome} dalla corsia ${laneIndex + 1}`}
                          className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center shrink-0"
                        >
                          <Minus size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="block">
                  <span className="sr-only">Aggiungi atleta alla corsia {laneIndex + 1}</span>
                  <select
                    value=""
                    disabled={atletaIdsAssegnati.size >= atleti.length}
                    onChange={event => {
                      if (event.target.value) assegnaAtleta(laneIndex, Number(event.target.value));
                    }}
                    className="w-full min-h-[40px] bg-surface-container-lowest border border-outline-variant rounded-lg px-2 text-xs font-semibold text-on-surface disabled:opacity-60"
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

              <div className="text-xs text-on-surface-variant font-medium pt-1.5 border-t border-outline-variant truncate">
                {atletiCorsia.length > 0 ? `${atletiCorsia.length} atleti assegnati` : 'Pronta per assegnazione'}
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
