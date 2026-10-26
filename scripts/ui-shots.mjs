#!/usr/bin/env node
/**
 * ui-shots.mjs — verifica visiva multi-viewport di FINPcoach.
 *
 * Apre Chrome headless via CDP (Chrome DevTools Protocol) senza dipendenze
 * esterne (niente Playwright/Puppeteer: si usa il WebSocket globale di Node),
 * imposta il viewport richiesto, carica l'app con il dataset demo e salva
 * uno screenshot per ogni schermata a ogni larghezza indicata.
 *
 * Uso:
 *   node scripts/ui-shots.mjs                       # 360 / 768 / 1024 / 1440
 *   node scripts/ui-shots.mjs --widths=360,768      # solo alcune larghezze
 *   node scripts/ui-shots.mjs --tabs=oggi,piano     # solo alcune schermate
 *   node scripts/ui-shots.mjs --out=tmp/ui          # cartella di output
 *   node scripts/ui-shots.mjs --url=http://localhost:3000/
 *
 * Nota: il server di sviluppo deve essere già attivo (npm run dev).
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  CDP, clickByText, evaluate, fetchJson, findChrome, launchChrome,
  seedDemo, sleep, tempProfile, waitForApp,
} from './lib/cdp.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);

const WIDTHS = (args.widths || '360,768,1024,1440').split(',').map(Number);
const TABS = (args.tabs || 'oggi,piano,atleti,fonti,dati,cronometro,regia').split(',');
const URL = args.url || 'http://localhost:3000/';
const OUT = path.resolve(args.out || 'tmp/ui-shots');
const PORT = Number(args.port || 9333);
const HEIGHT = Number(args.height || 900);
const FULLPAGE = args.fullpage !== 'false';

const TITLES = {
  oggi: 'Dashboard', piano: 'Allenamenti', atleti: 'Atleti', fonti: 'Gare',
  dati: 'Dati', cronometro: 'Live Deck', regia: 'Pianificatore',
};

/** Misura overflow orizzontale (il sintomo dei contenuti "nascosti"). */
async function overflowReport(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const docW = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > docW + 1 || r.left < -1) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') return;
          bad.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 90),
            left: Math.round(r.left),
            right: Math.round(r.right),
            text: (el.innerText || '').trim().slice(0, 40)
          });
        }
      });
      return {
        docW,
        scrollW: document.documentElement.scrollWidth,
        overflowX: document.documentElement.scrollWidth > docW + 1,
        count: bad.length,
        worst: bad.slice(0, 12)
      };
    })()`
  );
}

async function main() {
  const chrome = findChrome(args.chrome);
  const profile = tempProfile();
  await mkdir(OUT, { recursive: true });
  const proc = launchChrome({ chrome, port: PORT, width: WIDTHS[0], height: HEIGHT, profile });

  const cleanup = async () => {
    try { proc.kill(); } catch { /* ignore */ }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  try {
    const version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    const cdp = await CDP.connect(version.webSocketDebuggerUrl);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false);
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false);
    cdp.sessionId = sessionId;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    const consoleErrors = [];
    cdp.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails?.text || 'exception');
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry?.level === 'error') {
        consoleErrors.push(msg.params.entry.text);
      }
    });

    const report = [];

    for (const width of WIDTHS) {
      const height = width <= 480 ? 780 : width <= 900 ? 1024 : 900;
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: width <= 480,
        screenWidth: width, screenHeight: height,
      });
      await cdp.send('Page.navigate', { url: URL });
      await sleep(800);
      await seedDemo(cdp);
      await cdp.send('Page.reload');
      await sleep(1600);
      const ready = await waitForApp(cdp);
      if (!ready) console.error(`  ! app non pronta a ${width}px`);

      for (const tab of TABS) {
        const clicked = await clickByText(cdp, TITLES[tab] || tab);
        await sleep(900);
        const overflow = await overflowReport(cdp);
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: FULLPAGE,
          optimizeForSpeed: false,
        });
        const file = path.join(OUT, `${String(width).padStart(4, '0')}-${tab}.png`);
        await writeFile(file, Buffer.from(shot.data, 'base64'));
        report.push({ width, tab, clicked, ...overflow, file });
        const flag = overflow.overflowX ? 'OVERFLOW-X' : 'ok';
        console.log(
          `  ${String(width).padStart(4)}px  ${tab.padEnd(10)} ${flag.padEnd(11)} ` +
          `scrollW=${overflow.scrollW} vs ${overflow.docW}  elementi fuori=${overflow.count}`
        );
      }
    }

    await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ report, consoleErrors }, null, 2));
    console.log(`\nScreenshot in: ${OUT}`);
    if (consoleErrors.length) {
      console.log(`\nErrori console (${consoleErrors.length}):`);
      [...new Set(consoleErrors)].slice(0, 20).forEach(e => console.log('  - ' + e));
    } else {
      console.log('\nNessun errore in console.');
    }
    cdp.close();
  } finally {
    await cleanup();
  }
}

main().catch(err => {
  console.error('ui-shots fallito:', err.message);
  process.exitCode = 1;
});
