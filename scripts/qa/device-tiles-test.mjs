#!/usr/bin/env node
/**
 * Test CDP delle tessere del cronometro su build .qa (dati sintetici).
 *
 * Per ogni scenario (corsie x atleti) inietta una sessione 'in_corso'
 * con cognomi lunghi (14-16 caratteri, come da requisito), ricarica,
 * misura:
 *  - altezza delle tessere atleta;
 *  - scrollWidth <= clientWidth del cognome;
 *  - nessuna sovrapposizione del bottone ■ col cognome;
 *  - nessun contenuto oltre i bordi della tessera (il bottone stop,
 *    area di tocco >=44px, e' escluso: in tessere <48px puo'
 *    legittimamente coprire il gap, mai il nome).
 *
 * Uso: node scripts/qa/device-tiles-test.mjs [corsieXatleti ...]
 */
import puppeteer from 'puppeteer-core';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const scenari = (process.argv.slice(2).length ? process.argv.slice(2) : ['6x8', '4x6', '3x4', '2x2'])
  .map(s => s.split('x').map(Number));

// Nomi da 14-16 caratteri (esempi del requisito + varianti).
const COGNOMI = [
  'QA-Montanari12', 'QA-De-Santis-09', 'QA-Bellini-Rossi', 'QA-Ferrari-Long',
  'QA-Ricci-Armani', 'QA-Greco-Vitale', 'QA-Marchetti-B', 'QA-Colombo-Stef',
];

function buildSession(C, A) {
  const lanes = [];
  for (let c = 1; c <= C; c++) {
    const atleti = [];
    for (let i = 0; i < A; i++) {
      const started = i % 3 !== 2;
      atleti.push({
        id: `at-${c}-${i}`,
        atletaId: null,
        cognome: COGNOMI[(c + i) % COGNOMI.length],
        repStart: started ? Date.now() - 30000 : null,
        restUntil: null,
        lastRepStart: null,
        primoVia: started ? Date.now() - 60000 : null,
        started,
        fermo: false,
        laps: started ? [{ t: Date.now() - 20000, ms: 20000 }] : [],
        ripartenzaAtleta: null,
        targetLaps: null,
        autoAnchorT: null,
        autoWarned: false,
      });
    }
    lanes.push({ numero: c, ripartenzaCorsia: null, intervalloPartenza: null, atleti, pendingAuto: null });
  }
  return {
    id: 'ses-qa',
    t0: Date.now() - 120000,
    stato: 'in_corso',
    ripartenzaGenerale: 60,
    shiftMs: 0,
    pausedSessionAt: null,
    pausedWallAt: null,
    lanes,
  };
}

const MISURA = `(() => {
  const tiles = [...document.querySelectorAll('section div[role="button"]')]
    .filter(d => d.querySelector('button[aria-label^="Stop"]') ||
      [...d.querySelectorAll('span')].some(sp => sp.className.includes('truncate')));
  const uniq = new Set();
  const righe = [];
  let fail = 0;
  for (const t of tiles) {
    const tr = t.getBoundingClientRect();
    if (tr.height < 10) continue;
    uniq.add(Math.round(tr.height * 10) / 10);
    const nameEl = [...t.querySelectorAll('span')].find(sp =>
      sp.className.includes('truncate') && sp.textContent && sp.textContent.trim().length > 3);
    const stopBtn = t.querySelector('button[aria-label^="Stop"]');
    const stopInner = stopBtn ? stopBtn.querySelector('span') : null;
    const stopBox = (stopInner || stopBtn)?.getBoundingClientRect();
    const nameBox = nameEl?.getBoundingClientRect();
    const prob = [];
    if (nameEl && nameEl.scrollWidth > nameEl.clientWidth + 1) prob.push('nome-troncato-forzato');
    if (nameBox && stopBox && !(nameBox.right <= stopBox.left + 1 || nameBox.left >= stopBox.right - 1 || nameBox.bottom <= stopBox.top + 1 || nameBox.top >= stopBox.bottom - 1)) {
      prob.push('overlap-nome-stop');
    }
    for (const ch of t.querySelectorAll('*')) {
      if (ch === stopBtn || (stopBtn && stopBtn.contains(ch))) continue; // target touch >=44px
      const r = ch.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < tr.left - 1 || r.right > tr.right + 1 || r.top < tr.top - 1 || r.bottom > tr.bottom + 1) {
        prob.push('fuori-bordo:' + (ch.className || ch.tagName).toString().slice(0, 30));
        break;
      }
    }
    if (prob.length) fail++;
    righe.push({ h: Math.round(tr.height * 10) / 10, nome: nameEl ? nameEl.textContent.trim().slice(0, 22) : '?', stop: !!stopBtn, prob: [...new Set(prob)] });
  }
  const hs = [...uniq].sort((a, b) => a - b);
  return { tiles: tiles.length, altezze: hs, minH: hs.length ? hs[0] : 0, maxH: hs.length ? hs[hs.length - 1] : 0, fail, righe: righe.slice(0, 8) };
})()`;

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages[0];
  for (const p of pages) {
    try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {}
  }

  for (const [C, A] of scenari) {
    await page.evaluate((s) => {
      const KEY = 'finp_vasca_session_v1';
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === KEY) return;
        return orig.call(this, k, v);
      };
      orig.call(localStorage, KEY, JSON.stringify(s));
      localStorage.setItem('finp_mode', 'live');
      location.reload();
    }, buildSession(C, A));
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, a, [role=button]')]
        .find(x => /^\s*Vasca\s*$/i.test(x.textContent || '') && x.offsetParent);
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Cronometro' && x.getAttribute('aria-pressed') !== 'true');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Attende che la griglia sia renderizzata (max ~8s).
    let res = null;
    for (let i = 0; i < 16; i++) {
      res = await page.evaluate(MISURA);
      if (res && res.tiles > 0) break;
      await new Promise(r => setTimeout(r, 500));
    }
    const diag = await page.evaluate(() => ({
      vw: innerWidth, vh: innerHeight,
      orient: screen.orientation && screen.orientation.type,
      secs: document.querySelectorAll('.grid section').length,
      vista: [...document.querySelectorAll('button')].filter(b => /Cronometro|Regia/.test(b.textContent || '')).map(b => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')),
    }));
    console.log(`SCENARIO ${C}x${A}:`, JSON.stringify({ ...diag, ...res }));
  }
  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
