// undoButtons.cjs
// Revert malformed <Button> tags back to <button> for a clean reprocessing
const fs = require('fs');
const path = require('path');

const files = [
  'src/components/AtletiScreen.tsx',
  'src/components/BackupModal.tsx',
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
  if (!fs.existsSync(absPath)) return;
  let content = fs.readFileSync(absPath, 'utf8');
  // Replace malformed <Button> back to <button>
  content = content.replace(/<Button/g, '<button');
  content = content.replace(/<\/Button>/g, '</button>');
  fs.writeFileSync(absPath, content, 'utf8');
  console.log('Reverted', relPath);
});
