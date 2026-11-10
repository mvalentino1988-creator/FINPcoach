import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../data/AppContext';
import { Stile } from '../types';
import { BiomechanicsEngine, LivelloGeografico } from '../domain/biomechanicsEngine';
import { HydrodynamicsEngine } from '../domain/hydrodynamicsEngine';
import { ParaSwimmingViewModel } from '../domain/paraSwimmingViewModel';
import { ParaSwimmingCanvasChart } from './ParaSwimmingCanvasChart';
import { HydrodynamicsChartsView } from './HydrodynamicsChartsView';
import { Sezione } from './Sezione';
import { Activity, Plus, RefreshCw, Flame, Award, Globe, User } from 'lucide-react';

export const ParaSwimmingAnalyticsView: React.FC = () => {
  const { atleti } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === atletaSelId) ?? atleti[0] ?? null;

  const [stile, setStile] = useState<Stile>('STILE_LIBERO');
  const [distanza, setDistanza] = useState<number>(100);
  const [livelloGeo, setLivelloGeo] = useState<LivelloGeografico>('Mondiale');

  const [tempoTesto, setTempoTesto] = useState<string>('');
  const [dataTesto, setDataTesto] = useState<string>(new Date().toISOString().split('T')[0]);

  const [syncStatus, setSyncStatus] = useState<{ refreshed: boolean; lastUpdateDate: string }>({
    refreshed: false,
    lastUpdateDate: ''
  });

  const [performances, setPerformances] = useState(() => ParaSwimmingViewModel.getPerformances());

  useEffect(() => {
    const status = ParaSwimmingViewModel.checkAndFetchMonthlyData();
    setSyncStatus(status);
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
    return ParaSwimmingViewModel.getFilteredPerformances(atletaSel?.id ?? null, stile, distanza);
  }, [atletaSel, stile, distanza, performances]);

  const eliteClusters = useMemo(() => {
    const filtroClasseS = atletaSel?.classeS ? `S${atletaSel.classeS}` : null;
    return BiomechanicsEngine.generaClusterElite(livelloGeo, stile, distanza, filtroClasseS);
  }, [livelloGeo, stile, distanza, atletaSel]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="ds-title flex items-center gap-2">
          <Activity size={22} className="text-primary-container" />
          <span>Analisi Biomeccanica & Costo Energetico C(v)</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Curva a U del Costo Energetico C(v) = (220/v) + 75 v² e confronto con i Top 10 Elite ({livelloGeo}).
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
            <label className="ds-label block mb-1">Atleta</label>
            <select
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
            <label className="ds-label block mb-1">Stile</label>
            <select
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
            <label className="ds-label block mb-1">Distanza Gara</label>
            <select
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
            <label className="ds-label block mb-1">Filtro Elite Competitors</label>
            <select
              value={livelloGeo}
              onChange={(e) => setLivelloGeo(e.target.value as LivelloGeografico)}
              className="w-full min-w-0 min-h-[44px] px-2 sm:px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value="Mondiale">Top 10 Mondiale</option>
              <option value="Europeo">Top 10 Europeo</option>
              <option value="Italiano">Top 10 Italiano</option>
            </select>
          </div>
        </div>
      </div>

      <ParaSwimmingCanvasChart
        athletePerformances={filteredPerformances}
        eliteClusters={eliteClusters}
      />

      {/* Hydrodynamics Force F(v) and Power P(t) Dark Mode Charts */}
      {(() => {
        const classeStr = atletaSel?.classeS ? `S${atletaSel.classeS}` : 'S9';
        const mainAth = {
          id: atletaSel ? atletaSel.id.toString() : 'main',
          nome: atletaSel ? `${atletaSel.cognome} ${atletaSel.nome}` : 'Atleta Principale',
          classe: classeStr,
          stile,
          distanza,
          kCoeff: 0.42,
          velocitaMedia: filteredPerformances.length > 0 ? filteredPerformances[filteredPerformances.length - 1].velocitaMedia : 1.65,
          isMainAtleta: true
        };
        const top10 = HydrodynamicsEngine.generaTop10Benchmark(classeStr, stile, distanza);
        return <HydrodynamicsChartsView mainAtleta={mainAth} top10List={top10} />;
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
        </div>
      </Sezione>

      <Sezione titolo="Spiegazione Scientifica della Curva C(v)" icon={<Activity size={16} className="text-primary-container" />} storageKey="para_biomech_formula" defaultAperto={false}>
        <div className="space-y-2 pt-1 text-xs text-on-surface leading-relaxed">
          <p className="font-bold text-on-surface">
            Formula del Costo Energetico: C(v) = (220 / v) + 75 v² [J/m/kg]
          </p>
          <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
            <li><strong>Termine (220 / v):</strong> Rappresenta la spesa metabolica di base per sostenere il corpo in acqua al passare del tempo. Alle basse velocità (v &lt; 0.8 m/s), il tempo impiegato in vasca è elevato e fa salire il costo energetico.</li>
            <li><strong>Termine 75 v²:</strong> Rappresenta la resistenza idrodinamica dell'acqua (drag), che cresce con il quadrato della velocità. Ad alte velocità, la resistenza dell'acqua diventa il fattore limitante primario.</li>
            <li><strong>Punto di Minimo della Parabola a U:</strong> Identifica l'andatura di massima efficienza propulsiva per la specifica classe funzionale paralimpica.</li>
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
            <label className="ds-label block mb-1">Data (Seleziona da calendario)</label>
            <input
              type="date"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
              className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold bg-surface-container-low text-on-surface"
            />
          </div>

          <div>
            <label className="ds-label block mb-1">Tempo Totale (secondi, es. 28.5 o 62.3)</label>
            <input
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
                    Velocità: <span className="tabular-nums">{p.velocitaMedia.toFixed(2)} m/s</span> · Costo Energetico: <span className="tabular-nums">{p.costoEnergetico.toFixed(1)} J/m/kg</span>
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
