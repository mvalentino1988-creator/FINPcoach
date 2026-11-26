#!/usr/bin/env node
/**
 * qa:pulsanti — verifica che docs/qa/PULSANTI.md sia completo e aggiornato.
 * Fallisce se:
 *  - esiste un <button>/<Button> in src/ senza riga nel documento;
 *  - una riga ha la colonna "Esito" vuota o senza classificazione.
 * Le esenzioni (test automatico oppure motivo scritto) sono nella colonna
 * "Test"/"Verifica device" del documento.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOC = 'docs/qa/PULSANTI.md';
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!p.includes('test') && !p.includes('node_modules')) walk(p); }
    else if (/\.tsx$/.test(f) && !f.endsWith('.test.tsx')) files.push(p);
  }
})('src');

// Stessa scansione di inventory-buttons.mjs: posizioni file:riga dei tag.
const positions = new Set();
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/<(button|Button)\b/.test(line)) positions.add(`${file.replace(/\\/g, '/')}:${i + 1}`);
  });
}

const doc = readFileSync(DOC, 'utf8');
const docRows = [...doc.matchAll(/^\| \d+ \| ([^|]+) \|/gm)].map(m => m[1].trim().replace(/\\/g, '/'));
const docSet = new Set(docRows);

const missing = [...positions].filter(p => !docSet.has(p));
const errors = [];
if (missing.length) errors.push(`${missing.length} pulsanti senza riga in PULSANTI.md: ${missing.slice(0, 10).join(', ')}`);

// Esito vuoto o non classificato
const badEsito = doc.split('\n').filter(l => /^\| \d+ \|/.test(l) && /\|\s*\|\s*$/.test(l));
if (badEsito.length) errors.push(`${badEsito.length} righe con Esito vuoto`);

if (errors.length) { console.error('qa:pulsanti FALLITO:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`qa:pulsanti OK: ${positions.size} pulsanti inventariati`);
