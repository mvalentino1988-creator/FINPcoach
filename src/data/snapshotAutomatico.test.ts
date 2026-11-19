import { describe, it, expect, beforeEach } from 'vitest';
import { BACKUP_VERSIONE } from './backupValidate';

// Stub LocalStorage condiviso con storage.test.ts (stesso pattern).
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
(globalThis as Record<string, unknown>).window = { dispatchEvent: () => true };

import { FINPStorage } from './storage';
import {
  SNAPSHOT_KEY,
  SNAPSHOT_MAX,
  SNAPSHOT_COMPRESS_MIN_BYTES,
  listaSnapshot,
  salvaSnapshotDati,
  snapshotFlush,
  infoSnapshotPiuRecente,
  ripristinaSnapshot,
} from './snapshotAutomatico';
import { runMigrations, SCHEMA } from './migrations';

const SQUADRA = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1, nome: `N${i + 1}`, cognome: 'Test', stato: 'UFFICIALE' as const,
}));

describe('snapshotAutomatico', () => {
  beforeEach(() => {
    ls.clear();
    ls.setItem('finp_mode', 'live');
  });

  it('non crea snapshot se non ci sono dati', () => {
    expect(salvaSnapshotDati()).toBe(false);
    expect(listaSnapshot()).toHaveLength(0);
  });

  it('salva e ripristina i dati correnti', async () => {
    FINPStorage.saveAtleti(SQUADRA as never);
    expect(salvaSnapshotDati()).toBe(true);
    const info = infoSnapshotPiuRecente();
    expect(info?.numAtleti).toBe(5);

    FINPStorage.saveAtleti([]);
    expect(FINPStorage.getAtleti()).toHaveLength(0);
    expect(await ripristinaSnapshot(info!.ts)).toBe(true);
    expect(FINPStorage.getAtleti()).toHaveLength(5);
  });

  it('ruota gli snapshot mantenendo solo gli ultimi 3', () => {
    for (let i = 0; i < SNAPSHOT_MAX + 2; i++) {
      FINPStorage.saveAtleti([{ id: i + 1 } as never]);
      salvaSnapshotDati();
    }
    const lista = listaSnapshot();
    expect(lista).toHaveLength(SNAPSHOT_MAX);
    // Il più recente contiene l'ultimo id salvato.
    const info = infoSnapshotPiuRecente();
    expect(info?.numAtleti).toBe(1);
  });

  it('dataset grande: snapshot compresso gzip e ripristino funzionante', async () => {
    // Dati oltre la soglia di compressione: ~5.000 tempi simulati.
    const tempiGrandi = Array.from({ length: 5000 }, (_, i) => ({
      id: i + 1, atletaId: (i % 48) + 1, data: '2026-01-01', stile: 'STILE_LIBERO',
      distanzaMetri: 100, centesimi: 6000 + i, contesto: 'ALLENAMENTO',
      vascaMetri: 25, note: 'x'.repeat(40),
    }));
    FINPStorage.saveAtleti(SQUADRA as never);
    FINPStorage.saveTempi(tempiGrandi as never);
    expect(salvaSnapshotDati()).toBe(true);
    await snapshotFlush();

    const lista = listaSnapshot();
    expect(lista.length).toBeGreaterThan(0);
    const voce = lista[0] as { v?: number; gz?: string; numAtleti?: number };
    expect(voce.v).toBe(2);
    expect(typeof voce.gz).toBe('string');
    expect(voce.numAtleti).toBe(5);
    // Lo snapshot compresso è molto più piccolo dei dati grezzi.
    expect(ls.getItem(SNAPSHOT_KEY)!.length).toBeLessThan(SNAPSHOT_COMPRESS_MIN_BYTES);

    FINPStorage.saveTempi([]);
    expect(await ripristinaSnapshot(lista[0].ts)).toBe(true);
    expect(FINPStorage.getTempi()).toHaveLength(5000);
    expect(FINPStorage.getAtleti()).toHaveLength(5);
  });

  it('lo snapshot non contiene mai la chiave API (finp_ia_config)', () => {
    FINPStorage.saveIAConfig({ endpoint: 'e', apiKey: 'SEGRETO-XYZ', modello: 'm' } as never);
    FINPStorage.saveAtleti(SQUADRA as never);
    salvaSnapshotDati();
    const raw = ls.getItem(SNAPSHOT_KEY)!;
    expect(raw).not.toContain('SEGRETO-XYZ');
    expect(raw).not.toContain('finp_ia_config');
  });
});

describe('protezione dati nelle sostituzioni massive', () => {
  beforeEach(() => {
    ls.clear();
    ls.setItem('finp_mode', 'live');
    FINPStorage.saveAtleti(SQUADRA as never);
  });

  it('applyDemoSeed crea uno snapshot dei dati precedenti', async () => {
    FINPStorage.applyDemoSeed();
    const info = infoSnapshotPiuRecente();
    expect(info).not.toBeNull();
    expect(info!.numAtleti).toBe(5);
    expect(await ripristinaSnapshot(info!.ts)).toBe(true);
    expect(FINPStorage.getAtleti()).toHaveLength(5);
    expect(FINPStorage.getAtleti()[0].cognome).toBe('Test');
  });

  it('startLiveSquad crea uno snapshot prima di svuotare', async () => {
    FINPStorage.startLiveSquad();
    expect(FINPStorage.getAtleti()).toHaveLength(0);
    const info = infoSnapshotPiuRecente();
    expect(info!.numAtleti).toBe(5);
    await ripristinaSnapshot(info!.ts);
    expect(FINPStorage.getAtleti()).toHaveLength(5);
  });

  it('resetToDefault crea uno snapshot prima del reset', () => {
    FINPStorage.resetToDefault();
    const info = infoSnapshotPiuRecente();
    expect(info).not.toBeNull();
    expect(info!.numAtleti).toBe(5);
  });

  it('importBackup valido crea uno snapshot dei dati sostituiti', async () => {
    const backup = JSON.stringify({
      version: BACKUP_VERSIONE,
      timestamp: new Date().toISOString(),
      atleti: [{ id: 999, nome: 'Import', cognome: 'Backup' }],
      mode: 'live',
    });
    const r = FINPStorage.importBackup(backup);
    expect(r.ok).toBe(true);
    expect(FINPStorage.getAtleti()[0].id).toBe(999);
    const info = infoSnapshotPiuRecente();
    expect(info!.numAtleti).toBe(5);
    await ripristinaSnapshot(info!.ts);
    expect(FINPStorage.getAtleti()[0].cognome).toBe('Test');
  });

  it('importBackup rifiutato NON crea snapshot', () => {
    const r = FINPStorage.importBackup('{rotto');
    expect(r.ok).toBe(false);
    expect(listaSnapshot()).toHaveLength(0);
  });

  it('getMode non sostituisce dati utente con il seed demo', () => {
    // Simula chiave mode persa ma dati presenti (vecchia versione/import).
    ls.removeItem('finp_mode');
    const mode = FINPStorage.getMode();
    expect(mode).toBe('live');
    expect(FINPStorage.getAtleti()).toHaveLength(5);
    expect(FINPStorage.getAtleti()[0].cognome).toBe('Test');
  });

  it('getMode semina il demo solo su installazione vuota', () => {
    ls.clear();
    const mode = FINPStorage.getMode();
    expect(mode).toBe('demo');
    expect(FINPStorage.getAtleti().length).toBeGreaterThan(0);
  });
});

describe('migrazioni con dati reali', () => {
  beforeEach(() => {
    ls.clear();
  });

  it('runMigrations con onBeforeWrite salva snapshot prima di riscrivere', () => {
    // Forza una migrazione reale: assegnazione vasca v1 -> v2.
    ls.setItem('finp_atleti', JSON.stringify(SQUADRA));
    ls.setItem('finp_vasca_assegnazione_v1', JSON.stringify({
      data: '2026-01-01', numeroCorsie: 3, corsie: [], ripartenzaGenerale: 30,
    }));
    // Marca tutte le altre chiavi come aggiornate, lascia solo l'assegnazione a v1.
    const versioni: Record<string, number> = {};
    for (const s of SCHEMA) versioni[s.key] = s.version;
    versioni['finp_vasca_assegnazione_v1'] = 1;
    ls.setItem('finp_schema_migrations', JSON.stringify(versioni));

    let snapshotChiamato = false;
    const report = runMigrations(ls as never, () => { snapshotChiamato = true; salvaSnapshotDati(); });
    expect(snapshotChiamato).toBe(true);
    expect(report.migrated).toContain('finp_vasca_assegnazione_v1');
    const info = infoSnapshotPiuRecente();
    expect(info!.numAtleti).toBe(5);
  });

  it('runMigrations senza migrazioni pendenti non crea snapshot', () => {
    ls.setItem('finp_atleti', JSON.stringify(SQUADRA));
    const versioni: Record<string, number> = {};
    for (const s of SCHEMA) versioni[s.key] = s.version;
    ls.setItem('finp_schema_migrations', JSON.stringify(versioni));

    let snapshotChiamato = false;
    runMigrations(ls as never, () => { snapshotChiamato = true; });
    expect(snapshotChiamato).toBe(false);
    expect(listaSnapshot()).toHaveLength(0);
  });
});
