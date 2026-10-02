import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { Atleta, ContestoTempo, LogSeduta, SchedaSeduta, Stile, Tempo } from '../types';
import { formattaData, parseData, previousOrSameMonday, todayISO } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali } from '../domain/tempoUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { GeneratoreSmartSeduta } from '../domain/generatoreSmartSeduta';
import { CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { Riepilogo } from '../domain/riepilogo';
import { SchedaSedutaModal } from './SchedaSedutaModal';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  HeartPulse,
  Plus,
  ShieldAlert,
  Trash2,
  TrendingUp,
  User,
  Waves
} from 'lucide-react';

export const RegistroScreen: React.FC = () => {
  const {
    atleti,
    assenze,
    micro,
    meso,
    log,
    tempi,
    salvaSeduta,
    aggiungiTempo,
    eliminaTempo
  } = useApp();

  const [sezione, setSezione] = useState<'seduta' | 'tempi' | 'storico'>('seduta');
  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === (atletaSelId ?? atleti[0]?.id)) ?? atleti[0] ?? null;

  // Seduta state
  const [dataTesto, setDataTesto] = useState<string>(formattaData(todayISO()));
  const [durata, setDurata] = useState('60');
  const [schedaGiorno, setSchedaGiorno] = useState<SchedaSeduta | null>(null);

  const [salvatoSuccesso, setSalvatoSuccesso] = useState(false);

  const dataParsed = parseData(dataTesto);
  const durataInt = parseInt(durata, 10);

  // Athletes attendance row state
  const [righe, setRighe] = useState<Record<number, { presente: boolean; metri: string; rpe: string }>>({});

  // Initialize or update rows when date changes
  React.useEffect(() => {
    if (!dataParsed) return;
    const initial: Record<number, { presente: boolean; metri: string; rpe: string }> = {};

    atleti.forEach(a => {
      const esistente = log.find(l => l.atletaId === a.id && l.data === dataParsed);
      if (esistente) {
        initial[a.id] = {
          presente: esistente.presente,
          metri: esistente.presente ? esistente.metriEffettivi.toString() : '',
          rpe: esistente.rpe?.toString() ?? ''
        };
      } else {
        const assente = assenze.some(
          ass => ass.atletaId === a.id && ass.dal <= dataParsed && ass.al >= dataParsed
        );
        const settimana = micro.find(m => m.inizio <= dataParsed && m.fine >= dataParsed);
        const previsti = settimana && settimana.sedutePreviste > 0
          ? Math.round(
              VolumeIndividuale.settimana(
                settimana,
                a,
                assenze.filter(ass => ass.atletaId === a.id)
              ).metri / settimana.sedutePreviste
            )
          : 1800;

        initial[a.id] = {
          presente: !assente,
          metri: previsti > 0 ? previsti.toString() : '1800',
          rpe: '6'
        };
      }
    });

    setRighe(initial);
  }, [dataParsed, atleti, assenze, micro, log]);

  const giaRegistrata = Boolean(dataParsed && log.some(l => l.data === dataParsed));

  const handleSalvaSeduta = () => {
    if (!dataParsed || isNaN(durataInt) || durataInt <= 0) return;

    const items: Omit<LogSeduta, 'id'>[] = atleti.map(a => {
      const r = righe[a.id] ?? { presente: true, metri: '1800', rpe: '6' };
      const metriInt = parseInt(r.metri, 10);
      const rpeInt = parseInt(r.rpe, 10);

      return {
        atletaId: a.id,
        data: dataParsed,
        presente: r.presente,
        durataMin: r.presente ? durataInt : 0,
        metriEffettivi: r.presente && !isNaN(metriInt) ? metriInt : 0,
        rpe: r.presente && !isNaN(rpeInt) ? rpeInt : undefined,
        note: ''
      };
    });

    salvaSeduta(dataParsed, items);
    setSalvatoSuccesso(true);
    setTimeout(() => setSalvatoSuccesso(false), 3000);
  };

  if (atleti.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <User size={36} className="mx-auto text-slate-300 mb-2" />
        <h3 className="font-bold text-slate-700">Nessun atleta registrato</h3>
        <p className="text-xs text-slate-500 mt-1">Aggiungi prima gli atleti per registrare presenze e carico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setSezione('seduta')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            sezione === 'seduta' ? 'bg-white text-[#006874] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Registro Seduta Vasca
        </button>
        <button
          type="button"
          onClick={() => setSezione('tempi')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            sezione === 'tempi' ? 'bg-white text-[#006874] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Tempi Gara
        </button>
        <button
          type="button"
          onClick={() => setSezione('storico')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            sezione === 'storico' ? 'bg-white text-[#006874] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Monitoraggio Carico ACWR
        </button>
      </div>

      {/* ==================================== SUBTAB SEDUTA ==================================== */}
      {sezione === 'seduta' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-[#006874]" />
              <span>Registra Presenze e Carico Effettivo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Data Allenamento *</label>
                <input
                  type="text"
                  value={dataTesto}
                  onChange={e => setDataTesto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Durata Seduta (minuti) *</label>
                <input
                  type="number"
                  value={durata}
                  onChange={e => setDurata(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Button open today's poolside card */}
            <button
              type="button"
              onClick={() => {
                const d = dataParsed ?? todayISO();
                const mic = micro.find(m => m.inizio <= d && m.fine >= d) ?? micro[0];
                const mes = mic ? meso.find(me => me.id === mic.mesocicloId) : null;
                const volumeMedia = mic && mic.sedutePreviste > 0
                  ? Math.round(mic.volumeTargetMetri / mic.sedutePreviste)
                  : 1800;

                setSchedaGiorno(
                  GeneratoreSmartSeduta.genera(
                    d,
                    volumeMedia,
                    mes?.fase ?? 'PREPARAZIONE_SPECIFICA',
                    mic?.tipo ?? 'CARICO'
                  )
                );
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-cyan-50 hover:bg-cyan-100 text-[#006874] border border-cyan-200 rounded-xl font-bold text-xs transition"
            >
              <Waves size={16} />
              <span>Scheda Bordo Vasca del Giorno 🏊‍♂️</span>
            </button>

            {giaRegistrata && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                Per questa data è già presente una seduta nel registro: salvando verrà aggiornata.
              </p>
            )}
          </div>

          {/* Athletes checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Atleta</span>
              <div className="flex gap-16 mr-3">
                <span>Metri Effettivi</span>
                <span>RPE (1-10)</span>
              </div>
            </div>

            {atleti.map(a => {
              const r = righe[a.id] ?? { presente: true, metri: '1800', rpe: '6' };
              return (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    r.presente ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={r.presente}
                      onChange={e => {
                        setRighe(prev => ({
                          ...prev,
                          [a.id]: { ...r, presente: e.target.checked }
                        }));
                      }}
                      className="w-4 h-4 accent-[#006874] rounded"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">
                        {a.cognome} {a.nome}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {a.classeS != null ? `S${a.classeS} ` : ''}
                        · Fattore volume: {Math.round(a.fattoreVolume * 100)}%
                      </span>
                    </div>
                  </label>

                  {r.presente ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="50"
                          value={r.metri}
                          onChange={e => {
                            setRighe(prev => ({
                              ...prev,
                              [a.id]: { ...r, metri: e.target.value }
                            }));
                          }}
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-xs"
                        />
                        <span className="text-slate-500">m</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={r.rpe}
                          onChange={e => {
                            setRighe(prev => ({
                              ...prev,
                              [a.id]: { ...r, rpe: e.target.value }
                            }));
                          }}
                          className="w-16 px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-xs text-[#006874]"
                        />
                        <span className="text-[10px] text-slate-400">/10</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-rose-600 italic">Assente</span>
                  )}
                </div>
              );
            })}

            {salvatoSuccesso && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold animate-fadeIn">
                <CheckCircle size={16} className="text-emerald-600" />
                <span>Seduta registrata con successo nel registro presenze e carichi!</span>
              </div>
            )}

            <button
              onClick={handleSalvaSeduta}
              disabled={!dataParsed || isNaN(durataInt) || durataInt <= 0}
              className="w-full mt-3 py-2.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              {giaRegistrata ? 'Aggiorna Seduta nel Registro' : 'Salva Seduta nel Registro'}
            </button>
          </div>
        </div>
      )}

      {/* ==================================== SUBTAB TEMPI ==================================== */}
      {sezione === 'tempi' && atletaSel && (
        <div className="space-y-4">
          {/* Athlete Selector */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-[#006874] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <User size={13} />
                  <span>{a.cognome} {a.nome}</span>
                </button>
              ))}
            </div>
          </div>

          <SezioneTempiAtleta
            atleta={atletaSel}
            tempi={tempi.filter(t => t.atletaId === atletaSel.id)}
            onAggiungi={aggiungiTempo}
            onElimina={eliminaTempo}
          />
        </div>
      )}

      {/* ==================================== SUBTAB STORICO ==================================== */}
      {sezione === 'storico' && atletaSel && (
        <div className="space-y-4">
          {/* Athlete Selector */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-[#006874] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <User size={13} />
                  <span>{a.cognome} {a.nome}</span>
                </button>
              ))}
            </div>
          </div>

          <SezioneStoricoAtleta
            atleta={atletaSel}
            log={log.filter(l => l.atletaId === atletaSel.id)}
            micro={micro}
            assenze={assenze.filter(a => a.atletaId === atletaSel.id)}
          />
        </div>
      )}

      {schedaGiorno && (
        <SchedaSedutaModal
          scheda={schedaGiorno}
          onChiudi={() => setSchedaGiorno(null)}
        />
      )}
    </div>
  );
};

// ------------------------------------------------ Sub-component Tempi
interface SezioneTempiAtletaProps {
  atleta: Atleta;
  tempi: Tempo[];
  onAggiungi: (t: Omit<Tempo, 'id'>) => void;
  onElimina: (id: number) => void;
}

const SezioneTempiAtleta: React.FC<SezioneTempiAtletaProps> = ({
  atleta,
  tempi,
  onAggiungi,
  onElimina
}) => {
  const [dataTesto, setDataTesto] = useState<string>(formattaData(todayISO()));
  const [stile, setStile] = useState<Stile>('STILE_LIBERO');
  const [distanza, setDistanza] = useState('50');
  const [tempoTesto, setTempoTesto] = useState('');
  const [contesto, setContesto] = useState<ContestoTempo>('GARA');
  const [vasca, setVasca] = useState<number>(25);
  const [note, setNote] = useState('');

  const dataParsed = parseData(dataTesto);
  const distInt = parseInt(distanza, 10);
  const centesimi = parseTempo(tempoTesto);
  const valido = dataParsed != null && !isNaN(distInt) && distInt >= 25 && centesimi != null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || !dataParsed || !centesimi) return;

    onAggiungi({
      atletaId: atleta.id,
      data: dataParsed,
      stile,
      distanzaMetri: distInt,
      centesimi,
      contesto,
      vascaMetri: vasca,
      note: note.trim()
    });

    setTempoTesto('');
    setNote('');
  };

  const primati = primatiPersonali(tempi);

  return (
    <div className="space-y-4">
      {/* Add Form */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Plus size={16} className="text-[#006874]" />
          <span>Nuovo Tempo · {atleta.nome} {atleta.cognome}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Data *</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Distanza (m) *</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tempo (es. 1:02.35 o 28.40) *</label>
              <input
                type="text"
                placeholder="es. 1:02.35"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-black text-sm text-[#006874]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['STILE_LIBERO', 'DORSO', 'RANA', 'FARFALLA', 'MISTI'] as Stile[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStile(s)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  stile === s ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {(['GARA', 'ALLENAMENTO', 'TEST'] as ContestoTempo[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContesto(c)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    contesto === c ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex gap-1 ml-auto">
              {[25, 50].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVasca(v)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    vasca === v ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Vasca {v}m
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Note sul tempo (opzionale)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
          />

          <button
            type="submit"
            disabled={!valido}
            className="w-full py-2 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            Aggiungi Tempo
          </button>
        </form>
      </div>

      {/* Official PB */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Award size={16} className="text-amber-500" />
          <span>Primati Personali Ufficiali (Gara)</span>
        </h4>

        {primati.length === 0 ? (
          <p className="text-xs text-slate-400">Nessun tempo di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m (vasca {p.vascaMetri}m)
                  </span>
                  <span className="text-[10px] text-slate-500">{formattaData(p.data)}</span>
                </div>
                <span className="font-black text-[#006874] text-sm">
                  {formattaTempo(p.centesimi)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time records list */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          Storico Tempi ({tempi.length})
        </h4>

        {tempi.length === 0 ? (
          <p className="text-xs text-slate-400">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {tempi.map(t => (
              <div
                key={t.id}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                    </span>
                    <span className="font-black text-[#006874]">{formattaTempo(t.centesimi)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>

                <button
                  onClick={() => onElimina(t.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------ Sub-component Storico & ACWR
interface SezioneStoricoAtletaProps {
  atleta: Atleta;
  log: LogSeduta[];
  micro: any[];
  assenze: any[];
}

const SezioneStoricoAtleta: React.FC<SezioneStoricoAtletaProps> = ({
  atleta,
  log,
  micro,
  assenze
}) => {
  const settimane = useMemo(() => {
    return Riepilogo.perAtleta(atleta, log, micro, assenze);
  }, [atleta, log, micro, assenze]);

  const carichiPrecedenti = settimane.slice(1).map(s => s.caricoSrpe);
  const caricoAcuto = settimane[0]?.caricoSrpe ?? 0;

  const acwr = useMemo(() => {
    return CalcoloScienzaNuoto.calcolaACWR(caricoAcuto, carichiPrecedenti);
  }, [caricoAcuto, carichiPrecedenti]);

  const presentiCount = log.filter(l => l.presente).length;

  return (
    <div className="space-y-4">
      {/* ACWR Monitor Card */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <HeartPulse size={18} className="text-rose-600" />
            <span>Monitoraggio Infortuni ACWR (Acute:Chronic Workload Ratio)</span>
          </h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {acwr.livelloRischio}
          </span>
        </div>

        {acwr.avvisoInfortunio && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 font-medium">
            <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <p>{acwr.avvisoInfortunio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block">Carico Acuto (7gg)</span>
            <span className="text-base font-black text-[#006874]">{acwr.caricoAcuto} sRPE</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block">Carico Cronico Medio (28gg)</span>
            <span className="text-base font-black text-slate-700">{Math.round(acwr.caricoCronicoMedio)} sRPE</span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium block">Rapporto ACWR</span>
            <span className="text-base font-black text-cyan-800">{acwr.acwrRapporto.toFixed(2)}</span>
          </div>
        </div>

        {/* Visual ACWR Sweet Spot Gauge */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>&lt;0.8 Sotto-carico</span>
            <span className="text-emerald-700">0.8 - 1.3 Sweet Spot (Sicuro)</span>
            <span className="text-amber-700">1.3 - 1.5 Attenzione</span>
            <span className="text-rose-700">&gt;1.5 Alto Rischio</span>
          </div>
          <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className="w-[30%] bg-blue-200" title="Sotto-allenamento" />
            <div className="w-[35%] bg-emerald-400" title="Zona Sicura (Sweet Spot)" />
            <div className="w-[15%] bg-amber-400" title="Zona Attenzione" />
            <div className="w-[20%] bg-rose-500" title="Zona Rischio Elevato" />
          </div>
          {/* Current ACWR Indicator Pin */}
          <div className="relative h-2 w-full">
            <div
              className="absolute -top-1 -translate-x-1/2 flex flex-col items-center"
              style={{
                left: `${Math.min(96, Math.max(4, (acwr.acwrRapporto / 2.0) * 100))}%`
              }}
            >
              <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 rounded-xs" />
              <span className="text-[9px] font-black text-slate-900 mt-0.5 whitespace-nowrap">
                ▲ {acwr.acwrRapporto.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Metrics */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">
          Presenze Totali: <strong>{presentiCount}</strong> su {log.length} sedute registrate
        </span>
        <span className="text-slate-500">
          Carico sRPE = RPE (1-10) × durata (minuti)
        </span>
      </div>

      {/* Weekly History Cards */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          Riepilogo Ultime Settimane
        </h4>

        {settimane.length === 0 ? (
          <p className="text-xs text-slate-400">Nessuna seduta registrata nel registro.</p>
        ) : (
          settimane.map((s, i) => (
            <div
              key={i}
              className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block text-sm">
                  Settimana del {formattaData(s.lunedi)}
                </span>
                <span className="text-slate-500">
                  {s.sedute} sedute effettuate · <strong className="text-slate-800">{s.metri} m</strong>
                  {s.metriPrevisti != null && ` (previsti ${s.metriPrevisti} m)`}
                  {s.assenze > 0 && ` · ${s.assenze} assenze`}
                </span>
              </div>

              <div className="text-left sm:text-right">
                {s.rpeMedio != null && (
                  <span className="text-slate-600 block text-[11px]">
                    RPE medio: <strong>{s.rpeMedio.toFixed(1)}</strong>
                  </span>
                )}
                <span className="font-bold text-[#006874] text-xs">
                  Carico sRPE: {s.caricoSrpe}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
