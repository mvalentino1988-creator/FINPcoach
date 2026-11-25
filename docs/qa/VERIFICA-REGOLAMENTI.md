# Verifica regolamenti e fonti — QUARTO GIRO (R4)

Data: 2026-11-24. Fonti locali: `finp-src/regolamento-tecnico-nuoto-2026.txt` (5226 righe, PDF omologo),
`finp-src/records.json` (4487 record grezzi), `finp-src/record-25m/50m.txt`.

## 1. `public/data/regolamenti.json` vs regolamento FINP 2026

Struttura: 2 documenti — `finp-tecnico-2026` (248 sezioni) e `wps-rules-2026` (149 sezioni).
Le sezioni FINP sono `{titolo, testo}` con testo breve (estratto indicizzabile, media ~150 caratteri),
non il corpo integrale del regolamento: il file è un indice di ricerca, non una copia.

### Esito dei controlli

- **Testi**: 244/248 testi delle sezioni FINP ricorrono quasi integralmente nel sorgente.
  Le 4 eccezioni sono scarti di encoding/impaginazione (capolettera `�`, a-capo in mezzo alle
  parole, legature tipografiche), non contenuti estranei: sez. 3 (appendice codici), 108
  ("DOMENICA MATTINA"), 115 ("BONUS GIOVANI"), 136 (classi S11-S13 V.I.). Nessuna correzione
  necessaria: la ricerca normalizza gli spazi.
- **Ordine**: tutti i testi compaiono nel sorgente in ordine monotono → nessuna sezione
  duplicata o spostata. I titoli ripetuti ("CLASSI SPORTIVE DEGLI ATLETI FINP" x3, "Dorso" x4,
  ecc.) sono segmenti "(parte N)" della stessa norma, non duplicati.
- **Capitoli mancanti** (righe di capitolo del sorgente senza sezione omonima nel JSON):
  - `NP.1.24` TIPOLOGIA DI GARE PREVISTE DAL WORLD PARA SWIMMING — **assente del tutto**
    (single class event, MQS, ranking tabellare). Impatto: la ricerca non trova queste norme.
    Non corretto in questo giro: richiede una nuova sezione nel JSON (lavoro di data-entry,
    non di codice). Annotato come gap noto.
  - `NP.1.5.1` Partenza (codici eccezione H/Y/Z) — il codice udino compare in `NP.1.9.1.5`
    e nel testo, ma il paragrafo introduttivo dei codici non ha sezione dedicata.
  - Capitoli padre `NP.1.25` (TASSE e AMMENDE), `NP.1.27` (MANIFESTAZIONI IN VASCA),
    `NP.1.30`-`NP.1.35` (campionati giovanile/invernali/estivi/master/vasca corta):
    il **contenuto è presente** sotto le sotto-sezioni numerate (es. `PARTECIPAZIONE
    (NP.1.30.1)`, `TASSE ISCRIZIONI`, `AMMENDE`, `partecipazione atleti stranieri
    (NP.1.27.4)`); manca solo il titolo di capitolo riassuntivo. Impatto minimo sulla ricerca.
- **Sezione 0 sospetta**: `Introduzione` ha come testo la riga "PROTOCOLLO PER LE PARTENZE…"
  che nel sorgente è un titolo di paragrafo a pagina 10, non un'introduzione. È un artefatto
  del parsing iniziale (la prima sezione ha raccolto il primo headline disponibile). Il testo
  non è sbagliato di per sé (esiste nel regolamento), ma è etichettato male. Lasciato com'è:
  rinominare la sezione richiederebbe rigenerare l'indice.
- **Sezioni WPS (149)**: nessuna fonte WPS locale presente in `finp-src/` → **non verificabile
  con le fonti presenti**. Struttura interna coerente (sezioni numerate 1.x-10.x, inclusa
  `10.4 Events and Programme of Events` usata dalla verifica gare ammissibili).
  Non riscritto né integrato: divieto esplicito di inventare testi.

### Query di ricerca (25 query reali)

Coperte da `src/domain/regolamentiRicerca.test.ts` (25 query: partenza, viraggio/virata,
squalifica, classificazione, tocco, ausili, staffetta, protesta, ricorso, record, iscrizione,
serie, grembiule, mutande, cuffia, occhiali, tappetino, segnalatore, giudice, tempo limite,
punteggio, tesseramento, ostacolo, acqua, classi sportive, categoria atleti).
Ogni query deve produrre il risultato atteso nei primi 3 — test verde nella suite.
Gap noto: query su "tipologia gare"/"single class" non trovano nulla (NP.1.24 assente).

## 2. `src/data/gare-ammissibili.json` (regola WPS 10.4.1)

Verifica in `src/domain/gareAmmissibiliVerifica.test.ts` (verde):
- La regola 10.4.1 è presente nel documento WPS del JSON.
- Ogni evento individuale del JSON ha la riga corrispondente nella regola
  (50/100/200/400 SL, 50/100 dorso, 50/100 rana, 50/100 farfalla, 75/100/200 misti).
- Intervalli di classi controllati per ciascuna delle 14 classi (S1-S14, SB1-SB14,
  SM1-SM14): es. 200m SL = S1-S5 + S6-S14 escluso S14-only? — verificato: S14 ammessa solo
  su 200m SL; misti 75/100 solo in vasca corta; rana 100m esclude SB10.
- Casi limite: atleta senza classe → `classe_mancante`; gara non in programma → `non_ammessa`.

## 3. Campionamento record: `public/data/records.json` vs `finp-src/records.json`

- Pubblico: 3684 record normalizzati (da 4487 grezzi; vacant/unknown esclusi — dichiarato in meta).
- Campione casuale (seed 42) di **50 record pubblici** confrontati con i grezzi per
  (vasca, genere, distanza, stile, classe, tipo, categoria): **50/50 corrispondenti** —
  tempo, detentore, anno, nazione, luogo, data e manifestazione identici.
- `src/domain/recordsVerifica.test.ts` copre integrità strutturale (campi, tempi parsabili,
  meta fonte/data aggiornamento 26/07/2026).

## 4. Esito

- Regolamenti.json FINP: contenuto sostanzialmente fedele; gap = capitolo NP.1.24 assente
  e titoli di capitolo riassuntivi mancanti (contenuto comunque indicizzato).
  Sezione "Introduzione" con etichetta errata (artefatto parser).
- WPS: non verificabile con le fonti locali (dichiarato).
- Gare ammissibili: verificato contro 10.4.1, test verdi.
- Record: campione 50/50 OK.

---

# Aggiornamento — QUINTO GIRO (2026-11-25)

I gap di capitoli segnalati al quarto giro sono stati chiusi: `regolamenti.json`
passa da 248 a **258 sezioni** (+10, inserite verbatim da
`finp-src/regolamento-tecnico-nuoto-2026.txt` via
`scripts/integrazione-sezioni-regolamenti.mjs`, idempotente):

- `NP.1.5.1` Partenza — codici eccezione
- `NP.1.24` Tipologia di gare WPS (il gap più rilevante: MQS, single class
  event, ranking tabellare)
- `NP.1.25` Tasse e ammende
- `NP.1.27` Manifestazioni in vasca
- `NP.1.30`–`NP.1.35` Campionati (giovanile, invernali, estivi, master,
  vasca corta)

Test di ricerca aggiornati in `src/domain/regolamentiRicerca.test.ts`
(conteggio 258; la query "tempo limite" ora include legittimamente NP.1.24
dato che parla di MQS). Restano noti: sezione "Introduzione" con etichetta
imperfetta (artefatto parser, invariata) e documenti WPS non verificabili
con le fonti locali.
