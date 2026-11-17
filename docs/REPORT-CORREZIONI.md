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
