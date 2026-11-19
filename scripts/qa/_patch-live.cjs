const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

rep(`import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';`,
`import { requestKeepScreenOn, releaseKeepScreenOn } from '../lib/wakeLock';
import { setImmersive, releaseImmersive } from '../lib/immersive';`, 'import');

// helper dopo le importazioni del modulo (prima del primo export/componente)
rep(`import { todayISO } from '../domain/dateUtils';`,
`import { todayISO } from '../domain/dateUtils';

/**
 * Attiva/disattiva la modalità "live": nasconde l'intera chrome dell'app
 * (classe CSS vasca-live) e le barre di sistema Android (immersive).
 */
function setLiveChrome(on: boolean) {
  document.body.classList.toggle('vasca-live', on);
  if (on) setImmersive(true);
  else releaseImmersive();
}`, 'helper');

rep(`      document.body.classList.remove('vasca-live');
    };
  }, []);`,
`      setLiveChrome(false);
    };
  }, []);`, 'unmount');

rep(`      bump();
      document.body.classList.add('vasca-live');
    },`,
`      bump();
      setLiveChrome(true);
    },`, 'tap');

rep(`    document.body.classList.add('vasca-live');
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);`,
`    setLiveChrome(true);
  }, [bump, noteAction, pushUndo, sessionRef, setSession]);`, 'via');

rep(`    document.body.classList.remove('vasca-live');
    setSheet(null);`,
`    setLiveChrome(false);
    setSheet(null);`, 'reset');

fs.writeFileSync(p, s);
console.log('PATCH OK');
