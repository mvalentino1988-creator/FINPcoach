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
      <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-slate-200/70">
        <User size={36} className="mx-auto text-outline mb-2" />
        <h3 className="font-bold text-on-surface">Nessun atleta registrato</h3>
        <p className="text-xs text-on-surface-variant mt-1">Aggiungi prima gli atleti per registrare presenze e carico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex p-1 bg-surface-container rounded-xl border border-slate-200/70">
        <button
          type="button"
          onClick={() => setSezione('seduta')}
          className={`flex-1 h-12 text-xs font-bold rounded-xl transition ${
            sezione === 'seduta' ? 'bg-surface-container-lowest text-primary-container shadow-card' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          1. Registro Seduta Vasca
        </button>
        <button
          type="button"
          onClick={() => setSezione('tempi')}
          className={`flex-1 h-12 text-xs font-bold rounded-xl transition ${
            sezione === 'tempi' ? 'bg-surface-container-lowest text-primary-container shadow-card' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          2. Tempi Gara
        </button>
        <button
          type="button"
          onClick={() => setSezione('storico')}
          className={`flex-1 h-12 text-xs font-bold rounded-xl transition ${
            sezione === 'storico' ? 'bg-surface-container-lowest text-primary-container shadow-card' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          3. Monitoraggio Carico ACWR
        </button>
      </div>

      {/* ==================================== SUBTAB SEDUTA ==================================== */}
      {sezione === 'seduta' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card space-y-3">
            <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
              <Calendar size={16} className="text-primary-container" />
              <span>Registra Presenze e Carico Effettivo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">Data Allenamento *</label>
                <input
                  type="text"
                  value={dataTesto}
                  onChange={e => setDataTesto(e.target.value)}
                  className="w-full px-3 h-12 border border-outline-variant rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">Durata Seduta (minuti) *</label>
                <input
                  type="number"
                  value={durata}
                  onChange={e => setDurata(e.target.value)}
                  className="w-full px-3 h-12 border border-outline-variant rounded-xl font-bold"
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
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-surface-container-low hover:bg-primary-fixed text-primary-container border border-primary-fixed-dim rounded-xl font-bold text-xs transition"
            >
              <Waves size={16} />
              <span>Scheda Bordo Vasca del Giorno 🏊‍♂️</span>
            </button>

            {giaRegistrata && (
              <p className="text-[11px] text-tertiary bg-surface-container-low p-2 rounded-lg border border-tertiary-fixed-dim font-medium">
                Per questa data è già presente una seduta nel registro: salvando verrà aggiornata.
              </p>
            )}
          </div>

          {/* Athletes checklist */}
          <div className="bg-surface-container-lowest rounded-xl border border-slate-200/70 p-4 shadow-card space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider pb-2 border-b border-slate-200/70">
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
                    r.presente ? 'bg-surface-container-low border-slate-200/70' : 'bg-surface-container/60 border-slate-200/70 opacity-60'
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
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <div>
                      <span className="font-bold text-on-surface text-sm block">
                        {a.cognome} {a.nome}
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-medium">
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
                          className="w-24 px-2.5 h-12 border border-outline-variant rounded-lg text-center font-bold text-xs"
                        />
                        <span className="text-on-surface-variant">m</span>
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
                          className="w-16 px-2.5 h-12 border border-outline-variant rounded-lg text-center font-bold text-xs text-primary-container"
                        />
                        <span className="text-[10px] text-on-surface-variant">/10</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-error italic">Assente</span>
                  )}
                </div>
              );
            })}

            {salvatoSuccesso && (
              <div className="flex items-center gap-2 p-3 bg-surface-container-low text-primary border border-primary-fixed-dim rounded-xl text-xs font-bold animate-fadeIn">
                <CheckCircle size={16} className="text-primary" />
                <span>Seduta registrata con successo nel registro presenze e carichi!</span>
              </div>
            )}

            <button
              onClick={handleSalvaSeduta}
              disabled={!dataParsed || isNaN(durataInt) || durataInt <= 0}
              className="w-full mt-3 h-12.5 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-xs transition shadow-card"
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
          <div className="p-3 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  className={`px-3 h-12 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-primary-container text-on-primary shadow-card'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
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
          <div className="p-3 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex gap-1.5 shrink-0">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  className={`px-3 h-12 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-primary-container text-on-primary shadow-card'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
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
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card space-y-3">
        <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
          <Plus size={16} className="text-primary-container" />
          <span>Nuovo Tempo · {atleta.nome} {atleta.cognome}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Data *</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Distanza (m) *</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Tempo (es. 1:02.35 o 28.40) *</label>
              <input
                type="text"
                placeholder="es. 1:02.35"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="w-full px-3 h-12 border border-outline-variant rounded-lg font-bold text-sm text-primary-container"
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
                  stile === s ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
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
                    contesto === c ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
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
                    vasca === v ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
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
            className="w-full px-3 h-12 border border-outline-variant rounded-lg"
          />

          <button
            type="submit"
            disabled={!valido}
            className="w-full h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-xs transition shadow-card"
          >
            Aggiungi Tempo
          </button>
        </form>
      </div>

      {/* Official PB */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card space-y-3">
        <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Award size={16} className="text-tertiary-container" />
          <span>Primati Personali Ufficiali (Gara)</span>
        </h4>

        {primati.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessun tempo di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-2.5 bg-surface-container-low/50 border border-tertiary-fixed-dim rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-on-surface block">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m (vasca {p.vascaMetri}m)
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{formattaData(p.data)}</span>
                </div>
                <span className="font-bold text-primary-container text-sm">
                  {formattaTempo(p.centesimi)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time records list */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card space-y-2">
        <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
          Storico Tempi ({tempi.length})
        </h4>

        {tempi.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {tempi.map(t => (
              <div
                key={t.id}
                className="p-2.5 bg-surface-container-low border border-slate-200/70 rounded-xl flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                    </span>
                    <span className="font-bold text-primary-container">{formattaTempo(t.centesimi)}</span>
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>

                <button
                  onClick={() => onElimina(t.id)}
                  className="p-1 text-on-surface-variant hover:text-error rounded"
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
      <div className="p-4 sm:p-5 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
            <HeartPulse size={18} className="text-error" />
            <span>Monitoraggio Infortuni ACWR (Acute:Chronic Workload Ratio)</span>
          </h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface">
            {acwr.livelloRischio}
          </span>
        </div>

        {acwr.avvisoInfortunio && (
          <div className="p-3 bg-error-container border border-error/40 rounded-xl text-xs text-on-error-container flex items-start gap-2 font-medium">
            <ShieldAlert size={16} className="text-error shrink-0 mt-0.5" />
            <p>{acwr.avvisoInfortunio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200/70">
            <span className="text-on-surface-variant font-medium block">Carico Acuto (7gg)</span>
            <span className="text-base font-bold text-primary-container">{acwr.caricoAcuto} sRPE</span>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-slate-200/70">
            <span className="text-on-surface-variant font-medium block">Carico Cronico Medio (28gg)</span>
            <span className="text-base font-bold text-on-surface">{Math.round(acwr.caricoCronicoMedio)} sRPE</span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 bg-surface-container-low rounded-xl border border-slate-200/70">
            <span className="text-on-surface-variant font-medium block">Rapporto ACWR</span>
            <span className="text-base font-bold text-primary">{acwr.acwrRapporto.toFixed(2)}</span>
          </div>
        </div>

        {/* Visual ACWR Sweet Spot Gauge */}
        <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
            <span>&lt;0.8 Sotto-carico</span>
            <span className="text-primary">0.8 - 1.3 Sweet Spot (Sicuro)</span>
            <span className="text-tertiary">1.3 - 1.5 Attenzione</span>
            <span className="text-error">&gt;1.5 Alto Rischio</span>
          </div>
          <div className="relative h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
            <div className="w-[30%] bg-secondary-fixed" title="Sotto-allenamento" />
            <div className="w-[35%] bg-primary-fixed" title="Zona Sicura (Sweet Spot)" />
            <div className="w-[15%] bg-tertiary-fixed-dim" title="Zona Attenzione" />
            <div className="w-[20%] bg-error" title="Zona Rischio Elevato" />
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
              <span className="text-[9px] font-bold text-on-surface mt-0.5 whitespace-nowrap">
                ▲ {acwr.acwrRapporto.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Metrics */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-slate-200/70 shadow-card flex items-center justify-between text-xs">
        <span className="font-semibold text-on-surface">
          Presenze Totali: <strong>{presentiCount}</strong> su {log.length} sedute registrate
        </span>
        <span className="text-on-surface-variant">
          Carico sRPE = RPE (1-10) × durata (minuti)
        </span>
      </div>

      {/* Weekly History Cards */}
      <div className="space-y-2">
        <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
          Riepilogo Ultime Settimane
        </h4>

        {settimane.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessuna seduta registrata nel registro.</p>
        ) : (
          settimane.map((s, i) => (
            <div
              key={i}
              className="p-3.5 bg-surface-container-lowest border border-slate-200/70 rounded-xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-bold text-on-surface block text-sm">
                  Settimana del {formattaData(s.lunedi)}
                </span>
                <span className="text-on-surface-variant">
                  {s.sedute} sedute effettuate · <strong className="text-on-surface">{s.metri} m</strong>
                  {s.metriPrevisti != null && ` (previsti ${s.metriPrevisti} m)`}
                  {s.assenze > 0 && ` · ${s.assenze} assenze`}
                </span>
              </div>

              <div className="text-left sm:text-right">
                {s.rpeMedio != null && (
                  <span className="text-on-surface-variant block text-[11px]">
                    RPE medio: <strong>{s.rpeMedio.toFixed(1)}</strong>
                  </span>
                )}
                <span className="font-bold text-primary-container text-xs">
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
