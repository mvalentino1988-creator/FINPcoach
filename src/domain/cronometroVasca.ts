/**
 * Modello dati del cronometro multi-corsia bordo vasca.
 *
 * Tempi basati su timestamp (epoch ms + shift di pausa): nessun contatore
 * incrementato tick dopo tick. Il tempo mostrato è sempre `now - repStart`.
 *
 * Stati atleta:
 *  - in_attesa:     mai partito (o rimosso)
 *  - in_nuoto:      ripetizione in corso entro il target (now < repStart + rip)
 *  - in_ripartenza: in recupero dopo un lap, countdown a `restUntil`
 *  - in_ritardo:    ripetizione oltre il target (now >= repStart + rip)
 *  - fermo:         stop individuale (i tempi restano salvati)
 *
 * Ripartenza effettiva = atleta ?? corsia ?? generale (multipli di 5 s).
 * `intervalloPartenza` della corsia = secondi tra la partenza di un atleta
 * e il successivo della stessa corsia (catena di partenze automatiche).
 */

export type SessionStatus = 'pronta' | 'in_corso' | 'ferma';
export type AthleteStatus = 'in_attesa' | 'in_nuoto' | 'in_ripartenza' | 'in_ritardo' | 'fermo';
export type ForcedOrientation = 'portrait' | 'landscape';

export interface VascaLap {
  /** timestamp sessione (ms) in cui è stato registrato il lap */
  t: number;
  /** timestamp epoch reale per i log */
  wall: number;
  /** Inizio della ripetizione a cui il lap si riferisce (durata = t - start). */
  start?: number;
}

export interface VascaAthlete {
  id: string;
  atletaId: number | null;
  cognome: string;
  /** Inizio della ripetizione corrente (base del tempo mostrato). */
  repStart: number | null;
  /** Fine del recupero dopo l'ultimo lap (null = nessun recupero attivo). */
  restUntil: number | null;
  /** `repStart` della ripetizione appena chiusa: base per lap registrati durante il recupero. */
  lastRepStart: number | null;
  /** Prima partenza mai avvenuta (per il tempo totale). */
  primoVia: number | null;
  started: boolean;
  fermo: boolean;
  laps: VascaLap[];
  ripartenzaAtleta: number | null;
  targetLaps: number | null;
  /** Timestamp di partenza dell'atleta precedente della corsia (catena automatica). */
  autoAnchorT: number | null;
  autoWarned: boolean;
  /** Partenza automatica avvenuta in ritardo perché il motore non girava
   *  (WebView sospesa): la rep è partita dal tempo teorico `due`. */
  autoLate?: boolean;
}

export interface VascaLane {
  numero: number;
  ripartenzaCorsia: number | null;
  /** Secondi tra un atleta e il successivo; null = disattivato. */
  intervalloPartenza: number | null;
  atleti: VascaAthlete[];
  /** Prossima partenza automatica in attesa di essere assegnata (catena). */
  pendingAuto: { athleteId: string; anchorT: number } | null;
}

export interface VascaSession {
  id: string;
  /** epoch ms del VIA generale (null finché la sessione è in 'pronta'). */
  t0: number | null;
  stato: SessionStatus;
  ripartenzaGenerale: number;
  /** Correzione epoch -> tempo di sessione per la pausa generale. */
  shiftMs: number;
  pausedSessionAt: number | null;
  pausedWallAt: number | null;
  lanes: VascaLane[];
}

export const RIPARTENZA_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
export const INTERVALLO_PRESETS = [5, 10, 15, 20] as const;
export const MAX_LANES = 8;
export const MAX_ATHLETES_PER_LANE = 12;

let counter = 0;
export const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const createAthlete = (atletaId: number | null, cognome: string): VascaAthlete => ({
  id: nextId('at'),
  atletaId,
  cognome,
  repStart: null,
  restUntil: null,
  lastRepStart: null,
  primoVia: null,
  started: false,
  fermo: false,
  laps: [],
  ripartenzaAtleta: null,
  targetLaps: null,
  autoAnchorT: null,
  autoWarned: false,
});

export const createLane = (numero: number): VascaLane => ({
  numero,
  ripartenzaCorsia: null,
  intervalloPartenza: null,
  atleti: [],
  pendingAuto: null,
});

export const createSession = (ripartenzaGenerale = 60): VascaSession => ({
  id: nextId('ses'),
  t0: null,
  stato: 'pronta',
  ripartenzaGenerale,
  shiftMs: 0,
  pausedSessionAt: null,
  pausedWallAt: null,
  lanes: [],
});

/** Orologio di sessione: si ferma quando la sessione è in 'ferma'. */
export const sessionNow = (s: VascaSession): number => {
  if (s.stato === 'ferma' && s.pausedSessionAt != null) return s.pausedSessionAt;
  return Date.now() + s.shiftMs;
};

/** Ripartenza effettiva in secondi (atleta ?? corsia ?? generale). */
export const effectiveRipartenza = (s: VascaSession, lane: VascaLane, a: VascaAthlete): number =>
  a.ripartenzaAtleta ?? lane.ripartenzaCorsia ?? s.ripartenzaGenerale;

/**
     Materializza le partenze automatiche e i fini recupero.
     Va chiamata prima di leggere gli stati; ritorna true se la sessione è cambiata.
     `events` raccoglie eventi sonori/vibrazione da emettere.
*/
export interface VascaEvent {
  type: 'autoStart' | 'autoWarn' | 'lap' | 'start';
  athleteId: string;
  laneNumero: number;
}

export function refreshSession(s: VascaSession, now = sessionNow(s)): VascaEvent[] {
  const events: VascaEvent[] = [];
  if (s.stato !== 'in_corso') return events;

  for (const lane of s.lanes) {
    // Catena di partenza automatica: il primo atleta non avviato con autoAnchorT
    for (const a of lane.atleti) {
      if (a.started || a.repStart != null || a.restUntil != null || a.autoAnchorT == null) continue;
      if (lane.intervalloPartenza == null) continue;
      const due = a.autoAnchorT + lane.intervalloPartenza * 1000;
      if (now >= due - 3000 && now < due && !a.autoWarned) {
        a.autoWarned = true;
        events.push({ type: 'autoWarn', athleteId: a.id, laneNumero: lane.numero });
      }
      if (now >= due) {
        // Partenza reale: si conserva sempre il tempo teorico `due` (nessuna
        // deriva). Se il ritardo supera un intero intervallo (motore fermo,
        // es. WebView sospesa) l'atleta viene marcato "partenza recuperata".
        a.repStart = due;
        a.autoLate = now - due > lane.intervalloPartenza * 1000;
        a.started = true;
        a.primoVia = a.repStart;
        a.autoWarned = false;
        events.push({ type: 'autoStart', athleteId: a.id, laneNumero: lane.numero });
        onFirstStart(s, lane, a, a.repStart);
      }
    }
    // Fine recupero -> la ripetizione riparte dal momento schedulato.
    for (const a of lane.atleti) {
      if (a.repStart == null && a.restUntil != null && now >= a.restUntil) {
        const base = a.restUntil;
        const rip = effectiveRipartenza(s, lane, a) * 1000;
        a.repStart = now - base > rip ? now : base;
        a.restUntil = null;
        a.lastRepStart = null;
      }
    }
  }
  return events;
}

/** Dopo la prima partenza di un atleta, arma la catena per il successivo della corsia. */
export function onFirstStart(s: VascaSession, lane: VascaLane, a: VascaAthlete, t: number): void {
  a.started = true;
  if (a.primoVia == null) a.primoVia = t;
  // Riallinea la catena: il prossimo atleta non avviato riparte da questo istante.
  const next = lane.atleti.find(x => !x.started && x.repStart == null && x.restUntil == null);
  if (next) {
    next.autoAnchorT = t;
    next.autoWarned = false;
    lane.pendingAuto = { athleteId: next.id, anchorT: t };
  } else {
    lane.pendingAuto = null;
  }
}

/** Avvia un atleta (prima partenza). `t` = timestamp sessione. */
export function startAthlete(s: VascaSession, lane: VascaLane, a: VascaAthlete, t: number): void {
  if (a.started) return;
  a.repStart = t;
  a.restUntil = null;
  onFirstStart(s, lane, a, t);
}

/**
 * Tap su una tessera atleta.
 *  - in_attesa -> partenza
 *  - in_nuoto / in_ritardo -> registra lap e apre il recupero
 *  - in_ripartenza -> ignorato (evita falsi lap e stop prematuri)
 * La ripartenza e' una cadenza ancorata: restUntil = max(now, repStart + rip),
 * cosi' la ripetizione successiva parte sempre da repStart + rip (o subito,
 * se l'atleta e' in ritardo) senza deriva.
 * ritorna 'ignored' | 'start' | 'lap'
 */
export function tapAthlete(s: VascaSession, lane: VascaLane, a: VascaAthlete, now: number): 'ignored' | 'start' | 'lap' {
  if (a.fermo) return 'ignored';
  // Se il recupero è appena finito ma lo scheduler non ha ancora materializzato
  // la nuova ripetizione, fallo qui per non registrare un lap spurio.
  if (a.repStart == null && a.restUntil != null && now >= a.restUntil) {
    const base = a.restUntil;
    const rip = effectiveRipartenza(s, lane, a) * 1000;
    a.repStart = now - base > rip ? now : base;
    a.restUntil = null;
    a.lastRepStart = null;
  }
  if (a.repStart == null && a.restUntil == null) {
    startAthlete(s, lane, a, now);
    return 'start';
  }
  if (a.repStart == null && a.restUntil != null) {
    // In recupero: il tap e' ignorato (niente lap di viraggio né stop prematuri).
    return 'ignored';
  }
  // Rep in corso (nuoto o ritardo): chiude la rep e apre il recupero ancorato.
  const base = a.repStart ?? now;
  a.laps.push({ t: now, wall: Date.now(), start: base });
  a.lastRepStart = base;
  a.autoLate = false;
  checkTargetLaps(a);
  const ripMs = effectiveRipartenza(s, lane, a) * 1000;
  a.repStart = null;
  a.restUntil = ripMs > 0 ? Math.max(now, base + ripMs) : now;
  return 'lap';
}

function checkTargetLaps(a: VascaAthlete): void {
  if (a.targetLaps != null && a.laps.length >= a.targetLaps) {
    a.fermo = true;
  }
}

/** VIA GENERALE: fa partire il primo atleta di ogni corsia. */
export function viaGenerale(s: VascaSession, now: number): void {
  s.t0 = now;
  s.stato = 'in_corso';
  for (const lane of s.lanes) {
    const first = lane.atleti[0];
    if (first && !first.started) startAthlete(s, lane, first, now);
  }
}

/** LAP GENERALE: un lap per tutti gli atleti con rep in corso (non fermi, non in attesa/in recupero). */
export function lapGenerale(s: VascaSession, now: number): number {
  let count = 0;
  for (const lane of s.lanes) {
    for (const a of lane.atleti) {
      if (a.fermo || a.repStart == null) continue;
      const base = a.repStart;
      a.laps.push({ t: now, wall: Date.now(), start: base });
      a.lastRepStart = base;
      a.autoLate = false;
      checkTargetLaps(a);
      const ripMs = effectiveRipartenza(s, lane, a) * 1000;
      a.repStart = null;
      a.restUntil = ripMs > 0 ? Math.max(now, base + ripMs) : now;
      count++;
    }
  }
  return count;
}

/** STOP GENERALE: congela i tempi senza cancellarli. */
export function stopGenerale(s: VascaSession, nowWall = Date.now()): void {
  if (s.stato !== 'in_corso') return;
  s.pausedSessionAt = sessionNow(s);
  s.pausedWallAt = nowWall;
  s.stato = 'ferma';
}

/** Riprende dopo uno STOP GENERALE. */
export function resumeGenerale(s: VascaSession): void {
  if (s.stato !== 'ferma' || s.pausedSessionAt == null) return;
  s.shiftMs = s.pausedSessionAt - Date.now();
  s.pausedSessionAt = null;
  s.pausedWallAt = null;
  s.stato = 'in_corso';
}

/** Stato derivato di un atleta al tempo `now` (dopo refreshSession). */
export function athleteStatus(s: VascaSession, lane: VascaLane, a: VascaAthlete, now: number): AthleteStatus {
  if (a.fermo) return 'fermo';
  if (a.repStart == null) {
    if (a.restUntil != null && now < a.restUntil) return 'in_ripartenza';
    return a.started || a.laps.length > 0 ? 'in_ritardo' : 'in_attesa';
  }
  const rip = effectiveRipartenza(s, lane, a);
  if (rip <= 0) return 'in_nuoto';
  return now < a.repStart + rip * 1000 ? 'in_nuoto' : 'in_ritardo';
}

/** Tempo del turno corrente in ms (rep in corso) o null. */
export function currentRepMs(s: VascaSession, lane: VascaLane, a: VascaAthlete, now: number): number | null {
  if (a.repStart == null) return null;
  return Math.max(0, now - a.repStart);
}

/** Durata dell'ultimo lap registrato in ms (t - start; fallback per lap legacy). */
export function lastLapMs(a: VascaAthlete): number | null {
  if (a.laps.length === 0) return null;
  const idx = a.laps.length - 1;
  const l = a.laps[idx];
  if (l.start != null) return Math.max(0, l.t - l.start);
  const prev = idx > 0 ? a.laps[idx - 1].t : (a.primoVia ?? l.t);
  return Math.max(0, l.t - prev);
}

/** Tempo totale atleta: dall'prima partenza all'ultimo evento (o a now). */
export function totalMs(s: VascaSession, a: VascaAthlete, now: number): number | null {
  if (a.primoVia == null) return null;
  const end = a.laps.length > 0 ? a.laps[a.laps.length - 1].t : a.repStart ?? a.restUntil ?? now;
  return Math.max(0, end - a.primoVia);
}

// ---------------------------------------------------------------------------
// Formattazione
// ---------------------------------------------------------------------------

/** mm:ss.cc (centesimi) */
export const formatMs = (ms: number): string => {
  const cs = Math.max(0, Math.floor(ms / 10));
  const m = Math.floor(cs / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};

/** mm:ss per i countdown lunghi (>= 1 min) altrimenti ss.s */
export const formatClock = (ms: number): string => {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `${s}.${String(cs).padStart(2, '0')}`;
};

export const formatRipartenza = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Simulazione orientamento (sezione 6.1)
// ---------------------------------------------------------------------------

export interface OrientCandidate {
  orientation: ForcedOrientation;
  score: number;
  tileW: number;
  tileH: number;
}

export interface OrientInput {
  corsie: number;
  maxAtleti: number;
  /** larghezza minima tile: cognome più lungo a 12px + padding */
  minTileW: number;
  /** px utili nette per orientamento (schermo breve/lungo - barre - safe area) */
  shortSide: number;
  longSide: number;
  /** spazio verticale occupato da header/dock/safe-area/barre interne */
  chromeV: number;
  gap?: number;
  laneHeaderH?: number;
}

const MIN_TILE_H = 40;
const DEFAULT_GAP = 6;
const LANE_HEADER_H = 30;

function candidate(orientation: ForcedOrientation, inp: OrientInput): OrientCandidate {
  const C = Math.max(1, inp.corsie);
  const A = Math.max(1, inp.maxAtleti);
  const gap = inp.gap ?? DEFAULT_GAP;
  const laneHeader = inp.laneHeaderH ?? LANE_HEADER_H;

  let cols: number;
  let rows: number;
  if (orientation === 'landscape') {
    cols = C;
    rows = 1;
  } else {
    rows = C <= 3 ? 1 : C <= 6 ? 2 : 3;
    cols = Math.ceil(C / rows);
  }

  const W = orientation === 'landscape' ? inp.longSide : inp.shortSide;
  const H = (orientation === 'landscape' ? inp.shortSide : inp.longSide) - inp.chromeV;

  const cellW = (W - (cols - 1) * gap) / cols;
  const cellH = (H - (rows - 1) * gap) / rows;
  const tileW = Math.max(0, cellW - 8);
  const tileH = Math.max(0, (cellH - laneHeader) / A);

  const score = Math.min(tileW / inp.minTileW, tileH / MIN_TILE_H);
  return { orientation, score, tileW, tileH };
}

/** Simula entrambi gli orientamenti e restituisce i due candidati. */
export function simulateOrientations(inp: OrientInput): { portrait: OrientCandidate; landscape: OrientCandidate } {
  return {
    portrait: candidate('portrait', inp),
    landscape: candidate('landscape', inp),
  };
}

/**
 * Sceglie l'orientamento: punteggio più alto; a parità o differenza <10%
 * orizzontale se C>=4 altrimenti verticale.
 */
export function chooseOrientation(
  inp: OrientInput,
  current: ForcedOrientation | null,
  currentScore: number,
): { orientation: ForcedOrientation; score: number; changed: boolean } {
  const { portrait, landscape } = simulateOrientations(inp);
  const best = portrait.score >= landscape.score ? portrait : landscape;

  let chosen: OrientCandidate;
  if (Math.abs(portrait.score - landscape.score) / Math.max(portrait.score, landscape.score, 0.0001) < 0.1) {
    chosen = inp.corsie >= 4 ? landscape : portrait;
  } else {
    chosen = best;
  }

  // Isteresi: cambia solo se il nuovo score supera di almeno il 10% l'attuale.
  if (current != null && currentScore > 0) {
    const currentCand = current === 'portrait' ? portrait : landscape;
    if (chosen.orientation !== current && chosen.score < currentScore * 1.1) {
      return { orientation: current, score: currentCand.score, changed: false };
    }
  }
  return {
    orientation: chosen.orientation,
    score: chosen.orientation === 'portrait' ? portrait.score : landscape.score,
    changed: current !== chosen.orientation,
  };
}

/** Misura larghezza del cognome più lungo a 12px (canvas, con fallback). */
export function measureMinTileW(cognomi: string[]): number {
  let maxW = 0;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '600 12px "Public Sans", system-ui, sans-serif';
      for (const c of cognomi) {
        const w = ctx.measureText(c || '—').width;
        if (w > maxW) maxW = w;
      }
    }
  } catch {
    /* noop */
  }
  if (maxW <= 0) {
    maxW = Math.max(0, ...cognomi.map(c => (c || '').length)) * 7.2;
  }
  return Math.ceil(maxW + 20); // padding orizzontale della tessera
}

// ---------------------------------------------------------------------------
// Riepilogo fine sessione
// ---------------------------------------------------------------------------

export interface AthleteSummary {
  athlete: VascaAthlete;
  laneNumero: number;
  total: number | null;
  laps: { n: number; dur: number; t: number }[];
}

export function buildSummary(s: VascaSession, now: number): AthleteSummary[] {
  const out: AthleteSummary[] = [];
  for (const lane of s.lanes) {
    for (const a of lane.atleti) {
      const laps = a.laps.map((l, i) => {
        // durata = t - start (inizio ripetizione); per i lap legacy senza
        // `start` si usa il vecchio riferimento (lap precedente o primoVia).
        const fallback = i > 0 ? a.laps[i - 1].t : (a.primoVia ?? l.t);
        const base = l.start ?? fallback;
        return { n: i + 1, dur: Math.max(0, l.t - base), t: l.t };
      });
      out.push({ athlete: a, laneNumero: lane.numero, total: totalMs(s, a, now), laps });
    }
  }
  return out;
}

/**
 * Migra una sessione caricata da LocalStorage: completa `start` nei lap
 * vecchi con un fallback prudente (stesso riferimento usato in passato:
 * lap precedente o primoVia), cosi' le durate non cambiano dopo l'aggiornamento.
 */
export function migrateSession(s: VascaSession): VascaSession {
  for (const lane of s.lanes) {
    for (const a of lane.atleti) {
      a.laps.forEach((l, i) => {
        if (l.start == null) {
          l.start = i > 0 ? (a.laps[i - 1].t ?? l.t) : (a.primoVia ?? l.t);
        }
      });
    }
  }
  return s;
}

export function summaryText(s: VascaSession, now: number, vascaMetri: number): string {
  const lines: string[] = [];
  lines.push('FINPcoach — Sessione bordo vasca');
  lines.push(`Data: ${new Date().toLocaleDateString('it-IT')} · Vasca ${vascaMetri}m`);
  lines.push('');
  for (const item of buildSummary(s, now)) {
    const a = item.athlete;
    const nome = a.cognome || `Atleta ${a.atletaId ?? ''}`;
    const tot = item.total != null ? formatMs(item.total) : '—';
    lines.push(`C${item.laneNumero} · ${nome} — ${tot} · ${a.laps.length} ripetizioni`);
    if (a.laps.length > 0) {
      lines.push(`  split: ${item.laps.map(l => formatMs(l.dur)).join(' · ')}`);
    }
  }
  return lines.join('\n');
}
