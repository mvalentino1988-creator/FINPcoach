#!/usr/bin/env node
/**
 * Prova 4.1: congela la pagina via CDP (Page.setWebLifecycleState frozen)
 * mentre una partenza automatica e' in attesa, riattiva dopo N secondi e
 * verifica il marcatore "partenza recuperata" / autoLate.
 * Uso: node scripts/qa/device-frozen-test.mjs [freezeSec]
 */
import puppeteer from 'puppeteer-core';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freezeSec = Number(process.argv[2] ?? 90);

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  page = page || pages[0];

  // Attiva il dominio Page per setWebLifecycleState
  const client = await page.createCDPSession();
  await client.send('Page.enable');

  const before = await page.evaluate(() => ({
    testo: (document.body.innerText || '').slice(0, 400),
    stato: JSON.stringify((window.__sess || null)),
  })).catch(() => null);

  console.log('PRIMA freeze, congelamento', freezeSec, 's...');
  await client.send('Page.setWebLifecycleState', { state: 'frozen' });
  await sleep(freezeSec * 1000);
  console.log('SCONGELAMENTO');
  await client.send('Page.setWebLifecycleState', { state: 'active' });
  await sleep(6000);

  const after = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    return {
      recuperata: /recuperat/i.test(txt),
      autoLate: /tardiv/i.test(txt),
      snippet: txt.slice(0, 800),
      // sessione grezza da IDB per autoLate
    };
  }).catch((e) => ({ errore: String(e) }));

  // autoLate persistito in sessione?
  const session = await page.evaluate(async () => {
    try {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('finpcoach-kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const tx = db.transaction('kv', 'readonly');
      const v = await new Promise(res => { const r = tx.objectStore('kv').get('finp_vasca_session_v1'); r.onsuccess = () => res(r.result); });
      db.close();
      if (!v) return null;
      const s = JSON.parse(v.v);
      const late = [];
      for (const l of s.lanes) for (const a of l.atleti) if (a.autoLate) late.push(`${l.numero}:${a.cognome}`);
      return { stato: s.stato, autoLate: late.slice(0, 10), nLate: late.length };
    } catch (e) { return { errore: String(e) }; }
  }).catch((e) => ({ errore: String(e) }));

  console.log(JSON.stringify({ before, after, session }, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
