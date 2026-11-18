#!/usr/bin/env node
/**
 * Genera backup sintetici VALIDI per la build QA (dati inventati, mai reali).
 *
 *   node scripts/qa/gen-backup.mjs            # scrive in scripts/qa/out/
 *   node scripts/qa/gen-backup.mjs <dir>      # scrive in <dir>
 *
 * Produce:
 *   backup-48.json  -> 48 atleti, 6 corsie x 8 (scenario pieno)
 *   backup-12.json  -> 12 atleti, 3 corsie x 4 (scenario piccolo)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), 'out'));
mkdirSync(outDir, { recursive: true });

const NOMI = ['Alessio', 'Benedetta', 'Carlo', 'Daniela', 'Elena', 'Francesco', 'Giorgia', 'Lorenzo', 'Martina', 'Nicola', 'Olivia', 'Paolo', 'Sofia', 'Tommaso', 'Valentina', 'Simone'];
const COGNOMI = ['QA-Rossi', 'QA-Bianchi', 'QA-Romano', 'QA-Colombo', 'QA-Ricci', 'QA-Marino', 'QA-Greco', 'QA-Bruno', 'QA-Galli', 'QA-Mancini', 'QA-Ferrara', 'QA-Santoro'];

function atleti(n) {
  return Array.from({ length: n }, (_, i) => {
    const id = i + 1;
    const classeS = 1 + (i % 14);
    const atleta = {
      id,
      nome: NOMI[i % NOMI.length],
      cognome: `${COGNOMI[i % COGNOMI.length]}${String(id).padStart(2, '0')}`,
      dataNascita: `${1985 + (i % 25)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
      classeS,
      stato: i % 7 === 0 ? 'IN_ATTESA' : 'UFFICIALE',
      fattoreVolume: [0.6, 0.7, 0.8, 0.9, 1.0][i % 5],
      note: 'Atleta sintetico QA — dati inventati',
      volumeAuto: true,
    };
    // classi SB/SM solo su alcuni per varietà (SB mai 10, range 1-14)
    if (i % 3 === 0) {
      let sb = 1 + ((i * 5) % 13); // 1..13
      if (sb === 10) sb = 11;
      atleta.classeSB = sb;
    }
    if (i % 4 === 0) atleta.classeSM = 1 + (i % 14);
    return atleta;
  });
}

function assegnazione(Ids, corsie, data) {
  const perCorsia = Math.ceil(Ids.length / corsie);
  return {
    data,
    vascaMetri: 50,
    numeroCorsie: corsie,
    presentiIds: Ids,
    corsie: Array.from({ length: corsie }, (_, c) => ({
      numero: c + 1,
      atletiIds: Ids.slice(c * perCorsia, (c + 1) * perCorsia),
      ripartenzaCorsia: c % 2 === 0 ? null : 45 + c * 5,
      intervalloPartenza: c === 0 ? 5 : (c % 3 === 0 ? 10 : null),
      bloccata: false,
    })),
    ripartenzaGenerale: 60,
    ripartenzeAtleta: Object.fromEntries(Ids.slice(0, 4).map((id) => [String(id), 90])),
  };
}

function backup(nAtleti, nCorsie, nomeFile) {
  const today = new Date().toISOString().slice(0, 10);
  const lista = atleti(nAtleti);
  const ids = lista.map((a) => a.id);
  const data = {
    version: '1.1',
    timestamp: new Date().toISOString(),
    atleti: lista,
    condizioni: [],
    assenze: [],
    tempi: [],
    logSedute: [],
    stagione: null,
    chiusure: [],
    gare: [],
    macrocicli: [],
    mesocicli: [],
    microcicli: [],
    impostazioni: {
      giorni: [1, 2, 3, 4, 5],
      metriBaseSeduta: 2400,
      // La Regia usa i parametri del giorno: forziamo numeroCorsie per oggi
      // via overrideSedute (stessa priorita' usata dall'app).
      overrideSedute: {
        [today]: { vascaMetri: 50, durataMin: 60, numeroCorsie: nCorsie },
      },
    },
    customWorkouts: [],
    assegnazioneVasca: assegnazione(ids, nCorsie, today),
    mode: 'live',
  };
  const path = resolve(outDir, nomeFile);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`Scritto ${path} (${nAtleti} atleti, ${nCorsie} corsie)`);
}

backup(48, 6, 'backup-48.json');
backup(12, 3, 'backup-12.json');
