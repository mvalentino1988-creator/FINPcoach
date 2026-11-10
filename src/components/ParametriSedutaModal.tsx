import React, { useEffect, useMemo, useState } from 'react';
import { ParametriSeduta } from '../types';
import {
  DURATA_DEFAULT_MIN,
  DURATA_MAX,
  DURATA_MIN,
  OrigineParametri,
  normalizzaDurata,
  normalizzaVasca,
} from '../domain/parametriSeduta';
import { SedutaSettimana, ricalibraSettimana } from '../domain/volumePrescritto';
import { formattaData } from '../domain/dateUtils';
import { DAY_OF_WEEK_FULL_NAMES, DayOfWeekNum } from '../types';
import { Clock, SlidersHorizontal, Waves, X } from 'lucide-react';

interface Props {
  open: boolean;
  dataISO: string;
  giorno: DayOfWeekNum;
  iniziali: ParametriSeduta;
  origine: OrigineParametri;
  settimana: SedutaSettimana[];
  volumeSettimana: number;
  passo100m: number;
  onClose: () => void;
  onApplicaOggi: (p: ParametriSeduta) => void;
  onApplicaGiorno: (p: ParametriSeduta) => void;
  onRimuoviOverride: () => void;
}

const DURATE_RAPIDE = [45, 60, 75, 90, 120];

export const ParametriSedutaModal: React.FC<Props> = ({
  open,
  dataISO,
  giorno,
  iniziali,
  origine,
  settimana,
  volumeSettimana,
  passo100m,
  onClose,
  onApplicaOggi,
  onApplicaGiorno,
  onRimuoviOverride,
}) => {
  const [vasca, setVasca] = useState(normalizzaVasca(iniziali.vascaMetri));
  const [durata, setDurata] = useState(normalizzaDurata(iniziali.durataMin, DURATA_DEFAULT_MIN));

  // Riaprendo il pannello i valori partono sempre dai parametri effettivi.
  useEffect(() => {
    if (!open) return;
    setVasca(normalizzaVasca(iniziali.vascaMetri));
    setDurata(normalizzaDurata(iniziali.durataMin, DURATA_DEFAULT_MIN));
  }, [open, iniziali.vascaMetri, iniziali.durataMin]);

  const nuoviParametri: ParametriSeduta = { vascaMetri: vasca, durataMin: durata };

  const { ripartizione, variazioni } = useMemo(() => {
    const dopo = settimana.map((s) =>
      s.data === dataISO ? { data: s.data, parametri: nuoviParametri } : s
    );
    return ricalibraSettimana(settimana, dopo, volumeSettimana, passo100m);
  }, [settimana, dataISO, vasca, durata, volumeSettimana, passo100m]);

  const oggi = ripartizione.find((r) => r.data === dataISO);
  const altre = variazioni.filter((v) => v.data !== dataISO && v.delta !== 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-xl bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl border border-outline-variant shadow-float max-h-[92dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-tight">
                Vasca e Durata Seduta
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {DAY_OF_WEEK_FULL_NAMES[giorno]} {formattaData(dataISO)}
                {' · '}
                {origine === 'override' ? 'override per oggi' : origine === 'giorno' ? 'programmazione del giorno' : 'default stagione'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-btn-icon shrink-0" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-body-bold font-body-bold text-on-surface">
              <Waves size={15} className="text-primary" /> Vasca
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-full">
              {[25, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVasca(v)}
                  className={`min-h-[44px] rounded-full font-headline font-bold text-sm transition ${
                    vasca === v
                      ? 'bg-surface-container-lowest text-on-surface shadow-card'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {v} metri
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-body-bold font-body-bold text-on-surface">
              <Clock size={15} className="text-primary" /> Durata (minuti)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={DURATA_MIN}
                max={DURATA_MAX}
                step={5}
                value={durata}
                onChange={(e) => setDurata(normalizzaDurata(Number(e.target.value), durata))}
                className="w-24 h-11 px-3 bg-surface-container-low border border-outline-variant rounded-xl font-headline font-bold text-lg text-center text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-wrap gap-1.5">
                {DURATE_RAPIDE.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurata(d)}
                    className={`min-h-[36px] px-3 rounded-full text-label-md font-label-md border transition ${
                      durata === d
                        ? 'bg-primary-fixed text-on-primary-fixed-variant border-primary-fixed-dim font-bold'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    {d}'
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ds-card-flat p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Anteprima ricalibrazione</span>
              <span className="ds-chip-blue">{oggi?.metri ?? 0} m oggi</span>
            </div>
            <p className="text-body-base font-body-base text-on-surface-variant">
              Il volume settimanale resta {volumeSettimana} m: cambiando la durata, i metri vengono
              ridistribuiti sulle sedute residue della settimana.
            </p>

            {oggi && oggi.limitata && (
              <p className="ds-chip-tertiary !min-h-0">
                ⚠️ La seduta è al tetto di sostenibilità per {durata} minuti ({oggi.cap} m).
              </p>
            )}

            {altre.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {altre.map((v) => (
                  <li key={v.data} className="flex items-center justify-between gap-3 text-body-base font-body-base">
                    <span className="text-on-surface-variant">{formattaData(v.data)}</span>
                    <span className={`ds-chip !min-h-0 ${v.delta > 0 ? 'ds-chip-blue' : 'ds-chip-tertiary'}`}>
                      {v.delta > 0 ? '+' : ''}{v.delta} m
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-base font-body-base text-on-surface-variant">
                Nessuna variazione sulle altre sedute della settimana.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => { onApplicaOggi(nuoviParametri); onClose(); }}
              className="ds-btn-primary w-full"
            >
              Applica solo a oggi
            </button>
            <button
              type="button"
              onClick={() => { onApplicaGiorno(nuoviParametri); onClose(); }}
              className="ds-btn-secondary w-full"
            >
              Applica a tutti i {DAY_OF_WEEK_FULL_NAMES[giorno]}
            </button>
          </div>

          {origine === 'override' && (
            <button
              type="button"
              onClick={() => { onRimuoviOverride(); onClose(); }}
              className="w-full min-h-[44px] rounded-xl text-body-base font-body-bold text-on-tertiary hover:bg-tertiary-fixed/40 transition"
            >
              Rimuovi override di oggi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
