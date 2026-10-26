import React, { useState } from 'react';
import { FASE_MESOCICLO_LABEL, SchedaSeduta, TIPO_MICROCICLO_LABEL } from '../types';
import { formattaData } from '../domain/dateUtils';
import { formattaTempo } from '../domain/tempoUtils';
import { BadgeCodice } from './BadgeCodice';
import { IndicatoreCodici } from './IndicatoreCodici';
import { Check, Copy, Flame, HeartPulse, Printer, Sparkles, Timer, Waves, X } from 'lucide-react';

interface Props {
  scheda: SchedaSeduta;
  onChiudi: () => void;
}

export const SchedaSedutaModal: React.FC<Props> = ({ scheda, onChiudi }) => {
  const [copiato, setCopiato] = useState(false);

  const testoCopiabile = () => {
    const lines: string[] = [];
    lines.push(`🏊‍♂️ ${scheda.titolo}`);
    if (scheda.data) lines.push(`📅 Data: ${formattaData(scheda.data)}`);
    lines.push(`📊 Volume Totale: ${scheda.volumeTotaleMetri} m`);
    lines.push(`🎯 Fase: ${FASE_MESOCICLO_LABEL[scheda.faseStagione]} (${TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})`);
    if (scheda.categoriaEta) lines.push(`👤 Categoria: ${scheda.categoriaEta}`);
    lines.push('');

    if (scheda.avvertenzeMediche.length > 0) {
      lines.push('⚠️ ADATTAMENTI MEDICI:');
      scheda.avvertenzeMediche.forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }

    lines.push('📋 SERIE D\'ALLENAMENTO BORDO VASCA:');
    scheda.tratti.forEach((t, i) => {
      lines.push(`${i + 1}. [${t.codice}] ${t.sezione} - ${t.ripetizioni} (${t.metri}m)`);
      lines.push(`   ${t.descrizione}`);
      if (t.ripartenza) lines.push(`   ⏱️ Ripartenza: ${t.ripartenza}`);
      if (t.notaSpecifica) lines.push(`   • Focus: ${t.notaSpecifica}`);
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(testoCopiabile());
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="print-area bg-surface-container-lowest rounded-xl shadow-float max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200/70">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/70 flex items-center justify-between shrink-0 bg-surface-container-low rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-card">
              <Waves size={22} />
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-lg sm:text-xl leading-tight">
                {scheda.titolo}
              </h2>
              <div className="text-xs text-on-surface-variant font-medium">
                {scheda.data ? `Seduta del ${formattaData(scheda.data)} · ` : ''}
                {scheda.volumeTotaleMetri} m · {FASE_MESOCICLO_LABEL[scheda.faseStagione]}
              </div>
            </div>
          </div>
          <button
            onClick={onChiudi}
            className="no-print p-1.5 text-on-surface-variant hover:text-on-surface-variant rounded-lg hover:bg-surface-container-high transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm flex-1 min-h-0">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-surface-container-low/60 rounded-xl border border-primary-fixed-dim text-cyan-950">
            <div>
              <span className="text-xs text-primary font-semibold block">Volume Target</span>
              <span className="text-lg font-bold text-primary-container">{scheda.volumeTotaleMetri} m</span>
            </div>
            <div>
              <span className="text-xs text-primary font-semibold block">Fase & Microciclo</span>
              <span className="text-xs font-bold leading-tight block mt-0.5">
                {FASE_MESOCICLO_LABEL[scheda.faseStagione]} ({TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})
              </span>
            </div>
            {scheda.categoriaEta && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs text-primary font-semibold block">Categoria</span>
                <span className="text-xs font-semibold">{scheda.categoriaEta}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Copy & Print */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 h-12 px-4 bg-primary-container hover:bg-primary text-on-primary font-semibold rounded-xl text-xs sm:text-sm transition shadow-card"
            >
              {copiato ? <Check size={17} className="text-emerald-300" /> : <Copy size={17} />}
              <span>{copiato ? 'Copiato!' : 'Copia per WhatsApp / Deck'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 h-12 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-xl text-xs sm:text-sm transition border border-slate-200/70"
            >
              <Printer size={17} className="text-primary-container" />
              <span>Stampa Scheda Bordo Vasca</span>
            </button>
          </div>

          {/* Medical Alerts */}
          {scheda.avvertenzeMediche.length > 0 && (
            <div className="p-3.5 bg-error-container border border-error/40 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-on-error-container font-bold text-xs uppercase tracking-wider">
                <HeartPulse size={16} className="text-error" />
                Adattamenti per Condizione Medica
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-on-error-container">
                {scheda.avvertenzeMediche.map((avv, i) => (
                  <li key={i}>{avv}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Age Physiological Adaptations */}
          {scheda.adattamentiEta.length > 0 && (
            <div className="p-3.5 bg-surface-container-low border border-outline-variant rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-on-surface font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} className="text-secondary" />
                Modifiche Fisiologiche / Età
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-on-surface">
                {scheda.adattamentiEta.map((ad, i) => (
                  <li key={i}>{ad}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Calibration on Race Times */}
          {scheda.noteCalibrazione.length > 0 && (
            <div className="p-3.5 bg-surface-container-low border border-tertiary-fixed-dim rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-on-tertiary-fixed font-bold text-xs uppercase tracking-wider">
                <Timer size={16} className="text-tertiary-container" />
                Calibrazione sui Tempi dell'Atleta
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-on-tertiary-fixed">
                {scheda.noteCalibrazione.map((nota, i) => (
                  <li key={i}>{nota}</li>
                ))}
              </ul>
              {scheda.tempiUtilizzati.length > 0 && (
                <div className="pt-2 border-t border-tertiary-fixed-dim text-xs text-on-tertiary-fixed">
                  <span className="font-semibold">Tempi utilizzati: </span>
                  {scheda.tempiUtilizzati.map(t => (
                    `${t.stile.replace('_', ' ')} ${t.distanzaMetri}m (${formattaTempo(t.centesimi)})`
                  )).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Energy Zones Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-200/70">
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Distribuzione Zone Energetiche (A1 – D)
            </h4>
            <IndicatoreCodici
              ripartizione={scheda.ripartizioneCodici}
              volumeTotale={scheda.volumeTotaleMetri}
            />
          </div>

          {/* Session Sets (Poolside) */}
          <div className="space-y-3 pt-2 border-t border-slate-200/70">
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Serie d'Allenamento per Bordo Vasca
            </h4>
            <div className="space-y-2.5">
              {scheda.tratti.map((tratto, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200/70 bg-surface-container-low/50 hover:bg-surface-container-low transition space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-on-surface text-sm">
                      {i + 1}. {tratto.sezione}
                    </span>
                    <BadgeCodice codice={tratto.codice} />
                  </div>

                  <div className="text-primary-container font-bold text-sm">
                    {tratto.ripetizioni} · <span className="text-on-surface-variant font-semibold">{tratto.metri} m</span>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">{tratto.descrizione}</p>

                  {tratto.ripartenza && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-fixed bg-surface-container-low px-2 py-0.5 rounded-md border border-tertiary-fixed-dim">
                      <span>⏱️ Ripartenza / Recupero:</span>
                      <span>{tratto.ripartenza}</span>
                    </div>
                  )}

                  {tratto.notaSpecifica && (
                    <div className="text-[11px] text-on-surface-variant font-medium italic">
                      • Focus: {tratto.notaSpecifica}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/70 flex justify-end shrink-0 bg-surface-container-low rounded-b-2xl">
          <button
            onClick={onChiudi}
            className="px-5 h-12 bg-surface-container-high hover:bg-surface-container-highest font-bold text-on-surface rounded-xl text-sm transition"
          >
            Chiudi e torna in vasca
          </button>
        </div>
      </div>
    </div>
  );
};
