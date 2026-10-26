#!/usr/bin/env node
/** ui-buttons.mjs — elenca i pulsanti visibili per schermata (debug dei trigger). */
import { rm } from 'node:fs/promises';
import { CDP, clickByText, evaluate, fetchJson, findChrome, launchChrome, seedDemo, sleep, tempProfile, waitForApp } from './lib/cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const WIDTH = Number(args.width || 360);
const TABS = (args.tabs || 'oggi,piano,atleti,dati,fonti').split(',');
const URL = args.url || 'http://localhost:3000/';
const PORT = Number(args.port || 9336);
const TITLES = { oggi: 'Dashboard', piano: 'Allenamenti', atleti: 'Atleti', fonti: 'Gare', dati: 'Dati' };

const chrome = findChrome(args.chrome);
const profile = tempProfile();
const proc = launchChrome({ chrome, port: PORT, width: WIDTH, height: 900, profile });
try {
  const version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
  const cdp = await CDP.connect(version.webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false);
  cdp.sessionId = sessionId;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH <= 480 });
  await cdp.send('Page.navigate', { url: URL });
  await sleep(800);
  await seedDemo(cdp);
  await cdp.send('Page.reload');
  await sleep(1600);
  await waitForApp(cdp);

  for (const tab of TABS) {
    await clickByText(cdp, TITLES[tab]);
    await sleep(800);
    const btns = await evaluate(cdp, `[...document.querySelectorAll('main button')].map(b => (b.innerText||b.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ')).filter(Boolean)`);
    console.log(`\n=== ${tab} (${btns.length} pulsaggi) ===`);
    console.log(btns.join(' | '));
  }
  cdp.close();
} finally {
  try { proc.kill(); } catch { /* ignore */ }
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
