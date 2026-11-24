/**
 * R5 — Monitoraggio quota LocalStorage.
 *
 * La quota reale del WebView non è esposta: `navigator.storage.estimate()`
 * restituisce la quota del origin (su Android WebView è la stessa pool di
 * localStorage). Se non disponibile si usa QUOTA_FALLBACK_BYTES, calibrata
 * sulla misura reale del Pixel .qa (vedi docs/qa/QUOTA-STORAGE.md).
 */

/** Soglia di avviso all'utente (70% della quota). */
export const SOGLIA_AVVISO = 0.7;

/** Fallback se navigator.storage.estimate non è disponibile (misura .qa). */
export const QUOTA_FALLBACK_BYTES = 5_000_000;

export interface QuotaInfo {
  /** Byte occupati dalle chiavi localStorage (UTF-8). */
  usato: number;
  /** Quota stimata in byte. */
  quota: number;
  /** 0..1 — percentuale di utilizzo. */
  percent: number;
  /** true se la quota viene da estimate() e non dal fallback. */
  stimata: boolean;
}

/** Somma UTF-8 di chiavi+valori di localStorage (solo same-origin). */
export function misuraUtilizzoStorage(): number {
  try {
    const enc = new TextEncoder();
    let tot = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      tot += enc.encode(k).length + enc.encode(localStorage.getItem(k) ?? '').length;
    }
    return tot;
  } catch {
    return 0;
  }
}

/** Quota del origin via StorageManager.estimate(); fallback altrimenti. */
export async function quotaStimata(): Promise<{ quota: number; stimata: boolean }> {
  try {
    const nav = navigator as Navigator & { storage?: { estimate?: () => Promise<{ quota?: number }> } };
    const q = await nav.storage?.estimate?.();
    if (q?.quota && q.quota > 0) return { quota: q.quota, stimata: true };
  } catch {
    /* noop */
  }
  return { quota: QUOTA_FALLBACK_BYTES, stimata: false };
}

export async function infoQuota(): Promise<QuotaInfo> {
  const usato = misuraUtilizzoStorage();
  const { quota, stimata } = await quotaStimata();
  return { usato, quota, percent: quota > 0 ? usato / quota : 0, stimata };
}

export function quotaEsaurita(info: QuotaInfo): boolean {
  return info.percent >= 1;
}

export function quotaInAllerta(info: QuotaInfo): boolean {
  return info.percent >= SOGLIA_AVVISO;
}
