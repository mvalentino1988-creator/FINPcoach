import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { ContestoTempo, Stile, Tempo } from '../types';
import { formattaData, parseData, todayISO } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali } from '../domain/tempoUtils';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { BadgeCodice } from './BadgeCodice';
import { CODICI_KEYS } from '../domain/codici';
import {
  AlertTriangle,
  Award,
  Check,
  Clock,
  FileText,
  Flame,
  Info,
  Plus,
  Timer,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';

export const TempiRipartenzeScreen: React.FC = () => {
  const { atleti, tempi, micro, meso, aggiungiTempo, eliminaTempo } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === (atletaSelId ?? atleti[0]?.id)) ?? atleti[0] ?? null;

  // OCR modal
  const [mostraImport, setMostraImport] = useState(false);
  const [testoImport, setTestoImport] = useState('');

  // Manual entry form
  const [dataTesto, setDataTesto] = useState<string>(formattaData(todayISO()));
  const [stile, setStile] = useState<Stile>('STILE_LIBERO');
  const [distanza, setDistanza] = useState('100');
  const [tempoTesto, setTempoTesto] = useState('');
  const [contesto, setContesto] = useState<ContestoTempo>('GARA');
  const [vasca, setVasca] = useState<number>(25);
  const [note, setNote] = useState('');

  const oggi = todayISO();
  const dataParsed = parseData(dataTesto);
  const distInt = parseInt(distanza, 10);
  const centesimi = parseTempo(tempoTesto);
  const formValido = dataParsed != null && !isNaN(distInt) && distInt >= 25 && centesimi != null;

  const tempiAtleta = useMemo(() => {
    return atletaSel ? tempi.filter(t => t.atletaId === atletaSel.id) : [];
  }, [atletaSel, tempi]);

  const mesoCorrente = useMemo(() => {
    const mi = micro.find(m => m.inizio <= oggi && m.fine >= oggi);
    return mi ? meso.find(me => me.id === mi.mesocicloId) : null;
  }, [micro, meso, oggi]);

  // Form check assessment
  const formCheck = useMemo(() => {
    if (!atletaSel) return null;
    return CalcoloRitmiRipartenze.valutaNecessitaFormCheck(atletaSel, tempiAtleta, mesoCorrente);
  }, [atletaSel, tempiAtleta, mesoCorrente]);

  // CSS Critical Swim Speed calculation (using 400m and 100m)
  const cssResult = useMemo(() => {
    const t400 = tempiAtleta.filter(t => t.distanzaMetri === 400).sort((a, b) => b.data.localeCompare(a.data))[0];
    const t100 = tempiAtleta.filter(t => t.distanzaMetri === 100).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (t400 && t100) {
      return CalcoloScienzaNuoto.calcolaCSS(t400.centesimi, t100.centesimi);
    }
    return null;
  }, [tempiAtleta]);

  // Sendoff table for A1-D
  const tabellaRitmi = useMemo(() => {
    if (!atletaSel) return null;
    const t100 = tempiAtleta.filter(t => t.distanzaMetri === 100).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (!t100) return null;
    return CalcoloRitmiRipartenze.calcolaTabellaRitmi(atletaSel.id, t100.centesimi, t100.stile, t100.vascaMetri);
  }, [atletaSel, tempiAtleta]);

  const primati = useMemo(() => {
    return primatiPersonali(tempiAtleta);
  }, [tempiAtleta]);

  if (!atletaSel) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <User size={36} className="mx-auto text-slate-300 mb-2" />
        <h3 className="font-bold text-slate-700">Nessun atleta registrato</h3>
        <p className="text-xs text-slate-500 mt-1">Aggiungi un atleta nella sezione Atleti per inserire tempi e calcolare ripartenze.</p>
      </div>
    );
  }

  const handleSalvaTempo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValido || !dataParsed || !centesimi) return;

    aggiungiTempo({
      atletaId: atletaSel.id,
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

  const handleImportOCR = () => {
    const importati = CalcoloRitmiRipartenze.parseImportaTempi(testoImport);
    for (const t of importati) {
      aggiungiTempo({
        atletaId: atletaSel.id,
        data: todayISO(),
        stile: t.stile,
        distanzaMetri: t.distanzaMetri,
        centesimi: t.centesimi,
        contesto: t.contesto,
        vascaMetri: 25,
        note: t.note
      });
    }
    setMostraImport(false);
    setTestoImport('');
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Timer size={22} className="text-[#006874]" />
          <span>Tempi Gara & Calcolo Ripartenze</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Carica tempi passati (o da screenshot/OCR) per calcolare automaticamente la velocità critica CSS,
          le tabelle di andatura e le ripartenze a 5 secondi per ogni codice A1–D.
        </p>
      </div>

      {/* Athlete selector */}
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

      {/* Form Check Alert Card */}
      {formCheck && formCheck.necessario && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <Timer size={18} className="text-amber-600" />
            <span>{formCheck.titoloTest}</span>
          </div>
          <p className="text-amber-900">{formCheck.motivazione}</p>
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-amber-950 font-medium">
            <strong>Istruzioni in Vasca: </strong>{formCheck.istruzioniVasca}
          </div>
        </div>
      )}

      {/* CSS Critical Swim Speed Card */}
      {cssResult && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#006874] font-black text-sm uppercase tracking-wider">
              <Flame size={18} className="text-[#006874]" />
              <span>Calcolo Scientifico CSS (Velocità Critica / Soglia B1)</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#006874] text-white font-bold text-xs">
              {cssResult.passo100mFormatted} / 100m
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">{cssResult.spiegazioneMetodologica}</p>
        </div>
      )}

      {/* Tabella Ritmi & Ripartenze a 5 secondi */}
      {tabellaRitmi ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Tabella Ritmi & Ripartenze a 5 Secondi · {atletaSel.nome}
              </h3>
              <p className="text-xs text-[#006874] font-semibold">
                Calcolata sul tempo base 100m ({tabellaRitmi.stileRiferimento.replace('_', ' ')}):{' '}
                {formattaTempo(tabellaRitmi.tempoRiferimento100mCentesimi)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CODICI_KEYS.map(k => {
              const r = tabellaRitmi.ritmi[k];
              if (!r) return null;
              return (
                <div
                  key={k}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BadgeCodice codice={k} />
                      <span className="font-bold text-slate-800">{r.passo100mFormatted} / 100m</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{r.noteTecniche}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-cyan-100 text-[#006874] font-black text-xs">
                      {r.ripartenzaFormatted}
                    </span>
                    <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                      {r.pausaFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
          Nessun tempo di riferimento sui 100m registrato per {atletaSel.nome}.
          Inserisci un tempo nei 100m stile libero di seguito o importa da testo per calcolare la tabella delle ripartenze.
        </div>
      )}

      {/* Button Open OCR Import */}
      <button
        onClick={() => setMostraImport(true)}
        className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-2xl text-xs font-bold transition shadow-xs"
      >
        <Upload size={16} className="text-[#006874]" />
        <span>Importa Tempi da Screenshot / Testo OCR 📄</span>
      </button>

      {/* Add New Time Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Plus size={16} className="text-[#006874]" />
          <span>Aggiungi Nuovo Tempo Gara / Test per {atletaSel.nome}</span>
        </h3>

        <form onSubmit={handleSalvaTempo} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Data (gg/mm/aaaa) *</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Distanza (metri) *</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tempo (es. 1:04.20 o 29.10) *</label>
              <input
                type="text"
                placeholder="es. 1:04.20"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-sm text-[#006874]"
              />
            </div>
          </div>

          {/* Stili Chips */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Stile</label>
            <div className="flex flex-wrap gap-1.5">
              {(['STILE_LIBERO', 'DORSO', 'RANA', 'FARFALLA', 'MISTI'] as Stile[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStile(s)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                    stile === s ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Contesto e Vasca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Contesto</label>
              <div className="flex gap-1.5">
                {(['GARA', 'ALLENAMENTO', 'TEST'] as ContestoTempo[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContesto(c)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                      contesto === c ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {c.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Vasca</label>
              <div className="flex gap-1.5">
                {[25, 50].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVasca(v)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                      vasca === v ? 'bg-[#006874] text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Vasca {v}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Note (opzionale)</label>
            <input
              type="text"
              placeholder="es. Campionati Italiani, finale pomeridiana..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={!formValido}
            className="w-full py-2.5 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            Salva Tempo
          </button>
        </form>
      </div>

      {/* Official Personal Bests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          <span>Primati Personali Ufficiali in Gara ({primati.length})</span>
        </h3>

        {primati.length === 0 ? (
          <p className="text-xs text-slate-400">Nessun tempo di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
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

      {/* All Recorded Times */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Clock size={16} className="text-slate-600" />
          <span>Storico Tutti i Tempi Registrati ({tempiAtleta.length})</span>
        </h3>

        {tempiAtleta.length === 0 ? (
          <p className="text-xs text-slate-400">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-1.5">
            {tempiAtleta.map(t => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                    </span>
                    <span className="font-black text-[#006874] text-sm">{formattaTempo(t.centesimi)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>

                <button
                  onClick={() => eliminaTempo(t.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal OCR Import */}
      {mostraImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Importa Tempi da Screenshot / Testo OCR
              </h3>
              <button onClick={() => setMostraImport(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Incolla qui il testo estratto dal report della gara, dal tabellone o dallo screenshot del cronometro.
              L'algoritmo riconoscerà automaticamente tempi, distanze (50, 100, 200, 400m) e stili.
            </p>

            <textarea
              rows={6}
              value={testoImport}
              onChange={e => setTestoImport(e.target.value)}
              placeholder="es. 100 Stile Libero 1:04.35 finale&#10;50 Dorso gara 29.80"
              className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostraImport(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={!testoImport.trim()}
                onClick={handleImportOCR}
                className="px-5 py-2 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Analizza e Importa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
