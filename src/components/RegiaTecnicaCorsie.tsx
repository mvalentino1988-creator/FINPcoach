import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  ChevronDown,
  ChevronUp,
  Lock,
  LockOpen,
  Minus,
  Play,
  Plus,
  Printer,
  Search,
  Sliders,
  Trash2,
  UserCheck,
  UserX,
  Waves,
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { IndicatoreCodici } from './IndicatoreCodici';
import { FINPStorage } from '../data/storage';
import { ParserScheda } from '../domain/parserScheda';
import { formattaData, todayISO } from '../domain/dateUtils';
import {
  profiloCorsiaAtleta,
  type TipoLavoroCorsia,
} from '../domain/composizioneCorsie';
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
  impostaBloccoCorsia,
  impostaIntervalloCorsia,
  impostaRipartenzaAtleta,
  impostaRipartenzaCorsia,
  MAX_ATLETI_CORISIA,
  MAX_CORISIE,
  nuovaAssegnazione,
  NUMERO_CORISIE_DEFAULT,
  rimuoviDaCorsia,
  ripartenzaEreditata,
  scambiaConAdiacente,
  secondi5,
  svuotaCorsie,
} from '../domain/assegnazioneVasca';
import { INTERVALLO_PRESETS } from '../domain/cronometroVasca';
import { useSessioneVasca, sessioneBloccaRegia, vaiAVistaVasca } from '../lib/vascaSessione';

const FOCUS_TIPO: Record<TipoLavoroCorsia, string> = {
  V: 'velocità e reattività',
  M: 'soglia e VO2',
  F: 'fondo e tecnica',
  N: 'lavoro da definire',
};

const CODICI_VALIDI = new Set<CodiceAllenamentoKey>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D']);

const LANE_ACCENTS = [
  { bar: 'bg-primary', chip: 'bg-primary text-on-primary' },
  { bar: 'bg-secondary', chip: 'bg-secondary text-on-secondary' },
  { bar: 'bg-tertiary-container', chip: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { bar: 'bg-primary-container', chip: 'bg-primary-container text-on-primary' },
];

const LONG_PRESS_MS = 500;

const formattaSecondi = (s: number | null | undefined): string =>
  s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const initiali = (a: { nome: string; cognome: string }): string =>
  `${a.cognome.charAt(0)}${a.nome.charAt(0)}`.toUpperCase() || '?';

export const RegiaTecnicaCorsie: React.FC = () => {
  const {
    atleti, tempi, condizioni, micro, meso, stagione,
    assegnazioneVasca, salvaAssegnazioneVasca,
    parametriOggi, impostaOverrideSeduta,
  } = useApp();

  const oggi = todayISO();
  const vascaMetri: 25 | 50 = stagione?.vascaMetri === 25 ? 25 : 50;
  const sessione = useSessioneVasca();
  const bloccata = sessioneBloccaRegia(sessione);

  const [precedente, setPrecedente] = useState<AssegnazioneVasca | null>(null);
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

  const tuttiIds = useMemo(() => atleti.map(a => a.id), [atleti]);
  const presentiIds = useMemo(
    () => (parametriOggi.atletiPresentiIds ?? tuttiIds).filter(id => tuttiIds.includes(id)),
    [parametriOggi.atletiPresentiIds, tuttiIds]
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
      setPrecedente(assegnazioneVasca);
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
    scriviParametri({ atletiPresentiIds: tuttiIds.filter(id => base.has(id)) });
  };

  const profiliCorsia = useMemo(
    () => new Map(atleti.map(a => [a.id, profiloCorsiaAtleta(a, tempi)])),
    [atleti, tempi]
  );

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
    const righe = corrente.corsie.map(c => {
      const nomi = c.atletiIds
        .map(id => atletaPerId.get(id))
        .filter((a): a is NonNullable<typeof a> => !!a)
        .map((a, i) => `<tr><td class="num">${i + 1}</td><td>${a.cognome} ${a.nome}</td></tr>`)
        .join('');
      const rip = c.ripartenzaCorsia != null ? formattaSecondi(c.ripartenzaCorsia) : 'ereditata';
      const int = c.intervalloPartenza != null ? `${c.intervalloPartenza} s` : '—';
      return `<section class="corsia">
        <h2>Corsia ${c.numero}${c.bloccata ? ' 🔒' : ''} — ${c.atletiIds.length} atleti · ripartenza ${rip} · intervallo ${int}</h2>
        <table>${nomi || '<tr><td class="vuota">—</td></tr>'}</table>
      </section>`;
    }).join('');
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Regia Corsie — ${formattaData(oggi)}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;color:#1a1c1e}
  h1{font-size:20px;margin:0 0 4px}
  .meta{color:#5b5f66;font-size:12px;margin-bottom:16px}
  .corsia{border:1px solid #d7dbe0;border-radius:8px;padding:10px 14px;margin-bottom:12px;page-break-inside:avoid}
  .corsia h2{font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:3px 6px;border-bottom:1px solid #eee}
  td.num{width:28px;color:#8a8f98;font-weight:700;text-align:center}
  td.vuota{color:#9aa0a8;font-style:italic}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>Regia Tecnica · Vasca ${vascaMetri} m</h1>
<div class="meta">${formattaData(oggi)} · ${assegnati.size}/${presentiIds.length} atleti assegnati · ripartenza generale ${formattaSecondi(corrente.ripartenzaGenerale)}</div>
${righe}
</body></html>`;
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
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
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* Intestazione pagina */}
      <div className="shrink-0">
        <PageHeader
          label="Pianificatore"
          title={`Regia Tecnica · Vasca ${vascaMetri} m`}
          icon={<Sliders size={13} />}
          meta={`${formattaData(oggi)} · ${assegnati.size}/${presentiIds.length} assegnati`}
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
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl bg-warning-container/60 border border-warning/40 px-3 py-2">
          <span className="font-label-caps text-[12px] font-bold text-on-warning-container uppercase tracking-wide">
            Sessione in corso — composizione in sola lettura
          </span>
          <button
            type="button"
            onClick={() => vaiAVistaVasca('cronometro')}
            className="flex items-center gap-1 px-3 min-h-[40px] rounded-lg bg-primary text-on-primary text-[12px] font-bold shrink-0"
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
              className="px-3 min-h-[40px] rounded-lg bg-primary text-on-primary text-[12px] font-bold"
            >
              Usa
            </button>
            <button
              type="button"
              onClick={() => setPrecedente(null)}
              className="px-3 min-h-[40px] rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-bold"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Barra comandi compatta */}
      <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
        {/* Stepper corsie */}
        <div className="flex items-center rounded-lg bg-surface-container p-0.5 shadow-sm">
          <button
            type="button"
            disabled={bloccata || numeroCorsie <= 1}
            onClick={() => cambiaNumeroCorsie(-1)}
            aria-label="Riduci corsie"
            className="w-9 h-9 rounded-md flex items-center justify-center text-on-surface disabled:opacity-40"
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
            className="w-9 h-9 rounded-md flex items-center justify-center text-on-surface disabled:opacity-40"
          >
            <Plus size={15} />
          </button>
        </div>
        <span className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">corsie</span>

        <button
          type="button"
          disabled={bloccata}
          onClick={() => update(a => applicaSuggerimento(a, atleti, tempi))}
          className="flex items-center gap-1 px-3 min-h-[40px] rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-[12px] font-bold disabled:opacity-50"
        >
          <Sliders size={14} /> Suggerisci
        </button>
        <button
          type="button"
          disabled={bloccata}
          onClick={() => setConfermaSvuota(true)}
          className="flex items-center gap-1 px-3 min-h-[40px] rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-bold disabled:opacity-50"
        >
          <Trash2 size={14} /> Svuota
        </button>
      </div>

      {/* Intensità della seduta: riga comprimibile, chiusa di default */}
      <section className="shrink-0 rounded-xl bg-surface-container-low px-3.5 py-2 shadow-sm border border-outline-variant/30">
        <button
          type="button"
          onClick={() => setIntensitaAperta(v => !v)}
          className="w-full flex items-center justify-between gap-2 min-h-[40px]"
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
      <section className="shrink-0 rounded-xl bg-surface-container-low px-3 py-2 shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-2 pb-1.5">
          <UserCheck size={15} className="text-primary shrink-0" />
          <span className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">
            Non assegnati · {nonAssegnati.length}
          </span>
          {ricerca && (
            <span className="ml-auto font-label-caps text-[12px] text-on-surface-variant">
              {nonAssegnati.length} risultati
            </span>
          )}
        </div>
        {(() => {
          const tuttiPresentiAssegnati = atletiNonAssegnati(corrente, atleti).length === 0;
          if (tuttiPresentiAssegnati && !ricerca) {
            return (
              <div className="py-1.5 font-label-caps text-[12px] text-on-surface-variant">
                Tutti assegnati
              </div>
            );
          }
          return (
            <>
              <div className="relative pb-1.5">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="search"
                  value={ricerca}
                  onChange={e => setRicerca(e.target.value)}
                  placeholder="Cerca atleta…"
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto app-fixed-scroll">
                {nonAssegnati.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={bloccata}
                    onClick={() => onTapAtleta(a.id)}
                    onPointerDown={() => startLongPress(a.id, null)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    draggable={!bloccata}
                    onDragStart={e => {
                      e.dataTransfer.setData('application/x-finp-atleta', String(a.id));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 rounded-xl border text-left transition active:scale-[0.98] ${
                      selezionato === a.id
                        ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant ring-2 ring-primary/40'
                        : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary/50'
                    } disabled:opacity-60`}
                  >
                    <span className="font-body-bold text-[13px] whitespace-nowrap">{a.cognome}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <BadgeClasse tipo="S" n={a.classeS} />
                      <BadgeClasse tipo="SB" n={a.classeSB} />
                      <BadgeClasse tipo="SM" n={a.classeSM} />
                    </span>
                  </button>
                ))}
                {nonAssegnati.length === 0 && ricerca && (
                  <span className="font-label-caps text-[12px] text-on-surface-variant py-2">Nessun risultato</span>
                )}
              </div>
            </>
          );
        })()}

        {/* Non presenti: collassato, si segna la presenza con un tocco */}
        {nonPresenti.length > 0 && (
          <div className="pt-1.5 border-t border-outline-variant/40">
            <button
              type="button"
              onClick={() => setNonPresentiAperto(v => !v)}
              className="w-full flex items-center justify-between gap-2 min-h-[36px]"
              aria-expanded={nonPresentiAperto}
            >
              <span className="flex items-center gap-1.5 font-label-caps text-[12px] uppercase text-on-surface-variant font-bold">
                <UserX size={13} /> Non presenti · {nonPresenti.length}
              </span>
              {nonPresentiAperto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {nonPresentiAperto && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {nonPresenti.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={bloccata}
                    onClick={() => togglePresente(a.id)}
                    className="flex items-center gap-1.5 min-h-[40px] px-2.5 py-1 rounded-xl border border-dashed border-outline-variant/70 bg-transparent text-on-surface-variant text-[12px] font-bold disabled:opacity-60"
                    title="Segna presente"
                  >
                    <UserCheck size={13} className="text-primary" />
                    {a.cognome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Corsie */}
      <section className="flex-1 min-h-0 rounded-xl bg-surface-container-lowest shadow-sm p-2.5 flex flex-col min-w-0">
        <div className="app-fixed-scroll flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 content-start gap-2.5 pr-0.5 pb-2">
          {corrente.corsie.map(c => {
            const accent = LANE_ACCENTS[(c.numero - 1) % LANE_ACCENTS.length];
            const piena = c.atletiIds.length >= MAX_ATLETI_CORISIA;
            const evidenziata = selezionato != null;
            return (
              <div
                key={c.numero}
                onClick={() => onTapCorsia(c.numero)}
                onDragOver={e => { if (!bloccata) e.preventDefault(); }}
                onDrop={e => onDropAtleta(e, c.numero)}
                className={`rounded-xl bg-surface-container-low relative overflow-hidden flex flex-col min-w-0 border transition ${
                  evidenziata && !bloccata ? 'border-primary/50' : 'border-transparent'
                } ${c.bloccata ? 'opacity-90' : ''}`}
              >
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${accent.bar}`} />
                <div className="p-2 pl-3 flex flex-col gap-1.5 min-h-0">
                  {/* Intestazione corsia */}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <span className={`w-6 h-6 rounded-md ${accent.chip} text-[12px] font-bold flex items-center justify-center shrink-0`}>
                      {c.numero}
                    </span>
                    <span className="font-label-caps text-[12px] text-on-surface-variant font-bold uppercase truncate">
                      {c.atletiIds.length} atleti
                    </span>
                    <div className="ml-auto flex items-center gap-0.5">
                      {/* Ripartenza corsia */}
                      <button
                        type="button"
                        disabled={bloccata}
                        onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, secondi5(Math.max(5, (c.ripartenzaCorsia ?? corrente.ripartenzaGenerale) - 5))))}
                        className="w-7 h-7 rounded-md bg-surface-container text-on-surface text-[12px] font-bold disabled:opacity-40"
                        aria-label="Diminuisci ripartenza corsia"
                      >−</button>
                      <span className="px-1 font-label-caps text-[12px] font-bold text-on-surface min-w-[2.2ch] text-center" title="Ripartenza corsia (multipli di 5 s)">
                        {c.ripartenzaCorsia != null ? `${c.ripartenzaCorsia}s` : '—'}
                      </span>
                      <button
                        type="button"
                        disabled={bloccata}
                        onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, secondi5(Math.min(600, (c.ripartenzaCorsia ?? corrente.ripartenzaGenerale) + 5))))}
                        className="w-7 h-7 rounded-md bg-surface-container text-on-surface text-[12px] font-bold disabled:opacity-40"
                        aria-label="Aumenta ripartenza corsia"
                      >+</button>
                      {c.ripartenzaCorsia != null && (
                        <button
                          type="button"
                          disabled={bloccata}
                          onClick={() => update(a => impostaRipartenzaCorsia(a, c.numero, null))}
                          className="w-6 h-7 rounded-md text-on-surface-variant text-[12px] font-bold"
                          aria-label="Ripartenza corsia ereditata"
                          title="Torna alla ripartenza ereditata"
                        >×</button>
                      )}
                      {/* Intervallo partenza automatica */}
                      <button
                        type="button"
                        disabled={bloccata}
                        onClick={() => {
                          const opts: (number | null)[] = [null, ...INTERVALLO_PRESETS];
                          const curIdx = opts.indexOf(c.intervalloPartenza ?? null);
                          const next = opts[(curIdx + 1) % opts.length];
                          update(a => impostaIntervalloCorsia(a, c.numero, next));
                        }}
                        className={`h-7 px-1.5 rounded-md font-label-caps text-[8.5px] font-bold uppercase ${
                          c.intervalloPartenza != null ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container text-on-surface-variant'
                        }`}
                        title="Intervallo partenza automatica"
                      >
                        {c.intervalloPartenza != null ? `I${c.intervalloPartenza}` : 'I—'}
                      </button>
                      {/* Blocco corsia */}
                      <button
                        type="button"
                        onClick={() => update(a => impostaBloccoCorsia(a, c.numero, !c.bloccata))}
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          c.bloccata ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                        aria-label={c.bloccata ? `Sblocca corsia ${c.numero}` : `Blocca corsia ${c.numero}`}
                        title={c.bloccata ? 'Corsia bloccata' : 'Blocca corsia'}
                      >
                        {c.bloccata ? <Lock size={12} /> : <LockOpen size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Atleti in corsia */}
                  {c.atletiIds.length === 0 ? (
                    <div className="rounded-lg bg-surface-container/50 border border-dashed border-outline-variant/50 px-2 py-2 text-center font-label-caps text-[12px] text-on-surface-variant uppercase">
                      {selezionato != null && !c.bloccata ? 'Tocca per assegnare' : 'Vuota'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {c.atletiIds.map((id, idx) => {
                        const a = atletaPerId.get(id);
                        if (!a) return null;
                        const rip = c.bloccata ? null : ripartenzaEreditata(corrente, c.numero, id);
                        const personale = corrente.ripartenzeAtleta[id];
                        const mostraPersonale = personale != null && personale !== rip;
                        return (
                          <div
                            key={id}
                            draggable={!bloccata && !c.bloccata}
                            onDragStart={e => {
                              e.dataTransfer.setData('application/x-finp-atleta', String(id));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              onTapAtleta(id);
                            }}
                            onPointerDown={() => startLongPress(id, c.numero)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onPointerCancel={cancelLongPress}
                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-surface-container-lowest border min-w-0 cursor-pointer transition active:scale-[0.98] ${
                              selezionato === id ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/30'
                            }`}
                          >
                            <span className="w-4 h-4 rounded bg-surface-container-high text-on-surface-variant text-[12px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-body-bold text-[12px] text-on-surface truncate min-w-0 flex-1">
                              {a.cognome}
                            </span>
                            {mostraPersonale && (
                              <span className="px-1 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-caps text-[12px] font-bold shrink-0" title="Ripartenza personale">
                                {personale}s
                              </span>
                            )}
                            {!c.bloccata && !bloccata && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  update(cur => rimuoviDaCorsia(cur, id));
                                }}
                                aria-label={`Rimuovi ${a.cognome} dalla corsia ${c.numero}`}
                                className="w-5 h-5 rounded text-on-surface-variant hover:text-error flex items-center justify-center shrink-0"
                              >
                                <Minus size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {piena && (
                    <span className="font-label-caps text-[12px] text-warning font-bold uppercase">Corsia piena</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Vai al cronometro */}
      <div className="shrink-0 pb-1">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setConfermaSvuota(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl" onClick={e => e.stopPropagation()}>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setSheetAtleta(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">
                  {sheetAtletaObj.cognome} {sheetAtletaObj.nome}
                </h3>
                <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">
                  {sheetCorsia ? `Corsia ${sheetCorsia.numero} · ${sheetCorsia.atletiIds.indexOf(sheetAtletaObj.id) + 1}º di partenza` : 'Non assegnato'}
                  {!presentiSet.has(sheetAtletaObj.id) ? ' · non presente' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetAtleta(null)}
                aria-label="Chiudi"
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <Minus size={16} className="rotate-45" />
              </button>
            </div>

            {/* Sposta in corsia */}
            <div className="mt-4">
              <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">Sposta in corsia</p>
              <div className="grid grid-cols-4 gap-1.5">
                {corrente.corsie.map(c => {
                  const disabilitata = bloccata || c.bloccata || (!presentiSet.has(sheetAtletaObj.id))
                    || (c.atletiIds.length >= MAX_ATLETI_CORISIA && !c.atletiIds.includes(sheetAtletaObj.id));
                  const attiva = sheetCorsia?.numero === c.numero;
                  return (
                    <button
                      key={c.numero}
                      type="button"
                      disabled={disabilitata}
                      onClick={() => {
                        if (!attiva) update(a => assegnaAtleta(a, sheetAtletaObj.id, c.numero));
                        setSheetAtleta(null);
                      }}
                      className={`min-h-[44px] rounded-xl font-bold text-[13px] transition ${
                        attiva
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-40'
                      }`}
                    >
                      {c.numero}
                    </button>
                  );
                })}
              </div>
            </div>

            {sheetCorsia && !sheetCorsia.bloccata && (
              <>
                {/* Ordine di partenza */}
                <div className="mt-4">
                  <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">Ordine di partenza</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={bloccata}
                      onClick={() => update(a => scambiaConAdiacente(a, sheetCorsia.numero, sheetAtletaObj.id, -1))}
                      className="flex-1 min-h-[44px] rounded-xl bg-surface-container font-bold text-[13px] disabled:opacity-40"
                    >
                      ↑ Su
                    </button>
                    <button
                      type="button"
                      disabled={bloccata}
                      onClick={() => update(a => scambiaConAdiacente(a, sheetCorsia.numero, sheetAtletaObj.id, 1))}
                      className="flex-1 min-h-[44px] rounded-xl bg-surface-container font-bold text-[13px] disabled:opacity-40"
                    >
                      ↓ Giù
                    </button>
                  </div>
                </div>

                {/* Ripartenza personale */}
                <div className="mt-4">
                  <p className="font-label-caps text-[12px] uppercase text-on-surface-variant font-bold mb-1.5">
                    Ripartenza personale {(() => {
                      const ereditata = ripartenzaEreditata(corrente, sheetCorsia.numero, sheetAtletaObj.id);
                      return <span className="normal-case font-normal">(ereditata {formattaSecondi(ereditata)})</span>;
                    })()}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={bloccata}
                      onClick={() => {
                        const cur = corrente.ripartenzeAtleta[sheetAtletaObj.id] ?? ripartenzaEreditata(corrente, sheetCorsia.numero, sheetAtletaObj.id);
                        update(a => impostaRipartenzaAtleta(a, sheetAtletaObj.id, Math.max(5, cur - 5)));
                      }}
                      className="w-12 h-11 rounded-xl bg-surface-container font-bold text-[15px] disabled:opacity-40"
                    >−5</button>
                    <span className="flex-1 text-center font-headline-sm text-[16px] font-bold text-on-surface">
                      {corrente.ripartenzeAtleta[sheetAtletaObj.id] != null
                        ? `${corrente.ripartenzeAtleta[sheetAtletaObj.id]}s`
                        : 'Ered.'}
                    </span>
                    <button
                      type="button"
                      disabled={bloccata}
                      onClick={() => {
                        const cur = corrente.ripartenzeAtleta[sheetAtletaObj.id] ?? ripartenzaEreditata(corrente, sheetCorsia.numero, sheetAtletaObj.id);
                        update(a => impostaRipartenzaAtleta(a, sheetAtletaObj.id, cur + 5));
                      }}
                      className="w-12 h-11 rounded-xl bg-surface-container font-bold text-[15px] disabled:opacity-40"
                    >+5</button>
                    {corrente.ripartenzeAtleta[sheetAtletaObj.id] != null && (
                      <button
                        type="button"
                        disabled={bloccata}
                        onClick={() => update(a => impostaRipartenzaAtleta(a, sheetAtletaObj.id, null))}
                        className="h-11 px-3 rounded-xl bg-surface-container text-on-surface-variant text-[12px] font-bold"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Rimuovi */}
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={bloccata}
                    onClick={() => {
                      update(a => rimuoviDaCorsia(a, sheetAtletaObj.id));
                      setSheetAtleta(null);
                    }}
                    className="w-full min-h-[48px] rounded-xl bg-surface-container text-error font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Trash2 size={15} /> Rimuovi dalla corsia
                  </button>
                </div>
              </>
            )}

            {/* Non presente: segna presente */}
            {!presentiSet.has(sheetAtletaObj.id) && (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={bloccata}
                  onClick={() => {
                    togglePresente(sheetAtletaObj.id);
                    setSheetAtleta(null);
                  }}
                  className="w-full min-h-[48px] rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-bold text-[14px] flex items-center justify-center gap-2"
                >
                  <UserCheck size={15} /> Segna come presente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BadgeClasse: React.FC<{ tipo: 'S' | 'SB' | 'SM'; n: number | null | undefined }> = ({ tipo, n }) => {
  if (n == null) return null;
  const cls =
    tipo === 'S' ? 'bg-primary-fixed text-on-primary-fixed-variant'
    : tipo === 'SB' ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
    : 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
  return (
    <span className={`px-1 rounded font-label-caps text-[12px] font-bold leading-[14px] ${cls}`}>
      {tipo}
      {n}
    </span>
  );
};
