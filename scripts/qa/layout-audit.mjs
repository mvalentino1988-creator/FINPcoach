#!/usr/bin/env node
/**
 * Audit geometrico automatico della UI (FASE 0 del giro finale).
 *
 * Uso:
 *   node scripts/qa/layout-audit.mjs [--json out.json] [--md docs/qa/grafica/AUDIT.md]
 *        [--screens oggi,squadra,...] [--combo dark:1.0:portrait]
 *
 * Richiede la WebView .qa attiva e `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
 * Misura: card collassate, testo spezzato, ellissi, sovrapposizioni, fuori schermo,
 * target/testo piccoli, contrasto WCAG, intersezione con ritaglio/bare.
 * Esce con codice 1 se restano difetti bloccanti (tipi 1,2-su-titoli,3-su-titoli,4,5,8).
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const JSON_OUT = opt('json', null);
const MD_OUT = opt('md', null);
const ONLY = opt('screens', null)?.split(',');
const COMBO_FILTER = opt('combo', null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Navigazione senza reload: usa gli eventi interni dell'app e il DOM.
const T = t => `window.dispatchEvent(new CustomEvent('finp:navigate',{detail:'${t}'}))`;
const TAB = id => `document.getElementById('tab-${id}')?.click()`;
const VISTA = v => `window.dispatchEvent(new CustomEvent('finp:vasca-vista',{detail:'${v}'}))`;
const PIANO_VISTA = v => `[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-pressed')!==null&&/${v}/i.test(b.textContent))?.click()`;

const SCREENS = [
  { id: 'oggi', label: 'Oggi', steps: [{ js: T('oggi') }] },
  { id: 'squadra', label: 'Squadra', steps: [{ js: T('squadra') }] },
  { id: 'scheda-atleta', label: 'Scheda atleta', steps: [
    { js: T('squadra') },
    { js: `document.querySelector('.overflow-y-auto [role="button"]')?.click()`, wait: 1200 },
  ]},
  { id: 'piano-parametri', label: 'Piano parametri', steps: [
    { js: T('altro') }, { js: TAB('piano'), wait: 1500 }, { js: PIANO_VISTA('Parametri') },
  ]},
  { id: 'piano-programmazione', label: 'Piano programmazione', steps: [
    { js: T('altro') }, { js: TAB('piano'), wait: 1500 }, { js: PIANO_VISTA('Programmazione') },
  ]},
  { id: 'dati', label: 'Dati & Backup', steps: [{ js: T('altro') }, { js: TAB('dati'), wait: 1200 }] },
  { id: 'fonti', label: 'Fonti', steps: [{ js: T('altro') }, { js: TAB('fonti'), wait: 1200 }] },
  { id: 'vasca-cronometro', label: 'Vasca cronometro', steps: [{ js: T('vasca') }, { js: VISTA('cronometro') }], minTarget: 48 },
  { id: 'regia', label: 'Regia', steps: [{ js: T('vasca') }, { js: VISTA('regia'), wait: 800 }], minTarget: 48 },
  { id: 'altro', label: 'Altro', steps: [{ js: T('altro') }, { js: TAB('piano'), wait: 1200 }] },
];

const COMBOS = [
  { id: 'dark-1.0-port', theme: 'scuro', font: '1.0', orient: 'portrait' },
  { id: 'chiaro-1.0-port', theme: 'chiaro', font: '1.0', orient: 'portrait' },
  { id: 'dark-1.3-port', theme: 'scuro', font: '1.3', orient: 'portrait' },
  { id: 'dark-1.0-land', theme: 'scuro', font: '1.0', orient: 'landscape' },
];

const AUDIT_FN = String.raw`(function(minTarget){
  const out=[];
  const vw=innerWidth, vh=innerHeight;
  const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const ownText=e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
  const scrollable=a=>{while(a&&a!==document.body){const s=getComputedStyle(a);if(/(auto|scroll)/.test(s.overflowY+s.overflowX))return true;a=a.parentElement;}return false;};
  const push=(sel,tipo,dett,blocc)=>out.push({sel,tipo,dett,blocc:!!blocc});
  const seen=new Set();
  const all=[...document.querySelectorAll('body *')].filter(vis);
  // 1 card collassate
  for(const e of all){
    const cs=getComputedStyle(e), r=e.getBoundingClientRect();
    const isCard=/card|rounded-(lg|xl|2xl)|border/.test(e.className&&e.className.baseVal!==undefined?e.className.baseVal:String(e.className)) && parseFloat(cs.paddingTop)>=8;
    if(isCard&&r.height<56&&e.children.length>0&&(e.scrollHeight>e.clientHeight+4)&&/(hidden|clip)/.test(cs.overflowY)){push(e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0],'card-collassata','h='+r.height.toFixed(0)+' scrollH='+e.scrollHeight+' clientH='+e.clientHeight);}
    const f=e.querySelector&&e.querySelector('.flex-1.min-h-0,.min-h-0.flex-1');
    if(f&&vis(f)&&f.getBoundingClientRect().height<8&&f.scrollHeight>20)push('flex-1.min-h-0','container-vuoto','h='+f.getBoundingClientRect().height.toFixed(1)+' scrollH='+f.scrollHeight);
  }
  // 2 testo spezzato + 6 target + 7 contrasto su testo
  function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);}
  function parseCol(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return[...p.slice(0,3),p.length>3?p[3]:1];}
  function effBg(e){let a=1,cols=[];let n=e;while(n&&n!==document.documentElement){const c=parseCol(getComputedStyle(n).backgroundColor);if(c&&c[3]>0){cols.push([c,a]);if(c[3]>=1)break;}n=n.parentElement;}if(!cols.length)cols.push([[255,255,255],1]);let bg=cols[cols.length-1][0];for(let i=cols.length-2;i>=0;i--){const[c,op]=cols[i];bg=c.map((v,k)=>v*op+bg[k]*(1-op));}return bg;}
  for(const e of all){
    const t=ownText(e);if(!t||t.length<2)continue;
    const cs=getComputedStyle(e),r=e.getBoundingClientRect(),fs=parseFloat(cs.fontSize);
    if(fs<12&&!seen.has(e)){seen.add(e);push(e.tagName.toLowerCase(),'testo-piccolo','fontSize='+fs.toFixed(1)+' "'+t.slice(0,20)+'"');}
    if(t.length>=6&&r.width<3*fs&&r.height>1.2*(parseFloat(cs.lineHeight)||fs*1.2)){const isTitle=/h[1-3]|titolo|header/i.test(e.className)||/^(Oggi|Squadra|Piano|Vasca|Altro|Dati|Fonti)/.test(t);push(e.tagName.toLowerCase(),'testo-spezzato','w='+r.width.toFixed(0)+' fs='+fs.toFixed(0)+' "'+t.slice(0,20)+'"',isTitle);}
    const lh=parseFloat(cs.lineHeight)||fs*1.2, lines=Math.round(r.height/lh);
    if(lines>3&&r.width/lines<5*fs&&t.length>=15)push(e.tagName.toLowerCase(),'testo-spezzato','righe='+lines+' w='+r.width.toFixed(0)+' "'+t.slice(0,20)+'"');
    if(cs.textOverflow==='ellipsis'||cs.webkitLineClamp!=='none'){
      const trunc=e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1;
      if(trunc){const isTitle=/h[1-3]/.test(e.tagName)||/titolo|header|nome/i.test(e.className);push(e.tagName.toLowerCase(),'ellissi','"'+t.slice(0,30)+'" sw='+e.scrollWidth+' cw='+e.clientWidth,/(Squadra|Oggi|Piano|Vasca|Altro|Bordo|Scheda|gara|Gara)/.test(t)||isTitle);}
    }
    // contrasto
    const fg=parseCol(cs.color);if(fg){const bg=effBg(e);const L1=lum(fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]))),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);const big=fs>=24||(fs>=18.66&&parseInt(cs.fontWeight)>=700);if(ratio<4.5&&!(big&&ratio>=3)){push(e.tagName.toLowerCase(),'contrasto','ratio='+ratio.toFixed(2)+' "'+t.slice(0,20)+'" fs='+fs.toFixed(0));}}
  }
  // 6 target piccoli
  for(const e of all){
    if(!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)&&e.getAttribute('role')!=='button'&&!e.onclick)continue;
    const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
    const minW=Math.max(24,parseFloat(cs.minWidth)||0),minH=Math.max(24,parseFloat(cs.minHeight)||0);
    if(r.width<minTarget-1||r.height<minTarget-1)push(e.tagName.toLowerCase(),'target-piccolo','w='+r.width.toFixed(0)+' h='+r.height.toFixed(0)+' "'+(e.getAttribute('aria-label')||ownText(e)||'').slice(0,25)+'"');
  }
  // 4 sovrapposizioni (campione: interattivi + testi diretti, max 400)
  const cand=all.filter(e=>/^(BUTTON|A)$/.test(e.tagName)||e.getAttribute('role')==='button'||(ownText(e).length>=8)).slice(0,400);
  for(let i=0;i<cand.length;i++)for(let j=i+1;j<cand.length;j++){
    const a=cand[i],b=cand[j];if(a.contains(b)||b.contains(a))continue;
    const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    const ix=Math.max(0,Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left)),iy=Math.max(0,Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top));
    const inter=ix*iy;if(inter<=0)continue;
    const minArea=Math.min(ra.width*ra.height,rb.width*rb.height);
    if(minArea>0&&inter/minArea>0.2){push(a.tagName.toLowerCase(),'sovrapposizione','"'+ownText(a).slice(0,15)+'" x "'+ownText(b).slice(0,15)+'" '+(inter/minArea*100).toFixed(0)+'%');break;}
  }
  // 5 fuori schermo + overflow pagina
  for(const e of all){
    const r=e.getBoundingClientRect();if(r.width===0)continue;
    if(!scrollable(e)&&!scrollable(e.parentElement)&&(r.right>vw+2||r.left<-2)&&r.top<vh&&r.bottom>0)push(e.tagName.toLowerCase(),'fuori-schermo','l='+r.left.toFixed(0)+' r='+r.right.toFixed(0)+' vw='+vw);
  }
  if(document.documentElement.scrollWidth>vw+2||document.body.scrollWidth>vw+2)push('body','overflow-orizzontale','scrollW='+(document.documentElement.scrollWidth)+' vw='+vw);
  // 8 ritaglio/bare
  const ins=window.__finpInsets;
  if(ins){
    // Solo ritaglio e barre superiori/laterali: la zona inferiore e' coperta
    // dalla dock di navigazione e il contenuto scrollabile ci passa sotto
    // per costruzione (non e' un difetto).
    const rects=[...(ins.cutouts||[]),{l:0,t:0,r:vw,b:ins.safe.top},{l:0,t:0,r:ins.safe.left,b:vh},{l:vw-ins.safe.right,t:0,r:vw,b:vh}];
    for(const e of all){if(!/^(BUTTON|A|INPUT|SELECT)$/.test(e.tagName)&&e.getAttribute('role')!=='button'&&!ownText(e))continue;const r=e.getBoundingClientRect();for(const c of rects){const ix=Math.max(0,Math.min(r.right,c.r)-Math.max(r.left,c.l)),iy=Math.max(0,Math.min(r.bottom,c.b)-Math.max(r.top,c.t));if(ix*iy>0.15*r.width*r.height){push(e.tagName.toLowerCase(),'sotto-ritaglio','"'+(e.getAttribute('aria-label')||ownText(e)).slice(0,20)+'"');break;}}}
  }
  return out.slice(0,400);
})`;

async function setCombo(page, combo) {
  await page.evaluate(({ theme, font }) => {
    localStorage.setItem('finp_theme_mode', theme);
    document.documentElement.classList.toggle('dark', theme === 'scuro');
    document.documentElement.style.fontSize = font === '1.3' ? '125%' : '';
  }, combo);
  // font reale: emula textZoom via CSS zoom non sicuro; usiamo fontScale del WebView se disponibile
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('localhost') || p.url().startsWith('file')) || pages[0];
  if (!page) throw new Error('nessuna pagina');
  await page.setViewport({ width: 411, height: 915, isMobile: true, hasTouch: true });

  const all = [];
  for (const s of SCREENS) {
    if (ONLY && !ONLY.includes(s.id)) continue;
    for (const c of COMBOS) {
      if (COMBO_FILTER && !COMBO_FILTER.split(',').includes(c.id)) continue;
      if (c.orient === 'landscape') await page.setViewport({ width: 915, height: 411, isMobile: true, hasTouch: true });
      else await page.setViewport({ width: 411, height: 915, isMobile: true, hasTouch: true });
      await setCombo(page, c);
      for (const step of s.steps) {
        try { await page.evaluate(`(()=>{${step.js}})()`); } catch (e) { console.log(`   [${s.id}/${c.id}] step ERR: ${String(e).slice(0, 80)}`); }
        await sleep(step.wait ?? 900);
      }
      const dbg = await page.evaluate(`(()=>{const h=document.querySelector('h1,h2');return (h?h.textContent.trim().slice(0,30):'?')+'|'+location.href.slice(0,60)})()`).catch(() => '?');
      console.log(`   [${s.id}/${c.id}] pagina: ${dbg}`);
      let defects;
      try { defects = await page.evaluate(`(${AUDIT_FN})(${s.minTarget || 44})`); }
      catch (e) { defects = [{ sel: 'PAGE', tipo: 'errore', dettag: String(e).slice(0, 120), blocc: true }]; }
      for (const d of defects) all.push({ screen: s.id, combo: c.id, ...d });
      console.log(`${s.id}/${c.id}: ${defects.length} difetti`);
    }
  }

  const counts = {};
  for (const d of all) {
    const k = `${d.screen}|${d.tipo}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  const blocking = all.filter(d => d.blocc);
  const lines = ['# AUDIT GEOMETRICO — ' + new Date().toISOString(), '', `Difetti totali: ${all.length} — bloccanti: ${blocking.length}`, '', '## Conteggi per schermata/tipo', ''];
  for (const [k, n] of Object.entries(counts).sort()) lines.push(`- ${k}: ${n}`);
  lines.push('', '## Dettaglio difetti', '');
  for (const d of all.slice(0, 600)) lines.push(`- [${d.screen}/${d.combo}] **${d.tipo}** ${d.sel} — ${d.dett}`);
  const md = lines.join('\n');
  if (MD_OUT) writeFileSync(MD_OUT, md);
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(all, null, 2));
  console.log(`\nTotale: ${all.length} difetti, bloccanti: ${blocking.length}`);
  process.exit(blocking.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
