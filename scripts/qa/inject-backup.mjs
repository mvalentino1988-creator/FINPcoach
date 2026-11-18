#!/usr/bin/env node
/**
 * Inietta un backup JSON generato da gen-backup.mjs nel localStorage della
 * WebView QA (via CDP) e ricarica la pagina. SOLO per la build .qa.
 *
 *   node scripts/qa/inject-backup.mjs scripts/qa/out/backup-48.json
 *
 * Richiede adb forward tcp:9222 verso la WebView della QA.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/qa/inject-backup.mjs <backup.json>');
  process.exit(1);
}
const backup = JSON.parse(readFileSync(file, 'utf8'));

// Mappa sezione backup -> chiave localStorage (specchio di storage.ts).
const MAPPA = {
  atleti: 'finp_atleti',
  condizioni: 'finp_condizioni',
  assenze: 'finp_assenze',
  tempi: 'finp_tempi',
  logSedute: 'finp_log_sedute',
  stagione: 'finp_stagione',
  chiusure: 'finp_chiusure',
  gare: 'finp_gare',
  macrocicli: 'finp_macrocicli',
  mesocicli: 'finp_mesocicli',
  microcicli: 'finp_microcicli',
  impostazioni: 'finp_impostazioni',
  customWorkouts: 'finpcoach_custom_workouts',
  assegnazioneVasca: 'finp_vasca_assegnazione_v1',
};

const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
try {
  const pages = await browser.pages();
  if (!pages.length) throw new Error('Nessuna pagina CDP');
  const page = pages[0];
  const pkg = await page.evaluate(() => location.href);
  console.log('Pagina:', pkg);

  await page.evaluate((map, dati) => {
    for (const [sezione, chiave] of Object.entries(map)) {
      if (dati[sezione] !== undefined) {
        localStorage.setItem(chiave, JSON.stringify(dati[sezione]));
      }
    }
    if (dati.mode === 'demo' || dati.mode === 'live') {
      // finp_mode e' salvato come stringa grezza (vedi FINPStorage.setMode).
      localStorage.setItem('finp_mode', dati.mode);
    }
  }, MAPPA, backup);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  const check = await page.evaluate(() => ({
    atleti: (JSON.parse(localStorage.getItem('finp_atleti') || '[]') || []).length,
    corsie: (JSON.parse(localStorage.getItem('finp_vasca_assegnazione_v1') || 'null') || {}).numeroCorsie ?? null,
  }));
  console.log('Verifica:', JSON.stringify(check));
} finally {
  await browser.disconnect();
}
