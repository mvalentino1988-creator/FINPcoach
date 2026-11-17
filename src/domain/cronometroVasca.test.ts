import { describe, expect, it } from 'vitest';
import {
  VascaSession,
  VascaLane,
  VascaAthlete,
  createSession,
  createLane,
  createAthlete,
  sessionNow,
  effectiveRipartenza,
  refreshSession,
  viaGenerale,
  stopGenerale,
  resumeGenerale,
  tapAthlete,
  athleteStatus,
  lastLapMs,
  migrateSession,
  buildSummary,
  chooseOrientation,
  simulateOrientations,
  OrientInput,
} from './cronometroVasca';

function setup(ripGenerale = 60): { s: VascaSession; lane: VascaLane; a: VascaAthlete } {
  const s = createSession(ripGenerale);
  const lane = createLane(1);
  const a = createAthlete(1, 'Rossi');
  lane.atleti.push(a);
  s.lanes.push(lane);
  return { s, lane, a };
}

describe('cronometroVasca — ripartenza ancorata', () => {
  it('ripartenza 60 s e nuotata 40 s: riparte a 60 s e il lap 2 dura 40 s', () => {
    const { s, lane, a } = setup(60);
    viaGenerale(s, 1_000_000);
    expect(a.repStart).toBe(1_000_000);

    // Nuota 40 s e tocca: lap registrato, recupero ancorato a repStart + 60 s.
    const t1 = 1_000_000 + 40_000;
    expect(tapAthlete(s, lane, a, t1)).toBe('lap');
    expect(a.laps).toHaveLength(1);
    expect(a.restUntil).toBe(1_060_000); // 1_000_000 + 60_000, non t1 + 60_000

    // A t = 1_060_000 la ripetizione riparte esattamente dal tempo schedulato.
    refreshSession(s, 1_060_000);
    expect(a.restUntil).toBeNull();
    expect(a.repStart).toBe(1_060_000);
    expect(athleteStatus(s, lane, a, 1_060_000)).toBe('in_nuoto');

    // Seconda nuotata di 40 s: lap 2 = durata reale (100_000 - ... -> 40 s).
    const t2 = 1_060_000 + 40_000;
    tapAthlete(s, lane, a, t2);
    expect(a.laps).toHaveLength(2);
    expect(lastLapMs(a)).toBe(40_000);
  });

  it('se l\'atleta arriva oltre repStart + rip, riparte subito (cadenza senza deriva)', () => {
    const { s, lane, a } = setup(60);
    viaGenerale(s, 0);
    tapAthlete(s, lane, a, 30_000); // lap a 30 s, recupero fino a 60 s
    // L'atleta tocca il bordo molto dopo la fine del recupero: riparte da now.
    refreshSession(s, 130_000); // now - restUntil = 70 s > rip 60 s
    expect(a.repStart).toBe(130_000);
    expect(a.restUntil).toBeNull();
    // Se invece arriva entro un'intervallo di ripartenza, la ripetizione
    // resta ancorata a restUntil (qui 60 s) e risulta in ritardo.
    const { s: s2, lane: l2, a: a2 } = setup(60);
    viaGenerale(s2, 0);
    tapAthlete(s2, l2, a2, 30_000);
    refreshSession(s2, 75_000); // 15 s di ritardo < 60 s di ripartenza
    expect(a2.repStart).toBe(60_000);
    // La ripetizione e' partita in ritardo: il tempo mostrato parte da 60 s.
    expect(athleteStatus(s2, l2, a2, 75_000)).toBe('in_nuoto');
  });

  it('precedenza ripartenza: atleta > corsia > generale', () => {
    const { s, lane, a } = setup(60);
    expect(effectiveRipartenza(s, lane, a)).toBe(60);
    lane.ripartenzaCorsia = 45;
    expect(effectiveRipartenza(s, lane, a)).toBe(45);
    a.ripartenzaAtleta = 30;
    expect(effectiveRipartenza(s, lane, a)).toBe(30);
    a.ripartenzaAtleta = null;
    lane.ripartenzaCorsia = null;
    expect(effectiveRipartenza(s, lane, a)).toBe(60);
  });
});

describe('cronometroVasca — tap e stati', () => {
  it('tap in recupero e\' ignorato: nessun lap, nessun stop prematuro', () => {
    const { s, lane, a } = setup(60);
    a.targetLaps = 2;
    viaGenerale(s, 0);
    tapAthlete(s, lane, a, 20_000); // lap 1, recupero fino a 60 s
    expect(a.laps).toHaveLength(1);
    expect(athleteStatus(s, lane, a, 30_000)).toBe('in_ripartenza');

    // Tap durante il recupero: ignorato.
    expect(tapAthlete(s, lane, a, 35_000)).toBe('ignored');
    expect(a.laps).toHaveLength(1);
    expect(a.fermo).toBe(false);

    // A fine recupero il tap chiude la ripetizione (lap 2) e il target ferma.
    refreshSession(s, 60_000);
    tapAthlete(s, lane, a, 70_000);
    expect(a.laps).toHaveLength(2);
    expect(a.fermo).toBe(true);
  });

  it('tap su atleta fermo e\' ignorato', () => {
    const { s, lane, a } = setup(60);
    viaGenerale(s, 0);
    a.fermo = true;
    expect(tapAthlete(s, lane, a, 10_000)).toBe('ignored');
  });
});

describe('cronometroVasca — partenza automatica', () => {
  it('con intervallo la seconda parte da sola all\'intervallo dopo la prima', () => {
    const s = createSession(60);
    const lane = createLane(1);
    lane.intervalloPartenza = 10;
    const a1 = createAthlete(1, 'Primo');
    const a2 = createAthlete(2, 'Secondo');
    lane.atleti.push(a1, a2);
    s.lanes.push(lane);
    viaGenerale(s, 0); // parte solo a1
    expect(a1.repStart).toBe(0);
    expect(a2.repStart).toBeNull();

    // 3 s prima: warning; a 10 s: partenza automatica.
    const evWarn = refreshSession(s, 7_000);
    expect(evWarn.some(e => e.type === 'autoWarn' && e.athleteId === a2.id)).toBe(true);
    const evStart = refreshSession(s, 10_000);
    expect(evStart.some(e => e.type === 'autoStart' && e.athleteId === a2.id)).toBe(true);
    expect(a2.repStart).toBe(10_000);
    expect(a2.primoVia).toBe(10_000);
  });

  it('motore sospeso oltre un intervallo: mantiene il tempo teorico e marca "partenza recuperata"', () => {
    const s = createSession(60);
    const lane = createLane(1);
    lane.intervalloPartenza = 10;
    const a1 = createAthlete(1, 'Primo');
    const a2 = createAthlete(2, 'Secondo');
    lane.atleti.push(a1, a2);
    s.lanes.push(lane);
    viaGenerale(s, 0);
    // Il motore non gira per 25 s (oltre un intervallo di 10 s).
    refreshSession(s, 25_000);
    expect(a2.repStart).toBe(10_000); // tempo teorico, non 25_000
    expect(a2.autoLate).toBe(true);
    // Il tempo mostrato parte dal teorico: a 25 s mostra gia' 15 s di turno.
    expect(athleteStatus(s, lane, a2, 25_000)).toBe('in_nuoto');
    // Al lap successivo il flag si azzera.
    tapAthlete(s, lane, a2, 30_000);
    expect(a2.autoLate).toBe(false);
  });

  it('ritardo entro un intervallo: parte dal tempo teorico senza flag', () => {
    const s = createSession(60);
    const lane = createLane(1);
    lane.intervalloPartenza = 10;
    const a1 = createAthlete(1, 'Primo');
    const a2 = createAthlete(2, 'Secondo');
    lane.atleti.push(a1, a2);
    s.lanes.push(lane);
    viaGenerale(s, 0);
    refreshSession(s, 12_000); // 2 s di ritardo < 10 s di intervallo
    expect(a2.repStart).toBe(10_000);
    expect(a2.autoLate).toBe(false);
  });

  it('il tap manuale ha precedenza e riancora la catena', () => {
    const s = createSession(60);
    const lane = createLane(1);
    lane.intervalloPartenza = 10;
    const a1 = createAthlete(1, 'Primo');
    const a2 = createAthlete(2, 'Secondo');
    lane.atleti.push(a1, a2);
    s.lanes.push(lane);
    viaGenerale(s, 0);
    // a2 parte manualmente a t=4 s: la catena si ricalcola da lì.
    tapAthlete(s, lane, a2, 4_000);
    refreshSession(s, 13_999);
    expect(a2.repStart).toBe(4_000); // non riparte da solo
    // Nessun terzo atleta: niente altra partenza automatica.
  });
});

describe('cronometroVasca — stop e ripresa generale', () => {
  it('stop congela l\'orologio di sessione e resume lo riprende', () => {
    const { s, lane, a } = setup(60);
    viaGenerale(s, 0);
    tapAthlete(s, lane, a, 10_000);
    const wallNow = Date.now();
    stopGenerale(s, wallNow);
    expect(s.stato).toBe('ferma');
    const frozen = sessionNow(s);
    // Lo "scorrere" del tempo reale non muove l'orologio di sessione.
    expect(sessionNow(s)).toBe(frozen);
    resumeGenerale(s);
    expect(s.stato).toBe('in_corso');
    // Dopo la ripresa l'orologio continua da dove era (shift compensato).
    expect(sessionNow(s)).toBeGreaterThanOrEqual(frozen - 1000);
    expect(sessionNow(s)).toBeLessThanOrEqual(frozen + 5000);
  });

  it('in stato ferma refreshSession non muove nulla', () => {
    const { s, lane, a } = setup(60);
    lane.intervalloPartenza = 5;
    const a2 = createAthlete(2, 'Due');
    lane.atleti.push(a2);
    viaGenerale(s, 0);
    stopGenerale(s, Date.now());
    const ev = refreshSession(s, 60_000);
    expect(ev).toHaveLength(0);
    expect(a2.repStart).toBeNull();
  });
});

describe('cronometroVasca — migrazione e riepilogo', () => {
  it('migrateSession completa start nei lap legacy senza errori', () => {
    const { s, lane, a } = setup(60);
    viaGenerale(s, 0);
    // Simula un lap vecchio senza `start`.
    a.laps.push({ t: 40_000, wall: Date.now() });
    a.laps.push({ t: 100_000, wall: Date.now() });
    migrateSession(s);
    expect(a.laps[0].start).toBe(0); // primoVia
    expect(a.laps[1].start).toBe(40_000); // lap precedente
    // Le durate non cambiano rispetto al vecchio calcolo.
    expect(lastLapMs(a)).toBe(60_000);
    const summary = buildSummary(s, 100_000);
    expect(summary[0].laps[1].dur).toBe(60_000);
  });
});

describe('cronometroVasca — scelta orientamento (411x923)', () => {
  // Schermo 411x923, cognome min 90 px, chrome live (barre + safe area).
  const base: Omit<OrientInput, 'corsie' | 'maxAtleti'> = {
    minTileW: 90,
    shortSide: 411,
    longSide: 923,
    chromeV: 110,
  };

  it.each([
    [3, 2, 'landscape'],
    [3, 4, 'landscape'],
    [6, 4, 'landscape'],
    [6, 8, 'portrait'],
    [4, 6, 'portrait'],
  ] as const)('%i corsie x %i atleti -> %s', (corsie, maxAtleti, atteso) => {
    const r = chooseOrientation({ ...base, corsie, maxAtleti }, null, 0);
    expect(r.orientation).toBe(atteso);
    expect(r.score).toBeGreaterThan(0);
  });

  it('la scelta coincide sempre con il candidato di score maggiore', () => {
    for (const corsie of [2, 3, 4, 6]) {
      for (const maxAtleti of [2, 4, 8]) {
        const inp = { ...base, corsie, maxAtleti };
        const r = chooseOrientation(inp, null, 0);
        const sim = simulateOrientations(inp);
        const best = sim.portrait.score >= sim.landscape.score ? 'portrait' : 'landscape';
        // Fuori dalla fascia di parita' (<10%) deve vincere il miglior score;
        // in parita' vale la regola corsie>=4 -> orizzontale.
        const diff = Math.abs(sim.portrait.score - sim.landscape.score) / Math.max(sim.portrait.score, sim.landscape.score, 0.0001);
        const expected = diff < 0.1 ? (corsie >= 4 ? 'landscape' : 'portrait') : best;
        expect(r.orientation).toBe(expected);
      }
    }
  });
});
