/**
 * Controllo orientamento per la schermata Vasca.
 *
 * Priorità:
 *  1. Bridge nativo Android `window.NativeOrientation.setOrientation()`
 *     ("portrait" | "landscape" | "system").
 *  2. Fallback Web: `screen.orientation.lock()` (solo fullscreen/supportato).
 *  3. Nessun supporto: ritorna false -> la UI mostra un banner discreto.
 */

export type OrientationMode = 'portrait' | 'landscape' | 'system';

interface NativeOrientationBridge {
  setOrientation?: (mode: string) => void;
}

declare global {
  interface Window {
    NativeOrientation?: NativeOrientationBridge;
  }
}

/** true se il bridge nativo esiste. */
export function hasNativeOrientation(): boolean {
  return typeof window !== 'undefined' && typeof window.NativeOrientation?.setOrientation === 'function';
}

/**
 * Applica l'orientamento forzato. Ritorna 'native' | 'web' | 'none'.
 * 'system' ripristina il comportamento di sistema.
 */
export function applyOrientation(mode: OrientationMode): 'native' | 'web' | 'none' {
  if (typeof window === 'undefined') return 'none';

  if (hasNativeOrientation()) {
    try {
      window.NativeOrientation!.setOrientation!(mode);
      return 'native';
    } catch {
      /* fallback web */
    }
  }

  if (mode === 'system') {
    try {
      const so = screen.orientation as ScreenOrientation & { unlock?: () => void };
      so.unlock?.();
    } catch {
      /* noop */
    }
    return hasNativeOrientation() ? 'native' : 'web';
  }

  // Web fallback: lock ammesso solo in fullscreen e dove supportato.
  try {
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (typeof so?.lock === 'function' && document.fullscreenElement) {
      const p = so.lock(mode === 'landscape' ? 'landscape' : 'portrait');
      p?.catch?.(() => {});
      return 'web';
    }
  } catch {
    /* noop */
  }
  return 'none';
}

/** Ritorna all'orientamento di sistema (sicuro chiamare sempre). */
export function releaseOrientation(): void {
  applyOrientation('system');
}
