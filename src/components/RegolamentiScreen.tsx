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
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  X,
  ListTree,
  Layers
} from 'lucide-react';

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
      <mark key={i} className="bg-amber-200 text-on-surface rounded px-0.5">
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
  const [indiceAperto, setIndiceAperto] = useState(false);

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

  const espandiTutto = () => {
    const tutte = new Set<string>();
    documentiVisibili.forEach(({ doc, capitoli }) => capitoli.forEach(c => tutte.add(`${doc.id}#${c.chiave}`)));
    setCapitoliAperti(tutte);
  };

  const comprimiTutto = () => {
    setCapitoliAperti(new Set());
    setSezioniAperte(new Set());
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

  const vaiAlCapitolo = (docId: string, chiave: string) => {
    setCapitoliAperti(prev => new Set(prev).add(`${docId}#${chiave}`));
    setTimeout(() => {
      document.getElementById(`cap-${docId}-${chiave}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            className="w-full flex items-start gap-2 px-3 h-12 text-left hover:bg-surface-container-low transition"
          >
            <span className="mt-0.5 text-outline shrink-0">
              {aperta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-on-surface text-[13px] leading-snug">{sezione.titolo}</span>
              {!aperta && <span className="block text-[11px] text-on-surface-variant mt-0.5">{anteprima(sezione.testo)}</span>}
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
        className="border border-slate-200/70 rounded-xl overflow-hidden bg-surface-container-lowest shadow-card scroll-mt-4"
      >
        <button
          type="button"
          onClick={() => toggleCapitolo(chiave)}
          className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-surface-container-low transition"
        >
          <span className="text-on-surface-variant shrink-0">
            {aperto ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </span>
          {cap.codice && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary-container bg-surface-container-low border border-primary-fixed-dim rounded-md px-1.5 py-0.5">
              {cap.codice}
            </span>
          )}
          <span className="flex-1 min-w-0 font-bold text-on-surface text-sm leading-snug">{cap.titolo}</span>
          <span className="shrink-0 text-[10px] font-semibold text-on-surface-variant">
            {cap.sezioni.length} {cap.sezioni.length === 1 ? 'articolo' : 'articoli'}
          </span>
        </button>
        {aperto && (
          <div className="border-t border-slate-200/70 divide-y divide-slate-100">
            {cap.sezioni.map(s => renderSezione(docId, s, singola))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="ds-title flex items-center gap-2">
          <BookOpen size={22} className="text-primary-container" />
          <span>Regolamenti</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Regolamento FINP e World Para Swimming consultabili offline ({RegolamentiService.totaleCapitoli()} capitoli,{' '}
          {RegolamentiService.totaleSezioni()} articoli). Cerca per parola chiave o sfoglia i capitoli. Aggiornati al{' '}
          {meta.aggiornato}.
        </p>
      </div>

      {/* Search */}
      <div className="ds-card p-3 shadow-card space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca nei regolamenti (es. categorie età, partenze, staffette, classificazione…)"
            className="w-full pl-9 pr-9 h-12 rounded-xl border border-slate-200/70 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary-container"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface-variant"
              title="Cancella"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Document filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDocFiltro('tutti')}
            className={`px-3 h-12 rounded-xl text-xs font-bold transition ${
              docFiltro === 'tutti' ? 'bg-primary-container text-on-primary shadow-card' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Tutti
          </button>
          {documenti.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDocFiltro(d.id)}
              className={`px-3 h-12 rounded-xl text-xs font-bold transition ${
                docFiltro === d.id ? 'bg-primary-container text-on-primary shadow-card' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {d.fonte}
            </button>
          ))}
        </div>

        {/* Suggestions */}
        {!inRicerca && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Ricerche rapide:</span>
            {RegolamentiService.suggerimenti().map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-low text-on-surface-variant border border-slate-200/70 hover:bg-surface-container transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {inRicerca ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">
              {risultati.length > 0
                ? `${risultati.length} risultati per “${query.trim()}”`
                : `Nessun risultato per “${query.trim()}”`}
            </h3>
          </div>

          {risultati.length === 0 && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 text-xs text-on-surface-variant flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-on-surface-variant" />
              <span>
                Prova con parole più semplici o sinonimi (es. “età”, “classe”, “partenza”, “vasca”, “protesta”).
                La ricerca è locale e non usa internet.
              </span>
            </div>
          )}

          {risultati.map(r => (
            <div key={`${r.documentoId}#${r.indice}`} className="ds-card p-4 shadow-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-on-surface text-sm leading-snug">
                  {evidenzia(r.sezione.titolo, query)}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container bg-surface-container-low border border-primary-fixed-dim rounded-full px-2 py-0.5 shrink-0">
                  {r.fonte}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">{evidenzia(r.estratto, query)}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => apriRisultato(r)}
                  className="text-[11px] font-bold text-primary-container hover:underline flex items-center gap-1"
                >
                  <FileText size={12} />
                  Apri nel documento
                </button>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1"
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
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIndiceAperto(v => !v)}
              className="text-[11px] font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 px-2.5 h-12 rounded-lg bg-surface-container hover:bg-surface-container-high transition"
            >
              <ListTree size={13} />
              Indice dei capitoli
              {indiceAperto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={espandiTutto}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-on-surface px-2 h-12 rounded-lg hover:bg-surface-container transition"
              >
                Espandi tutto
              </button>
              <button
                type="button"
                onClick={comprimiTutto}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-on-surface px-2 h-12 rounded-lg hover:bg-surface-container transition"
              >
                Comprimi tutto
              </button>
            </div>
          </div>

          {/* TOC */}
          {indiceAperto && (
            <div className="space-y-3 p-3 rounded-xl bg-surface-container-low border border-slate-200/70">
              {documentiVisibili.map(({ doc, capitoli }) => (
                <div key={doc.id} className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <Layers size={12} className="text-primary-container" />
                    {doc.fonte}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {capitoli.map(c => (
                      <button
                        key={c.chiave}
                        type="button"
                        onClick={() => vaiAlCapitolo(doc.id, c.chiave)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-lowest text-on-surface-variant border border-slate-200/70 hover:border-primary-container hover:text-primary-container transition max-w-full truncate"
                        title={c.titolo}
                      >
                        {c.codice ? `${c.codice} · ` : ''}
                        {c.titolo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chapters */}
          {documentiVisibili.map(({ doc, capitoli }) => (
            <div key={doc.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <FileText size={15} className="text-primary-container" />
                  <span>{doc.titolo}</span>
                  <span className="text-[10px] font-semibold text-on-surface-variant">
                    {capitoli.length} capitoli
                  </span>
                </h3>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1"
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
      <div className="p-3 rounded-xl bg-surface-container-low border border-slate-200/70 text-[11px] text-on-surface-variant flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <span>
          Testi consultabili offline (snapshot {meta.aggiornato}). In caso di discordanza fa fede il testo ufficiale
          pubblicato da FINP e World Para Swimming. La ricerca è locale e non sostituisce la consultazione della fonte.
        </span>
      </div>
    </div>
  );
};
