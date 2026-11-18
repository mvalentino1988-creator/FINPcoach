#!/usr/bin/env node
/**
 * Test device: export backup cifrato dalla UI della build QA (via CDP).
 * Uso: node scripts/qa/device-backup-test.mjs [password]
 * Richiede adb forward tcp:9222 verso la WebView QA.
 */
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
  page = page || pages.find((p) => p.url().includes('index.html')) || pages[0];

  // 1. Apri Backup e dati
  const backupBtn = await page.$('button[aria-label="Backup e dati"]');
  if (!backupBtn) throw new Error('Bottone "Backup e dati" non trovato');
  await backupBtn.click();
  await sleep(1200);

  // 2. Clicca la card "Backup cifrato con password"
  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div,button')];
    const el = els.find((e) => e.textContent?.includes('Backup cifrato con password') && e.children.length < 8);
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicked) throw new Error('Card backup cifrato non trovata');
  await sleep(800);

  // 3. Compila password e conferma
  const inputs = await page.$$('input[type="password"]');
  if (inputs.length < 2) throw new Error(`Trovati ${inputs.length} campi password`);
  await inputs[0].click({ clickCount: 3 });
  await inputs[0].type(password);
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type(password);
  await sleep(300);

  // 4. Clicca "Esporta cifrato"
  const ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Esporta cifrato');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) throw new Error('Bottone "Esporta cifrato" non trovato');
  await sleep(3000);

  // 5. Stato: toast / errore?
  const stato = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      haToastOk: /esportat/i.test(body),
      haErrore: /impossibile|errore/i.test(body),
      frammento: body.slice(0, 400),
    };
  });
  console.log(JSON.stringify({ clicked, inputs: inputs.length, ...stato }, null, 2));
} finally {
  await browser.disconnect();
}
