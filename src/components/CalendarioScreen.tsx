import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { CalendarioService, EventoCalendario } from '../domain/calendarioService';
import { todayISO } from '../domain/dateUtils';
import { CalendarDays, MapPin, Info, Plus, Check, Trash2, Star, ExternalLink, Waves } from 'lucide-react';

const DISCIPLINA_COLORE: Record<string, string> = {
  Nuoto: 'bg-surface-container-low text-primary-container border-primary-fixed-dim',
  Fondo: 'bg-surface-container-low text-secondary border-secondary-fixed',
  Pallanuoto: 'bg-surface-container-low text-tertiary border-tertiary-fixed-dim'
};

export const CalendarioScreen: React.FC = () => {
  const { gare, stagione, aggiungiGara, eliminaGara } = useApp();
  const meta = CalendarioService.meta();
  const oggi = todayISO();
  const [soloProssimi, setSoloProssimi] = useState(true);

  const eventi = useMemo(() => {
    const lista = CalendarioService.eventi();
    return soloProssimi ? lista.filter(e => e.al >= oggi) : lista;
  }, [soloProssimi, oggi]);

  const gruppi = useMemo(() => {
    const mappa = new Map<string, EventoCalendario[]>();
    for (const evento of eventi) {
      const chiave = CalendarioService.meseChiave(evento.dal);
      const lista = mappa.get(chiave) ?? [];
      lista.push(evento);
      mappa.set(chiave, lista);
    }
    return [...mappa.entries()];
  }, [eventi]);

  const giaInStagione = (evento: EventoCalendario) =>
    gare.some(g => g.nome === evento.titolo && g.dal === evento.dal);

  const aggiungi = (evento: EventoCalendario) => {
    if (!stagione) return;
    const periodo = CalendarioService.formattaPeriodo(evento);
    const confermato = window.confirm(
      `Aggiungere questa gara alla stagione?\n\n${evento.titolo}\n${periodo} — ${evento.luogo}\n\n` +
        `Il piano verrà rigenerato per tenere conto della gara` +
        (evento.prioritaria ? ' (indicata come prioritaria: attiva picco e scarico pre-gara).' : '.')
    );
    if (confermato) aggiungiGara(evento.titolo, evento.dal, evento.al, evento.prioritaria, evento.luogo);
  };

  const rimuovi = (evento: EventoCalendario) => {
    const gara = gare.find(g => g.nome === evento.titolo && g.dal === evento.dal);
    if (gara && window.confirm(`Rimuovere "${evento.titolo}" dalla stagione?`)) eliminaGara(gara.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-2">
          <CalendarDays size={22} className="text-primary-container" />
          <span>Calendario gare FINP {meta.aggiornato}</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Eventi nazionali di nuoto, fondo e pallanuoto. Aggiungi una gara alla stagione per farla considerare dal piano.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-slate-200/70 p-3 shadow-card">
        <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloProssimi}
            onChange={e => setSoloProssimi(e.target.checked)}
            className="w-4 h-4 rounded border-outline-variant text-primary-container focus:ring-primary/30"
          />
          Mostra solo le gare future
        </label>
      </div>

      {!stagione && (
        <div className="p-3 rounded-xl bg-surface-container-low border border-tertiary-fixed-dim text-xs text-on-tertiary-fixed flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Nessuna stagione attiva. Crea prima una stagione in Piano per poter aggiungere gare.</span>
        </div>
      )}

      {gruppi.length === 0 ? (
        <div className="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 text-xs text-on-surface-variant">
          Nessuna gara da mostrare con i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-5">
          {gruppi.map(([chiave, lista]) => (
            <section key={chiave} className="space-y-2">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {CalendarioService.meseLabel(lista[0].dal)}
              </h3>
              <div className="space-y-2">
                {lista.map(evento => {
                  const inStagione = giaInStagione(evento);
                  const passata = evento.al < oggi;
                  return (
                    <article key={evento.id} className={`bg-surface-container-lowest rounded-xl border p-4 shadow-card space-y-2 ${passata ? 'opacity-70' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface text-sm leading-snug flex items-center gap-1.5">
                            {evento.prioritaria && <Star size={13} className="text-tertiary-container shrink-0" />}
                            <span>{evento.titolo}</span>
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-on-surface-variant">
                            <span className="flex items-center gap-1"><CalendarDays size={12} />{CalendarioService.formattaPeriodo(evento)}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} />{evento.luogo} ({evento.regione})</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border shrink-0 ${DISCIPLINA_COLORE[evento.disciplina] ?? 'bg-surface-container-low text-on-surface-variant border-slate-200/70'}`}>
                          {evento.disciplina}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {inStagione ? (
                          <>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-primary"><Check size={13} />Già in stagione</span>
                            <button type="button" onClick={() => rimuovi(evento)} className="text-[11px] font-semibold text-error hover:text-error flex items-center gap-1">
                              <Trash2 size={12} />Rimuovi
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aggiungi(evento)}
                            disabled={!stagione}
                            className={`flex items-center gap-1.5 px-3 h-12 rounded-xl text-[11px] font-bold transition ${stagione ? 'bg-primary-container text-on-primary hover:bg-primary shadow-card' : 'bg-surface-container text-on-surface-variant cursor-not-allowed'}`}
                          >
                            <Plus size={13} />Aggiungi alla stagione
                          </button>
                        )}
                        {evento.prioritaria && <span className="text-[10px] font-semibold text-tertiary-container flex items-center gap-1"><Star size={11} />prioritaria</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="p-3 rounded-xl bg-surface-container-low border border-slate-200/70 text-[11px] text-on-surface-variant flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <span>
          {meta.nota} Snapshot consultabile offline. Verifica sempre il calendario ufficiale:{' '}
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-primary-container font-semibold underline inline-flex items-center gap-0.5">
            {meta.url}<ExternalLink size={11} />
          </a>
        </span>
      </div>
      <div className="p-3 rounded-xl bg-surface-container-lowest border border-slate-200/70 text-[11px] text-on-surface-variant flex items-start gap-2">
        <Waves size={14} className="mt-0.5 shrink-0 text-primary-container" />
        <span>Le gare prioritarie (A-Race) attivano picco e scarico pre-gara; puoi modificarle nel Piano.</span>
      </div>
    </div>
  );
};
