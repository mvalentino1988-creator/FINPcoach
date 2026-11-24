import React from 'react';
import { Atleta, Chiusura, Gara } from '../types';
import { parseData, formatDataInput } from '../domain/dateUtils';
import { Check, Edit2, Flag, Sliders, Sparkles, Users, Waves, X } from 'lucide-react';

export interface EditEventModalState {
  open: boolean;
  type: 'gara' | 'chiusura';
  id: number;
  title: string;
  dal: string;
  al: string;
  luogo: string;
  prioritaria: boolean;
}

interface EditEventProps {
  evento: EditEventModalState;
  setEvento: (e: EditEventModalState | null) => void;
  stagioneId: number;
  modificaGara: (g: Gara) => void;
  modificaChiusura: (c: Chiusura) => void;
}

export const PianoEditEventModal: React.FC<EditEventProps> = ({
  evento, setEvento, stagioneId, modificaGara, modificaChiusura,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in text-on-surface">
    <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border-hairline bg-surface-container-lowest shadow-float">
      <div className="flex items-center justify-between gap-3 border-b border-border-hairline bg-surface-container-low px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
            <Edit2 size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Modifica {evento.type === 'gara' ? 'gara' : 'chiusura'}
            </h3>
            <p className="truncate text-xs text-on-surface-variant">{evento.title || 'Evento stagionale'}</p>
          </div>
        </div>
        <button onClick={() => setEvento(null)} aria-label="Chiudi" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 p-5 text-xs">
        <div className="space-y-1.5">
          <label htmlFor="evento-titolo" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Titolo / nome *</label>
          <input
            id="evento-titolo"
            type="text"
            value={evento.title}
            onChange={e => setEvento({ ...evento, title: e.target.value })}
            className="ds-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label htmlFor="evento-dal" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Dal *</label>
            <input
              id="evento-dal"
              type="text"
              value={evento.dal}
              onChange={e => setEvento({ ...evento, dal: formatDataInput(e.target.value) })}
              className="ds-input"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="evento-al" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Al</label>
            <input
              id="evento-al"
              type="text"
              value={evento.al}
              onChange={e => setEvento({ ...evento, al: formatDataInput(e.target.value) })}
              className="ds-input"
            />
          </div>
        </div>

        {evento.type === 'gara' && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="evento-luogo" className="block font-label-caps text-label-caps uppercase text-on-surface-variant">Luogo / impianto</label>
              <input
                id="evento-luogo"
                type="text"
                value={evento.luogo}
                onChange={e => setEvento({ ...evento, luogo: e.target.value })}
                className="ds-input"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-hairline bg-surface-container-low p-3 font-headline-sm font-bold text-on-surface">
              <input
                type="checkbox"
                checked={evento.prioritaria}
                onChange={e => setEvento({ ...evento, prioritaria: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <span className="flex items-center gap-2"><Flag size={15} className="text-tertiary" /> Gara prioritaria (A-race)</span>
            </label>
          </>
        )}

        <div className="flex gap-2 border-t border-border-hairline pt-4">
          <button
            type="button"
            onClick={() => {
              const d1 = parseData(evento.dal);
              const d2 = parseData(evento.al) ?? d1;
              if (d1 && evento.title.trim()) {
                if (evento.type === 'gara') {
                  modificaGara({
                    id: evento.id,
                    stagioneId,
                    nome: evento.title.trim(),
                    dal: d1,
                    al: d2 ?? d1,
                    luogo: evento.luogo || '',
                    prioritaria: !!evento.prioritaria
                  });
                } else {
                  modificaChiusura({
                    id: evento.id,
                    stagioneId,
                    dal: d1,
                    al: d2 ?? d1,
                    motivo: evento.title.trim()
                  });
                }
                setEvento(null);
              }
            }}
            className="ds-btn-primary flex-1 justify-center"
          >
            Salva modifiche
          </button>
          <button
            type="button"
            onClick={() => setEvento(null)}
            className="ds-btn-secondary"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface ParametriProps {
  onChiudi: () => void;
  numCorsie: number;
  setNumCorsie: (n: number) => void;
  atleti: Atleta[];
  atletiPresentiIds: number[];
  onTogglePresente: (id: number) => void;
}

export const PianoParametriModal: React.FC<ParametriProps> = ({
  onChiudi, numCorsie, setNumCorsie, atleti, atletiPresentiIds, onTogglePresente,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-on-surface animate-fade-in">
    <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-hairline bg-surface-container-lowest shadow-float">
      <div className="flex items-center justify-between gap-3 border-b border-border-hairline bg-surface-container-low px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary">
            <Sliders size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Parametri e corsie</h3>
            <p className="truncate text-xs text-on-surface-variant">Anteprima disposizione automatica</p>
          </div>
        </div>
        <button onClick={onChiudi} aria-label="Chiudi" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 p-5 text-xs">
        {/* Selezione Numero Corsie Disponibili */}
        <div className="space-y-2">
          <span id="piano-num-corsie-label" className="flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary">
            <Waves size={14} /> Numero corsie
          </span>
          <div className="grid grid-cols-8 gap-1 rounded-lg bg-surface-container p-1" role="group" aria-labelledby="piano-num-corsie-label">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNumCorsie(n)}
                className={`h-11 rounded-md font-headline-sm text-headline-sm font-bold transition ${
                  numCorsie === n ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Selezione Atleti Presenti di Default */}
        <div className="space-y-2">
          <label className="flex items-center justify-between font-label-caps text-label-caps uppercase text-on-surface-variant">
            <span className="flex items-center gap-1.5"><Users size={14} className="text-secondary" /> Atleti presenti</span>
            <span>{atletiPresentiIds.length}/{atleti.length}</span>
          </label>
          <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {atleti.map(a => {
              const isPres = atletiPresentiIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onTogglePresente(a.id)}
                  className={`flex min-h-[44px] items-center justify-between rounded-lg border px-3 text-left transition ${
                    isPres ? 'border-primary bg-primary font-headline-sm font-bold text-on-primary' : 'border-border-hairline bg-surface-container-low text-on-surface hover:border-primary/40'
                  }`}
                >
                  <span className="truncate">{a.cognome} {a.nome?.[0]}. · S{a.classeS ?? '9'}</span>
                  {isPres && <Check size={15} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calcolo Automatico Disposizione Ideale Corsie */}
        <div className="space-y-3 rounded-xl border border-primary-fixed-dim bg-surface-container-low p-4">
          <div className="flex items-center gap-2 font-headline-sm text-headline-sm font-bold text-primary">
            <Sparkles size={16} />
            <span>Disposizione corsie</span>
            <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-caps text-label-caps uppercase text-on-primary-fixed">Auto</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: numCorsie }).map((_, cIdx) => {
              const laneNum = cIdx + 1;
              const assignedAthletes = atleti
                .filter(a => atletiPresentiIds.includes(a.id))
                .filter((_, aIdx) => aIdx % numCorsie === cIdx);

              return (
                <div key={laneNum} className="rounded-lg border border-border-hairline bg-surface-container-lowest p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between font-headline-sm font-bold text-primary">
                    <span>Corsia {laneNum}</span>
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{assignedAthletes.length} atleti</span>
                  </div>
                  {assignedAthletes.length === 0 ? (
                    <div className="text-on-surface-variant italic">Libera</div>
                  ) : (
                    <div className="space-y-0.5 font-medium text-on-surface">
                      {assignedAthletes.map(ath => (
                        <div key={ath.id} className="truncate">• {ath.cognome} {ath.nome} · S{ath.classeS ?? '9'}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onChiudi}
          className="ds-btn-primary w-full justify-center"
        >
          Conferma e chiudi
        </button>
      </div>
    </div>
  </div>
);
