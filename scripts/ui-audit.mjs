#!/usr/bin/env node
/**
 * ui-audit.mjs — audit oggettivo del layout di FINPcoach a più viewport.
 *
 * Non serve un modello con visione: tutte le verifiche sono DOM/CSS.
 *   1. overflow orizzontale della pagina
 *   2. testo troncato (scrollWidth > clientWidth con overflow nascosto)
 *   3. elementi interattivi sovrapposti (un controllo copre l'altro)
 *   4. tap target più piccoli di 40px
 *   5. copertura del dock fisso (contenuto sotto la barra, senza padding)
 *   6. coerenza delle variabili --header-h / --dock-h misurate dal runtime
 *
 * Uso:
 *   node scripts/ui-audit.mjs
 *   node scripts/ui-audit.mjs --widths=360,1440 --tabs=oggi,piano
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
/* --height=360 forza la stessa altezza per tutte le larghezze: serve a
   verificare il layout orizzontale (telefono in landscape, finestra bassa). */
const FORCED_HEIGHT = args.height ? Number(args.height) : null;
const TABS = (args.tabs || 'oggi,piano,atleti,fonti,dati,cronometro,regia').split(',');
const URL = args.url || 'http://localhost:3000/';
const OUT = path.resolve(args.out || 'tmp/ui-audit');
const PORT = Number(args.port || 9334);

const TITLES = {
  oggi: 'Dashboard', piano: 'Allenamenti', atleti: 'Atleti', fonti: 'Gare',
  dati: 'Dati', cronometro: 'Live Deck', regia: 'Pianificatore',
};

const AUDIT = `(async () => {
  const doc = document.documentElement;
  const docW = doc.clientWidth;
  const out = {
    docW,
    scrollW: doc.scrollWidth,
    overflowX: doc.scrollWidth > docW + 1,
    clipped: [],
    truncated: [],
    overlaps: [],
    smallTargets: [],
    tinyText: [],
    offscreen: [],
    dock: null,
  };

  const desc = el => {
    const cls = (el.className && el.className.baseVal !== undefined)
      ? el.className.baseVal : String(el.className || '');
    return el.tagName.toLowerCase() + (cls ? '.' + cls.trim().split(/\\s+/).slice(0, 4).join('.') : '')
      + ' «' + (el.innerText || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 42) + '»';
  };

  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /* ---- 1/2. testo troncato e clipping ----
     Distinguiamo due casi:
       - "clipped"  : overflow nascosto SENZA ellipsis -> contenuto perso
                      (difetto reale: va segnalato)
       - "truncated" : text-overflow: ellipsis -> troncamento voluto
                      (info, non un difetto: es. nomi lunghi in una chip) */
  document.querySelectorAll('body *').forEach(el => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasOwnText) return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    if (cs.overflowX === 'visible' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') return;
    const rec = {
      el: desc(el),
      text: (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
      scrollW: el.scrollWidth, clientW: el.clientWidth,
    };
    if (cs.textOverflow === 'ellipsis') out.truncated.push(rec);
    else out.clipped.push(rec);
  });

  /* ---- 3. elementi interattivi sovrapposti ---- */
  const inter = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')]
    .filter(el => visible(el) && !el.disabled);
  const fixedEls = el => {
    if (getComputedStyle(el).position === 'fixed') return true;
    let p = el.parentElement;
    while (p && p !== document.body) {
      if (getComputedStyle(p).position === 'fixed') return true;
      p = p.parentElement;
    }
    return false;
  };
  for (let i = 0; i < inter.length; i++) {
    for (let j = i + 1; j < inter.length; j++) {
      const a = inter[i], b = inter[j];
      if (a.contains(b) || b.contains(a)) continue;
      /* Le barre fisse (dock/header) passano sopra il contenuto durante lo
         scroll: non è un difetto, è il pattern "app". Il controllo vero è
         "alla fine della pagina n resta sotto la barra" (vedi blocco dock). */
      if (fixedEls(a) || fixedEls(b)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 3 && oy > 3) {
        out.overlaps.push({ a: desc(a), b: desc(b), ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }

  /* ---- 4. tap target piccoli (solo controlli "a blocco") ---- */
  inter.forEach(el => {
    const r = el.getBoundingClientRect();
    const label = (el.innerText || el.getAttribute('aria-label') || '').trim();
    const inline = getComputedStyle(el).display === 'inline';
    if (inline) return;
    if (r.height < 40 || r.width < 28) {
      out.smallTargets.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height), icon: !label && !!el.querySelector('svg') });
    }
  });

  /* ---- 4b. testo sotto i 10px: illeggibile su schermi piccoli e ad alta densità ---- */
  document.querySelectorAll('body *').forEach(el => {
    if (!visible(el)) return;
    const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasOwnText) return;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (fs > 0 && fs < 9.5) {
      out.tinyText.push({ el: desc(el), fs: Math.round(fs * 10) / 10 });
    }
  });

  /* ---- 5/6. dock fisso, metriche runtime, contenuto che resta sotto la barra ---- */
  const dock = document.querySelector('nav[aria-label="Navigazione principale"]');
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  if (dock && main) {
    const cs = getComputedStyle(main);
    const dockRect = dock.getBoundingClientRect();
    const dockH = dockRect.height;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const cssDock = parseFloat(getComputedStyle(doc).getPropertyValue('--dock-h')) || 0;
    const cssHeader = parseFloat(getComputedStyle(doc).getPropertyValue('--header-h')) || 0;
    out.dock = {
      dockH: Math.round(dockH),
      paddingBottom: Math.round(padB),
      cssDockVar: Math.round(cssDock),
      cssHeaderVar: Math.round(cssHeader),
      realHeader: header ? Math.round(header.getBoundingClientRect().height) : 0,
      covered: padB + 4 < dockH,
      hiddenAtBottom: [],
    };
    /* Scorri in fondo: nessun controllo deve restare sotto la barra fissa.
       (scroll-behavior: smooth va disattivato: l'animazione falserebbe la misura) */
    const prevSmooth = doc.style.scrollBehavior;
    doc.style.scrollBehavior = 'auto';
    window.scrollTo(0, doc.scrollHeight);
    await new Promise(r => setTimeout(r, 350));
    window.scrollTo(0, doc.scrollHeight);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = dock.getBoundingClientRect();
    if (after.height > 0) {
      const hasFixedAncestor = el => {
        let p = el.parentElement;
        while (p && p !== document.body) {
          if (getComputedStyle(p).position === 'fixed') return true;
          p = p.parentElement;
        }
        return false;
      };
      [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')]
        .filter(el => {
          const cs2 = getComputedStyle(el);
          if (cs2.display === 'none' || cs2.visibility === 'hidden') return false;
          if (cs2.position === 'fixed' || hasFixedAncestor(el)) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 &&
            r.bottom > after.top + 2 && r.top < after.bottom - 2 &&
            r.right > after.left && r.left < after.right;
        })
        .slice(0, 8)
        .forEach(el => {
          const r = el.getBoundingClientRect();
          out.dock.hiddenAtBottom.push({ el: desc(el), top: Math.round(r.top), bottom: Math.round(r.bottom), dockTop: Math.round(after.top) });
        });
    }
    window.scrollTo(0, 0);
    doc.style.scrollBehavior = prevSmooth;
  }

  /* ---- 7. elementi fuori dal viewport ----
     Non è un difetto se l'elemento:
       - vive dentro un contenitore scorrevole orizzontalmente (ds-scroll-x)
       - è decorativo e viene ritagliato da un antenato con overflow hidden
     In entrambi i casi resta raggiungibile (scroll) o invisibile per scelta. */
  const scrollableAncestor = el => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
      if (ox === 'hidden' || ox === 'clip') return true; // contenuto ritagliato
      p = p.parentElement;
    }
    return false;
  };
  document.querySelectorAll('body *').forEach(el => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    if (scrollableAncestor(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > docW + 1 || r.left < -1) out.offscreen.push({ el: desc(el), left: Math.round(r.left), right: Math.round(r.right) });
  });

  out.clipped = out.clipped.slice(0, 15);
  out.truncated = out.truncated.slice(0, 15);
  out.overlaps = out.overlaps.slice(0, 15);
  out.smallTargets = out.smallTargets.slice(0, 15);
  out.tinyText = out.tinyText.slice(0, 15);
  out.offscreen = out.offscreen.slice(0, 15);
  return out;
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

    const errors = [];
    cdp.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails?.text || 'exception');
    });

    const report = [];
    let problems = 0;

    for (const width of WIDTHS) {
      const height = FORCED_HEIGHT || (width <= 480 ? 780 : width <= 900 ? 1024 : 900);
      const viewport = `${width}x${height}`;
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

      for (const tab of TABS) {
        await clickByText(cdp, TITLES[tab] || tab);
        await sleep(800);
        const a = await evaluate(cdp, AUDIT);
        report.push({ width, tab, ...a });

        const flags = [];
        if (a.overflowX) flags.push(`OVERFLOW-X(${a.scrollW}>${a.docW})`);
        if (a.clipped.length) flags.push(`TESTO-TRONCATO x${a.clipped.length}`);
        if (a.overlaps.length) flags.push(`SOVRAPPOSIZIONE x${a.overlaps.length}`);
        if (a.offscreen.length) flags.push(`FUORI-VIEWPORT x${a.offscreen.length}`);
        if (a.dock && a.dock.covered) flags.push('DOCK-NON-COPERTO');
        if (a.dock && a.dock.hiddenAtBottom.length) flags.push(`SOTTO-DOCK x${a.dock.hiddenAtBottom.length}`);
        if (a.dock && Math.abs(a.dock.cssHeaderVar - a.dock.realHeader) > 2) flags.push('HEADER-VAR-MISMATCH');
        if (a.tinyText && a.tinyText.length) flags.push(`TESTO<9.5px x${a.tinyText.length}`);
        if (flags.length) problems++;

        console.log(`${String(width).padStart(4)}px${FORCED_HEIGHT ? 'x'+height : ''} ${tab.padEnd(10)} ${flags.length ? '⚠ ' + flags.join(' ') : '✓'}`);
        a.clipped.forEach(c => console.log(`        troncato: ${c.el} — "${c.text}" (${c.scrollW}>${c.clientW})`));
        a.overlaps.forEach(o => console.log(`        sovrapposto: ${o.a} ⨯ ${o.b} (${o.ox}x${o.oy}px)`));
        a.offscreen.forEach(o => console.log(`        fuori viewport: ${o.el} [${o.left}→${o.right}]`));
        if (a.tinyText && a.tinyText.length) a.tinyText.forEach(t => console.log(`        testo piccolo: ${t.el} ${t.fs}px`));
        if (a.dock) {
          console.log(`        dock h=${a.dock.dockH} padBottom=${a.dock.paddingBottom} cssVar=${a.dock.cssDockVar} | header reale=${a.dock.realHeader} cssVar=${a.dock.cssHeaderVar}`);
          (a.dock.hiddenAtBottom || []).forEach(h => console.log(`        sotto il dock a fine pagina: ${h.el} [${h.top}→${h.bottom}] dockTop=${h.dockTop}`));
        }
        a.smallTargets.forEach(t => console.log(`        tap piccolo: ${t.el} ${t.w}x${t.h}${t.icon ? ' (icona)' : ''}`));
      }
    }

    await writeFile(path.join(OUT, 'audit.json'), JSON.stringify({ report, errors }, null, 2));
    console.log(`\n${problems} combinazioni con problemi su ${WIDTHS.length * TABS.length} controllate.`);
    console.log(`Report: ${path.join(OUT, 'audit.json')}`);
    cdp.close();
  } finally {
    try { proc.kill(); } catch { /* ignore */ }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error('ui-audit fallito:', err.message);
  process.exitCode = 1;
});
