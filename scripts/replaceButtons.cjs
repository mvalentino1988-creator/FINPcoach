// replaceButtons.cjs
// Script to replace raw <button> elements with shared <Button> component
const fs = require('fs');
const path = require('path');

// List of component files that contain <button>
const files = [
  'src/components/AtletiScreen.tsx',
  'src/components/BackupModal.tsx', // already handled but safe
  'src/components/BadgeCodice.tsx',
  'src/components/BordoVascaScreen.tsx',
  'src/components/CalendarioScreen.tsx',
  'src/components/CronometroLiveMultiCorsia.tsx',
  'src/components/DatiScreen.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/EsercizioEditor.tsx',
  'src/components/FontiScreen.tsx',
  'src/components/GeneraSchedaIAModal.tsx',
  'src/components/LoginScreen.tsx',
  'src/components/Navbar.tsx',
  'src/components/OcrGaraModal.tsx',
  'src/components/OcrPreviewModal.tsx',
  'src/components/OggiScreen.tsx',
  'src/components/OnboardingModal.tsx',
  'src/components/ParametriSedutaModal.tsx',
  'src/components/ParaSwimmingAnalyticsView.tsx',
  'src/components/PianoScreen.tsx',
  'src/components/RecordScreen.tsx',
  'src/components/RegiaTecnicaCorsie.tsx',
  'src/components/RegistroScreen.tsx',
  'src/components/RegolamentiScreen.tsx',
  'src/components/RevisioneSchedaModal.tsx',
  'src/components/SchedeVascaScreen.tsx',
  'src/components/Sezione.tsx',
  'src/components/TempiRipartenzeScreen.tsx',
  'src/components/TestCalibrazioneModal.tsx',
  'src/components/WelcomeScreen.tsx'
];

files.forEach(relPath => {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) {
    console.warn('File not found:', absPath);
    return;
  }
  let content = fs.readFileSync(absPath, 'utf8');
  // Ensure Button import from './ui'
  const importRegex = /import\s*\{[^}]*\bButton\b[^}]*\}\s*from\s*['"]\.\/ui['"];?/;
  if (!importRegex.test(content)) {
    // Insert after the last import statement
    const lastImportIdx = content.lastIndexOf('import');
    const importEndIdx = content.indexOf('\n', lastImportIdx);
    const importLine = "import { Button } from './ui';\n";
    content = content.slice(0, importEndIdx + 1) + importLine + content.slice(importEndIdx + 1);
  }
  // Replace opening <button ...>
  content = content.replace(/<button([^>]*)>/g, (match, attrs) => {
    // Preserve existing attributes, add size and variant if not present
    let newAttrs = attrs.trim();
    if (!/\bsize=/.test(newAttrs)) newAttrs += ' size="md"';
    if (!/\bvariant=/.test(newAttrs)) newAttrs += ' variant="ghost"';
    return `<Button${newAttrs}>`;
  });
  // Replace closing tags
  content = content.replace(/<\/button>/g, '</Button>');
  fs.writeFileSync(absPath, content, 'utf8');
  console.log('Processed', relPath);
});
