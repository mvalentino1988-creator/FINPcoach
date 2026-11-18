/**
 * Modalita' immersiva (nasconde le barre di sistema Android) per la
 * schermata cronometro live. Delegata al bridge nativo
 * window.AndroidBridge.setImmersive(); su web e' un no-op sicuro.
 */

import { androidBridge, callNative } from './nativeBridge';

let applied = false;

/** true se il bridge nativo supporta setImmersive. */
export function hasImmersive(): boolean {
  return typeof window !== 'undefined' && typeof window.AndroidBridge?.setImmersive === 'function';
}

/**
 * Attiva/disattiva le barre di sistema nascoste. Idempotente: richieste
 * ripetute con lo stesso valore non ripetono la chiamata nativa.
 * Ritorna true se la richiesta e' stata inviata al bridge.
 */
export function setImmersive(on: boolean): boolean {
  if (typeof window === 'undefined') return false;
  if (applied === on) return hasImmersive();
  const bridge = androidBridge();
  if (!bridge || typeof bridge.setImmersive !== 'function') return false;
  callNative(bridge, 'setImmersive', on);
  applied = on;
  return true;
}

/** Ripristina le barre di sistema (da chiamare sempre all'uscita). */
export function releaseImmersive(): void {
  setImmersive(false);
}

/** Stato corrente lato JS (per test e log). */
export function isImmersiveApplied(): boolean {
  return applied;
}

/** Solo per i test: resetta lo stato interno. */
export function _resetImmersiveForTests(): void {
  applied = false;
}
