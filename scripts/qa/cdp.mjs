#!/usr/bin/env node
/**
 * Helper CDP per la WebView Android (debug builds).
 *
 * Uso:
 *   node scripts/qa/cdp.mjs eval "document.title"           # espressione JS -> JSON
 *   node scripts/qa/cdp.mjs evalfile script.js              # valuta un file JS
 *   node scripts/qa/cdp.mjs console [secondi]               # raccoglie console.* per N secondi
 *   node scripts/qa/cdp.mjs requests [secondi]              # raccoglie richieste di rete
 *   node scripts/qa/cdp.mjs targets                         # lista pagine/debug target
 *
 * Richiede: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 * (v. scripts/qa/lib.sh -> qa_forward_cdp)
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const [, , cmd, ...args] = process.argv;

async function connect() {
  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  // Preferisce la pagina visibile (l'app può esporre più WebView, es. una nascosta).
  const pages = await browser.pages();
  if (pages.length === 0) throw new Error('Nessuna pagina CDP trovata');
  let page = pages[0];
  for (const p of pages) {
    try {
      if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; }
    } catch { /* pagina non pronta */ }
  }
  return { browser, page };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (cmd === 'targets') {
    const res = await fetch(`${CDP_URL}/json`);
    console.log(JSON.stringify(await res.json(), null, 2));
    return;
  }

  const { browser, page } = await connect();
  try {
    if (cmd === 'eval') {
      const expr = args.join(' ');
      const result = await page.evaluate(expr);
      console.log(JSON.stringify(result));
      return;
    }
    if (cmd === 'evalfile') {
      const src = readFileSync(args[0], 'utf8');
      const result = await page.evaluate(src);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (cmd === 'console' || cmd === 'requests') {
      const seconds = Number(args[0] || 10);
      const lines = [];
      if (cmd === 'console') {
        page.on('console', (m) => lines.push(`[${m.type()}] ${m.text()}`));
        page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));
      } else {
        page.on('request', (r) => lines.push(`[req] ${r.method()} ${r.url()}`));
        page.on('requestfailed', (r) => lines.push(`[fail] ${r.url()} ${r.failure()?.errorText}`));
        page.on('response', (r) => { if (r.status() >= 400) lines.push(`[${r.status()}] ${r.url()}`); });
      }
      await sleep(seconds * 1000);
      console.log(lines.join('\n') || '(nessun evento)');
      return;
    }
    console.error('Comando sconosciuto. Uso: eval|evalfile|console|requests|targets');
    process.exitCode = 1;
  } finally {
    await browser.disconnect();
  }
}

main().catch((e) => {
  console.error('CDP error:', e.message);
  process.exitCode = 1;
});
