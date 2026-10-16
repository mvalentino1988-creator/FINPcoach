import React, { useMemo, useState } from 'react';
import { useApp } from '../data/AppContext';
import { RecordService, RecordFINP, CATEGORIE_ITA } from '../domain/recordService';
import { formattaTempo } from '../domain/tempoUtils';
import { formattaData } from '../domain/dateUtils';
import { Trophy, Medal, Globe, User, Info, Flag, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export const RecordScreen: React.FC = () => {
  const { atleti, tempi } = useApp();
  const meta = RecordService.meta();

  const [vasca, setVasca] = useState<number>(50);
  const [genere, setGenere] = useState<string>('M');
  const [evento, setEvento] = useState<string>(() => RecordService.eventiIndividuali(50)[0] ?? '');
  const [classe, setClasse] = useState<string>('');
  const [atletaSelId, setAtletaSelId] = useState<number | null>(null);

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

  const migliorTempo = useMemo(() => {
    if (!atletaSel) return null;
    return RecordService.migliorTempoAtleta(tempi, atletaSel.id, vasca, eventoEffettivo);
  }, [atletaSel, tempi, vasca, eventoEffettivo]);

  const confronti = useMemo(() => {
    if (!migliorTempo) return [];
    const righe: { label: string; record: RecordFINP | null }[] = [
      { label: 'Record Italiano Assoluto', record: recordIta.find(r => r.cat === 'Assoluto')?.record ?? null },
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

  const cambiaVasca = (v: number) => {
    setVasca(v);
    const evs = RecordService.eventi(v);
    if (!evs.includes(evento)) setEvento(RecordService.eventiIndividuali(v)[0] ?? evs[0] ?? '');
  };

  const cambiaEvento = (ev: string) => {
    setEvento(ev);
    setClasse('');
  };

  const cambiaGenere = (g: string) => {
    setGenere(g);
    setClasse('');
  };

  const renderRecord = (r: RecordFINP | null, accent: string) => {
    if (!r) {
      return <span className="text-xs text-slate-400 italic">non disponibile</span>;
    }
    return (
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-black text-base ${accent}`}>{r.tm}</span>
        <span className="text-[11px] text-slate-500 text-right leading-tight">
          {r.d ?? '—'}
          {r.n ? ` (${r.n})` : ''}
          {r.dt ? ` · ${r.dt}` : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" />
          <span>Record FINP · Italia / Europa / Mondo</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record ufficiali per classe e categoria, vasca 25m e 50m. Fonte: {meta.fonte} — aggiornati al {meta.aggiornato}.
        </p>
      </div>

      {/* Filtri & Selezione Compatta (A 1 Schermo) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Atleta di confronto */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Atleta di Confronto</label>
            <select
              value={atletaSelId ?? ''}
              onChange={(e) => setAtletaSelId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="">Nessun atleta (solo record)</option>
              {atleti.map(a => (
                <option key={a.id} value={a.id}>{a.cognome} {a.nome} (S{a.classeS ?? '?'})</option>
              ))}
            </select>
          </div>

          {/* Evento */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Evento</label>
            <select
              value={eventoEffettivo}
              onChange={(e) => cambiaEvento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              {eventi.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>

          {/* Classe */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Classe</label>
            <select
              value={classeEffettiva}
              onChange={(e) => setClasse(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              {classi.map(cl => <option key={cl} value={cl}>{cl}</option>)}
            </select>
          </div>
        </div>

        {/* Vasca & Genere (Pillole rapide) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1">Vasca:</span>
            {[25, 50].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => cambiaVasca(v)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  vasca === v ? 'bg-[#006874] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {v}m
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1">Genere:</span>
            {generi.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => cambiaGenere(g)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  genereEffettivo === g ? 'bg-[#006874] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {g === 'M' ? 'Maschile' : g === 'F' ? 'Femminile' : 'Mista'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">
            {eventoEffettivo} · {classeEffettiva} · {genereEffettivo === 'M' ? 'Maschile' : genereEffettivo === 'F' ? 'Femminile' : 'Mista'} · Vasca {vasca}m
          </h3>
        </div>

        {/* ITA */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#006874] font-black text-xs uppercase tracking-wider">
            {TIPO_ICON.ITA}
            <span>Record Italiani</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recordIta.map(({ cat, record }) => (
              <div key={cat} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{cat}</span>
                {renderRecord(record, 'text-[#006874]')}
                {record?.m && <p className="text-[10px] text-slate-400 line-clamp-1">{record.m}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* EUR + WR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1">
            <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-wider">
              {TIPO_ICON.EUR}
              <span>Record Europeo</span>
            </div>
            {renderRecord(recordEur, 'text-blue-700')}
            {recordEur?.m && <p className="text-[10px] text-slate-400 line-clamp-1">{recordEur.m}</p>}
          </div>
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider">
              {TIPO_ICON.WR}
              <span>Record Mondiale</span>
            </div>
            {renderRecord(recordWr, 'text-amber-700')}
            {recordWr?.m && <p className="text-[10px] text-slate-400 line-clamp-1">{recordWr.m}</p>}
          </div>
        </div>
      </div>

      {/* Athlete comparison */}
      {atletaSel && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <TrendingUp size={16} className="text-[#006874]" />
            <span>Confronto di {atletaSel.nome} {atletaSel.cognome} con i record</span>
          </h3>

          {!migliorTempo ? (
            <p className="text-xs text-slate-500">
              Nessun tempo di gara registrato per {atletaSel.nome} su {eventoEffettivo} in vasca {vasca}m.
              Inserisci un tempo in Dati → Tempi per confrontarlo con i record.
            </p>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-[#006874] text-white flex items-center justify-between">
                <span className="text-xs font-semibold">Miglior tempo di gara ({formattaData(migliorTempo.data)})</span>
                <span className="font-black text-lg">{formattaTempo(migliorTempo.centesimi)}</span>
              </div>

              <div className="space-y-2">
                {confronti.map(({ label, record, confronto }) => {
                  if (!confronto) return null;
                  const Icon = confronto.migliore ? TrendingUp : TrendingDown;
                  const colore = confronto.migliore ? 'text-emerald-600' : 'text-rose-600';
                  const segno = confronto.deltaCentesimi > 0 ? '+' : '';
                  return (
                    <div key={label} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block">{label}</span>
                        <span className="text-[11px] text-slate-500">{record.tm} · {record.d ?? '—'}</span>
                      </div>
                      <div className={`text-right font-bold ${colore} flex items-center gap-1`}>
                        <Icon size={14} />
                        <span>
                          {segno}{formattaTempo(Math.abs(confronto.deltaCentesimi))}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          ({confronto.percentuale.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
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
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {meta.nota} Dati consultabili offline (snapshot). Per gli aggiornamenti ufficiali:{' '}
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-[#006874] font-semibold underline">
            {meta.url}
          </a>
        </span>
      </div>
    </div>
  );
};
