import React from 'react';
import { ChevronDown, ChevronUp, Search, UserCheck, UserX } from 'lucide-react';
import { Atleta } from '../types';
import { BadgeClasse } from './RegiaBadgeClasse';

interface Props {
  nonAssegnati: Atleta[];
  ricerca: string;
  onRicerca: (v: string) => void;
  bloccata: boolean;
  selezionato: number | null;
  onTapAtleta: (id: number) => void;
  onLongPressStart: (id: number) => void;
  onLongPressEnd: () => void;
  tuttiPresentiAssegnati: boolean;
  nonPresenti: Atleta[];
  nonPresentiAperto: boolean;
  onToggleNonPresenti: () => void;
  onTogglePresente: (id: number) => void;
}

export const RegiaNonAssegnati: React.FC<Props> = ({
  nonAssegnati, ricerca, onRicerca, bloccata, selezionato,
  onTapAtleta, onLongPressStart, onLongPressEnd,
  tuttiPresentiAssegnati, nonPresenti, nonPresentiAperto,
  onToggleNonPresenti, onTogglePresente,
}) => (
  <section className={`shrink-0 rounded-xl bg-surface-container-low px-3 py-2 shadow-sm border border-outline-variant/30${tuttiPresentiAssegnati && !ricerca ? ' regia-nonass-empty' : ''}`}>
    <div className="flex items-center gap-2 pb-1.5">
      <UserCheck size={15} className="text-primary shrink-0" />
      <span className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">
        Non assegnati · {nonAssegnati.length}
      </span>
      {ricerca && (
        <span className="ml-auto font-label-caps text-[12px] text-on-surface-variant">
          {nonAssegnati.length} risultati
        </span>
      )}
    </div>
    {(() => {
      if (tuttiPresentiAssegnati && !ricerca) {
        return (
          <div className="py-1.5 font-label-caps text-[12px] text-on-surface-variant">
            Tutti assegnati
          </div>
        );
      }
      return (
        <>
          <div className="relative pb-1.5">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={ricerca}
              onChange={e => onRicerca(e.target.value)}
              placeholder="Cerca atleta…"
              className="w-full h-11 pl-8 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto app-fixed-scroll">
            {nonAssegnati.map(a => (
              <button
                key={a.id}
                type="button"
                disabled={bloccata}
                onClick={() => onTapAtleta(a.id)}
                onPointerDown={() => onLongPressStart(a.id)}
                onPointerUp={onLongPressEnd}
                onPointerLeave={onLongPressEnd}
                onPointerCancel={onLongPressEnd}
                draggable={!bloccata}
                onDragStart={e => {
                  e.dataTransfer.setData('application/x-finp-atleta', String(a.id));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={`flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 rounded-xl border text-left transition active:scale-[0.98] ${
                  selezionato === a.id
                    ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant ring-2 ring-primary/40'
                    : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary/50'
                } disabled:opacity-60`}
              >
                <span className="font-body-bold text-[13px] whitespace-nowrap">{a.cognome}</span>
                <span className="flex items-center gap-0.5 shrink-0">
                  <BadgeClasse tipo="S" n={a.classeS} />
                  <BadgeClasse tipo="SB" n={a.classeSB} />
                  <BadgeClasse tipo="SM" n={a.classeSM} />
                </span>
              </button>
            ))}
            {nonAssegnati.length === 0 && ricerca && (
              <span className="font-label-caps text-[12px] text-on-surface-variant py-2">Nessun risultato</span>
            )}
          </div>
        </>
      );
    })()}

    {/* Non presenti: collassato, si segna la presenza con un tocco */}
    {nonPresenti.length > 0 && (
      <div className="pt-1.5 border-t border-outline-variant/40">
        <button
          type="button"
          onClick={onToggleNonPresenti}
          className="w-full flex items-center justify-between gap-2 min-h-[36px]"
          aria-expanded={nonPresentiAperto}
        >
          <span className="flex items-center gap-1.5 font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">
            <UserX size={13} /> Non presenti · {nonPresenti.length}
          </span>
          {nonPresentiAperto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {nonPresentiAperto && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {nonPresenti.map(a => (
              <button
                key={a.id}
                type="button"
                disabled={bloccata}
                onClick={() => onTogglePresente(a.id)}
                className="flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 rounded-xl border border-dashed border-outline-variant/70 bg-transparent text-on-surface-variant text-[12px] font-bold disabled:opacity-60"
                title="Segna presente"
              >
                <UserCheck size={13} className="text-primary" />
                {a.cognome}
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </section>
);
