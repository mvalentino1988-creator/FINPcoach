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
      <div className="print-area bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006874] text-white flex items-center justify-center shadow-sm">
              <Waves size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg sm:text-xl leading-tight">
                {scheda.titolo}
              </h2>
              <div className="text-xs text-slate-500 font-medium">
                {scheda.data ? `Seduta del ${formattaData(scheda.data)} · ` : ''}
                {scheda.volumeTotaleMetri} m · {FASE_MESOCICLO_LABEL[scheda.faseStagione]}
              </div>
            </div>
          </div>
          <button
            onClick={onChiudi}
            className="no-print p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-cyan-50/60 rounded-xl border border-cyan-100 text-cyan-950">
            <div>
              <span className="text-xs text-cyan-800 font-semibold block">Volume Target</span>
              <span className="text-lg font-black text-[#006874]">{scheda.volumeTotaleMetri} m</span>
            </div>
            <div>
              <span className="text-xs text-cyan-800 font-semibold block">Fase & Microciclo</span>
              <span className="text-xs font-bold leading-tight block mt-0.5">
                {FASE_MESOCICLO_LABEL[scheda.faseStagione]} ({TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})
              </span>
            </div>
            {scheda.categoriaEta && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs text-cyan-800 font-semibold block">Categoria</span>
                <span className="text-xs font-semibold">{scheda.categoriaEta}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Copy & Print */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#006874] hover:bg-[#004f58] text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-sm"
            >
              {copiato ? <Check size={17} className="text-emerald-300" /> : <Copy size={17} />}
              <span>{copiato ? 'Copiato!' : 'Copia per WhatsApp / Deck'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition border border-slate-200"
            >
              <Printer size={17} className="text-[#006874]" />
              <span>Stampa Scheda Bordo Vasca</span>
            </button>
          </div>

          {/* Medical Alerts */}
          {scheda.avvertenzeMediche.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <HeartPulse size={16} className="text-rose-600" />
                Adattamenti per Condizione Medica
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-800">
                {scheda.avvertenzeMediche.map((avv, i) => (
                  <li key={i}>{avv}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Age Physiological Adaptations */}
          {scheda.adattamentiEta.length > 0 && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} className="text-indigo-600" />
                Modifiche Fisiologiche / Età
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-indigo-800">
                {scheda.adattamentiEta.map((ad, i) => (
                  <li key={i}>{ad}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Calibration on Race Times */}
          {scheda.noteCalibrazione.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Timer size={16} className="text-amber-600" />
                Calibrazione sui Tempi dell'Atleta
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                {scheda.noteCalibrazione.map((nota, i) => (
                  <li key={i}>{nota}</li>
                ))}
              </ul>
              {scheda.tempiUtilizzati.length > 0 && (
                <div className="pt-2 border-t border-amber-200 text-xs text-amber-900">
                  <span className="font-semibold">Tempi utilizzati: </span>
                  {scheda.tempiUtilizzati.map(t => (
                    `${t.stile.replace('_', ' ')} ${t.distanzaMetri}m (${formattaTempo(t.centesimi)})`
                  )).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Energy Zones Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Distribuzione Zone Energetiche (A1 – D)
            </h4>
            <IndicatoreCodici
              ripartizione={scheda.ripartizioneCodici}
              volumeTotale={scheda.volumeTotaleMetri}
            />
          </div>

          {/* Session Sets (Poolside) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Serie d'Allenamento per Bordo Vasca
            </h4>
            <div className="space-y-2.5">
              {scheda.tratti.map((tratto, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {i + 1}. {tratto.sezione}
                    </span>
                    <BadgeCodice codice={tratto.codice} />
                  </div>

                  <div className="text-[#006874] font-black text-sm">
                    {tratto.ripetizioni} · <span className="text-slate-500 font-semibold">{tratto.metri} m</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{tratto.descrizione}</p>

                  {tratto.ripartenza && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <span>⏱️ Ripartenza / Recupero:</span>
                      <span>{tratto.ripartenza}</span>
                    </div>
                  )}

                  {tratto.notaSpecifica && (
                    <div className="text-[11px] text-slate-500 font-medium italic">
                      • Focus: {tratto.notaSpecifica}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onChiudi}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl text-sm transition"
          >
            Chiudi e torna in vasca
          </button>
        </div>
      </div>
    </div>
  );
};
