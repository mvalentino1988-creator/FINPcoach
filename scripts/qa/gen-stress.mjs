#!/usr/bin/env node
/**
 * Genera scripts/qa/out/stress-100.json (dataset di stress, NON committato)
 * e stress-100-cifrato.finpbackup + stress-100-manifest.json.
 *
 * Uso: node scripts/qa/gen-stress.mjs [--seme N]
 * Deterministico: stesso seme => stress-100.json identico byte per byte.
 */
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto, getRandomValues } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'scripts', 'qa', 'out');
mkdirSync(outDir, { recursive: true });

const semeArg = process.argv.indexOf('--seme');
const seme = semeArg >= 0 ? parseInt(process.argv[semeArg + 1], 10) : undefined;

// Bundle del core TS (importa src/domain + JSON) in un modulo ESM temporaneo.
const bundlePath = join(outDir, '.gen-stress.bundle.mjs');
await build({
  entryPoints: [join(root, 'scripts', 'qa', 'gen-stress-core.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  logLevel: 'silent',
});

const { generaDatasetStress, SEME_DEFAULT } = await import(pathToFileURL(bundlePath).href);
const { backup, manifest } = generaDatasetStress(seme ?? SEME_DEFAULT);

const json = JSON.stringify(backup, null, 2);
writeFileSync(join(outDir, 'stress-100.json'), json, 'utf8');
writeFileSync(join(outDir, 'stress-100-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

// Backup cifrato (.finpbackup): AES-GCM-256 + PBKDF2-SHA256, come src/lib/backupCrypto.ts.
const PASSWORD = 'qa-test-2026';
const PBKDF2_ITER = 100_000;
const subtle = webcrypto.subtle;
const te = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString('base64');
const salt = getRandomValues(new Uint8Array(16));
const iv = getRandomValues(new Uint8Array(12));
const baseKey = await subtle.importKey('raw', te.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
);
const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(json));
const cifrato = JSON.stringify({
  tipo: 'finpcoach-backup-cifrato',
  v: 1,
  kdf: 'PBKDF2-SHA256',
  iter: PBKDF2_ITER,
  salt: b64(salt),
  iv: b64(iv),
  data: b64(ct),
});
writeFileSync(join(outDir, 'stress-100-cifrato.finpbackup'), cifrato, 'utf8');

const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1);
console.log(`stress-100.json: ${kb(json)} KiB`);
console.log(`stress-100-cifrato.finpbackup: ${kb(cifrato)} KiB`);
console.log(`manifest: ${JSON.stringify(manifest.conteggi)}`);
console.log(`giorno prova: ${JSON.stringify(manifest.giornoProva)}`);
