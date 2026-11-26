# Procedura di rilascio FINPcoach (Android)

## Versioni

- **Fonte unica**: `package.json` → campo `version` (es. `0.2.0`).
- **versionName** in `app/build.gradle.kts` deve essere allineato manualmente
  a quel valore a ogni rilascio.
- **versionCode** in `app/build.gradle.kts` va incrementato di 1 a ogni
  upload (obbligatorio per il Play Store).
- La versione e la data di build sono visibili in app in **Altro → piè di
  pagina** (`v{__APP_VERSION__} · build {__APP_BUILD_DATE__}`, iniettate da
  `vite.config.ts`).

## Build di sviluppo (debug)

```bash
npm ci
npm run build:android    # produce dist/ e sincronizza app/src/main/assets/web
                         # SENZA chiavi Firebase (VITE_FIREBASE_* azzerate)
cd app && ./gradlew assembleDebug
```

L'APK debug è firmato automaticamente dal debug keystore. La WebView ha
`setWebContentsDebuggingEnabled` attivo solo se l'APK è debuggable.

## Build QA (collaudo su dispositivo)

```bash
cd app && ./gradlew assembleQa   # (o :app:assembleQa dalla root)
```

- `applicationId` = `com.mattia.nuotoparalimpico.qa`, nome "FINPcoach QA"
  (override in `app/src/qa/res/values/strings.xml`): convive con l'app di
  produzione senza toccarne i dati (internal storage separato).
- `initWith(debug)`: debuggable, WebView DevTools attive.
- Usare SOLO dati sintetici (vedi `scripts/qa/gen-backup.mjs`).
- Installazione: `adb install -r app/build/outputs/apk/qa/app-qa.apk`.
- Collaudo: `scripts/qa/` (lib.sh, settings.sh, cdp.mjs, inject-backup.mjs,
  device-tiles-test.mjs per le misure delle tessere del cronometro).
- Regola fissa: la build per Android va fatta con `npm run build:android`
  (script `scripts/build-android.mjs`), che azzera `VITE_FIREBASE_*` in
  modo che gli asset non contengano mai la configurazione Firebase. Se si
  usa `npm run build` con un `.env` presente, ricontrollare con
  `grep -r "AIza" app/src/main/assets/web` prima di compilare l'APK. `printHtml` è un metodo
  `@JavascriptInterface` aggiunto in `MainActivity.kt` per la stampa nativa
  della composizione corsie.

### Dataset di stress (100 atleti / 48 presenti)

```bash
node scripts/qa/gen-stress.mjs   # produce scripts/qa/out/stress-100.json
                                 #   + stress-100-cifrato.finpbackup (pwd: qa-test-2026)
                                 #   + stress-100-manifest.json
```

- Deterministico (seme fisso): stesso seme → file identico. Output in
  `scripts/qa/out/` (gitignored): **mai committare** i dataset generati.
- Tutti gli atleti hanno cognome `SIM-*` e `meta.simulato=true`.
- Import su `.qa` via UI (Dati → Importa backup) o via CDP:
  `node scripts/qa/device-import-test.mjs scripts/qa/out/stress-100.json ""`
  e per il cifrato: `... stress-100-cifrato.finpbackup qa-test-2026`.
- Inventario di collaudo: `node scripts/qa/inventory.mjs` →
  `docs/qa/MATRICE-COLLAUDO.md`.

## Build di release

```bash
cd app && ./gradlew assembleRelease
```

### Firma

Il progetto non include un keystore nel repository (corretto: le chiavi non
vanno mai in git). Per firmare un release:

1. Genera un keystore una tantum (fuori dal repo):
   `keytool -genkey -v -keystore ~/finpcoach-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias finpcoach`
2. Configura `signingConfigs.release` in `app/build.gradle.kts` leggendo
   credenziali da variabili d'ambiente o `keystore.properties` NON versionato:
   ```properties
   storeFile=/percorso/finpcoach-release.jks
   storePassword=...
   keyAlias=finpcoach
   keyPassword=...
   ```
3. `assembleRelease` con `isMinifyEnabled = true` e `shrinkResources = true`
   solo dopo aver verificato che l'app funzioni: le classi del bridge
   `@JavascriptInterface` (`AndroidBridge`, `NativeOrientationBridge`) non
   sono referenziate dal codice Java (sono chiamate via JS), quindi se un
   giorno si attiva R8 occorre aggiungere in `proguard-rules.pro`:
   ```
   -keepclassmembers class com.mattia.nuotoparalimpico.MainActivity* {
       @android.webkit.JavascriptInterface <methods>;
   }
   ```
   Allo stato attuale `isMinifyEnabled = false`: la WebView carica solo
   asset bundled, il codice nativo è piccolo, il rischio non giustifica R8.

## Sicurezza Firebase (se si usa la sincronizzazione cloud)

- `firestore.rules` (caricato via `firebase.json`): lettura/scrittura solo su
  `users/{userId}` e solo se `request.auth.uid == userId`. Distribuire con
  `firebase deploy --only firestore:rules`.
- La app chiede consenso esplicito alla prima attivazione
  (`finp_sync_consent`) e NON carica l'SDK Firebase senza consenso +
  sincronizzazione attiva.
- **Limitare la chiave API** nella Google Cloud Console: la `VITE_FIREBASE_API_KEY`
  è pubblica per costruzione (finisce nel bundle). In Cloud Console →
  Credenziali → restrizioni: consentire solo le API necessarie
  (Identity Toolkit, Token Service, Firestore) e, se possibile, limitare
  per referente HTTP.
- `allowBackup=false` e niente chiavi/secret nel repository.

## Ciclo di vita verificato

- `configChanges="orientation|screenSize|..."` nel manifest: la rotazione
  non ricrea Activity/WebView.
- `onSaveInstanceState`/`restoreState`: la WebView riprende la pagina.
- Il cronometro vive in `VascaSessionProvider` (React, localStorage):
  sopravvive a cambio tab, sfondo e riavvio.
- `allowBackup=false`: i dati non escono dal dispositivo via backup Android;
  usare l'export JSON cifrato dell'app.

---

# QUINTO GIRO — architettura storage e collaudo .qa

## Storage: da localStorage a IndexedDB
- Tutti i dati applicativi vivono in IndexedDB (`finpcoach-kv`, object store
  `kv`, chiave `k`): atleti, tempi, log, stagione, piano, gare, impostazioni
  piano, snapshot automatici, sessione cronometro.
- `src/data/kvStore.ts` mantiene un'<API> sincrona (`kvGet/kvSet/kvDel/kvKeys)
  con cache in memoria: la UI non è cambiata. Avvio = idratazione IDB
  (schermata "Caricamento…" in index.html); scritture = debounce ~200ms in
  coda ordinata + flush su visibilitychange/pagehide/blur e prima di
  export/import/snapshot.
- In localStorage restano solo: `finp_theme_mode`, `finp_mode`,
  `finp_onboarded`, `finp_idb_state` e il marcatore `__meta:migrazione`
  (in IDB). `navigator.storage.persist()` richiesto all'avvio.
- **Migrazione automatica** al primo avvio della nuova build: copia TUTTE
  le chiavi LS -> IDB, verifica conteggio+checksum per chiave, scrive il
  marcatore solo dopo verifica, conserva uno snapshot compresso
  (`__snapshot_pre_migrazione`) in IDB, poi svuota le chiavi pesanti da LS.
  Se fallisce o l'app viene chiusa a metà, LS resta autoritativa e la
  migrazione riprova al prossimo avvio. Verificato su .qa: una sola
  migrazione, stessi numeri, LS <200KB.
- `navigator.storage.estimate()` alimenta la scheda "Spazio" in BackupModal.

## Generatore stress (scripts/qa/gen-stress.mjs)
- `--atleti N` (default 100), `--stagioni S` (default 1), `--presenti P`
  (default 48), `--oggi AAAA-MM-GG` (giorno del "prova day" con i presenti
  attesi; default fisso 2026-11-19 per retrocompatibilità), `--seme`, `--out`.
- `--stagioni S>1`: le stagioni passate diventano storico (log di seduta e
  tempi con date coerenti) senza cambiare il modello della stagione attiva.
- Output in `scripts/qa/out/` (mai in git): `stress-100.json`,
  `stress-300x3.json` (33,7MB) e varianti `-cifrato.finpbackup`
  (password di prova solo in docs/qa/PROVA-UTENTE.md).

## Build e prova .qa
- Web+Android: `npm run build:android` (azzera VITE_FIREBASE_*, sincronia
  asset in `app/src/main/assets/web`, nessuna "AIza" negli asset).
- APK: `./gradlew :app:assembleQa :app:assembleDebug`.
- Pacchetto .qa = `com.mattia.nuotoparalimpico.qa` ("FINPcoach QA",
  badge rosso "QA · dati simulati"); pacchetto reale intoccabile.
- Helper device in `scripts/qa/`: `lib.sh` (adb/cdp/shots), `cdp.mjs`,
  `device-import-test.mjs` (import via CDP DataTransfer, conta IDB),
  `device-budget.mjs` (budget resa), `device-inject-session.mjs` e
  `device-frozen-test.mjs` (prove cronometro), `device-drift.mjs`
  (deriva in-page), `settings.sh` (impostazioni di sistema reversibili).
- Prova utente: `docs/qa/PROVA-UTENTE.md` (checklist 10 blocchi);
  `/sdcard/Download` contiene `stress-100.json` e
  `stress-100-cifrato.finpbackup` (password `qa-test-2026`).

## Safe-area, ritaglio e diagnostica (giro finale 2026-11-26)

- `MainActivity` usa `layoutInDisplayCutoutMode = SHORT_EDGES` (API 28+) e
  calcola gli insets come unione di `systemBars()` e `displayCutout()`.
  Inietta nel DOM: `--safe-top/right/bottom/left` e `--cutout-*` (px CSS),
  `window.__finpInsets = {safe, cutouts[], rotation}` e l'evento
  `finp-insets` (ripetuto a ogni cambio: rotazione, immersive, tastiera,
  reload pagina). In landscape il ritaglio laterale diventa `--safe-left/right`.
- Web: classi `.pt-safe .pr-safe .pb-safe .pl-safe .px-safe .py-safe .mt-safe
  .mb-safe .ml-safe .mr-safe` = `max(env(safe-area-inset-*), var(--safe-*))`.
  Applicate a: `.app-shell` (laterali), `PageHeader`, overlay fissi
  (bottom sheet `items-end`, modali `items-center`), Toast, banner errore,
  badge QA (sotto il ritaglio). Dove il ritaglio è assente niente spazio extra.
- Test ritaglio: `adb shell cmd overlay list | grep cutout` per gli overlay
  emulator. NOTA: su Pixel 10 / Android 17 gli overlay
  `com.android.internal.display.cutout.emulation.*` non modificano i
  boundingRects (verificato 26/11) — usare la rotazione reale per il caso
  laterale. `window.__finpInsets` in console CDP per ispezionare.
- Audit geometrico: `node scripts/qa/layout-audit.mjs` (CDP su .qa) —
  card collassate, testo spezzato, ellissi, sovrapposizioni, fuori schermo,
  target/testo piccoli, contrasto WCAG, sotto-ritaglio. Report in
  `docs/qa/grafica/AUDIT*.md`; esce 1 se restano difetti bloccanti.
- Inventario pulsanti: `node scripts/qa/inventory-buttons.mjs` →
  `docs/qa/PULSANTI.md`; verifica `npm run qa:pulsanti`.
