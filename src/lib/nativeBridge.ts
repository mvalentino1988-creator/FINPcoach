/**
 * Wrapper sicuro per i bridge nativi Android (window.AndroidBridge e
 * window.NativeOrientation, vedi app/src/main/java/.../MainActivity.kt).
 *
 * Una chiamata al bridge non deve mai far saltare l'app: ogni errore
 * (bridge assente, metodo assente, eccezione Java) viene intercettato,
 * loggato e convertito in un valore di fallback. callNative non lancia mai.
 */

export interface AndroidBridgeApi {
  setSystemBarsDark?: (dark: boolean) => void;
  setKeepScreenOn?: (on: boolean) => void;
  exportTextFile?: (fileName: string, content: string) => boolean;
  printPage?: () => void;
  getSystemIsDark?: () => boolean;
}

export interface NativeOrientationApi {
  setOrientation?: (mode: string) => void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeApi;
    NativeOrientation?: NativeOrientationApi;
  }
}

export type NativeCallResult<R> =
  | { ok: true; value: R | undefined }
  | { ok: false };

function warn(message: string, error?: unknown): void {
  // Logger centrale per gli errori dei bridge nativi: una sola porta d'ingresso.
  console.warn(`[nativeBridge] ${message}`, error ?? '');
}

export function hasNativeMethod(
  bridge: object | null | undefined,
  method: string
): boolean {
  if (!bridge || typeof bridge !== 'object') return false;
  return typeof (bridge as Record<string, unknown>)[method] === 'function';
}

export function invokeNative<R = unknown>(
  bridge: object | null | undefined,
  method: string,
  ...args: unknown[]
): NativeCallResult<R> {
  if (!hasNativeMethod(bridge, method)) return { ok: false };
  try {
    const fn = (bridge as Record<string, (...a: unknown[]) => R>)[method];
    return { ok: true, value: fn.apply(bridge, args) };
  } catch (error) {
    warn(`chiamata fallita: ${method}`, error);
    return { ok: false };
  }
}

/**
 * Chiama un metodo del bridge e restituisce il valore o undefined in caso
 * di fallimento. Non lancia mai eccezioni.
 */
export function callNative<R = unknown>(
  bridge: object | null | undefined,
  method: string,
  ...args: unknown[]
): R | undefined {
  const result = invokeNative<R>(bridge, method, ...args);
  return result.ok ? result.value : undefined;
}

/** Accesso comodo ai bridge globali (solo browser). */
export function androidBridge(): AndroidBridgeApi | undefined {
  return typeof window === 'undefined' ? undefined : window.AndroidBridge;
}

export function nativeOrientationBridge(): NativeOrientationApi | undefined {
  return typeof window === 'undefined' ? undefined : window.NativeOrientation;
}
