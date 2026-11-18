#!/usr/bin/env node
/**
 * Test device: import backup nella build QA via CDP.
 * Uso: node scripts/qa/device-import-test.mjs <file> <password> [--wrong-pass]
 * File: .json o .finpbackup. La password viene usata per modali cifrati.
 * Alla fine stampa il conteggio atleti in localStorage.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const file = resolve(process.argv[2] || '');
const password = process.argv[3] || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!file || !process.argv[2]) { console.error('Uso: device-import-test.mjs <file> <password>'); process.exit(1); }

async function main() {
const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
const result = { step: 'init' };
try {
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; }
  }
  page = page || pages[0];
  result.step = 'page-ok';

  // Reload per chiudere modali/eventuali stati residui dei test precedenti
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4000);

  const clickText = async (txt, tag = 'button') => page.evaluate((t, tg) => {
    const el = [...document.querySelectorAll(tg)].find((b) => b.textContent?.includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, txt, tag);

  // Onboarding
  await clickText('Inizia ad Allenare');
  await sleep(1200);

  // Apri Backup e dati
  await page.evaluate(() => document.querySelector('button[aria-label="Backup e dati"]')?.click());
  await sleep(1500);
  result.step = 'modal-backup';

  // Inietta il file via DataTransfer (uploadFile non funziona su WebView Android)
  const content = readFileSync(file, 'utf8');
  const nome = basename(file);
  const immesso = await page.evaluate(({ content, nome }) => {
    const i = document.querySelector('input[type="file"]');
    if (!i) return 'noinput';
    try {
      const dt = new DataTransfer();
      dt.items.add(new File([content], nome, { type: 'application/json' }));
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
      return 'ok';
    } catch (e) { return 'err:' + e.message; }
  }, { content, nome });
  if (immesso !== 'ok') throw new Error('Immissione file fallita: ' + immesso);
  await sleep(2500);
  result.step = 'file-scaricato';

  // Se cifrato -> modale password
  const haPw = await page.evaluate(() => document.querySelectorAll('input[type="password"]').length > 0);
  result.cifrato = haPw;
  if (haPw) {
    await page.evaluate(() => {
      const i = document.querySelector('input[type="password"]');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(i, '');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const pw = await page.$('input[type="password"]');
    await pw.click();
    await pw.type(password);
    await sleep(300);
    const ok = await clickText('Decifra e importa');
    result.decifraClick = ok;
    await sleep(2500);
    result.step = 'dopo-decifra';
    result.erroreDecifra = await page.evaluate(() => document.body.innerText.includes('Decifratura fallita') || document.body.innerText.includes('password'));
    // Se c'e ancora il modale password -> password sbagliata
    const ancoraPw = await page.evaluate(() => document.querySelectorAll('input[type="password"]').length > 0);
    if (ancoraPw) {
      result.risultato = 'PASSWORD_ERRATA_O_DECIFRA_FALLITA';
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  }


  // Conferma importazione "Importa e sovrascrivi" se presente
  const conferma = await clickText('Importa e sovrascrivi');
  result.confermaImport = conferma;
  await sleep(4000);

  // Errori di importazione? (la validazione avviene dopo la conferma)
  result.erroreImport = await page.evaluate(() =>
    document.body.innerText.includes('Import non riuscito') || document.body.innerText.includes('non è stato importato'));
  if (result.erroreImport) {
    result.dettaglioErrore = await page.evaluate(() => document.body.innerText.slice(-500));
    result.risultato = 'IMPORT_RIFIUTATO';
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Attendi eventuale reload e leggi stato
  for (let i = 0; i < 10; i++) {
    const n = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('finp_atleti') || '[]').length; } catch { return -1; }
    }).catch(() => -1);
    if (n >= 0) { result.atleti = n; break; }
    await sleep(1000);
  }
  result.testo = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '');
  result.risultato = 'IMPORT_FATTO';
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  result.errore = String(e);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.disconnect();
}
}
main();
