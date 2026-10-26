import { describe, it, expect } from 'vitest';
import {
  calcolaVolumeSessione,
  capDurataMetri,
  durataStimataMin,
  ripartisciSettimana,
  ricalibraSettimana,
  SedutaSettimana,
} from './volumePrescritto';
import {
  risolviParametriSeduta,
  normalizzaDurata,
  normalizzaVasca,
  conOverride,
  senzaOverride,
  seduteSettimana,
} from './parametriSeduta';
import { ImpostazioniPiano, Stagione } from '../types';

const STAGIONE = { vascaMetri: 25 } as Stagione;

describe('Parametri seduta - risoluzione', () => {
  it('usa il default di stagione quando non c\'e\' programmazione', () => {
    const imp: ImpostazioniPiano = { durataDefaultMin: 75 };
    const p = risolviParametriSeduta('2026-10-21', imp, STAGIONE);
    expect(p.vascaMetri).toBe(25);
    expect(p.durataMin).toBe(75);
    expect(p.origine).toBe('stagione');
  });

  it('la programmazione del giorno ha precedenza sul default', () => {
    const imp: ImpostazioniPiano = {
      durataDefaultMin: 75,
      parametriPerGiorno: { 3: { vascaMetri: 50, durataMin: 60 } },
    };
    const p = risolviParametriSeduta('2026-10-21', imp, STAGIONE);
    expect(p.vascaMetri).toBe(50);
    expect(p.durataMin).toBe(60);
    expect(p.origine).toBe('giorno');
  });

  it('l\'override della data ha precedenza su tutto', () => {
    const imp: ImpostazioniPiano = {
      durataDefaultMin: 75,
      parametriPerGiorno: { 3: { vascaMetri: 50, durataMin: 60 } },
      overrideSedute: { '2026-10-21': { vascaMetri: 25, durataMin: 45 } },
    };
    const p = risolviParametriSeduta('2026-10-21', imp, STAGIONE);
    expect(p.durataMin).toBe(45);
    expect(p.origine).toBe('override');
  });

  it('aggiunge e rimuove gli override', () => {
    const imp: ImpostazioniPiano = {};
    const con = conOverride(imp, '2026-10-21', { vascaMetri: 50, durataMin: 60 });
    expect(con.overrideSedute?.['2026-10-21'].vascaMetri).toBe(50);
    const senza = senzaOverride(con, '2026-10-21');
    expect(senza.overrideSedute?.['2026-10-21']).toBeUndefined();
  });

  it('normalizza vasca e durata', () => {
    expect(normalizzaVasca(50)).toBe(50);
    expect(normalizzaVasca(33)).toBe(25);
    expect(normalizzaDurata(10)).toBe(30);
    expect(normalizzaDurata(999)).toBe(210);
  });

  it('estrae le sedute della settimana sui giorni di allenamento', () => {
    const sedute = seduteSettimana('2026-10-21', [1, 3, 5]);
    expect(sedute).toContain('2026-10-21');
    expect(sedute).toHaveLength(3);
  });
});

describe('Volume prescritto - cap e quota', () => {
  it('il cap cresce con la durata e si riduce con il passo piu\' lento', () => {
    const corto = capDurataMetri(60, 6000);
    const lungo = capDurataMetri(120, 6000);
    const lento = capDurataMetri(60, 9000);
    expect(lungo).toBeGreaterThan(corto);
    expect(lento).toBeLessThan(corto);
  });

  it('la durata stimata e\' coerente con il cap', () => {
    const cap = capDurataMetri(60, 6000);
    expect(durataStimataMin(cap, 6000)).toBeLessThanOrEqual(60);
    expect(durataStimataMin(cap, 6000)).toBeGreaterThan(50);
  });

  it('la seduta non supera mai il cap di durata', () => {
    const res = calcolaVolumeSessione({
      micro: null,
      atleta: null,
      parametri: { vascaMetri: 25, durataMin: 45 },
      durateSettimana: [
        { data: '2026-10-19', parametri: { vascaMetri: 25, durataMin: 90 } },
        { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 45 } },
      ],
      volumeSettimanaFallback: 12000,
    });
    expect(res.metriSessione).toBeLessThanOrEqual(res.capDurataMetri);
  });

  it('a parita\' di settimana, una seduta piu\' lunga riceve piu\' metri', () => {
    const settimana: SedutaSettimana[] = [
      { data: '2026-10-19', parametri: { vascaMetri: 25, durataMin: 90 } },
      { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 90 } },
    ];
    const base = { micro: null, atleta: null, logSedute: [], volumeSettimanaFallback: 6000 };
    const corto = calcolaVolumeSessione({
      ...base,
      parametri: { vascaMetri: 25, durataMin: 45 },
      durateSettimana: [
        settimana[0],
        { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 45 } },
      ],
    });
    const lungo = calcolaVolumeSessione({ ...base, parametri: settimana[0].parametri, durateSettimana: settimana });
    expect(lungo.metriSessione).toBeGreaterThan(corto.metriSessione);
  });
});

describe('Volume prescritto - ripartizione e ricalibrazione', () => {
  const settimana: SedutaSettimana[] = [
    { data: '2026-10-19', parametri: { vascaMetri: 25, durataMin: 90 } },
    { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 90 } },
    { data: '2026-10-23', parametri: { vascaMetri: 25, durataMin: 90 } },
  ];

  it('ripartisce il volume settimanale proporzionalmente alla durata', () => {
    const rip = ripartisciSettimana(settimana, 6000, 6000);
    const totale = rip.reduce((s, r) => s + r.metri, 0);
    expect(totale).toBeGreaterThanOrEqual(5500);
    expect(totale).toBeLessThanOrEqual(6500);
  });

  it('una seduta piu\' lunga riceve piu\' metri nella ripartizione', () => {
    const rip = ripartisciSettimana(
      [
        { data: '2026-10-19', parametri: { vascaMetri: 25, durataMin: 60 } },
        { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 120 } },
      ],
      6000,
      6000
    );
    expect(rip[1].metri).toBeGreaterThan(rip[0].metri);
  });

  it('senza modifiche la ricalibrazione non cambia nulla', () => {
    const { variazioni } = ricalibraSettimana(settimana, settimana, 6000, 6000);
    expect(variazioni.every((v) => v.delta === 0)).toBe(true);
  });

  it('riducendo la durata i metri si spostano sulle sedute residue', () => {
    const dopo: SedutaSettimana[] = [
      { data: '2026-10-19', parametri: { vascaMetri: 25, durataMin: 90 } },
      { data: '2026-10-21', parametri: { vascaMetri: 25, durataMin: 45 } },
      { data: '2026-10-23', parametri: { vascaMetri: 25, durataMin: 90 } },
    ];
    const { variazioni } = ricalibraSettimana(settimana, dopo, 6000, 6000);
    const oggi = variazioni.find((v) => v.data === '2026-10-21');
    const future = variazioni.filter((v) => v.data !== '2026-10-21');
    expect(oggi?.delta).toBeLessThan(0);
    expect(future.some((v) => v.delta > 0)).toBe(true);
  });
});
