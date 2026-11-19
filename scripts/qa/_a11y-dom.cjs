const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  let page; for (const p of await browser.pages()) { try { if ((await p.evaluate(() => document.visibilityState)) === 'visible') { page = p; break; } } catch {} }
  const res = await page.evaluate(() => {
    const small = [], smallText = [];
    document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex="0"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      if (Math.min(r.width, r.height) < 44 && r.width < 200) small.push((el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    document.querySelectorAll('body *').forEach(el => {
      if (el.children.length > 0) return;
      const t = (el.textContent || '').trim();
      if (!t) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) smallText.push(t.slice(0, 25) + '@' + fs + 'px');
    });
    return { smallTouch: [...new Set(small)].slice(0, 20), nSmall: new Set(small).size, smallText: [...new Set(smallText)].slice(0, 20), nText: new Set(smallText).size };
  });
  console.log(JSON.stringify(res, null, 1));
  await browser.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
