#!/usr/bin/env node
/**
 * R3 — Sweep impostazioni di sistema + stampa + squadra su .qa.
 * Screenshot in scripts/qa/shots/, misure overflow/viewport via CDP.
 * Uso: node scripts/qa/device-misc-test.mjs
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const ADB = process.env.ADB || 'C:/Users/matti/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sh = args => execFileSync(ADB, ['shell', ...args], { encoding: 'utf8' }).trim();

async function shot(page, name) {
  fs.mkdirSync('scripts/qa/shots', { recursive: true });
  fs.writeFileSync(`scripts/qa/shots/${name}.png`, await page.screenshot({ type: 'png' }));
  console.log('SHOT', name);
}

const MISURA_VISTA = `(() => {
  const de = document.documentElement;
  const overflowX = de.scrollWidth > de.clientWidth + 2;
  const overflowY = de.scrollHeight > de.clientHeight + 2 && !document.querySelector('.app-fixed-scroll, .app-shell-fixed .app-fixed-scroll');
  const pannelli = [...document.querySelectorAll('button,a,[role=tab]')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && (r.height < 36 || r.width < 36);
  }).length;
  return { vw: innerWidth, vh: innerHeight, overflowX, pannelliPiccoli: pannelli, scrollW: de.scrollWidth, clientW: de.clientWidth };
})()`;

async function gotoTab(page, nome, refresh) {
  const click = async (pg) => pg.evaluate((n) => {
    const b = [...document.querySelectorAll('button,a,[role=button],[role=tab]')]
      .find(x => (x.textContent || '').trim().toLowerCase().startsWith(n.toLowerCase()) && x.offsetParent);
    if (b) b.click();
  }, nome);
  try { await click(page); }
  catch (e) {
    if (!refresh) throw e;
    page = await refresh();
    await click(page);
  }
  await sleep(1600);
  return page;
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages[0];
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));

  // Salva impostazioni originali
  const orig = {
    rot: sh(['settings', 'get', 'system', 'accelerometer_rotation']),
    urot: sh(['settings', 'get', 'system', 'user_rotation']),
    font: sh(['settings', 'get', 'system', 'font_scale']),
    night: sh(['settings', 'get', 'secure', 'ui_night_mode']),
  };
  console.log('ORIG', JSON.stringify(orig));

  const tabs = ['Oggi', 'Squadra', 'Piano', 'Dati'];
  const scenari = [
    { nome: 'portrait-font1-light', font: '1.0', night: '2', rot: '0', urot: '0' },
    { nome: 'portrait-font1.3', font: '1.3', night: '2', rot: '0', urot: '0' },
    { nome: 'portrait-font1.5', font: '1.5', night: '2', rot: '0', urot: '0' },
    { nome: 'dark-font1', font: '1.0', night: '3', rot: '0', urot: '0' },
    { nome: 'landscape-font1', font: '1.0', night: '2', rot: '0', urot: '1' },
    { nome: 'landscape-font1.3', font: '1.3', night: '2', rot: '0', urot: '1' },
    { nome: 'dark-landscape', font: '1.0', night: '3', rot: '0', urot: '1' },
  ];

  const pickPage = async () => {
    for (let i = 0; i < 20; i++) {
      try {
        const ps = await browser.pages();
        for (const p of ps) {
          try { if ((await p.evaluate(() => document.visibilityState)) === 'visible' && (await p.evaluate(() => document.readyState)) === 'complete') return p; } catch {}
        }
      } catch {}
      await sleep(1000);
    }
    return page;
  };
  for (const sc of scenari) {
    sh(['settings', 'put', 'system', 'font_scale', sc.font]);
    sh(['settings', 'put', 'secure', 'ui_night_mode', sc.night]);
    sh(['settings', 'put', 'system', 'accelerometer_rotation', sc.rot]);
    sh(['settings', 'put', 'system', 'user_rotation', sc.urot]);
    await sleep(3500);
    page = await pickPage(); // il cambio font/rotazione puo' ricaricare la WebView
    for (const t of tabs) {
      page = await gotoTab(page, t, pickPage);
      let m = await page.evaluate(MISURA_VISTA).catch(async () => {
        page = await pickPage();
        return page.evaluate(MISURA_VISTA).catch(() => null);
      });
      console.log(`VISTA ${sc.nome}/${t}`, JSON.stringify(m));
      if (t === 'Squadra' || t === 'Piano') await shot(page, `${sc.nome}-${t.toLowerCase()}`);
    }
  }

  // Display piccolo (schermo ridotto)
  sh(['wm', 'size', '720x1280']);
  await sleep(2200);
  page = await pickPage();
  sh(['settings', 'put', 'system', 'font_scale', '1.3']);
  await sleep(2000);
  page = await pickPage();
  for (const t of ['Oggi', 'Squadra', 'Piano']) {
    page = await gotoTab(page, t, pickPage);
    let m = await page.evaluate(MISURA_VISTA).catch(async () => {
        page = await pickPage();
        return page.evaluate(MISURA_VISTA).catch(() => null);
      });
    console.log(`VISTA piccolo/${t}`, JSON.stringify(m));
    if (t === 'Squadra') await shot(page, 'display-piccolo-squadra');
  }
  sh(['wm', 'size', 'reset']);
  page = await pickPage();
  sh(['settings', 'put', 'system', 'font_scale', orig.font]);
  sh(['settings', 'put', 'secure', 'ui_night_mode', orig.night]);
  sh(['settings', 'put', 'system', 'user_rotation', orig.urot]);
  sh(['settings', 'put', 'system', 'accelerometer_rotation', orig.rot]);
  await sleep(2500);
  page = await pickPage();
  console.log('SETTINGS_RESTORE', JSON.stringify(orig));

  // --- Tastiera in un form (ricerca Squadra) ---
  page = await gotoTab(page, 'Squadra', pickPage);
  const kb = await page.evaluate(async () => {
    const inp = [...document.querySelectorAll('input')].find(i => i.offsetParent && (i.placeholder || '').length > 2);
    if (!inp) return 'no-input';
    inp.focus();
    inp.click();
    await new Promise(r => setTimeout(r, 1800));
    return { vv: window.visualViewport ? { h: window.visualViewport.height, off: window.visualViewport.offsetTop } : null, ih: innerHeight };
  });
  console.log('TASTIERA', JSON.stringify(kb));
  await page.evaluate(() => document.activeElement && document.activeElement.blur());

  // --- Squadra: scroll + latenza ricerca ---
  const squadra = await page.evaluate(async () => {
    const list = document.querySelector('.overflow-y-auto, .app-fixed-scroll, main');
    const t0 = performance.now();
    if (list) { list.scrollTop = 0; }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scrollMs = performance.now() - t0;
    const inp = [...document.querySelectorAll('input')].find(i => i.offsetParent);
    let searchMs = null;
    if (inp) {
      const t1 = performance.now();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'zzz-inesistente');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      searchMs = performance.now() - t1;
      setter.call(inp, '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { scrollMs: Math.round(scrollMs), searchMs: searchMs && Math.round(searchMs), atleti: document.querySelectorAll('div[role="button"], article, li').length };
  });
  console.log('SQUADRA', JSON.stringify(squadra));
  await shot(page, 'squadra-100-atleti');

  // --- Stampa: piano atleta + composizione corsie ---
  const printInfo = await page.evaluate(() => ({
    bridge: typeof (window.AndroidBridge?.printHtml === 'function' || window.androidBridge === 'function'),
    winPrint: typeof window.print,
  }));
  console.log('PRINT_ENV', JSON.stringify(printInfo));
  // Regia -> stampa composizione
  page = await gotoTab(page, 'Vasca', pickPage);
  await sleep(1200);
  const regia = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Regia/i.test(x.textContent || ''));
    if (b) b.click();
    return !!b;
  });
  await sleep(2000);
  const stampaCorsie = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.querySelector('svg') && /stamp|print/i.test((x.getAttribute('aria-label') || '') + (x.title || '') + (x.textContent || '')));
    const b2 = [...document.querySelectorAll('button')].find(x => /Composizione|Stamp/i.test(x.textContent || '') || /stamp/i.test(x.getAttribute('title') || ''));
    const btn = b || b2;
    if (!btn) return 'no-btn';
    btn.click();
    return 'clicked';
  });
  await sleep(2500);
  console.log('STAMPA_CORSSIE', regia, stampaCorsie);
  await shot(page, 'stampa-corsie-preview');

  console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.disconnect();
  console.log('DONE');
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
