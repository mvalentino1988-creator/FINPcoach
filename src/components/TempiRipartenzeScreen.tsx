import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../data/AppContext';
import { ContestoTempo, Stile, Tempo } from '../types';
import { formattaData, parseData, todayISO } from '../domain/dateUtils';
import { formattaTempo, parseTempo, primatiPersonali, convertiVasca, calcolaPuntiWPS } from '../domain/tempoUtils';
import { CalcoloRitmiRipartenze } from '../domain/calcoloRitmiRipartenze';
import { CalcoloScienzaNuoto } from '../domain/calcoloCSS';
import { RecordService } from '../domain/recordService';
import { BadgeCodice } from './BadgeCodice';
import { CODICI_KEYS } from '../domain/codici';
import { OCRService } from '../domain/ocrService';
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
  Bot,
  ArrowRightLeft
} from 'lucide-react';

interface Props {
  /** Testo OCR di una gara da importare (arriva dalla scheda Schede). */
  initialOcrText?: string | null;
  /** Notifica che il testo iniziale e' stato preso in carico. */
  onInitialOcrConsumed?: () => void;
  /** Callback quando l'OCR riconosce una scheda di allenamento. */
  onTestoScheda?: (testo: string) => void;
}

export const TempiRipartenzeScreen: React.FC<Props> = ({
  initialOcrText = null,
  onInitialOcrConsumed,
  onTestoScheda,
}) => {
  const { atleti, tempi, micro, meso, aggiungiTempo, eliminaTempo } = useApp();

  const [atletaSelId, setAtletaSelId] = useState<number | null>(() => atleti[0]?.id ?? null);
  const atletaSel = atleti.find(a => a.id === (atletaSelId ?? atleti[0]?.id)) ?? atleti[0] ?? null;

  // OCR modal
  const [mostraImport, setMostraImport] = useState(false);
  const [testoImport, setTestoImport] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrGaraModalOpen, setOcrGaraModalOpen] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');

  // Testo OCR in arrivo dalla scheda Schede: apre direttamente l'import tempi.
  const ultimoTestoGestito = useRef<string | null>(null);
  useEffect(() => {
    if (!initialOcrText) return;
    if (ultimoTestoGestito.current === initialOcrText) return;
    ultimoTestoGestito.current = initialOcrText;
    setOcrRawText(initialOcrText);
    setOcrGaraModalOpen(true);
    onInitialOcrConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOcrText]);

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
      <div className="p-8 text-center ds-card">
        <User size={36} className="mx-auto text-outline mb-2" />
        <h3 className="font-bold text-on-surface">Nessun atleta registrato</h3>
        <p className="text-xs text-on-surface-variant mt-1">Aggiungi un atleta nella sezione Atleti per inserire tempi e calcolare ripartenze.</p>
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
        <h2 className="ds-title flex items-center gap-2">
          <Timer size={22} className="text-primary-container" />
          <span>Tempi Gara & Calcolo Ripartenze</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Gestione cronometrica, tabelle di andatura e ripartenze A1–D.
        </p>
      </div>

      {/* Athlete Dropdown Selector */}
      <div className="ds-card p-3 shadow-card flex items-center gap-3">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0">
          Atleta:
        </span>
        <select
          value={atletaSel.id}
          onChange={(e) => setAtletaSelId(Number(e.target.value))}
          className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-bold text-on-surface text-xs"
        >
          {atleti.map(a => (
            <option key={a.id} value={a.id}>{a.cognome} {a.nome} (S{a.classeS ?? '?'})</option>
          ))}
        </select>
      </div>

      {/* Form Check Alert Card */}
      {formCheck && formCheck.necessario && (
        <div className="p-3.5 bg-surface-container-low/80 border border-tertiary-fixed-dim rounded-xl space-y-1 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-on-tertiary-fixed text-sm">
            <Timer size={16} className="text-tertiary-container" />
            <span>{formCheck.titoloTest}</span>
          </div>
          <p className="text-on-tertiary-fixed">{formCheck.motivazione}</p>
        </div>
      )}

      {/* CSS Critical Swim Speed Card */}
      {cssResult && (
        <div className="p-4 bg-gradient-to-r from-surface-container-low to-blue-50 border border-primary-fixed-dim rounded-xl shadow-card flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-primary-container font-bold uppercase tracking-wider">
              <Flame size={15} className="text-primary-container" />
              <span>Velocità Critica CSS (B1)</span>
            </div>
            <p className="text-on-surface-variant text-[11px] mt-0.5">{cssResult.spiegazioneMetodologica}</p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary font-bold text-xs shrink-0">
            {cssResult.passo100mFormatted} /100m
          </span>
        </div>
      )}

      {/* Tabella Ritmi & Ripartenze a 5 secondi (Compatta senza note) */}
      {tabellaRitmi && (
        <div className="ds-card p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
            <h3 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Tabella Ritmi A1–D · Passo 100m & Ripartenze
            </h3>
            <span className="text-xs text-primary-container font-bold">
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
                  className="p-2.5 rounded-xl border border-slate-200/70 bg-surface-container-low/50 flex flex-col justify-between text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <BadgeCodice codice={k} />
                    <span className="font-bold text-on-surface text-[11px]">{r.passo100mFormatted}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant font-medium">Rip:</span>
                    <span className="font-bold text-primary-container">{r.ripartenzaFormatted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Personal Bests (1 per gara e distanza) */}
      <Sezione titolo="Primati Personali in Gara" icon={<Award size={15} className="text-tertiary-container" />} badge={primati.length} riepilogoChiuso={`${primati.length} primati registrati`} storageKey="tempi_primati" defaultAperto={false}>
        {primati.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">Nessun primato di gara registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {primati.map((p, i) => (
              <div
                key={i}
                className="p-3 bg-surface-container-low/40 border border-tertiary-fixed-dim rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-on-surface block">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m ({p.vascaMetri}m)
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{formattaData(p.data)}</span>
                </div>
                <span className="font-bold text-primary-container text-sm">
                  {formattaTempo(p.centesimi)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Sezione>

      {/* Add New Time Form (Compact with unified OCR button) */}
      <div className="ds-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-2">
            <Plus size={15} className="text-primary-container" />
            <span>Registra Nuovo Tempo / Test</span>
          </h3>
          <label className="px-3 py-1.5 bg-surface-container-low hover:bg-primary-fixed text-primary-container border border-primary-fixed-dim rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
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
                try {
                  const risultato = await OCRService.riconosci(file, 'auto');
                  setOcrLoading(false);
                  if (!risultato.testo) return;
                  if (risultato.modalita === 'scheda' && onTestoScheda) {
                    // Il testo e' una scheda di allenamento: si torna alla scheda Schede.
                    onTestoScheda(risultato.testo);
                    return;
                  }
                  setOcrRawText(risultato.testo);
                  setOcrGaraModalOpen(true);
                } catch (err) {
                  setOcrLoading(false);
                  console.error('Errore OCR:', err);
                } finally {
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>

        <form onSubmit={handleSalvaTempo} className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Data</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="w-full px-3 h-11 border border-outline-variant rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Distanza (m)</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Tempo (es. 1:04.20)</label>
              <input
                type="text"
                placeholder="es. 1:04.20"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="w-full px-3 h-11 border border-outline-variant rounded-xl font-bold text-sm text-primary-container"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Stile</label>
              <select
                value={stile}
                onChange={e => setStile(e.target.value as Stile)}
                className="w-full px-3 h-11 bg-surface-container-low border border-outline-variant rounded-xl font-semibold text-on-surface"
              >
                <option value="STILE_LIBERO">Stile libero</option>
                <option value="DORSO">Dorso</option>
                <option value="RANA">Rana</option>
                <option value="FARFALLA">Farfalla</option>
                <option value="MISTI">Misti</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Contesto</label>
              <select
                value={contesto}
                onChange={e => setContesto(e.target.value as ContestoTempo)}
                className="w-full px-3 h-11 bg-surface-container-low border border-outline-variant rounded-xl font-semibold text-on-surface"
              >
                <option value="GARA">Gara</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="TEST">Test</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">Vasca</label>
              <select
                value={vasca}
                onChange={e => setVasca(Number(e.target.value))}
                className="w-full px-3 h-11 bg-surface-container-low border border-outline-variant rounded-xl font-semibold text-on-surface"
              >
                <option value={25}>Vasca 25m</option>
                <option value={50}>Vasca 50m</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!formValido}
            className="w-full h-11 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-bold rounded-xl text-xs transition shadow-card"
          >
            Registra Tempo
          </button>
        </form>
      </div>

      {/* Storico Completo (Apribile a richiesta tramite Sezione) */}
      <Sezione titolo="Storico Tutti i Tempi Registrati" icon={<Clock size={16} />} badge={tempiAtleta.length} riepilogoChiuso={`${tempiAtleta.length} tempi in archivio`} storageKey="tempi_storico_completo" defaultAperto={false}>
        {tempiAtleta.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">Nessun tempo registrato per questo atleta.</p>
        ) : (
          <div className="space-y-1.5 pt-1">
            {tempiAtleta.map(t => {
              // Calcolo Punti WPS rispetto al World Record per classe
              const cl = atletaSel ? RecordService.classePerStile(atletaSel, t.stile) : null;
              const ev = RecordService.eventoPerTempo(t);
              const wr = cl ? RecordService.recordInternazionale(t.vascaMetri, ev, 'M', cl, 'WR') || RecordService.recordInternazionale(t.vascaMetri, ev, 'F', cl, 'WR') : null;
              const wrCent = wr ? RecordService.tempoCentesimi(wr.tm) : null;
              const puntiWps = wrCent ? calcolaPuntiWPS(t.centesimi, wrCent) : null;

              // Conversione automatica 25m <-> 50m
              const vascaDest = t.vascaMetri === 25 ? 50 : 25;
              const tempoConvertito = convertiVasca(t.centesimi, t.distanzaMetri, t.vascaMetri as 25 | 50, vascaDest, atletaSel?.classeS ?? 9);

              return (
                <div
                  key={t.id}
                  className="p-3 bg-surface-container-low border border-slate-200/70 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-on-surface">
                        {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                      </span>
                      <span className="font-bold text-primary-container text-sm">{formattaTempo(t.centesimi)}</span>
                      {puntiWps != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-tertiary-fixed text-on-tertiary-fixed">
                          {puntiWps} Punti WPS
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m</span>
                      <span>•</span>
                      <span className="text-secondary font-semibold flex items-center gap-0.5" title={`Tempo convertito vasca da ${vascaDest}m`}>
                        <ArrowRightLeft size={10} />
                        ~{formattaTempo(tempoConvertito)} in vasca {vascaDest}m
                      </span>
                      {t.note && <span>• {t.note}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => eliminaTempo(t.id)}
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container-high"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
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
