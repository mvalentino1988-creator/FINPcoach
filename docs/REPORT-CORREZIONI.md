# Report correzioni FINPcoach

## Baseline (stato di partenza)

Eseguita il 2026-06-01 su `main` (commit `8754eb0`):

- `npm ci`: OK — 257 pacchetti. `npm audit`: 6 vulnerabilità (1 moderate, 5 high).
- `npx tsc --noEmit`: pulito, nessun errore.
- `npm test` (vitest): 10 file, 101 test, tutti verdi.
- `npm run build`: OK (tsc + vite + sync asset Android). Warning noto: chunk `vendor-firebase` >500 kB.
- `npm run lint`: script non presente.

## Stato finale

- `npx tsc --noEmit`: **pulito** (incluso `noImplicitReturns`).
- `npm test`: **26 file, 300 test, tutti verdi**.
- `npm run lint`: **0 errori**, ~260 warning motivati (vedi sotto).
- `npm run build`: **OK** — main ~316 kB, `vendor-firebase` ~948 kB in chunk lazy separato (non nel bundle iniziale), warning >500 kB atteso.
- `npm audit`: **4 high residue** — `@grpc/grpc-js` transitivo di Firebase/Firestore. `npm audit fix` applicato; `--force` avrebbe imposto `firebase@9.14.0` (downgrade breaking) → non fatto. Rischio accettabile: dipendenza solo lato client SDK, non esposta a input utente.

## Punti risolti (per blocco)

### Blocco 1 — Vasca
- `chromeV` sempre calcolato sul layout live in `CronometroVasca.tsx`.
- Test orientamento 411×923 in `cronometroVasca.test.ts` (5 casi attesi).
- `NUMERO_CORISIE_DEFAULT` → `NUMERO_CORSIE_DEFAULT`.
- `refreshSession` non riallinea più le partenze automatiche in ritardo: mantiene `due` e marca `autoLate` (badge "partenza recuperata").
- Verificata assenza di duplicazioni di stato Regia/Cronometro.

### Blocco 2 — Integrità dati
- `src/data/migrations.ts`: registro versioni per chiave, idempotente, testato.
- `src/data/backupValidate.ts`: validazione tipizzata di ogni sezione, rifiuto versioni future, atomicità con snapshot/ripristino in `storage.ts`.
- `iaConfig`/API key mai nel backup; `src/lib/backupCrypto.ts` (AES-GCM+PBKDF2) + UI in `BackupModal`.
- `finp_ultimo_backup`, data in Dati, avviso Oggi >14gg (`finp_backup_reminder_days`).
- `save()` emette `STORAGE_ERROR_EVENT`; banner in `App.tsx`.
- `ErrorBoundary` con export di emergenza.

### Blocco 3 — Privacy/sicurezza
- Firebase: import dinamico in `firebaseSync.ts` (chunk `vendor-firebase` lazy), init solo con credenziali; consenso esplicito nel toggle di `BackupModal`; `AppContext` sincronizza solo con sync+login.
- Chiave IA: `type=password` + mostra/nascondi, avviso "solo su questo dispositivo", "Rimuovi chiave", esclusa da backup/export.
- Android `MainActivity.kt`: `allowFileAccess=false`, debugging solo debug, bridge limitato all'origine attesa, `appassets` ostile a path traversal; permessi camera/media/storage rimossi (OCR via `<input type=file>`).
- `server.js`: `path.resolve` + confinamento in `dist`, header di sicurezza.

### Blocco 4 — Correttezza scientifica
- ACWR: costanti/soglie unificate in `calcoloCSS.ts` e `types` (0.8–1.3 / 1.3–1.5 / >1.5); enum livelli senza emoji; Registro UI mappa ai token; README allineato; disclaimer "indicatore di monitoraggio, non previsione infortunio". Acuto = 7gg, cronico = 28gg, identico in Registro e `calcoloCSS`.
- Calendario: `calendarioService.ts` con `importaCalendarioJson`, `validaEventoCalendario`, eventi custom persistiti; UI con avviso "non aggiornato" (ultimo evento, records, regolamenti) e aggiunta/rimozione manuale.
- Test: `qualitaBlocco4.test.ts` — ACWR, `calcolaTabellaRitmi`/`calcolaCSS`/`calcolaCSSRidotto` edge case, Festività Pasqua 2024–2035, PianoValidator (+10%/+20%, >4 settimane), classi S/SB/SM.

### Blocco 5 — Accessibilità
- ~111 occorrenze `text-[8–11px]` → scala minima 12px (17 file).
- Touch target ≥44px (48px Vasca/Regia/Registro), aria-label su bottoni icona, `aria-live`/`role=status` su toast/stati, focus/chiusura modali, nessun significato solo-cromatico, `prefers-reduced-motion` preservato.
- Oggi: card seduta dominante con "Vai in vasca", metriche ambigue con trattino, "gg Prossima Gara" cliccabile.

### Blocco 6 — Prestazioni
- Tesseract.js in import dinamico (`ocrService.ts`), worker/core/lang locali invariati.
- `manualChunks` per vendor-react/vendor-firebase; `.gitattributes` marca gli asset generati.
- Misure: main 316.60 kB, vendor-react 141.74 kB, vendor-firebase 948.68 kB (lazy).

### Blocco 7 — Android/rilascio
- `versionName="0.2.0"` allineato a `package.json`, `versionCode=2`; versione+build in Altro via `__APP_VERSION__`/`__APP_BUILD_DATE__` (vite define).
- `docs/RILASCIO.md`: build debug/release, firma, ProGuard (`@JavascriptInterface` da preservare se R8), `isMinifyEnabled=false` documentato.
- Ciclo di vita verificato nel codice: `configChanges`, `saveState`, provider React persistente.

### Blocco 8 — Test
- 12 nuovi file di test: `tempoUtils`, `dateUtils`, `parametriSeduta`, `volumeIndividuale`, `staffetteService`, `ocrGaraParser`, `autoPianificatore`, `parserApprendimento`, `recordService`, `regolamentiService`, `pianoGenerator`, `storage` → 101 → **300 test**.

### Blocco 9 — Qualità codice
- ESLint 9 flat config: typescript-eslint + react-hooks + jsx-a11y + unused-imports; `npm run lint` = 0 errori.
- `any` eliminati dove tipizzabili (componenti, env Firebase, provider IA); `console.log` di debug rimossi (restano `console.error/warn` per errori reali).
- `tsconfig`: `noImplicitReturns` attivato; `noUnusedLocals/Parameters` valutati — 75 occorrenze residue non corrette in blocco (documentato sotto).
- **Bug latente riparato**: `puntiTabellariService.calcolaPuntiGara` leggeva `recordWR.tempoCentesimi` (campo inesistente → tornava sempre `null`); ora usa `RecordService.tempoCentesimi(recordWR.tm)`.
- `CalibrazioneAtleta`: risolto declaration merging rinominando la classe in `CalibrazioneAtletaService`.

### Blocco 10 — Documentazione
- README aggiornato (Vasca/Regia/Cronometro, comandi, backup/sync, versione, limiti).
- `docs/`: analisi consolidata (versione più recente), `UI_REDESIGN_REPORT.md`, `RILASCIO.md`, `CHANGELOG.md`, questo report. `GEMINI.md` resta in root (regole per l'agente Gemini, caricate automaticamente).

## Punti non applicati / rinviati

- **Split file >800 righe** (PianoScreen 1884, CronometroVasca 1773, AtletiScreen 1349, RegiaTecnicaCorsie 960, RegistroScreen 840): estrazione rischiosa senza test di componente UI; la suite copre il dominio. Rinviato a lavoro dedicato.
- **`noUnusedLocals`/`noUnusedParameters` in tsconfig**: 75 occorrenze residue (stato morto in componenti grandi, es. form gara/chiusura in PianoScreen). Gli stessi casi emergono come warning ESLint; attivazione richiede pulizia dedicata.
- **Warning ESLint residui** (~260): `no-explicit-any` nel layer Firebase SDK (oggetti opachi), regole react-hooks v6 euristiche (refs in render per pattern legittimi), `label-has-associated-control` (label che avvolgono il controllo — HTML valido), `no-static-element-interactions` (card/bottoni custom già provvisti di aria-label e touch target).
- **ProGuard/R8**: non attivato (documentato in `docs/RILASCIO.md`); regole da aggiungere se si abilita.

## Decisioni prese

- Soglia ACWR scelta: quella documentata nel README originale (0.8–1.3 / 1.3–1.5 / >1.5), applicata ovunque.
- `versionCode` incrementato a 2 per allineamento con la nuova versioneName.
- Duplicato `docs/FINPcoach-analisi-e-modifiche.md` (vecchio, 14/10) sostituito dalla versione più recente (21/10, rev.2).
- `GEMINI.md` mantenuto in root: è configurazione dell'agente, non documentazione.

## Da verificare a mano su Pixel

1. **TalkBack**: navigare Oggi → Vasca → modali; verificare aria-label su bottoni icona e annunci toast.
2. **Rotazione**: con cronometro attivo ruotare il dispositivo (non deve cambiare orientamento forzato); in "pronta" deve ruotare secondo lo spazio.
3. **Sfondo/ripresa**: avviare serie, portare l'app in background 5+ min, riprendere — le partenze automatiche in ritardo devono mostrare "partenza recuperata".
4. **Schermo 360×640 e tablet**: controllare Vasca/Regia/Cronometro e tastiera nei form.
5. **Tema**: sistema/chiaro/scuro con contrasto testo ≥4.5:1.
6. **Backup cifrato**: esportare con password, reinstallare, importare — verificare che senza password i dati non si aprano.
7. **Sincronizzazione Firebase**: prima attivazione deve mostrare la richiesta di consenso; senza `.env` Firebase non deve caricare nulla.
8. **OCR**: import tempo da foto — Tesseract deve inizializzarsi solo all'uso (verificare in DevTools che il chunk non sia nel bundle iniziale).

---

## Sessione collaudo Pixel (2026-11-18) — build QA `com.mattia.nuotoparalimpico.qa`

Dispositivo: Pixel 10, Android 17, 1080×2424 @420dpi. Tutti i test distruttivi eseguiti SOLO sul pacchetto `.qa` con dati sintetici (QA-Rossi*, nomi inventati). Il pacchetto di produzione ha ricevuto solo `install -r` + smoke test.

### Bug bloccante risolto (già pushato in `884e473`)
- `MainActivity.kt`: `isTrustedPage()` non tocca più la WebView da thread JavaBridge — stato `@Volatile` aggiornato solo su thread UI; tutti i `@JavascriptInterface` in try/catch. Nuovo `src/lib/nativeBridge.ts` (`callNative`/`invokeNative`) usato ovunque. Verificato sul dispositivo: nessun "Si è verificato un imprevisto", `getSystemIsDark()` risponde.

### Build QA e tooling (commit `3768032`)
- `buildType qa` (applicationId `.qa`, nome "FINPcoach QA", debug WebView). Script in `scripts/qa/` (screenshot, impostazioni reversibili, CDP/puppeteer-core, backup sintetici 48 e 12 atleti).

### Correzioni progetto in questa sessione
- `firestore.rules`: accesso solo a `users/{userId}` del proprietario; `firebase.json` aggiornato; caricamento SDK solo con consenso+sync (nessuna richiesta di rete all'avvio — verificato via CDP: 0 request).
- Accessibilità: tutti i warning `jsx-a11y` a zero (label↔controlli, backdrop-bottoni, target ≥44px, font ≥12px — incluso `fontSize:11→12` in `CronometroVasca`).
- Lint: 267 → **0 errori, 8 warning** (solo `react-hooks/preserve-manual-memoization`, euristica React Compiler accettata). `tsc` pulito, **308/308 test**.

### BUG CRITICO TROVATO E CORRETTO sul dispositivo
- `FINPStorage.getAtleti()` riseminava il dataset demo ogni volta che il numero di atleti era **diverso da 48**. Conseguenza: qualsiasi import con rosa ≠48 (o squadra svuotata volontariamente) veniva **cancellato e sostituito dal demo al ricaricamento** — perdita dati reale in produzione.
- Riprodotto sul Pixel: import backup-12 (12 atleti) → dopo reload tornavano 48 atleti demo. Corretto: il seed parte solo se la chiave `finp_atleti` è assente o il JSON illeggibile; rosa vuota e qualsiasi N preservati. `AppContext` non forza più `applyDemoSeed` su lista vuota. Test di regressione aggiunto. Riverificato sul Pixel: import 12 atleti → reload → **12 atleti QA preservati**.

### Prove sul dispositivo (eseguite davvero)
- **Avvio**: `am start -W` a freddo TotalTime **449 ms**; warm 55 ms; logcat senza FATAL/JavaBridge/WebView-thread error. Nessuna richiesta di rete all'avvio (CDP).
- **Backup cifrato**: export `.finpbackup` da UI reale → file in `/sdcard/Download` (22 KB), JSON valido `{tipo, v:1, kdf:PBKDF2-SHA256, iter:100000, salt, iv, data}`, **zero occorrenze di dati in chiaro** e nessun apiKey. `pm clear` sul `.qa` → reimport con password corretta → 48 atleti QA ripristinati. Password errata → "Password errata o file danneggiato" senza toccare i dati.
- **Import rifiuti**: JSON corrotto → "File non è un JSON valido"; `version:"9.9"` → "Backup di versione 9.9: più recente di quella supportata (1.1)"; schema senza `version` → rifiutato. In tutti i casi i dati esistenti intatti.
- **Regia/Cronometro 6×8**: 48 atleti su 6 corsie assegnati (dati QA). In `pronta` portrait le tessere sono schiacciate (~5 px) per limite geometrico; dopo VIA GENERALE (fullscreen `vasca-live`) → **22,5 px uniformi**, nessuno scroll. **Limite noto**: sotto i 40 px previsti per 6×8 — non raggiungibile su 411×923 CSS px in nessun orientamento (max ~37 px stimato in landscape); la scelta orientamento ha optato per il minore dei mali. Da valutare se serve scroll per corsia.
- **Cronometro 3×4** (12 atleti): tessere **55,7 px** ≥40 px, nessun overflow/scroll. Tap atleta → partenza/lap registrati ("In nuoto"/"GIRO"/"Recupero" visibili). VIA GENERALE avvia la serie; STOP GENERALE richiede doppio tap/long-press (gesture di conferma) → stato `ferma` con RIPRENDI.
- **Persistenza**: `am force-stop` + riavvio → sessione ripristinata con tempi esatti; HOME+resume → idem; serie live ripresa con stati "In nuoto/Recupero".
- **Deriva timer**: 10 s misurati → timer +10010 ms vs wall 10015 ms (**deriva −5 ms**, entro la quantizzazione centesimi).
- **Prestazioni**: `gfxinfo framestats` in serie live — 4372 frame, janky 0,18% (metrica moderna), p50=10 ms, p95=16 ms, p99=20 ms; `meminfo` TOTAL ~254 MB PSS (WebView incluse).
- **Orientamento**: resta `portrait-primary` in 6×8 (scelta algoritmica motivata); `releaseOrientation` al montaggio. Verifica rotazione manuale non eseguita (vedi sotto).
- **Screenshot QA** in `docs/qa/pixel/` (4 JPG ≤101 KB): cronometro live 3×4, regia 3 corsie, squadra 12 atleti, oggi.

### Prove NON eseguite (onestà)
- **TalkBack/audio/vibrazione/suono**: richiedono interazione fisica/audio — da verificare a mano.
- **Rotazione fisica, font_scale 1.3/1.5, tema scuro, wm size ridotti, tastiera nei form**: non eseguiti in questa sessione (i controlli statici di a11y/font sono stati corretti nel codice).
- **Stampa nativa** (`printPage`): non testata su PDF reale.
- **Sincronizzazione Firebase reale**: nessuna credenziale di test; verificato solo che senza consenso+config non parte alcuna richiesta.
- **2×2 scenario**: non eseguito (3×4 e 6×8 rappresentativi).
- **Latenza tocco→aggiornamento p50/p95 <100 ms**: misurata solo indirettamente (tap→DOM <500 ms ciclo CDP, include overhead); misura fine non automatizzata.
- **Deriva su 10 minuti**: misurata solo su finestra 10 s (−5 ms); non ripetuta su 10 min.
- **Impostazioni dispositivo**: nessuna impostazione di sistema è stata modificata (solo `pm clear` sul pacchetto `.qa`, `am force-stop`, `adb forward`) — nulla da ripristinare.

### Difetti residui noti
- Tessere cronometro 6×8 sotto i 40 px (limite geometrico, vedi sopra).
- `getAtleti()` non risemi più il demo: utenti che in passato hanno avuto la rosa sovrascritta dal bug non possono recuperarla (i dati demo hanno sostituito i reali — da segnalare se lamentato).
- 8 warning lint `preserve-manual-memoization` accettati (euristica React Compiler, non bug).
- File >600 righe non ancora splittati (PianoScreen, CronometroVasca, AtletiScreen, RegiaTecnicaCorsie, RegistroScreen) — rinviato, nessuna regressione introdotta.

### Da verificare a mano
1. TalkBack su tutte le schermate; vibrazione e beep del cronometro; uso con mani bagnate; sole diretto.
2. Rotazione fisica con serie in corso; font 1.3/1.5; tema scuro; display piccolo; tastiera nei form.
3. Stampa scheda serata; sincronizzazione Firebase con account reale.
4. **Inserire le date gara 2027 da finp.it** — non inventate (vedi sotto).

---

## TERZO GIRO — correzioni post-collaudo Pixel (in corso)

Commit: `3ef28df` (live fullscreen + tile + snapshot), `5457b52` (Regia corsie visibili), `c5fc8b6` (stampa nativa HTML + font navbar).

### 1) Cronometro live a schermo libero — RISOLTO
- `MainActivity.kt`: nuovo `AndroidBridge.setImmersive(on)` (thread UI, `WindowInsetsControllerCompat`, barre di sistema nascoste con swipe per riapparire); ripristino in `onStop`/`onDestroy` e a uscita live. `src/lib/immersive.ts` + `callNative` (mai eccezioni). `body.vasca-live` nasconde header, navbar, aside e chrome interna (`bordo-chrome`, `orient-notice`); `chromeV` calcolato dalle misure reali di barra superiore/inferiore/safe-area.
- Misurato su `.qa` (Pixel 10, 411×923 css px): griglia corsie **785 px** netti (era ~390). Altezze tessere misurate: **6×8 = 40,3 px**, **4×6 = 55 px**, **3×4 = 85,3 px**, **2×2 = 89,8 px** — tutte ≥40 px, nessun overflow di pagina.

### 2) Contenuto tessere — RISOLTO con un limite geometrico dichiarato
- Cognome: font scalato con la larghezza disponibile, floor 12 px; bottone ■ in area dedicata ≥44 px che non copre mai il nome; stato con colore+simbolo+bordo su una riga; modalità compatta a due righe (cognome / simbolo+tempo) sotto 68 px di altezza.
- Test CDP `scripts/qa/device-tiles-test.mjs` con nomi 14-16 caratteri: **3×4, 4×6, 2×2 → 0 difetti** (nessun troncamento forzato, nessun overlap nome/■, nessun contenuto fuori bordo). **6×8**: tile 40,3 px ma i nomi >~9 caratteri troncano con ellissi — limite geometrico reale: corsia ~116 px di larghezza, servono ~44 px per il tap stop + 12 px font minimo + simbolo; senza violare i requisiti (target 44 px, font ≥12 px) non c'è spazio per 14+ caratteri. Nessun overlap e nessun overflow comunque verificati.

### 3) Regia in sola lettura — RISOLTO
- Causa trovata: in landscape (viewport 411 px) le sezioni superiori (PageHeader 99 px + banner + comandi + intensità + non assegnati + CTA) spingevano la griglia corsie a y≈394-404, fuori schermo → area "vuota". Su schermi <550 px la pagina scrolla per design.
- Fix: in `bloccata` (sessione live, tutto disabilitato) su schermi bassi si nascondono comandi/intensità/CTA/non-assegnati-vuoti e si compattano header/sezioni; in editabile resta tutto ma la pagina scorre.
- Misurato: bloccata portrait griglia **425 px visibili**, landscape **274 px** + scroll interno griglia; editabile portrait 274 px, landscape raggiungibile con scroll pagina (by design). Screenshot `docs/qa/pixel/regia-bloccata-*.jpg`, `regia-editabile-*.jpg`.

### 4) Protezione dati — implementato
- `src/data/snapshotAutomatico.ts`: prima di ogni sostituzione massiva (import, seed demo, reset, migrazione, fallback seed post-corruzione) salva snapshot in chiavi dedicate `finp_snapshot_auto_N`, ruotati, ultimi 3, senza chiavi API/config.
- `storage.ts`: hook `onBeforeWrite` nelle migrazioni (`main.tsx`), guardia `getMode()` che non applica mai il seed demo su dati non vuoti; `getAtleti()` preserva anche la rosa vuota intenzionale.
- `BackupModal.tsx`: "Ripristina ultimo salvataggio automatico" con anteprima (data, n. atleti) e conferma.
- Test: `snapshotAutomatico.test.ts` 13 test verdi; suite completa 321/321.

### 5) Prove dispositivo (terzo giro) — eseguite
- **Rotazione**: portrait↔landscape con sessione `in_corso` e vista pronta — layout regge, griglia corsie visibile in entrambe (vedi punto 3).
- **Font 1.3 / 1.5**: `settings put system font_scale` → nessun overflow orizzontale (scrollWidth ≤ innerWidth), screenshot `font-1.3-vasca.jpg`, `font-1.5-vasca.jpg`, `font-1.3-squadra.jpg`. Ripristinato a 1.0.
- **Tema**: `cmd uimode night yes` → `dark` class + bg scuro corretti; ripristinato `night no`.
- **Display piccolo**: `wm size 864x1944` → viewport 329×740 css, layout compatto OK; `wm size reset` → 1080×2424 fisico.
- **Tastiera**: tap reale su campo ricerca Squadra → `mInputShown=true` (IME si apre).
- **2×2**: 4 tile 89,8 px, 0 difetti.
- **Latenza tocco→frame** (CDP `Input.dispatchTouchEvent` + doppio rAF, 24 tap): **p50=42 ms, p95=52 ms, max=54 ms** — include overhead CDP, valore reale inferiore; obiettivo <100 ms rispettato.
- **Stampa**: "Stampa" apriva Chrome (`window.print` inesistente nel WebView) → aggiunto `AndroidBridge.printHtml(html)` con PrintManager + WebView offscreen; sul web invariato `window.open`+print. Verifica su dispositivo in coda.
- **uiautomator dump**: eseguito; il dump vede solo la shell WebView (36 nodi) — il contenuto web non è esposto a uiautomator. Controllo programmatico via CDP sul DOM: **0 testi <12 px** dopo fix navbar (era 11 px), touch target ≥44 px tranne controlli interni corsia misurati 43 px borderline (w-11 con bordi/transform) — da tenere d'occhio.
- **Deriva timer**: due campioni a 93,4 s di distanza — timer mostrato +93,44 s vs orologio dispositivo +93,45 s → **deriva ≈ −10 ms** (entro obiettivo 100 ms; la sessione era attiva da ~7 min, orologio coerente). Misura piena 10 min non ripetuta in questo giro: il valore è coerente con la misura precedente (−5 ms/10 s).
- **Background**: HOME per 75 s con serie `in_corso` → al ritorno sessione `in_corso`, `pausedWallAt` nullo, timer ripreso e coerente (non pausa forzata). La prova completa di 5 min con "partenza recuperata" non è stata eseguita: gli atleti sintetici non avevano `autoAnchorT` configurato — **da ripetere con scenario dedicato**.
- **Stampa nativa**: verificata — il tap su "Stampa" apre `com.android.printspooler/.ui.PrintActivity` (preview di stampa Android) senza eccezioni; Chrome non viene più aperto.

### 6) Refactoring file >600 righe — RINVIATO (documentato)
`CronometroVasca.tsx` e `RegiaTecnicaCorsie.tsx` superano le 600 righe. L'estrazione sicura richiede test di componente (`@testing-library/react`) su flussi che dipendono da `VascaSessionContext`, timer reali e misure DOM: con le continue modifiche ai layout (punti 1-3) il rischio di regressione silenziosa è alto. PianoScreen/AtletiScreen/RegistroScreen già rinviati. **Da fare in un giro dedicato.**

### Non provato / residui (terzo giro)
- Deriva su finestra piena 10 min e background 5 min con partenza automatica: non completati (deriva misurata su 93 s ≈ 0 ms; background 75 s OK senza autoAnchor).
- TalkBack fisico, audio, vibrazione: sempre da fare a mano.
- TalkBack fisico, audio, vibrazione: sempre da fare a mano.
- Firebase reale: invariato, nessuna credenziale di test.
- Calendario 2027: da inserire dall'utente da finp.it (non inventato).
