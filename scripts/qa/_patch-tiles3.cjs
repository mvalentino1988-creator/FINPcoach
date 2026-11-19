const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

rep(`const compact = tileH < 54;`, `const compact = tileH < 56;`, 'threshold');

rep(`  const showSub = tileH >= 76;
  const timeFont = tileH >= 76 ? 20 : 16;`,
`  const showSub = tileH >= 78;
  const showBar = tileH >= 70;
  const timeFont = tileH >= 78 ? 20 : 16;`, 'tiers');

rep(`        <div className="h-1 rounded-full bg-surface-container-highest overflow-hidden">
          <div
            ref={registerNode(a.id, 'bar')}
            className={\`h-full rounded-full transition-[width] duration-150 \${meta.bar}\`}
            style={{ width: '0%' }}
          />
        </div>`,
`        {showBar && (
          <div className="h-1 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              ref={showBar ? registerNode(a.id, 'bar') : () => {}}
              className={\`h-full rounded-full transition-[width] duration-150 \${meta.bar}\`}
              style={{ width: '0%' }}
            />
          </div>
        )}`, 'bar');

fs.writeFileSync(p, s);
console.log('PATCH OK');
