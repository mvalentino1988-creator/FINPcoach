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
import { TestCalibrazioneModal } from './TestCalibrazioneModal';
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
  Sparkles,
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
  const [testModalOpen, setTestModalOpen] = useState(false);

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
    return CalcoloRitmiRipartenze.calcolaTabellaRitmi(
      atletaSel.id,
      t100.centesimi,
      t100.stile,
      t100.vascaMetri,
      cssResult?.passo100mCentesimi
    );
  }, [atletaSel, tempiAtleta, cssResult]);

  const primati = useMemo(() => {
    return primatiPersonali(tempiAtleta);
  }, [tempiAtleta]);

  if (!atletaSel) {
    return (
      <div className="p-8 text-center ds-card">
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3">
          <User size={24} className="text-outline" />
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Nessun atleta registrato</h3>
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
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Tempi Gara &amp; Calcolo Ripartenze</h2>
          <p className="font-label-caps text-label-caps text-on-surface-variant truncate">
            Cronsometria, tabelle di andatura e ripartenze A1–D
          </p>
        </div>
      </div>

      {/* Athlete banner selector */}
      <div className="ds-card p-3 shadow-card flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-on-primary-fixed-variant shrink-0">
          <User size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase block">Atleta attivo</span>
          <select
            value={atletaSel.id}
            onChange={(e) => setAtletaSelId(Number(e.target.value))}
            className="w-full bg-transparent font-headline-sm text-headline-sm text-on-surface border-0 p-0 focus:ring-0 cursor-pointer"
          >
            {atleti.map(a => (
              <option key={a.id} value={a.id}>{a.cognome} {a.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form Check Alert Card */}
      {formCheck && formCheck.necessario && (
        <div className="p-3.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm space-y-2 text-xs text-on-surface">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 font-bold text-on-surface text-sm min-w-0">
              <span className="w-8 h-8 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                <Timer size={16} />
              </span>
              <span className="truncate">{formCheck.titoloTest}</span>
            </div>
            <button
              type="button"
              onClick={() => setTestModalOpen(true)}
              className="ds-btn-primary !min-h-[40px] !px-3 text-xs shrink-0"
            >
              <Sparkles size={14} />
              <span>Esegui Test Ora</span>
            </button>
          </div>
          <p className="text-on-surface-variant pl-11">{formCheck.motivazione}</p>
        </div>
      )}

      {testModalOpen && (
        <TestCalibrazioneModal
          atleta={atletaSel}
          onClose={() => setTestModalOpen(false)}
          onSalvaTempo={(t) => {
            aggiungiTempo(t);
            setTestModalOpen(false);
          }}
        />
      )}

      {/* CSS Critical Swim Speed Card (bento) */}
      {cssResult && (
        <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Flame size={16} className="text-tertiary shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Critical Swim Speed (CSS)</span>
              <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-primary-fixed/40 text-primary font-bold whitespace-nowrap">T-400 / T-100</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-low p-2 rounded-lg flex flex-col min-w-0">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">Passo 100m (B1)</span>
              <span className="font-stat-timer-mobile text-[24px] text-primary tracking-tight tabular-nums mt-0.5">
                {cssResult.passo100mFormatted}
              </span>
              <span className="font-label-caps text-[10px] text-secondary font-bold truncate">{cssResult.spiegazioneMetodologica}</span>
            </div>
            <div className="bg-gradient-to-br from-surface-container to-surface-container-high p-2 rounded-lg flex flex-col justify-center">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold">Soglia aerobica</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">Velocità Critica</span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">Usata per i ritmi A1–D</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabella Ritmi & Ripartenze a 5 secondi */}
      {tabellaRitmi && (
        <div className="ds-card p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                Tabella Ritmi A1–D
              </h3>
            </div>
            <span className="font-label-caps text-label-caps text-primary font-bold whitespace-nowrap tabular-nums">
              100m: {formattaTempo(tabellaRitmi.tempoRiferimento100mCentesimi)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CODICI_KEYS.map(k => {
              const r = tabellaRitmi.ritmi[k];
              if (!r) return null;
              return (
                <div
                  key={k}
                  className="p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low flex flex-col justify-between text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <BadgeCodice codice={k} />
                    <span className="font-stat-timer-mobile text-[15px] text-on-surface tabular-nums leading-none">{r.passo100mFormatted}</span>
                  </div>
                  <div className="pt-1.5 border-t border-outline-variant/60 flex items-center justify-between">
                    <span className="font-label-caps text-[9px] text-on-surface-variant uppercase">Ripartenza</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold tabular-nums">{r.ripartenzaFormatted}</span>
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
                className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-body-bold text-body-bold text-on-surface block truncate">
                    {p.stile.replace('_', ' ')} {p.distanzaMetri} m ({p.vascaMetri}m)
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
      </Sezione>

      {/* Add New Time Form */}
      <div className="ds-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="truncate">Registra Nuovo Tempo / Test</span>
          </h3>
          <label className="px-3 py-1.5 min-h-[40px] bg-surface-container-lowest hover:bg-primary-fixed/40 hover:text-on-primary-fixed-variant text-primary border border-primary/25 rounded-full font-label-caps text-label-caps cursor-pointer transition flex items-center gap-1.5 shrink-0 active:scale-95">
            {ocrLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            <span>{ocrLoading ? 'OCR…' : 'Screenshot'}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Data</label>
              <input
                type="text"
                value={dataTesto}
                onChange={e => setDataTesto(e.target.value)}
                className="ds-input !h-11"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Distanza (m)</label>
              <input
                type="number"
                value={distanza}
                onChange={e => setDistanza(e.target.value)}
                className="ds-input !h-11 font-bold"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Tempo (es. 1:04.20)</label>
              <input
                type="text"
                placeholder="es. 1:04.20"
                value={tempoTesto}
                onChange={e => setTempoTesto(e.target.value)}
                className="ds-input !h-11 font-bold text-base text-primary tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Stile</label>
              <select
                value={stile}
                onChange={e => setStile(e.target.value as Stile)}
                className="ds-select !h-11 font-semibold"
              >
                <option value="STILE_LIBERO">Stile libero</option>
                <option value="DORSO">Dorso</option>
                <option value="RANA">Rana</option>
                <option value="FARFALLA">Farfalla</option>
                <option value="MISTI">Misti</option>
              </select>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Contesto</label>
              <select
                value={contesto}
                onChange={e => setContesto(e.target.value as ContestoTempo)}
                className="ds-select !h-11 font-semibold"
              >
                <option value="GARA">Gara</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="TEST">Test</option>
              </select>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Vasca</label>
              <select
                value={vasca}
                onChange={e => setVasca(Number(e.target.value))}
                className="ds-select !h-11 font-semibold"
              >
                <option value={25}>Vasca 25m</option>
                <option value={50}>Vasca 50m</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!formValido}
            className="w-full h-12 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-headline-sm font-bold rounded-xl text-xs transition shadow-card active:scale-[0.99]"
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
                  className="p-2.5 bg-surface-container-low/70 rounded-lg border border-outline-variant/50 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body-bold text-body-bold text-on-surface">
                        {t.stile.replace('_', ' ')} {t.distanzaMetri} m
                      </span>
                      <span className="font-stat-timer-mobile text-[16px] text-primary tabular-nums leading-none">
                        {formattaTempo(t.centesimi)}
                      </span>
                      {puntiWps != null && (
                        <span className="font-label-caps text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed uppercase">
                          {puntiWps} WPS
                        </span>
                      )}
                    </div>
                    <div className="font-label-caps text-[10px] text-on-surface-variant mt-1 flex items-center gap-1.5 flex-wrap normal-case tracking-normal">
                      <span>{formattaData(t.data)} · {t.contesto.toLowerCase()} · vasca {t.vascaMetri}m</span>
                      <span>•</span>
                      <span className="text-primary font-semibold flex items-center gap-0.5" title={`Tempo convertito vasca da ${vascaDest}m`}>
                        <ArrowRightLeft size={10} />
                        ~{formattaTempo(tempoConvertito)} in vasca {vascaDest}m
                      </span>
                      {t.note && <span>• {t.note}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => eliminaTempo(t.id)}
                    className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/50 transition shrink-0"
                    aria-label="Elimina tempo"
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
