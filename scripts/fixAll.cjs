// fixAll.cjs
// Perform comprehensive clean‑up of button JSX across the codebase.
// 1. Replace any raw <button> with <Button size="md" variant="ghost" ...>
// 2. Fix malformed onClick attributes: onClick={() = size="md" variant="ghost"> → onClick={() =>
// 3. Ensure size/variant attributes are present on <Button> when missing.
// 4. Add import { Button } from './ui' if not already present.

const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'components');

function cleanContent(content) {
  // 1. Raw <button> → <Button>
  content = content.replace(/<button([^>]*)>([\s\S]*?)<\/button>/g, (m, attrs, inner) => {
    let newAttrs = attrs.trim();
    if (!/\bsize\b/.test(newAttrs)) newAttrs += ' size="md"';
    if (!/\bvariant\b/.test(newAttrs)) newAttrs += ' variant="ghost"';
    return `<Button${newAttrs ? ' ' + newAttrs : ''}>${inner}</Button>`;
  });

  // 2. Fix malformed onClick pattern
  content = content.replace(/onClick\(\)\s*=\s*size="md"\s*variant="ghost"\s*>/g, 'onClick={() =>');
  // also handle possible whitespace variations
  content = content.replace(/onClick\(\)\s*=\s*variant="ghost"\s*size="md"\s*>/g, 'onClick={() =>');
  // If there is stray "= size" after onClick attribute, remove it
  content = content.replace(/onClick=\{\s*\(\)\s*=>\s*\}\s*size="md"/g, 'onClick={() =>');

  // 3. Ensure every <Button> has size and variant (if not present)
  content = content.replace(/<Button([^>]*?)>/g, (m, attrs) => {
    let newAttrs = attrs;
    if (!/\bsize\b/.test(newAttrs)) newAttrs += ' size="md"';
    if (!/\bvariant\b/.test(newAttrs)) newAttrs += ' variant="ghost"';
    return `<Button${newAttrs}>`;
  });

  // 4. Ensure closing tags for Button where self‑closing was used incorrectly.
  // Convert <Button .../> that is followed by children on next lines into proper pair.
  // This simple heuristic looks for a line with <Button .../> and the next non‑empty line not starting with </Button>.
  const lines = content.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const selfClose = line.match(/<Button([^>]*)\/>/);
    if (selfClose) {
      // peek ahead for possible children until a closing </Button>
      let j = i + 1;
      const children = [];
      while (j < lines.length && !lines[j].includes('</Button>')) {
        children.push(lines[j]);
        j++;
      }
      if (children.length && j < lines.length) {
        // rebuild proper opening tag
        out.push(`<Button${selfClose[1]}>`);
        out.push(...children);
        out.push('</Button>');
        i = j; // skip processed lines
        continue;
      }
    }
    out.push(line);
  }
  content = out.join('\n');

  // 5. Add import if missing
  if (!content.includes("import { Button }")) {
    const lines = content.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImport = i;
    }
    const stmt = "import { Button } from './ui';";
    if (lastImport >= 0) lines.splice(lastImport + 1, 0, stmt);
    else lines.unshift(stmt);
    content = lines.join('\n');
  }
  return content;
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  code = cleanContent(code);
  if (code !== original) {
    fs.writeFileSync(filePath, code, 'utf8');
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
console.log('All button fixes applied');
