// Aggrega i warning jsx-a11y di eslint -f json (stdin -> stdout)
let d = '';
process.stdin.on('data', (c) => (d += c)).on('end', () => {
  const r = JSON.parse(d);
  const m = {};
  const detail = {};
  for (const f of r) {
    const file = f.filePath.split(/[\\/]/).pop();
    for (const w of f.messages) {
      if (w.ruleId && w.ruleId.startsWith('jsx-a11y')) {
        const k = `${w.ruleId} @ ${file}`;
        m[k] = (m[k] || 0) + 1;
        (detail[k] = detail[k] || []).push(`${w.line}:${w.column}`);
      }
    }
  }
  for (const [k, v] of Object.entries(m).sort((a, b) => b[1] - a[1])) {
    console.log(`${v}\t${k}\t${detail[k].slice(0, 60).join(' ')}`);
  }
});
