import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  DayOfWeekNum,
  DAY_OF_WEEK_NAMES,
  FaseMesociclo,
  FASE_MESOCICLO_LABEL,
  Microciclo,
  SchedaSeduta,
  TipoMicrociclo,
  TIPO_MICROCICLO_LABEL
} from '../types';
import { formattaData, parseData, todayISO, isBefore } from '../domain/dateUtils';
import { AutoPianificatore } from '../domain/autoPianificatore';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { IndicatoreCodici } from './IndicatoreCodici';
import { ElencoAvvisi } from './ElencoAvvisi';
import { SchedaSedutaModal } from './SchedaSedutaModal';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Unlock,
  Waves,
  X
} from 'lucide-react';

export const PianoScreen: React.FC = () => {
  const {
    stagione,
    chiusure,
    gare,
    macro,
    meso,
    micro,
    avvisiPiano,
    impostazioni,
    parametriEffettivi,
    creaStagione,
    eliminaStagione,
    aggiungiChiusura,
    eliminaChiusura,
    aggiungiFestivitaNazionali,
    aggiungiGara,
    eliminaGara,
    salvaImpostazioni,
    rigeneraPianoCompleto,
    modificaMicro,
    sbloccaMicro
  } = useApp();

  const [chiusureEspanso, setChiusureEspanso] = useState(false);
  const [microSelezionato, setMicroSelezionato] = useState<Microciclo | null>(null);
  const [schedaSmart, setSchedaSmart] = useState<SchedaSeduta | null>(null);

  // Form nuova stagione
  const oggi = todayISO();
  const [inizioStagione, setInizioStagione] = useState(formattaData(AutoPianificatore.inizioStagioneSuggerito(oggi)));
  const inizioParsed = parseData(inizioStagione);
  const fineSuggerita = inizioParsed ? AutoPianificatore.fineStagioneSuggerita(inizioParsed) : null;
  const [fineStagione, setFineStagione] = useState('');
  const fineEffettiva = fineStagione.trim() ? parseData(fineStagione) : fineSuggerita;
  const [nomeStagione, setNomeStagione] = useState('');
  const nomeAuto = inizioParsed && fineEffettiva ? AutoPianificatore.nomeStagione(inizioParsed, fineEffettiva) : '';
  const nomeEffettivo = nomeStagione.trim() || nomeAuto;

  // Form nuova chiusura
  const [cDal, setCDal] = useState('');
  const [cAl, setCAl] = useState('');
  const [cMotivo, setCMotivo] = useState('');

  // Form nuova gara
  const [gNome, setGNome] = useState('');
  const [gDal, setGDal] = useState('');
  const [gAl, setGAl] = useState('');
  const [gPrioManuale, setGPrioManuale] = useState<boolean | null>(null);
  const gPrioritaria = gPrioManuale ?? AutoPianificatore.garaProbabilmentePrioritaria(gNome);

  // Settings inputs
  const [metriTxt, setMetriTxt] = useState(impostazioni.metriBaseSeduta?.toString() ?? '');
  const [macroTxt, setMacroTxt] = useState(impostazioni.numeroMacrocicli?.toString() ?? '');
  const [cicloTxt, setCicloTxt] = useState(impostazioni.settimaneCicloCarico?.toString() ?? '');

  if (!stagione) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Nuova Stagione Agonistica FINP</h2>
          <p className="text-xs text-slate-500 mt-1">
            Basta inserire la data di inizio: nome, fine stagione, festività nazionali e piano di carico
            vengono creati in automatico in base alla metodologia paralimpica.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Inizio stagione (gg/mm/aaaa) *</label>
            <input
              type="text"
              value={inizioStagione}
              onChange={e => setInizioStagione(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fine stagione (auto)</label>
            <input
              type="text"
              placeholder={fineSuggerita ? formattaData(fineSuggerita) : 'gg/mm/aaaa'}
              value={fineStagione}
              onChange={e => setFineStagione(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome stagione (auto)</label>
            <input
              type="text"
              placeholder={nomeAuto}
              value={nomeStagione}
              onChange={e => setNomeStagione(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl border-slate-300 font-semibold"
            />
          </div>

          <button
            onClick={() => {
              if (inizioParsed && fineEffettiva && inizioParsed < fineEffettiva) {
                creaStagione(nomeEffettivo, inizioParsed, fineEffettiva);
              }
            }}
            disabled={!inizioParsed || !fineEffettiva || inizioParsed >= fineEffettiva}
            className="w-full py-2.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-sm mt-2"
          >
            Crea Stagione e Genera Piano
          </button>
        </div>
      </div>
    );
  }

  const volumeMax = micro.length > 0 ? Math.max(...micro.map(m => m.volumeTargetMetri)) : 0;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#006874] to-[#004f58] text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-cyan-200 font-bold block">
            Stagione Agonistica FINP
          </span>
          <h2 className="text-xl sm:text-2xl font-black">{stagione.nome}</h2>
          <p className="text-xs text-cyan-100 font-medium mt-0.5">
            {formattaData(stagione.inizio)} – {formattaData(stagione.fine)} · Vasca da {stagione.vascaMetri} m
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Eliminare la stagione? Verranno eliminati chiusure, gare e piano. Gli atleti restano salvati.')) {
              eliminaStagione();
            }
          }}
          className="self-start sm:self-center px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition"
        >
          Elimina stagione
        </button>
      </div>

      {/* Expandable Chiusure & Festività */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 transition shadow-xs">
        <button
          type="button"
          onClick={() => setChiusureEspanso(!chiusureEspanso)}
          className="w-full flex items-center justify-between font-bold text-slate-800 text-sm"
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[#006874]" />
            <span>Chiusure e Festività ({chiusure.length} registrate)</span>
          </div>
          {chiusureEspanso ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {chiusureEspanso && (
          <div className="pt-4 mt-3 border-t border-slate-100 space-y-3 text-xs">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={aggiungiFestivitaNazionali}
                className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-[#006874] border border-cyan-200 rounded-lg font-bold"
              >
                + Aggiungi Festività Nazionali Italiane
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {chiusure.map(c => (
                <div
                  key={c.id}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <span>
                    {c.dal === c.al ? formattaData(c.dal) : `${formattaData(c.dal)} – ${formattaData(c.al)}`}:{' '}
                    <strong className="text-slate-800">{c.motivo}</strong>
                  </span>
                  <button
                    onClick={() => eliminaChiusura(c.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Closure */}
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Dal (gg/mm/aaaa)"
                  value={cDal}
                  onChange={e => setCDal(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Al (gg/mm/aaaa)"
                  value={cAl}
                  onChange={e => setCAl(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="Motivo (es. Chiusura natalizia impianto, festa patronale...)"
                value={cMotivo}
                onChange={e => setCMotivo(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  const d1 = parseData(cDal);
                  const d2 = parseData(cAl) ?? d1;
                  if (d1 && d2 && cMotivo.trim()) {
                    aggiungiChiusura(d1, d2, cMotivo.trim());
                    setCDal('');
                    setCAl('');
                    setCMotivo('');
                  }
                }}
                className="w-full py-1.5 bg-[#006874] hover:bg-[#004f58] text-white rounded-lg font-bold"
              >
                Aggiungi Chiusura Vasca
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gare Agonistiche */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 transition shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <span>Gare Agonistiche ({gare.length})</span>
          </h3>
        </div>

        <div className="space-y-1.5">
          {gare.length === 0 ? (
            <p className="text-xs text-slate-400">Nessuna gara inserita nel calendario.</p>
          ) : (
            gare.map(g => (
              <div
                key={g.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {g.prioritaria && <Star size={16} className="text-amber-500 fill-amber-500 shrink-0" />}
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {g.nome} {g.prioritaria && <span className="text-amber-700 font-semibold">(A-Race Prioritaria)</span>}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {formattaData(g.dal)}{g.al && g.al !== g.dal ? ` – ${formattaData(g.al)}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => eliminaGara(g.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Form add race */}
        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2 text-xs">
          <input
            type="text"
            placeholder="Nome gara (es. Campionati Italiani Assoluti FINP...)"
            value={gNome}
            onChange={e => setGNome(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Inizio (gg/mm/aaaa)"
              value={gDal}
              onChange={e => setGDal(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Fine (opzionale)"
              value={gAl}
              onChange={e => setGAl(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={gPrioritaria}
              onChange={e => setGPrioManuale(e.target.checked)}
              className="w-4 h-4 accent-[#006874] rounded"
            />
            <span>Gara prioritaria (A-Race: attiva picco e scarico pre-gara)</span>
          </label>
          <button
            type="button"
            disabled={!gNome.trim() || !parseData(gDal)}
            onClick={() => {
              const d1 = parseData(gDal);
              const d2 = parseData(gAl) ?? d1;
              if (d1 && d2) {
                aggiungiGara(gNome.trim(), d1, d2, gPrioritaria);
                setGNome('');
                setGDal('');
                setGAl('');
                setGPrioManuale(null);
              }
            }}
            className="w-full py-1.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white rounded-lg font-bold"
          >
            Aggiungi Gara
          </button>
        </div>
      </div>

      {/* Piano Automatico Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 transition shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-[#006874]" />
            <span>Parametri Auto-Pianificatore FINP</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Il piano si adatta automaticamente all'età media, ai dati storici di carico e alle gare.
            I campi lasciati vuoti usano il calcolo intelligente.
          </p>
        </div>

        {/* Days of week selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Giorni di Allenamento Settimanali{' '}
            <span className="font-normal text-slate-500">
              {impostazioni.giorni == null ? '(attualmente automatici)' : '(impostati a mano)'}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => salvaImpostazioni({ ...impostazioni, giorni: undefined })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                impostazioni.giorni == null
                  ? 'bg-[#006874] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Auto
            </button>
            {([1, 2, 3, 4, 5, 6, 7] as DayOfWeekNum[]).map(dow => {
              const active = parametriEffettivi.giorniAllenamento.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => {
                    const current = parametriEffettivi.giorniAllenamento;
                    const next = active ? current.filter(d => d !== dow) : [...current, dow];
                    salvaImpostazioni({
                      ...impostazioni,
                      giorni: next.length > 0 ? (next.sort((a, b) => a - b) as DayOfWeekNum[]) : undefined
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    active ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {DAY_OF_WEEK_NAMES[dow]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Metri base seduta (auto {parametriEffettivi.metriBaseSeduta}m)
            </label>
            <input
              type="number"
              placeholder={`Auto: ${parametriEffettivi.metriBaseSeduta}`}
              value={metriTxt}
              onChange={e => setMetriTxt(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Macrocicli (auto {parametriEffettivi.numeroMacrocicli})
            </label>
            <input
              type="number"
              placeholder={`Auto: ${parametriEffettivi.numeroMacrocicli}`}
              value={macroTxt}
              onChange={e => setMacroTxt(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Scarico ogni N sett. (auto {parametriEffettivi.settimaneCicloCarico})
            </label>
            <input
              type="number"
              placeholder={`Auto: ${parametriEffettivi.settimaneCicloCarico}`}
              value={cicloTxt}
              onChange={e => setCicloTxt(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              salvaImpostazioni({
                ...impostazioni,
                metriBaseSeduta: metriTxt.trim() ? parseInt(metriTxt, 10) : undefined,
                numeroMacrocicli: macroTxt.trim() ? parseInt(macroTxt, 10) : undefined,
                settimaneCicloCarico: cicloTxt.trim() ? parseInt(cicloTxt, 10) : undefined
              });
            }}
            className="px-4 py-2 bg-[#006874] hover:bg-[#004f58] text-white font-bold rounded-xl text-xs transition"
          >
            Salva Impostazioni
          </button>
          <button
            type="button"
            onClick={rigeneraPianoCompleto}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            <RefreshCw size={14} />
            <span>Rigenera Piano Ora</span>
          </button>
        </div>
      </div>

      {/* Plan Warnings */}
      {avvisiPiano.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Controlli sul Piano di Carico
          </h3>
          <ElencoAvvisi avvisi={avvisiPiano} />
        </div>
      )}

      {/* Macro / Meso / Microcycles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base tracking-tight">
            Programmazione e Microcicli
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {micro.length} settimane totali
          </span>
        </div>

        {macro.map(ma => {
          const mesoOfMacro = meso.filter(me => me.macrocicloId === ma.id);
          return (
            <div key={ma.id} className="space-y-3">
              <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-black text-slate-800 text-sm">{ma.nome}</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {formattaData(ma.inizio)} – {formattaData(ma.fine)}
                  </span>
                </div>
                {ma.obiettivo && (
                  <span className="text-xs font-semibold text-[#006874]">{ma.obiettivo}</span>
                )}
              </div>

              {mesoOfMacro.map(me => {
                const microOfMeso = micro.filter(mi => mi.mesocicloId === me.id);
                return (
                  <div key={me.id} className="pl-2 sm:pl-4 space-y-2 border-l-2 border-cyan-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900">
                        {FASE_MESOCICLO_LABEL[me.fase]}
                      </span>
                      <span>
                        {formattaData(me.inizio)} – {formattaData(me.fine)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {microOfMeso.map(mi => {
                        const gareInSettimana = gare.filter(
                          g => !isBefore(mi.fine, g.dal) && !isBefore(g.al, mi.inizio)
                        );
                        const metriSeduta = mi.sedutePreviste > 0 ? Math.round(mi.volumeTargetMetri / mi.sedutePreviste) : 1800;
                        const schedaAnteprima = GeneratoreSmartSeduta.genera(
                          mi.inizio,
                          metriSeduta,
                          me.fase,
                          mi.tipo
                        );

                        let cardBg = 'bg-white border-slate-200';
                        if (mi.tipo === 'CARICO') cardBg = 'bg-cyan-50/40 border-cyan-200';
                        else if (mi.tipo === 'GARA') cardBg = 'bg-amber-50/50 border-amber-200';
                        else if (mi.tipo === 'SCARICO' || mi.tipo === 'RECUPERO') cardBg = 'bg-indigo-50/40 border-indigo-200';

                        return (
                          <div
                            key={mi.id}
                            className={`p-3.5 rounded-xl border transition shadow-xs flex flex-col justify-between space-y-2 ${cardBg}`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 text-sm">
                                    {formattaData(mi.inizio)}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/80 border border-slate-200 text-slate-700">
                                    {TIPO_MICROCICLO_LABEL[mi.tipo]}
                                  </span>
                                  {mi.bloccato && (
                                    <span title="Bloccato a mano">
                                      <Lock size={14} className="text-amber-600" />
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSchedaSmart(schedaAnteprima)}
                                  className="text-[11px] font-bold text-[#006874] hover:underline flex items-center gap-1"
                                >
                                  <Waves size={13} />
                                  <span>Scheda Smart</span>
                                </button>
                              </div>

                              <div className="text-xs text-slate-600 flex items-center justify-between">
                                <span>{mi.sedutePreviste} sedute previste</span>
                                <span className="font-black text-[#006874] text-sm">
                                  {mi.volumeTargetMetri} m
                                </span>
                              </div>

                              {/* Progress bar compared to max volume */}
                              {volumeMax > 0 && (
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#006874] rounded-full"
                                    style={{ width: `${(mi.volumeTargetMetri / volumeMax) * 100}%` }}
                                  />
                                </div>
                              )}

                              {/* Energy codes preview */}
                              <IndicatoreCodici
                                ripartizione={schedaAnteprima.ripartizioneCodici}
                                volumeTotale={schedaAnteprima.volumeTotaleMetri}
                              />

                              {gareInSettimana.map(g => (
                                <div key={g.id} className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                  <Trophy size={13} />
                                  <span>Gara: {g.nome} {g.prioritaria ? '⭐' : ''}</span>
                                </div>
                              ))}

                              {mi.note && (
                                <p className="text-[11px] text-slate-500 italic">{mi.note}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setMicroSelezionato(mi)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold pt-1 border-t border-slate-100 flex items-center justify-between w-full"
                            >
                              <span>Modifica microciclo</span>
                              <Edit2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Edit Microcycle Modal */}
      {microSelezionato && (
        <ModalModificaMicro
          micro={microSelezionato}
          onChiudi={() => setMicroSelezionato(null)}
          onSalva={agg => {
            modificaMicro(agg);
            setMicroSelezionato(null);
          }}
          onSblocca={m => {
            sbloccaMicro(m);
            setMicroSelezionato(null);
          }}
        />
      )}

      {/* Smart Poolside Session Modal */}
      {schedaSmart && (
        <SchedaSedutaModal
          scheda={schedaSmart}
          onChiudi={() => setSchedaSmart(null)}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Submodal Modifica Microciclo
interface ModalModificaMicroProps {
  micro: Microciclo;
  onChiudi: () => void;
  onSalva: (micro: Microciclo) => void;
  onSblocca: (micro: Microciclo) => void;
}

const ModalModificaMicro: React.FC<ModalModificaMicroProps> = ({
  micro,
  onChiudi,
  onSalva,
  onSblocca
}) => {
  const [tipo, setTipo] = useState<TipoMicrociclo>(micro.tipo);
  const [sedute, setSedute] = useState(micro.sedutePreviste.toString());
  const [metri, setMetri] = useState(micro.volumeTargetMetri.toString());
  const [note, setNote] = useState(micro.note);

  const seduteInt = parseInt(sedute, 10);
  const metriInt = parseInt(metri, 10);
  const valido = !isNaN(seduteInt) && seduteInt >= 0 && seduteInt <= 14 && !isNaN(metriInt) && metriInt >= 0;

  const tipi: TipoMicrociclo[] = ['CARICO', 'SCARICO', 'RECUPERO', 'GARA', 'ADATTAMENTO', 'PAUSA'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">
            Settimana del {formattaData(micro.inizio)}
          </h3>
          <button onClick={onChiudi} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo Microciclo</label>
            <div className="grid grid-cols-3 gap-1.5">
              {tipi.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`p-2 rounded-lg text-center font-bold transition ${
                    tipo === t ? 'bg-[#006874] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {TIPO_MICROCICLO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sedute Previste</label>
              <input
                type="number"
                min="0"
                max="14"
                value={sedute}
                onChange={e => setSedute(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Volume Squadra (m)</label>
              <input
                type="number"
                step="50"
                value={metri}
                onChange={e => setMetri(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Note settimana</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Salvare bloccherà la settimana (🔒): le modifiche manuali non verranno sovrascritte durante le rigenerazioni automatiche.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            {micro.bloccato && (
              <button
                type="button"
                onClick={() => onSblocca(micro)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition"
              >
                <Unlock size={14} />
                <span>Sblocca</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onChiudi}
              className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!valido}
              onClick={() => {
                onSalva({
                  ...micro,
                  tipo,
                  sedutePreviste: seduteInt,
                  volumeTargetMetri: metriInt,
                  note: note.trim()
                });
              }}
              className="px-4 py-1.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
