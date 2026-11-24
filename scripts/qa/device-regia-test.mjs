#!/usr/bin/env node
/**
 * Test CDP della Regia Tecnica Corsie su build .qa (dati sintetici).
 *
 * Verifica che OGNI corsia con atleti mostri tutti i suoi chip:
 *  - nessun chip con altezza 0;
 *  - ogni chip raggiungibile: dopo scrollIntoView deve avere
 *    altezza > 0 ed essere dentro il viewport (o dentro lo scroll
 *    interno dell'area corsie);
 *  - il numero di chip per corsia coincide con atletiIds.
 *
 * Funziona sia con scroll di pagina (regia-screen) sia con scroll
 * interno: scrollIntoView scorre il primo antenato scorrevole.
 *
 * Uso: node scripts/qa/device-regia-test.mjs [--min-visible=N]
 * Esce con codice 1 se una corsia con atleti ha meno di N chip
 * "raggiungibili" o se qualche chip ha altezza 0.
 * Richiede: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 */
import puppeteer from 'puppeteer-core';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const minVisible = Number((process.argv.find(a => a.startsWith('--min-visible=')) || '').split('=')[1] || 0);

const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
const pages = await browser.pages();
let page = pages[0];
for (const p of pages) {
  try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = await page.evaluate(async (minVis) => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Assicura la vista Regia.
  window.dispatchEvent(new CustomEvent('finp:navigate', { detail: 'vasca' }));
  await sleep(400);
  const regiaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Regia');
  if (regiaBtn) regiaBtn.click();
  await sleep(600);

  const lanes = Array.from(document.querySelectorAll('section [aria-label^="Corsia"]'))
    .filter(l => /,\s*\d+\s+atleti/.test(l.getAttribute('aria-label')));
  const vh = window.innerHeight;
  const out = [];
  for (const lane of lanes) {
    const label = lane.getAttribute('aria-label');
    const expected = Number((label.match(/(\d+)\s+atleti/) || [])[1] || 0);
    // Chip atleta: righe con ruolo button dentro la lista "Atleti in corsia".
    const chips = Array.from(lane.querySelectorAll('[role="button"][aria-label]'))
      .filter(el => !/^Corsia /.test(el.getAttribute('aria-label')));
    const misura = [];
    for (const chip of chips) {
      chip.scrollIntoView({ block: 'center', behavior: 'instant' });
      await sleep(120);
      const b = chip.getBoundingClientRect();
      const cs = getComputedStyle(chip);
      misura.push({
        h: Math.round(b.height * 10) / 10,
        visibile: b.height > 0 && b.bottom > 0 && b.top < vh && cs.visibility !== 'hidden' && cs.display !== 'none',
        opacita: cs.opacity,
      });
    }
    const zeroH = misura.filter(m => m.h <= 0).length;
    const raggiungibili = misura.filter(m => m.visibile).length;
    out.push({ label, attesi: expected, trovati: chips.length, zeroH, raggiungibili, chips: misura.length });
  }
  return { vh, lanes: out };
}, minVisible);

await browser.disconnect();

let fail = 0;
console.log(JSON.stringify(results, null, 2));
for (const l of results.lanes) {
  if (l.attesi === 0) continue;
  if (l.trovati !== l.attesi) { console.error(`FAIL ${l.label}: ${l.trovati} chip trovati, ${l.attesi} attesi`); fail++; }
  if (l.zeroH > 0) { console.error(`FAIL ${l.label}: ${l.zeroH} chip con altezza 0`); fail++; }
  const soglia = Math.max(minVisible, l.attesi);
  if (l.raggiungibili < soglia) { console.error(`FAIL ${l.label}: ${l.raggiungibili}/${l.attesi} chip raggiungibili (soglia ${soglia})`); fail++; }
}
if (results.lanes.length === 0) { console.error('FAIL: nessuna corsia trovata'); fail++; }
process.exit(fail ? 1 : 0);
