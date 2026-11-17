# FINPcoach - Nuoto Paralimpico

Piattaforma gestionale e tecnica all'avanguardia per allenatori della **FINP (Federazione Italiana Nuoto Paralimpico)** e atleti del circuito **World Para Swimming (WPS)**.

---

## 🌟 Funzionalità Principali

### 1. 👥 Gestione Atleti & Classificazione Paralimpica
- **Classi Sportive World Para Swimming**:
  - Classi $S$ (Stile libero, Dorso, Farfalla), $SB$ (Rana) e $SM$ (Misti).
  - Validazione rigorosa conforme al regolamento WPS (classi 1–14, con controllo di validità sulle classi inesistenti come $SB10$).
- **Assistente Medico & Stima Classi (`FINPSpecialistAI`)**:
  - Analisi semantica avanzata delle cartelle e diagnosi mediche (amputazioni, lesioni midollari, paralisi cerebrale, patologie neurologiche, disabilità visive S11-S13 e intellettive S14).
  - Stima motivata delle classi di appartenenza ed evidenziazione dei criteri di minima disabilità (MDC).
  - **Avvertenze mediche automatiche** (prevenzione piaghe da decubito, disriflessia autonomica, spasticità indotta da acido lattico eccessivo, ipotermia).
  - **Programma Gare Ammissibili**: suggerimento automatico di tutte le distanze e stili consentiti dal regolamento ufficiale per la classe dell'atleta.
- **Volume Individuale Calibrato**:
  - Percentuale di carico personalizzata in base all'età, stato fisico o rientro da infortunio (manuale o auto-aggiornata).
  - Gestione assenze e periodi di stop con riadattamento graduale del carico.

---

### 2. 📅 Pianificazione Stagionale Paralimpica (`PianoGenerator`)
- **Generatore Automatico di Macrocicli e Mesocicli**:
  - Divisione stagionale in mesocicli di **Preparazione Generale**, **Preparazione Specifica**, **Pre-gara** e **Competitiva**.
  - Microcicli specializzati: *Adattamento*, *Carico*, *Shock*, *Recupero*, *Tapering*, *Gara*, *Pausa*.
- **Festività Nazionali Italiane Computazionali**:
  - Calcolo algoritmico della Pasqua (Meeus/Jones/Butcher) e Pasquetta per qualsiasi anno.
  - Generazione automatica di tutte le festività civili e religiose italiane (Natale, Santo Stefano, Capodanno, Epifania, 25 Aprile, 1 Maggio, 2 Giugno, Ferragosto, Tutti i Santi, Immacolata).
- **Gestione Gare e Picchi di Forma**:
  - Tapering automatico per gare prioritarie (Campionati Italiani Assoluti Invernali/Estivi, World Series).
  - Settimane di recupero attivo post-gara.
  - Possibilità di bloccare/sbloccare manualmente qualsiasi microciclo per modifiche sartoriali.
- **Validatore Tecnico del Carico**:
  - Monitoraggio balzi di volume tra settimane consecutive (>10% avviso, >20% errore di sovraccarico).
  - Allarme per blocchi di carico continuativo prolungato (>4 settimane consecutive).

---

### 3. 🏊‍♂️ Schede d'Allenamento Bordo Vasca (`GeneratoreSmartSeduta`)
- Generazione istantanea della seduta in base a:
  - Fase del mesociclo e tipologia di microciclo (es. Carico vs Tapering vs Recupero).
  - Volume target (squadra o singolo atleta).
  - Adattamenti individuali per età (Master, Assoluti, Giovanili).
  - Prescrizioni e limitazioni mediche (es. ausili galleggianti, divieto serie ad alto lattato, spinta monolaterale).
- **Articolazione in 4 Fasi**:
  1. *Riscaldamento* (A1)
  2. *Esercizio Tecnico / Sensibilità* (A1)
  3. *Serie Principale* (A2/B1/B2/C1/C2/D)
  4. *Defaticamento* (A1)
- **Strumenti Bordo Vasca**:
  - **Copia rapida** per invio su WhatsApp / Telegram.
  - **Modalità Stampa Bordo Vasca** ottimizzata (`@media print` pulito senza elementi di navigazione).

---

### 4. ⏱️ Tempi, Andature & Calcolo Ripartenze
- **Critical Swim Speed (CSS)**:
  - Calcolo scientifico della soglia anaerobica/aerobica da test su 400m e 100m stile libero.
- **Tabella Ripartenze a 5 Secondi**:
  - Ripartizioni sui codici FINP (A1, A2, B1, B2, C1, C2, D) con arrotondamento automatico a multipli di 5 secondi per la massima leggibilità sul cronometro bordo vasca a lancette o digitale.
- **Importazione OCR / Testo**:
  - Caricamento tempi rapido da stringhe di testo o report gare.
- **Form Check & Valutazione Stato di Forma**:
  - Avviso proattivo per ripetere test di velocità quando il dato temporale è obsoleto rispetto al mesociclo.

---

### 5. 🏊 Bordo Vasca: Regia, Assegnazione e Cronometro multi-corsia
- **Regia Tecnica**: assegnazione corsie e ordine di partenza, gestione presenze e ripartenze automatiche a intervalli configurabili. È la fonte unica di verità della composizione della vasca.
- **AssegnazioneVasca persistita**: stato salvato in `finp_vasca_assegnazione_v1` con migrazioni di schema; sopravvive alla chiusura dell'app e al passaggio Regia ↔ Cronometro senza perdita di dati.
- **Cronometro multi-corsia**: partenze manuali e automatiche timestamp-based, giri, stop, recuperi e ripartenze per atleta; wake lock e orientamento ottimizzato per le corsie visibili (ruota solo quando la serie è ferma, con isteresi); badge "partenza recuperata" per le partenze automatiche in ritardo dopo sospensione della WebView.
- **Feedback fisico**: beep e vibrazione disattivabili, compatibili con `prefers-reduced-motion`.

---

### 6. 📊 Registro Presenze, Monitoraggio Carico & Prevenzione Infortuni
- Registro giornaliero per la registrazione rapida delle presenze, metri effettivi nuotati e percezione dello sforzo (scala RPE 1–10).
- **Indice ACWR (Acute:Chronic Workload Ratio)**:
  - Analisi del carico acuto (ultimi 7 giorni) rispetto al carico cronico (ultimi 28 giorni).
  - Visualizzatore dinamico della **Sweet Spot** (zona ottimale 0.8–1.3, attenzione 1.3–1.5, pericolo infortuni >1.5).
- **Gestione Dati & Backup**:
  - Esportazione istantanea di tutti i dati in file JSON portabile.
  - Ripristino / importazione da backup.
  - Dati residenti al 100% in locale sul dispositivo.

---

### 7. 📚 Fonti: Record, Regolamenti e Calendario

Il tab **Fonti** raccoglie snapshot locali consultabili anche offline:

- **Record FINP**: record italiani per categoria e record europei/mondiali, filtrabili per evento, classe, genere e vasca; confronto opzionale con i tempi registrati dell'atleta. Dati aggiornati al **26/07/2026** secondo il dataset importato; verificare la fonte ufficiale per eventuali aggiornamenti.
- **Regolamenti FINP e World Para Swimming**: consultazione per capitoli e articoli, collegamenti alle fonti e ricerca locale per parole chiave (ranking BM25, senza backend o richiesta Internet).
- **Calendario nazionale FINP 2026**: 13 eventi di nuoto, fondo e pallanuoto, filtrabili per date future e raggruppati per mese. Le gare possono essere aggiunte/rimosse dalla stagione con conferma; le prioritarie sono considerate dal piano per il picco e lo scarico pre-gara.

I dataset sono snapshot e non si aggiornano automaticamente: controllare sempre i regolamenti, i record e le date sul sito ufficiale FINP/WPS prima di prendere decisioni sportive o iscrivere atleti.

---

## 💻 Stack Tecnologico

- **Framework**: React 18 SPA con TypeScript
- **Bundler**: Vite 6
- **Stile**: Tailwind CSS
- **Icone**: Lucide React
- **Architettura**: Domain-Driven Design (separazione netta tra logica di calcolo scientifica `src/domain/` e interfaccia grafica `src/components/`)
- **Persistenza**: LocalStorage con schema tipizzato e seed iniziale completo

---

## 🚀 Avvio in Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo su http://localhost:3000
npm run dev

# Verifica tipi
npx tsc --noEmit

# Lint (ESLint: typescript-eslint + react-hooks + jsx-a11y)
npm run lint

# Test unitari del dominio (Vitest)
npm test

# Compila per la produzione e sincronizza gli asset Android
npm run build
```

La build web aggiorna anche le risorse web incorporate nell'app Android (`app/src/main/assets/web`).
L'app Android le mostra in una WebView locale, quindi l'interfaccia non dipende da un server remoto.
Su Android i dati della nuova interfaccia sono salvati nello storage privato della WebView; eventuali dati
del database Room della precedente interfaccia nativa restano sul dispositivo ma non sono mostrati qui.

---

## 🔐 Dati, backup e sincronizzazione

- **Dati solo locali** di default (`allowBackup=false` su Android): l'app ricorda all'utente di esportare un backup.
- **Backup JSON** con validazione tipizzata e importazione atomica: un file corrotto o di versione futura non danneggia i dati esistenti (snapshot + ripristino automatico).
- **Backup cifrato** `.finpbackup` (AES-GCM + PBKDF2, password dell'utente; password dimenticata = dati non recuperabili).
- **`iaConfig` e chiavi API non sono mai** incluse nei backup né inviate a Firebase.
- **Sincronizzazione Firebase opzionale**: richiede consenso esplicito, credenziali `VITE_FIREBASE_*` e utente autenticato; il SDK è caricato con import dinamico solo quando serve.
- **Promemoria backup**: data dell'ultimo export in Dati & Backup e avviso in Oggi oltre la soglia configurata (default 14 giorni).

## 📦 Versione e struttura

- Versione in `package.json` (`0.2.0`), allineata a `versionName` in `app/build.gradle.kts`; `versionCode` va incrementato a ogni rilascio. Versione e data build visibili in **Altro → piè di pagina**.
- Procedura di rilascio e firma: `docs/RILASCIO.md`.
- `src/domain/` logica sportiva pura (testata), `src/components/` UI, `src/data/` persistenza e sync, `src/lib/` utility.
- `public/data/` snapshot JSON (records, regolamenti, calendario) con le rispettive date di aggiornamento.

## ⚠️ Limiti noti

- I dataset di Fonti sono **snapshot** (vedi date in app): non si aggiornano automaticamente.
- L'OCR usa Tesseract.js con worker/lingue bundled in `public/tesseract` (caricato solo all'uso).
- `npm audit` segnala 4 vulnerabilità high residue in dipendenze transitive di Firebase (`@grpc/grpc-js`): non risolvibili senza downgrade di Firebase (documentato nel report).

---

## 🏊 Autore
Sviluppato per allenatori e tecnici del nuoto paralimpico italiano (FINP / World Para Swimming).
