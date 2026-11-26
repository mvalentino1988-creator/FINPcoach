import React from 'react';
import { Lock, LockOpen, Minus } from 'lucide-react';
import { Atleta } from '../types';
import {
  AssegnazioneVasca,
  CorsiaAssegnazione,
  impostaBloccoCorsia,
  impostaIntervalloCorsia,
  impostaRipartenzaCorsia,
  MAX_ATLETI_CORISIA,
  rimuoviDaCorsia,
  ripartenzaEreditata,
  secondi5,
} from '../domain/assegnazioneVasca';
import { INTERVALLO_PRESETS } from '../domain/cronometroVasca';

const LANE_ACCENTS = [
  { bar: 'bg-primary', chip: 'bg-primary text-on-primary' },
  { bar: 'bg-secondary', chip: 'bg-secondary text-on-secondary' },
  { bar: 'bg-tertiary-container', chip: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { bar: 'bg-primary-container', chip: 'bg-primary-container text-on-primary' },
];

interface Props {
  corsia: CorsiaAssegnazione;
  corrente: AssegnazioneVasca;
  bloccata: boolean;
  selezionato: number | null;
  atletaPerId: Map<number, Atleta>;
  update: (fn: (a: AssegnazioneVasca) => AssegnazioneVasca | null) => void;
  onTapCorsia: (numero: number) => void;
  onTapAtleta: (id: number) => void;
  onLongPressStart: (id: number, corsia: number) => void;
  onLongPressEnd: () => void;
  onDropAtleta: (e: React.DragEvent, corsiaNumero: number) => void;
}

export const RegiaCorsiaCard: React.FC<Props> = ({
  corsia: c, corrente, bloccata, selezionato, atletaPerId, update,
  onTapCorsia, onTapAtleta, onLongPressStart, onLongPressEnd, onDropAtleta,
}) => {
  const accent = LANE_ACCENTS[(c.numero - 1) % LANE_ACCENTS.length];
  const piena = c.atletiIds.length >= MAX_ATLETI_CORISIA;
  const evidenziata = selezionato != null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Corsia ${c.numero}, ${c.atletiIds.length} atleti`}
      onClick={e => {
        // Clic su controlli interni (bottoni +/-/blocco) non seleziona la corsia.
        if ((e.target as HTMLElement).closest('button')) return;
        onTapCorsia(c.numero);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTapCorsia(c.numero);
        }
      }}
      onDragOver={e => { if (!bloccata) e.preventDefault(); }}
      onDrop={e => onDropAtleta(e, c.numero)}
      className={`rounded-xl bg-surface-container-low relative overflow-hidden flex flex-col min-w-0 border transition ${
        evidenziata && !bloccata ? 'border-primary/50' : 'border-transparent'
      } ${c.bloccata ? 'opacity-90' : ''}`}
    >
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${accent.bar}`} />
      <div className="p-2 pl-3 flex flex-col gap-1.5 min-h-0">
        {/* Intestazione corsia: va a capo se i controlli non entrano
            (schermi stretti/portrait). Target touch restano >= 44 px. */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={`w-6 h-6 rounded-md ${accent.chip} text-[12px] font-bold flex items-center justify-center shrink-0`}>
            {c.numero}
          </span>
          <span className="font-label-caps text-[12px] text-on-surface-variant font-bold uppercase truncate">
            {c.atletiIds.length} atleti
          </span>
          <div className="ml-auto flex items-center gap-0.5 flex-wrap justify-end">
            {/* Ripartenza corsia */}
            <button
              type="button"
              disabled={bloccata}
              onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, secondi5(Math.max(5, (c.ripartenzaCorsia ?? corrente.ripartenzaGenerale) - 5))))}
              className="w-12 h-12 rounded-md bg-surface-container text-on-surface text-[12px] font-bold disabled:opacity-40"
              aria-label="Diminuisci ripartenza corsia"
            >−</button>
            <span className="px-1 font-label-caps text-[12px] font-bold text-on-surface min-w-[2.2ch] text-center" title="Ripartenza corsia (multipli di 5 s)">
              {c.ripartenzaCorsia != null ? `${c.ripartenzaCorsia}s` : '—'}
            </span>
            <button
              type="button"
              disabled={bloccata}
              onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, secondi5(Math.min(600, (c.ripartenzaCorsia ?? corrente.ripartenzaGenerale) + 5))))}
              className="w-12 h-12 rounded-md bg-surface-container text-on-surface text-[12px] font-bold disabled:opacity-40"
              aria-label="Aumenta ripartenza corsia"
            >+</button>
            {c.ripartenzaCorsia != null && (
              <button
                type="button"
                disabled={bloccata}
                onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, null))}
                className="w-12 h-12 rounded-md text-on-surface-variant text-[12px] font-bold"
                aria-label="Ripartenza corsia ereditata"
                title="Torna alla ripartenza ereditata"
              >×</button>
            )}
            {/* Intervallo partenza automatica */}
            <button
              type="button"
              disabled={bloccata}
              onClick={() => {
                const opts: (number | null)[] = [null, ...INTERVALLO_PRESETS];
                const curIdx = opts.indexOf(c.intervalloPartenza ?? null);
                const next = opts[(curIdx + 1) % opts.length];
                update(a => impostaIntervalloCorsia(a, c.numero, next));
              }}
              className={`h-12 px-2 rounded-md font-label-caps text-[12px] font-bold uppercase ${
                c.intervalloPartenza != null ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container text-on-surface-variant'
              }`}
              title="Intervallo partenza automatica"
            >
              {c.intervalloPartenza != null ? `I${c.intervalloPartenza}` : 'I—'}
            </button>
            {/* Blocco corsia */}
            <button
              type="button"
              onClick={() => update(a => impostaBloccoCorsia(a, c.numero, !c.bloccata))}
              className={`w-12 h-12 rounded-md flex items-center justify-center ${
                c.bloccata ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
              aria-label={c.bloccata ? `Sblocca corsia ${c.numero}` : `Blocca corsia ${c.numero}`}
              title={c.bloccata ? 'Corsia bloccata' : 'Blocca corsia'}
            >
              {c.bloccata ? <Lock size={12} /> : <LockOpen size={12} />}
            </button>
          </div>
        </div>

        {/* Atleti in corsia */}
        {c.atletiIds.length === 0 ? (
          <div className="rounded-lg bg-surface-container/50 border border-dashed border-outline-variant/50 px-2 py-2 text-center font-label-caps text-[12px] text-on-surface-variant uppercase">
            {selezionato != null && !c.bloccata ? 'Tocca per assegnare' : 'Vuota'}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {c.atletiIds.map((id, idx) => {
              const a = atletaPerId.get(id);
              if (!a) return null;
              const rip = c.bloccata ? null : ripartenzaEreditata(corrente, c.numero, id);
              const personale = corrente.ripartenzeAtleta[id];
              const mostraPersonale = personale != null && personale !== rip;
              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.cognome} ${a.nome}, corsia ${c.numero}`}
                  draggable={!bloccata && !c.bloccata}
                  onDragStart={e => {
                    e.dataTransfer.setData('application/x-finp-atleta', String(id));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    onTapAtleta(id);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onTapAtleta(id);
                    }
                  }}
                  onPointerDown={() => onLongPressStart(id, c.numero)}
                  onPointerUp={onLongPressEnd}
                  onPointerLeave={onLongPressEnd}
                  onPointerCancel={onLongPressEnd}
                  className={`flex items-center gap-1.5 px-1.5 py-1 min-h-[48px] rounded-lg bg-surface-container-lowest border min-w-0 cursor-pointer transition active:scale-[0.98] ${
                    selezionato === id ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/30'
                  }`}
                >
                  <span className="w-4 h-4 rounded bg-surface-container-high text-on-surface-variant text-[12px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-body-bold text-[12px] text-on-surface line-clamp-2 leading-tight break-words min-w-0 flex-1" title={a.cognome}>
                    {a.cognome}
                  </span>
                  {mostraPersonale && (
                    <span className="px-1 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-[12px] font-bold shrink-0" title="Ripartenza personale">
                      {personale}s
                    </span>
                  )}
                  {!c.bloccata && !bloccata && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        update(cur => rimuoviDaCorsia(cur, id));
                      }}
                      aria-label={`Rimuovi ${a.cognome} dalla corsia ${c.numero}`}
                      className="w-12 h-12 -m-2 rounded text-on-surface-variant hover:text-error flex items-center justify-center shrink-0"
                    >
                      <Minus size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {piena && (
          <span className="font-label-caps text-[12px] text-warning font-bold uppercase">Corsia piena</span>
        )}
      </div>
    </div>
  );
};
