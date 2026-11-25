/**
 * R5/QUINTO GIRO — Monitoraggio quota storage.
 *
 * Da QUINTO GIRO i dati vivono in IndexedDB (kvStore): la quota di
 * localStorage (~5 MB) non è più il limite pratico. `infoQuota()` usa
 * `navigator.storage.estimate()` che restituisce uso e quota reali
 * dell'origin (IndexedDB + Cache + localStorage).
 *
 * Se estimate() non è disponibile si ricade sulla misura UTF-8 di
 * localStorage e sulla quota stimata di fallback (solo per la parte
 * ancora in LS: impostazioni piccole).
 */

/** Soglia di avviso all'utente (70% della quota). */
export const SOGLIA_AVVISO = 0.7;

/**
 * Quota di localStorage (legacy, ~5 MB misurati su Pixel).
 * Mantenuta come fallback quando `navigator.storage.estimate()` manca.
 */
export const QUOTA_LOCALSTORAGE_BYTES = 5_000_000;

/** @deprecated Usare QUOTA_LOCALSTORAGE_BYTES. Mantenuto per compat. test. */
export const QUOTA_FALLBACK_BYTES = QUOTA_LOCALSTORAGE_BYTES;

export interface QuotaInfo {
  /** Byte occupati nello storage dell'origin (IDB+LS+cache) o, in fallback, solo LS. */
  usato: number;
  /** Quota stimata in byte. */
  quota: number;
  /** 0..1 — percentuale di utilizzo. */
  percent: number;
  /** true se la quota viene dal fallback e non da estimate(). */
  stimata: boolean;
  /** Byte usati dalla sola localStorage (dettaglio). */
  localStorageBytes?: number;
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

export async function infoQuota(): Promise<QuotaInfo> {
  const localStorageBytes = misuraUtilizzoStorage();
  try {
    const nav = navigator as Navigator & {
      storage?: { estimate?: () => Promise<{ usage?: number; quota?: number }> };
    };
    const est = nav.storage?.estimate ? await nav.storage.estimate() : null;
    if (est && typeof est.quota === 'number' && est.quota > 0) {
      const usato = typeof est.usage === 'number' ? est.usage : localStorageBytes;
      return {
        usato,
        quota: est.quota,
        percent: usato / est.quota,
        stimata: false,
        localStorageBytes,
      };
    }
  } catch {
    /* estimate non disponibile */
  }
  return {
    usato: localStorageBytes,
    quota: QUOTA_LOCALSTORAGE_BYTES,
    percent: localStorageBytes / QUOTA_LOCALSTORAGE_BYTES,
    stimata: true,
    localStorageBytes,
  };
}

export function quotaEsaurita(info: QuotaInfo): boolean {
  return info.percent >= 1;
}

export function quotaInAllerta(info: QuotaInfo): boolean {
  return info.percent >= SOGLIA_AVVISO;
}
