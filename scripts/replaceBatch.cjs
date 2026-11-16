// replaceBatch.cjs
// Replace raw <button> tags with <Button> component for a given batch of files.
// This script is intended to be edited manually for each batch.
const fs = require('fs');
const path = require('path');

// ---- BATCH FILE LIST (edit for each batch) ----
const files = [
  'src/components/AtletiScreen.tsx',
  'src/components/BadgeCodice.tsx',
  'src/components/BordoVascaScreen.tsx',
  'src/components/CalendarioScreen.tsx',
  'src/components/CronometroLiveMultiCorsia.tsx'
];
// ---------------------------------------------

files.forEach(relPath => {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) {
    console.warn('File not found:', absPath);
    return;
  }
  let content = fs.readFileSync(absPath, 'utf8');

  // Ensure Button import exists
  const importRegex = /import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*['"]\.\/ui['"]/;
  if (!importRegex.test(content)) {
    const lastImportIdx = content.lastIndexOf('import');
    const importEndIdx = content.indexOf('\n', lastImportIdx);
    const importLine = "import { Button } from './ui';\n";
    content = content.slice(0, importEndIdx + 1) + importLine + content.slice(importEndIdx + 1);
  }

  // Replace opening <button ...> with <Button ...>
  content = content.replace(/<button([^>]*)>/g, (match, attrs) => {
    let newAttrs = attrs.trim();
    // Add size and variant if missing
    if (newAttrs && !/\bsize\s*=/.test(newAttrs)) newAttrs += ' size="md"';
    if (newAttrs && !/\bvariant\s*=/.test(newAttrs)) newAttrs += ' variant="ghost"';
    const finalAttrs = newAttrs ? ' ' + newAttrs : '';
    return `<Button${finalAttrs}>`;
  });
  // Replace closing tags
  content = content.replace(/<\/button>/g, '</Button>');

  fs.writeFileSync(absPath, content, 'utf8');
  console.log('Processed', relPath);
});
