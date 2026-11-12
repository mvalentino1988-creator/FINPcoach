import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { RecordService, RecordFINP, CATEGORIE_ITA } from '../domain/recordService';
import { formattaTempo } from '../domain/tempoUtils';
import { formattaData } from '../domain/dateUtils';
import {
  Trophy,
  Medal,
  Globe,
  User,
  Info,
  Flag,
  MapPin,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  BadgeCheck
} from 'lucide-react';
import { Modal, Select, Table } from './ui';

const TIPO_LABEL: Record<'ITA' | 'EUR' | 'WR', string> = {
  ITA: 'Italia',
  EUR: 'Europa',
  WR: 'Mondo'
};

const TIPO_ICON: Record<'ITA' | 'EUR' | 'WR', React.ReactNode> = {
  ITA: <Flag size={14} />,
  EUR: <Medal size={14} />,
  WR: <Globe size={14} />
};

/** Toggle segmentato stile Stitch (dock pill). */
const Segmento: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}> = ({ options, value, onChange, ariaLabel }) => (
  <div className="flex bg-surface-container rounded-lg p-0.5 shadow-inner" role="group" aria-label={ariaLabel}>
    {options.map(o => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`px-3 py-1.5 min-h-[48px] rounded-md font-label-caps text-label-caps transition ${
          value === o.value
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const RecordScreen: React.FC = () => {
  const { atleti, tempi } = useApp();
  const meta = RecordService.meta();

  const [vasca, setVasca] = useState<number>(50);
  const [genere, setGenere] = useState<string>('M');
  const [evento, setEvento] = useState<string>(() => RecordService.eventiIndividuali(50)[0] ?? '');
  const [classe, setClasse] = useState<string>('');
  const [atletaSelId, setAtletaSelId] = useState<number | null>(null);
  const [recordInfo, setRecordInfo] = useState<RecordFINP | null>(null);

  const eventi = useMemo(() => RecordService.eventi(vasca), [vasca]);
  const generi = useMemo(() => RecordService.generi(vasca, evento), [vasca, evento]);
  const classi = useMemo(() => RecordService.classi(vasca, evento, genere), [vasca, evento, genere]);

  const eventoEffettivo = eventi.includes(evento) ? evento : eventi[0] ?? '';
  const genereEffettivo = generi.includes(genere) ? genere : generi[0] ?? 'M';
  const classeEffettiva = classi.includes(classe) ? classe : classi[0] ?? '';

  const atletaSel = atleti.find(a => a.id === atletaSelId) ?? null;

  const recordIta = useMemo(
    () =>
      CATEGORIE_ITA.map(cat => ({
        cat,
        record: RecordService.recordIta(vasca, eventoEffettivo, genereEffettivo, classeEffettiva, cat)
      })),
    [vasca, eventoEffettivo, genereEffettivo, classeEffettiva]
  );
  const recordEur = useMemo(
    () => RecordService.recordInternazionale(vasca, eventoEffettivo, genereEffettivo, classeEffettiva, 'EUR'),
    [vasca, eventoEffettivo, genereEffettivo, classeEffettiva]
  );
  const recordWr = useMemo(
    () => RecordService.recordInternazionale(vasca, eventoEffettivo, genereEffettivo, classeEffettiva, 'WR'),
    [vasca, eventoEffettivo, genereEffettivo, classeEffettiva]
  );

  /** Categoria italiana in evidenza nel benchmark card (Assoluto, altrimenti la prima). */
  const itaInEvidenza = useMemo(() => {
    const assoluto = recordIta.find(r => /assolut/i.test(r.cat));
    return assoluto ?? recordIta[0] ?? null;
  }, [recordIta]);

  const itaAltre = useMemo(
    () => recordIta.filter(r => r !== itaInEvidenza),
    [recordIta, itaInEvidenza]
  );

  const migliorTempo = useMemo(() => {
    if (!atletaSel) return null;
    return RecordService.migliorTempoAtleta(tempi, atletaSel.id, vasca, eventoEffettivo);
  }, [atletaSel, tempi, vasca, eventoEffettivo]);

  const confronti = useMemo(() => {
    if (!migliorTempo) return [];
    const righe: { label: string; record: RecordFINP | null }[] = [
      { label: 'Record Italiano Assoluto', record: recordIta.find(r => r.cat === 'Assoluto')?.record ?? recordIta[0]?.record ?? null },
      { label: 'Record Europeo', record: recordEur },
      { label: 'Record Mondiale', record: recordWr }
    ];
    return righe
      .filter(r => r.record !== null)
      .map(r => {
        const cent = RecordService.tempoCentesimi(r.record!.tm);
        const confronto = cent != null ? RecordService.confronta(migliorTempo.centesimi, cent) : null;
        return { label: r.label, record: r.record!, confronto };
      });
  }, [migliorTempo, recordIta, recordEur, recordWr]);

  const cambiaVasca = (v: string) => {
    const n = Number(v);
    setVasca(n);
    const evs = RecordService.eventi(n);
    if (!evs.includes(evento)) setEvento(RecordService.eventiIndividuali(n)[0] ?? evs[0] ?? '');
  };

  const cambiaEvento = (ev: string) => {
    setEvento(ev);
    setClasse('');
  };

  const cambiaGenere = (g: string) => {
    setGenere(g);
    setClasse('');
  };

  const renderTempo = (r: RecordFINP | null, tone: 'primary' | 'secondary' | 'tertiary' | 'plain') => {
    if (!r) {
      return <span className="font-label-caps text-[10px] text-on-surface-variant italic">non disponibile</span>;
    }
    const toneClass =
      tone === 'primary' ? 'text-primary'
      : tone === 'secondary' ? 'text-secondary'
      : tone === 'tertiary' ? 'text-tertiary'
      : 'text-on-surface';
    return (
      <button
        type="button"
        onClick={() => setRecordInfo(r)}
        aria-label={`Dettagli del record ${r.tm}`}
        className={`font-stat-timer-mobile text-[24px] sm:text-[28px] leading-none tracking-tight tabular-nums ${toneClass} hover:underline underline-offset-4 decoration-2 rounded`}
      >
        {r.tm}
      </button>
    );
  };

  const sottoRecord = (r: RecordFINP | null, fallback: string, tone: 'primary' | 'tertiary' | 'secondary') => (
    <span className={`font-label-caps text-[9px] truncate ${tone === 'tertiary' ? 'text-tertiary' : tone === 'secondary' ? 'text-secondary' : 'text-primary'}`}>
      {r?.d ? `${r.d}` : fallback}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Record &amp; Minimi FINP</h2>
          <p className="font-label-caps text-label-caps text-on-surface-variant truncate">
            {meta.fonte} · aggiornati al {meta.aggiornato}
          </p>
        </div>
      </div>

      {/* Quick Filters Bar (ergonomic deckside taps) */}
      <div className="bg-surface-container-low p-2.5 rounded-xl shadow-sm space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Segmento
            ariaLabel="Vasca"
            value={String(vasca)}
            onChange={cambiaVasca}
            options={[{ value: '50', label: '50m' }, { value: '25', label: '25m' }]}
          />
          <Segmento
            ariaLabel="Genere"
            value={genereEffettivo}
            onChange={cambiaGenere}
            options={generi.map(g => ({ value: g, label: g === 'M' ? 'M' : g === 'F' ? 'F' : 'Mista' }))}
          />
          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 min-h-[48px] rounded-lg min-w-0">
            <span className="font-label-caps text-[10px] text-on-surface-variant shrink-0">CLASSE:</span>
            <select
              value={classeEffettiva}
              onChange={e => setClasse(e.target.value)}
              aria-label="Classe"
              className="bg-transparent text-primary font-headline-sm text-headline-sm min-h-[44px] p-0 border-0 focus:ring-0 cursor-pointer min-w-0"
            >
              {classi.map(cl => <option key={cl} value={cl}>{cl}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <Select
            aria-label="Evento"
            value={eventoEffettivo}
            onChange={e => cambiaEvento(e.target.value)}
            options={eventi.map(ev => ({ value: ev, label: ev }))}
            className="!h-12"
          />
          <Select
            aria-label="Atleta di confronto"
            value={atletaSelId ?? ''}
            onChange={e => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Solo record (nessun atleta)' },
              ...atleti.map(a => ({
                value: String(a.id),
                label: `${a.cognome} ${a.nome} (S${a.classeS ?? '?'})`
              }))
            ]}
            className="!h-12"
          />
        </div>
      </div>

      {/* Active Target Benchmark Card */}
      <div className="relative bg-surface-container-lowest rounded-xl p-3 shadow-md overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
        <div className="flex items-center justify-between pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-caps text-label-caps whitespace-nowrap">
              {classeEffettiva} · {eventoEffettivo}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {genereEffettivo === 'M' ? 'Maschile' : genereEffettivo === 'F' ? 'Femminile' : 'Mista'} · Vasca {vasca}m
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] font-bold whitespace-nowrap">
            WPS APPROVED
          </span>
        </div>

        {/* Compact 3-column telemetry */}
        <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-2 rounded-lg text-center">
          {/* Mondiale */}
          <div className="flex flex-col min-w-0">
            <span className="font-label-caps text-[10px] text-on-surface-variant flex items-center justify-center gap-1">
              {TIPO_ICON.WR} WORLD RECORD
            </span>
            <span className="mt-1 flex justify-center">{renderTempo(recordWr, 'plain')}</span>
            {sottoRecord(recordWr, 'WPS', 'primary')}
          </div>
          {/* Italiano in evidenza */}
          <div className="flex flex-col bg-surface-container-lowest rounded-md p-1 shadow-sm min-w-0">
            <span className="font-label-caps text-[10px] text-tertiary font-bold flex items-center justify-center gap-1">
              {TIPO_ICON.ITA} REC. {itaInEvidenza?.cat.toUpperCase() ?? 'ITALIA'}
            </span>
            <span className="mt-1 flex justify-center">{renderTempo(itaInEvidenza?.record ?? null, 'tertiary')}</span>
            {sottoRecord(itaInEvidenza?.record ?? null, 'FINP', 'tertiary')}
          </div>
          {/* Europeo */}
          <div className="flex flex-col min-w-0">
            <span className="font-label-caps text-[10px] text-on-surface-variant flex items-center justify-center gap-1">
              {TIPO_ICON.EUR} EUROPEO
            </span>
            <span className="mt-1 flex justify-center">{renderTempo(recordEur, 'secondary')}</span>
            {sottoRecord(recordEur, 'EUR', 'secondary')}
          </div>
        </div>

        {/* Live Squad Telemetry Matchup */}
        {atletaSel && (
          <div className="mt-2.5 pt-2 bg-surface-container/50 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-headline-sm font-bold shadow-sm shrink-0">
                {`${atletaSel.cognome?.[0] ?? ''}${atletaSel.nome?.[0] ?? ''}`}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-body-bold text-body-bold text-on-surface leading-none truncate">
                    {atletaSel.nome} {atletaSel.cognome}
                  </span>
                  {atletaSel.classeS != null && (
                    <span className="font-label-caps text-[9px] px-1 py-0.2 rounded bg-primary text-on-primary shrink-0">S{atletaSel.classeS}</span>
                  )}
                </div>
                <span className="font-label-caps text-[10px] text-on-surface-variant mt-0.5 truncate">
                  {migliorTempo
                    ? `PB: ${formattaTempo(migliorTempo.centesimi)} · ${formattaData(migliorTempo.data)}`
                    : 'Nessun tempo gara registrato'}
                </span>
              </div>
            </div>
            {migliorTempo && (
              <div className="flex flex-col items-end shrink-0">
                <span className="font-headline-sm text-headline-sm text-secondary font-bold tabular-nums">
                  {formattaTempo(migliorTempo.centesimi)}
                </span>
                <span className="font-label-caps text-[9px] px-1.5 py-0.5 rounded-full bg-secondary-fixed-dim text-on-secondary-fixed">
                  Confronto attivo
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secondary Benchmarks Mini-List (altre categorie italiane) */}
      {itaAltre.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-label-caps text-label-caps text-on-surface-variant px-1 flex items-center justify-between">
            <span>ALTRE CATEGORIE {eventoEffettivo.toUpperCase()} · {classeEffettiva}</span>
            <span>REC. ITALIA</span>
          </div>
          <Table
            columns={[
              {
                key: 'categoria',
                header: 'Categoria',
                className: 'w-[34%]'
              },
              { key: 'dettaglio', header: 'Dettaglio' },
              { key: 'tempo', header: 'Record', align: 'right', numeric: true },
              { key: 'data', header: 'Data', align: 'right', className: 'w-[70px]' }
            ]}
            rows={itaAltre.map(({ cat, record }) => ({
              categoria: (
                <span className="font-body-bold text-body-bold text-on-surface truncate block">{cat}</span>
              ),
              dettaglio: (
                <span className="text-on-surface-variant truncate block">
                  {record ? (record.d ?? record.m ?? 'Record ufficiale') : 'Non disponibile'}
                </span>
              ),
              tempo: record ? (
                <span className="font-headline-sm text-headline-sm tabular-nums">{record.tm}</span>
              ) : (
                <span className="text-on-surface-variant">—</span>
              ),
              data: record?.dt ? (
                <span className="text-on-surface-variant tabular-nums">{record.dt}</span>
              ) : (
                ''
              )
            }))}
            onRowClick={(_row, index) => {
              const record = itaAltre[index]?.record;
              if (record) setRecordInfo(record);
            }}
          />
        </div>
      )}

      {/* Athlete comparison */}
      {atletaSel && (
        <div className="ds-card p-3 shadow-card space-y-2">
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <span>Confronto di {atletaSel.nome} {atletaSel.cognome} con i record</span>
          </h3>

          {!migliorTempo ? (
            <p className="text-xs text-on-surface-variant">
              Nessun tempo di gara registrato per {atletaSel.nome} su {eventoEffettivo} in vasca {vasca}m.
              Inserisci un tempo in Dati → Tempi per confrontarlo con i record.
            </p>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-label-caps text-[10px] text-on-primary/80 uppercase block">Miglior tempo di gara</span>
                  <span className="text-xs font-semibold">{formattaData(migliorTempo.data)}</span>
                </div>
                <span className="font-stat-timer-mobile text-[26px] leading-none tabular-nums shrink-0">
                  {formattaTempo(migliorTempo.centesimi)}
                </span>
              </div>

              <div className="space-y-1.5">
                {confronti.map(({ label, record, confronto }) => {
                  if (!confronto) return null;
                  const Icon = confronto.migliore ? TrendingUp : TrendingDown;
                  const colore = confronto.migliore ? 'text-secondary' : 'text-error';
                  const segno = confronto.deltaCentesimi > 0 ? '+' : '';
                  return (
                    <div key={label} className="p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low/60 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-body-bold text-body-bold text-on-surface block truncate">{label}</span>
                        <button
                          type="button"
                          onClick={() => setRecordInfo(record)}
                          className="text-xs text-primary hover:underline underline-offset-2 tabular-nums"
                        >
                          {record.tm}
                        </button>
                      </div>
                      <div className={`text-right font-bold ${colore} flex flex-col items-end gap-0.5 shrink-0`}>
                        <div className="flex items-center gap-1">
                          <Icon size={14} />
                          <span className="tabular-nums">
                            {segno}{formattaTempo(Math.abs(confronto.deltaCentesimi))}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-semibold">
                            ({confronto.percentuale.toFixed(1)}%)
                          </span>
                        </div>
                        {confronto.puntiWPS != null && (
                          <span className="font-label-caps text-[9px] px-1.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold">
                            {confronto.puntiWPS} Punti WPS
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-on-surface-variant flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  Il confronto usa il miglior tempo di gara dell'atleta per l'evento. La percentuale indica il rapporto
                  col record (100% = pari al record). Non è una classifica ufficiale: per il ranking reale servono i
                  risultati completi delle gare.
                </span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Source note */}
      <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant flex items-start gap-2">
        <BadgeCheck size={14} className="mt-0.5 shrink-0 text-secondary" />
        <span>
          {meta.nota} Dati consultabili offline (snapshot). Per gli aggiornamenti ufficiali:{' '}
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-primary font-semibold underline">
            {meta.url}
          </a>
        </span>
      </div>

      {recordInfo && (
        <Modal
          open={!!recordInfo}
          onClose={() => setRecordInfo(null)}
          title="Dettagli record"
          size="sm"
        >
          <div className="space-y-4 text-on-surface">
            <div className="min-w-0">
              <p className="font-label-caps text-label-caps uppercase text-primary flex items-center gap-1.5">
                {TIPO_ICON[recordInfo.t]} {TIPO_LABEL[recordInfo.t]} · {recordInfo.ev} · {recordInfo.cl}
              </p>
              <h3 className="font-headline font-bold text-3xl tabular-nums tracking-tight">{recordInfo.tm}</h3>
            </div>
            <dl className="space-y-3 border-t border-outline-variant/60 pt-3 text-sm">
              <div className="flex items-start gap-2">
                <User size={16} className="mt-0.5 shrink-0 text-primary" />
                <div><dt className="font-label-caps text-[10px] text-on-surface-variant uppercase">Detentore</dt><dd className="font-semibold">{recordInfo.d ?? 'Non indicato'}</dd></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                <div><dt className="font-label-caps text-[10px] text-on-surface-variant uppercase">Luogo</dt><dd className="font-semibold">{recordInfo.l ?? 'Non indicato'}</dd></div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays size={16} className="mt-0.5 shrink-0 text-primary" />
                <div><dt className="font-label-caps text-[10px] text-on-surface-variant uppercase">Data</dt><dd className="font-semibold">{recordInfo.dt ?? 'Non indicata'}</dd></div>
              </div>
              {recordInfo.m && <div><dt className="font-label-caps text-[10px] text-on-surface-variant uppercase">Manifestazione</dt><dd className="font-semibold">{recordInfo.m}</dd></div>}
            </dl>
          </div>
        </Modal>
      )}
    </div>
  );
};
