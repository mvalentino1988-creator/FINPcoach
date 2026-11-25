#!/usr/bin/env node
/**
 * QUINTO GIRO — Fase 1.4: aggiunge a public/data/regolamenti.json le sezioni
 * dei capitoli FINP mancanti, estratte VERBATIM da
 * finp-src/regolamento-tecnico-nuoto-2026.txt.
 *
 * Cleaning: stesso criterio delle sezioni esistenti — via le righe di
 * impaginazione (testata "Regolamento Settore Nuoto 2026", numeri di pagina,
 * form feed), trim + collasso degli spazi multipli, a-capo di paragrafo
 * preservati. Il testo non viene riscritto.
 *
 * Idempotente: se una sezione con lo stesso titolo esiste già, viene saltata.
 * Uso: node scripts/integrazione-sezioni-regolamenti.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TXT = join(root, 'finp-src', 'regolamento-tecnico-nuoto-2026.txt');
const JSON_PATH = join(root, 'public', 'data', 'regolamenti.json');

const righe = readFileSync(TXT, 'utf8').split(/\r?\n/);

function blocco(inizio, fine) {
  // 1-based, inclusivi.
  const out = [];
  for (let i = inizio; i <= fine && i <= righe.length; i++) {
    let r = righe[i - 1].replace(/\f/g, ' ').trim().replace(/ {2,}/g, ' ');
    if (!r) { out.push(''); continue; }
    if (/^Regolamento Settore Nuoto 2026\s*\d*$/i.test(r)) continue;
    if (/^\d{1,3}$/.test(r)) continue;
    out.push(r);
  }
  // Normalizza a-capi: niente spazi ai bordi, max 1 riga vuota.
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}

// [titolo, rigaInizioTesto, rigaFineTesto, anchorTitoloSezionePrecedente]
// La riga di titolo del capitolo NON entra nel testo (convenzione esistente).
const NUOVE = [
  {
    titolo: 'Partenza (NP.1.5.1)',
    testo: blocco(260, 267), // CODICI PER LE ECCEZIONI (NP.1.5) + codici H,Y,E,A,T
    anchor: 'T – NECESSITA DEI TAPPER',
  },
  {
    titolo: 'TIPOLOGIA DI GARE PREVISTE DAL WORLD PARA SWIMMING (NP.1.24)',
    testo: blocco(1265, 1296),
    anchor: 'TASSE ISCRIZIONI',
  },
  {
    titolo: 'TASSE e AMMENDE (NP.1.25)',
    // Capitolo senza corpo proprio: il testo è l'intestazione stessa (verbatim).
    testo: 'TASSE e AMMENDE (NP.1.25)',
    anchor: 'TASSE ISCRIZIONI',
    dopo: 'TIPOLOGIA DI GARE PREVISTE DAL WORLD PARA SWIMMING (NP.1.24)',
  },
  {
    titolo: 'MANIFESTAZIONI IN VASCA (NP.1.27)',
    testo: 'MANIFESTAZIONI IN VASCA (NP.1.27)',
    anchor: 'Modalità di partecipazione alle attività federali agonistiche (NP.1.27.1)',
  },
  {
    titolo: 'CAMPIONATO GIOVANILE DI NUOTO PARALIMPICO (NP.1.30)',
    testo: 'CAMPIONATO GIOVANILE DI NUOTO PARALIMPICO (NP.1.30)',
    anchor: 'PARTECIPAZIONE (NP.1.30.1) (parte 1)',
  },
  {
    titolo: 'CAMPIONATI ITALIANI ASSOLUTI INVERNALI DI NUOTO PARALIMPICO (NP.1.31)',
    testo: 'CAMPIONATI ITALIANI ASSOLUTI INVERNALI DI NUOTO PARALIMPICO (NP.1.31)',
    anchor: 'PARTECIPAZIONE (NP.1.31.1) (parte 1)',
  },
  {
    titolo: 'CAMPIONATO ITALIANO DI SOCIETA’ DI NUOTO PARALIMPICO COPPA ITALIA MASCHILE e COPPA ITALIA FEMMINILE DI NUOTO PARALIMPICO (NP.1.32)',
    testo: 'CAMPIONATO ITALIANO DI SOCIETA’ DI NUOTO PARALIMPICO COPPA ITALIA MASCHILE e COPPA ITALIA FEMMINILE DI NUOTO PARALIMPICO (NP.1.32)',
    anchor: 'PARTECIPAZIONE (NP.1.32.1)',
  },
  {
    titolo: 'CAMPIONATI ITALIANI ASSOLUTI ESTIVI DI NUOTO PARALIMPICO (NP.1.33)',
    testo: 'CAMPIONATI ITALIANI ASSOLUTI ESTIVI DI NUOTO PARALIMPICO (NP.1.33)',
    anchor: 'PARTECIPAZIONE (NP.1.33.1)',
  },
  {
    titolo: 'CAMPIONATO ITALIANO MASTER FINP (NP.1.34)',
    testo: 'CAMPIONATO ITALIANO MASTER FINP (NP.1.34)',
    anchor: 'PARTECIPAZIONE (NP.1.34.1)',
  },
  {
    titolo: 'CAMPIONATI ITALIANI ASSOLUTI VASCA CORTA (NP.1.35)',
    testo: 'CAMPIONATI ITALIANI ASSOLUTI VASCA CORTA (NP.1.35)',
    anchor: 'PARTECIPAZIONE (NP.1.35.1) (parte 1)',
  },
];

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const doc = data.documenti.find(d => d.id === 'finp-tecnico-2026');
if (!doc) throw new Error('documento finp-tecnico-2026 non trovato');

const esistenti = new Set(doc.sezioni.map(s => s.titolo));
let aggiunte = 0;

for (const n of NUOVE) {
  if (esistenti.has(n.titolo)) {
    console.log(`saltata (già presente): ${n.titolo}`);
    continue;
  }
  if (!n.testo || n.testo.trim().length === 0) throw new Error(`testo vuoto per ${n.titolo}`);
  const sezione = { titolo: n.titolo, testo: n.testo };
  let idx;
  if (n.dopo) {
    idx = doc.sezioni.findIndex(s => s.titolo === n.dopo) + 1;
  } else {
    idx = doc.sezioni.findIndex(s => s.titolo === n.anchor);
  }
  if (idx < 0) throw new Error(`anchor non trovato per ${n.titolo}: ${n.dopo ?? n.anchor}`);
  doc.sezioni.splice(idx, 0, sezione);
  esistenti.add(n.titolo);
  aggiunte++;
  console.log(`aggiunta (${idx}): ${n.titolo}`);
}

if (aggiunte > 0) {
  writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Scritto ${JSON_PATH}: ${doc.sezioni.length} sezioni (+${aggiunte})`);
} else {
  console.log('Nessuna modifica.');
}
