#!/usr/bin/env node
/**
 * Misura i budget di resa su device (WebView via CDP):
 *   Squadra (render + ricerca), Registro/ACWR, navigazione Regia/Cronometro.
 * Uso: node scripts/qa/device-budget.mjs [json]
 * Stampa tempi in ms e conteggi DOM.
 */
import puppeteer from 'puppeteer-core';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  page = page || pages[0];

  const out = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const res = {};
    const nav = async (tab, waitSel, timeout = 15000) => {
      const t0 = performance.now();
      window.dispatchEvent(new CustomEvent('finp:navigate', { detail: tab }));
      if (!waitSel) { await sleep(400); return { ms: Math.round(performance.now() - t0), ok: true }; }
      const deadline = t0 + timeout;
      while (performance.now() < deadline) {
        if (document.querySelector(waitSel)) return { ms: Math.round(performance.now() - t0), ok: true };
        await sleep(50);
      }
      return { ms: Math.round(performance.now() - t0), ok: false };
    };
    const clickTab = async (label) => {
      const t0 = performance.now();
      const btn = Array.from(document.querySelectorAll('[role="tab"], button')).find(b => (b.textContent || '').includes(label));
      if (!btn) return { ms: 0, ok: false };
      btn.click();
      await sleep(150);
      return { ms: Math.round(performance.now() - t0), ok: true };
    };

    // --- Squadra (misura fino a comparsa delle card atleta) ---
    {
      const t0 = performance.now();
      window.dispatchEvent(new CustomEvent('finp:navigate', { detail: 'squadra' }));
      const deadline = t0 + 30000;
      let n = 0;
      while (performance.now() < deadline) {
        n = Array.from(document.querySelectorAll('h3')).filter(h => (h.textContent || '').trim().length > 3).length;
        if (n > 10) break;
        await sleep(50);
      }
      res.squadra = { ms: Math.round(performance.now() - t0), ok: n > 10 };
      res.atletiInPagina = n;
    }
    await sleep(200);

    // --- Ricerca in Squadra ---
    const search = document.querySelector('input[type="search"], input[placeholder*="erca" i], input[aria-label*="erca" i]');
    if (search) {
      const prima = Array.from(document.querySelectorAll('h3')).filter(h => (h.textContent || '').trim().length > 3).length;
      const t0 = performance.now();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(search, 'SIM-A');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      const deadline = t0 + 5000;
      let dopo = prima;
      while (performance.now() < deadline) {
        dopo = Array.from(document.querySelectorAll('h3')).filter(h => (h.textContent || '').trim().length > 3).length;
        if (dopo !== prima) break;
        await sleep(20);
      }
      res.ricercaMs = Math.round(performance.now() - t0);
      res.ricercaConteggio = { prima, dopo };
      setter.call(search, '');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(300);
    } else res.ricercaMs = null;

    // --- Registro (Altro > Dati & Backup > Registro & Carico) ---
    await nav('altro', null, 20000);
    await sleep(400);
    res.sezioneDati = await clickTab('Dati & Backup');
    await sleep(400);
    {
      const t0 = performance.now();
      const btn = Array.from(document.querySelectorAll('[role="tab"], button')).find(b => (b.textContent || '').includes('Registro & Carico'));
      if (!btn) { res.registro = { errore: 'tab non trovato' }; }
      else {
        btn.click();
        const deadline = performance.now() + 30000;
        let righe = 0;
        while (performance.now() < deadline) {
          righe = document.querySelectorAll('input[inputmode="numeric"]').length;
          if (righe > 5) break;
          await sleep(50);
        }
        res.registro = { ms: Math.round(performance.now() - t0), righe };
      }
    }

    // --- Regia ---
    await nav('vasca', null, 20000);
    await sleep(500);
    const regiaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Regia');
    if (regiaBtn) {
      const t0 = performance.now();
      regiaBtn.click();
      const deadline = t0 + 15000;
      let corsie = 0;
      while (performance.now() < deadline) {
        corsie = document.querySelectorAll('section [aria-label^="Corsia"]').length;
        if (corsie > 0) break;
        await sleep(50);
      }
      res.regia = { ms: Math.round(performance.now() - t0), corsie };
    }

    res.jsHeap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return res;
  });

  console.log(JSON.stringify(out, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
