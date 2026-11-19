const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const ADB = 'C:\Users\matti\AppData\Local\Android\Sdk\platform-tools\adb.exe';
const sh = c => execSync(`"${ADB}" shell ${c}`, { encoding: 'utf8' }).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function buildSession() {
  const lanes = [];
  for (let c = 1; c <= 3; c++) {
    const atleti = [];
    for (let i = 0; i < 4; i++) atleti.push({ id:`at-${c}-${i}`, atletaId:null, cognome:`QA-${c}${i}`, repStart:Date.now(), restUntil:null, lastRepStart:null, primoVia:Date.now()-30000, started:true, fermo:false, laps:[{t:Date.now(),ms:30000,start:Date.now()-30000}], ripartenzaAtleta:null, targetLaps:null, autoAnchorT:null, autoWarned:false });
    lanes.push({ numero:c, ripartenzaCorsia:null, intervalloPartenza:null, atleti, pendingAuto:null });
  }
  return { id:'ses-drift', t0:Date.now()-60000, stato:'in_corso', ripartenzaGenerale:60, shiftMs:0, pausedSessionAt:null, pausedWallAt:null, lanes };
}
const TIMER = `(() => {
  const els=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0);
  const cands=els.map(e=>(e.textContent||'').trim()).filter(t=>/^\d{1,3}:\d{2}([.,]\d{1,2})?$/.test(t));
  return cands.length?cands[0]:null;
})()`;
function parseTimer(t){const m=(t||'').match(/(\d+):(\d{2})(?:[.,](\d{1,2}))?/);return m?((+m[1])*60+(+m[2]))*1000+(m[3]?+('0.'+m[3])*1000:0):null;}
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  let page; for (const p of await browser.pages()) { try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {} }
  await page.evaluate(s => {
    const KEY='finp_vasca_session_v1'; const orig=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k===KEY)return;return orig.call(this,k,v)};
    orig.call(localStorage,KEY,JSON.stringify(s)); localStorage.setItem('finp_mode','live'); location.reload();
  }, buildSession());
  await sleep(6000);
  for (let i=0;i<3;i++){ await page.evaluate(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^\s*Vasca\s*$/i.test(x.textContent||'')&&x.offsetParent); if(b)b.click(); }); await sleep(2000);
    const n = await page.evaluate(() => document.querySelectorAll('div[role="button"]').length);
    if (n > 4) break;
    await page.evaluate(() => { const bs=[...document.querySelectorAll('button')].filter(x=>(x.textContent||'').trim()==='Cronometro'); if(bs.length)bs[0].click(); }); await sleep(1500);
  }
  const dbg = await page.evaluate(() => ({ tiles: document.querySelectorAll('div[role="button"]').length, txt: (document.body.innerText||'').slice(0,200) }));
  console.log('DBG', JSON.stringify(dbg));
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const dev = Date.now();
    const txt = await page.evaluate(TIMER).catch(() => null);
    const app = parseTimer(txt);
    if (app != null) samples.push({ dev, app });
    else console.log('noTimer@'+i);
    await sleep(30000);
  }
  let drift = null;
  if (samples.length >= 2) {
    const a = samples[0], b = samples[samples.length-1];
    drift = ((b.app - a.app) % 600000) - (b.dev - a.dev);
  }
  console.log('RESULT samples=' + samples.length + ' driftMs=' + drift);
  // --- test background 5 min: HOME, attesa, torna, cerca "partenza recuperata" ---
  sh('input keyevent KEYCODE_HOME');
  await sleep(300000);
  sh(`am start -n com.mattia.nuotoparalimpico.qa/com.mattia.nuotoparalimpico.MainActivity`);
  await sleep(6000);
  const bg = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return JSON.stringify({ recuperata: /recuperat/i.test(t), stato: (JSON.parse(localStorage.getItem('finp_vasca_session_v1')||'{}').stato||'?') });
  }).catch(e => 'evalfail:' + e.message);
  console.log('BG5MIN', bg);
  await browser.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
