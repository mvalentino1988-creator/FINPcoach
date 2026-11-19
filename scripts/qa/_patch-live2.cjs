const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) All'avvio con sessione ripresa in corso/ferma: attiva subito il live.
rep(`  useEffect(() => {
    void requestKeepScreenOn();
    return () => {
      void releaseKeepScreenOn();
      releaseOrientation();
      setLiveChrome(false);
    };
  }, []);`,
`  useEffect(() => {
    void requestKeepScreenOn();
    return () => {
      void releaseKeepScreenOn();
      releaseOrientation();
      setLiveChrome(false);
    };
  }, []);

  // Sessione ripresa già in corso/ferma: il live parte subito a schermo libero.
  useEffect(() => {
    const st = sessionRef.current.stato;
    if (st === 'in_corso' || st === 'ferma') setLiveChrome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al mount
  }, []);`, 'mount-live');

// 2) FINE (fine sessione): esce dal live e ripristina le barre di sistema.
rep(`    if (s.stato === 'in_corso') handleStopGenerale();
    setSummaryOpen(true);`,
`    if (s.stato === 'in_corso') handleStopGenerale();
    setLiveChrome(false);
    setSummaryOpen(true);`, 'fine');

fs.writeFileSync(p, s);
console.log('PATCH OK');
