// @vitest-environment jsdom
/**
 * QUINTO GIRO — Fase 2.4: test del backend IndexedDB (kvStore) con
 * fake-indexeddb. Copre: migrazione da localStorage, interruzione a metà,
 * idempotenza, verifica checksum, scritture concorrenti, flush, recupero.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  bootKvStore,
  flushKvStore,
  kvGet,
  kvSet,
  kvDel,
  kvPronto,
  kvCacheKeys,
  isLocalStorageKey,
  checksumStringa,
  conteggioElementi,
  __resetKvStoreForTest,
} from './kvStore';
import { FINPStorage } from './storage';
import { salvaSnapshotDati, listaSnapshot, snapshotFlush } from './snapshotAutomatico';

const IDB = (globalThis as Record<string, unknown>).indexedDB as IDBFactory;

/** Cancella tutto il database finto (tra un test e l'altro). */
async function resetIdb(): Promise<void> {
  __resetKvStoreForTest();
  await Promise.race([
    new Promise<void>(res => {
      const req = IDB.deleteDatabase('finpcoach-kv');
      req.onsuccess = req.onerror = req.onblocked = () => res();
    }),
    new Promise<void>(res => setTimeout(res, 3000)),
  ]);
}

function semiDatasetLocalStorage(): void {
  localStorage.clear();
  localStorage.setItem('finp_mode', 'live');
  localStorage.setItem('finp_atleti', JSON.stringify([{ id: 1, nome: 'A', cognome: 'B' }]));
  localStorage.setItem('finp_tempi', JSON.stringify([{ id: 1, atletaId: 1, tempo: '01:00' }]));
  localStorage.setItem('finp_log_sedute', JSON.stringify([{ id: 1, atletaId: 1 } , { id: 2, atletaId: 1 }]));
  localStorage.setItem('finp_impostazioni', JSON.stringify({ giorni: [1, 3] }));
  localStorage.setItem('finp_snapshot_auto_v1', JSON.stringify([{ ts: 1, voci: {} }]));
  localStorage.setItem('finp_schema_migrations', JSON.stringify({ finp_atleti: 1 }));
  localStorage.setItem('finp_vasca_session_v1', JSON.stringify({ stato: 'in_corso', lanes: [] }));
  // Impostazioni piccole: NON devono migrare.
  localStorage.setItem('finp_theme_mode', 'scuro');
  localStorage.setItem('finp_onboarded', '1');
}

describe('kvStore — boot e migrazione', () => {
  beforeEach(async () => {
    await resetIdb();
    localStorage.clear();
  });

  it('senza dati migra comunque e passa in modalità IDB', async () => {
    await bootKvStore();
    expect(kvPronto()).toBe(true);
    expect(localStorage.getItem('finp_idb_state')).toBe('v1');
  });

  it('migra tutte le chiavi dati da localStorage e le rimuove da LS', async () => {
    semiDatasetLocalStorage();
    await bootKvStore();
    expect(kvPronto()).toBe(true);
    // Dati leggibili dalla cache
    expect(kvGet('finp_atleti')).toContain('"id":1');
    expect(kvGet('finp_log_sedute')).toContain('"id":2');
    // Rimossi da localStorage
    expect(localStorage.getItem('finp_atleti')).toBeNull();
    expect(localStorage.getItem('finp_tempi')).toBeNull();
    expect(localStorage.getItem('finp_snapshot_auto_v1')).toBeNull();
    expect(localStorage.getItem('finp_vasca_session_v1')).toBeNull();
    // Whitelist resta in LS
    expect(localStorage.getItem('finp_theme_mode')).toBe('scuro');
    expect(localStorage.getItem('finp_onboarded')).toBe('1');
    expect(kvGet('finp_theme_mode')).toBe('scuro');
  });

  it('la migrazione è idempotente: il secondo boot non ricopia', async () => {
    semiDatasetLocalStorage();
    await bootKvStore();
    // Secondo boot sullo stesso IDB
    __resetKvStoreForTest();
    await bootKvStore();
    expect(kvPronto()).toBe(true);
    expect(kvGet('finp_atleti')).toContain('"id":1');
    expect(localStorage.getItem('finp_atleti')).toBeNull();
  });

  it('interruzione a metà (IDB parziale senza marcatore) => riprende da LS', async () => {
    semiDatasetLocalStorage();
    // Simula una migrazione interrotta: IDB con dati parziali/corrotti, LS integro.
    const parziale = await new Promise<IDBDatabase>((res, rej) => {
      const r = IDB.open('finpcoach-kv', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv', { keyPath: 'k' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = parziale.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ k: 'finp_atleti', v: '[{"id":999}]' });
      tx.objectStore('kv').put({ k: 'finp_tempi', v: 'CORROTTO' });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    parziale.close();

    await bootKvStore();
    expect(kvPronto()).toBe(true);
    // LS era autoritativa: i dati corretti vincono sul parziale.
    expect(kvGet('finp_atleti')).toContain('"id":1');
    expect(kvGet('finp_tempi')).toContain('"id":1');
    expect(localStorage.getItem('finp_atleti')).toBeNull();
  });

  it('crash dopo il marcatore ma prima della pulizia LS => residui eliminati', async () => {
    semiDatasetLocalStorage();
    await bootKvStore();
    // Simula che LS abbia ancora le chiavi (crash fra marcatore e delete):
    // le rimetto e faccio un nuovo boot.
    localStorage.setItem('finp_atleti', '[{"id":1,"vecchio":true}]');
    localStorage.setItem('finp_tempi', '[]');
    __resetKvStoreForTest();
    await bootKvStore();
    // IDB resta autoritativa: i valori in cache sono quelli migrati.
    expect(kvGet('finp_atleti')).not.toContain('vecchio');
    expect(localStorage.getItem('finp_atleti')).toBeNull();
    expect(localStorage.getItem('finp_tempi')).toBeNull();
  });
});

describe('kvStore — scritture e flush', () => {
  beforeEach(async () => {
    await resetIdb();
    localStorage.clear();
    semiDatasetLocalStorage();
    await bootKvStore();
  });

  it('scritture concorrenti: cache subito, IDB dopo flush', async () => {
    kvSet('finp_atleti', JSON.stringify([{ id: 1 }, { id: 2 }]));
    kvSet('finp_tempi', JSON.stringify([{ id: 9 }]));
    // Cache aggiornata subito
    expect(kvGet('finp_atleti')).toContain('"id":2');
    await flushKvStore();
    // IDB ha i valori
    __resetKvStoreForTest();
    await bootKvStore();
    expect(kvGet('finp_atleti')).toContain('"id":2');
    expect(kvGet('finp_tempi')).toContain('"id":9');
  });

  it('kvDel elimina da cache e da IDB', async () => {
    kvDel('finp_tempi');
    expect(kvGet('finp_tempi')).toBeNull();
    await flushKvStore();
    __resetKvStoreForTest();
    await bootKvStore();
    expect(kvGet('finp_tempi')).toBeNull();
    expect(kvGet('finp_atleti')).not.toBeNull();
  });

  it('whitelist resta in localStorage anche dopo scritture', async () => {
    kvSet('finp_theme_mode', 'chiaro');
    kvSet('finp_layout_scelto', 'flottante');
    await flushKvStore();
    expect(localStorage.getItem('finp_theme_mode')).toBe('chiaro');
    expect(localStorage.getItem('finp_layout_scelto')).toBe('flottante');
  });
});

describe('kvStore — integrazione FINPStorage / snapshot', () => {
  beforeEach(async () => {
    await resetIdb();
    localStorage.clear();
    semiDatasetLocalStorage();
    await bootKvStore();
  });

  it('FINPStorage legge/scrive via cache IDB', () => {
    const atleti = FINPStorage.getAtleti();
    expect(atleti).toHaveLength(1);
    FINPStorage.saveAtleti([{ id: 1, nome: 'A', cognome: 'B', stato: 'UFFICIALE', fattoreVolume: 1, note: '', volumeAuto: true }, { id: 2, nome: 'C', cognome: 'D', stato: 'UFFICIALE', fattoreVolume: 1, note: '', volumeAuto: true }]);
    expect(FINPStorage.getAtleti()).toHaveLength(2);
    expect(localStorage.getItem('finp_atleti')).toBeNull();
  });

  it('exportBackup -> importBackup con backend IDB', async () => {
    // Dataset valido completo (quello di stress) per superare la validazione.
    const { datasetStress } = await import('../test/stressDataset');
    const json = datasetStress().json;
    const r = FINPStorage.importBackup(json);
    expect(r.ok).toBe(true);
    await flushKvStore();
    expect(FINPStorage.getAtleti().length).toBe(100);
    expect(localStorage.getItem('finp_atleti')).toBeNull();
    // Re-import dello stesso backup: idempotente.
    const r2 = FINPStorage.importBackup(json);
    expect(r2.ok).toBe(true);
    await flushKvStore();
    expect(FINPStorage.getAtleti().length).toBe(100);
  });

  it('salvaSnapshotDati + ripristino funzionano su IDB', async () => {
    salvaSnapshotDati();
    await snapshotFlush();
    await flushKvStore();
    const lista = listaSnapshot();
    expect(lista.length).toBeGreaterThan(0);
    // mutazione e ripristino
    FINPStorage.saveAtleti([{ id: 42, nome: 'Z', cognome: 'W' } as never]);
    const { ripristinaSnapshot } = await import('./snapshotAutomatico');
    expect(await ripristinaSnapshot(lista[0].ts)).toBe(true);
    await flushKvStore();
    expect(FINPStorage.getAtleti()).toHaveLength(1);
  });
});

describe('kvStore — utilità', () => {
  it('checksum e conteggio sono deterministici', () => {
    expect(checksumStringa('abc')).toBe(checksumStringa('abc'));
    expect(checksumStringa('abc')).not.toBe(checksumStringa('abd'));
    expect(conteggioElementi('[1,2,3]')).toBe(3);
    expect(conteggioElementi('{"a":1}')).toBe(1);
    expect(conteggioElementi('non-json')).toBe(-1);
  });

  it('isLocalStorageKey riconosce la whitelist', () => {
    expect(isLocalStorageKey('finp_mode')).toBe(true);
    expect(isLocalStorageKey('finp_theme_mode')).toBe(true);
    expect(isLocalStorageKey('finp_atleti')).toBe(false);
    expect(isLocalStorageKey('finpcoach_custom_workouts')).toBe(false);
  });
});
