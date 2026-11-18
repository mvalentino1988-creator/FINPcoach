import { describe, it, expect, beforeEach } from 'vitest';
import { Atleta } from '../types';

// Stub LocalStorage per l'ambiente node di Vitest.
function storageMemoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

const ls = storageMemoria();
(globalThis as Record<string, unknown>).localStorage = ls;
(globalThis as Record<string, unknown>).window = {
  dispatchEvent: () => true,
};

import { FINPStorage } from './storage';
import { BACKUP_VERSIONE } from './backupValidate';

// getAtleti() semina il demo solo se la chiave manca o il JSON e illeggibile:
// qualsiasi rosa (vuota o con N atleti) viene preservata.
const SQUADRA_48: Atleta[] = Array.from({ length: 48 }, (_, i) => ({
  id: i + 1, nome: `N${i + 1}`, cognome: 'X', stato: 'UFFICIALE' as const,
  fattoreVolume: 1, note: '', volumeAuto: true,
}));

describe('FINPStorage — export/import backup', () => {
  beforeEach(() => {
    ls.clear();
    ls.setItem('finp_mode', 'live');
  });

  it('exportBackup non include mai iaConfig/apiKey', () => {
    FINPStorage.saveIAConfig({
      endpoint: 'https://api.example.com',
      apiKey: 'SEGRETO-KEY-123',
      modello: 'test',
    } as never);
    const json = FINPStorage.exportBackup();
    expect(json).not.toContain('SEGRETO-KEY-123');
    expect(json).not.toContain('iaConfig');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(BACKUP_VERSIONE);
    expect(parsed.mode).toBe('live');
  });

  it('importBackup rifiuta versioni future senza toccare i dati', () => {
    FINPStorage.saveAtleti(SQUADRA_48);
    const futuro = JSON.stringify({ version: '99.0', atleti: [], mode: 'demo' });
    const r = FINPStorage.importBackup(futuro);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('versione');
    expect(FINPStorage.getAtleti()).toHaveLength(48);
    expect(FINPStorage.getMode()).toBe('live');
  });

  it('importBackup con JSON corrotto non danneggia i dati', () => {
    FINPStorage.saveAtleti(SQUADRA_48);
    const r = FINPStorage.importBackup('{non-json');
    expect(r.ok).toBe(false);
    expect(FINPStorage.getAtleti()).toHaveLength(48);
  });

  it('importBackup valido applica i dati e preserva iaConfig', () => {
    FINPStorage.saveIAConfig({ endpoint: 'e', apiKey: 'K', modello: 'm' } as never);
    const backup = JSON.stringify({
      version: BACKUP_VERSIONE,
      timestamp: new Date().toISOString(),
      atleti: SQUADRA_48.map(a => ({ ...a, id: 100 + a.id })),
      mode: 'live',
    });
    const r = FINPStorage.importBackup(backup);
    expect(r.ok).toBe(true);
    expect(FINPStorage.getAtleti()[0].id).toBe(101);
    // iaConfig non deve essere toccato dall'import
    expect(FINPStorage.getIAConfig().apiKey).toBe('K');
  });

  it('getAtleti preserva rose diverse da 48 e squadre vuote', () => {
    FINPStorage.saveAtleti(SQUADRA_48.slice(0, 12));
    expect(FINPStorage.getAtleti()).toHaveLength(12);
    FINPStorage.saveAtleti([]);
    expect(FINPStorage.getAtleti()).toHaveLength(0);
    // ripristina per i test successivi
    FINPStorage.saveAtleti(SQUADRA_48);
  });

  it('segnalazione ultimo backup', () => {
    expect(FINPStorage.getUltimoBackup()).toBeNull();
    FINPStorage.segnaBackup();
    expect(FINPStorage.getUltimoBackup()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
