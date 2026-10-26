import { payloadRegolamenti } from '../data/staticData';

/** Una sezione (articolo/capitolo) di un regolamento. */
export interface SezioneRegolamento {
  titolo: string;
  testo: string;
}

/** Un documento di regolamento (FINP o World Para Swimming). */
export interface DocumentoRegolamento {
  id: string;
  titolo: string;
  fonte: string;
  url: string;
  sezioni: SezioneRegolamento[];
}

export interface FonteRegolamento {
  id: string;
  nome: string;
  url: string;
}

export interface MetaRegolamenti {
  aggiornato: string;
  fonti: FonteRegolamento[];
}

interface RegolamentiPayload {
  meta: MetaRegolamenti;
  documenti: DocumentoRegolamento[];
}

/** Una sezione all'interno di un capitolo, con gli indici originali nel documento. */
export interface SezioneCapitolo extends SezioneRegolamento {
  /** Indici delle sezioni originali unite in questa voce (es. "(parte 1/2)"). */
  indici: number[];
}

/** Un capitolo: raggruppa più sezioni correlate (es. NP.1.9 Partenza). */
export interface CapitoloRegolamento {
  /** Chiave stabile del capitolo (codice NP/§ oppure nome del raggruppamento). */
  chiave: string;
  /** Titolo leggibile del capitolo. */
  titolo: string;
  /** Codice normativo (es. "NP.1.9", "§10") se disponibile. */
  codice?: string;
  sezioni: SezioneCapitolo[];
}

/** Un risultato di ricerca con la sezione trovata e un estratto contestuale. */
export interface RisultatoRicerca {
  documentoId: string;
  documentoTitolo: string;
  fonte: string;
  url: string;
  indice: number;
  sezione: SezioneRegolamento;
  punteggio: number;
  estratto: string;
  /** true se il match è avvenuto nel titolo della sezione. */
  matchTitolo: boolean;
}

const META_VUOTA: MetaRegolamenti = { aggiornato: '', fonti: [] };

/** Payload caricato all'avvio da `public/data/regolamenti.json` (vedi staticData). */
function data(): RegolamentiPayload | null {
  return payloadRegolamenti() as RegolamentiPayload | null;
}

function documenti(): DocumentoRegolamento[] {
  return data()?.documenti ?? [];
}

/** Parole vuote italiane/inglesi ignorate nella ricerca. */
const STOPWORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per',
  'tra', 'fra', 'e', 'ed', 'o', 'od', 'ma', 'che', 'chi', 'cui', 'non', 'del', 'dello', 'della',
  'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla',
  'dai', 'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla',
  'sui', 'sugli', 'sulle', 'come', 'più', 'meno', 'anche', 'sono', 'essere', 'avere', 'ha', 'hanno',
  'si', 'no', 'se', 'the', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'with', 'a', 'an', 'is', 'are',
  'be', 'by', 'as', 'at', 'from', 'that', 'this', 'it', 'its', 'shall', 'may', 'must', 'will'
]);

/** Normalizza una stringa: minuscole, senza accenti, solo lettere/numeri/spazi. */
function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokenizza un testo in termini significativi. */
function tokenizza(s: string): string[] {
  return normalizza(s)
    .split(' ')
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

/** Pre-calcola i token di ogni sezione (una sola volta, all'avvio). */
interface SezioneIndicizzata {
  documentoId: string;
  indice: number;
  sezione: SezioneRegolamento;
  tokenTitolo: string[];
  tokenTesto: string[];
  lunghezza: number;
}

const INDICE: SezioneIndicizzata[] = [];
const DF = new Map<string, number>();
let indicePronto = false;
let N_DOC = 0;
let LUNGHEZZA_MEDIA = 1;

/**
 * Costruisce l'indice di ricerca alla prima interrogazione: il caricamento
 * dei JSON avviene all'avvio, quindi non può essere fatto al module-load.
 */
function assicuraIndice(): void {
  if (indicePronto) return;
  indicePronto = true;
  for (const doc of documenti()) {
    doc.sezioni.forEach((sezione, indice) => {
      const tokenTitolo = tokenizza(sezione.titolo);
      const tokenTesto = tokenizza(sezione.testo);
      const lunghezza = tokenTesto.length + tokenTitolo.length * 2;
      INDICE.push({ documentoId: doc.id, indice, sezione, tokenTitolo, tokenTesto, lunghezza });
      const visti = new Set([...tokenTitolo, ...tokenTesto]);
      for (const t of visti) DF.set(t, (DF.get(t) ?? 0) + 1);
    });
  }
  N_DOC = INDICE.length;
  LUNGHEZZA_MEDIA = N_DOC > 0 ? INDICE.reduce((s, d) => s + d.lunghezza, 0) / N_DOC : 1;
}

const K1 = 1.5;
const B = 0.75;
const PESO_TITOLO = 3;

function idf(termine: string): number {
  const df = DF.get(termine) ?? 0;
  return Math.log(1 + (N_DOC - df + 0.5) / (df + 0.5));
}

function contaOccorrenze(token: string[], termine: string): number {
  let n = 0;
  for (const t of token) if (t === termine) n++;
  return n;
}

/** Costruisce un estratto attorno alla prima occorrenza di un termine della query. */
function costruisciEstratto(testo: string, termini: string[], maxLen = 260): string {
  const pulito = testo.replace(/\s+/g, ' ').trim();
  if (pulito.length <= maxLen) return pulito;

  const norm = normalizza(pulito);
  let pos = -1;
  for (const t of termini) {
    const p = norm.indexOf(t);
    if (p >= 0 && (pos < 0 || p < pos)) pos = p;
  }
  if (pos < 0) return pulito.slice(0, maxLen).trim() + '…';

  const inizio = Math.max(0, pos - 80);
  const fine = Math.min(pulito.length, inizio + maxLen);
  const prefisso = inizio > 0 ? '…' : '';
  const suffisso = fine < pulito.length ? '…' : '';
  return prefisso + pulito.slice(inizio, fine).trim() + suffisso;
}

/* ------------------------------------------------------------------ *
 * Raggruppamento in capitoli
 * ------------------------------------------------------------------ */

/** Rimuove il suffisso "(parte N)" aggiunto dallo splitter del PDF. */
function titoloBase(titolo: string): string {
  return titolo.replace(/\s*\(parte\s*\d+\)\s*$/i, '').trim();
}

/** Ripulisce un titolo per l'uso come intestazione di capitolo. */
function pulisciTitolo(titolo: string): string {
  return titolo
    .replace(/\s*\(\s*N\s*P\.?\s*[\d.\s]+\)\s*/gi, ' ')
    .replace(/\s*\(parte\s*\d+\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estrae il codice NP.a.b (o NP.a) da un titolo FINP. */
function codiceFinp(titolo: string): string | null {
  const m = titolo.match(/N\s*P\s*\.?\s*(\d+)\s*\.\s*(\d+)/i);
  if (m) return `NP.${m[1]}.${m[2]}`;
  const m2 = titolo.match(/N\s*P\s*\.?\s*(\d+)/i);
  return m2 ? `NP.${m2[1]}` : null;
}

/** Estrae il codice §n da un titolo WPS (solo numeri di capitolo plausibili). */
function codiceWps(titolo: string): string | null {
  const m = titolo.match(/^(\d+)\s*\./);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 20 ? `§${m[1]}` : null;
}

/** Raggruppa le sezioni FINP prive di codice NP in capitoli tematici. */
function bucketFinp(titolo: string): string {
  const u = titolo.toUpperCase();
  if (/^INTRODUZIONE|^ORGANIZZAZIONE|^TROFEO|^APPENDICE|TAPPER|^ALTRE CLASSI|^A LT R E|PRESENZA DI PIU/.test(u)) {
    return 'Introduzione e organizzazione';
  }
  if (
    /FUTURI CAMPIONI|^PUNTEGGI|^FINP\.|^FARFALLA|^DORSO|^RANA|^MISTI|^STILE LIBERO|^CATEGORIE|^• S1|^• S11|^GIOVED|^VENERD|^SABATO|^DOMENICA|MASCHI FEMMINE|^BONUS|^PROGRAMMA|S7\/S8|S11 S12|VISIVA|SB1 SB2|SB11 SB12|SM11|4X100|STAFFETTE: NON/.test(
      u
    )
  ) {
    return 'Programmi gare e tabelle';
  }
  if (/CONFRONTATI ALLA NORMATIVA|^LEGENDA|^10_ITA|^BATTERIE|^SERIE|^10\.10\.2_WPS|^11_WPS|^QUANTO SEGUE/.test(u)) {
    return 'Raffronto con la normativa internazionale WPS';
  }
  if (
    /^MODULO|^TASSE|^ASSOLUTI E DI SOCIETA|^TA S SE|^SANZIONI|^AMMENDE|^VISITE MEDICHE|IDONEITA|^DICHIARA|^IN FEDE|^IL GIUDICE|^DICHIARAZIONE|^CERTIFICA/.test(
      u
    )
  ) {
    return 'Modulistica, tasse e sanzioni';
  }
  return 'Altri articoli';
}

/** Raggruppa le sezioni WPS prive di codice §n in capitoli tematici. */
function bucketWps(titolo: string): string {
  const u = titolo.toUpperCase();
  if (/CLASSIFICATION|CLASSIFICAZIONE|CLASSES|CLASSI/.test(u)) return 'Classificazione';
  if (/PROTEST|APPEAL|RICORS/.test(u)) return 'Proteste e ricorsi';
  if (/RECORD/.test(u)) return 'Record';
  return 'Disposizioni generali';
}

/** Costruisce i capitoli di un documento, unendo le parti e raggruppando per codice. */
function costruisciCapitoli(doc: DocumentoRegolamento): CapitoloRegolamento[] {
  const isFinp = doc.id.startsWith('finp');
  const capitoli: CapitoloRegolamento[] = [];
  const perChiave = new Map<string, CapitoloRegolamento>();
  const posizione = new Map<string, number>();

  doc.sezioni.forEach((sezione, indice) => {
    const base = titoloBase(sezione.titolo);
    const codice = isFinp ? codiceFinp(sezione.titolo) : codiceWps(sezione.titolo);
    const chiave = codice ?? (isFinp ? bucketFinp(base) : bucketWps(base));

    let capitolo = perChiave.get(chiave);
    if (!capitolo) {
      capitolo = { chiave, titolo: codice ? pulisciTitolo(base) : chiave, codice: codice ?? undefined, sezioni: [] };
      perChiave.set(chiave, capitolo);
      posizione.set(chiave, indice);
      capitoli.push(capitolo);
    }

    // Unisce le sezioni consecutive con lo stesso titolo base (es. "(parte 1/2)").
    const ultima = capitolo.sezioni[capitolo.sezioni.length - 1];
    if (ultima && titoloBase(ultima.titolo) === base) {
      ultima.testo += '\n\n' + sezione.testo;
      ultima.indici.push(indice);
    } else {
      capitolo.sezioni.push({ titolo: base, testo: sezione.testo, indici: [indice] });
    }
  });

  // Ordina i capitoli secondo la posizione della loro prima sezione nel documento.
  return capitoli.sort((a, b) => (posizione.get(a.chiave) ?? 0) - (posizione.get(b.chiave) ?? 0));
}

const CAPITOLI_CACHE = new Map<string, CapitoloRegolamento[]>();

export class RegolamentiService {
  static meta(): MetaRegolamenti {
    return data()?.meta ?? META_VUOTA;
  }

  static documenti(): DocumentoRegolamento[] {
    return documenti();
  }

  static documento(id: string): DocumentoRegolamento | null {
    return documenti().find(d => d.id === id) ?? null;
  }

  static sezioni(documentoId: string): SezioneRegolamento[] {
    return this.documento(documentoId)?.sezioni ?? [];
  }

  /** Capitoli di un documento (sezioni raggruppate e parti unite). */
  static capitoli(documentoId: string): CapitoloRegolamento[] {
    const cached = CAPITOLI_CACHE.get(documentoId);
    if (cached) return cached;
    const doc = this.documento(documentoId);
    if (!doc) return [];
    const capitoli = costruisciCapitoli(doc);
    CAPITOLI_CACHE.set(documentoId, capitoli);
    return capitoli;
  }

  /** Trova il capitolo che contiene una data sezione (per indice nel documento). */
  static capitoloDi(documentoId: string, indice: number): CapitoloRegolamento | null {
    for (const cap of this.capitoli(documentoId)) {
      if (cap.sezioni.some(s => s.indici.includes(indice))) return cap;
    }
    return null;
  }

  /** Numero totale di capitoli su tutti i documenti. */
  static totaleCapitoli(): number {
    return documenti().reduce((n, d) => n + this.capitoli(d.id).length, 0);
  }

  static totaleSezioni(): number {
    assicuraIndice();
    return INDICE.length;
  }

  /**
   * Ricerca locale (BM25) su tutte le sezioni dei regolamenti.
   * Restituisce i risultati ordinati per rilevanza.
   */
  static cerca(query: string, limite = 12, documentoId?: string): RisultatoRicerca[] {
    assicuraIndice();
    const termini = tokenizza(query);
    if (termini.length === 0) return [];

    const risultati: RisultatoRicerca[] = [];

    for (const doc of INDICE) {
      if (documentoId && doc.documentoId !== documentoId) continue;

      let punteggio = 0;
      let matchTitolo = false;

      for (const termine of termini) {
        const tfTitolo = contaOccorrenze(doc.tokenTitolo, termine);
        const tfTesto = contaOccorrenze(doc.tokenTesto, termine);
        if (tfTitolo === 0 && tfTesto === 0) continue;

        const idfT = idf(termine);
        const denom = tfTesto + K1 * (1 - B + B * (doc.lunghezza / LUNGHEZZA_MEDIA));
        const contributoTesto = (tfTesto * (K1 + 1)) / (denom || 1);
        punteggio += idfT * (contributoTesto + tfTitolo * PESO_TITOLO);
        if (tfTitolo > 0) matchTitolo = true;
      }

      if (punteggio > 0) {
        const documento = this.documento(doc.documentoId)!;
        const encodedTerm = encodeURIComponent(termini[0] || doc.sezione.titolo);
        const urlPuntato = `${documento.url}#search=${encodedTerm}`;
        risultati.push({
          documentoId: doc.documentoId,
          documentoTitolo: documento.titolo,
          fonte: documento.fonte,
          url: urlPuntato,
          indice: doc.indice,
          sezione: doc.sezione,
          punteggio,
          estratto: costruisciEstratto(doc.sezione.testo, termini),
          matchTitolo
        });
      }
    }

    return risultati.sort((a, b) => b.punteggio - a.punteggio).slice(0, limite);
  }

  /** Suggerimenti di ricerca rapida mostrati nella UI. */
  static suggerimenti(): string[] {
    return [
      'categorie età',
      'classi sportive',
      'partenze',
      'virate',
      'staffette',
      'codici eccezione',
      'classificazione',
      'proteste ricorsi',
      'record',
      'tesseramento'
    ];
  }
}
