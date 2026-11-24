import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { CodiceAllenamentoKey, LogSeduta } from '../types';
import { formattaData, parseData, todayISO, yearsBetween } from '../domain/dateUtils';
import { VolumeIndividuale } from '../domain/volumeIndividuale';
import { isAssenteInData } from '../domain/assenze';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { CodiciSeduta } from './CodiciSeduta';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Minus,
  Plus,
  User,
  Waves
} from 'lucide-react';
import { Button, EmptyState, Input, Tabs } from './ui';
import { SezioneTempiAtleta, SezioneStoricoAtleta } from './registroSezioni';

export const RegistroScreen: React.FC = () => {
  const {
    atleti,
    assenze,
    micro,
    meso,
    log,
    tempi,
    condizioni,
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

  // Inizializza/aggiorna le righe quando i dati sottostanti cambiano
  // (pattern "adjust state during render": niente effect + setState).
  const costruisciRigheIniziali = (): Record<number, { presente: boolean; metri: string; rpe: string }> => {
    const initial: Record<number, { presente: boolean; metri: string; rpe: string }> = {};
    if (!dataParsed) return initial;

    atleti.forEach(a => {
      const esistente = log.find(l => l.atletaId === a.id && l.data === dataParsed);
      if (esistente) {
        initial[a.id] = {
          presente: esistente.presente,
          metri: esistente.presente ? esistente.metriEffettivi.toString() : '',
          rpe: esistente.rpe?.toString() ?? ''
        };
      } else {
        const assente = isAssenteInData(a.id, dataParsed, assenze, 'ALLENAMENTO');
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
    return initial;
  };

  const [prevRigheDeps, setPrevRigheDeps] = useState<{ dataParsed: string | null; atleti: typeof atleti; assenze: typeof assenze; micro: typeof micro; log: typeof log } | null>(null);
  if (
    prevRigheDeps === null ||
    prevRigheDeps.dataParsed !== dataParsed ||
    prevRigheDeps.atleti !== atleti ||
    prevRigheDeps.assenze !== assenze ||
    prevRigheDeps.micro !== micro ||
    prevRigheDeps.log !== log
  ) {
    setPrevRigheDeps({ dataParsed, atleti, assenze, micro, log });
    setRighe(costruisciRigheIniziali());
  }

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
                      <span className="font-label-caps text-[12px] text-on-surface-variant font-medium normal-case tracking-normal">
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
                          <span className="font-label-caps text-[12px] uppercase">RPE</span>
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
