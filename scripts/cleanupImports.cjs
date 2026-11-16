// cleanupImports.cjs
// Removes stray incomplete import lines and merges duplicate imports per file.
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'components');

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  const cleaned = [];
  const importMap = new Map(); // module -> list of named imports
  for (let line of lines) {
    const importMatch = line.match(/^\s*import\s*{\s*([^}]*)}\s*from\s*['"]([^'\"]+)['"];?\s*$/);
    if (importMatch) {
      const names = importMatch[1].split(',').map(s=>s.trim()).filter(Boolean);
      const module = importMatch[2];
      const existing = importMap.get(module) || [];
      importMap.set(module, existing.concat(names));
      continue; // skip this line, will rewrite later
    }
    // stray incomplete import line like "import {" alone
    if (/^\s*import\s*{\s*$/.test(line)) {
      continue;
    }
    cleaned.push(line);
  }
  // rebuild import statements at top of file (preserve any non‑import code order)
  const importLines = [];
  for (const [module, names] of importMap.entries()) {
    const unique = Array.from(new Set(names));
    importLines.push(`import { ${unique.join(', ')} } from '${module}';`);
  }
  const finalCode = importLines.concat(cleaned).join('\n');
  if (finalCode !== code) {
    fs.writeFileSync(filePath, finalCode, 'utf8');
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.endsWith('.tsx')) processFile(p);
  }
}

walk(srcDir);
console.log('Import cleanup done');
