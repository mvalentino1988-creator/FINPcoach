(() => {
  const tiles = [...document.querySelectorAll('section div[role="button"]')]
    .filter(d => d.querySelector('output') || d.querySelector('button[aria-label^="Stop"]'));
  const secs = [...document.querySelectorAll('.grid section')];
  const t = tiles[0];
  let sample = null;
  if (t) {
    const name = [...t.querySelectorAll('span')].find(sp => sp.className.includes('truncate'));
    const btn = t.querySelector('button[aria-label^="Stop"]');
    const nr = name ? name.getBoundingClientRect() : null;
    const br = btn ? btn.getBoundingClientRect() : null;
    const tr = t.getBoundingClientRect();
    sample = {
      tile: { x: Math.round(tr.x), y: Math.round(tr.y), w: Math.round(tr.width), h: Math.round(tr.height) },
      name: nr ? { x: Math.round(nr.x), y: Math.round(nr.y), r: Math.round(nr.right), b: Math.round(nr.bottom), sw: name.scrollWidth, cw: name.clientWidth, cls: name.className.slice(0, 60) } : null,
      btn: br ? { x: Math.round(br.x), y: Math.round(br.y), r: Math.round(br.right), b: Math.round(br.bottom) } : null,
      nameHTML: name ? name.outerHTML.slice(0, 200) : null,
    };
  }
  return {
    vw: innerWidth, vh: innerHeight,
    orient: screen.orientation && screen.orientation.type,
    tiles: tiles.length,
    secs: secs.length,
    perLane: secs.map(s => s.querySelectorAll('div[role="button"]').length),
    sample,
  };
})()
