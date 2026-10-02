import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { FASE_MESOCICLO_LABEL, SchedaSeduta, TIPO_MICROCICLO_LABEL } from '../types';
import { formattaData, isBefore, parseData, todayISO } from '../domain/dateUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { BadgeCodice } from './BadgeCodice';
import { IndicatoreCodici } from './IndicatoreCodici';
import {
  Calendar,
  Check,
  Copy,
  Flame,
  HeartPulse,
  List,
  Sparkles,
  Timer,
  User,
  Users,
  Waves
} from 'lucide-react';

export const SchedeVascaScreen: React.FC = () => {
  const { atleti, condizioni, assenze, meso, micro, tempi, log } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(null); // null = Tutta la Squadra
  const [dataTesto, setDataTesto] = useState<string>(formattaData(todayISO()));
  const [metriManual, setMetriManual] = useState<string>('1800');
  const [copiato, setCopiato] = useState(false);

  const oggi = parseData(dataTesto) ?? todayISO();
  const atletaSel = atleti.find(a => a.id === atletaSelId) ?? null;

  const microCorrente = micro.find(m => !isBefore(oggi, m.inizio) && !isBefore(m.fine, oggi)) ?? micro[0];
  const mesoCorrente = microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) : null;

  const volumeCalcolato = useMemo(() => {
    if (atletaSel && microCorrente) {
      const volumeSett = VolumeIndividuale.settimana(
        microCorrente,
        atletaSel,
        assenze.filter(a => a.atletaId === atletaSel.id)
      ).metri;
      const sedute = Math.max(1, microCorrente.sedutePreviste);
      return Math.round(volumeSett / sedute);
    }
    const val = parseInt(metriManual, 10);
    return isNaN(val) ? 1800 : Math.max(400, Math.min(10000, val));
  }, [atletaSel, microCorrente, assenze, metriManual]);

  const tempiAtleta = useMemo(() => {
    return atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [];
  }, [atletaSel, tempi]);

  const logAtleta = useMemo(() => {
    return atletaSel ? log.filter(l => l.atletaId === atletaSel.id) : [];
  }, [atletaSel, log]);

  const condizioniAtleta = useMemo(() => {
    return atletaSel ? condizioni.filter(c => c.atletaId === atletaSel.id) : [];
  }, [atletaSel, condizioni]);

  const scheda: SchedaSeduta = useMemo(() => {
    return GeneratoreSmartSeduta.genera(
      oggi,
      volumeCalcolato,
      mesoCorrente?.fase ?? 'PREPARAZIONE_SPECIFICA',
      microCorrente?.tipo ?? 'CARICO',
      atletaSel,
      condizioniAtleta,
      tempiAtleta,
      logAtleta,
      mesoCorrente
    );
  }, [oggi, volumeCalcolato, atletaSel, condizioniAtleta, tempiAtleta, logAtleta, mesoCorrente, microCorrente]);

  const handleCopy = () => {
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

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Title & Info */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Waves size={22} className="text-[#006874]" />
          <span>Schede Allenamento Bordo Vasca</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generatore intelligente di sedute basato sulla fase agonistica del piano, età, patologie ed andature con ripartenze a 5 secondi.
        </p>
      </div>

      {/* Configuration bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Recipient Chips */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Destinatario della Scheda
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAtletaSelId(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                atletaSelId === null
                  ? 'bg-[#006874] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users size={14} />
              <span>Tutta la Squadra</span>
            </button>

            {atleti.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAtletaSelId(a.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  atletaSelId === a.id
                    ? 'bg-[#006874] text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <User size={14} />
                <span>{a.cognome} {a.nome}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date and Target Distance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Data Allenamento</label>
            <input
              type="text"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {atletaSel
                ? `Volume Calcolato per Atleta (da piano ${Math.round(atletaSel.fattoreVolume * 100)}%)`
                : 'Metri Target Squadra (m)'}
            </label>
            {atletaSel ? (
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-[#006874] text-sm">
                {volumeCalcolato} m
              </div>
            ) : (
              <input
                type="number"
                step="50"
                value={metriManual}
                onChange={e => setMetriManual(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-[#006874] text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Visualizzatore Scheda Vasca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
        {/* Intestazione */}
        <div className="p-4 sm:p-5 bg-cyan-50/70 border border-cyan-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006874]" />
              <h3 className="font-black text-slate-800 text-lg sm:text-xl">
                {scheda.titolo}
              </h3>
            </div>
            <div className="text-xs text-slate-600 font-medium mt-1">
              Volume Totale: <strong className="text-[#006874] text-sm font-black">{scheda.volumeTotaleMetri} m</strong> · Fase:{' '}
              {FASE_MESOCICLO_LABEL[scheda.faseStagione]} ({TIPO_MICROCICLO_LABEL[scheda.tipoMicrociclo]})
              {scheda.categoriaEta && ` · Categoria: ${scheda.categoriaEta}`}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 bg-[#006874] hover:bg-[#004f58] text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            {copiato ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
            <span>{copiato ? 'Copiato!' : 'Copia per WhatsApp / Bordo Vasca'}</span>
          </button>
        </div>

        {/* Medical & Physiological Alerts */}
        {scheda.avvertenzeMediche.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-rose-900 font-bold uppercase tracking-wider">
              <HeartPulse size={15} className="text-rose-600" />
              <span>Adattamenti per Condizione Medica</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-800 font-medium">
              {scheda.avvertenzeMediche.map((avv, i) => (
                <li key={i}>{avv}</li>
              ))}
            </ul>
          </div>
        )}

        {scheda.adattamentiEta.length > 0 && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold uppercase tracking-wider">
              <Sparkles size={15} className="text-indigo-600" />
              <span>Modifiche Fisiologiche / Età</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-indigo-800 font-medium">
              {scheda.adattamentiEta.map((ad, i) => (
                <li key={i}>{ad}</li>
              ))}
            </ul>
          </div>
        )}

        {scheda.noteCalibrazione.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold uppercase tracking-wider">
              <Timer size={15} className="text-amber-600" />
              <span>Calibrazione sui Tempi</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-medium">
              {scheda.noteCalibrazione.map((nota, i) => (
                <li key={i}>{nota}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Energy Zones Breakdown */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Flame size={15} className="text-[#006874]" />
            <span>Zone Energetiche della Seduta (A1 – D)</span>
          </h4>
          <IndicatoreCodici
            ripartizione={scheda.ripartizioneCodici}
            volumeTotale={scheda.volumeTotaleMetri}
          />
        </div>

        {/* Detailed Sets */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <List size={15} className="text-[#006874]" />
            <span>Dettaglio Serie per Bordo Vasca</span>
          </h4>

          <div className="space-y-2.5">
            {scheda.tratti.map((tratto, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-sm">
                    {idx + 1}. {tratto.sezione}
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
    </div>
  );
};
