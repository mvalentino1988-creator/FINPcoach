import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { CalendarioService, EventoCalendario } from '../domain/calendarioService';
import { todayISO } from '../domain/dateUtils';
import { CalendarDays, MapPin, Info, Plus, Check, Trash2, Star, ExternalLink, Waves } from 'lucide-react';

const DISCIPLINA_COLORE: Record<string, string> = {
  Nuoto: 'bg-cyan-50 text-[#006874] border-cyan-100',
  Fondo: 'bg-blue-50 text-blue-700 border-blue-100',
  Pallanuoto: 'bg-amber-50 text-amber-700 border-amber-100'
};

export const CalendarioScreen: React.FC = () => {
  const { gare, stagione, aggiungiGara, eliminaGara } = useApp();
  const meta = CalendarioService.meta();
  const oggi = todayISO();

  const [soloProssimi, setSoloProssimi] = useState(true);

  // Solo nuoto in vasca: fondo/acque libere e pallanuoto non rientrano nel piano piscina.
  const eventi = useMemo(() => {
    let list = CalendarioService.nuotoVasca();
    if (soloProssimi) list = list.filter(e => e.al >= oggi);
    return list;
  }, [soloProssimi, oggi]);

  const gruppi = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>();
    for (const e of eventi) {
      const chiave = CalendarioService.meseChiave(e.dal);
      const arr = map.get(chiave) ?? [];
      arr.push(e);
      map.set(chiave, arr);
    }
    return [...map.entries()];
  }, [eventi]);

  const giaInStagione = (e: EventoCalendario) =>
    gare.some(g => g.nome === e.titolo && g.dal === e.dal);

  const aggiungi = (e: EventoCalendario) => {
    if (!stagione) return;
    const periodo = CalendarioService.formattaPeriodo(e);
    const ok = window.confirm(
      `Aggiungere questa gara alla stagione?\n\n${e.titolo}\n${periodo} — ${e.luogo}\n\n` +
        `Il piano verrà rigenerato per tenere conto della gara` +
        (e.prioritaria ? ' (indicata come prioritaria: attiva picco e scarico pre-gara).' : '.')
    );
    if (!ok) return;
    aggiungiGara(e.titolo, e.dal, e.al, e.prioritaria, e.luogo);
  };

  const rimuovi = (e: EventoCalendario) => {
    const gara = gare.find(g => g.nome === e.titolo && g.dal === e.dal);
    if (!gara) return;
    if (window.confirm(`Rimuovere "${e.titolo}" dalla stagione?`)) eliminaGara(gara.id);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarDays size={22} className="text-[#006874]" />
          <span>Calendario Gare in Vasca {meta.aggiornato}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Solo gare di nuoto in vasca del calendario nazionale FINP. Aggiungi una gara alla stagione per farla
          considerare dal piano (picco e scarico pre-gara). Fonte: {meta.fonte}.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloProssimi}
            onChange={e => setSoloProssimi(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#006874] focus:ring-[#006874]/30"
          />
          Mostra solo le gare future
        </label>
      </div>

      {/* Season hint */}
      {!stagione && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Nessuna stagione attiva. Crea prima una stagione in Piano per poter aggiungere le gare.</span>
        </div>
      )}

      {/* Events grouped by month */}
      {gruppi.length === 0 ? (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>Nessuna gara da mostrare con i filtri selezionati.</span>
        </div>
      ) : (
        <div className="space-y-5">
          {gruppi.map(([chiave, lista]) => (
            <div key={chiave} className="space-y-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {CalendarioService.meseLabel(lista[0].dal)}
              </h3>
              <div className="space-y-2">
                {lista.map(e => {
                  const inStagione = giaInStagione(e);
                  const passata = e.al < oggi;
                  return (
                    <div
                      key={e.id}
                      className={`bg-white rounded-2xl border p-4 shadow-xs space-y-2 ${
                        passata ? 'border-slate-200 opacity-70' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm leading-snug flex items-center gap-1.5">
                            {e.prioritaria && <Star size={13} className="text-amber-500 shrink-0" />}
                            <span>{e.titolo}</span>
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              {CalendarioService.formattaPeriodo(e)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {e.luogo} ({e.regione})
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border shrink-0 ${
                            DISCIPLINA_COLORE[e.disciplina] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {e.disciplina}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {inStagione ? (
                          <>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <Check size={13} />
                              Già in stagione
                            </span>
                            <button
                              type="button"
                              onClick={() => rimuovi(e)}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              Rimuovi
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aggiungi(e)}
                            disabled={!stagione}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${
                              stagione
                                ? 'bg-[#006874] text-white hover:bg-[#005a63] shadow-xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus size={13} />
                            Aggiungi alla stagione
                          </button>
                        )}
                        {e.prioritaria && (
                          <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                            <Star size={11} />
                            prioritaria
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source note */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {meta.nota} Calendario consultabile offline (snapshot). Per gli aggiornamenti ufficiali:{' '}
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-[#006874] font-semibold underline inline-flex items-center gap-0.5">
            {meta.url}
            <ExternalLink size={11} />
          </a>
        </span>
      </div>

      {/* Legend */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
        <Waves size={14} className="mt-0.5 shrink-0 text-[#006874]" />
        <span>
          Le gare marcate con <Star size={11} className="inline text-amber-500" /> sono suggerite come prioritarie
          (A-Race): il piano attiva picco e scarico in vista dell'evento. Puoi comunque modificarle in Piano.
        </span>
      </div>
    </div>
  );
};
