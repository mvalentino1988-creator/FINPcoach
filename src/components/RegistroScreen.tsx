import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { Atleta, CodiceAllenamentoKey, ContestoTempo, LogSeduta, Stile, Tempo } from '../types';
import { formattaData, parseData, previousOrSameMonday, todayISO, yearsBetween } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali } from '../domain/tempoUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { calcolaVolumeSessione } from '../domain/volumePrescritto';
import { risolviParametriSeduta, seduteSettimana } from '../domain/parametriSeduta';
import { CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { Riepilogo } from '../domain/riepilogo';
import { CodiciSeduta } from './CodiciSeduta';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  HeartPulse,
  Minus,
  Plus,
  ShieldAlert,
  Trash2,
  TrendingUp,
  User,
  Waves
} from 'lucide-react';
import { Badge, Button, EmptyState, Input, Progress, Tabs } from './ui';

export const RegistroScreen: React.FC = () => {
  const {
    atleti,
    assenze,
    micro,
    meso,
    log,
    tempi,
    stagione,
    condizioni,
    impostazioni,
    parametriEffettivi,
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
  const [codiciSeduta, setCodiciSeduta] = useState<CodiceAllenamentoKey[] | null>(null);

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
      <EmptyState
        icon={<User size={40} strokeWidth={1.5} />}
        title="Nessun atleta registrato"
        message="Aggiungi prima gli atleti per registrare presenze e carico."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <Tabs
        tabs={[
          { id: 'seduta', label: 'Registro Seduta' },
          { id: 'tempi', label: 'Tempi Gara' },
          { id: 'storico', label: 'Carico ACWR' },
        ]}
        activeId={sezione}
        onChange={(id) => setSezione(id as 'seduta' | 'tempi' | 'storico')}
        ariaLabel="Sezioni del registro"
      />

      {/* ==================================== SUBTAB SEDUTA ==================================== */}
      {sezione === 'seduta' && (
        <div className="space-y-4">
          <div className="p-4 ds-card shadow-card space-y-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Registra Presenze e Carico Effettivo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Data Allenamento *"
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
              />

              <Input
                label="Durata Seduta (min) *"
                type="number"
                value={durata}
                onChange={e => setDurata(e.target.value)}
                className="font-bold"
              />
            </div>

            {/* Button open today's poolside card */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const d = dataParsed ?? todayISO();
                const mic = micro.find(m => m.inizio <= d && m.fine >= d) ?? micro[0];
                const mes = mic ? meso.find(me => me.id === mic.mesocicloId) : null;
                const condizioniAtleta = atletaSel
                  ? condizioni.filter(c => c.atletaId === atletaSel.id && c.attiva)
                  : condizioni.filter(c => c.attiva);
                setCodiciSeduta(generaCodiciSeduta({
                  fase: mes?.fase ?? 'PREPARAZIONE_SPECIFICA',
                  tipoMicro: mic?.tipo ?? 'CARICO',
                  etaAtleta: atletaSel?.dataNascita ? yearsBetween(atletaSel.dataNascita, d) : null,
                  condizioni: condizioniAtleta,
                }).codici);
              }}
              className="w-full"
              icon={<Waves size={16} />}
            >
              Focus codici della seduta
            </Button>
            {codiciSeduta && (
              <CodiciSeduta codici={codiciSeduta} titolo="Focus della seduta" compatto />
            )}

            {giaRegistrata && (
              <p className="text-xs text-on-tertiary-fixed-variant bg-tertiary-fixed/50 p-3 rounded-lg border border-tertiary-fixed-dim font-medium flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                Per questa data è già presente una seduta nel registro: salvando verrà aggiornata.
              </p>
            )}
          </div>

          {/* Athletes checklist — tabella con hairline */}
          <div className="ds-card p-4 shadow-card space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Atleta</span>
              <div className="flex gap-14 sm:gap-16 mr-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden sm:block">Metri</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden sm:block">RPE</span>
              </div>
            </div>

            <div className="divide-y divide-outline-variant/50">
            {atleti.map(a => {
              const r = righe[a.id] ?? { presente: true, metri: '1800', rpe: '6' };
              const rpeNum = Math.min(10, Math.max(1, parseInt(r.rpe, 10) || 6));
              const setRpe = (v: number) => {
                setRighe(prev => ({
                  ...prev,
                  [a.id]: { ...r, rpe: String(Math.min(10, Math.max(1, v))) }
                }));
              };
              return (
                <div
                  key={a.id}
                  className={`py-3 flex flex-col gap-2.5 text-xs transition ${
                    r.presente ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-body-bold text-body-bold text-on-surface text-sm block truncate">
                        {a.cognome} {a.nome}
                      </span>
                      <span className="font-label-caps text-[10px] text-on-surface-variant font-medium normal-case tracking-normal">
                        Fattore volume: {Math.round(a.fattoreVolume * 100)}%
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-pressed={r.presente}
                      onClick={() => {
                        setRighe(prev => ({
                          ...prev,
                          [a.id]: { ...r, presente: !r.presente }
                        }));
                      }}
                      className={`min-h-[48px] px-4 rounded-xl font-headline-sm text-label-lg font-bold transition shrink-0 ${
                        r.presente
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {r.presente ? 'Presente' : 'Assente'}
                    </button>
                  </div>

                  {r.presente ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="50"
                          inputMode="numeric"
                          aria-label={`Metri per ${a.cognome} ${a.nome}`}
                          value={r.metri}
                          onChange={e => {
                            setRighe(prev => ({
                              ...prev,
                              [a.id]: { ...r, metri: e.target.value }
                            }));
                          }}
                          className="w-28 px-3 h-12 border border-outline-variant/60 bg-surface-container-low rounded-xl text-center font-headline-sm font-bold text-base tabular-nums focus:outline-none focus:border-primary"
                        />
                        <span className="text-on-surface-variant text-xs font-semibold">m</span>
                      </div>

                      <div className="flex items-center gap-1 ml-auto" role="group" aria-label={`RPE per ${a.cognome} ${a.nome}`}>
                        <button
                          type="button"
                          aria-label="Diminuisci RPE"
                          onClick={() => setRpe(rpeNum - 1)}
                          className="w-12 h-12 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition active:scale-95"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex flex-col items-center justify-center">
                          <span className="font-stat-timer-mobile text-[20px] leading-none tabular-nums">{rpeNum}</span>
                          <span className="font-label-caps text-[8px] uppercase">RPE</span>
                        </div>
                        <button
                          type="button"
                          aria-label="Aumenta RPE"
                          onClick={() => setRpe(rpeNum + 1)}
                          className="w-12 h-12 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition active:scale-95"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-error italic">Assente</span>
                  )}
                </div>
              );
            })}
            </div>

            {salvatoSuccesso && (
              <div className="flex items-center gap-3 p-3 bg-secondary/10 text-secondary border border-secondary/25 rounded-xl text-xs font-bold animate-fade-in">
                <CheckCircle size={16} className="shrink-0" />
                <span>Seduta registrata con successo nel registro presenze e carichi!</span>
              </div>
            )}

            <Button
              onClick={handleSalvaSeduta}
              disabled={!dataParsed || isNaN(durataInt) || durataInt <= 0}
              className="w-full mt-2"
              icon={<Check size={16} />}
            >
              {giaRegistrata ? 'Aggiorna Seduta nel Registro' : 'Salva Seduta nel Registro'}
            </Button>
          </div>
        </div>
      )}

      {/* ==================================== SUBTAB TEMPI ==================================== */}
      {sezione === 'tempi' && atletaSel && (
        <div className="space-y-4">
          {/* Athlete Selector — chip pills */}
          <div className="p-2.5 ds-card shadow-card flex flex-wrap sm:flex-nowrap items-center gap-2">
            <span className="hidden sm:inline font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:flex-1">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  aria-label={`${a.cognome} ${a.nome}`}
                  title={`${a.cognome} ${a.nome}`}
                  className={`px-3 min-h-[48px] rounded-full font-label-caps text-label-caps transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <User size={13} />
                  <span className="truncate">{a.cognome} {a.nome?.[0]}.</span>
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
          {/* Athlete Selector — chip pills */}
          <div className="p-2.5 ds-card shadow-card flex flex-wrap sm:flex-nowrap items-center gap-2">
            <span className="hidden sm:inline font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider shrink-0 pl-1">
              Atleta:
            </span>
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:flex-1">
              {atleti.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAtletaSelId(a.id)}
                  aria-label={`${a.cognome} ${a.nome}`}
                  title={`${a.cognome} ${a.nome}`}
                  className={`px-3 min-h-[48px] rounded-full font-label-caps text-label-caps transition flex items-center gap-1.5 ${
                    atletaSel.id === a.id
                      ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <User size={13} />
                  <span className="truncate">{a.cognome} {a.nome?.[0]}.</span>
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
      <div className="p-4 ds-card shadow-card space-y-3">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Nuovo Tempo · {atleta.nome} {atleta.cognome}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Data *"
              type="text"
              value={dataTesto}
              onChange={e => setDataTesto(e.target.value)}
            />
            <Input
              label="Distanza (m) *"
              type="number"
              value={distanza}
              onChange={e => setDistanza(e.target.value)}
              className="font-bold"
            />
            <Input
              label="Tempo (es. 1:02.35) *"
              type="text"
              placeholder="es. 1:02.35"
              value={tempoTesto}
              onChange={e => setTempoTesto(e.target.value)}
              className="font-bold text-base text-primary tabular-nums"
            />
          </div>

          <div>
            <span className="ds-label block mb-1">Stile</span>
            <div className="flex flex-wrap gap-1.5">
              {(['STILE_LIBERO', 'DORSO', 'RANA', 'FARFALLA', 'MISTI'] as Stile[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStile(s)}
                  className={`px-3 min-h-[48px] rounded-full font-label-caps text-label-caps transition ${
                    stile === s ? 'bg-primary-container text-on-primary-container shadow-sm font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 bg-surface-container p-0.5 rounded-lg" role="group" aria-label="Contesto">
              {(['GARA', 'ALLENAMENTO', 'TEST'] as ContestoTempo[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContesto(c)}
                  className={`px-3 min-h-[44px] rounded-md font-label-caps text-label-caps transition capitalize ${
                    contesto === c ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  {c.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-surface-container p-0.5 rounded-lg ml-auto" role="group" aria-label="Vasca">
              {[25, 50].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVasca(v)}
                  className={`px-3 min-h-[44px] rounded-md font-label-caps text-label-caps transition ${
                    vasca === v ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  {v}m
                </button>
              ))}
            </div>
          </div>

          <Input
            type="text"
            placeholder="Note sul tempo (opzionale)"
            aria-label="Note sul tempo"
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          <Button
            type="submit"
            disabled={!valido}
            className="w-full"
          >
            Aggiungi Tempo
          </Button>
        </form>
      </div>

      {/* Official PB */}
      <div className="p-4 ds-card shadow-card space-y-3">
        <h4 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
          <span>Primati Personali Ufficiali (Gara)</span>
        </h4>

        {primati.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessun tempo di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-2.5 bg-surface-container-low/60 border border-outline-variant/50 rounded-lg flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-body-bold text-body-bold text-on-surface block truncate">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m (vasca {p.vascaMetri}m)
                  </span>
                  <span className="font-label-caps text-[10px] text-on-surface-variant">{formattaData(p.data)}</span>
                </div>
                <span className="font-stat-timer-mobile text-[18px] text-primary-container tabular-nums leading-none shrink-0">
                  {formattaTempo(p.centesimi)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time records list */}
      <div className="p-4 ds-card shadow-card space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <h4 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
            <span>Storico Tempi</span>
          </h4>
          <span className="font-label-caps text-label-caps text-on-surface-variant">{tempi.length} in archivio</span>
        </div>

        {tempi.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {tempi.map(t => (
              <div
                key={t.id}
                className="py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body-bold text-body-bold text-on-surface">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                    </span>
                    <span className="font-stat-timer-mobile text-[16px] text-primary tabular-nums leading-none">
                      {formattaTempo(t.centesimi)}
                    </span>
                  </div>
                  <div className="font-label-caps text-[10px] text-on-surface-variant mt-1 normal-case tracking-normal">
                    {formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>

                <button
                  onClick={() => onElimina(t.id)}
                  className="w-12 h-12 -m-1.5 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/50 transition shrink-0"
                  aria-label="Elimina tempo"
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

  // Livello ACWR → token acwr-* (testo sempre accanto al colore)
  const acwrLevel: 'ok' | 'attenzione' | 'critico' =
    acwr.acwrRapporto > 1.5 ? 'critico' : acwr.acwrRapporto > 1.3 ? 'attenzione' : 'ok';
  const acwrTone = acwrLevel === 'critico' ? 'acwr-critico' : acwrLevel === 'attenzione' ? 'acwr-attenzione' : 'acwr-ok';

  // Posizione ago ACWR sulla scala mockup 0.5 → 1.8
  const agoLeft = `${Math.min(98, Math.max(2, ((acwr.acwrRapporto - 0.5) / 1.3) * 100))}%`;

  return (
    <div className="space-y-4">
      {/* ACWR Monitor Card */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <HeartPulse size={16} className="text-error shrink-0" />
            <span className="font-headline-sm text-headline-sm text-on-surface truncate">ACWR Telemetria</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant hidden sm:inline">(Gabbett Model)</span>
          </div>
          <Badge acwr={acwrLevel}>
            {acwr.livelloRischio}
          </Badge>
        </div>

        {/* Barra ACWR a fasce: colore + testo, mai solo colore */}
        <Progress
          label={`Rapporto ACWR · ${acwr.acwrRapporto.toFixed(2)}`}
          value={Math.min(1.8, Math.max(0.5, acwr.acwrRapporto))}
          max={1.8}
          tone={acwrTone}
          valueLabel={acwr.acwrRapporto >= 0.8 && acwr.acwrRapporto <= 1.3 ? 'Sweet Spot' : acwr.livelloRischio}
        />

        {acwr.avvisoInfortunio && (
          <div className="p-3 bg-error-container border border-error/30 rounded-xl text-xs text-on-error-container flex items-start gap-3 font-medium">
            <ShieldAlert size={16} className="text-error shrink-0 mt-0.5" />
            <p>{acwr.avvisoInfortunio}</p>
          </div>
        )}

        {/* Gauge & KPI strip */}
        <div className="grid grid-cols-12 gap-2 items-center bg-surface-container-low p-2.5 rounded-lg">
          <div className="col-span-5 flex flex-col items-center justify-center bg-surface-container-lowest p-2 rounded-lg shadow-sm">
            <span className="font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase">Rapporto ACWR</span>
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-primary tracking-tight tabular-nums">
              {acwr.acwrRapporto.toFixed(2)}
            </span>
            <span className="font-headline-sm text-[11px] text-secondary font-bold flex items-center gap-1">
              <Check size={12} />
              {acwr.acwrRapporto >= 0.8 && acwr.acwrRapporto <= 1.3 ? 'Sweet Spot' : acwr.livelloRischio}
            </span>
          </div>
          <div className="col-span-7 flex flex-col justify-between h-full space-y-2.5 pl-1">
            <Progress
              label="Acuto (7gg)"
              value={acwr.caricoAcuto}
              max={Math.max(1, acwr.caricoAcuto + acwr.caricoCronicoMedio)}
              tone="primary"
              valueLabel={`${acwr.caricoAcuto} sRPE`}
              trackClassName="h-1.5"
            />
            <Progress
              label="Cronico (28gg)"
              value={acwr.caricoCronicoMedio}
              max={Math.max(1, acwr.caricoAcuto + acwr.caricoCronicoMedio)}
              tone="secondary"
              valueLabel={`${Math.round(acwr.caricoCronicoMedio)} sRPE`}
              trackClassName="h-1.5"
            />
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-0.5">
              <span>Range ottimale: <strong className="text-on-surface font-headline-sm">0.8 – 1.3</strong></span>
              <span className="text-error font-headline-sm font-bold">Alert &gt; 1.5</span>
            </div>
          </div>
        </div>

        {/* Visual Gradient Zone Bar + ago */}
        <div className="space-y-1">
          <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-surface-container flex">
            <div className="w-[23%] bg-surface-container-high" title="Sotto-carico (<0.8)" />
            <div className="w-[38%] bg-acwr-ok" title="Sweet Spot (0.8 - 1.3)" />
            <div className="w-[15%] bg-acwr-attenzione" title="Attenzione (1.3 - 1.5)" />
            <div className="w-[24%] bg-acwr-critico" title="Alto Rischio (>1.5)" />
            {/* Needle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-on-surface rounded-full"
              style={{ left: agoLeft, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="relative w-full flex justify-between px-0.5 font-label-caps text-[9px] text-on-surface-variant">
            <span>0.5</span>
            <span className="text-secondary font-bold">0.8</span>
            <span className="text-secondary font-bold">1.3</span>
            <span className="text-error font-bold">1.5</span>
            <span className="text-error">1.8</span>
          </div>
        </div>

        {/* Attendance metrics strip */}
        <div className="flex items-center justify-between text-[10px] font-label-caps text-on-surface-variant bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          <span className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-secondary" />
            Presenze: <strong className="text-on-surface font-headline-sm">{presentiCount}</strong> su {log.length}
          </span>
          <span>sRPE = RPE × durata</span>
        </div>
      </div>

      {/* Weekly History Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-headline-sm text-headline-sm text-on-surface">Riepilogo Ultime Settimane</h4>
          <span className="font-label-caps text-label-caps text-on-surface-variant">sRPE</span>
        </div>

        {settimane.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Nessuna seduta registrata nel registro.</p>
        ) : (
          settimane.map((s, i) => (
            <div
              key={i}
              className="p-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
            >
              <div className="min-w-0">
                <span className="font-body-bold text-body-bold text-on-surface block text-sm">
                  Settimana del {formattaData(s.lunedi)}
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant normal-case tracking-normal">
                  {s.sedute} sedute · <strong className="text-on-surface">{s.metri.toLocaleString('it-IT')} m</strong>
                  {s.metriPrevisti != null && ` (previsti ${s.metriPrevisti.toLocaleString('it-IT')} m)`}
                  {s.assenze > 0 && ` · ${s.assenze} assenze`}
                </span>
              </div>

              <div className="text-left sm:text-right shrink-0">
                {s.rpeMedio != null && (
                  <span className="block font-label-caps text-[10px] text-on-surface-variant uppercase">
                    RPE medio: <strong className="text-on-surface font-headline-sm">{s.rpeMedio.toFixed(1)}</strong>
                  </span>
                )}
                <span className="font-stat-timer-mobile text-[18px] text-primary-container tabular-nums leading-none">
                  {s.caricoSrpe.toLocaleString('it-IT')}
                </span>
                <span className="font-label-caps text-[9px] text-on-surface-variant ml-1">sRPE</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
