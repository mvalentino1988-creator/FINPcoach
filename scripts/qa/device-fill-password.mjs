#!/usr/bin/env node
// Compila le due password nel modale "Backup cifrato" aperto e clicca "Esporta cifrato".
import puppeteer from 'puppeteer-core';
const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const password = process.argv[2] || 'qa-test-password-123';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
try {
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; }
  }
  page = page || pages[0];

  const inputs = await page.$$('input[type="password"]');
  if (inputs.length < 2) throw new Error(`Trovati ${inputs.length} campi password`);
  await inputs[0].click({ clickCount: 3 });
  await inputs[0].type(password);
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type(password);
  await sleep(400);

  const ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Esporta cifrato');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) throw new Error('Bottone "Esporta cifrato" non trovato');
  await sleep(3500);

  const stato = await page.evaluate(() => {
    const body = document.body.innerText;
    return { ok: /esportat|scaricat|Download/i.test(body), errore: /impossibile|errore/i.test(body), coda: body.slice(-300) };
  });
  console.log(JSON.stringify(stato, null, 2));
} finally {
  await browser.disconnect();
}
