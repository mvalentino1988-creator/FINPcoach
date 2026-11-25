#!/usr/bin/env node
/**
 * Prova 4.2 — deriva del timer in-page: ogni 5s per 10 minuti confronta il
 * tempo mostrato dal cronometro con il tempo atteso
 * (performance.timeOrigin + performance.now() - t0 di sessione).
 * Uso: node scripts/qa/device-drift.mjs [secondi] [intervalloMs]
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const durataSec = Number(process.argv[2] ?? 600);
const passoMs = Number(process.argv[3] ?? 5000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MISURA = `(() => {
  const ref = window.__FINP_VASCA_SESSION__;
  const s = ref && ref.current;
  if (!s || s.stato !== 'in_corso' || s.t0 == null) return null;
  const atteso = performance.timeOrigin + performance.now() - s.t0 + (s.shiftMs || 0);
  const els = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0);
  const cands = els.map(e => (e.textContent || '').trim()).filter(t => /^\\d{1,3}:\\d{2}([.,]\\d{1,2})?$/.test(t));
  let mostrato = null;
  for (const t of cands) {
    const m = t.match(/(\\d+):(\\d{2})(?:[.,](\\d{1,2}))?/);
    if (!m) continue;
    const ms = ((+m[1]) * 60 + (+m[2])) * 1000 + (m[3] ? +('0.' + m[3]) * 1000 : 0);
    if (mostrato == null || ms > mostrato) mostrato = ms;
  }
  return { atteso, mostrato, vis: document.visibilityState };
})()`;

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null, protocolTimeout: 30000 });
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  page = page || pages[0];

  const samples = [];
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < durataSec) {
    try {
      const r = await page.evaluate(MISURA);
      if (r && r.mostrato != null) {
        samples.push({ t: Date.now(), delta: Math.round((r.mostrato - r.atteso) * 10) / 10, vis: r.vis });
      } else {
        samples.push({ t: Date.now(), skip: r ? 'no-timer' : 'no-session', vis: r ? r.vis : '?' });
      }
    } catch (e) {
      samples.push({ t: Date.now(), skip: 'eval-timeout', err: String(e).slice(0, 80) });
    }
    await sleep(passoMs);
  }

  const validi = samples.filter(s => typeof s.delta === 'number');
  const deltas = validi.map(s => s.delta).sort((a, b) => a - b);
  const mediana = deltas.length ? deltas[Math.floor(deltas.length / 2)] : null;
  const maxScarto = deltas.length ? Math.max(...deltas.map(Math.abs)) : null;
  const out = {
    minuti: Math.round((Date.now() - t0) / 6000) / 10,
    campioni: validi.length,
    saltati: samples.length - validi.length,
    deltaMedianaMs: mediana,
    maxScartoAssolutoMs: maxScarto,
    minDelta: deltas[0] ?? null,
    maxDelta: deltas[deltas.length - 1] ?? null,
  };
  writeFileSync('scripts/qa/out/drift-quinto.json', JSON.stringify({ out, samples }, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
