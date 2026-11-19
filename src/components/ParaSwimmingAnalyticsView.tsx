import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../data/AppContext';
import { Stile } from '../types';
import { BiomechanicsEngine, LivelloGeografico } from '../domain/biomechanicsEngine';
import { HydrodynamicsEngine } from '../domain/hydrodynamicsEngine';
import { ParaSwimmingViewModel } from '../domain/paraSwimmingViewModel';
import { classeRecordPerStile, confrontoAtletaRecord, recordPerRiferimento, clusterRecord, LivelloRecord } from '../domain/recordBenchmark';
import { RecordService } from '../domain/recordService';
import { ParaSwimmingCanvasChart } from './ParaSwimmingCanvasChart';
import { HydrodynamicsChartsView } from './HydrodynamicsChartsView';
import { Sezione } from './Sezione';
import { Activity, Plus, RefreshCw, Flame, Award } from 'lucide-react';

export const ParaSwimmingAnalyticsView: React.FC = () => {
  const { atleti, tempi } = useApp();
  const metaRecord = RecordService.meta();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === atletaSelId) ?? atleti[0] ?? null;

  const [stile, setStile] = useState<Stile>('STILE_LIBERO');
  const [distanza, setDistanza] = useState<number>(100);
  const [livelloGeo, setLivelloGeo] = useState<LivelloGeografico>('Mondiale');

  const [tempoTesto, setTempoTesto] = useState<string>('');
  const [dataTesto, setDataTesto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kCoeffInput, setKCoeffInput] = useState<string>('0.42');

  const [syncStatus, setSyncStatus] = useState<{ refreshed: boolean; lastUpdateDate: string }>({
    refreshed: false,
    lastUpdateDate: ''
  });

  const [performances, setPerformances] = useState(() => ParaSwimmingViewModel.getPerformances());

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSyncStatus(ParaSwimmingViewModel.checkAndFetchMonthlyData());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const handleAddPerformance = (e: React.FormEvent) => {
    e.preventDefault();
    const tSec = parseFloat(tempoTesto);
    if (isNaN(tSec) || tSec <= 0) return;

    const classeS = atletaSel?.classeS ? `S${atletaSel.classeS}` : 'S9';
    ParaSwimmingViewModel.addPerformance(
      atletaSel?.id,
      dataTesto,
      classeS,
      stile,
      distanza,
      tSec
    );

    setPerformances(ParaSwimmingViewModel.getPerformances());
    setTempoTesto('');
  };

  const filteredPerformances = useMemo(() => {
    void performances; // forsa il ricalcolo dopo addPerformance
    return ParaSwimmingViewModel.getFilteredPerformances(atletaSel?.id ?? null, stile, distanza);
  }, [atletaSel, stile, distanza, performances]);

  // Cluster di record REALI (mai atleti inventati): solo classi con record disponibile.
  const recordCluster = useMemo(() => {
    const filtroClasse = atletaSel ? classeRecordPerStile(atletaSel, stile) : null;
    return clusterRecord(livelloGeo, stile, distanza, filtroClasse);
  }, [livelloGeo, stile, distanza, atletaSel]);

  const classeRecord = atletaSel ? classeRecordPerStile(atletaSel, stile) : null;

  const confrontoRecord = useMemo(() => {
    if (!atletaSel || !classeRecord) return [];
    return confrontoAtletaRecord(tempi, atletaSel.id, classeRecord, livelloGeo);
  }, [tempi, atletaSel, classeRecord, livelloGeo]);

  const kCoeffValore = (() => {
    const n = parseFloat(kCoeffInput);
    return isNaN(n) || n <= 0 ? 0.42 : n;
  })();

  const benchmarkHydro = useMemo(() => {
    if (!classeRecord) return [];
    return HydrodynamicsEngine.benchmarkRecord(livelloGeo, classeRecord, stile, distanza, kCoeffValore);
  }, [livelloGeo, classeRecord, stile, distanza, kCoeffValore]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="ds-title flex items-center gap-2">
          <Activity size={22} className="text-primary-container" />
          <span>Analisi Biomeccanica & Indice di Costo Energetico</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Indice di costo energetico C(v) = (220/v) + 75 v² — modello interno didattico, adimensionale e non validato — e confronto con i record reali ({livelloGeo}).
        </p>
      </div>

      <div className="ds-card p-3 sm:p-4 flex items-center justify-between gap-2 text-xs text-primary-container">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw size={15} className="shrink-0" />
          <span className="font-semibold truncate">Sincronizzazione Temporale Mensile: {syncStatus.lastUpdateDate}</span>
        </div>
        <span className="ds-chip-blue shrink-0">
          {syncStatus.refreshed ? 'Cluster Ricalcolati' : 'Allineato 30gg'}
        </span>
      </div>

      <div className="ds-card p-4 shadow-card space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div>
            <label htmlFor="para-atleta" className="ds-label block mb-1">Atleta</label>
            <select
              id="para-atleta"
              value={atletaSel?.id ?? ''}
              onChange={(e) => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
              className="w-full min-w-0 min-h-[44px] px-2 sm:px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              {atleti.map(a => (
                <option key={a.id} value={a.id}>{a.cognome} {a.nome} (S{a.classeS ?? '?'})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="para-stile" className="ds-label block mb-1">Stile</label>
            <select
              id="para-stile"
              value={stile}
              onChange={(e) => setStile(e.target.value as Stile)}
              className="w-full min-w-0 min-h-[44px] px-2 sm:px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value="STILE_LIBERO">Stile Libero</option>
              <option value="DORSO">Dorso</option>
              <option value="RANA">Rana</option>
              <option value="FARFALLA">Farfalla</option>
              <option value="MISTI">Misti</option>
            </select>
          </div>

          <div>
            <label htmlFor="para-distanza" className="ds-label block mb-1">Distanza Gara</label>
            <select
              id="para-distanza"
              value={distanza}
              onChange={(e) => setDistanza(Number(e.target.value))}
              className="w-full min-w-0 min-h-[44px] px-2 sm:px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value={50}>50m</option>
              <option value={100}>100m</option>
              <option value={200}>200m</option>
              <option value={400}>400m</option>
            </select>
          </div>

          <div>
            <label htmlFor="para-livello" className="ds-label block mb-1">Riferimento Record</label>
            <select
              id="para-livello"
              value={livelloGeo}
              onChange={(e) => setLivelloGeo(e.target.value as LivelloGeografico)}
              className="w-full min-w-0 min-h-[44px] px-2 sm:px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value="Mondiale">Record Mondiale</option>
              <option value="Europeo">Record Europeo</option>
              <option value="Italiano">Record Italiano</option>
            </select>
          </div>
        </div>
      </div>

      <ParaSwimmingCanvasChart
        athletePerformances={filteredPerformances}
        eliteClusters={recordCluster.map(p => ({
          classeS: p.classe,
          velocitaMedia: p.riferimento.velocitaMedia ?? 0,
          costoEnergetico: BiomechanicsEngine.calcolaCostoEnergetico(p.riferimento.velocitaMedia ?? 0),
          atletaNome: p.riferimento.detentore ?? undefined
        }))}
      />

      {/* Confronto atleta vs record reale per ogni evento con tempo registrato */}
      <Sezione
        titolo={`Confronto Atleta vs Record ${livelloGeo}`}
        icon={<Award size={16} className="text-tertiary-container" />}
        badge={confrontoRecord.length}
        storageKey="para_biomech_confronto"
        defaultAperto={true}
      >
        {metaRecord.aggiornato && (
          <p className="ds-label pb-2">
            Dataset record aggiornato: {metaRecord.aggiornato}. Snapshot: verifica sul sito ufficiale prima di decisioni sportive.
          </p>
        )}
        {!classeRecord ? (
          <p className="text-xs text-on-surface-variant py-2">Nessuna classe paralimpica associata all'atleta per {stile.replace('_', ' ')}.</p>
        ) : confrontoRecord.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-2 pt-1 text-xs">
            {confrontoRecord.map(c => (
              <div key={`${c.vascaMetri}|${c.stile}|${c.distanzaMetri}`} className="p-3 bg-surface-container-low/50 border border-outline-variant rounded-xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-headline-sm font-bold text-on-surface block truncate">
                    {c.evento} · {c.vascaMetri}m · {c.tempoAtletaFormattato}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    v = {c.velocitaMediaAtleta.toFixed(2)} m/s
                    {c.riferimento.disponibile && c.riferimento.velocitaMedia !== null && (
                      <> · record {c.riferimento.tempoFormattato} ({c.riferimento.velocitaMedia.toFixed(2)} m/s{c.riferimento.detentore ? `, ${c.riferimento.detentore}` : ''})</>
                    )}
                    {!c.riferimento.disponibile && ' · dato non disponibile'}
                  </span>
                </div>
                {c.confronto && (
                  <span className={`ds-chip-neutral shrink-0 tabular-nums ${c.confronto.migliore ? 'text-status-live' : ''}`}>
                    {c.confronto.percentuale.toFixed(1)}% del record
                    {c.confronto.deltaCentesimi !== 0 && ` · ${c.confronto.deltaCentesimi > 0 ? '+' : ''}${(c.confronto.deltaCentesimi / 100).toFixed(2)}s`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Sezione>

      {/* Hydrodynamics Force F(v) and Power P(t) Dark Mode Charts */}
      {(() => {
        const mainAth = {
          id: atletaSel ? atletaSel.id.toString() : 'main',
          nome: atletaSel ? `${atletaSel.cognome} ${atletaSel.nome}` : 'Atleta Principale',
          classe: classeRecord ?? 'S9',
          stile,
          distanza,
          kCoeff: kCoeffValore,
          velocitaMedia: filteredPerformances.length > 0 ? filteredPerformances[filteredPerformances.length - 1].velocitaMedia : 1.65,
          isMainAtleta: true
        };
        return (
          <div className="space-y-2">
            <div>
              <label htmlFor="para-kcoeff" className="ds-label block mb-1">Coefficiente k (stima indicativa, modello didattico)</label>
              <input
                id="para-kcoeff"
                type="number"
                step="0.01"
                min="0.05"
                value={kCoeffInput}
                onChange={e => setKCoeffInput(e.target.value)}
                className="w-32 px-3 h-11 border border-outline-variant rounded-xl font-bold text-sm text-primary-container"
              />
            </div>
            <HydrodynamicsChartsView mainAtleta={mainAth} top10List={benchmarkHydro} />
            {benchmarkHydro.length === 0 && (
              <p className="ds-label px-1">Dato non disponibile: nessun record {livelloGeo} per {classeRecord ?? 'questa classe'} {stile.replace('_', ' ')} {distanza}m.</p>
            )}
          </div>
        );
      })()}

      <Sezione titolo="Legenda Colori Classi S & Marker Atleta" icon={<Award size={16} className="text-tertiary-container" />} storageKey="para_biomech_legend" defaultAperto={false}>
        <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
          <span className="ds-chip-coral"><span className="w-2.5 h-2.5 rounded-full bg-error shrink-0" />Classe S1-S2</span>
          <span className="ds-chip-tertiary"><span className="w-2.5 h-2.5 rounded-full bg-tertiary-container shrink-0" />Classe S3-S4</span>
          <span className="ds-chip-neutral"><span className="w-2.5 h-2.5 rounded-full bg-accent-gold shrink-0" />Classe S5-S6</span>
          <span className="ds-chip-green"><span className="w-2.5 h-2.5 rounded-full bg-status-live shrink-0" />Classe S7-S8</span>
          <span className="ds-chip-blue"><span className="w-2.5 h-2.5 rounded-full bg-primary-container shrink-0" />Classe S9</span>
          <span className="ds-chip-secondary"><span className="w-2.5 h-2.5 rounded-full bg-secondary-container shrink-0" />Classe S10</span>
          <span className="ds-chip-tertiary"><span className="w-3 h-3 bg-tertiary-container border border-white rounded-xs shrink-0" />Mio Atleta (Prestazioni Reali)</span>
          <span className="ds-chip-blue"><span className="w-3 h-3 bg-primary-container border border-white rounded-xs shrink-0" />Record Reale (WR/EUR/ITA)</span>
        </div>
      </Sezione>

      <Sezione titolo="Spiegazione del Modello (NON validato scientificamente)" icon={<Activity size={16} className="text-primary-container" />} storageKey="para_biomech_formula" defaultAperto={false}>
        <div className="space-y-2 pt-1 text-xs text-on-surface leading-relaxed">
          <p className="font-bold text-on-surface">
            Indice di costo energetico (modello interno, adimensionale, non validato): I(v) = (220 / v) + 75 v²
          </p>
          <p className="text-on-surface-variant">
            Questo indice è una semplificazione didattica per confrontare andature: NON è una formula ufficiale, non ha unità fisiche e non è stato validato sperimentalmente. Non usarlo per decisioni di allenamento o di carico.
          </p>
          <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
            <li><strong>Termine (220 / v):</strong> cresce alle basse velocità, perché il tempo in vasca aumenta.</li>
            <li><strong>Termine 75 v²:</strong> cresce alle alte velocità, modellando la resistenza idrodinamica.</li>
            <li><strong>Punto di minimo:</strong> indica l'andatura di massima efficienza nel modello, non un optimum fisiologico misurato.</li>
          </ul>
        </div>
      </Sezione>

      <div className="ds-card p-4 shadow-card space-y-3">
        <h3 className="font-headline-sm text-on-surface text-sm uppercase tracking-wider flex items-center gap-2">
          <Plus size={15} className="text-primary-container" />
          <span>Aggiungi Nuova Prestazione Reale Atleta ({stile.replace('_', ' ')} {distanza}m)</span>
        </h3>

        <form onSubmit={handleAddPerformance} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label htmlFor="para-data" className="ds-label block mb-1">Data (Seleziona da calendario)</label>
            <input
              id="para-data"
              type="date"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
              className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold bg-surface-container-low text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="para-tempo" className="ds-label block mb-1">Tempo Totale (secondi, es. 28.5 o 62.3)</label>
            <input
              id="para-tempo"
              type="number"
              step="0.01"
              placeholder="es. 28.5"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold text-sm text-primary-container"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!tempoTesto.trim() || parseFloat(tempoTesto) <= 0}
              className="w-full h-11 min-h-[44px] bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-headline-sm font-bold rounded-xl text-xs transition shadow-card active:scale-[0.98]"
            >
              Aggiungi Prestazione
            </button>
          </div>
        </form>
      </div>

      <Sezione titolo="Storico Prestazioni Reali Filtrate" icon={<Flame size={16} />} badge={filteredPerformances.length} storageKey="para_biomech_history" defaultAperto={true}>
        {filteredPerformances.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">Nessuna prestazione registrata per {stile.replace('_', ' ')} {distanza}m.</p>
        ) : (
          <div className="space-y-2 pt-1 text-xs">
            {filteredPerformances.map((p, idx) => (
              <div key={p.id} className="p-3 bg-surface-container-low/50 border border-outline-variant rounded-xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-headline-sm font-bold text-on-surface block truncate">
                    #{idx + 1} · {p.data} — {p.tempoSecondi.toFixed(2)}s ({p.classeParalimpica})
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Velocità: <span className="tabular-nums">{p.velocitaMedia.toFixed(2)} m/s</span> · Indice costo energetico: <span className="tabular-nums">{p.costoEnergetico.toFixed(1)} (modello interno)</span>
                  </span>
                </div>
                <span className="ds-chip-neutral shrink-0 tabular-nums">
                  {p.velocitaMedia.toFixed(2)} m/s
                </span>
              </div>
            ))}
          </div>
        )}
      </Sezione>
    </div>
  );
};
