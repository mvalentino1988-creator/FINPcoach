#!/usr/bin/env node
/**
 * R5 — Misura la quota REALE di LocalStorage sul pacchetto .qa.
 * Riempie una chiave di prova fino a QuotaExceededError, poi rimuove tutto.
 * Uso: node scripts/qa/device-quota-test.mjs
 */
import puppeteer from 'puppeteer-core';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const TEST_KEY = 'finp_qa_quota_test';

const MISURA = `(() => {
  const enc = new TextEncoder();
  let tot = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k === '${TEST_KEY}') continue;
    tot += enc.encode(k).length + enc.encode(localStorage.getItem(k) || '').length;
  }
  return tot;
})()`;

(async () => {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages[0];
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  const usatoIniziale = await page.evaluate(MISURA);
  const estimate = await page.evaluate(async () => {
    try { const e = await navigator.storage.estimate(); return { quota: e.quota, usage: e.usage }; }
    catch (err) { return { err: String(err) }; }
  });
  console.log('USATO_INIZIALE', usatoIniziale, 'ESTIMATE', JSON.stringify(estimate));

  // Riempimento binario: chunk da 256KB fino a QuotaExceededError.
  const CHUNK = 256 * 1024;
  const risultato = await page.evaluate(async ({ key, chunk }) => {
    let size = 0;
    const fill = 'x'.repeat(chunk);
    try {
      while (true) {
        localStorage.setItem(key, fill.slice(0, chunk) + ''); // reset
        // accumula in chiavi separate per non copiare stringhe giganti
        localStorage.setItem(key + '_' + size, fill);
        size += chunk;
        if (size > 64 * 1024 * 1024) return { errore: 'limite-protetto-64mb', size };
      }
    } catch (e) {
      const msg = e && e.name ? e.name : String(e);
      return { errore: msg, size, quotaUsata: size + chunk };
    }
  }, { key: TEST_KEY, chunk: CHUNK });
  console.log('FILL', JSON.stringify(risultato));

  // Misura finale e pulizia.
  const usatoFinale = await page.evaluate(MISURA);
  await page.evaluate((prefix) => {
    const daRimuovere = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) daRimuovere.push(k);
    }
    daRimuovere.forEach(k => localStorage.removeItem(k));
  }, TEST_KEY);
  const usatoDopo = await page.evaluate(MISURA);
  console.log('USATO_DOPO', usatoDopo, 'STIMA_QUOTA_BYTES', risultato.size + CHUNK);
  await browser.disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
