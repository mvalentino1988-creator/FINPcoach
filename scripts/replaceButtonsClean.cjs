// replaceButtonsClean.cjs
// Safely replace raw <button> tags with the shared <Button> component.
const fs = require('fs');
const path = require('path');

// Files to process (initial batch)
const files = [
  'src/components/AtletiScreen.tsx',
  'src/components/Navbar.tsx',
  'src/components/BackupModal.tsx'
];

files.forEach(relPath => {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) {
    console.warn('File not found:', absPath);
    return;
  }
  let content = fs.readFileSync(absPath, 'utf8');
  // Ensure Button import from './ui' exists
  const importRegex = /import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*['"]\.\/ui['"]/;
  if (!importRegex.test(content)) {
    // Insert after the last import line
    const lastImportIdx = content.lastIndexOf('import');
    const importEndIdx = content.indexOf('\n', lastImportIdx);
    const importLine = "import { Button } from './ui';\n";
    content = content.slice(0, importEndIdx + 1) + importLine + content.slice(importEndIdx + 1);
  }
  // Replace opening <button ...> tags
  content = content.replace(/<button([^>]*)>/g, (match, attrs) => {
    let newAttrs = attrs.trim();
    if (newAttrs && !/\bsize\s*=/.test(newAttrs)) newAttrs += ' size="md"';
    if (newAttrs && !/\bvariant\s*=/.test(newAttrs)) newAttrs += ' variant="ghost"';
    // Ensure there is a leading space before attributes if they exist
    const finalAttrs = newAttrs ? ' ' + newAttrs : '';
    return `<Button${finalAttrs}>`;
  });
  // Replace closing tags
  content = content.replace(/<\/button>/g, '</Button>');
  fs.writeFileSync(absPath, content, 'utf8');
  console.log('Processed', relPath);
});
