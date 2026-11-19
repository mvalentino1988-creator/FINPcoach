const fs = require('fs');
const p = 'src/components/CronometroVasca.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

// 1) Font cognome: minimo 12px, sotto si tronca con ellissi (mai sotto).
rep(`    const scale = Math.min(1.1, avail / widthAt12);
    return Math.max(9.5, Math.min(12.5, 12 * scale));`,
`    const scale = Math.min(1.1, avail / widthAt12);
    // Il font non scende mai sotto 12px: oltre si tronca con ellissi.
    return Math.min(13, Math.max(12, 12 * scale));`, 'font');

// 2) Modalita compatta: riserva 48px a destra per il bottone stop (44px+ di
//    area di tocco) e mostra il simbolo di stato inline (colore + bordo gia'
//    codificano lo stato). Una sola riga: nome + tempo.
rep(`        className={\`relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest px-1.5 flex items-center justify-between gap-1 overflow-hidden active:scale-[0.99] transition \${
          status === 'in_ritardo' ? 'border-warning' : status === 'in_ripartenza' ? 'border-primary' : status === 'in_nuoto' ? 'border-secondary' : 'border-outline-variant'
        } \${ignoredFlash ? 'ring-2 ring-warning' : ''}\`}
      >
        <span className="font-semibold text-on-surface truncate" style={{ fontSize: 12 }}>
          {a.cognome}
        </span>
        <span ref={registerNode(a.id, 'time')} className="font-stat-timer text-on-surface tabular-nums shrink-0" style={{ fontSize: 13 }}>
          —
        </span>
        {stopBtn}`,
`        className={\`relative flex-1 min-h-0 rounded-lg border-l-4 bg-surface-container-lowest pl-1.5 pr-12 flex items-center justify-between gap-1 overflow-hidden active:scale-[0.99] transition \${
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
        {stopBtn}` , 'compact');

// 3) Nome nella tessera intera: riserva 48px a destra per il bottone stop,
//    il cognome tronca dentro lo spazio residuo (mai sotto il bottone).
rep(`      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight" style={{ fontSize: nameFont }}>
          {a.cognome}
        </span>
        {stopBtn}
      </div>`,
`      <div className="flex items-start justify-between gap-1 min-w-0 pr-12">
        <span className="font-semibold text-on-surface whitespace-nowrap truncate leading-tight min-w-0 flex-1" style={{ fontSize: nameFont }}>
          {a.cognome}
        </span>
        {stopBtn}
      </div>`, 'name-row');

// 4) Stato sempre su una riga (mai a capo).
rep(`          <span className={\`text-[12px] font-bold flex items-center gap-0.5 \${meta.cls}\`}>`,
`          <span className={\`text-[12px] font-bold flex items-center gap-0.5 whitespace-nowrap \${meta.cls}\`}>`, 'status-nowrap');

fs.writeFileSync(p, s);
console.log('PATCH OK');
