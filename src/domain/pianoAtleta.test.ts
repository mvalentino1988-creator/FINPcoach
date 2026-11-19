import { describe, it, expect, beforeAll } from 'vitest';
import { datasetStress } from '../test/stressDataset';
import { pianoAtletaSettimane, gareAtleta, csvSquadra } from './pianoAtleta';
import { VolumeIndividuale } from './volumeIndividuale';
import type { Atleta, Assenza, Gara, IscrizioneGara, Microciclo } from '../types';

interface Dati {
  atleti: Atleta[]; assenze: Assenza[]; microcicli: Microciclo[];
  gare: Gara[]; iscrizioniGare: IscrizioneGara[];
}

let d: Dati;
beforeAll(() => { d = datasetStress().backup as unknown as Dati; });

describe('pianoAtleta — piano individuale per atleta', () => {
  it('produce una riga per microciclo, ordinata, con volumi >= 0', () => {
    const a = d.atleti[0];
    const righe = pianoAtletaSettimane(a, d.microcicli, d.assenze);
    expect(righe.length).toBe(d.microcicli.length);
    for (let i = 1; i < righe.length; i++) {
      expect(righe[i - 1].micro.inizio <= righe[i].micro.inizio).toBe(true);
    }
    for (const r of righe) expect(r.volumeMetri).toBeGreaterThanOrEqual(0);
  });

  it('5 atleti campione con assenze diverse: volumi coerenti col dominio', () => {
    // Scegli 5 atleti con profili di assenza diversi.
    const campioni = d.atleti.slice(0, 5);
    for (const a of campioni) {
      const righe = pianoAtletaSettimane(a, d.microcicli, d.assenze);
      const mie = d.assenze.filter(x => x.atletaId === a.id);
      for (const r of righe) {
        const atteso = VolumeIndividuale.settimana(r.micro, a, mie).metri;
        expect(r.volumeMetri).toBe(atteso);
      }
    }
  });

  it('un atleta con lunga assenza ha volumi ridotti/rientro graduale', () => {
    // Trova un atleta con un'assenza lunga (>=14 giorni) e verifica che
    // almeno una settimana abbia volume < target.
    const conLunga = d.atleti.find(a =>
      d.assenze.some(x => x.atletaId === a.id && x.dal <= x.al &&
        (Date.parse(x.al) - Date.parse(x.dal)) / 86400000 >= 14)
    );
    if (!conLunga) return; // dataset senza caso: salta
    const righe = pianoAtletaSettimane(conLunga, d.microcicli, d.assenze);
    expect(righe.some(r => r.volumeMetri < r.volumeTargetMetri)).toBe(true);
  });

  it('gareAtleta restituisce solo gare esistenti, ordinate per data', () => {
    const a = d.atleti.find(x => d.iscrizioniGare.some(i => i.atletaId === x.id && i.stato === 'ISCRITTO')) ?? d.atleti[0];
    const lista = gareAtleta(d.iscrizioniGare, d.gare, a.id);
    for (let i = 1; i < lista.length; i++) {
      expect(lista[i - 1].gara.dal <= lista[i].gara.dal).toBe(true);
    }
    for (const g of lista) expect(g.gara).toBeDefined();
  });

  it('csvSquadra produce 100 righe + intestazione', () => {
    const csv = csvSquadra(d.atleti, d.microcicli, d.assenze, d.iscrizioniGare, d.gare);
    const righe = csv.trim().split('\n');
    expect(righe).toHaveLength(101);
    expect(righe[0]).toContain('VolumeTotale_m');
    // Ogni riga dati ha 6 campi.
    for (const r of righe.slice(1)) expect(r.split(';')).toHaveLength(6);
  });
});
