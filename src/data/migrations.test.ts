import { describe, expect, it } from 'vitest';
import { SCHEMA, StorageLike, runMigrations, versioneSchema, MIGRATIONS_KEY } from './migrations';

function memoria(): StorageLike & { dump: () => Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: k => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

describe('migrations', () => {
  it('marca le chiavi assenti alla versione corrente senza errori', () => {
    const s = memoria();
    const r = runMigrations(s);
    expect(r.errors).toHaveLength(0);
    expect(r.migrated).toHaveLength(0);
    // Tutte le chiavi dello schema risultano alla loro versione.
    for (const k of SCHEMA) {
      expect(versioneSchema(s, k.key)).toBe(k.version);
    }
  });

  it('migra finp_vasca_assegnazione_v1 da v1 a v2 normalizzando', () => {
    const s = memoria();
    // Dato "vecchio" v1: ripartenze non multiple di 5 e campi sporchi.
    s.setItem('finp_vasca_assegnazione_v1', JSON.stringify({
      data: '2025-06-01',
      vascaMetri: 50,
      numeroCorsie: 4,
      presentiIds: [1, 2],
      corsie: [
        { numero: 1, atletiIds: [1, 1, 2], ripartenzaCorsia: 47, intervalloPartenza: 13, bloccata: false },
      ],
      ripartenzaGenerale: 62,
      ripartenzeAtleta: { 1: 33 },
    }));
    const r = runMigrations(s);
    expect(r.migrated).toContain('finp_vasca_assegnazione_v1');
    expect(versioneSchema(s, 'finp_vasca_assegnazione_v1')).toBe(2);

    const out = JSON.parse(s.getItem('finp_vasca_assegnazione_v1')!);
    expect(out.corsie[0].atletiIds).toEqual([1, 2]); // dedup
    expect(out.corsie[0].ripartenzaCorsia).toBe(45); // multiplo di 5
    expect(out.corsie[0].intervalloPartenza).toBe(15);
    expect(out.ripartenzaGenerale).toBe(60);
    expect(out.ripartenzeAtleta[1]).toBe(35);
    // Le corsie mancanti sono state create fino a numeroCorsie.
    expect(out.corsie).toHaveLength(4);
  });

  it('e\' idempotente: il secondo giro non riscrive nulla', () => {
    const s = memoria();
    s.setItem('finp_vasca_assegnazione_v1', JSON.stringify({ data: '2025-06-01', numeroCorsie: 2, corsie: [] }));
    const r1 = runMigrations(s);
    const snapshot = s.dump();
    const r2 = runMigrations(s);
    expect(r2.migrated).toHaveLength(0);
    expect(s.dump()).toEqual(snapshot);
    expect(r1.migrated.length).toBeGreaterThan(0);
  });

  it('JSON corrotto: salta la chiave e riporta l\'errore senza lanciare', () => {
    const s = memoria();
    s.setItem('finp_vasca_assegnazione_v1', '{non-json');
    const r = runMigrations(s);
    expect(r.errors.some(e => e.key === 'finp_vasca_assegnazione_v1')).toBe(true);
    // La chiave non è stata toccata e la versione non è avanzata.
    expect(s.getItem('finp_vasca_assegnazione_v1')).toBe('{non-json');
    expect(versioneSchema(s, 'finp_vasca_assegnazione_v1')).toBeUndefined();
  });

  it('chiavi di versioni precedenti esplicite vengono aggiornate', () => {
    const s = memoria();
    s.setItem(MIGRATIONS_KEY, JSON.stringify({ finp_vasca_assegnazione_v1: 1, finp_atleti: 1 }));
    s.setItem('finp_atleti', JSON.stringify([{ id: 1 }]));
    runMigrations(s);
    // finp_atleti è già v1 = versione corrente: resta com\'era.
    expect(JSON.parse(s.getItem('finp_atleti')!)).toEqual([{ id: 1 }]);
    expect(versioneSchema(s, 'finp_atleti')).toBe(1);
  });
});
