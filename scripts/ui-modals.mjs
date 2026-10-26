#!/usr/bin/env node
/**
 * ui-modals.mjs — verifica dei modali (finestre, bottom sheet) di FINPcoach.
 *
 * Un modale è la causa più comune di contenuti "nascosti": se il pannello ha
 * un'altezza fissa con overflow nascosto, i pulsanti in fondo non si raggiungono
 * mai. Questo script apre ogni modale e verifica:
 *   1. il pannello è scrollabile quando il contenuto eccede l'altezza utile;
 *   2. il pannello non esce dal viewport;
 *   3. tutti i controlli del modale sono raggiungibili (visibili o scrollabili);
 *   4. il contenuto non è tagliato orizzontalmente.
 *
 * Uso: node scripts/ui-modals.mjs [--widths=360,768,1440]
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  CDP, clickByText, evaluate, expandSections, fetchJson, findChrome, launchChrome,
  seedDemo, sleep, tempProfile, waitForApp,
} from './lib/cdp.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);

const WIDTHS = (args.widths || '360,768,1440').split(',').map(Number);
/* --height=360 forza la stessa altezza: verifica i modali in landscape. */
const FORCED_HEIGHT = args.height ? Number(args.height) : null;
const URL = args.url || 'http://localhost:3000/';
const OUT = path.resolve(args.out || 'tmp/ui-modals');
const PORT = Number(args.port || 9335);

/**
 * Casi di test: sequenza di passaggi.
 *   [schermata, [etichetta1, etichetta2, ...], nome modale]
 * Ogni passaggio è un clic (testo visibile, aria-label o title). L'ultimo
 * passaggio apre il modale che viene auditato.
 * Alcuni trigger vivono in una card mostrata solo dopo un'azione (es. la
 * dashboard mostra i controlli della seduta solo se c'è una seduta attiva).
 */
const CASES = [
  ['oggi', ['Genera con IA'], 'GeneraSchedaIAModal (Oggi)'],
  /* Il pannello parametri vive nella barra controlli, visibile solo quando
     esiste una scheda per oggi: il setup ne inserisce una. */
  ['oggi', ['Vasca/Tempo'], 'ParametriSedutaModal (Oggi)', `
    (() => {
      const d = new Date();
      const data = String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
      localStorage.setItem('finpcoach_custom_workouts', JSON.stringify([{
        id: 'audit-' + Date.now(), data, testo: '4x100 stile libero',
        creatoIl: new Date().toISOString(), atletaId: null, metriTotali: 400,
      }]));
    })()
  `],
  ['dati', ['Genera con IA'], 'GeneraSchedaIAModal (Schede)'],
  ['atleti', ['Nuovo Atleta'], 'Nuovo/Modifica Atleta'],
  ['atleti', ['Apri scheda di'], 'Dettaglio Atleta'],
  ['atleti', ['Apri scheda di', 'Progressione'], 'Dettaglio Atleta — Progressione'],
  ['atleti', ['Apri scheda di', 'Certificati'], 'Dettaglio Atleta — Certificati'],
  ['piano', ['Aggiungi Nuova Gara'], 'Nuova Gara'],
  ['piano', ['Modifica Date Stagione'], 'Modifica Date Stagione'],
  ['oggi', ['Backup'], 'BackupModal (header)'],
];

const MODAL_AUDIT = `(async () => {
  const doc = document.documentElement;
  const roots = [...document.querySelectorAll('div.fixed.inset-0')].filter(el => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && el.getBoundingClientRect().width > 0;
  });
  if (!roots.length) return { open: false };
  const root = roots[roots.length - 1];
  const panel = root.firstElementChild;
  if (!panel) return { open: false };
  const pr = panel.getBoundingClientRect();
  const cs = getComputedStyle(panel);
  const vh = window.innerHeight;

  /* contenuto scrollabile? Il pannello può delegare lo scroll a un figlio
     (header/footer fissi + body scrollabile): entrambi i casi sono validi. */
  const overflows = panel.scrollHeight > panel.clientHeight + 1;
  const scrollable = ['auto', 'scroll'].includes(cs.overflowY);
  const innerScrollable = [...panel.querySelectorAll('*')].some(el => {
    const s = getComputedStyle(el);
    return ['auto', 'scroll'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
  });
  const scrollableAncestor = el => {
    let p = el.parentElement;
    while (p && p !== panel.parentElement) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll'].includes(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return true;
      p = p.parentElement;
    }
    return false;
  };

  /* controlli raggiungibili */
  const unreachable = [];
  const clipped = [];
  [...panel.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')].forEach(el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const inViewport = r.bottom > 0 && r.top < vh;
    if (!inViewport) {
      /* fuori viewport: ok solo se il pannello scorre */
      if (!(overflows && scrollable) && !scrollableAncestor(el)) {
        unreachable.push((el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40) + ' [' + Math.round(r.top) + '→' + Math.round(r.bottom) + ']');
      }
      return;
    }
    /* dentro il pannello ma fuori dai bordi orizzontali = tagliato */
    if (r.left < pr.left - 1 || r.right > pr.right + 1) {
      clipped.push((el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40));
    }
  });

  /* scroll orizzontale interno non desiderato */
  const hOverflow = panel.scrollWidth > panel.clientWidth + 1;

  /* testo troncato dentro il modale */
  const truncated = [];
  panel.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (own && el.scrollWidth > el.clientWidth + 1 && !['visible', 'auto', 'scroll'].includes(s.overflowX)) {
      truncated.push((el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 50));
    }
  });

  return {
    open: true,
    panelH: Math.round(pr.height),
    panelTop: Math.round(pr.top),
    panelBottom: Math.round(pr.bottom),
    viewportH: vh,
    outsideViewport: pr.top < -2 || pr.bottom > vh + 2,
    overflows, scrollable, innerScrollable,
    contentHidden: overflows && !scrollable && !innerScrollable,
    unreachable, clipped, truncated: truncated.slice(0, 8),
    hOverflow,
  };
})()`;

async function main() {
  const chrome = findChrome(args.chrome);
  const profile = tempProfile();
  await mkdir(OUT, { recursive: true });
  const proc = launchChrome({ chrome, port: PORT, width: WIDTHS[0], height: 900, profile });

  try {
    const version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    const cdp = await CDP.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false);
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false);
    cdp.sessionId = sessionId;
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const report = [];
    let problems = 0;

    for (const width of WIDTHS) {
      const height = FORCED_HEIGHT || (width <= 480 ? 780 : width <= 900 ? 1024 : 900);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: width <= 480,
        screenWidth: width, screenHeight: height,
      });
      await cdp.send('Page.navigate', { url: URL });
      await sleep(1000);
      await seedDemo(cdp);
      await cdp.send('Page.reload');
      await sleep(1600);
      await waitForApp(cdp);

      for (const [tab, steps, name, setup] of CASES) {
        /* Ricarica l'app: ogni caso riparte da uno stato pulito (il trigger
           "Seduta Straordinaria" esiste solo se non è già attivo). */
        await cdp.send('Page.reload');
        await sleep(1500);
        await waitForApp(cdp);
        if (setup) {
          await evaluate(cdp, setup);
          await cdp.send('Page.reload');
          await sleep(1500);
          await waitForApp(cdp);
        }

        await clickByText(cdp, { oggi: 'Dashboard', piano: 'Allenamenti', atleti: 'Atleti', dati: 'Dati', fonti: 'Gare' }[tab]);
        await sleep(700);
        /* I trigger possono vivere dentro una Sezione collassata su mobile. */
        await expandSections(cdp);
        await sleep(400);

        /* sequenza di passaggi: solo l'ultimo deve aprire il modale */
        let clicked = false;
        for (let i = 0; i < steps.length; i++) {
          const ok = await clickByText(cdp, steps[i]);
          await sleep(i === steps.length - 1 ? 800 : 600);
          if (!ok) { clicked = false; break; }
          if (i === steps.length - 1) clicked = true;
        }
        const a = await evaluate(cdp, MODAL_AUDIT);
        report.push({ width, tab, steps, name, ...a });

        const flags = [];
        if (!a.open) flags.push('MODALE-NON-APERTO');
        if (a.contentHidden) flags.push('CONTENUTO-NASCOSTO');
        if (a.outsideViewport) flags.push('FUORI-VIEWPORT');
        if (a.unreachable?.length) flags.push(`CONTROLLI-IRRAGGIUNGIBILI x${a.unreachable.length}`);
        if (a.clipped?.length) flags.push(`TAGLIATI x${a.clipped.length}`);
        if (a.truncated?.length) flags.push(`TESTO-TRONCATO x${a.truncated.length}`);
        if (a.hOverflow) flags.push('OVERFLOW-X-INTERNO');
        if (flags.length) problems++;

        console.log(`${String(width).padStart(4)}px ${name.padEnd(32)} ${flags.length ? '⚠ ' + flags.join(' ') : '✓'}`);
        if (!clicked) console.log(`        (passaggio non riuscito: ${steps.join(' → ')})`);
        (a.unreachable || []).forEach(u => console.log(`        irraggiungibile: ${u}`));
        (a.clipped || []).forEach(u => console.log(`        tagliato: ${u}`));
        (a.truncated || []).forEach(u => console.log(`        troncato: "${u}"`));
        if (a.open) console.log(`        pannello h=${a.panelH} top=${a.panelTop} bottom=${a.panelBottom} (viewport ${a.viewportH}) overflow=${a.overflows} scrollable=${a.scrollable}`);

        /* chiudi il modale */
        await evaluate(cdp, `(() => {
          const root = [...document.querySelectorAll('div.fixed.inset-0')].pop();
          if (!root) return;
          const btn = [...root.querySelectorAll('button')].find(b => /chiudi|annulla|×|✕|chiudi/i.test((b.getAttribute('aria-label') || b.innerText || '').trim()));
          if (btn) btn.click();
          else { const scrim = root; scrim.click(); }
        })()`);
        await sleep(400);
      }
    }

    await writeFile(path.join(OUT, 'modals.json'), JSON.stringify(report, null, 2));
    console.log(`\n${problems} modali con problemi. Report: ${path.join(OUT, 'modals.json')}`);
    cdp.close();
  } finally {
    try { proc.kill(); } catch { /* ignore */ }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error('ui-modals fallito:', err.message);
  process.exitCode = 1;
});
