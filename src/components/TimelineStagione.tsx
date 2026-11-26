import React, { useMemo } from 'react';
import { Gara, Macrociclo, Mesociclo, Microciclo, Stagione } from '../types';
import { daysBetween, formattaData, isInRange } from '../domain/dateUtils';
import { faseSemantica, microSemantica } from '../lib/semantica';
import { Flag } from 'lucide-react';

const PX_PER_DAY = 9;

const MACRO_TINT: { chip: string; solid: string }[] = [
  { chip: 'border bg-primary/10 text-primary border-primary/30', solid: 'bg-primary/60' },
  { chip: 'border bg-secondary/10 text-secondary border-secondary/30', solid: 'bg-secondary/60' },
  { chip: 'border bg-tertiary/10 text-tertiary border-tertiary/30', solid: 'bg-tertiary/60' },
  { chip: 'border bg-accent-gold/15 text-accent-gold border-accent-gold/40', solid: 'bg-accent-gold/60' },
];

export interface TimelineStagioneProps {
  stagione: Stagione;
  macro: Macrociclo[];
  meso: Mesociclo[];
  micro: Microciclo[];
  gare: Gara[];
  oggi: string;
  onSelezionaMacro?: (id: number) => void;
  onSelezionaMeso?: (id: number) => void;
  onSelezionaMicro?: (m: Microciclo) => void;
}

const pos = (inizio: string, iso: string) => Math.max(0, daysBetween(inizio, iso)) * PX_PER_DAY;
const span = (inizio: string, dal: string, al: string) =>
  (daysBetween(inizio, al) - daysBetween(inizio, dal) + 1) * PX_PER_DAY;

/**
 * Timeline stagionale: macro / meso / micro come barre posizionate nel tempo,
 * gare come marker, linea "oggi". Solo presentazione: il tocco riusa i
 * selettori gia' esistenti nella schermata Piano.
 */
export const TimelineStagione: React.FC<TimelineStagioneProps> = ({
  stagione, macro, meso, micro, gare, oggi,
  onSelezionaMacro, onSelezionaMeso, onSelezionaMicro,
}) => {
  const totaleDays = Math.max(1, daysBetween(stagione.inizio, stagione.fine) + 1);
  const larghezza = totaleDays * PX_PER_DAY;
  const xOggi = pos(stagione.inizio, oggi);
  const showOggi = xOggi >= 0 && xOggi <= larghezza;

  const microOrdinati = useMemo(
    () => [...micro].sort((a, b) => a.inizio.localeCompare(b.inizio)),
    [micro]
  );
  const gareOrdinati = useMemo(
    () => gare.filter(g => isInRange(g.dal, stagione.inizio, stagione.fine) || isInRange(oggi, g.dal, g.al))
      .sort((a, b) => a.dal.localeCompare(b.dal)),
    [gare, stagione, oggi]
  );

  if (totaleDays <= 0) return null;

  return (
    <div className="ds-card p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Timeline stagionale</h3>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
          {formattaData(stagione.inizio)} – {formattaData(stagione.fine)}
        </span>
      </div>

      <div className="ds-hscroll ds-touch-pan -mx-1 px-1">
        <div className="relative" style={{ width: larghezza, minWidth: '100%' }}>
          {showOggi && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
              style={{ left: xOggi }}
              title="Oggi"
            >
              <span className="absolute -top-0.5 left-1 font-label-caps text-[12px] font-bold text-primary uppercase whitespace-nowrap">oggi</span>
            </div>
          )}

          {/* Macro */}
          <div className="relative h-8 mb-1">
            {macro.map((ma, i) => {
              const tint = MACRO_TINT[i % MACRO_TINT.length];
              const w = span(stagione.inizio, ma.inizio, ma.fine);
              return (
                <button
                  key={ma.id}
                  type="button"
                  onClick={() => onSelezionaMacro?.(ma.id)}
                  title={`${ma.nome} · ${formattaData(ma.inizio)} – ${formattaData(ma.fine)}`}
                  className={`absolute top-0 h-7 rounded-md border px-1.5 text-left text-[12px] font-bold leading-7 whitespace-nowrap overflow-hidden ${tint.chip}`}
                  style={{ left: pos(stagione.inizio, ma.inizio), width: w }}
                >
                  {w > 90 ? ma.nome : ''}
                </button>
              );
            })}
          </div>

          {/* Meso */}
          <div className="relative h-6 mb-1">
            {meso.map(me => {
              const f = faseSemantica(me.fase);
              const w = span(stagione.inizio, me.inizio, me.fine);
              return (
                <button
                  key={me.id}
                  type="button"
                  onClick={() => onSelezionaMeso?.(me.id)}
                  title={`${f.label} · ${formattaData(me.inizio)} – ${formattaData(me.fine)}`}
                  className={`absolute top-0 h-5 rounded ${f.solid} opacity-80`}
                  style={{ left: pos(stagione.inizio, me.inizio), width: w }}
                  aria-label={f.label}
                />
              );
            })}
          </div>

          {/* Micro */}
          <div className="relative h-5 mb-1">
            {microOrdinati.map(mi => {
              const m = microSemantica(mi.tipo);
              const w = span(stagione.inizio, mi.inizio, mi.fine);
              return (
                <button
                  key={mi.id}
                  type="button"
                  onClick={() => onSelezionaMicro?.(mi)}
                  title={`${m.label} · ${formattaData(mi.inizio)} – ${formattaData(mi.fine)} · ${mi.volumeTargetMetri.toLocaleString('it-IT')}m`}
                  className={`absolute top-0 h-4 rounded-sm ${m.solid}`}
                  style={{ left: pos(stagione.inizio, mi.inizio), width: w }}
                  aria-label={m.label}
                />
              );
            })}
          </div>

          {/* Gare */}
          <div className="relative h-6">
            {gareOrdinati.map(g => {
              const x = pos(stagione.inizio, g.dal);
              return (
                <span
                  key={g.id}
                  title={`${g.nome} · ${formattaData(g.dal)}${g.prioritaria ? ' · A-race' : ''}`}
                  className={`absolute top-0 flex items-center justify-center ${g.prioritaria ? 'text-tertiary' : 'text-on-surface-variant'}`}
                  style={{ left: x - 8 }}
                >
                  <Flag size={g.prioritaria ? 15 : 12} fill={g.prioritaria ? 'currentColor' : 'none'} />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Grafico volume settimanale con soglie +10% / +20%                   */
/* ------------------------------------------------------------------ */

export interface GraficoVolumeProps {
  micro: Microciclo[];
}

/**
 * Barre del volume target settimanale (microcicli). Le settimane di CARICO
 * che superano +10% / +20% il volume per seduta della settimana di carico
 * precedente (stessa regola di PianoValidator) sono evidenziate.
 */
export const GraficoVolumeSettimane: React.FC<GraficoVolumeProps> = ({ micro }) => {
  const settimane = useMemo(() => {
    const ordinate = [...micro].sort((a, b) => a.inizio.localeCompare(b.inizio));
    const max = Math.max(1, ...ordinate.map(m => m.volumeTargetMetri));
    // Prima passata: flag di incremento con la stessa regola di PianoValidator.
    const flagPerMicro = new Map<number, { flag: 'ok' | 'attenzione' | 'errore'; delta: number | null }>();
    let riferimento: Microciclo | null = null;
    for (const m of ordinate) {
      let flag: 'ok' | 'attenzione' | 'errore' = 'ok';
      let delta: number | null = null;
      if (m.tipo === 'CARICO' && riferimento && riferimento.sedutePreviste > 0 && m.sedutePreviste > 0) {
        const prima = riferimento.volumeTargetMetri / riferimento.sedutePreviste;
        const ora = m.volumeTargetMetri / m.sedutePreviste;
        if (prima > 0) {
          const inc = (ora - prima) / prima;
          delta = Math.round(inc * 100);
          if (inc > 0.20) flag = 'errore';
          else if (inc > 0.10) flag = 'attenzione';
        }
      }
      flagPerMicro.set(m.id, { flag, delta });
      if (m.tipo === 'CARICO') riferimento = m;
    }
    return ordinate.map((m, i) => {
      const { flag, delta } = flagPerMicro.get(m.id) ?? { flag: 'ok' as const, delta: null };
      return {
        micro: m,
        indice: i,
        flag,
        delta,
        h: Math.max(6, Math.round((m.volumeTargetMetri / max) * 96)),
        colore: microSemantica(m.tipo).solid,
      };
    });
  }, [micro]);

  if (settimane.length === 0) return null;

  return (
    <div className="ds-card p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Volume settimanale</h3>
        <div className="flex items-center gap-2 font-label-caps text-[12px] uppercase text-on-surface-variant">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-acwr-attenzione" /> +10%</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-acwr-critico" /> +20%</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-28 pt-1">
        {settimane.map(s => (
          <div key={s.micro.id} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            {s.delta != null && s.delta > 10 && (
              <span className={`font-label-caps text-[12px] font-bold leading-none mb-0.5 ${s.flag === 'errore' ? 'text-acwr-critico' : 'text-acwr-attenzione'}`}>
                +{s.delta}%
              </span>
            )}
            <div
              className={`w-full rounded-t ${s.colore} ${s.flag === 'errore' ? 'ring-2 ring-acwr-critico' : s.flag === 'attenzione' ? 'ring-2 ring-acwr-attenzione' : ''}`}
              style={{ height: s.h }}
              title={`S${s.indice + 1} · ${microSemantica(s.micro.tipo).label} · ${formattaData(s.micro.inizio)} · ${s.micro.volumeTargetMetri.toLocaleString('it-IT')}m`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {settimane.map(s => (
          <span key={s.micro.id} className="flex-1 text-center font-label-caps text-[12px] text-on-surface-variant leading-none">
            S{s.indice + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
