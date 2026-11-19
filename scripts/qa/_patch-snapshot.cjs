const fs = require('fs');
const p = 'src/data/storage.ts';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

rep(`import { BACKUP_VERSIONE, validaBackup } from './backupValidate';`,
`import { BACKUP_VERSIONE, validaBackup } from './backupValidate';
import { salvaSnapshotDati } from './snapshotAutomatico';`, 'import');

// getMode: non seminare il demo se esistono dati utente (chiave mode persa).
rep(`    const m = localStorage.getItem(MODE_KEY);
    if (m === 'live') return 'live';
    if (m !== 'demo') {
      this.applyDemoSeed();
    }
    return 'demo';`,
`    const m = localStorage.getItem(MODE_KEY);
    if (m === 'live') return 'live';
    if (m !== 'demo') {
      // Se la chiave mode è assenza ma ci sono dati utente (import, vecchia
      // versione), NON sostituirli con il seed demo: li preserviamo come live.
      if (m == null && this.haDatiUtente()) {
        this.setMode('live');
        return 'live';
      }
      this.applyDemoSeed();
    }
    return 'demo';`, 'getmode');

// applyDemoSeed: snapshot prima della sovrascrittura.
rep(`  static applyDemoSeed(): void {
    this.setMode('demo');`,
`  static applyDemoSeed(): void {
    salvaSnapshotDati();
    this.setMode('demo');`, 'seed');

// startLiveSquad: snapshot prima dello svuotamento.
rep(`  static startLiveSquad(): void {
    this.setMode('live');`,
`  static startLiveSquad(): void {
    salvaSnapshotDati();
    this.setMode('live');`, 'livesquad');

// importBackup: snapshot persistente prima di applicare (quello in-memory
// resta come rollback transazionale).
rep(`    try {
      this.applicaDatiBackup(risultato.data);`,
`    try {
      salvaSnapshotDati();
      this.applicaDatiBackup(risultato.data);`, 'import');

// resetToDefault: snapshot prima del reset.
rep(`  static resetToDefault(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));`,
`  static resetToDefault(): void {
    salvaSnapshotDati();
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));`, 'reset');

// getAtleti: se il JSON è corrotto, snapshot del raw prima di riseminare.
rep(`    } catch {
      const seeded = this.createSeedAtleti();
      save(STORAGE_KEYS.ATLETI, seeded);
      return seeded;
    }
  }

  static saveAtleti`,
`    } catch {
      // Il raw corrotto va preservato in uno snapshot prima di riseminare.
      salvaSnapshotDati();
      const seeded = this.createSeedAtleti();
      save(STORAGE_KEYS.ATLETI, seeded);
      return seeded;
    }
  }

  static saveAtleti`, 'getatleti');

// haDatiUtente: vero se almeno una collezione di dati contiene elementi.
rep(`  static getCustomWorkouts(): CustomWorkout[] {`,
`  /** Vero se esistono dati utente non vuoti (per non seminare demo sopra). */
  private static haDatiUtente(): boolean {
    try {
      const nonVuoto = (key: string) => {
        const raw = localStorage.getItem(key);
        if (raw == null) return false;
        const v = JSON.parse(raw);
        if (Array.isArray(v)) return v.length > 0;
        return v != null;
      };
      return (
        nonVuoto(STORAGE_KEYS.ATLETI) ||
        nonVuoto(STORAGE_KEYS.TEMPI) ||
        nonVuoto(STORAGE_KEYS.LOG_SEDUTE) ||
        nonVuoto(STORAGE_KEYS.GARE) ||
        nonVuoto(STORAGE_KEYS.CUSTOM_WORKOUTS) ||
        localStorage.getItem(STORAGE_KEYS.STAGIONE) != null
      );
    } catch {
      return false;
    }
  }

  static getCustomWorkouts(): CustomWorkout[] {`, 'hadati');

fs.writeFileSync(p, s);
console.log('PATCH OK');
