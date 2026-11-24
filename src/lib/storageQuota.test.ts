// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { misuraUtilizzoStorage, infoQuota, quotaInAllerta, quotaEsaurita, SOGLIA_AVVISO, QUOTA_FALLBACK_BYTES } from './storageQuota';

describe('storageQuota', () => {
  beforeEach(() => localStorage.clear());

  it('misura l\'utilizzo in byte UTF-8 di chiavi e valori', () => {
    localStorage.setItem('a', 'x'.repeat(100));
    const usato = misuraUtilizzoStorage();
    expect(usato).toBeGreaterThanOrEqual(100);
    localStorage.setItem('b', 'è'.repeat(50)); // 2 byte UTF-8 ciascuno
    expect(misuraUtilizzoStorage()).toBeGreaterThan(usato);
  });

  it('infoQuota restituisce percentuale coerente', async () => {
    localStorage.setItem('k', 'v'.repeat(1000));
    const q = await infoQuota();
    expect(q.usato).toBeGreaterThan(0);
    expect(q.quota).toBeGreaterThan(0);
    expect(q.percent).toBeCloseTo(q.usato / q.quota, 5);
    expect(quotaEsaurita(q)).toBe(false);
  });

  it('soglie: alert oltre 70%, esaurita a 100%', () => {
    expect(quotaInAllerta({ usato: 800, quota: 1000, percent: 0.8, stimata: true })).toBe(true);
    expect(quotaInAllerta({ usato: 600, quota: 1000, percent: 0.6, stimata: true })).toBe(false);
    expect(quotaEsaurita({ usato: 1000, quota: 1000, percent: 1, stimata: true })).toBe(true);
    expect(SOGLIA_AVVISO).toBe(0.7);
    expect(QUOTA_FALLBACK_BYTES).toBeGreaterThan(0);
  });
});
