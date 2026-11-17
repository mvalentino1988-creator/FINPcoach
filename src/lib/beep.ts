/**
 * Beep di bordo vasca via WebAudio (nessuna risorsa esterna, funziona offline
 * nella WebView). L'AudioContext viene creato al primo gesto utente.
 */

let ctx: AudioContext | null = null;

/** Feedback acustico/tattile attivo? Disattivabile dalle impostazioni (Aspetto). */
export function feedbackAttivo(): boolean {
  try {
    return localStorage.getItem('finp_feedback') !== 'off';
  } catch {
    return true;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Suono breve (default ~140ms, 880Hz). Chiamare dopo un gesto utente. */
export function beep(freq = 880, durMs = 140, gain = 0.08): void {
  if (!feedbackAttivo()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ac.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + durMs / 1000 + 0.02);
  } catch {
    /* noop */
  }
}

export function vibrate(pattern: number | number[] = [0, 120, 60, 120]): void {
  if (!feedbackAttivo()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}
