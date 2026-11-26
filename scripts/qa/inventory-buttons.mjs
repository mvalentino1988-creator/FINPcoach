#!/usr/bin/env node
/**
 * Inventario statico dei pulsanti (FASE C.1).
 * Genera docs/qa/PULSANTI.md con una riga per elemento cliccabile:
 * file:riga, etichetta/aria-label, handler, stato disabilitato, distruttivo.
 * L'effetto atteso e' desunto dal nome/testo dell'handler: da validare a mano
 * o con i test elencati in src/test.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const OUT = 'docs/qa/PULSANTI.md';
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!p.includes('test') && !p.includes('node_modules')) walk(p); }
    else if (/\.tsx$/.test(f) && !f.endsWith('.test.tsx')) files.push(p);
  }
})(ROOT);

const DISTRUTTIVI = /elimin|cancell|reset|azzera|archivia|rimuov|svuota|delete|clear|logout|esci|stop|fine/i;
const rows = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // <button ...> o <Button ...>: gli attributi possono contenere '=>' e '>'
    // dentro graffe — scandisci il file a partire dalla riga per trovare la
    // chiusura '>' a profondita graffe zero.
    const start = line.search(/<(button|Button)\b/);
    if (start < 0) return;
    const tag = line.slice(start).match(/^<(button|Button)\b/)?.[1];
    let attrs = '';
    let depth = 0, closed = false, j = i, col = start + tag.length + 1;
    outer: for (; j < lines.length; j++) {
      const l = j === i ? lines[j].slice(col) : lines[j];
      for (let k = 0; k < l.length; k++) {
        const ch = l[k];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '>' && depth === 0) { closed = true; attrs += l.slice(0, k); break outer; }
      }
      attrs += l + '\n';
      if (j - i > 30) break;
    }
    if (!closed) return;
    //salta chiusioni self-closing senza handler
    const hasHandler = /onClick=|onPress=|type="submit"/.test(attrs);
    const aria = attrs.match(/aria-label="([^"]+)"/)?.[1] ?? '';
    const title = attrs.match(/title="([^"]+)"/)?.[1] ?? '';
    const disabled = /disabled(=\{|[\s>]|$)/.test(attrs) || /disabled=\{[^}]*\}/.test(attrs);
    // testo nel corpo: prossime 3 righe
    let label = '';
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const t = lines[j].replace(/<[^>]+>/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) { label = t.slice(0, 60); break; }
      if (lines[j].includes('</button>') || lines[j].includes('/>')) break;
    }
    if (!label && !aria && !hasHandler) return;
    const handler = attrs.match(/onClick=\{([^}]+)\}/)?.[1]?.slice(0, 60) ?? (hasHandler ? '(submit)' : '');
    const distr = DISTRUTTIVI.test(label + ' ' + aria + ' ' + handler) ? 'si' : 'no';
    const sch = file.replace('src/components/', '').replace('src/', '');
    rows.push({ r: `${file}:${i + 1}`, sch, etichetta: aria || label || title || '(icona)', handler: handler || '-', disabled: disabled ? 'si' : '', distruttivo: distr });
  });
}

const md = [
  '# Inventario pulsanti — FINPcoach',
  '',
  `Generato da scripts/qa/inventory-buttons.mjs il ${new Date().toISOString().slice(0, 10)}: ${rows.length} occorrenze.`,
  '',
  '| # | File:riga | Schermata/file | Etichetta | Handler | Disabilitato | Distruttivo | Effetto atteso | Test | Verifica device | Esito |',
  '|---|-----------|----------------|-----------|---------|-------------|-------------|---------------|------|----------------|------|',
  ...rows.map((x, i) => `| ${i + 1} | ${x.r} | ${x.sch} | ${x.etichetta.replace(/\|/g, '/')} | \`${x.handler}\` | ${x.disabled} | ${x.distruttivo} | da validare | - | no | da verificare |`),
  '',
  '## Note',
  '- "Effetto atteso" e "Test" vanno compilati per i pulsanti ad alto rischio (Vasca/Regia/Cronometro, Backup/Dati, Piano, scheda atleta).',
  '- Pulsanti non cliccabili in automatico (file picker nativo, stampa, condivisione): verificare a mano.',
].join('\n');
writeFileSync(OUT, md);
console.log(`${rows.length} pulsanti -> ${OUT}`);
