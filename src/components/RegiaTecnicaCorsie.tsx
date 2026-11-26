import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Play,
  Plus,
  Printer,
  Sliders,
  Trash2,
  Waves,
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { IndicatoreCodici } from './IndicatoreCodici';
import { RegiaNonAssegnati } from './RegiaNonAssegnati';
import { RegiaCorsiaCard } from './RegiaCorsiaCard';
import { RegiaSheetAtleta } from './RegiaSheetAtleta';
import { stampaRegiaCorsie } from './regiaStampa';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { formattaData, todayISO } from '../domain/dateUtils';
import { presentiEffettiviInData } from '../domain/assenze';
import { generaCodiciSeduta } from '../domain/generatoreCodiciSeduta';
import { CodiceAllenamentoKey } from '../types';
import {
  AssegnazioneVasca,
  applicaSuggerimento,
  assegnaAtleta,
  allineaConParametri,
  atletiAssegnati,
  atletiNonAssegnati,
  conData,
  corsiaPerNumero,
  MAX_CORISIE,
  nuovaAssegnazione,
  NUMERO_CORISIE_DEFAULT,
  rimuoviDaCorsia,
  svuotaCorsie,
} from '../domain/assegnazioneVasca';
import { useSessioneVasca, sessioneBloccaRegia, vaiAVistaVasca } from '../lib/vascaSessione';

const CODICI_VALIDI = new Set<CodiceAllenamentoKey>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D']);

const LONG_PRESS_MS = 500;

export const RegiaTecnicaCorsie: React.FC = () => {
  const {
    atleti, tempi, condizioni, micro, meso, stagione, assenze,
    assegnazioneVasca, salvaAssegnazioneVasca,
    parametriOggi, impostaOverrideSeduta,
  } = useApp();

  const oggi = todayISO();
  const vascaMetri: 25 | 50 = stagione?.vascaMetri === 25 ? 25 : 50;
  const sessione = useSessioneVasca();
  const bloccata = sessioneBloccaRegia(sessione);

  const [precedente, setPrecedente] = useState<AssegnazioneVasca | null>(null);
  if (assegnazioneVasca && assegnazioneVasca.data !== oggi && precedente !== assegnazioneVasca) {
    setPrecedente(assegnazioneVasca);
  }
  const [selezionato, setSelezionato] = useState<number | null>(null);
  const [sheetAtleta, setSheetAtleta] = useState<{ id: number; corsia: number | null } | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [nonPresentiAperto, setNonPresentiAperto] = useState(false);
  const [intensitaAperta, setIntensitaAperta] = useState(false);
  const [confermaSvuota, setConfermaSvuota] = useState(false);

  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);

  // Assegnazione "corrente" solo se di oggi; altrimenti la creiamo qui sotto.
  const corrente = assegnazioneVasca && assegnazioneVasca.data === oggi ? assegnazioneVasca : null;

  const presentiIds = useMemo(
    () => presentiEffettiviInData(oggi, atleti, assenze, parametriOggi.atletiPresentiIds),
    [parametriOggi.atletiPresentiIds, atleti, assenze, oggi]
  );
  const presentiSet = useMemo(() => new Set(presentiIds), [presentiIds]);

  // Inizializzazione: nessuna assegnazione automatica (corsie vuote, tutti i
  // presenti nei "Non assegnati"). Se c'è un'assegnazione di ieri la scartiamo
  // ma la teniamo disponibile come offerta di riuso.
  useEffect(() => {
    if (assegnazioneVasca == null) {
      salvaAssegnazioneVasca(
        nuovaAssegnazione(oggi, vascaMetri, parametriOggi.numeroCorsie ?? NUMERO_CORISIE_DEFAULT, presentiIds)
      );
      return;
    }
    if (assegnazioneVasca.data !== oggi) {
      salvaAssegnazioneVasca(
        nuovaAssegnazione(oggi, vascaMetri, parametriOggi.numeroCorsie ?? NUMERO_CORISIE_DEFAULT, presentiIds)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assegnazioneVasca?.data, oggi]);

  const update = (fn: (a: AssegnazioneVasca) => AssegnazioneVasca | null) => {
    if (!corrente || bloccata) return;
    const next = fn(corrente);
    if (next && next !== corrente) salvaAssegnazioneVasca(next);
  };

  // numeroCorsie e presenti si scrivono nei parametri del giorno (override di
  // oggi); l'AppContext allinea automaticamente l'assegnazione.
  const scriviParametri = (patch: { numeroCorsie?: number; atletiPresentiIds?: number[] }) => {
    if (bloccata) return;
    impostaOverrideSeduta(oggi, { ...parametriOggi, ...patch });
  };

  const cambiaNumeroCorsie = (delta: number) => {
    const n = Math.max(1, Math.min(MAX_CORISIE, (corrente?.numeroCorsie ?? parametriOggi.numeroCorsie ?? NUMERO_CORISIE_DEFAULT) + delta));
    scriviParametri({ numeroCorsie: n });
  };

  const togglePresente = (atletaId: number) => {
    const base = new Set(presentiIds);
    if (base.has(atletaId)) base.delete(atletaId);
    else base.add(atletaId);
    scriviParametri({ atletiPresentiIds: atleti.map(a => a.id).filter(id => base.has(id)) });
  };

  const microCorrente = useMemo(
    () => micro.find(m => m.inizio <= oggi && m.fine >= oggi) ?? micro[0] ?? null,
    [micro, oggi]
  );
  const mesoCorrente = useMemo(
    () => (microCorrente ? meso.find(me => me.id === microCorrente.mesocicloId) ?? null : null),
    [meso, microCorrente]
  );
  const codiciFocus = useMemo(
    () => generaCodiciSeduta({
      fase: mesoCorrente?.fase ?? 'PREPARAZIONE_GENERALE',
      tipoMicro: microCorrente?.tipo ?? 'CARICO',
      condizioni: condizioni.filter(c => c.attiva),
    }).codici,
    [mesoCorrente, microCorrente, condizioni]
  );

  const sedutaOggi = useMemo(() => {
    const dataIt = formattaData(oggi);
    const workout = FINPStorage.getCustomWorkouts().find(
      w => w.data === dataIt || w.data === oggi
    );
    if (!workout) return null;
    const serie = ParserScheda.parseSerie(workout.testo);
    const volume = workout.metriTotali || ParserScheda.calcolaMetriDaTesto(workout.testo);
    const ripartizione: Partial<Record<CodiceAllenamentoKey, number>> = {};
    for (const s of serie) {
      const codice = s.codice as CodiceAllenamentoKey;
      if (!CODICI_VALIDI.has(codice)) continue;
      ripartizione[codice] = (ripartizione[codice] ?? 0) + s.metriTotali;
    }
    const codiciStrutturati = (workout.codici ?? []).filter((c): c is CodiceAllenamentoKey => CODICI_VALIDI.has(c as CodiceAllenamentoKey));
    if (serie.length === 0 && codiciStrutturati.length > 0 && volume > 0) {
      const quota = Math.round(volume / codiciStrutturati.length);
      for (const codice of codiciStrutturati) ripartizione[codice] = quota;
    }
    return { volume, ripartizione };
  }, [oggi]);

  // ---------- Dati derivati ----------

  const assegnati = useMemo(() => (corrente ? atletiAssegnati(corrente) : new Set<number>()), [corrente]);
  const nonAssegnati = useMemo(() => {
    if (!corrente) return [];
    const q = ricerca.trim().toLowerCase();
    return atletiNonAssegnati(corrente, atleti).filter(a =>
      !q || a.cognome.toLowerCase().includes(q) || a.nome.toLowerCase().includes(q)
    );
  }, [corrente, atleti, ricerca]);
  const nonPresenti = useMemo(
    () => atleti.filter(a => !presentiSet.has(a.id)),
    [atleti, presentiSet]
  );
  const atletaPerId = useMemo(() => new Map(atleti.map(a => [a.id, a])), [atleti]);

  // ---------- Interazioni tocco ----------

  const startLongPress = (id: number, corsia: number | null) => {
    lpFired.current = false;
    lpTimer.current = window.setTimeout(() => {
      lpFired.current = true;
      setSelezionato(null);
      setSheetAtleta({ id, corsia });
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (lpTimer.current != null) {
      window.clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

  const onTapAtleta = (id: number) => {
    if (lpFired.current) {
      lpFired.current = false;
      return;
    }
    if (bloccata) return;
    setSelezionato(prev => (prev === id ? null : id));
  };

  const onTapCorsia = (numero: number) => {
    if (selezionato == null || bloccata || !corrente) return;
    update(a => assegnaAtleta(a, selezionato, numero));
    setSelezionato(null);
  };

  // Drag & drop (desktop): trascina una riga atleta verso una corsia o verso
  // l'area "Non assegnati" per rimuoverla.
  const onDropAtleta = (e: React.DragEvent, corsiaNumero: number | null) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-finp-atleta');
    const id = Number(raw);
    if (!Number.isFinite(id) || bloccata || !corrente) return;
    if (corsiaNumero == null) {
      if (!assegnati.has(id)) return;
      update(a => rimuoviDaCorsia(a, id));
    } else {
      update(a => assegnaAtleta(a, id, corsiaNumero));
    }
  };

  const stampa = () => {
    if (!corrente) return;
    stampaRegiaCorsie({
      corrente,
      atletaPerId,
      assegnatiCount: assegnati.size,
      presentiCount: presentiIds.length,
      vascaMetri,
      oggi,
    });
  };

  const ripristinaPrecedente = () => {
    if (!precedente) return;
    const riusata = allineaConParametri(
      conData(precedente, oggi),
      vascaMetri,
      corrente?.numeroCorsie ?? parametriOggi.numeroCorsie ?? NUMERO_CORISIE_DEFAULT,
      presentiIds
    );
    salvaAssegnazioneVasca(riusata);
    setPrecedente(null);
  };

  // ---------- Render ----------

  if (!corrente) return null;


  const numeroCorsie = corrente.numeroCorsie;
  const sheetAtletaObj = sheetAtleta
    ? atletaPerId.get(sheetAtleta.id) ?? null
    : null;
  const sheetCorsia = sheetAtleta?.corsia != null ? corsiaPerNumero(corrente, sheetAtleta.corsia) : null;

  return (
    <div className={`regia-screen flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain${bloccata ? ' regia-bloccata' : ''}`}>
      {/* Intestazione pagina */}
      <div className="regia-head shrink-0">
        <PageHeader
          label="Pianificatore"
          title={`Regia Tecnica · Vasca ${vascaMetri} m`}
          icon={<Sliders size={13} />}
          meta={`${formattaData(oggi)} · ${assegnati.size}/${presentiIds.length} assegnati`}
          status={
            <>
              <span className="ds-chip ds-chip-neutral">
                {assegnati.size}/{presentiIds.length} assegnati
              </span>
              {bloccata && (
                <span className="ds-chip" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-live) 12%, transparent)', color: 'var(--color-status-live)', border: '1px solid color-mix(in srgb, var(--color-status-live) 30%, transparent)' }}>
                  LIVE
                </span>
              )}
            </>
          }
          right={
            <button
              type="button"
              onClick={stampa}
              className="flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg bg-primary-container text-on-primary font-headline-sm text-[13px] font-bold shadow-sm active:scale-[0.98] transition-transform shrink-0"
            >
              <Printer size={15} />
              <span>Stampa</span>
            </button>
          }
        />
      </div>

      {/* Banner sessione in corso: composizione in sola lettura */}
      {bloccata && (
        <div className="regia-banner shrink-0 flex items-center justify-between gap-2 rounded-xl bg-warning-container/60 border border-warning/40 px-3 py-2">
          <span className="font-label-caps text-[12px] font-bold text-on-warning-container uppercase tracking-wide">
            Sessione in corso — composizione in sola lettura
          </span>
          <button
            type="button"
            onClick={() => vaiAVistaVasca('cronometro')}
            className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg bg-primary text-on-primary text-[12px] font-bold shrink-0"
          >
            <Play size={14} /> Cronometro
          </button>
        </div>
      )}

      {/* Offerta di riuso della composizione di ieri */}
      {precedente && !bloccata && (
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl bg-primary-fixed/50 border border-primary/30 px-3 py-2">
          <span className="font-label-caps text-[12px] font-bold text-on-primary-fixed-variant uppercase tracking-wide">
            Composizione del {formattaData(precedente.data)} disponibile
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={ripristinaPrecedente}
              className="px-3 min-h-[44px] rounded-lg bg-primary text-on-primary text-[12px] font-bold"
            >
              Usa
            </button>
            <button
              type="button"
              onClick={() => setPrecedente(null)}
              className="px-3 min-h-[44px] rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-bold"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Barra comandi compatta */}
      <div className="regia-commands shrink-0 flex items-center gap-1.5 flex-wrap">
        {/* Stepper corsie */}
        <div className="flex items-center rounded-lg bg-surface-container p-0.5 shadow-sm">
          <button
            type="button"
            disabled={bloccata || numeroCorsie <= 1}
            onClick={() => cambiaNumeroCorsie(-1)}
            aria-label="Riduci corsie"
            className="w-11 h-11 rounded-md flex items-center justify-center text-on-surface disabled:opacity-40"
          >
            <Minus size={15} />
          </button>
          <span className="px-1 font-headline-sm text-[13px] font-bold text-on-surface min-w-[3ch] text-center">
            {numeroCorsie}
          </span>
          <button
            type="button"
            disabled={bloccata || numeroCorsie >= MAX_CORISIE}
            onClick={() => cambiaNumeroCorsie(1)}
            aria-label="Aumenta corsie"
            className="w-11 h-11 rounded-md flex items-center justify-center text-on-surface disabled:opacity-40"
          >
            <Plus size={15} />
          </button>
        </div>
        <span className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">corsie</span>

        <button
          type="button"
          disabled={bloccata}
          onClick={() => update(a => applicaSuggerimento(a, atleti, tempi))}
          className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-[12px] font-bold disabled:opacity-50"
        >
          <Sliders size={14} /> Suggerisci
        </button>
        <button
          type="button"
          disabled={bloccata}
          onClick={() => setConfermaSvuota(true)}
          className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-bold disabled:opacity-50"
        >
          <Trash2 size={14} /> Svuota
        </button>
      </div>

      {/* Intensità della seduta: riga comprimibile, chiusa di default */}
      <section className="regia-intensita shrink-0 rounded-xl bg-surface-container-low px-3.5 py-2 shadow-sm border border-outline-variant/30">
        <button
          type="button"
          onClick={() => setIntensitaAperta(v => !v)}
          className="w-full flex items-center justify-between gap-2 min-h-[44px]"
          aria-expanded={intensitaAperta}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Waves size={15} className="text-primary shrink-0" />
            <span className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold truncate">
              Intensità{sedutaOggi ? ` · ${sedutaOggi.volume >= 1000 ? `${(sedutaOggi.volume / 1000).toFixed(1).replace('.', ',')} km` : `${sedutaOggi.volume} m`}` : ''}
              {codiciFocus.length > 0 ? ` · ${codiciFocus.join('+')}` : ''}
            </span>
          </span>
          {intensitaAperta ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
        </button>
        {intensitaAperta && (
          <div className="pb-2 flex flex-col gap-1.5">
            {sedutaOggi && sedutaOggi.volume > 0 && (
              <IndicatoreCodici
                ripartizione={sedutaOggi.ripartizione}
                volumeTotale={sedutaOggi.volume}
                dettaglio
              />
            )}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-1.5">
              <span className="font-label-caps text-[12px] font-bold uppercase tracking-wider text-primary">Focus codici</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">{codiciFocus.join(' + ')}</span>
            </div>
          </div>
        )}
      </section>

      {/* Non assegnati */}
      <RegiaNonAssegnati
        nonAssegnati={nonAssegnati}
        ricerca={ricerca}
        onRicerca={setRicerca}
        bloccata={bloccata}
        selezionato={selezionato}
        onTapAtleta={onTapAtleta}
        onLongPressStart={id => startLongPress(id, null)}
        onLongPressEnd={cancelLongPress}
        tuttiPresentiAssegnati={atletiNonAssegnati(corrente, atleti).length === 0}
        nonPresenti={nonPresenti}
        nonPresentiAperto={nonPresentiAperto}
        onToggleNonPresenti={() => setNonPresentiAperto(v => !v)}
        onTogglePresente={togglePresente}
      />

      {/* Corsie */}
      <section className="shrink-0 rounded-xl bg-surface-container-lowest shadow-sm p-2.5 flex flex-col min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 content-start gap-2.5 pr-0.5 pb-2">
          {corrente.corsie.map(c => (
            <RegiaCorsiaCard
              key={c.numero}
              corsia={c}
              corrente={corrente}
              bloccata={bloccata}
              selezionato={selezionato}
              atletaPerId={atletaPerId}
              update={update}
              onTapCorsia={onTapCorsia}
              onTapAtleta={onTapAtleta}
              onLongPressStart={(id, cn) => startLongPress(id, cn)}
              onLongPressEnd={cancelLongPress}
              onDropAtleta={onDropAtleta}
            />
          ))}
        </div>
      </section>

      {/* Vai al cronometro */}
      <div className="regia-cta shrink-0 pb-1">
        <button
          type="button"
          disabled={assegnati.size === 0}
          onClick={() => vaiAVistaVasca('cronometro')}
          className="w-full min-h-[52px] rounded-xl bg-primary text-on-primary font-headline-sm text-[15px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition disabled:opacity-50"
        >
          <Play size={18} />
          Vai al cronometro{assegnati.size > 0 ? ` · ${assegnati.size} atleti` : ''}
        </button>
      </div>

      {/* Conferma svuota */}
      {confermaSvuota && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <button type="button" aria-label="Chiudi finestra" tabIndex={-1} onClick={() => setConfermaSvuota(false)} className="absolute inset-0 cursor-default" />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="Conferma svuotamento corsie">
            <h3 className="font-headline-sm text-[16px] font-bold text-on-surface">Svuotare tutte le corsie?</h3>
            <p className="mt-1 text-[13px] text-on-surface-variant">
              Tutti gli atleti tornano tra i non assegnati. Ripartenze e impostazioni delle corsie restano.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfermaSvuota(false)}
                className="flex-1 min-h-[48px] rounded-xl bg-surface-container text-on-surface font-bold text-[14px]"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  update(a => svuotaCorsie(a));
                  setConfermaSvuota(false);
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-error text-on-error font-bold text-[14px]"
              >
                Svuota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet atleta */}
      {sheetAtletaObj && (
        <RegiaSheetAtleta
          atleta={sheetAtletaObj}
          corsia={sheetCorsia ?? null}
          corrente={corrente}
          bloccata={bloccata}
          presentiSet={presentiSet}
          onClose={() => setSheetAtleta(null)}
          update={update}
          onTogglePresente={togglePresente}
        />
      )}
    </div>
  );
};

