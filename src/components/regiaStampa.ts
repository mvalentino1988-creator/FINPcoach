import { Atleta } from '../types';
import { AssegnazioneVasca } from '../domain/assegnazioneVasca';
import { formattaData } from '../domain/dateUtils';

export const formattaSecondi = (s: number | null | undefined): string =>
  s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function stampaRegiaCorsie(opts: {
  corrente: AssegnazioneVasca;
  atletaPerId: Map<number, Atleta>;
  assegnatiCount: number;
  presentiCount: number;
  vascaMetri: number;
  oggi: string;
}): void {
  const { corrente, atletaPerId, assegnatiCount, presentiCount, vascaMetri, oggi } = opts;
  const righe = corrente.corsie.map(c => {
    const nomi = c.atletiIds
      .map(id => atletaPerId.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a, i) => `<tr><td class="num">${i + 1}</td><td>${a.cognome} ${a.nome}</td></tr>`)
      .join('');
    const rip = c.ripartenzaCorsia != null ? formattaSecondi(c.ripartenzaCorsia) : 'ereditata';
    const int = c.intervalloPartenza != null ? `${c.intervalloPartenza} s` : '—';
    return `<section class="corsia">
        <h2>Corsia ${c.numero}${c.bloccata ? ' 🔒' : ''} — ${c.atletiIds.length} atleti · ripartenza ${rip} · intervallo ${int}</h2>
        <table>${nomi || '<tr><td class="vuota">—</td></tr>'}</table>
      </section>`;
  }).join('');
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Regia Corsie — ${formattaData(oggi)}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;color:#1a1c1e}
  h1{font-size:20px;margin:0 0 4px}
  .meta{color:#5b5f66;font-size:12px;margin-bottom:16px}
  .corsia{border:1px solid #d7dbe0;border-radius:8px;padding:10px 14px;margin-bottom:12px;page-break-inside:avoid}
  .corsia h2{font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:3px 6px;border-bottom:1px solid #eee}
  td.num{width:28px;color:#8a8f98;font-weight:700;text-align:center}
  td.vuota{color:#9aa0a8;font-style:italic}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>Regia Tecnica · Vasca ${vascaMetri} m</h1>
<div class="meta">${formattaData(oggi)} · ${assegnatiCount}/${presentiCount} atleti assegnati · ripartenza generale ${formattaSecondi(corrente.ripartenzaGenerale)}</div>
${righe}
</body></html>`;
  // Su Android WebView non esiste window.print: usa la stampa nativa
  // del documento generato. Sul web si mantiene window.open + print.
  const bridge = window.AndroidBridge;
  if (bridge && typeof bridge.printHtml === 'function') {
    try {
      bridge.printHtml(html);
      return;
    } catch {
      // fallback al percorso web
    }
  }
  const w = window.open('', '_blank', 'noopener');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
