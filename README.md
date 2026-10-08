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

### 5. 📊 Registro Presenze, Monitoraggio Carico & Prevenzione Infortuni
- Registro giornaliero per la registrazione rapida delle presenze, metri effettivi nuotati e percezione dello sforzo (scala RPE 1–10).
- **Indice ACWR (Acute:Chronic Workload Ratio)**:
  - Analisi del carico acuto (ultimi 7 giorni) rispetto al carico cronico (ultimi 28 giorni).
  - Visualizzatore dinamico della **Sweet Spot** (zona ottimale 0.8–1.3, attenzione 1.3–1.5, pericolo infortuni >1.5).
- **Gestione Dati & Backup**:
  - Esportazione istantanea di tutti i dati in file JSON portabile.
  - Ripristino / importazione da backup.
  - Dati residenti al 100% in locale sul dispositivo.

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

# Verifica tipi e compila per la produzione
npm run build
```

La build web aggiorna anche le risorse web incorporate nell'app Android (`app/src/main/assets/web`).
L'app Android le mostra in una WebView locale, quindi l'interfaccia non dipende da un server remoto.
Su Android i dati della nuova interfaccia sono salvati nello storage privato della WebView; eventuali dati
del database Room della precedente interfaccia nativa restano sul dispositivo ma non sono mostrati qui.

---

## 🏊 Autore
Sviluppato per allenatori e tecnici del nuoto paralimpico italiano (FINP / World Para Swimming).
