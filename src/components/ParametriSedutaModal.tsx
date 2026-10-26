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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200/70 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-200/70 sticky top-0 bg-surface-container-lowest">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
              <SlidersHorizontal size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                Vasca e durata della seduta
              </h3>
              <p className="ds-label !normal-case">
                {DAY_OF_WEEK_FULL_NAMES[giorno]} {formattaData(dataISO)}
                {' · '}
                {origine === 'override' ? 'override per oggi' : origine === 'giorno' ? 'programmazione del giorno' : 'default stagione'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-btn-icon" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-body-bold font-body-bold text-on-surface">
              <Waves size={15} className="text-primary" /> Vasca
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[25, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVasca(v)}
                  className={`min-h-[48px] rounded-xl font-bold text-sm border transition ${
                    vasca === v
                      ? 'bg-primary text-on-primary border-primary shadow-primary-sm'
                      : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high'
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
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={DURATA_MIN}
                max={DURATA_MAX}
                step={5}
                value={durata}
                onChange={(e) => setDurata(normalizzaDurata(Number(e.target.value), durata))}
                className="w-28 px-3 h-12 border border-outline-variant rounded-xl font-bold text-lg text-center"
              />
              <div className="flex flex-wrap gap-1.5">
                {DURATE_RAPIDE.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurata(d)}
                    className={`min-h-[40px] px-3 rounded-full text-label-md font-label-md border transition ${
                      durata === d
                        ? 'bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim font-bold'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant'
                    }`}
                  >
                    {d}'
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-surface-container-low p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-bold font-body-bold text-on-surface">Anteprima ricalibrazione</span>
              <span className="ds-chip-primary">{oggi?.metri ?? 0} m oggi</span>
            </div>
            <p className="text-body-base font-body-base text-on-surface-variant">
              Il volume settimanale resta {volumeSettimana} m: cambiando la durata, i metri vengono
              ridistribuiti sulle sedute residue della settimana.
            </p>

            {oggi && oggi.limitata && (
              <p className="text-body-base font-body-base text-on-tertiary">
                ⚠️ La seduta e' al tetto di sostenibilita' per {durata} minuti ({oggi.cap} m).
              </p>
            )}

            {altre.length > 0 ? (
              <ul className="space-y-1">
                {altre.map((v) => (
                  <li key={v.data} className="flex items-center justify-between gap-2 text-body-base font-body-base">
                    <span className="text-on-surface-variant">{formattaData(v.data)}</span>
                    <span className={v.delta > 0 ? 'text-primary font-body-bold' : 'text-on-tertiary font-body-bold'}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
              className="ds-btn-ghost w-full"
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
