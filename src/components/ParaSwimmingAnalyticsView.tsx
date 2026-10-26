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
        <h2 className="ds-title flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <Activity size={22} className="text-primary-container" />
          <span>Analisi Biomeccanica & Costo Energetico C(v)</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Curva a U del Costo Energetico C(v) = (220/v) + 75 v² e confronto con i Top 10 Elite ({livelloGeo}).
        </p>
      </div>

      <div className="p-3 bg-surface-container-low/80 border border-primary-fixed-dim rounded-xl flex items-center justify-between text-xs text-primary-container font-semibold">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} />
          <span>Sincronizzazione Temporale Mensile: {syncStatus.lastUpdateDate}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-bold text-[10px]">
          {syncStatus.refreshed ? 'Cluster Ricalcolati' : 'Allineato 30gg'}
        </span>
      </div>

      <div className="ds-card p-4 shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-on-surface mb-1">Atleta</label>
            <select
              value={atletaSel?.id ?? ''}
              onChange={(e) => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              {atleti.map(a => (
                <option key={a.id} value={a.id}>{a.cognome} {a.nome} (S{a.classeS ?? '?'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">Stile</label>
            <select
              value={stile}
              onChange={(e) => setStile(e.target.value as Stile)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value="STILE_LIBERO">Stile Libero</option>
              <option value="DORSO">Dorso</option>
              <option value="RANA">Rana</option>
              <option value="FARFALLA">Farfalla</option>
              <option value="MISTI">Misti</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">Distanza Gara</label>
            <select
              value={distanza}
              onChange={(e) => setDistanza(Number(e.target.value))}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
            >
              <option value={50}>50m</option>
              <option value={100}>100m</option>
              <option value={200}>200m</option>
              <option value={400}>400m</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">Filtro Elite Competitors</label>
            <select
              value={livelloGeo}
              onChange={(e) => setLivelloGeo(e.target.value as LivelloGeografico)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-semibold">
          <div className="flex items-center gap-2 p-2 bg-error-container rounded-xl border border-error/40">
            <span className="w-3 h-3 rounded-full bg-error shrink-0" />
            <span className="text-on-error-container">Classe S1-S2</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-tertiary-fixed/40 rounded-xl border border-tertiary-fixed-dim">
            <span className="w-3 h-3 rounded-full bg-tertiary-container shrink-0" />
            <span className="text-on-tertiary-fixed">Classe S3-S4</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-xl border border-yellow-200">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
            <span className="text-yellow-900">Classe S5-S6</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface-container-low rounded-xl border border-primary-fixed-dim">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-on-primary-fixed">Classe S7-S8</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface-container-low rounded-xl border border-outline-variant">
            <span className="w-3 h-3 rounded-full bg-secondary shrink-0" />
            <span className="text-on-surface">Classe S9</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface-container-high rounded-xl border border-outline-variant">
            <span className="w-3 h-3 rounded-full bg-secondary-container shrink-0" />
            <span className="text-on-surface">Classe S10</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-tertiary-fixed rounded-xl border border-tertiary sm:col-span-2">
            <span className="w-3.5 h-3.5 bg-tertiary-container border border-white rounded-xs shrink-0" />
            <span className="text-amber-950 font-bold">Mio Atleta (Prestazioni Reali)</span>
          </div>
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
        <h3 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-2">
          <Plus size={15} className="text-primary-container" />
          <span>Aggiungi Nuova Prestazione Reale Atleta ({stile.replace('_', ' ')} {distanza}m)</span>
        </h3>

        <form onSubmit={handleAddPerformance} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-on-surface-variant mb-1">Data (Seleziona da calendario)</label>
            <input
              type="date"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
              className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold bg-surface-container-low text-on-surface"
            />
          </div>

          <div>
            <label className="block font-semibold text-on-surface-variant mb-1">Tempo Totale (secondi, es. 28.5 o 62.3)</label>
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
              className="w-full h-11 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-xs transition shadow-card"
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
              <div key={p.id} className="p-3 bg-surface-container-low/40 border border-tertiary-fixed-dim rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">
                    #{idx + 1} · {p.data} — {p.tempoSecondi.toFixed(2)}s ({p.classeParalimpica})
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Velocità: {p.velocitaMedia.toFixed(2)} m/s · Costo Energetico: {p.costoEnergetico.toFixed(1)} J/m/kg
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-200 text-on-tertiary-fixed font-bold text-xs">
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
