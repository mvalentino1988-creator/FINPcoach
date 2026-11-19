/**
 * FASE C — Stress test automatici di dominio sul dataset da 100 atleti
 * (48 presenti nel giorno di prova). Budget misurati con performance.now.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { datasetStress } from '../test/stressDataset';
import {
  Atleta, Assenza, Gara, IscrizioneGara, LogSeduta, Microciclo,
  Stagione, Tempo, ImpostazioniPiano, Macrociclo, Mesociclo
} from '../types';
import { VolumeIndividuale } from './volumeIndividuale';
import { PianoGenerator } from './pianoGenerator';
import { PianoValidator, AtletaValidator } from './validatori';
import { CalcoloScienzaNuoto } from './calcoloCSS';
import { isAssenteInData, presentiEffettiviInData } from './assenze';
import { nuovaAssegnazione, assegnaAtleta, corsiaDiAtleta, atletiAssegnati } from './assegnazioneVasca';
import { suggerisciComposizioneCorsie } from './composizioneCorsie';
import { RegolamentiService, __resetRegolamentiIndiceForTest } from './regolamentiService';
import { __setPayloadRegolamentiForTest } from '../data/staticData';

function storageMemoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}
(globalThis as Record<string, unknown>).localStorage = storageMemoria();
(globalThis as Record<string, unknown>).window = { dispatchEvent: () => true };

import { FINPStorage } from '../data/storage';
import { validaBackup } from '../data/backupValidate';
import { cifraBackup } from '../lib/backupCrypto';

interface Dati {
  atleti: Atleta[]; assenze: Assenza[]; tempi: Tempo[]; logSedute: LogSeduta[];
  gare: Gara[]; iscrizioniGare: IscrizioneGara[]; microcicli: Microciclo[];
  macrocicli: Macrociclo[]; mesocicli: Mesociclo[]; stagione: Stagione;
  impostazioni: ImpostazioniPiano; chiusure: { id: number; dal: string; al: string; motivo: string }[];
}

let d: Dati;
let json: string;

beforeAll(() => {
  const caricato = datasetStress();
  d = caricato.backup as unknown as Dati;
  json = caricato.json;
  const reg = JSON.parse(readFileSync(join(process.cwd(), 'public/data/regolamenti.json'), 'utf8'));
  __setPayloadRegolamentiForTest(reg);
  __resetRegolamentiIndiceForTest();
});

const ms = (fn: () => void): number => {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
};

describe('C1 — budget di prestazione con 100 atleti', () => {
  it(`volumi individuali 100 atleti x stagione < 500 ms`, () => {
    const elapsed = ms(() => {
      for (const a of d.atleti) {
        for (const m of d.microcicli) {
          VolumeIndividuale.settimana(m, a, d.assenze.filter(x => x.atletaId === a.id));
        }
      }
    });
    expect(elapsed).toBeLessThan(500);
  });

  it('generazione piano stagionale < 1 s', () => {
    const elapsed = ms(() => {
      PianoGenerator.genera(d.stagione, d.chiusure as never, d.gare, {
        giorniAllenamento: [1, 2, 4, 6],
        numeroMacrocicli: 2,
        metriBaseSeduta: 2500,
        settimaneCicloCarico: 3,
      });
    });
    expect(elapsed).toBeLessThan(1000);
  });

  it('PianoValidator su tutta la stagione < 200 ms', () => {
    const elapsed = ms(() => {
      PianoValidator.valida(d.stagione, d.microcicli, d.gare);
    });
    expect(elapsed).toBeLessThan(200);
  });

  it('ACWR per 100 atleti con 10.000+ log < 300 ms', () => {
    expect(d.logSedute.length).toBeGreaterThan(10000);
    // Carichi settimanali per atleta dalle presenze.
    const elapsed = ms(() => {
      for (const a of d.atleti) {
        const mieSettimane = new Map<string, number>();
        for (const l of d.logSedute) {
          if (l.atletaId !== a.id || !l.presente) continue;
          const sett = l.data.slice(0, 8) + '01'; // approximation: group by month-week via ISO week not needed for budget
          void sett;
          const key = l.data;
          mieSettimane.set(key, (mieSettimane.get(key) ?? 0) + l.metriEffettivi);
        }
        const carichi = [...mieSettimane.values()].slice(-5);
        CalcoloScienzaNuoto.calcolaACWR(carichi[carichi.length - 1] ?? 0, carichi.slice(0, -1));
      }
    });
    expect(elapsed).toBeLessThan(300);
  });

  it('ricerca regolamenti < 50 ms', () => {
    const elapsed = ms(() => {
      for (let i = 0; i < 20; i++) {
        RegolamentiService.cerca(i % 2 ? 'viraggio' : 'partenza', 5);
      }
    });
    expect(elapsed / 20).toBeLessThan(50);
  });

  it('filtri squadra su 100 atleti < 30 ms', () => {
    const elapsed = ms(() => {
      for (let i = 0; i < 10; i++) {
        const q = 'SIM-';
        d.atleti.filter(a => `${a.cognome} ${a.nome}`.toLowerCase().includes(q.toLowerCase()));
      }
    });
    expect(elapsed / 10).toBeLessThan(30);
  });

  it('validazione + importazione backup 100 atleti < 3 s', () => {
    let elapsed = ms(() => { validaBackup(json); });
    expect(elapsed).toBeLessThan(3000);
    elapsed = ms(() => { FINPStorage.importBackup(json); });
    expect(elapsed).toBeLessThan(3000);
    expect(FINPStorage.getAtleti().length).toBe(100);
  });

  it('esportazione cifrata < 3 s', async () => {
    const t0 = performance.now();
    const cifrato = await cifraBackup(json, 'stress-test');
    expect(cifrato.length).toBeGreaterThan(0);
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});

describe('C2 — correttezza su tutto il dataset', () => {
  it('invarianti di base del dataset', () => {
    expect(d.atleti).toHaveLength(100);
    expect(d.logSedute.length).toBeGreaterThan(10000);
    for (const m of d.microcicli) {
      expect(m.inizio <= m.fine).toBe(true);
    }
    // Ordinamento date nei tempi.
    for (const t of d.tempi) expect(/^\d{4}-\d{2}-\d{2}$/.test(t.data)).toBe(true);
  });

  it('nessun atleta con assenza TUTTO/ALLENAMENTO presente nei log di quella data', () => {
    // Invariante: nessun log con presente=true ricade in un'assenza che
    // copre l'allenamento (TUTTO o ALLENAMENTO; GARA-only non blocca).
    const perAtleta = new Map<number, Assenza[]>();
    for (const a of d.assenze) {
      const lista = perAtleta.get(a.atletaId) ?? [];
      lista.push(a);
      perAtleta.set(a.atletaId, lista);
    }
    let presentiTrovati = 0;
    for (const l of d.logSedute) {
      if (!l.presente) continue;
      presentiTrovati++;
      const mie = perAtleta.get(l.atletaId);
      if (!mie) continue;
      for (const a of mie) {
        if ((a.ambito ?? 'TUTTO') === 'GARA') continue;
        if (l.data >= a.dal && l.data <= a.al) {
          expect.unreachable(`presente=${l.data} dentro assenza ${a.ambito ?? 'TUTTO'} ${a.dal}..${a.al} (atleta ${l.atletaId})`);
        }
      }
    }
    expect(presentiTrovati).toBeGreaterThan(0);
  });

  it('ogni modulo domain produce risultati coerenti senza eccezioni', () => {
    // VolumeIndividuale: volumi >= 0 per tutti.
    for (const m of d.microcicli.slice(0, 10)) {
      for (const a of d.atleti.slice(0, 10)) {
        const v = VolumeIndividuale.settimana(m, a, d.assenze.filter(x => x.atletaId === a.id));
        expect(v.metri).toBeGreaterThanOrEqual(0);
      }
    }
    // Validator: nessun crash su tutto il dataset.
    const cond = (d as unknown as { condizioni?: never[] }).condizioni ?? [];
    for (const a of d.atleti.slice(0, 20)) {
      AtletaValidator.valida(a, cond as never, d.assenze, '2026-11-19');
    }
    // isAssenteInData coerente su tutte le assenze che coprono l'allenamento.
    for (const a of d.atleti.slice(0, 10)) {
      for (const ass of d.assenze.filter(x => x.atletaId === a.id && (x.ambito ?? 'TUTTO') !== 'GARA').slice(0, 3)) {
        expect(isAssenteInData(a.id, ass.dal, d.assenze, 'ALLENAMENTO')).toBe(true);
      }
    }
    // presentiEffettivi: sottoinsieme degli atleti.
    const presenti = presentiEffettiviInData('2026-11-19', d.atleti, d.assenze, null);
    expect(presenti.every(id => d.atleti.some(a => a.id === id))).toBe(true);
    expect(presenti.length).toBeLessThanOrEqual(100);
  });
});

describe('C3 — assegnazione corsie con 48 presenti', () => {
  it('48 presenti assegnati una sola volta, nessun assente', () => {
    const data = '2026-11-19';
    const override = (d.impostazioni.overrideSedute as Record<string, { atletiPresentiIds?: number[] }> | undefined)?.[data];
    const presenti = presentiEffettiviInData(data, d.atleti, d.assenze, override?.atletiPresentiIds ?? null);
    // Il giorno di prova ha esattamente 48 presenti (manifest + override).
    const manifest = datasetStress().manifest as { giornoProva?: { presenti?: number } };
    expect(manifest.giornoProva?.presenti).toBe(48);
    expect(presenti.length).toBe(48);

    // Costruisci un'assegnazione 6 corsie e assegna i presenti a turno
    // (8 per corsia). assegnaAtleta rifiuta chi non è in presentiIds.
    let ass = nuovaAssegnazione(data, 25, 6, presenti);
    const assegnati = new Set<number>();
    presenti.forEach((id, i) => {
      const corsia = (i % 6) + 1;
      const ok = assegnaAtleta(ass, id, corsia);
      if (ok) { ass = ok; assegnati.add(id); }
    });
    // Tutti i presenti devono essere assegnati esattamente una volta.
    const inCorsie = atletiAssegnati(ass);
    for (const id of inCorsie) expect(assegnati.has(id)).toBe(true);
    // Nessun assente (TUTTO/ALLENAMENTO) deve comparire.
    const assentiIds = new Set(d.assenze.filter(a => (a.ambito ?? 'TUTTO') !== 'GARA').map(a => a.atletaId));
    for (const id of inCorsie) {
      // attenti: un atleta puo' avere un'assenza GARA-only e restare presente
      const haAssenzaBloccante = d.assenze.some(x =>
        x.atletaId === id && (x.ambito ?? 'TUTTO') !== 'GARA' && x.dal <= data && x.al >= data
      );
      expect(haAssenzaBloccante).toBe(false);
      void assentiIds;
    }
    expect(inCorsie.size).toBe(presenti.length);
  });
});
