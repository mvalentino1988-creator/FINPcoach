const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) Stop button: in compatta resta centrato a destra (tessera bassa, il
//    bottom-0 uscirebbe dalla tessera); nella intera resta in basso.
rep(`      className="absolute bottom-0 right-0 w-12 h-12 flex items-end justify-end pb-0.5 pr-0.5 z-10"
    >
      <span className="w-6 h-6 rounded-md bg-surface-container-highest/90 text-on-surface-variant flex items-center justify-center text-[12px] font-black border border-outline-variant/50">`,
`      className={\`absolute right-0 w-12 h-12 flex items-center justify-center z-10 \${compact ? 'top-1/2 -translate-y-1/2' : 'bottom-0'}\`}
    >
      <span className="w-6 h-6 rounded-md bg-surface-container-highest/90 text-on-surface-variant flex items-center justify-center text-[12px] font-black border border-outline-variant/50">`, 'stopbtn');

// 2) Compattta due righe (tileH 34-55): nome su riga 1 con spazio pieno
//    (il bottone sta a destra ma la riga riserva la sua zona), tempo sotto.
rep(`  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={e => e.preventDefault()}
        className={\`relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest pl-1.5 pr-12 flex items-center justify-between gap-1 overflow-hidden active:scale-[0.99] transition \${
          status === 'in_ritardo' ? 'border-warning' : status === 'in_ripartenza' ? 'border-primary' : status === 'in_nuoto' ? 'border-secondary' : 'border-outline-variant'
        } \${ignoredFlash ? 'ring-2 ring-warning' : ''}\`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span aria-hidden className={\`text-[12px] leading-none shrink-0 \${meta.cls}\`}>{meta.symbol}</span>
          <span className="font-semibold text-on-surface truncate" style={{ fontSize: 12 }}>
            {a.cognome}
          </span>
        </span>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface tabular-nums shrink-0" style={{ fontSize: 13 }}>
          —
        </span>
        {stopBtn}
      </div>
    );
  }`,
`  const tileHandlers = {
    role: 'button' as const,
    tabIndex: 0,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: clearPress,
    onPointerCancel: clearPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const tileBorder = \`relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest overflow-hidden active:scale-[0.99] transition \${
    status === 'in_ritardo' ? 'border-warning' : status === 'in_ripartenza' ? 'border-primary' : status === 'in_nuoto' ? 'border-secondary' : 'border-outline-variant'
  } \${ignoredFlash ? 'ring-2 ring-warning' : ''}\`;

  if (compact && tileH >= 34) {
    // Due righe: cognome (con simbolo di stato) sopra, tempo sotto.
    // La riga del nome riserva 48px a destra per il bottone stop.
    return (
      <div {...tileHandlers} className={\`\${tileBorder} flex flex-col justify-center gap-0.5 pl-1.5 pr-1.5\`}>
        <div className="flex items-center gap-1 min-w-0 pr-12">
          <span aria-hidden className={\`text-[12px] leading-none shrink-0 \${meta.cls}\`}>{meta.symbol}</span>
          <span className="font-semibold text-on-surface truncate min-w-0 flex-1" style={{ fontSize: 12 }}>
            {a.cognome}
          </span>
        </div>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface-variant tabular-nums leading-none" style={{ fontSize: 12 }}>
          —
        </span>
        {stopBtn}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        {...tileHandlers}
        className={\`\${tileBorder} pl-1.5 pr-12 flex items-center justify-between gap-1\`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span aria-hidden className={\`text-[12px] leading-none shrink-0 \${meta.cls}\`}>{meta.symbol}</span>
          <span className="font-semibold text-on-surface truncate" style={{ fontSize: 12 }}>
            {a.cognome}
          </span>
        </span>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface tabular-nums shrink-0" style={{ fontSize: 13 }}>
          —
        </span>
        {stopBtn}
      </div>
    );
  }`, 'compact2');

fs.writeFileSync(p, s);
console.log('PATCH OK');
