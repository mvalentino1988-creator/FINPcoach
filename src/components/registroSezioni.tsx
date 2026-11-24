import React, { useMemo, useState } from 'react';
import { Atleta, Assenza, ContestoTempo, LogSeduta, Microciclo, Stile, Tempo } from '../types';
import { formattaData, parseData, todayISO } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali } from '../domain/tempoUtils';
import { ACWR_DISCLAIMER, CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { Riepilogo } from '../domain/riepilogo';
import { Trash2, Check, CheckCircle, HeartPulse, ShieldAlert } from 'lucide-react';
import { Badge, Button, Input, Progress } from './ui';

// ------------------------------------------------ Sub-component Tempi
export interface SezioneTempiAtletaProps {
  atleta: Atleta;
  tempi: Tempo[];
  onAggiungi: (t: Omit<Tempo, 'id'>) => void;
  onElimina: (id: number) => void;
}

export const SezioneTempiAtleta: React.FC<SezioneTempiAtletaProps> = ({
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
                  <span className="font-label-caps text-[12px] text-on-surface-variant">{formattaData(p.data)}</span>
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
                  <div className="font-label-caps text-[12px] text-on-surface-variant mt-1 normal-case tracking-normal">
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
export interface SezioneStoricoAtletaProps {
  atleta: Atleta;
  log: LogSeduta[];
  micro: Microciclo[];
  assenze: Assenza[];
}

export const SezioneStoricoAtleta: React.FC<SezioneStoricoAtletaProps> = ({
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

  // Livello ACWR (enum dominio) → token acwr-* e etichetta italiana
  const LIVELLO_ACWR_LABEL: Record<string, string> = {
    'sotto-allenamento': 'Sotto-allenamento',
    'ottimale': 'Ottimale',
    'attenzione': 'Attenzione',
    'elevato': 'Rischio elevato',
  };
  const acwrLevel: 'ok' | 'attenzione' | 'critico' =
    acwr.livelloRischio === 'elevato' ? 'critico'
    : acwr.livelloRischio === 'attenzione' ? 'attenzione'
    : 'ok';
  const acwrLabel = LIVELLO_ACWR_LABEL[acwr.livelloRischio] ?? acwr.livelloRischio;
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
            {acwrLabel}
          </Badge>
        </div>

        {/* Barra ACWR a fasce: colore + testo, mai solo colore */}
        <Progress
          label={`Rapporto ACWR · ${acwr.acwrRapporto.toFixed(2)}`}
          value={Math.min(1.8, Math.max(0.5, acwr.acwrRapporto))}
          max={1.8}
          tone={acwrTone}
          valueLabel={acwr.acwrRapporto >= 0.8 && acwr.acwrRapporto <= 1.3 ? 'Sweet Spot' : acwrLabel}
        />

        {acwr.avvisoInfortunio && (
          <div className="p-3 bg-error-container border border-error/30 rounded-xl text-xs text-on-error-container flex items-start gap-3 font-medium">
            <ShieldAlert size={16} className="text-error shrink-0 mt-0.5" />
            <p>{acwr.avvisoInfortunio}</p>
          </div>
        )}

        <p className="text-[12px] text-on-surface-variant leading-snug">
          {ACWR_DISCLAIMER} Soglie: ottimale 0.8–1.3 · attenzione 1.3–1.5 · elevato &gt;1.5.
        </p>

        {/* Gauge & KPI strip */}
        <div className="grid grid-cols-12 gap-2 items-center bg-surface-container-low p-2.5 rounded-lg">
          <div className="col-span-5 flex flex-col items-center justify-center bg-surface-container-lowest p-2 rounded-lg shadow-sm">
            <span className="font-label-caps text-[12px] text-on-surface-variant tracking-wider uppercase">Rapporto ACWR</span>
            <span className="font-stat-timer-mobile text-stat-timer-mobile text-primary tracking-tight tabular-nums">
              {acwr.acwrRapporto.toFixed(2)}
            </span>
            <span className="font-headline-sm text-[12px] text-secondary font-bold flex items-center gap-1">
              <Check size={12} />
              {acwr.acwrRapporto >= 0.8 && acwr.acwrRapporto <= 1.3 ? 'Sweet Spot' : acwrLabel}
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
            <div className="flex items-center justify-between text-[12px] text-on-surface-variant pt-0.5">
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
          <div className="relative w-full flex justify-between px-0.5 font-label-caps text-[12px] text-on-surface-variant">
            <span>0.5</span>
            <span className="text-secondary font-bold">0.8</span>
            <span className="text-secondary font-bold">1.3</span>
            <span className="text-error font-bold">1.5</span>
            <span className="text-error">1.8</span>
          </div>
        </div>

        {/* Attendance metrics strip */}
        <div className="flex items-center justify-between text-[12px] font-label-caps text-on-surface-variant bg-surface-container-low px-2.5 py-1.5 rounded-lg">
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
                <span className="font-label-caps text-[12px] text-on-surface-variant normal-case tracking-normal">
                  {s.sedute} sedute · <strong className="text-on-surface">{s.metri.toLocaleString('it-IT')} m</strong>
                  {s.metriPrevisti != null && ` (previsti ${s.metriPrevisti.toLocaleString('it-IT')} m)`}
                  {s.assenze > 0 && ` · ${s.assenze} assenze`}
                </span>
              </div>

              <div className="text-left sm:text-right shrink-0">
                {s.rpeMedio != null && (
                  <span className="block font-label-caps text-[12px] text-on-surface-variant uppercase">
                    RPE medio: <strong className="text-on-surface font-headline-sm">{s.rpeMedio.toFixed(1)}</strong>
                  </span>
                )}
                <span className="font-stat-timer-mobile text-[18px] text-primary-container tabular-nums leading-none">
                  {s.caricoSrpe.toLocaleString('it-IT')}
                </span>
                <span className="font-label-caps text-[12px] text-on-surface-variant ml-1">sRPE</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
