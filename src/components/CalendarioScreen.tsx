import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { CalendarioService, EventoCalendario } from '../domain/calendarioService';
import { todayISO } from '../domain/dateUtils';
import { CalendarDays, MapPin, Info, Plus, Check, Trash2, Star, ExternalLink, Waves } from 'lucide-react';

const DISCIPLINA_COLORE: Record<string, string> = {
  Nuoto: 'bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim',
  Fondo: 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim',
  Pallanuoto: 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim'
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
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
          <CalendarDays size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">
            Calendario gare FINP {meta.aggiornato}
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Eventi nazionali di nuoto, fondo e pallanuoto. Aggiungi una gara alla stagione per farla considerare dal piano.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 shadow-card">
        <label className="flex items-center gap-3 text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloProssimi}
            onChange={e => setSoloProssimi(e.target.checked)}
            className="w-4 h-4 rounded border-outline-variant accent-primary"
          />
          Mostra solo le gare future
        </label>
      </div>

      {!stagione && (
        <div className="p-3 rounded-xl bg-tertiary-fixed border border-tertiary-fixed-dim text-xs text-on-tertiary-fixed leading-relaxed flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Nessuna stagione attiva. Crea prima una stagione in Piano per poter aggiungere gare.</span>
        </div>
      )}

      {gruppi.length === 0 ? (
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant">
          Nessuna gara da mostrare con i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-5">
          {gruppi.map(([chiave, lista]) => (
            <section key={chiave} className="space-y-2">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-bold">
                {CalendarioService.meseLabel(lista[0].dal)}
              </h3>
              <div className="space-y-2">
                {lista.map(evento => {
                  const inStagione = giaInStagione(evento);
                  const passata = evento.al < oggi;
                  return (
                    <article key={evento.id} className={`bg-surface-container-lowest rounded-xl border border-outline-variant p-space-md shadow-card space-y-2 ${passata ? 'opacity-70' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-snug flex items-center gap-1.5">
                            {evento.prioritaria && <Star size={13} className="text-tertiary-container shrink-0" />}
                            <span>{evento.titolo}</span>
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1"><CalendarDays size={12} />{CalendarioService.formattaPeriodo(evento)}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} />{evento.luogo} ({evento.regione})</span>
                          </div>
                        </div>
                        <span className={`font-label-caps text-label-caps uppercase tracking-wide rounded-full px-2.5 py-0.5 border shrink-0 ${DISCIPLINA_COLORE[evento.disciplina] ?? 'bg-surface-container text-on-surface-variant border-outline-variant'}`}>
                          {evento.disciplina}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {inStagione ? (
                          <>
                            <span className="flex items-center gap-1 text-xs font-bold text-secondary"><Check size={13} />Già in stagione</span>
                            <button type="button" onClick={() => rimuovi(evento)} className="text-xs font-semibold text-error hover:brightness-90 flex items-center gap-1">
                              <Trash2 size={12} />Rimuovi
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aggiungi(evento)}
                            disabled={!stagione}
                            className={`ds-btn-primary !min-h-[40px] !px-4 !py-1.5 text-xs rounded-xl ${!stagione ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Plus size={14} />Aggiungi alla stagione
                          </button>
                        )}
                        {evento.prioritaria && <span className="font-label-caps text-label-caps uppercase text-tertiary-container font-bold flex items-center gap-1"><Star size={11} />prioritaria</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant leading-relaxed flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <span>
          {meta.nota} Snapshot consultabile offline. Verifica sempre il calendario ufficiale:{' '}
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-primary font-semibold underline inline-flex items-center gap-0.5">
            {meta.url}<ExternalLink size={11} />
          </a>
        </span>
      </div>
      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface-variant leading-relaxed flex items-start gap-2">
        <Waves size={14} className="mt-0.5 shrink-0 text-primary" />
        <span>Le gare prioritarie (A-Race) attivano picco e scarico pre-gara; puoi modificarle nel Piano.</span>
      </div>
    </div>
  );
};
