// replaceButtonsSafe.cjs
// Safely replace raw <button> tags with <Button size="md" variant="ghost" ...>
// Preserves existing attributes and children. Adds import if missing.
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'components');

function replaceButtonTags(content) {
  // Match opening <button ...> and closing </button>
  const regex = /<button([^>]*)>([\s\S]*?)<\/button>/g;
  return content.replace(regex, (match, attrs, children) => {
    const cleanedAttrs = attrs.trim();
    const space = cleanedAttrs ? ' ' : '';
    // Ensure size and variant are present
    const sizeAttr = cleanedAttrs.includes('size=') ? '' : ' size="md"';
    const variantAttr = cleanedAttrs.includes('variant=') ? '' : ' variant="ghost"';
    return `<Button${space}${sizeAttr}${variantAttr}${cleanedAttrs}>${children}</Button>`;
  });
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  code = replaceButtonTags(code);
  // Add import if Button not imported
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
console.log('Button replacement complete');
