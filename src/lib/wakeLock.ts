/**
 * Utility per mantenere lo schermo sempre acceso durante il cronometraggio.
 * Supporta sia le Web Screen Wake Lock API standard (browser / PWA)
 * sia il bridge nativo Android (FLAG_KEEP_SCREEN_ON via AndroidBridge).
 */

import { androidBridge, callNative } from './nativeBridge';

let wakeLockSentinel: WakeLockSentinel | null = null;
let isRequested = false;

export async function requestKeepScreenOn(): Promise<boolean> {
  isRequested = true;

  // 1. Android Bridge nativo (wrapper sicuro: mai eccezioni)
  callNative(androidBridge(), 'setKeepScreenOn', true);

  // 2. Web Wake Lock API
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel || wakeLockSentinel.released) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } catch (err) {
      console.warn('Navigator wakeLock request failed:', err);
    }
  }

  return false;
}

export async function releaseKeepScreenOn(): Promise<void> {
  isRequested = false;

  // 1. Android Bridge nativo (wrapper sicuro: mai eccezioni)
  callNative(androidBridge(), 'setKeepScreenOn', false);

  // 2. Web Wake Lock API
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn('Navigator wakeLock release error:', err);
    } finally {
      wakeLockSentinel = null;
    }
  }
}

// Se la pagina torna in primo piano e il cronometro è attivo, riacquisisci il blocco
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRequested) {
      requestKeepScreenOn();
    }
  });
}
