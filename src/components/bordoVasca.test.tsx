// @vitest-environment jsdom
/**
 * Test di componente di Bordo Vasca (Cronometro + Regia) e delle
 * viste di analisi (idronegnamica, ParaSwimming, biomeccanica).
 */
import '../test/jsdomEnv';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderConDati } from '../test/renderApp';
import { datasetStress } from '../test/stressDataset';

import { BordoVascaScreen } from './BordoVascaScreen';
import { CronometroVasca } from './CronometroVasca';
import { RegiaTecnicaCorsie } from './RegiaTecnicaCorsie';
import { BackupModal } from './BackupModal';
import { HydrodynamicsChartsView } from './HydrodynamicsChartsView';
import { ParaSwimmingCanvasChart } from './ParaSwimmingCanvasChart';
import { ParaSwimmingAnalyticsView } from './ParaSwimmingAnalyticsView';
import { AtletaBiomeccanicaView } from './AtletaBiomeccanicaView';
import type { Atleta, Tempo } from '../types';
import type { AthleteHydroProfile } from '../domain/hydrodynamicsEngine';
import type { AthleticPerformance, EliteClusterPoint } from '../domain/biomechanicsEngine';

const backup = datasetStress().backup as Record<string, unknown[]>;
const atleti = backup.atleti as Atleta[];
const tempi = backup.tempi as Tempo[];
const atleta = atleti[0];

describe('BordoVascaScreen', () => {
  it('renderizza toggle cronometro/regia', () => {
    const { container } = renderConDati(<BordoVascaScreen />);
    expect(container.textContent).toMatch(/Cronometro|Regia/);
  });
});

describe('CronometroVasca', () => {
  it('renderizza in stato pronta con assegnazione', () => {
    const { container } = renderConDati(<CronometroVasca attivo />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });
});

describe('RegiaTecnicaCorsie', () => {
  it('renderizza la regia con 100 atleti', () => {
    const { container } = renderConDati(<RegiaTecnicaCorsie />);
    expect(container.textContent).toMatch(/Regia|corsia|assegnat/i);
  });
});

describe('BackupModal', () => {
  it('renderizza il pannello backup', () => {
    render(<BackupModal onClose={vi.fn()} />);
    expect(document.body.textContent).toMatch(/backup|esporta|importa|ripristina/i);
  });
});

describe('HydrodynamicsChartsView', () => {
  const profilo: AthleteHydroProfile = {
    id: 'p1',
    nome: atleta.cognome,
    classe: 'S5',
    stile: 'STILE_LIBERO',
    distanza: 100,
    kCoeff: 30,
    velocitaMedia: 1.4,
    isMainAtleta: true,
  };

  it('renderizza i grafici idrodinamici', () => {
    const { container } = render(
      <HydrodynamicsChartsView mainAtleta={profilo} top10List={[profilo]} />
    );
    expect(container.textContent!.length + container.querySelectorAll('canvas').length).toBeGreaterThan(0);
  });
});

describe('ParaSwimmingCanvasChart', () => {
  it('renderizza il grafico con canvas', () => {
    const perf: AthleticPerformance[] = [
      { atletaId: 1, cognome: 'A', data: '2026-01-01', tempo100: 70, tempo200: 150, livello: 'INTERMEDIO' } as unknown as AthleticPerformance,
    ];
    const clusters: EliteClusterPoint[] = [];
    const { container } = render(
      <ParaSwimmingCanvasChart athletePerformances={perf} eliteClusters={clusters} />
    );
    expect(container.querySelector('canvas') ?? container.textContent!.length).toBeTruthy();
  });
});

describe('ParaSwimmingAnalyticsView', () => {
  it('renderizza la vista analytics', () => {
    renderConDati(<ParaSwimmingAnalyticsView />);
    expect(document.body.textContent!.length).toBeGreaterThan(20);
  });
});

describe('AtletaBiomeccanicaView', () => {
  it('renderizza la biomeccanica di un atleta', () => {
    const { container } = render(
      <AtletaBiomeccanicaView atleta={atleta} tempi={tempi.filter(t => t.atletaId === atleta.id)} />
    );
    expect(container.textContent!.length).toBeGreaterThan(10);
  });
});
