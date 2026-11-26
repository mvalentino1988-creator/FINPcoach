import React from 'react';
import { Minus, Trash2, UserCheck } from 'lucide-react';
import { Atleta } from '../types';
import {
  AssegnazioneVasca,
  assegnaAtleta,
  CorsiaAssegnazione,
  impostaRipartenzaAtleta,
  MAX_ATLETI_CORISIA,
  rimuoviDaCorsia,
  ripartenzaEreditata,
  scambiaConAdiacente,
} from '../domain/assegnazioneVasca';
import { formattaSecondi } from './regiaStampa';

interface Props {
  atleta: Atleta;
  corsia: CorsiaAssegnazione | null;
  corrente: AssegnazioneVasca;
  bloccata: boolean;
  presentiSet: Set<number>;
  onClose: () => void;
  update: (fn: (a: AssegnazioneVasca) => AssegnazioneVasca | null) => void;
  onTogglePresente: (id: number) => void;
}

export const RegiaSheetAtleta: React.FC<Props> = ({
  atleta, corsia, corrente, bloccata, presentiSet,
  onClose, update, onTogglePresente,
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
    <button type="button" aria-label="Chiudi finestra" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default" />
    <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Dettaglio atleta">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">
            {atleta.cognome} {atleta.nome}
          </h3>
          <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">
            {corsia ? `Corsia ${corsia.numero} · ${corsia.atletiIds.indexOf(atleta.id) + 1}º di partenza` : 'Non assegnato'}
            {!presentiSet.has(atleta.id) ? ' · non presente' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
        >
          <Minus size={16} className="rotate-45" />
        </button>
      </div>

      {/* Sposta in corsia */}
      <div className="mt-4">
        <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">Sposta in corsia</p>
        <div className="grid grid-cols-4 gap-1.5">
          {corrente.corsie.map(c => {
            const disabilitata = bloccata || c.bloccata || (!presentiSet.has(atleta.id))
              || (c.atletiIds.length >= MAX_ATLETI_CORISIA && !c.atletiIds.includes(atleta.id));
            const attiva = corsia?.numero === c.numero;
            return (
              <button
                key={c.numero}
                type="button"
                disabled={disabilitata}
                onClick={() => {
                  if (!attiva) update(a => assegnaAtleta(a, atleta.id, c.numero));
                  onClose();
                }}
                className={`min-h-[48px] rounded-xl font-bold text-[13px] transition ${
                  attiva
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-40'
                }`}
              >
                {c.numero}
              </button>
            );
          })}
        </div>
      </div>

      {corsia && !corsia.bloccata && (
        <>
          {/* Ordine di partenza */}
          <div className="mt-4">
            <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">Ordine di partenza</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={bloccata}
                onClick={() => update(a => scambiaConAdiacente(a, corsia.numero, atleta.id, -1))}
                className="flex-1 min-h-[48px] rounded-xl bg-surface-container font-bold text-[13px] disabled:opacity-40"
              >
                ↑ Su
              </button>
              <button
                type="button"
                disabled={bloccata}
                onClick={() => update(a => scambiaConAdiacente(a, corsia.numero, atleta.id, 1))}
                className="flex-1 min-h-[48px] rounded-xl bg-surface-container font-bold text-[13px] disabled:opacity-40"
              >
                ↓ Giù
              </button>
            </div>
          </div>

          {/* Ripartenza personale */}
          <div className="mt-4">
            <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">
              Ripartenza personale {(() => {
                const ereditata = ripartenzaEreditata(corrente, corsia.numero, atleta.id);
                return <span className="normal-case font-normal">(ereditata {formattaSecondi(ereditata)})</span>;
              })()}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={bloccata}
                onClick={() => {
                  const cur = corrente.ripartenzeAtleta[atleta.id] ?? ripartenzaEreditata(corrente, corsia.numero, atleta.id);
                  update(a => impostaRipartenzaAtleta(a, atleta.id, Math.max(5, cur - 5)));
                }}
                className="w-12 h-12 rounded-xl bg-surface-container font-bold text-[15px] disabled:opacity-40"
              >−5</button>
              <span className="flex-1 text-center font-headline-sm text-[16px] font-bold text-on-surface">
                {corrente.ripartenzeAtleta[atleta.id] != null
                  ? `${corrente.ripartenzeAtleta[atleta.id]}s`
                  : 'Ered.'}
              </span>
              <button
                type="button"
                disabled={bloccata}
                onClick={() => {
                  const cur = corrente.ripartenzeAtleta[atleta.id] ?? ripartenzaEreditata(corrente, corsia.numero, atleta.id);
                  update(a => impostaRipartenzaAtleta(a, atleta.id, cur + 5));
                }}
                className="w-12 h-12 rounded-xl bg-surface-container font-bold text-[15px] disabled:opacity-40"
              >+5</button>
              {corrente.ripartenzeAtleta[atleta.id] != null && (
                <button
                  type="button"
                  disabled={bloccata}
                  onClick={() => update(a => impostaRipartenzaAtleta(a, atleta.id, null))}
                  className="h-12 px-3 rounded-xl bg-surface-container text-on-surface-variant text-[12px] font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Rimuovi */}
          <div className="mt-4">
            <button
              type="button"
              disabled={bloccata}
              onClick={() => {
                update(a => rimuoviDaCorsia(a, atleta.id));
                onClose();
              }}
              className="w-full min-h-[48px] rounded-xl bg-surface-container text-error font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Trash2 size={15} /> Rimuovi dalla corsia
            </button>
          </div>
        </>
      )}

      {/* Non presente: segna presente */}
      {!presentiSet.has(atleta.id) && (
        <div className="mt-4">
          <button
            type="button"
            disabled={bloccata}
            onClick={() => {
              onTogglePresente(atleta.id);
              onClose();
            }}
            className="w-full min-h-[48px] rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-bold text-[14px] flex items-center justify-center gap-2"
          >
            <UserCheck size={15} /> Segna come presente
          </button>
        </div>
      )}
    </div>
  </div>
);

