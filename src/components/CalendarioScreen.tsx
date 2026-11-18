import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  CalendarioService,
  EventoCalendario,
  aggiungiEventoManuale,
  importaCalendarioJson,
} from '../domain/calendarioService';
import { todayISO } from '../domain/dateUtils';
import { CalendarDays, MapPin, Info, Plus, Check, Trash2, Star, ExternalLink, Waves, AlertTriangle, Upload, X } from 'lucide-react';
import { Badge, EmptyState } from './ui';

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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titolo: '', dal: '', al: '', luogo: '', regione: '', disciplina: 'Nuoto', prioritaria: false });
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // refreshKey è una dipendenza voluta: il servizio legge localStorage, il tick forza il ricalcolo.
  const aggiornamento = useMemo(() => {
    void refreshKey;
    return CalendarioService.statoAggiornamento(oggi);
  }, [oggi, refreshKey]);

  const eventi = useMemo(() => {
    void refreshKey;
    const lista = CalendarioService.eventi();
    return soloProssimi ? lista.filter(e => e.al >= oggi) : lista;
  }, [soloProssimi, oggi, refreshKey]);

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

  const submitManuale = () => {
    if (!form.titolo.trim() || !form.dal || !form.al) {
      setMsg('Compila almeno titolo, data inizio e data fine.');
      return;
    }
    if (form.al < form.dal) {
      setMsg('La data fine non puo\' essere precedente alla data inizio.');
      return;
    }
    const confermato = window.confirm(
      `Aggiungere l'evento manuale?\n\n${form.titolo}\n${form.dal} → ${form.al}${form.luogo ? ` — ${form.luogo}` : ''}`
    );
    if (!confermato) return;
    const ev = aggiungiEventoManuale({
      titolo: form.titolo.trim(),
      dal: form.dal,
      al: form.al,
      luogo: form.luogo.trim(),
      regione: form.regione.trim(),
      tipologia: 'Evento manuale',
      disciplina: form.disciplina,
      prioritaria: form.prioritaria,
    });
    if (ev) {
      setMsg(`Evento "${ev.titolo}" aggiunto al calendario.`);
      setForm({ titolo: '', dal: '', al: '', luogo: '', regione: '', disciplina: 'Nuoto', prioritaria: false });
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } else {
      setMsg('Dati evento non validi.');
    }
  };

  const suFileImport = async (file: File) => {
    const testo = await file.text();
    const esito = importaCalendarioJson(testo);
    if (esito.ok) {
      setMsg(`Importati ${esito.aggiunti} eventi nel calendario.`);
      setRefreshKey(k => k + 1);
    } else {
      setMsg(`Importazione rifiutata: ${esito.errori.slice(0, 3).join(' · ')}`);
    }
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

      {!aggiornamento.aggiornato && aggiornamento.motivo && (
        <div className="rounded-xl bg-tertiary-fixed border border-tertiary-fixed-dim p-3 text-xs text-on-tertiary-fixed leading-relaxed flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{aggiornamento.motivo}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setShowForm(v => !v); setMsg(null); }} className="ds-btn-secondary !min-h-[44px] !px-3 text-xs" aria-expanded={showForm}>
          <Plus size={15} />Aggiungi evento
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="ds-btn-secondary !min-h-[44px] !px-3 text-xs">
          <Upload size={15} />Importa calendario JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Importa file calendario JSON"
          onChange={e => { const f = e.target.files?.[0]; if (f) void suFileImport(f); e.target.value = ''; }}
        />
      </div>

      {showForm && (
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 space-y-2 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface">Nuovo evento</span>
            <button type="button" onClick={() => setShowForm(false)} className="ds-btn-icon" aria-label="Chiudi form evento"><X size={16} /></button>
          </div>
          <input className="ds-input !min-h-[44px]" placeholder="Titolo gara / evento" value={form.titolo} onChange={e => setForm({ ...form, titolo: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-on-surface-variant">Dal<input type="date" className="ds-input !min-h-[44px] mt-1" value={form.dal} onChange={e => setForm({ ...form, dal: e.target.value })} /></label>
            <label className="text-xs text-on-surface-variant">Al<input type="date" className="ds-input !min-h-[44px] mt-1" value={form.al} onChange={e => setForm({ ...form, al: e.target.value })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="ds-input !min-h-[44px]" placeholder="Luogo" value={form.luogo} onChange={e => setForm({ ...form, luogo: e.target.value })} />
            <input className="ds-input !min-h-[44px]" placeholder="Regione" value={form.regione} onChange={e => setForm({ ...form, regione: e.target.value })} />
          </div>
          <select className="ds-select !min-h-[44px]" value={form.disciplina} onChange={e => setForm({ ...form, disciplina: e.target.value })}>
            <option>Nuoto</option><option>Fondo</option><option>Pallanuoto</option><option>Altro</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-on-surface min-h-[44px]">
            <input type="checkbox" checked={form.prioritaria} onChange={e => setForm({ ...form, prioritaria: e.target.checked })} className="w-5 h-5 accent-primary" />
            Gara prioritaria (A-Race)
          </label>
          <button type="button" onClick={submitManuale} className="ds-btn-primary w-full !min-h-[48px]">Salva evento</button>
        </div>
      )}

      {msg && (
        <div className="rounded-xl bg-surface-container border border-outline-variant p-3 text-xs text-on-surface flex items-start gap-2" role="status">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 shadow-card">
        <label className="flex items-center gap-3 min-h-[48px] text-sm font-semibold text-on-surface cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloProssimi}
            onChange={e => setSoloProssimi(e.target.checked)}
            className="w-5 h-5 rounded border-outline-variant accent-primary"
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
        <EmptyState
          icon={<CalendarDays size={40} strokeWidth={1.5} />}
          title="Nessuna gara da mostrare"
          message="Nessuna gara da mostrare con i filtri selezionati."
        />
      ) : (
        <div className="space-y-5">
          {gruppi.map(([chiave, lista]) => (
            <section key={chiave} className="space-y-2">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-2">
                {CalendarioService.meseLabel(lista[0].dal)}
                <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant normal-case tracking-normal">
                  {lista.length} {lista.length === 1 ? 'gara' : 'gare'}
                </span>
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
                            <button type="button" onClick={() => rimuovi(evento)} className="text-xs font-semibold text-error hover:brightness-90 flex items-center gap-1 min-h-[48px] px-2 -mx-2">
                              <Trash2 size={14} />Rimuovi
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aggiungi(evento)}
                            disabled={!stagione}
                            className={`ds-btn-primary !min-h-[48px] !px-4 !py-1.5 text-xs rounded-xl ${!stagione ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Plus size={15} />Aggiungi alla stagione
                          </button>
                        )}
                        {evento.prioritaria && (
                          <Badge variant="tertiary" size="sm" icon={<Star size={11} />}>
                            Prioritaria
                          </Badge>
                        )}
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
