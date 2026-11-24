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

/**
 * Quota effective di localStorage.
 * ATTENZIONE: `navigator.storage.estimate().quota` su WebView Android
 * restituisce ~10 GiB (pool dell'intero origin: IndexedDB, Cache, ecc.) e NON
 * e' la quota di localStorage, che e' ~5 MB (misurato su Pixel .qa con
 * QuotaExceededError: fallimento a ~4,9-5,2 MB occupati).
 * Quota reale misurata: vedi docs/qa/QUOTA-STORAGE.md.
 */
export const QUOTA_LOCALSTORAGE_BYTES = 5_000_000;

export async function quotaStimata(): Promise<{ quota: number; stimata: boolean }> {
  return { quota: QUOTA_LOCALSTORAGE_BYTES, stimata: false };
}

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

/** @deprecated Usare QUOTA_LOCALSTORAGE_BYTES. Mantenuto per compat. test. */
export const QUOTA_FALLBACK_BYTES = QUOTA_LOCALSTORAGE_BYTES;

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
