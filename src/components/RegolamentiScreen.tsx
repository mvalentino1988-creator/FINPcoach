import React, { useMemo, useState } from 'react';
import {
  RegolamentiService,
  RisultatoRicerca,
  CapitoloRegolamento,
  SezioneCapitolo
} from '../domain/regolamentiService';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  X,
  Scale,
  BadgeCheck,
  SearchX
} from 'lucide-react';
import { EmptyState } from './ui';

type DocFiltro = 'tutti' | string;

/** Evidenzia i termini della query dentro un testo. */
function evidenzia(testo: string, query: string): React.ReactNode {
  const termini = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2);
  if (termini.length === 0) return testo;

  const norm = testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Trova gli intervalli da evidenziare sul testo normalizzato.
  const intervalli: [number, number][] = [];
  for (const t of termini) {
    let da = 0;
    let idx = norm.indexOf(t, da);
    while (idx >= 0) {
      intervalli.push([idx, idx + t.length]);
      da = idx + t.length;
      idx = norm.indexOf(t, da);
    }
  }
  if (intervalli.length === 0) return testo;

  intervalli.sort((a, b) => a[0] - b[0]);
  const uniti: [number, number][] = [];
  for (const iv of intervalli) {
    const ultimo = uniti[uniti.length - 1];
    if (ultimo && iv[0] <= ultimo[1]) {
      ultimo[1] = Math.max(ultimo[1], iv[1]);
    } else {
      uniti.push([...iv] as [number, number]);
    }
  }

  const nodi: React.ReactNode[] = [];
  let cursore = 0;
  uniti.forEach(([a, b], i) => {
    if (a > cursore) nodi.push(testo.slice(cursore, a));
    nodi.push(
      <mark key={i} className="bg-tertiary-fixed text-on-tertiary-fixed rounded px-0.5">
        {testo.slice(a, b)}
      </mark>
    );
    cursore = b;
  });
  if (cursore < testo.length) nodi.push(testo.slice(cursore));
  return nodi;
}

/** Anteprima breve del testo di una sezione. */
function anteprima(testo: string, maxLen = 150): string {
  const pulito = testo.replace(/\s+/g, ' ').trim();
  return pulito.length > maxLen ? pulito.slice(0, maxLen).trim() + '…' : pulito;
}

export const RegolamentiScreen: React.FC = () => {
  const meta = RegolamentiService.meta();
  const documenti = RegolamentiService.documenti();

  const [docFiltro, setDocFiltro] = useState<DocFiltro>('tutti');
  const [query, setQuery] = useState('');
  const [capitoliAperti, setCapitoliAperti] = useState<Set<string>>(new Set());
  const [sezioniAperte, setSezioniAperte] = useState<Set<string>>(new Set());

  const risultati = useMemo<RisultatoRicerca[]>(() => {
    if (query.trim().length < 2) return [];
    return RegolamentiService.cerca(query, 15, docFiltro === 'tutti' ? undefined : docFiltro);
  }, [query, docFiltro]);

  const documentiVisibili = useMemo(() => {
    const docs = docFiltro === 'tutti' ? documenti : documenti.filter(d => d.id === docFiltro);
    return docs.map(d => ({ doc: d, capitoli: RegolamentiService.capitoli(d.id) }));
  }, [docFiltro, documenti]);

  const inRicerca = query.trim().length >= 2;

  const toggleCapitolo = (chiave: string) => {
    setCapitoliAperti(prev => {
      const next = new Set(prev);
      if (next.has(chiave)) next.delete(chiave);
      else next.add(chiave);
      return next;
    });
  };

  const toggleSezione = (chiave: string) => {
    setSezioniAperte(prev => {
      const next = new Set(prev);
      if (next.has(chiave)) next.delete(chiave);
      else next.add(chiave);
      return next;
    });
  };

  const apriRisultato = (r: RisultatoRicerca) => {
    const cap = RegolamentiService.capitoloDi(r.documentoId, r.indice);
    setDocFiltro(r.documentoId);
    setQuery('');
    let target = r.indice;
    if (cap) {
      setCapitoliAperti(new Set([`${r.documentoId}#${cap.chiave}`]));
      const sez = cap.sezioni.find(s => s.indici.includes(r.indice));
      if (sez) {
        target = sez.indici[0];
        setSezioniAperte(new Set([`${r.documentoId}#${target}`]));
      }
    }
    setTimeout(() => {
      document.getElementById(`sec-${r.documentoId}-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const renderSezione = (docId: string, sezione: SezioneCapitolo, singola: boolean) => {
    const chiave = `${docId}#${sezione.indici[0]}`;
    const aperta = singola || sezioniAperte.has(chiave);
    return (
      <div key={chiave} id={`sec-${docId}-${sezione.indici[0]}`} className="bg-surface-container-lowest">
        {!singola && (
          <button
            type="button"
            onClick={() => toggleSezione(chiave)}
            className="w-full flex items-start gap-3 px-3 min-h-[48px] py-2.5 text-left hover:bg-surface-container-low transition"
          >
            <span className="mt-0.5 text-outline shrink-0">
              {aperta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-body-bold text-body-bold text-on-surface text-[13px] leading-snug">{sezione.titolo}</span>
              {!aperta && <span className="block font-label-caps text-[10px] text-on-surface-variant mt-0.5 normal-case tracking-normal font-medium">{anteprima(sezione.testo)}</span>}
            </span>
          </button>
        )}
        {aperta && (
          <div className={singola ? 'px-3 py-3' : 'px-3 pb-3 pl-9'}>
            <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">{sezione.testo}</p>
          </div>
        )}
      </div>
    );
  };

  const renderCapitolo = (docId: string, cap: CapitoloRegolamento) => {
    const chiave = `${docId}#${cap.chiave}`;
    const aperto = capitoliAperti.has(chiave);
    const singola = cap.sezioni.length === 1;
    return (
      <div
        key={chiave}
        id={`cap-${docId}-${cap.chiave}`}
        className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm scroll-mt-4"
      >
        <button
          type="button"
          onClick={() => toggleCapitolo(chiave)}
          className="w-full flex items-center gap-2.5 p-3 min-h-[48px] text-left hover:bg-surface-container-low transition"
        >
          <span className="text-on-surface-variant shrink-0">
            {aperto ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </span>
          {cap.codice && (
            <span className="shrink-0 font-headline-sm text-[12px] font-bold uppercase tracking-wide text-on-primary-fixed bg-primary-fixed rounded-md px-1.5 py-0.5">
              {cap.codice}
            </span>
          )}
          <span className="flex-1 min-w-0 font-body-bold text-body-bold text-on-surface text-sm leading-snug">{cap.titolo}</span>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-[9px] font-bold uppercase">
            {cap.sezioni.length} {cap.sezioni.length === 1 ? 'art.' : 'articoli'}
          </span>
        </button>
        {aperto && (
          <div className="border-t border-outline-variant/60 divide-y divide-outline-variant/40">
            {cap.sezioni.map(s => renderSezione(docId, s, singola))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Regolamento WPS &amp; Classificazioni</h2>
          <p className="font-label-caps text-label-caps text-on-surface-variant truncate">
            Cerca una parola oppure scegli una fonte e apri il capitolo · snapshot {meta.aggiornato}
          </p>
        </div>
      </div>

      {/* Search (campo ben visibile, 48px) */}
      <div className="ds-card p-3 shadow-card space-y-2.5">
        <label htmlFor="ricerca-regolamenti" className="ds-label flex items-center gap-1.5">
          <Search size={14} className="text-primary" />
          Cerca nel regolamento
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
          <input
            id="ricerca-regolamenti"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="es. categorie età, partenze, staffette, S11…"
            className="w-full h-12 pl-10 pr-12 bg-surface-container-lowest rounded-xl border-2 border-outline-variant text-base text-on-surface shadow-sm focus:outline-none focus:border-primary transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center"
              title="Cancella"
              aria-label="Cancella ricerca"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Document filter — discipline carousel pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto ds-hscroll py-0.5 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setDocFiltro('tutti')}
            className={`px-3 min-h-[48px] rounded-full font-label-caps text-label-caps whitespace-nowrap transition ${
              docFiltro === 'tutti'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tutti i documenti
          </button>
          {documenti.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDocFiltro(d.id)}
              className={`px-3 min-h-[48px] rounded-full font-label-caps text-label-caps whitespace-nowrap transition ${
                docFiltro === d.id
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {d.fonte}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {inRicerca ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {risultati.length > 0
                ? `${risultati.length} risultati per “${query.trim()}”`
                : `Nessun risultato per “${query.trim()}”`}
            </h3>
          </div>

          {risultati.length === 0 && (
            <EmptyState
              icon={<SearchX size={40} strokeWidth={1.5} />}
              title={`Nessun risultato per “${query.trim()}”`}
              message="Prova con parole più semplici o sinonimi (es. “età”, “classe”, “partenza”, “vasca”, “protesta”). La ricerca è locale e non usa internet."
              actionLabel="Cancella ricerca"
              onAction={() => setQuery('')}
            />
          )}

          {risultati.map(r => (
            <div key={`${r.documentoId}#${r.indice}`} className="bg-surface-container-lowest p-3 rounded-xl shadow-sm space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-body-bold text-body-bold text-on-surface text-sm leading-snug">
                  {evidenzia(r.sezione.titolo, query)}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[9px] font-bold uppercase shrink-0">
                  {r.fonte}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">{evidenzia(r.estratto, query)}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => apriRisultato(r)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <FileText size={12} />
                  Apri nel documento
                </button>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  Fonte ufficiale
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Browse mode */
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant px-1">
            {docFiltro === 'tutti' ? 'Scegli una fonte per restringere l’elenco, poi apri un capitolo.' : 'Apri un capitolo per leggere i relativi articoli.'}
          </p>
          {/* Chapters */}
          {documentiVisibili.map(({ doc, capitoli }) => (
            <div key={doc.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 min-w-0">
                  <Scale size={15} className="text-primary shrink-0" />
                  <span className="truncate">{doc.titolo}</span>
                  <span className="font-label-caps text-[10px] font-semibold text-on-surface-variant shrink-0">
                    {capitoli.length} capitoli
                  </span>
                </h3>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1 shrink-0"
                >
                  <ExternalLink size={12} />
                  Fonte
                </a>
              </div>
              <div className="space-y-1.5">
                {capitoli.map(c => renderCapitolo(doc.id, c))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source note */}
      <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant flex items-start gap-2">
        <BadgeCheck size={14} className="mt-0.5 shrink-0 text-secondary" />
        <span>
          Testi consultabili offline (snapshot {meta.aggiornato}). In caso di discordanza fa fede il testo ufficiale
          pubblicato da FINP e World Para Swimming. La ricerca è locale e non sostituisce la consultazione della fonte.
        </span>
      </div>
    </div>
  );
};
