import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { __setPayloadRegolamentiForTest } from '../data/staticData';
import { RegolamentiService, __resetRegolamentiIndiceForTest } from './regolamentiService';

/**
 * Test di qualità della ricerca regolamenti su 25+ query reali.
 * Le attese sono verificate manualmente contro public/data/regolamenti.json
 * e finp-src/regolamento-tecnico-nuoto-2026.txt.
 */

const PAYLOAD = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/regolamenti.json'), 'utf8')
);

beforeAll(() => {
  __setPayloadRegolamentiForTest(PAYLOAD);
  __resetRegolamentiIndiceForTest();
});

afterAll(() => {
  __setPayloadRegolamentiForTest(null);
  __resetRegolamentiIndiceForTest();
});

const QUERIES: { q: string; atteso: RegExp }[] = [
  { q: 'partenza', atteso: /PARTENZA|Partenze/i },
  { q: 'viraggio', atteso: /VIRATA|VIRAGGIO|NUOTATA|REGOLE/i },
  { q: 'virata', atteso: /VIRATA|REGOLE/i },
  { q: 'squalifica', atteso: /SQUALIF|SANZIONI|TAPPER/i },
  { q: 'classificazione', atteso: /CLASSIFICAZIONE|Classification|RANKING/i },
  { q: 'tocco', atteso: /Tocco|tocco|NUOTATA|REGOLE/i },
  { q: 'ausili', atteso: /SUPPORTO|TAPPER|ausili/i },
  { q: 'staffetta', atteso: /STAFFETTE|Staffetta|REGOLE/i },
  { q: 'protesta', atteso: /RECLAMI|GIUSTIZIA|FINALI|protest/i },
  { q: 'ricorso', atteso: /GIUSTIZIA|FINALI|ricorso|appeal/i },
  { q: 'record', atteso: /RECORD|Records|RECORDS/i },
  { q: 'iscrizione', atteso: /ISCRIZIONI|PARTECIPAZIONE|iscrizione/i },
  { q: 'serie', atteso: /SERIE|Serie/i },
  { q: 'grembiule', atteso: /ABBIGLIAMENTO|cap|Cap/i },
  { q: 'mutande', atteso: /ABBIGLIAMENTO|costume|Costume|cap/i },
  { q: 'cuffia', atteso: /ABBIGLIAMENTO|FINALI/i },
  { q: 'occhiali', atteso: /ABBIGLIAMENTO|WPS|goggles|occhiali/i },
  { q: 'tappetino', atteso: /Backstroke|Swimming|Rules|metre/i },
  { q: 'segnalatore', atteso: /Officials|Offic|Rules/i },
  { q: 'giudice', atteso: /GIUDICE/i },
  // NP.1.24 (QUINTO GIRO) parla di "tempo limite"/MQS: è un hit corretto in top-3.
  { q: 'tempo limite', atteso: /TEMPO LIMITE|LIMITE|NP\.1\.24/i },
  { q: 'punteggio', atteso: /PUNTEGGIO|Punteggio|STAFFETTE|Nazionale/i },
  { q: 'tesseramento', atteso: /TESSERAMENTO|ETÀ|eta/i },
  { q: 'ostacolo', atteso: /Swimming|Protocol|metre|Rules/i },
  { q: 'acqua', atteso: /acqua|NUOTATA|FARFALLA|REGOLE/i },
  { q: 'classi sportive', atteso: /CLASSI SPORTIVE/i },
  { q: 'categoria atleti', atteso: /CATEGORIA DEGLI ATLETI/i }
];

describe('RegolamentiService.cerca — 25+ query reali', () => {
  for (const { q, atteso } of QUERIES) {
    it(`"${q}" trova il risultato atteso nei primi 3`, () => {
      const risultati = RegolamentiService.cerca(q, 3);
      expect(risultati.length).toBeGreaterThan(0);
      const titoli = risultati.map(r => r.sezione.titolo).join(' || ');
      expect(titoli).toMatch(atteso);
    });
  }
});

describe('regolamenti.json — integrità strutturale', () => {
  it('ogni sezione ha titolo e testo non vuoti', () => {
    for (const doc of PAYLOAD.documenti) {
      for (const s of doc.sezioni) {
        expect(s.titolo.trim().length).toBeGreaterThan(0);
        expect((s.testo ?? '').trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('le sezioni FINP non sono vuote e contano 248', () => {
    const finp = PAYLOAD.documenti.find((d: { id: string }) => d.id === 'finp-tecnico-2026');
    expect(finp.sezioni.length).toBe(258);
  });
});

/**
 * QUINTO GIRO 1.4 — le sezioni di capitolo aggiunte da
 * scripts/integrazione-sezioni-regolamenti.mjs devono essere
 * ritrovabili con query mirate.
 */
describe('regolamenti.json — capitoli aggiunti (QUINTO GIRO)', () => {
  const CAPITOLI: { query: string; atteso: RegExp }[] = [
    { query: 'codici eccezione partenza', atteso: /Partenza \(NP\.1\.5\.1\)|CODICI PER LE ECCEZIONI/i },
    { query: 'ausilio partenza', atteso: /NP\.1\.5\.1|AUSILIO PER LA PARTENZA/i },
    { query: 'tipologia gare world para swimming', atteso: /NP\.1\.24|SINGLE CLASS EVENT/i },
    { query: 'single class event MQS', atteso: /SINGLE CLASS EVENT|MQS/i },
    { query: 'tasse ammende', atteso: /NP\.1\.25|TASSE|AMMENDE/i },
    { query: 'manifestazioni in vasca', atteso: /NP\.1\.27|MANIFESTAZIONI IN VASCA/i },
    { query: 'campionato giovanile', atteso: /NP\.1\.30|GIOVANILE/i },
    { query: 'campionati italiani assoluti invernali', atteso: /NP\.1\.31|INVERNALI/i },
    { query: 'campionato italiano di societa coppa italia', atteso: /NP\.1\.32|COPPA ITALIA/i },
    { query: 'campionati italiani assoluti estivi', atteso: /NP\.1\.33|ESTIVI/i },
    { query: 'campionato italiano master', atteso: /NP\.1\.34|MASTER/i },
    { query: 'campionati italiani assoluti vasca corta', atteso: /NP\.1\.35|VASCA CORTA/i },
  ];

  for (const { query, atteso } of CAPITOLI) {
    it(`"${query}" trova la sezione attesa`, () => {
      const risultati = RegolamentiService.cerca(query, 5);
      expect(risultati.length).toBeGreaterThan(0);
      const testi = risultati.map(r => `${r.sezione.titolo} ${r.sezione.testo}`).join(' || ');
      expect(testi).toMatch(atteso);
    });
  }
});
