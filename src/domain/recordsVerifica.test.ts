import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { __setPayloadRecordForTest } from '../data/staticData';
import { RecordService } from './recordService';
import { parseTempo } from './tempoUtils';

/**
 * Verifica integrità di public/data/records.json (derivato da
 * finp-src/records.json, 4487 record grezzi -> 3684 normalizzati).
 * Il dataset dichiara meta.aggiornato = 26/07/2026.
 */

interface RawRecord {
  v: number; g: string; ev: string; cl: string; t: string; cat: string;
  tm: string; d: string | null; y: number | null; n: string | null;
  l: string | null; dt: string | null; m: string | null;
}

const PAYLOAD = JSON.parse(readFileSync(join(process.cwd(), 'public/data/records.json'), 'utf8'));

describe('records.json — integrità', () => {
  it('meta dichiara fonte e data di aggiornamento', () => {
    expect(PAYLOAD.meta.fonte).toContain('FINP');
    expect(PAYLOAD.meta.aggiornato).toBe('26/07/2026');
  });

  it('ogni record ha campi validi e tempo parsabile', () => {
    const vasi = new Set([25, 50]);
    const tipi = new Set(['ITA', 'EUR', 'WR']);
    const classi = new Set<string>();
    for (const r of PAYLOAD.records as RawRecord[]) {
      expect(vasi.has(r.v), `vasca ${r.v}`).toBe(true);
      expect(['M', 'F', 'M&F']).toContain(r.g);
      expect(r.ev.length).toBeGreaterThan(0);
      expect(r.cl.length).toBeGreaterThan(0);
      classi.add(r.cl);
      expect(tipi.has(r.t as never), `tipo ${r.t}`).toBe(true);
      expect(parseTempo(r.tm), `tempo ${r.tm}`).not.toBeNull();
    }
    // Le famiglie presenti: S*, SB*, SM* (PT se presenti)
    expect([...classi].some(c => /^S\d+$/.test(c))).toBe(true);
    expect([...classi].some(c => /^SB\d+$/.test(c))).toBe(true);
    expect([...classi].some(c => /^SM\d+$/.test(c))).toBe(true);
  });

  it('RecordService serve i filtri su evento/classe/genere/vasca', () => {
    __setPayloadRecordForTest(PAYLOAD);
    try {
      const ev50 = RecordService.eventi(50);
      expect(ev50.length).toBeGreaterThan(0);
      // Trova una combinazione (evento, genere) con classi disponibili.
      let ev = '';
      let genere = '';
      let classi: string[] = [];
      for (const e of ev50) {
        for (const g of RecordService.generi(50, e)) {
          const c = RecordService.classi(50, e, g);
          if (c.length > 0) { ev = e; genere = g; classi = c; break; }
        }
        if (classi.length > 0) break;
      }
      expect(classi.length).toBeGreaterThan(0);
      const recs = RecordService.perClasse(50, ev, genere, classi[0]);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].v).toBe(50);
      expect(recs[0].ev).toBe(ev);
      expect(recs[0].cl).toBe(classi[0]);
      // Nessun record di un'altra vasca deve comparire.
      expect(RecordService.perClasse(25, ev, genere, classi[0]).every(r => r.v === 25)).toBe(true);
    } finally {
      __setPayloadRecordForTest(null);
    }
  });
});
