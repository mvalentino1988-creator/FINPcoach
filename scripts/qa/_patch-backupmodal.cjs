const fs = require('fs');
const p = 'src/components/BackupModal.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

rep(`import { Button, Modal, ToastProvider, useToast } from './ui';`,
`import { Button, Modal, ToastProvider, useToast } from './ui';
import { infoSnapshotPiuRecente, ripristinaSnapshot } from '../data/snapshotAutomatico';`, 'import');

const handler = [
  "  /** Ripristina l'ultimo snapshot automatico (pre-import/reset/seed). */",
  "  const handleRipristinaSnapshot = () => {",
  "    const info = infoSnapshotPiuRecente();",
  "    if (!info) return;",
  "    const quando = new Date(info.ts).toLocaleString('it-IT');",
  "    if (",
  "      confirm(",
  "        `Ripristinare il salvataggio automatico del ${quando}?\\n\\n` +",
  "          `Atleti nello snapshot: ${info.numAtleti}.\\n` +",
  "          'I dati attuali verranno sostituiti da quelli salvati.'",
  "      )",
  "    ) {",
  "      if (ripristinaSnapshot(info.ts)) {",
  "        toast({ variant: 'success', title: 'Ripristino completato', message: 'Ricarico…' });",
  "        setTimeout(() => {",
  "          window.location.reload();",
  "        }, 800);",
  "      } else {",
  "        toast({ variant: 'error', title: 'Ripristino fallito', message: 'Impossibile leggere lo snapshot.' });",
  "      }",
  "    }",
  "  };",
  "",
].join('\n');

rep(`  /** Torna allo stato "squadra vuota" (stesso stato del primo avvio) azzerando lo storage. */`,
handler + `  /** Torna allo stato "squadra vuota" (stesso stato del primo avvio) azzerando lo storage. */`, 'handler');

rep(`  const syncStato = syncEnabled && FirebaseSync.getCurrentUser()`,
`  const snapInfo = infoSnapshotPiuRecente();

  const syncStato = syncEnabled && FirebaseSync.getCurrentUser()`, 'snapinfo');

const ui = [
  "            {/* Ripristino snapshot automatico (pre-sostituzioni massive) */}",
  "            {snapInfo && (",
  "              <button",
  "                onClick={handleRipristinaSnapshot}",
  "                className=\"w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/40 hover:bg-surface-container transition group text-left\"",
  "              >",
  "                <div className=\"flex items-center gap-3 min-w-0\">",
  "                  <History size={17} className=\"text-primary shrink-0 group-hover:scale-110 transition\" />",
  "                  <div className=\"min-w-0\">",
  "                    <div className=\"font-bold text-on-surface text-sm\">Ripristina ultimo salvataggio automatico</div>",
  "                    <div className=\"text-xs text-on-surface-variant font-normal\">",
  "                      {new Date(snapInfo.ts).toLocaleString('it-IT')} · {snapInfo.numAtleti} atleti",
  "                    </div>",
  "                  </div>",
  "                </div>",
  "                <span className=\"ds-chip-blue shrink-0\">Ripristina</span>",
  "              </button>",
  "            )}",
  "",
  "            {/* Reset to Seed Demo */}",
].join('\n');

rep(`            {/* Reset to Seed Demo */}`, ui, 'ui');

rep(`import { Download, Upload, RefreshCw, X, ShieldCheck, Database, Cloud, CloudOff, LogOut, Loader2, Trash2, Info, AlertTriangle } from 'lucide-react';`,
`import { Download, Upload, RefreshCw, X, ShieldCheck, Database, Cloud, CloudOff, LogOut, Loader2, Trash2, Info, AlertTriangle, History } from 'lucide-react';`, 'icon');

fs.writeFileSync(p, s);
console.log('PATCH OK');
