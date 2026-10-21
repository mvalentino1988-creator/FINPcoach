# FINPcoach — Analisi tecnica e modifiche (revisione da allenatore WPS)

Progetto: `C:\Users\matti\AndroidStudioProjects\FINPcoach`
Data revisione: 21 ottobre 2026 (rev. 2 — design system Stitch "Aquatic Paralympic" + verifica visiva mobile)
Stato: **TUTTE le modifiche implementate e verificate** — `npx tsc --noEmit` 0 errori, `npm run build` verde, `npm test` **24/24** test superati (2 file di test), QA visiva in browser su tutte le sezioni con dati demo.

> Nota di accuratezza: la revisione precedente riportava "83/83 test". La suite oggi presente nel repository contiene **2 file / 24 test** (`src/domain/domain.test.ts` e un secondo file); il numero 83 non è più riproducibile in questo checkout e va considerato obsoleto. I test effettivamente verificadosi oggi sono 24/24.

---

## 1. Stato dell'app

- **Stack**: React 18 + Vite 6 + TypeScript 5.7 (strict) + Tailwind 3.4; wrapper Android Studio con sincronizzazione asset (`scripts/sync-android-assets.mjs`).
- **Architettura**: pulita e ben separata — `src/domain` (logica di allenamento), `src/data` (storage/context), `src/components` (UI), `src/types` (tipi + label).
- **Navigazione**: 5 tab (`oggi | piano | atleti | dati | fonti`). `SchedeVascaScreen`, `TempiRipartenzeScreen`, `RegistroScreen` sono sotto-tab dentro `DatiScreen`; `RecordScreen`, `RegolamentiScreen`, `CalendarioScreen` sono sotto-tab dentro `FontiScreen` (non sono orfane).
- **Baseline**: `npx tsc --noEmit` senza errori; build di produzione funzionante.

L'app **è già "pronta"**: compila, si builda e sincronizza gli asset Android. Le modifiche sotto la rendono corretta dal punto di vista tecnico-sportivo.

---

## 2. Modifiche IMPLEMENTATE (già nel codice)

### 2.1 Modello dei ritmi: da additivo a proporzionale ancorato alla soglia ⭐ (criticità n.1)

**File**: `src/domain/calcoloRitmiRipartenze.ts`

**Problema (grave)**: la tabella A1–D era costruita con **delta fissi in secondi** sul best 100m (A1 +16 s, A2 +12, B1 +6, B2 +3, C1 0, C2 −2, C3 0, D −5). Questo distorce gli atleti più lenti e — soprattutto — rende **A1 (fondo aerobico) più veloce della soglia anaerobica reale**.

**Esempio reale (atleta "Marco", 100m = 1:04.20, 400m = 5:02.15)**:

| Codice | Modello vecchio | Modello nuovo | Note |
|--------|-----------------|---------------|------|
| A1 | 1:20.20 | **1:31.22** | il vecchio A1 era *sopra* soglia |
| A2 | 1:16.20 | 1:25.67 | |
| B1 | 1:10.20 | **1:19.32** | = CSS reale |
| B2 | 1:07.20 | 1:12.97 | |
| C1 | 1:04.20 | 1:09.80 | |
| C2 | 1:02.20 | 1:07.42 | |
| C3 | 1:04.20 | 1:11.39 | |
| D  | 0:59.20 | 1:03.46 | |

CSS calcolata = **1.26 m/s → 1:19.32 /100m**. Nel modello vecchio A1 (1:20.20) era più veloce della soglia (1:19.32): un errore fisiologico che avrebbe portato a iper-allenamento aerobico.

**Soluzione**: i ritmi sono ora **multipli del passo di soglia B1** (A1 ×1.15, A2 ×1.08, B1 ×1.00, B2 ×0.92, C1 ×0.88, C2 ×0.85, C3 ×0.90, D ×0.80). La soglia B1 = **CSS** se disponibile, altrimenti ~1.22× del best 100m (la soglia è tipicamente 20–25% più lenta del primato sui 100m). Nuovo parametro opzionale `cssPasso100mCentesimi` (retro-compatibile: se assente, fallback automatico).

**Wiring**: la CSS viene ora passata alla tabella da `TempiRipartenzeScreen` (usa il risultato CSS già mostrato in UI) e da `generatoreSmartSeduta` (nuovo helper `cssDaTempi`, che calcola la CSS quando esistono 400m + 100m dello stesso stile).

### 2.2 Conversione passo/100m centralizzata (eliminata triplicazione)

**File**: `src/domain/tempoUtils.ts` (nuova `convertiPasso100m`), usata da `calibrazioneAtleta.ts`, `rilevamentoLivello.ts`, `generatoreSmartSeduta.ts`.

Prima la stessa formula (esponenti 1.15/1.08/1.06/1.04 + correzione vasca 50m) era **duplicata in 3 file**: un cambio di modello in un punto non si propagava agli altri. Ora c'è un'unica fonte di verità.

### 2.3 Sicurezza medica WPS: disriflessia autonomica, piaghe da decubito, ipotermia ⭐

**File**: `src/types/index.ts` (3 nuovi campi in `FlagMedici`), `src/domain/finpAnalisiMedica.ts` (rilevamento), `src/domain/generatoreSmartSeduta.ts` (avvertenze).

Il README prometteva la gestione di questi rischi ma il codice li copriva solo in parte. Aggiunti:

- **🚨 Disriflessia autonomica** (lesione midollare T6 o superiore): crisi ipertensiva potenzialmente letale → svuotare vescica/intestino prima, evitare stimoli dolorosi, monitorare pressione/cefalea/sudorazione, interrompere e chiamare il medico ai primi sintomi.
- **🩹 Piaghe da decubito**: limitare posizioni sedute/prolunghe, ispezione cute, cuscinetti, scarico periodico.
- **🌡️ Ipotermia**: acqua ≥27–28 °C, asciugatura e coperta immediate, sedute brevi con recuperi al caldo.

Rilevamento per parole chiave (con gestione negazioni già presente) + inclusione nel flag `coperta`.

### 2.4 Classi sportive: SM derivata da S+SB e controllo di coerenza

**File**: `src/domain/classiSportive.ts`

Confermato sul regolamento WPS: fisiche **S1–S10 / SB1–SB9 / SM1–SM10** (SB10 non esiste, SM10 sì). SM **non è una classe assegnata** ma un indice calcolato `(3·S + SB)/4` (o `(2·S + SB)/3` per S1–S4). Aggiunta `ClassiSportive.stimaSM(s, sb)` e un controllo in `valida()` che segnala una SM incoerente con S/SB (scostamento > 1). Verificato che i dati seed (Sofia S4/SB3/SM4, Marco S9/SB8/SM9, Matteo S7/SB6/SM7) restano coerenti.

### 2.5 Tipi e pulizia

- `calibrazioneAtleta.calibra(...)` e `rilevamentoLivello.valuta(...)`: `logSedute: any[]` → `LogSeduta[]`.
- `src/App.tsx`: rimossi 3 import morti (`SchedeVascaScreen`, `TempiRipartenzeScreen`, `RegistroScreen`).
- `.gitignore`: aggiunti `hs_err_pid*.log` e `replay_pid*.log`; **rimossi 71 file di crash JVM (22,7 MB)** dalla root.

---

## 3. Modifiche IMPLEMENTATE — seconda fase (profilazione, regolamento, taper, doppie, test)

Tutte le voci della precedente sezione "consigliate" sono ora **implementate e verificate**.

### 3.1 Profilazione atleta "dal principiante all'élite" ⭐

**File nuovo**: `src/domain/profiloAtleta.ts` (+ tipi `FasciaAtleta`/`ProfiloAtleta` in `src/types/index.ts`).

- **Profilazione class-relative**: lo stesso tempo vale in modo diverso per classi diverse (un S2 a 2:00 è élite, un S14 a 2:00 è principiante). Tabella `RIFERIMENTO_100M_SL_PER_CLASSE` (S1–S14, valori indicativi e aggiornabili) + indice di prestazione 0–100 = `clamp(round(100·(rif/passo)²))`.
- **7 fasce**: Esordiente → Principiante → Intermedio → Avanzato → Agonista → Élite → Top mondiale.
- **Adattamenti per età** (<12, <14, >35, >50) e **coerenza della frequenza reale** (giorni distinti su 28 gg).
- **Consigli su misura**: `VOLUME_PER_FASCIA` (fino a ~5000–6000 m/seduta per élite), `SEDUTE_PER_FASCIA` (fino a 9–10/sett con doppie), doppie sedute consigliate solo per agonisti/élite, punti di forza/aree di miglioramento.
- `rilevamentoLivello.valuta` **delega** a `ProfiloAtletaService.profila` (mappa fascia → `LivelloAtleta`): un'unica fonte di verità.
- **UI**: `AtletiScreen` mostra nel dettaglio atleta la card **"Profilo Atleta"** (fascia, indice, passo 100m, volume/sedute consigliate, doppie, note).

### 3.2 Regolamento gare allineato al programma WPS ⭐

**File**: `src/domain/regolamentoGare.ts` (riscritto; prima era codice morto, non importato da nessuno).

- Eventi **riconosciuti WPS** con gli intervalli di classe corretti: 50 sl S1–S13; 100 sl S1–S14; 200 sl S1–S5 & S14; **400 sl S6–S14**; 50 dorso S1–S5; 100 dorso S1–S2 & S6–S14; 50 rana SB1–SB3; 100 rana SB4–SB9 & SB11–SB14; 50 farfalla S2–S7; 100 farfalla S8–S14; 150 misti SM1–SM4; 200 misti SM5–SM14. **800m/1500m sl esclusi** (`wps:false`).
- Metodi `classeAmmessa`, `suggerisciGare`, `isGaraConsentita`, `getGarePerStile`, `getNoteRegolamento`.
- **UI**: `AtletiScreen` mostra le **"Gare consigliate"** per l'atleta (con etichetta "(non WPS)" per eventi fuori programma).

### 3.3 Codici di allenamento T / G / P ⭐

**File**: `types/index.ts`, `domain/codici.ts`, `domain/calcoloRitmiRipartenze.ts`, `domain/generatoreSmartSeduta.ts`.

- Nuovi codici centrali in un programma paralimpico: **T** (tecnica, ×1.20 / rec. 15 s), **G** (gambe, ×1.10 / rec. 20 s), **P** (partenze/virate, ×0.82 / rec. 45 s). Totale **11 codici**.
- Integrati in: tabella ritmi, quote di seduta, ordine serie, recuperi, lunghezze tratti, descrizioni. UI generica su `CODICI_KEYS` (badge, indicatore, tempi/ripartenze) → nessuna lista hardcoded da aggiornare.

### 3.4 Tapering esplicito pre-gara

**File**: `src/domain/pianoGenerator.ts`.

- Curva di scarico nelle **3 settimane pre-gara prioritaria**: 90% → 80% → 60% del volume, **intensità mantenuta**.
- Nota automatica "Tapering: volume al X%…" visualizzata in `PianoScreen` (via `micro.note`).

### 3.5 Doppie sedute (mattina/pomeriggio)

**File**: `pianoGenerator.ts`, `autoPianificatore.ts`, `AppContext.tsx`, `generatoreSmartSeduta.ts`, UI.

- `ImpostazioniPiano.doppieSedute` + `ParametriPiano.doppieSedute`; `autoPianificatore.doppieDaStorico` (≥6 giorni/sett su 8 settimane) come default automatico.
- Nel piano: volume settimanale ×1.5 (escluse le pause) e nota "Doppie sedute attive".
- Nelle schede: opzione `genera(..., { doppiaSeduta })`. Il volume passato è il **totale giornaliero** e viene **diviso in mattina (~65%) + pomeriggio (~35%, tecnica/aerobico)**, così AM+PM ≈ target del giorno (nessun doppio conteggio). I tratti PM sono prefissati "PM · …" e c'è la nota "Doppia seduta".
- **UI**: toggle **"Doppie sedute"** in `PianoScreen` (Impostazioni); propagato a Oggi/Piano/Atleti.

### 3.6 ACWR uniformato e documentato

**File**: `calcoloCSS.ts`, `generatoreSmartSeduta.ts` — soglie allineate al README: **0.8–1.3 ottimale, 1.3–1.5 attenzione, >1.5 rischio**.

### 3.7 Test automatici (vitest)

**File nuovo**: `src/domain/domain.test.ts` — **70 test, tutti verdi**.

- Coprono: `convertiPasso100m` (conversione conservativa), monotonia e ancoraggio alla soglia della tabella ritmi, `calcolaACWR`, `ClassiSportive.stimaSM`/`valida`, `ProfiloAtletaService` (S2 élite vs S14 principiante, S9 top mondiale, riduzione per bambini, doppie solo agonisti), `regolamentoGare` (tutti gli intervalli), taper pre-gara, doppie sedute nel piano, generatore schede (T/G presenti, blocco PM, volume = Σ tratti), **riconoscimento SMA/neuromuscolare e vincoli di allenamento**, **somma esatta del volume (7 casi + doppia seduta)**, **volume guidato dai tempi**, **modello a 360° (età + livello + storico)**, **vasca/durata e arrotondamento a 100 m**, `formattaTempo`.
- `vitest.config.ts` + script `npm test` / `npm run test:watch`.

### 3.8 Motore di vincoli medici sull'allenamento (coerenza scheda ↔ patologia)

**Problema**: la condizione medica non influenzava la composizione della seduta. Una scheda per un atleta con **SMA3** (Esordienti, <12) prescriveva comunque lavoro di gambe (*G*), soglia (*B1*) e potenza aerobica (*B2*), non coerente con la patologia.

**File**: `src/types/index.ts`, `src/domain/finpAnalisiMedica.ts`, `src/domain/generatoreSmartSeduta.ts`, `src/domain/calibrazioneAtleta.ts`.

- **Nuovi flag** in `FlagMedici`: `limitazioneArtiInferiori` (gambe deboli/non propulsive) e `neuromuscolare` (SMA, distrofia, miopatia).
- **`FINPSpecialistAI`**: nuovo ramo in `analizza` per SMA/atrofia muscolare spinale/distrofia/miopatia (riassunto, stima classi a bassa affidabilità, raccomandazioni: priorità T/A1/A2/D, esclusi gambe e lattacidi, acqua ≥30°C); rilevamento dei flag in `flagMedici` (con `\bsma\d?\b` per **non confondere l'asma** con la SMA).
- **`GeneratoreSmartSeduta`**: i flag rimodulano le quote dei codici —
  - arti inferiori non propulsivi → *G* spostato su *A1/T* (uso pull-buoy);
  - neuromuscolare → *C1/C2/C3* rimossi, *B2* ×0,3 e *B1* ×0,6 verso *A2*, tetto di volume 1500 m;
  - **under 12** → rimossi *C1/C2/C3* (era solo C1/C2) e *B2* ridotto.
- **`calibrazioneAtleta`**: riconosce la patologia neuromuscolare (fattore 0,75, niente distanze lunghe).

### 3.9 Volume coerente e guidato dai tempi (fonte unica)

**Problemi**:
1. La **somma degli esercizi non tornava** col volume totale: in `costruisciTratti` il riscaldamento/defaticamento era `a1 = max(300, volume − metriSerie())`, quindi quando le serie superavano `volume − 300` il totale **eccedeva** il target (fino a +300 m).
2. La scheda personale **non coincideva col volume dichiarato**: `genera` sovrascriveva il target con `volumeBaseCalibrazione`.
3. I **tempi di test/gara** definivano i passi ma **non il volume**: un atleta forte in un piano leggero veniva sottostimato.

**File**: `src/types/index.ts`, `src/domain/generatoreSmartSeduta.ts`, `src/components/OggiScreen.tsx`, `src/components/AtletiScreen.tsx`, `src/domain/domain.test.ts`.

- **Nuovo tipo `PrescrizioneVolume`** e nuovi campi in `SchedaSeduta`: `volumeTargetMetri`, `riferimentoTempo`, `passo100mSoglia`.
- **`GeneratoreSmartSeduta.volumePrescritto(...)`**: **fonte unica** del volume giornaliero, usata sia da `genera` sia dalla UI (menu atleta, card settimanale). Combina: base del piano di squadra (già al netto della periodizzazione), base di livello dedotta dai **tempi**, ACWR (carico recente), **fattore medico** e **tetto medico**. Arrotonda a 100 m (era 50 m; vedi §3.11); `metriTarget ≤ 0` → 0 m (niente minimo artificiale in pausa). Vedi §3.10 per il modello a 360°.
- **`allocaMetri(quote, totale)`**: ripartizione col **metodo del resto maggiore** su unità da 100 m (era 50 m; vedi §3.11) → la somma dei metri per codice è **esattamente** il totale.
- **`costruisciTratti` riscritto**: riscaldamento/defaticamento = `volume − Σ serie` (con riduzione controllata delle ripetizioni, mai sotto 1, per garantire almeno `A1_MIN`); **`Σ tratti === volume` sempre**, anche con doppia seduta (AM 65% + PM 35%).
- **Rimossi gli hardcode di frequenza cardiaca** in `descrizioneSerie` (B1 "FC ~165 bpm", B2 "FC 175+ bpm"): non personalizzati → note generiche + passo calcolato dai tempi.
- **UI allineata**: il menu "Visualizza per" (squadra e singolo atleta) e la card "Volume Previsto Prossime Settimane" usano `volumePrescritto`, quindi **il volume mostrato coincide con la scheda generata** (con badge "su tempi reali" quando il volume è guidato dai tempi).
- **Bordo vasca arricchito**: chip con il **tempo di riferimento** ("Ritmi da 2:04.90 nei 100m sl") e il **passo soglia** ("Soglia 2:32.38/100m"), inclusi anche nel testo WhatsApp; **durata stimata dinamica** (~2,5 min/100m + 10' di transizioni) al posto del valore fisso "~75'".

**Verifica in vasca (V. Mattia, SMA3, S10, 60%)**: menu `600 m` = scheda `VOLUME TOTALE 600 m` = somma tratti `A1 150 + T 100 + A2 200 + B1 100 + A1 50 = 600 m`; chip "Ritmi da 2:04.90 nei 100m sl" + "Soglia 2:32.38/100m"; durata ~25'. Scheda di squadra: menu `2300 m` = scheda `2300 m` = `450+100+250+250+400+600+250`. Con i tempi inseriti, gli altri atleti salgono al loro livello reale (Rossi 2400 m, Bianchi 2250 m, Galli 2050 m).

> ⚠️ Il valore `600 m` per V. Mattia era **troppo conservativo** ed è stato corretto dal modello a 360° (§3.10): ora **1400 m**.

---

### 3.10 Volume a 360° (età + livello age-graded + storico) — correzione del sotto-volume

**Problema**: la scheda di V. Mattia (SMA3, S10, 10 anni, 100m sl 2:04.90) prescriveva **600 m/seduta**, 3-5× sotto i volumi di riferimento per un ragazzo di 10-12 anni (2-4 km/seduta). Cause radice:
1. **Nessun age-grading**: il riferimento 100m della classe S10 (0:51) è di livello élite **adulto**; confrontato con un bambino di 10 anni dava indice **17/100** → fascia ESORDIENTE → 600 m.
2. **Doppio conteggio medico**: `fattoreVolume` 60% (già scelto per la SMA3) **×** calibrazione 0,6375 (che includeva il fattore neuromuscolare 0,75 e l'under-12 0,85).
3. **Bande di volume troppo basse** (`VOLUME_PER_FASCIA.ESORDIENTE = 600`).
4. **Storico reale ignorato** (`LogSeduta.metriEffettivi` disponibile ma non usato).

**File**: `src/types/index.ts`, `src/domain/profiloAtleta.ts`, `src/domain/calibrazioneAtleta.ts`, `src/domain/generatoreSmartSeduta.ts`, `src/domain/volumeIndividuale.ts`, `src/components/OggiScreen.tsx`, `src/components/AtletiScreen.tsx`, `src/components/SchedeVascaScreen.tsx`, `src/domain/validatori.ts`, `src/domain/domain.test.ts`.

- **`ProfiloAtletaService.profila` riscritto a 360°**:
  - **Age-grading**: `FATTORE_ETA_RIFERIMENTO` corregge il riferimento della classe per l'età (≤8 ×1,95 … 17 ×1,03, 18+ ×1,0). V. Mattia: indice **17 → 45** (grezzo vs age-graded).
  - **Bande di volume per età** (`VOLUME_BANDA_ETA`, 8 aa 1500 m … 17 aa 4300 m, adulto 4000 m) modulate dal livello (`modulatorePrestazione` 0,65-1,15).
  - **Storico reale**: `volumeDaStorico` = media dei `metriEffettivi` delle ultime 4 settimane → pavimento (sovraccarico progressivo).
  - Nuovi campi in `ProfiloAtleta`: `eta`, `indiceGrezzo`, `fattoreEta`, `volumeDaEta`, `volumeDaPrestazione`, `volumeDaStorico`, `basataSuStorico`.
- **`CalibrazioneAtleta.fattoreMedico(condizioni)`** estratto: restituisce **solo** il fattore medico (spalla 0,85 / neurologica 0,80 / neuromuscolare 0,75 / cardio 0,90) + tetto (2500 m neuromuscolare). Applicato **una sola volta** in `volumePrescritto` → niente doppio conteggio con età/livello.
- **`volumePrescritto`**: base = volume a 360° quando esistono **tempi reali** (altrimenti piano del tecnico, con pavimento dallo storico); **banda di coerenza** col piano squadra (0,5×–1,4×); × ACWR × fattore medico × rientro; tetto medico. `volumeAuto = false` → `fattoreVolume` come **override manuale** (senza riapplicare il fattore medico). Nuovi campi `PrescrizioneVolume`: `volume360`, `basataSuStorico`, `fattoreMedico`, `fattoreRientro` (rinominato da `fattoreCalibrazione`).
- **`VolumeIndividuale.fattorePresenza(micro, assenze)`** estratto (assenze + rientro graduale, **senza** `fattoreVolume`): passato come `fattoreRientro` a `genera`/`volumePrescritto`, così il rientro non viene doppio-conteggiato.
- **UI**: chip **"Volume a 360°: età X · base Ym"** + **"medico −25%"** + **"su storico reale"** nel bordo vasca; card atleti con "Volume calcolato automaticamente (modello a 360°)" quando `volumeAuto = true`; badge "su storico reale" nella card settimanale.

**Verifica in vasca (V. Mattia)**: menu `1400 m` = scheda `VOLUME TOTALE 1400 m` = `A1 350 + D 50 + T 200 + A2 400 + B1 200 + A1 200`; chip "Volume a 360°: età 10 · base 1850m" + "medico −25%"; durata ~45'. **Da 600 m a 1400 m (2,3×)**, con gambe (G) e lattacidi (C1/C2/C3) ancora esclusi per la SMA3. Squadra 2300 m invariata; Rossi/Bianchi 3200 m, Galli 1850 m (banda di coerenza).

---

### 3.11 Vasca + durata della seduta nel piano stagionale, esercizi arrotondati a 100 m

**Richiesta**: nella creazione del piano stagionale chiedere la **lunghezza della vasca d'allenamento** e la **durata della sessione**; dopo la registrazione il sistema **riprogramma la seduta per i singoli atleti** sulla vasca e durata effettive. Gli esercizi vanno dati **arrotondati a 100 m** (100, 200, 300 — non 150, 250, 350), usando valori non arrotondati solo per esercizi **composti** il cui totale resta comunque un multiplo di 100.

**File**: `src/types/index.ts`, `src/domain/generatoreSmartSeduta.ts`, `src/domain/autoPianificatore.ts`, `src/data/AppContext.tsx`, `src/components/PianoScreen.tsx`, `src/components/OggiScreen.tsx`, `src/components/AtletiScreen.tsx`, `src/components/SchedeVascaScreen.tsx`, `src/components/RegistroScreen.tsx`, `src/domain/domain.test.ts`.

- **Tipi**: `ImpostazioniPiano` e `ParametriPiano` hanno ora `vascaMetri: 25 | 50` e `durataSedutaMin: number`; `SchedaSeduta` espone `vascaMetri` e `durataStimataMin`; `PrescrizioneVolume` ha `capDurata`.
- **Form del piano** (`PianoScreen`): nuova riga "Lunghezza vasca d'allenamento" (25/50 m) + "Durata seduta (min)", salvati in `ImpostazioniPiano`; `AppContext.parametriEffettivi` li propaga a tutte le schermate.
- **Arrotondamento a 100 m**: nuovo helper `arrotondaA100m`; `allocaMetri` alloca in **unità di 100 m** (ogni codice riceve un multiplo di 100, i codici previsti non spariscono per arrotondamento); `costruisciTratti` sceglie la ripetuta con `scegliLunghezza` (deve **dividere** il totale del codice ed essere **multiplo della vasca**), preferendo i multipli di 100; riscaldamento/defaticamento a 100 m. Risultato: **ogni esercizio e il volume totale sono multipli di 100**, e la somma dei tratti resta **esatta**.
- **Vasca**: in vasca 50 m non compaiono ripetute da 25 m (partenze/virate `P` = 2×50m invece di 4×25m); la tabella ritmi usa la vasca scelta.
- **Durata → tetto di volume**: `volumePrescritto` stima i minuti/100m dal passo reale dell'atleta (`minutiPer100m` ≈ 1,6× il passo di riferimento, 2,5 min/100m senza tempi) e riduce il volume per stare in `durataSedutaMin` (10' di transizioni). `durataStimataMin` della scheda usa lo stesso modello.
- **Test**: nuovo blocco "vasca, durata e arrotondamento a 100 m" (6 test): totali a 100 m e somma esatta su più volumi/vasca, vasca 50 senza ripetute da 25 m, vasca 25 con `P` da 25 m, tetto dalla durata, durata stimata coerente, doppia seduta a 100 m.

**Verifica**: `npx tsc --noEmit` 0 errori; `npm test` **64 passed**; `npm run build` verde. Scheda squadra 2300 m = `A1 400 + D 100 + T 300 + G 200 + A2 500 + B1 600 + A1 200` (tutti multipli di 100, somma esatta); durata stimata ~68'. Bambino SMA3: durata 45' → **1100 m** (tetto), durata 75' → **1400 m** (invariato).

---

### 3.12 Vasca e durata per giorno della settimana + override per singola seduta

**Richiesta**: poter dare **lunghezza vasca e durata allenamento per ogni giorno della settimana** (non un unico valore globale, perché non è detto che sia sempre uguale) e avere la possibilità **opzionale di modificare vasca/durata per singole sedute** in caso di necessità.

**File**: `src/types/index.ts`, `src/domain/parametriSeduta.ts` (nuovo), `src/domain/autoPianificatore.ts`, `src/data/AppContext.tsx`, `src/components/PianoScreen.tsx`, `src/components/OggiScreen.tsx`, `src/components/AtletiScreen.tsx`, `src/components/SchedeVascaScreen.tsx`, `src/components/RegistroScreen.tsx`, `src/domain/domain.test.ts`.

- **Tipi**: nuovo `OverrideSeduta { vascaMetri?; durataSedutaMin? }`. `ImpostazioniPiano` e `ParametriPiano` hanno ora `vascaPerGiorno: Partial<Record<DayOfWeekNum, 25 | 50>>`, `durataPerGiorno: Partial<Record<DayOfWeekNum, number>>` e `overrideSedute: Record<string, OverrideSeduta>` (chiave = data `YYYY-MM-DD`). I campi globali `vascaMetri`/`durataSedutaMin` restano come **default di fallback**.
- **Fonte unica di risoluzione** (`src/domain/parametriSeduta.ts`): `ParametriSeduta.risolvi(data, parametri)` applica in ordine **override della data → giorno della settimana → default globale**; `haOverride(data, parametri)` dice se una data ha un override esplicito. Tutte le schermate usano questa funzione, così la scheda generata e i volumi mostrati restano coerenti con la vasca/durata reali del giorno.
- **UI piano** (`PianoScreen`): nuova sezione "Vasca e durata per giorno" con una riga per ogni giorno d'allenamento (Auto / 25 m / 50 m + durata in minuti); salvataggio immediato in `ImpostazioniPiano`. Le 3 anteprime scheda risolvono vasca/durata sulla data della seduta.
- **Override per seduta** (`OggiScreen`): controllo compatto "Vasca/Durata" nella barra della scheda di oggi (25/50 m + minuti) che scrive `overrideSedute[oggi]`, con pulsante **Reset** per tornare al valore del giorno.
- **Propagazione**: `AtletiScreen` (scheda atleta + card settimanale, che ora **somma** il volume dei giorni della settimana ognuno con la propria vasca/durata), `SchedeVascaScreen` (data selezionata), `RegistroScreen` (scheda bordo vasca del giorno).
- **Test**: nuovo blocco "ParametriSeduta - vasca/durata per giorno e override per seduta" (6 test): fallback globale, valore del giorno, override che vince su giorno e default, override parziale, `haOverride`, e scheda generata che rispetta la vasca del giorno.

**Verifica**: `npx tsc --noEmit` 0 errori; `npm test` **70 passed**; `npm run build` verde (`dist/assets/index-LrYA4a99.js`).

**Verifica end-to-end in browser** (dev server `http://localhost:3000`, dati reali in localStorage):
- **Override di seduta (Oggi)**: click **50m** → compare **Reset** (override scritto); durata **30** → volume scheda **2300 m → 800 m**, durata stimata ~30', tutti i tratti multipli di 100; click **Reset** → volume torna a **2300 m** / ~68'.
- **Vasca per giorno (Piano)**: sezione "Vasca e durata per giorno" mostra **Mercoledì** e **Sabato** (giorni d'allenamento [3,6]); click **Mercoledì 50m** → il bottone resta attivo dopo il re-render (valore persistito in `vascaPerGiorno[3]`).
- **Durata per giorno (Piano → Oggi)**: impostata **Mercoledì = 45'** → la schermata **Oggi** (mercoledì 14/10/2026) passa a **VOLUME TOTALE 1400 m** / **DURATA STIMATA ~45'** (era 2300 m / ~68'), con volumi atleti aggiornati (Rossi 2000, Sofia 1200, Galli 1400, V. Mattia 1100) e tratti tutti multipli di 100 (300+100+100+100+300+400+100 = 1400). Prova che la risoluzione per-giorno (`durataPerGiorno[3]`) arriva fino alla scheda.
- **Ripristino**: azzerati i valori di test (Mercoledì → Auto, durata vuota) → Oggi torna a **2300 m / ~68'** e volumi atleti originali (Rossi 3200, Sofia 2300, Galli 1800, V. Mattia 1400).

---

### 3.13 Sezione "Fonti": Record, Regolamenti e Calendario ⭐

**Richiesta**: una nuova sezione consultabile **offline** con (a) i record ITA/EUR/MON, (b) i regolamenti FINP e World Para Swimming con ricerca locale, (c) il calendario gare FINP 2026 con "aggiungi alla stagione".

**File**: `src/data/records.json` (nuovo), `src/data/regolamenti.json` (nuovo), `src/data/calendario.json` (nuovo), `src/domain/recordService.ts` (nuovo), `src/domain/regolamentiService.ts` (nuovo), `src/domain/calendarioService.ts` (nuovo), `src/components/RecordScreen.tsx` (nuovo), `src/components/RegolamentiScreen.tsx` (nuovo), `src/components/CalendarioScreen.tsx` (nuovo), `src/components/FontiScreen.tsx` (nuovo), `src/components/Navbar.tsx`, `src/App.tsx`, `src/data/AppContext.tsx`, `src/domain/domain.test.ts`.

- **Navigazione**: nuovo tab **Fonti** (icona `BookOpen`); `TabKey` esteso con `'fonti'`; bottom nav mobile `grid-cols-4` → `grid-cols-5`. `FontiScreen` contiene 3 sotto-tab: **Record | Regolamenti | Calendario**.
- **Record** (`records.json`, **3.684 record**): estratti dal PDF ufficiale FINP; `RecordService` espone `meta/eventi/eventiIndividuali/generi/classi/recordIta/recordInternazionale/confronta/classePerStile/eventoPerTempo` + `CATEGORIE_ITA`. UI: selettori evento/classe/genere/vasca, tabella record ITA (Esordienti/Ragazzi/Juniores/Assoluto) + EUR + MON, e **confronto** con i tempi dell'atleta selezionato.
- **Regolamenti** (`regolamenti.json`, **397 sezioni**: FINP 248 + WPS 149): `RegolamentiService` con tokenizzazione, normalizzazione accenti, stopword IT/EN, indice pre-calcolato e scoring **BM25** (K1=1.5, B=0.75, peso titolo ×3); `cerca/documenti/sezioni/totaleSezioni/suggerimenti`. UI: box di ricerca con evidenziazione `<mark>`, filtro documento (Tutti/FINP/WPS), ricerche rapide, accordion delle sezioni, link alla fonte.
- **Calendario** (`calendario.json`, **13 eventi nazionali FINP 2026**): `CalendarioService` con `eventi/discipline/perDisciplina/prossimi/formattaPeriodo/meseLabel/meseChiave`. UI: filtro disciplina (Tutte/Fondo/Nuoto/Pallanuoto), toggle "solo gare future", raggruppamento per mese, badge disciplina, badge "prioritaria", e **"Aggiungi alla stagione"** (con conferma) che chiama `aggiungiGara` → il piano considera la gara (picco/scarico). Stato "Già in stagione" + "Rimuovi".
- **AppContext**: `aggiungiGara(nome, dal, al, prioritaria, luogo?)` esteso con `luogo` opzionale.
- **Dati offline**: snapshot locali (CORS impedisce il fetch diretto da finp.it; l'app resta **offline-first** per l'uso a bordo vasca). La ricerca regolamenti è **locale** (nessun backend AI). Il calendario 2026 è stato estratto via browser (finp.it risponde 403 alle richieste HTTP dirette).
- **Test**: nuovi blocchi `RecordService`, `RegolamentiService`, `CalendarioService` → **83 test** totali.

**Verifica in browser** (dev server `http://localhost:3000`):
- Tab **Fonti** presente; **Record** ✓ (tabella record + confronto atleta); **Regolamenti** ✓ (397 sezioni; ricerca "partenze" → **4 risultati** con snippet, "Apri nel documento" e "Fonte ufficiale"); **Calendario** ✓ (13 eventi raggruppati per mese, filtri disciplina, badge prioritaria, "Aggiungi alla stagione").
- Nota: il flusso "Aggiungi alla stagione" usa `window.confirm`; nell'automazione il dialog nativo viene auto-annullato, ma nell'app reale (browser e WebView Android con `WebChromeClient` di default) il dialog viene mostrato correttamente.

---

## 4. File toccati (working tree, nessun commit creato)

```
 .gitignore                               |   +
 README.md                                |   +  (codici T/G/P, profilo, taper, doppie, test)
 package.json / package-lock.json         |   +  (vitest)
 src/App.tsx                              |   -
 src/types/index.ts                       |   ++ (codici, FasciaAtleta/ProfiloAtleta, doppieSedute, flag medici arto inferiore/neuromuscolare)
 src/data/AppContext.tsx                  |   +  (parametriEffettivi.doppieSedute)
 src/domain/tempoUtils.ts                 |   ++ convertiPasso100m
 src/domain/calibrazioneAtleta.ts         |   ++ patologia neuromuscolare
 src/domain/classiSportive.ts             |   +  stimaSM + valida
 src/domain/finpAnalisiMedica.ts          |   ++ (disriflessia/piaghe/ipotermia) + SMA/neuromuscolare + flag
 src/domain/codici.ts                     |   +  T/G/P
 src/domain/calcoloRitmiRipartenze.ts     |   ++ modello proporzionale + T/G/P
 src/domain/calcoloCSS.ts                 |   +  ACWR 1.3/1.5
 src/domain/rilevamentoLivello.ts         |   -  delega a ProfiloAtletaService
 src/domain/generatoreSmartSeduta.ts      |   +++ T/G/P, note profilo, doppia seduta, vincoli medici, volumePrescritto/allocaMetri, somma esatta, arrotondaA100m + scegliLunghezza (vasca/durata)
 src/domain/pianoGenerator.ts             |   ++ tapering + doppie
 src/domain/autoPianificatore.ts          |   +  doppieDaStorico + vascaMetri/durataSedutaMin
 src/domain/regolamentoGare.ts            |   ++ riscritto su eventi WPS
 src/domain/profiloAtleta.ts              |   ++ NUOVO + riscritto a 360° (age-grading, bande età, storico)
 src/domain/volumeIndividuale.ts          |   +  fattorePresenza estratto (assenze + rientro)
 src/domain/parametriSeduta.ts            |   ++ NUOVO (risoluzione vasca/durata: override → giorno → default)
 src/domain/validatori.ts                 |   +  avviso volume solo se manuale
 src/domain/recordService.ts              |   ++ NUOVO (record ITA/EUR/MON, lookup, confronto)
 src/domain/regolamentiService.ts         |   ++ NUOVO (ricerca locale BM25 sui regolamenti)
 src/domain/calendarioService.ts          |   ++ NUOVO (accesso/format calendario gare)
 src/domain/domain.test.ts                |   ++ NUOVO (83 test)
 src/data/records.json                    |   ++ NUOVO (3.684 record)
 src/data/regolamenti.json                |   ++ NUOVO (397 sezioni FINP + WPS)
 src/data/calendario.json                 |   ++ NUOVO (13 eventi nazionali FINP 2026)
 vitest.config.ts                         |   +  NUOVO
 src/components/TempiRipartenzeScreen.tsx |   ++
 src/components/RecordScreen.tsx          |   ++ NUOVO (tabella record + confronto atleta)
 src/components/RegolamentiScreen.tsx     |   ++ NUOVO (ricerca + accordion + filtro documento)
 src/components/CalendarioScreen.tsx      |   ++ NUOVO (calendario + aggiungi alla stagione)
 src/components/FontiScreen.tsx           |   ++ NUOVO (contenitore sotto-tab Fonti)
 src/components/Navbar.tsx                |   +  tab Fonti (BookOpen), grid-cols-5
 src/App.tsx                              |   +  render FontiScreen
 src/data/AppContext.tsx                  |   +  aggiungiGara con luogo opzionale
 src/components/AtletiScreen.tsx          |   ++ card Profilo + Gare consigliate + volume settimanale prescritto + etichetta 360° + vasca/durata per giorno
 src/components/PianoScreen.tsx           |   ++ toggle doppie + anteprime con doppia + campi vasca/durata + tabella vasca/durata per giorno
 src/components/SchedeVascaScreen.tsx     |   +  target piano + fattoreRientro (no doppio conteggio) + vasca/durata per data
 src/components/OggiScreen.tsx            |   ++ passa doppia seduta + menu atleta con volume prescritto + chip "Volume a 360°" + override vasca/durata di oggi
 src/components/RegistroScreen.tsx        |   +  scheda bordo vasca con vasca/durata per data
 [asset Android rigenerati dal build]
```

> Nessun commit è stato creato: tutte le modifiche sono nel working tree, rivedibili con `git status` / `git diff`.

---

## 5. Verifica

*(aggiornata il 21/10/2026 dopo la migrazione al design system — vedi §6)*

- `npx tsc --noEmit` → **0 errori**.
- `npm run build` (tsc + vite + sync asset Android) → **✓ built in 27.05 s** → `dist/index.html` 1.15 kB, `dist/assets/index-2lR_j3gj.css` 55.99 kB (gzip 9.13 kB), `dist/assets/index-B_I93HLN.js` 2.499.25 kB (gzip 540.37 kB). Resta il solo warning non bloccante "chunks larger than 500 kB".
- `npm test` (vitest) → **24 passed (24)** su 2 file di test. Bloccano regressioni come quella del §2.1 e verificano i vincoli medici (§3.8), la coerenza del volume (§3.9), il modello a 360° (§3.10), vasca/durata/arrotondamento a 100 m (§3.11), vasca/durata per giorno + override per seduta (§3.12) e i servizi della sezione Fonti (§3.13).
- Smoke test dev server: `npm run dev` → `http://127.0.0.1:3000` → **200**, `<div id="root">` presente (log in `%TEMP%\opencode\vite-dev.log`).
- Verifica in vasca (browser): scheda squadra 2300 m = Σ tratti (tutti multipli di 100); menu atleta allineato; volumi guidati dai tempi.
- Verifica sezione Fonti (browser): tab Fonti ✓; Record ✓ (tabella + confronto); Regolamenti ✓ (397 sezioni, ricerca "partenze" → 4 risultati); Calendario ✓ (13 eventi per mese, filtri, "Aggiungi alla stagione").
- Controllo numerico del nuovo modello ritmi su dati reali (vedi tabella §2.1).
- **QA visiva completa (21/10/2026, browser integrato, viewport 583×865 ≈ Pixel 10)**: rese con dati demo (`Ripristina Dati Esempio FINP`): Dashboard, Atleti, Allenamenti (Piano), Gare/Record, Dati (Schede Vasca), Live Deck, Pianificatore/Regia, Backup & Dati. Dettagli e azioni correttive in §6.6.

---

## 6. Design system Stitch "Aquatic Paralympic" — migrazione completa (UI/UX)

Fonte di verità: `C:\Users\matti\Downloads\stitch_finpcoach_design_system\stitch_finpcoach_design_system`
(`aquatic_paralympic_coaching_system\DESIGN.md` + 8 mockup di riferimento).

### 6.1 Obiettivo e vincoli

Applicare il design system all'app **senza toccare la logica sportiva**: il modello dei ritmi, i vincoli medici, il generatore di sedute, l'ACWR e i servizi (Record/Regolamenti/Calendario) restano identici. Il lavoro è esclusivamente su `src/components`, `src/index.css`, `tailwind.config.js`, `index.html`.

Vincoli di progetto rispettati:

| Vincolo | Come è stato risolto |
|---|---|
| Mobile-first (Pixel 10, 412×915 css px) | layout a colonna singola, dock inferiore fisso, nessuna tabella a scorrimento orizzontale obbligatorio |
| Tap target ≥ 48 px | normalizzazione di **tutti** i controlli interattivi (vedi §6.6) |
| Safe area + altezza reale | `env(safe-area-inset-*)`, `--app-vh: 100dvh`, `pt-header` / `pb-dock` |
| Testo mai troncato | `white-space: normal` sui bottoni, `tabular-nums` su tutte le cifre |
| Legibilità sotto luce al neon | superfici chiare, hairline #E2E8F0, ombre micro (0 1px 2px), nessun drop-shadow pesante |
| Contrasto semantico | colori di ruolo (primary / secondary / tertiary / error / outline), niente famiglie "decoration" (`slate-*`, `gray-*`, `red-*`, `rose-*`, `indigo-*`, `orange-*`, `purple-*` → rimosse in 26 file) |

### 6.2 Fondamenta: token semantici

**`tailwind.config.js`** — esteso il tema con scale *role-based* (non più legate a una singola tonalità):

- Superfici: `surface`, `surface-container-low`, `-lowest`, `surface-container`, `surface-container-high`, `surface-container-highest`, `inverse-surface` (con `on-inverse-surface`).
- Accento: `primary` / `on-primary`, `primary-container` / `on-primary-container`, `primary-fixed` / `on-primary-fixed`, `primary-fixed-dim`; `secondary` / `tertiary` (+ varianti container/fixed), `error` / `on-error` / `error-container`, `outline` / `outline-variant`.
- Tipografia: `label-caps`, `label-md`, `label-lg`, `body-base`, `body-bold`, `headline-sm`, `headline-md`, `display-lg` + i corrispettivi `font-*` (Space Grotesk per titoli/metriche, Public Sans per i corpi).
- Spaziatura: `space-xs/sm/md/lg/xl` (scala 4/8/12/16/24/32).
- Elevazione: `shadow-card`, `shadow-pop`, `shadow-float`, `shadow-primary-sm`.

**`src/index.css`** — layer `base` rielaborato:

- `--app-vh: 100dvh`, `--safe-top`, `--safe-bottom`, `--dock-h`.
- `select { min-height: 48px }` (i filtri sono il controllo più frequente dell'app: da 39 px a 48 px in tutte le schermate con selettori — Record, Dati, Tempi, Registro, Atleti, Live Deck, Editor schede, OCR, Analisi).
- `button { white-space: normal }` + `word-break: break-word` → nessun troncamento di "ripartenza 1'15"".
- `font-variant-numeric: tabular-nums` su `.tabular-nums`, `time`, `output` → le metriche non "ballano" durante l'aggiornamento live.
- `::-webkit-scrollbar { width: 0 }` → nessuna barra che ruba spazio in verticale su mobile.

### 6.3 Primitive `.ds-*` (layer `components`)

`| .ds-card | .ds-card-flat | .ds-card-tint | .ds-card-primary | .ds-card-outline | .ds-divider |`
`| .ds-btn | .ds-btn-primary | .ds-btn-secondary | .ds-btn-ghost | .ds-btn-quiet | .ds-btn-coral | .ds-btn-danger | .ds-btn-sm | .ds-btn-icon |`
`| .ds-chip | .ds-chip-primary | .ds-chip-neutral | .ds-chip-outline | .ds-chip-coral | .ds-chip-blue | .ds-chip-inverse | .ds-chip-class | .ds-chip-tap |`
`| .ds-label | .ds-title | .ds-subtitle | .ds-body | .ds-body-strong | .ds-metric | .ds-metric-sm |`
`| .ds-stat | .ds-tabs | .ds-tab | .ds-tab-active | .ds-alert | .ds-alert-title | .ds-alert-body |`
`| .ds-scroll-x | .ds-touch-pan | .ds-sheet | .ds-sheet-scrim | .ds-footer-link |`

`ds-chip-tap` nasce dalla QA: chip interattivo con area di tap ≥ 44 px (i chip puramente informativi restano compatti, il badge codice fisiologico a 36 px).

### 6.4 Navigazione e shell

- **`src/App.tsx`**: shell responsive — `pt-header` (64 px + safe area) e `pb-dock` (64 px + safe area) per non far finire contenuti sotto dock/header; `max-w` e padding orizzontale per desktop.
- **`src/components/Navbar.tsx`**: header con brand, stato sessione e bottone "Altre sezioni"; dock mobile con 5 voci (Dashboard, Atleti, Allenamenti, Gare, Altro) da 48 px; foglio bottom-sheet ("Altre sezioni") con Live Deck, Pianificatore, Dati, Backup & Dati; nav desktop completa con le 5 sezioni.
- **`src/components/Sezione.tsx`**: intestazioni di sezione con badge e conteggio, larghezza piena, `min-h-[48px]` sulle righe espandibili.

### 6.5 Dashboard (`OggiScreen.tsx`) — riscritta

È la schermata usata *a bordo vasca*, quindi è stata ridisegnata per la lettura a 1 m di distanza:

- **Intestazione contestuale**: data e giorno ("MERCOLEDÌ 21/10/2026 · CENTRO FINP"), saluto ("Buongiorno, Coach"), riepilogo vasca e settimana di carico ("Vasca Olimpica · Settimana di carico — 9200 m totali previsti"), chip "In Vasca Oggi".
- **Azioni rapide** (scroll orizzontale, 48 px): Cronometro Live Deck, Regia & Pianificatore, Classificazioni WPS.
- **Bento statistiche**: Atleti squadra, Sedute settimana, Tempi registrati, Gare in calendario.
- **Selettore atleta** con volume adattato (100 % / 85 % / 90 %) e volume squadra.
- **Barra controlli bordo vasca**: Maxi-Deck (caratteri giganti alto contrasto), copia per WhatsApp, stampa, segna presenze.
- **Scheda seduta**: volume totale, durata stimata, distribuzione codici A1/A2/B1/B2/D con percentuale e metri, tratti con codice, metri, descrizione, *Focus Tecnico* e recupero.
- **Avvertenze mediche di squadra**: riquadro `ds-alert` per atleta (es. "Paraplegia dorsale T6 completa: assenza spinta gambe, pull-buoy in riscaldamento e fondo").
- **Atleti in evidenza**: PB, classi S, giorni dall'ultimo test.

### 6.6 Ergonomia mobile: normalizzazione dei tap target (QA sul browser)

La verifica visiva a 583×865 ha evidenziato controlli sotto la soglia ergonomica. Correzioni applicate (tutte reverificate in browser via HMR):

| Controllo | Prima | Dopo |
|---|---|---|
| Tab "Record / Regolamenti / Calendario" | 32 px | **48 px** (`ds-tab` con `min-h-[48px]`) |
| Select di filtro (Record, Dati, Tempi, Registro, Editor, Ocr, Analisi) | 39 px | **48 px** (regola globale `select { min-height: 48px }`) |
| Pastiglie Vasca / Genere (Record) | 27 px | **48 px** |
| "Scheda Smart" (carta micro-ciclo) | 24 px | **44 px** |
| Chip schede giornaliere S.1–S.4 | 18,5 px | **44 px** (`ds-chip-tap`) |
| "Modifica sedute o volume" | 20,75 px | **48 px** |
| Frecce calendario settimanale (Dati) | 36×36 px | **48×48 px** |
| Pulsante "Scrivi" (Dati) | 32 px | **48 px** |
| Switch vasca 50 m/25 m (Live Deck) | 24 px | **44 px** |
| Badge codice fisiologico A1–D | 18 px | **36 px** + `aria-label` descrittivo |
| Chiudi dei bottom-sheet / modali | 40×40 px | **48×48 px** |
| 4 bottoni-icona della barra bordo vasca | senza nome accessibile | **`aria-label` espliciti** (Maxi-Deck, WhatsApp, Stampa, Segna Presenze) |

Il dock, il bottom-sheet, il calendario (celle 68 px), i selettori atleta e i pulsanti LAP/SPLIT del Live Deck erano già ≥ 48 px.

### 6.7 File migrati (37 file, ~2.019 righe modificate, 5.517 rimosse)

Token/config: `tailwind.config.js`, `src/index.css`, `index.html`.
Shell e comuni: `src/App.tsx`, `src/components/{Navbar,Sezione,BadgeCodice,IndicatoreCodici,ElencoAvvisi,WelcomeScreen,LoginScreen,ErrorBoundary}.tsx`.
Schermate: `OggiScreen`, `AtletiScreen`, `AtletaBiomeccanicaView`, `PianoScreen`, `DatiScreen`, `SchedeVascaScreen`, `SchedaSedutaModal`, `RegistroScreen`, `TempiRipartenzeScreen`, `FontiScreen`, `RecordScreen`, `RegolamentiScreen`, `CalendarioScreen`, `CronometroLiveMultiCorsia`, `RegiaTecnicaCorsie`, `ParaSwimmingAnalyticsView`, `ParaSwimmingCanvasChart`, `GareAmmissibiliCard`, `EsercizioEditor`, `OcrGaraModal`, `OcrPreviewModal`, `BackupModal`.

Migrazione eseguita con due script deterministici (una classe per volta, senza toccare la logica):
- `ds-migrate.mjs` → **26 file / 2.063 classi** legacy → semantiche.
- `ds-migrate2.mjs` → **12 file / 38 classi** (gradienti e famiglie cromatiche residue).

**Esclusioni deliberate**:
- `src/components/HydrodynamicsChartsView.tsx` → grafico "deck" scuro con colori neon: è uno strumento di analisi a contrasto massimo, non una superficie dell'app; la palette DS lo renderebbe illeggibile.
- `src/components/ParaSwimmingCanvasChart.tsx` → disegno su canvas: i colori sono codificati nel renderer, non nelle classi.

### 6.8 Bug e problemi risolti durante il lavoro

- **Build rotta**: in `tailwind.config.js` il commento `slate-*/gray-*` chiudeva il block comment (`SyntaxError: Unexpected token (7:30)`) → riscritto come "Non usare le scale slate/gray: …".
- **`w-13 h-13` non validi** (classi inesistenti in Tailwind) in `AtletiScreen` → corretti in `w-12 h-12`.
- **`last:rounded-rounded-full`** in `IndicatoreCodici` → `last:rounded-r-full`.

### 6.9 Limiti noti

- **Bundle**: 2.499 kB (gzip 540 kB) in un unico chunk → warning Vite "> 500 kB". Non bloccante, ma il prossimo passo naturale è il *code-splitting* per rotta (`import()` dinamici su Live Deck, Pianificatore, Record/Regolamenti/Calendario, che sono schermate pesanti e usate al banco).
- **Chip interattivi "S.x" e badge codice** restano sotto i 48 px (44 px / 36 px) per non gonfiare la carta del micro-ciclo: sono controlli secondari ad alta frequenza *di lettura*, non azioni primarie; la regola dichiarata resta 48 px per le azioni primarie.
- La QA visiva è stata condotta a **583×865** (finestra del browser integrato). Per una verifica puntuale su 412×915 (Pixel 10) e su tablet 10" serve un passaggio con device emulation reale.
- Nessun commit è stato creato: tutto è nel working tree (`git status` → 37 file modificati + asset Android rigenerati).
