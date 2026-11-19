const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) Soglia compatta: sotto 54px di altezza tessera si usa la riga singola.
rep(`          const tileH = laneCellH(lane);
          const tileW = laneCellW();
          const compact = tileH < 46;`,
`          const tileH = laneCellH(lane);
          const tileW = laneCellW();
          const compact = tileH < 54;`, 'threshold');

// 2) Passa tileH alla tessera per decidere cosa mostrare.
rep(`                    compact={compact}
                    tileW={tileW}`,
`                    compact={compact}
                    tileH={tileH}
                    tileW={tileW}`, 'props-pass');

rep(`  compact: boolean;
  tileW: number;`,
`  compact: boolean;
  tileH: number;
  tileW: number;`, 'props-iface');

rep(`  session, lane, athlete: a, compact, tileW, now, pronta, registerNode, onTap, onLongPress, onToggleStop, ignoredSignal,`,
`  session, lane, athlete: a, compact, tileH, tileW, now, pronta, registerNode, onTap, onLongPress, onToggleStop, ignoredSignal,`, 'props-destructure');

// 3) Nella tessera intera: con altezza ridotta si nascondono i testi
//    secondari (mai tagliati a meta') e il tempo si riduce.
rep(`  const canStop = !pronta && (a.started || a.laps.length > 0 || a.repStart != null || a.restUntil != null);`,
`  // Con tessere basse i testi secondari vengono nascosti del tutto
  // (mai tagliati a meta'): il layout deve restare leggibile.
  const showSub = tileH >= 76;
  const timeFont = tileH >= 76 ? 20 : 16;
  const canStop = !pronta && (a.started || a.laps.length > 0 || a.repStart != null || a.restUntil != null);`, 'showSub');

rep(`        className="font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center"
        style={{ fontSize: 20 }}`,
`        className="font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center"
        style={{ fontSize: timeFont }}` , 'timefont');

rep(`        <span ref={registerNode(a.id, 'sub')} className="text-[12px] font-semibold text-on-surface-variant tabular-nums truncate" />
        {personalRip != null && personalRip !== inherited && (
          <span className="text-[12px] font-bold uppercase tracking-wide text-tertiary">rip. {formatRipartenza(personalRip)}</span>
        )}`,
`        {showSub && (
          <span ref={registerNode(a.id, 'sub')} className="text-[12px] font-semibold text-on-surface-variant tabular-nums truncate" />
        )}
        {showSub && personalRip != null && personalRip !== inherited && (
          <span className="text-[12px] font-bold uppercase tracking-wide text-tertiary">rip. {formatRipartenza(personalRip)}</span>
        )}` , 'sub-hide');

fs.writeFileSync(p, s);
console.log('PATCH OK');
