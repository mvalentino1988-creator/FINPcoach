#!/usr/bin/env node
/**
 * R3 — Prove live del cronometro su build .qa (dataset stress 100 atleti).
 *
 * Ordine: inject -> VIA -> catena auto -> deriva 10min (offset mediano
 * timer visualizzato vs repStart) -> interazioni (tap, long-press stop,
 * reset conferma/annulla) -> landscape -> background 5min.
 *
 * Uso: node scripts/qa/device-live-test.mjs [--no-drift] [--no-bg] [--no-interactions]
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const ADB = process.env.ADB || 'C:/Users/matti/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const PKG = 'com.mattia.nuotoparalimpico.qa';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NO_DRIFT = process.argv.includes('--no-drift');
const NO_BG = process.argv.includes('--no-bg');
const NO_INT = process.argv.includes('--no-interactions');

const SESSIONE = `(() => { try { return JSON.parse(localStorage.getItem('finp_vasca_session_v1') || 'null'); } catch { return null; } })()`;

// Misura per ogni tessera: altezza, truncate forzato, overflow.
const MISURA = `(() => {
  const tiles = [...document.querySelectorAll('div[role="button"]')].filter(d => {
    const r = d.getBoundingClientRect();
    return r.height > 20 && r.width > 40 && d.querySelector('span');
  });
  const righe = []; let fail = 0; const altezze = new Set();
  for (const t of tiles) {
    const tr = t.getBoundingClientRect();
    if (tr.height < 10) continue;
    altezze.add(Math.round(tr.height));
    const nameEl = [...t.querySelectorAll('span')].find(sp =>
      sp.textContent && sp.textContent.trim().length > 3 && sp.children.length === 0 &&
      !/^\\d/.test(sp.textContent.trim()));
    const nameBox = nameEl ? nameEl.getBoundingClientRect() : null;
    const prob = [];
    if (tr.height < 40) prob.push('h' + Math.round(tr.height));
    if (nameEl && nameEl.scrollWidth > nameEl.clientWidth + 1 && tr.height >= 34) prob.push('nome-troncato');
    if (nameBox && (nameBox.right > tr.right + 2 || nameBox.left < tr.left - 2)) prob.push('nome-fuori');
    if (prob.length) fail++;
    righe.push({ h: Math.round(tr.height), nome: nameEl ? nameEl.textContent.trim().slice(0, 18) : '?', prob });
  }
  return { tiles: righe.length, altezze: [...altezze].sort((a, b) => a - b), fail, righe: righe.slice(0, 5) };
})()`;

// Per la deriva: orologio generale di sessione ("Tempo generale") + clock dispositivo.
const DRIFT_SAMPLE = `(async () => {
  // attendi 2 frame: il testo e' scritto dal tick rAF, senza frame sarebbe stale
  await Promise.race([
    new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    new Promise(r => setTimeout(r, 2000)),
  ]);
  const gen = document.querySelector('[aria-label="Tempo generale"]');
  const txt = gen ? (gen.textContent || '').trim() : null;
  let s = null;
  try { s = JSON.parse(localStorage.getItem('finp_vasca_session_v1') || 'null'); } catch {}
  const vis = document.visibilityState;
  return { dev: Date.now(), txt, t0: s ? s.t0 : null, stato: s ? s.stato : null, vis };
})()`;

const parseTimer = t => {
  const m = (t || '').match(/(\d+):(\d{2})[.,](\d{2})/);
  return m ? (((+m[1]) * 60 + (+m[2])) * 1000 + (+m[3])) : null;
};

async function nav(page) {
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, a, [role=button]')]
        .find(x => /^\s*Vasca\s*$/i.test(x.textContent || '') && x.offsetParent);
      if (b) b.click();
    });
    await sleep(1200);
    const n = await page.evaluate(() => document.querySelectorAll('div[role="button"]').length);
    if (n > 4) {
      await page.evaluate(() => {
        const bs = [...document.querySelectorAll('button')].filter(x => /Cronometro/i.test(x.textContent || ''));
        if (bs.length && bs[0].getAttribute('aria-pressed') !== 'true') bs[0].click();
      });
      await sleep(1500);
      return true;
    }
    await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(x => (x.textContent || '').trim() === 'Cronometro');
      if (bs.length) bs[0].click();
    });
    await sleep(1200);
  }
  return false;
}

async function shot(page, name) {
  try {
    fs.mkdirSync('scripts/qa/shots', { recursive: true });
    fs.writeFileSync(`scripts/qa/shots/${name}.png`, await page.screenshot({ type: 'png' }));
    console.log('SHOT', name);
  } catch (e) { console.log('SHOT_FAIL', name, e.message.slice(0, 80)); }
}

const tapTile = (page, nome) => page.evaluate((n) => {
  const t = [...document.querySelectorAll('div[role="button"]')].find(d => (d.textContent || '').includes(n));
  if (!t) return 'no-tile';
  t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return 'ok';
}, nome);

const longPressTile = (page, nome, ms = 900) => page.evaluate(async (n, w) => {
  const t = [...document.querySelectorAll('div[role="button"]')].find(d => (d.textContent || '').includes(n));
  if (!t) return 'no-tile';
  t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }));
  await new Promise(r => setTimeout(r, w));
  t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }));
  t.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, isPrimary: true }));
  return 'ok';
}, nome, ms);

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null, protocolTimeout: 120000 });
  // Scegli la pagina VISIBLE: con piu' WebView attivi (target stale dopo
  // restart) pages[0] puo' essere una pagina nascosta e ogni misura
  // (visibilityState, rAF) risulta falsata.
  let page = null;
  for (let i = 0; i < 15 && !page; i++) {
    try { execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); } catch {}
    try { execFileSync(ADB, ['shell', 'wm', 'dismiss-keyguard']); } catch {}
    for (const p of await browser.pages()) {
      try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
    }
    if (!page) await sleep(2000);
  }
  if (!page) throw new Error('nessuna pagina visibile via CDP');
  page.on('pageerror', e => console.log('PAGE_ERR', String(e).slice(0, 200)));

  // --- 0. Assegnazione: intervallo partenza 4s sulla corsia 1 ---
  await page.evaluate(() => {
    const KEY = 'finp_vasca_assegnazione_v1';
    const a = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (a && a.corsie?.[0]) { a.corsie[0].intervalloPartenza = 4; localStorage.setItem(KEY, JSON.stringify(a)); }
    const SKEY = 'finp_vasca_session_v1';
    const s = { id: 'ses-live-qa', t0: null, stato: 'pronta', ripartenzaGenerale: 8, shiftMs: 0, pausedSessionAt: null, pausedWallAt: null, lanes: [] };
    localStorage.setItem(SKEY, JSON.stringify(s));
    localStorage.setItem('finp_mode', 'live');
    location.reload();
  });
  await sleep(6000);
  console.log('NAV', await nav(page));

  // --- 1. VIA GENERALE ---
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /VIA GENERALE/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(2000);
  let ses = await page.evaluate(SESSIONE);
  console.log('DOPO_VIA stato=' + ses?.stato + ' lanes=' + ses?.lanes?.length + ' avviati=' + ses?.lanes?.reduce((n, l) => n + l.atleti.filter(a => a.started).length, 0));

  // --- 2. Catena automatica corsia 1 (attesi >=3 in ~14s) ---
  await sleep(14000);
  ses = await page.evaluate(SESSIONE);
  const l1 = ses?.lanes?.find(l => l.numero === 1);
  const l1avv = l1?.atleti.filter(a => a.started || a.repStart != null).length ?? 0;
  const hasAutoAnchor = l1?.atleti.some(a => a.autoAnchorT != null);
  console.log('AUTO_L1 avviati=' + l1avv + ' atteso>=3 autoAnchor=' + hasAutoAnchor + ' interv=' + l1?.intervalloPartenza);
  await shot(page, 'live-48-auto');

  // --- 3. Deriva 10 min: offset = timer visualizzato - (now - repStart) ---
  if (!NO_DRIFT && ses?.stato === 'in_corso') {
    const samples = [];
    for (let i = 0; i < 20; i++) {
      let snap = null;
      try { snap = await page.evaluate(DRIFT_SAMPLE); } catch (e) { console.log('sampleErr@' + i, String(e).slice(0, 60)); }
      // Tieni il display sveglio (keyevent + dismiss-keyguard, nessuna
      // impostazione toccata): senza, il display si spegne / il keyguard
      // copre l'app e rAF viene messo in throttling.
      try { execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); } catch {}
      try { execFileSync(ADB, ['shell', 'wm', 'dismiss-keyguard']); } catch {}
      if (snap && snap.t0 != null) {
        const disp = parseTimer(snap.txt);
        if (disp != null) {
          // offset = tempo mostrato - (orologio dispositivo - t0 di sessione)
          samples.push({ dev: snap.dev, off: disp - (snap.dev - snap.t0), vis: snap.vis });
        } else console.log('noTimer@' + i + ' txt=' + snap.txt);
      } else console.log('noSnap@' + i);
      // sonno a scatti da 10s con refresh del display
      for (let k = 0; k < 3; k++) {
        await sleep(10000);
        try { execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); } catch {}
        try { execFileSync(ADB, ['shell', 'wm', 'dismiss-keyguard']); } catch {}
      }
    }
    if (samples.length >= 2) {
      const offs = samples.map(s => s.off);
      const drift = Math.max(...offs) - Math.min(...offs);
      const visS = samples.filter(x => x.vis === 'visible');
      const offsV = visS.map(s => s.off);
      const driftV = offsV.length >= 2 ? Math.max(...offsV) - Math.min(...offsV) : null;
      console.log('RESULT driftMs=' + Math.round(drift) + ' driftVis=' + (driftV == null ? 'n/a' : Math.round(driftV)) + ' samples=' + samples.length + ' vis=' + visS.length + ' offs=' + offs.map(o => Math.round(o)).join(',') + ' visStati=' + [...new Set(samples.map(x => x.vis))].join('/'));
    } else console.log('RESULT driftMs=null samples=' + samples.length);
  } else console.log('DRIFT_SKIP');

  // --- 4. Interazioni ---
  if (!NO_INT) {
    ses = await page.evaluate(SESSIONE);
    // 4a. tap su atleta in attesa (prima tessera con status attesa)
    const attesa = ses?.lanes?.flatMap(l => l.atleti).find(a => !a.started && a.repStart == null);
    if (attesa) {
      console.log('TAP', await tapTile(page, attesa.cognome));
      await sleep(1200);
      ses = await page.evaluate(SESSIONE);
      const a2 = ses?.lanes?.flatMap(l => l.atleti).find(a => a.cognome === attesa.cognome);
      console.log('TAP_ESITO started=' + a2?.started + ' repStart=' + (a2?.repStart != null));
    }
    // 4b. long-press stop su atleta in replica (lane 1)
    ses = await page.evaluate(SESSIONE);
    const inRep = ses?.lanes?.find(l => l.numero === 1)?.atleti.find(a => a.repStart != null && !a.fermo);
    if (inRep) {
      console.log('LP', inRep.cognome, await longPressTile(page, inRep.cognome));
      await sleep(1200);
      ses = await page.evaluate(SESSIONE);
      const a3 = ses?.lanes?.find(l => l.numero === 1)?.atleti.find(a => a.id === inRep.id);
      console.log('LP_ESITO fermo=' + a3?.fermo);
    }
    // 4c. reset: annulla poi conferma
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /Azzera sessione/i.test(x.getAttribute('aria-label') || '') || /Azzera sessione/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(800);
    const dlg = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    console.log('DIALOG_RESET', dlg);
    if (dlg) {
      await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => x.textContent.trim() === 'Annulla'); if (b) b.click(); });
      await sleep(600);
      ses = await page.evaluate(SESSIONE);
      console.log('DOPO_ANNULLA stato=' + ses?.stato);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => /Azzera sessione/i.test(x.getAttribute('aria-label') || '') || /Azzera sessione/i.test(x.textContent || ''));
        if (b) b.click();
      });
      await sleep(800);
      await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => x.textContent.trim() === 'Azzera'); if (b) b.click(); });
      await sleep(1200);
      ses = await page.evaluate(SESSIONE);
      console.log('DOPO_CONFERMA stato=' + ses?.stato + ' (atteso pronta, undo stack azzerato)');
    }
    await shot(page, 'live-dopo-interazioni');
    // ripristina sessione per i test successivi
    await page.evaluate((s) => {
      const KEY = 'finp_vasca_session_v1';
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === KEY) return; return orig.call(this, k, v); };
      orig.call(localStorage, KEY, JSON.stringify(s));
      localStorage.setItem('finp_mode', 'live');
      location.reload();
    }, buildSessionPronta());
    await sleep(6000);
    await nav(page);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /VIA GENERALE/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(3000);
  }

  // --- 5. Misure portrait + landscape ---
  let mis = await page.evaluate(MISURA);
  console.log('MISURA_PORTRAIT', JSON.stringify({ tiles: mis.tiles, altezze: mis.altezze, fail: mis.fail }));
  try {
    execFileSync(ADB, ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
    execFileSync(ADB, ['shell', 'settings', 'put', 'system', 'user_rotation', '1']);
    await sleep(3000);
    await nav(page);
    mis = await page.evaluate(MISURA);
    console.log('MISURA_LANDSCAPE', JSON.stringify({ tiles: mis.tiles, altezze: mis.altezze, fail: mis.fail }));
    await shot(page, 'live-48-landscape');
    execFileSync(ADB, ['shell', 'settings', 'put', 'system', 'user_rotation', '0']);
    execFileSync(ADB, ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '1']);
    await sleep(2500);
    await nav(page);
  } catch (e) { console.log('ROT_FAIL', e.message.slice(0, 120)); }

  // --- 6. Background 5 min: la catena auto della corsia 1 resta armata;
  //         al resume le scadenze maturate diventano "partenza recuperata". ---
  if (!NO_BG) {
    const stato = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('finp_vasca_session_v1') || 'null');
      return s ? s.stato : 'none';
    });
    console.log('BG_STATO', stato);
    if (stato === 'in_corso') {
      execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
      await sleep(300000);
      execFileSync(ADB, ['shell', 'am', 'start', '-n', `${PKG}/com.mattia.nuotoparalimpico.MainActivity`]);
      // attendi che la pagina torni visibile (il WebView puo' ricaricare);
      // la vecchia istanza e' staccata dopo il resume: risolvi sempre la
      // pagina corrente da browser.pages() e non fidarti del riferimento.
      let okVis = false;
      for (let i = 0; i < 30 && !okVis; i++) {
        await sleep(2000);
        try {
          for (const q of await browser.pages()) {
            try {
              const v = await q.evaluate(() => document.visibilityState);
              if (v === 'visible') { page = q; okVis = true; break; }
            } catch {}
          }
        } catch {}
      }
      if (!okVis) {
        // fallback: ultima pagina non staccata
        for (const q of await browser.pages()) {
          try { await q.evaluate(() => 1); page = q; } catch {}
        }
      }
      await nav(page);
      const post = await page.evaluate(() => ({
        vis: document.visibilityState,
        recuperata: /recuperat/i.test(document.body.innerText || ''),
        marker: !!document.querySelector('[aria-label="partenza recuperata"]'),
        stato: (JSON.parse(localStorage.getItem('finp_vasca_session_v1') || '{}').stato || '?'),
        timers: (document.body.innerText.match(/\d{1,3}:\d{2}[.,]\d{2}/g) || []).length,
      })).catch(e => ({ err: e.message.slice(0, 120) }));
      console.log('POST_BG', JSON.stringify(post));
      await shot(page, 'live-dopo-background');
    }
  }

  await browser.disconnect();
  console.log('DONE');
}

function buildSessionPronta() {
  return { id: 'ses-live-qa', t0: null, stato: 'pronta', ripartenzaGenerale: 8, shiftMs: 0, pausedSessionAt: null, pausedWallAt: null, lanes: [] };
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
