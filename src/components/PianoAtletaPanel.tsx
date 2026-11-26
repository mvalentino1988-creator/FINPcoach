import React, { useMemo } from 'react';
import { CalendarDays, Download, Printer } from 'lucide-react';
import { useApp } from '../data/AppContext';
import { Atleta } from '../types';
import { pianoAtletaSettimane, gareAtleta, csvSquadra, pianoAtletaTesto } from '../domain/pianoAtleta';
import { formattaData } from '../domain/dateUtils';
import { androidBridge, hasNativeMethod, invokeNative } from '../lib/nativeBridge';
import { useToast } from './ui';

interface Props {
  atleta: Atleta;
}

/**
 * "Piano atleta" (C4): volume individuale per ogni settimana della stagione
 * (fattoreVolume, età, assenze, rientro), tipo di microciclo, tapering,
 * gare iscritte. Include stampa del singolo piano ed export CSV squadra.
 */
export const PianoAtletaPanel: React.FC<Props> = ({ atleta }) => {
  const { atleti, micro, assenze, gare, iscrizioniGare } = useApp();
  const { toast } = useToast();

  const righe = useMemo(
    () => pianoAtletaSettimane(atleta, micro, assenze.filter(a => a.atletaId === atleta.id)),
    [atleta, micro, assenze]
  );
  const gareIscritte = useMemo(
    () => gareAtleta(iscrizioniGare, gare, atleta.id),
    [iscrizioniGare, gare, atleta.id]
  );

  const volumeTotale = righe.reduce((s, r) => s + r.volumeMetri, 0);

  const stampa = () => {
    const testo = pianoAtletaTesto(atleta, righe, gareIscritte);
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Piano ${atleta.cognome}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#1a1c1e}h1{font-size:18px}pre{font-size:12px;white-space:pre-wrap}@media print{body{margin:12mm}}</style></head><body><pre>${testo.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`;
    const bridge = window.AndroidBridge ?? androidBridge();
    if (bridge && typeof (bridge as { printHtml?: unknown }).printHtml === 'function') {
      try {
        (bridge as { printHtml: (h: string) => void }).printHtml(html);
        return;
      } catch { /* fallback web */ }
    }
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print?.();
  };

  const esportaCsv = () => {
    const csv = csvSquadra(atleti, micro, assenze, iscrizioniGare, gare);
    const fileName = `piano_squadra_${new Date().toISOString().slice(0, 10)}.csv`;
    const bridge = androidBridge();
    if (hasNativeMethod(bridge, 'exportTextFile')) {
      const res = invokeNative<boolean>(bridge, 'exportTextFile', fileName, csv);
      if (res.ok && res.value === true) {
        toast({ variant: 'success', title: 'CSV esportato', message: fileName });
        return;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ variant: 'success', title: 'CSV esportato', message: fileName });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-on-surface-variant">
          Volume stagione: <strong className="tabular-nums">{Math.round(volumeTotale).toLocaleString('it-IT')} m</strong>
          {' '}· {righe.filter(r => r.volumeMetri > 0).length} settimane attive
          {' '}· {gareIscritte.filter(g => g.iscrizione.stato === 'ISCRITTO').length} gare iscritte
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={stampa}
            className="h-11 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Printer size={14} /> Stampa piano
          </button>
          <button
            type="button"
            onClick={esportaCsv}
            className="h-11 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Download size={14} /> CSV squadra
          </button>
        </div>
      </div>

      {righe.length === 0 ? (
        <p className="text-xs text-on-surface-variant">Nessun microciclo definito per la stagione.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-outline-variant/60">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-container-low">
              <tr className="text-left text-on-surface-variant uppercase tracking-wide">
                <th className="px-2 py-1.5 font-bold">Settimana</th>
                <th className="px-2 py-1.5 font-bold">Tipo</th>
                <th className="px-2 py-1.5 font-bold text-right">Volume m</th>
              </tr>
            </thead>
            <tbody>
              {righe.map(r => (
                <tr key={r.micro.id} className={`border-t border-outline-variant/40 ${r.tapering ? 'bg-secondary-fixed/30' : ''}`}>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {formattaData(r.micro.inizio)}–{formattaData(r.micro.fine)}
                  </td>
                  <td className="px-2 py-1.5">
                    {r.tipoLabel}
                    {r.tapering && <span className="ds-chip-blue ml-1">tapering</span>}
                    {r.note && <span className="block text-on-surface-variant text-[12px]">{r.note}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-bold">
                    {Math.round(r.volumeMetri).toLocaleString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs">
        <p className="font-bold uppercase tracking-wide text-on-surface-variant flex items-center gap-1 mb-1">
          <CalendarDays size={13} /> Gare iscritte
        </p>
        {gareIscritte.length === 0 ? (
          <p className="text-on-surface-variant">Nessuna iscrizione registrata.</p>
        ) : (
          <ul className="space-y-1">
            {gareIscritte.map(g => (
              <li key={g.iscrizione.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{g.gara.nome} · {formattaData(g.gara.dal)}</span>
                <span className={`ds-chip-neutral shrink-0 ${g.iscrizione.stato === 'ISCRITTO' ? 'text-status-live' : ''}`}>
                  {g.iscrizione.stato}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
