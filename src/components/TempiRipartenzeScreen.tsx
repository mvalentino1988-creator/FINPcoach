import React, { useState, useMemo } from 'react';
import { useApp } from '../data/AppContext';
import { ContestoTempo, Stile, Tempo } from '../types';
import { formattaData, parseData, todayISO } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali } from '../domain/tempoUtils';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { BadgeCodice } from './BadgeCodice';
import { CODICI_KEYS } from '../domain/codici';
import { OcrWeb } from '../domain/ocrWeb';
import { OcrGaraModal } from './OcrGaraModal';
import { Sezione } from './Sezione';
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
  Camera,
  Loader2,
  X,
  Bot
} from 'lucide-react';

export const TempiRipartenzeScreen: React.FC = () => {
  const { atleti, tempi, micro, meso, aggiungiTempo, eliminaTempo } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === (atletaSelId ?? atleti[0]?.id)) ?? atleti[0] ?? null;

  // OCR modal
  const [mostraImport, setMostraImport] = useState(false);
  const [testoImport, setTestoImport] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrGaraModalOpen, setOcrGaraModalOpen] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');

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

  const formCheck = useMemo(() => {
    if (!atletaSel) return null;
    return CalcoloRitmiRipartenze.valutaNecessitaFormCheck(atletaSel, tempiAtleta, mesoCorrente);
  }, [atletaSel, tempiAtleta, mesoCorrente]);

  const cssResult = useMemo(() => {
    const t400 = tempiAtleta.filter(t => t.distanzaMetri === 400).sort((a, b) => b.data.localeCompare(a.data))[0];
    const t100 = tempiAtleta.filter(t => t.distanzaMetri === 100).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (t400 && t100) {
      return CalcoloScienzaNuoto.calcolaCSS(t400.centesimi, t100.centesimi);
    }
    return null;
  }, [tempiAtleta]);

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
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Timer size={22} className="text-[#006874]" />
          <span>Tempi Gara & Calcolo Ripartenze</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestione cronometrica, tabelle di andatura e ripartenze A1–D.
        </p>
      </div>

      {/* Athlete Dropdown Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
          Atleta:
        </span>
        <select
          value={atletaSel.id}
          onChange={(e) => setAtletaSelId(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs"
        >
          {atleti.map(a => (
            <option key={a.id} value={a.id}>{a.cognome} {a.nome} (S{a.classeS ?? '?'})</option>
          ))}
        </select>
      </div>

      {/* Form Check Alert Card */}
      {formCheck && formCheck.necessario && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <Timer size={16} className="text-amber-600" />
            <span>{formCheck.titoloTest}</span>
          </div>
          <p className="text-amber-900">{formCheck.motivazione}</p>
        </div>
      )}

      {/* CSS Critical Swim Speed Card */}
      {cssResult && (
        <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl shadow-xs flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-[#006874] font-black uppercase tracking-wider">
              <Flame size={15} className="text-[#006874]" />
              <span>Velocità Critica CSS (B1)</span>
            </div>
            <p className="text-slate-600 text-[11px] mt-0.5">{cssResult.spiegazioneMetodologica}</p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-[#006874] text-white font-black text-xs shrink-0">
            {cssResult.passo100mFormatted} /100m
          </span>
        </div>
      )}

      {/* Tabella Ritmi & Ripartenze a 5 secondi (Compatta senza note) */}
      {tabellaRitmi && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Tabella Ritmi A1–D · Passo 100m & Ripartenze
            </h3>
            <span className="text-xs text-[#006874] font-bold">
              Base 100m: {formattaTempo(tabellaRitmi.tempoRiferimento100mCentesimi)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CODICI_KEYS.map(k => {
              const r = tabellaRitmi.ritmi[k];
              if (!r) return null;
              return (
                <div
                  key={k}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <BadgeCodice codice={k} />
                    <span className="font-bold text-slate-800 text-[11px]">{r.passo100mFormatted}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Rip:</span>
                    <span className="font-black text-[#006874]">{r.ripartenzaFormatted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Personal Bests (1 per gara e distanza) */}
      <Sezione titolo="Primati Personali in Gara" icon={<Award size={15} className="text-amber-500" />} badge={primati.length} riepilogoChiuso={`${primati.length} primati registrati`} storageKey="tempi_primati" defaultAperto={false}>
        {primati.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Nessun primato di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m ({p.vascaMetri}m)
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
      </Sezione>

      {/* Add New Time Form (Compact with unified OCR button) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <Plus size={15} className="text-[#006874]" />
            <span>Registra Nuovo Tempo / Test</span>
          </h3>
          <label className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-[#006874] border border-cyan-200 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
            {ocrLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            <span>{ocrLoading ? 'OCR in corso...' : 'Carica Screenshot'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={ocrLoading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setOcrLoading(true);
                const testoOcr = await OcrWeb.riconosciTestoDaImmagine(file);
                setOcrLoading(false);
                if (testoOcr) {
                  setOcrRawText(testoOcr);
                  setOcrGaraModalOpen(true);
                }
              }}
            />
          </label>
        </div>

        <form onSubmit={handleSalvaTempo} className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Data</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 h-11 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Distanza (m)</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 h-11 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tempo (es. 1:04.20)</label>
              <input
                type="text"
                placeholder="es. 1:04.20"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="w-full px-3 h-11 border border-slate-300 rounded-xl font-black text-sm text-[#006874]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Stile</label>
              <select
                value={stile}
                onChange={e => setStile(e.target.value as Stile)}
                className="w-full px-3 h-11 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                <option value="STILE_LIBERO">Stile libero</option>
                <option value="DORSO">Dorso</option>
                <option value="RANA">Rana</option>
                <option value="FARFALLA">Farfalla</option>
                <option value="MISTI">Misti</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Contesto</label>
              <select
                value={contesto}
                onChange={e => setContesto(e.target.value as ContestoTempo)}
                className="w-full px-3 h-11 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                <option value="GARA">Gara</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="TEST">Test</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Vasca</label>
              <select
                value={vasca}
                onChange={e => setVasca(Number(e.target.value))}
                className="w-full px-3 h-11 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                <option value={25}>Vasca 25m</option>
                <option value={50}>Vasca 50m</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!formValido}
            className="w-full h-11 bg-[#006874] hover:bg-[#004f58] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            Registra Tempo
          </button>
        </form>
      </div>

      {/* Storico Completo (Apribile a richiesta tramite Sezione) */}
      <Sezione titolo="Storico Tutti i Tempi Registrati" icon={<Clock size={16} />} badge={tempiAtleta.length} riepilogoChiuso={`${tempiAtleta.length} tempi in archivio`} storageKey="tempi_storico_completo" defaultAperto={false}>
        {tempiAtleta.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-1.5 pt-1">
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
      </Sezione>

      <OcrGaraModal
        isOpen={ocrGaraModalOpen}
        initialRawText={ocrRawText}
        onConfirm={(tempiEstratti) => {
          if (atletaSel) {
            for (const t of tempiEstratti) {
              aggiungiTempo({
                atletaId: atletaSel.id,
                data: t.data,
                stile: t.stile,
                distanzaMetri: t.distanzaMetri,
                centesimi: t.centesimi,
                contesto: t.contesto,
                vascaMetri: t.vascaMetri,
                note: `OCR: ${t.luogo}`
              });
            }
          }
          setOcrGaraModalOpen(false);
        }}
        onCancel={() => setOcrGaraModalOpen(false)}
      />
    </div>
  );
};
