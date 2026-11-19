const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  let page; for (const p of await browser.pages()) { try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {} }
  // Pronto: naviga a Vasca/cronometro se serve
  const info = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('div[role="button"]')].filter(d => d.querySelector('button[aria-label^="Stop"]') || d.getBoundingClientRect().height > 30);
    const t = tiles.find(d => { const r = d.getBoundingClientRect(); return r.top > 100 && r.width > 50; });
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, dpr: devicePixelRatio };
  });
  if (!info) { console.log('NO_TILES'); process.exit(0); }
  const lat = [];
  const cdp = await page.createCDPSession();
  for (let i = 0; i < 24; i++) {
    const t0 = Date.now();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.x * info.dpr, y: info.y * info.dpr, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    // frame successivo nel renderer
    const dt = await page.evaluate(() => new Promise(res => {
      const t = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t)));
    }));
    lat.push(Date.now() - t0 + dt * 0 + (Date.now() - t0 - (Date.now() - t0)) ); // placeholder
    lat[lat.length - 1] = (Date.now() - t0); // upper bound: dispatch->ritorno evaluate
    await new Promise(r => setTimeout(r, 60));
  }
  lat.sort((a, b) => a - b);
  const p = q => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))];
  console.log(JSON.stringify({ n: lat.length, p50: p(0.5), p95: p(0.95), max: lat[lat.length - 1] }));
  await browser.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
