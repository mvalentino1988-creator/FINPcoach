#!/usr/bin/env node
/**
 * D1 — Inventario di collaudo: elenca tutte le schermate, i modali,
 * i componenti e le funzioni di dominio esportate, con lo stato dei test.
 * Uso: node scripts/qa/inventory.mjs  ->  docs/qa/MATRICE-COLLAUDO.md
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const SRC = 'src';
const OUT = 'docs/qa/MATRICE-COLLAUDO.md';

const files = (dir, ext) =>
  readdirSync(dir, { withFileTypes: true })
    .filter(f => f.isFile() && f.name.endsWith(ext))
    .map(f => join(dir, f.name));

const hasTest = (base) =>
  files(join(SRC, 'domain'), '.test.ts').some(t => basename(t).includes(base)) ||
  files(join(SRC, 'components'), '.test.tsx').concat(files(join(SRC, 'components'), '.test.ts')).some(t => basename(t).includes(base)) ||
  files(join(SRC, 'data'), '.test.ts').some(t => basename(t).includes(base));

const componentFiles = files(join(SRC, 'components'), '.tsx');
const domainFiles = files(join(SRC, 'domain'), '.ts').filter(f => !f.endsWith('.test.ts'));
const dataFiles = files(join(SRC, 'data'), '.ts').filter(f => !f.endsWith('.test.ts'));

const rows = [];
const add = (elemento, tipo, file, testFile) => {
  const testato = testFile ? 'verde' : 'non provato';
  rows.push(`| ${elemento} | ${tipo} | ${testato} | ${testFile ?? '—'} |`);
};

// Componenti: estrai export const/function
for (const f of componentFiles) {
  const src = readFileSync(f, 'utf8');
  const base = basename(f, '.tsx');
  const exports_ = [...src.matchAll(/export\s+(?:const|function)\s+([A-Z]\w+)/g)].map(m => m[1]);
  const testFile = files(join(SRC, 'components'), '.test.tsx')
    .concat(files(join(SRC, 'components'), '.test.ts'))
    .find(t => basename(t).toLowerCase().includes(base.toLowerCase())) ??
    (hasTest(base) ? '(test di dominio)' : null);
  for (const e of exports_) {
    add(e, 'componente', f, testFile);
  }
  if (exports_.length === 0) add(base, 'componente (interno)', f, testFile);
}

// Dominio: export function/class
for (const f of domainFiles) {
  const src = readFileSync(f, 'utf8');
  const base = basename(f, '.ts');
  const testFile = files(join(SRC, 'domain'), '.test.ts')
    .find(t => basename(t).toLowerCase().includes(base.toLowerCase())) ?? null;
  const exports_ = [...src.matchAll(/export\s+(?:function|class|const)\s+(\w+)/g)].map(m => m[1]);
  for (const e of exports_.slice(0, 40)) {
    add(`${base}::${e}`, 'dominio', f, testFile);
  }
}

// Dati: moduli con test
for (const f of dataFiles) {
  const base = basename(f, '.ts');
  const testFile = files(join(SRC, 'data'), '.test.ts').find(t => basename(t).toLowerCase().includes(base.toLowerCase())) ?? null;
  add(base, 'dati/storage', f, testFile);
}

const md = `# Matrice di collaudo — FINPcoach
Generata da \`scripts/qa/inventory.mjs\` il ${new Date().toISOString().slice(0, 10)}.

| Elemento | Tipo | Stato | Test |
|---|---|---|---|
${rows.join('\n')}

## Note
- "verde" = esiste un file di test dedicato; "non provato" = nessun test trovato.
- I test di dispositivo (Pixel .qa) sono registrati in docs/PROGRESSO-STRESS.md e docs/REPORT-CORREZIONI.md.
`;

if (!existsSync('docs/qa')) mkdirSync('docs/qa', { recursive: true });
writeFileSync(OUT, md);
console.log(`Scritto ${OUT}: ${rows.length} elementi`);
const nonProvati = rows.filter(r => r.includes('non provato'));
console.log(`Non provati: ${nonProvati.length}`);
