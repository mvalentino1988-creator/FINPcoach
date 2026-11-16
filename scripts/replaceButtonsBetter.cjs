// replaceButtonsBetter.cjs
// Replace raw <button> tags with <Button>, ensuring size="md" and variant="ghost" are added only if missing.
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'components');

function replaceButtonTags(content) {
  const regex = /<button([^>]*)>([\s\S]*?)<\/button>/g;
  return content.replace(regex, (match, attrs, children) => {
    const trimmed = attrs.trim();
    let newAttrs = trimmed;
    if (!/\bsize\s*=/.test(trimmed)) {
      newAttrs = newAttrs ? newAttrs + ' ' : '';
      newAttrs += 'size="md"';
    }
    if (!/\bvariant\s*=/.test(trimmed)) {
      newAttrs = newAttrs ? newAttrs + ' ' : '';
      newAttrs += 'variant="ghost"';
    }
    // Preserve a leading space before attributes if any exist
    const space = newAttrs ? ' ' : '';
    return `<Button${space}${newAttrs}>${children}</Button>`;
  });
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  code = replaceButtonTags(code);
  // Add import if Button not imported from './ui'
  if (!code.includes("import { Button }")) {
    const lines = code.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImportIdx = i;
    }
    const importStmt = "import { Button } from './ui';";
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importStmt);
    } else {
      lines.unshift(importStmt);
    }
    code = lines.join('\n');
  }
  if (code !== original) {
    fs.writeFileSync(filePath, code, 'utf8');
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walk(srcDir);
console.log('Replacement done');
