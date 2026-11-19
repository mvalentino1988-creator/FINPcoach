const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) laneCellH: stimato ~6px in meno dell'altezza reale per non scegliere
//    il layout "intero" su tessere troppo basse (margin di sicurezza).
rep(`      const gapA = 4;
      return Math.max(0, (cellH - headerH - gapA * (n - 1)) / n);`,
`      const gapA = 4;
      // Margine di sicurezza: la stima resta sotto l'altezza reale cosi'
      // il layout non va mai in overflow per differenze di 1-2px.
      return Math.max(0, (cellH - headerH - gapA * (n - 1)) / n - 6);`, 'laneCellH');

// 2) Soglia compatta: sotto 68px stimati si usa la tessera compatta
//    (bottone 44px + righe nome/tempo), mai la intera che sborderebbe.
rep(`          const compact = tileH < 56;`, `          const compact = tileH < 68;`, 'compact-th');

// 3) Bottone stop 44x44 (>=44px richiesto) in entrambe le varianti.
rep(`className={\`absolute right-0 w-12 h-12 flex items-center justify-center z-10 \${compact ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}\`}`,
`className={\`absolute right-0 w-11 h-11 flex items-center justify-center z-10 \${compact ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}\`}`, 'stopsize');

fs.writeFileSync(p, s);
console.log('PATCH OK');
