const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) Bottone stop: da top-right a bottom-right (non copre mai il cognome).
rep(`      className="absolute top-0 right-0 w-12 h-12 flex items-start justify-end pt-0.5 pr-0.5 z-10"`,
`      className="absolute bottom-0 right-0 w-12 h-12 flex items-end justify-end pb-0.5 pr-0.5 z-10"`, 'stoppos');

// 2) Riga nome: larghezza intera (il bottone non e' piu' in alto).
rep(`      <div className="flex items-start justify-between gap-1 min-w-0 pr-12">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight min-w-0 flex-1" style={{ fontSize: nameFont }}>`,
`      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight min-w-0 flex-1" style={{ fontSize: nameFont }}>`, 'namerow');

// 3) Tempo: quando c'e' il bottone stop, lo sposta a sinistra di 48px.
rep(`      <output
        ref={registerNode(a.id, 'time') as React.Ref<HTMLOutputElement>}
        className="font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center"
        style={{ fontSize: timeFont }}
      >`,
`      <output
        ref={registerNode(a.id, 'time') as React.Ref<HTMLOutputElement>}
        className={\`font-stat-timer-mobile text-on-surface tabular-nums leading-none self-center \${canStop ? 'mr-12' : ''}\`}
        style={{ fontSize: timeFont }}
      >`, 'timepos');

// 4) Blocco inferiore (lap/stato/barra/testi): arretrato di 48px se il
//    bottone stop e' presente, cosi' nessun testo resta sotto il bottone.
rep(`      {/* 3) Lap + 4) stato + countdown */}
      <div className="flex flex-col gap-0.5">`,
`      {/* 3) Lap + 4) stato + countdown */}
      <div className={\`flex flex-col gap-0.5 \${canStop ? 'pr-12' : ''}\`}>`, 'bottomblock');

fs.writeFileSync(p, s);
console.log('PATCH OK');
