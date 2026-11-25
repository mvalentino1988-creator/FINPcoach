#!/usr/bin/env node
/**
 * Injietta una sessione cronometro di prova in IDB (chiave finp_vasca_session_v1)
 * e ricarica la pagina. Sessione: 6 corsie x 8 atleti = 48, in_corso,
 * corsia 1 con partenza automatica ogni 5s e un atleta la cui partenza
 * automatica cade dentro la finestra di freeze.
 * Uso: node scripts/qa/device-inject-session.mjs [freezeAtSec] [freezeSec]
 * Stampa il t0 epoch ms iniettato (serve per la misura di deriva).
 */
import puppeteer from 'puppeteer-core';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freezeAtSec = Number(process.argv[2] ?? 20);
const freezeSec = Number(process.argv[3] ?? 90);

const atleta = (id, cognome, extra = {}) => ({
  id,
  atletaId: null,
  cognome,
  repStart: null,
  restUntil: null,
  lastRepStart: null,
  primoVia: null,
  started: false,
  fermo: false,
  laps: [],
  ripartenzaAtleta: null,
  targetLaps: null,
  autoAnchorT: null,
  autoWarned: false,
  ...extra,
});

const sessione = () => {
  const now = Date.now();
  const t0 = now - 60_000;
  const lanes = [];
  for (let c = 1; c <= 6; c++) {
    const atleti = [];
    for (let i = 0; i < 8; i++) {
      const id = `qa-${c}-${i}`;
      if (c === 1 && i === 0) {
        atleti.push(atleta(id, `QA-1${i}`, {
          started: true,
          repStart: now - 30_000,
          lastRepStart: now - 30_000,
          primoVia: now - 30_000,
          laps: [{ t: now - 25_000, ms: 5_000, start: now - 30_000 }],
          autoAnchorT: now - 30_000,
        }));
      } else if (c === 1 && i === 1) {
        // Partenza automatica prevista a now + freezeAtSec + ~10s:
        // cade dentro la finestra di freeze.
        atleti.push(atleta(id, `QA-1${i}`, { autoAnchorT: now + (freezeAtSec + 10 - 5) * 1000 }));
      } else {
        atleti.push(atleta(id, `QA-${c}${i}`));
      }
    }
    lanes.push({
      numero: c,
      ripartenzaCorsia: null,
      intervalloPartenza: c === 1 ? 5 : null,
      atleti,
      pendingAuto: null,
    });
  }
  return {
    session: {
      id: 'ses-qa-quinto',
      t0,
      stato: 'in_corso',
      ripartenzaGenerale: 60,
      shiftMs: 0,
      pausedSessionAt: null,
      pausedWallAt: null,
      lanes,
    },
    t0,
  };
};

async function main() {
  const { session, t0 } = sessione();
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  page = page || pages[0];

  // Via handle di collaudo: il motore (tick 200ms) fa refresh+persistenza
  // da solo, senza il race IDB-scrittura vs debounce dell'app.
  const ok = await page.evaluate(async (json) => {
    try {
      const ref = window.__FINP_VASCA_SESSION__;
      if (!ref) return 'no-handle';
      ref.current = JSON.parse(json);
      return 'ok';
    } catch (e) { return String(e); }
  }, JSON.stringify(session));
  console.log('inject:', ok);
  await sleep(1200);
  // vai a Vasca > Cronometro (niente reload: la sessione vive in memoria)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('finp:navigate', { detail: 'vasca' })));
  await sleep(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Cronometro');
    if (b) b.click();
  });
  await sleep(1500);
  const stato = await page.evaluate(() => ({
    tiles: document.querySelectorAll('div[role="button"]').length,
    testo: (document.body.innerText || '').slice(0, 160),
  }));
  console.log('cronometro:', JSON.stringify(stato));
  console.log(JSON.stringify({ t0, freezeAtSec, freezeSec }));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
