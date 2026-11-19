// Build di produzione per la WebView Android: come `npm run build` ma con
// le variabili VITE_FIREBASE_* azzerate, così gli asset in
// app/src/main/assets/web non contengono mai la configurazione Firebase
// (la chiave API non deve essere incorporata nell'APK).
// Uso: npm run build:android
import { spawnSync } from 'node:child_process';

const FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

for (const key of FIREBASE_KEYS) process.env[key] = '';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run('npx tsc');
run('npx vite build');
run('node scripts/sync-android-assets.mjs');
