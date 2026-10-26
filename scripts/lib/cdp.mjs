/**
 * lib/cdp.mjs — client Chrome DevTools Protocol minimale (zero dipendenze).
 * Usato da scripts/ui-shots.mjs e scripts/ui-audit.mjs.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function findChrome(explicit) {
  if (explicit && existsSync(explicit)) return explicit;
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  throw new Error('Nessun Chrome/Edge trovato (usa --chrome=<path>).');
}

export async function fetchJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error(`Endpoint CDP non raggiungibile: ${url}`);
}

export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessionId = null;
    this.listeners = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}`));
        else resolve(msg.result);
        return;
      }
      this.listeners.forEach(fn => fn(msg));
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('Connessione CDP fallita')), { once: true });
    });
    return new CDP(ws);
  }

  on(fn) { this.listeners.push(fn); }

  send(method, params = {}, useSession = true) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout CDP su ${method}`));
        }
      }, 30000);
    });
  }

  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

export async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`JS: ${r.exceptionDetails.text}`);
  return r.result?.value;
}

export async function waitForApp(cdp, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await evaluate(
      cdp,
      `!!document.querySelector('header') && !!document.querySelector('main') && document.body.innerText.length > 40`
    ).catch(() => false);
    if (ok) return true;
    await sleep(200);
  }
  return false;
}

/**
 * Clicca un controllo per testo. Accetta uno o più candidati: per ognuno prova
 * prima il testo visibile, poi aria-label e title (i pulsanti "icona" su mobile
 * non hanno testo visibile, ma restano raggiungibili per screen reader).
 * La priorità evita falsi positivi (es. aria-label "Gestione Dati e Backup"
 * contiene "dati" ma non è la voce di menu "Dati").
 */
export async function clickByText(cdp, text) {
  const candidates = Array.isArray(text) ? text : [text];
  return evaluate(
    cdp,
    `(() => {
      const wanted = ${JSON.stringify(candidates.map(t => String(t).toLowerCase()))};
      const btns = [...document.querySelectorAll('button, a, [role="button"]')];
      const norm = s => (s || '').trim().replace(/\\s+/g, ' ').toLowerCase();
      for (const w of wanted) {
        /* 1. testo visibile */
        let b = btns.find(x => norm(x.innerText).startsWith(w));
        /* 2. testo grezzo (etichette con display:none su mobile) */
        if (!b) b = btns.find(x => norm(x.textContent).startsWith(w));
        /* 3. aria-label identico */
        if (!b) b = btns.find(x => norm(x.getAttribute('aria-label')) === w);
        /* 4. aria-label contenente */
        if (!b) b = btns.find(x => norm(x.getAttribute('aria-label')).includes(w));
        /* 5. title contenente */
        if (!b) b = btns.find(x => norm(x.getAttribute('title')).includes(w));
        if (b) { b.click(); return true; }
      }
      return false;
    })()`
  );
}

/**
 * Apre tutte le sezioni collassate (Sezione usa aria-expanded sul bottone).
 * Serve per raggiungere i trigger che vivono dentro pannelli chiusi.
 */
export async function expandSections(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const heads = [...document.querySelectorAll('button[aria-expanded="false"]')];
      heads.forEach(h => { try { h.click(); } catch (e) {} });
      return heads.length;
    })()`
  );
}

/**
 * Prepara un ambiente deterministico: dataset demo + tab iniziale.
 * Aspetta che il bundle di sviluppo (che espone __FINP_STORAGE) sia pronto
 * prima di scrivere in localStorage, altrimenti il seed verrebbe perso.
 */
export async function seedDemo(cdp, { tab = 'oggi', timeout = 30000 } = {}) {
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < timeout) {
    ready = await evaluate(cdp, '!!window.__FINP_STORAGE').catch(() => false);
    if (ready) break;
    await sleep(250);
  }
  if (!ready) throw new Error('Il bundle di sviluppo non è pronto (manca __FINP_STORAGE): il seed demo non è stato applicato.');

  const applied = await evaluate(cdp, `(() => {
    try {
      localStorage.setItem('finp_mode', 'demo');
      if (typeof window.__FINP_STORAGE.applyDemoSeed === 'function') {
        window.__FINP_STORAGE.applyDemoSeed();
      } else if (typeof window.__FINP_STORAGE === 'function' && window.__FINP_STORAGE.prototype && typeof window.__FINP_STORAGE.applyDemoSeed === 'function') {
        window.__FINP_STORAGE.applyDemoSeed();
      }
      sessionStorage.setItem('finp_active_tab', ${JSON.stringify(tab)});
      return (localStorage.getItem('finp_atleti') || '[]').length;
    } catch (e) {
      return 'ERR:' + e.message;
    }
  })()`);
  if (typeof applied === 'string' && applied.startsWith('ERR:')) throw new Error('Seed demo fallito: ' + applied);
  return applied;
}

export function launchChrome({ chrome, port, width, height, profile }) {
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  return proc;
}

export function tempProfile() {
  return path.join(os.tmpdir(), `finp-ui-${Date.now()}`);
}
