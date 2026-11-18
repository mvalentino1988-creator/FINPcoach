# CHANGELOG

## 0.2.1 — Fix bridge Android, build QA, collaudo Pixel (2026-11-18)

- **Fix critico Android**: i metodi `@JavascriptInterface` non leggono più la WebView da thread non-UI (stato `@Volatile` aggiornato solo su thread UI); nuovo wrapper sicuro `src/lib/nativeBridge.ts` per tutte le chiamate native. Risolve il crash "Si è verificato un imprevisto" all'avvio.
- **BUG DATI CRITICO**: `FINPStorage.getAtleti()` non risemina più il demo quando la rosa ha un numero di atleti diverso da 48 — prima cancellava qualsiasi import/squadra vuota al ricaricamento.
- **Build QA separata** (`.qa`, "FINPcoach QA") e script di collaudo in `scripts/qa/` (CDP/puppeteer, backup sintetici, impostazioni reversibili).
- **Sicurezza**: `firestore.rules` limitate al proprietario; caricamento Firebase solo con consenso+sync (zero rete all'avvio); backup cifrato AES-GCM verificato su device (export/import/password errata/rifiuti).
- **Accessibilità**: warning jsx-a11y azzerati; target touch ≥44px; font ≥12px; backdrop dei modali come bottoni.
- **Lint**: 0 errori (8 warning React Compiler accettati); TypeScript pulito; 308 test.
- **Collaudo Pixel 10**: vedi `docs/REPORT-CORREZIONI.md` — avvio 449ms, niente richieste di rete, persistenza sessione dopo force-stop, deriva timer −5ms/10s, gfxinfo p99=20ms.


## 0.2.0 — Quality pass completo (2026)

Lavoro di rifinitura in 10 blocchi: correttezza, sicurezza dei dati, accessibilità, prestazioni, manutenibilità. Nessuna funzionalità esistente rimossa.

### Vasca (Regia + Cronometro)
- `chromeV` calcolato sempre sul layout live, anche in stato "pronta"; mai ruotare durante una serie, isteresi 10%.
- Test di orientamento 411×923 (3×2, 3×4, 6×4 → landscape; 6×8, 4×6 → portrait).
- `refreshSession`: le partenze automatiche in ritardo dopo sospensione non vengono riallineate; l'atleta è marcato "partenza recuperata" (`autoLate`).
- Verifica: nessuna duplicazione di stato tra Regia e Cronometro.

### Integrità dei dati
- Registro migrazioni per chiave (`migrations.ts`), idempotente, con test.
- Import backup validato tipizzato + atomico (snapshot/ripristino); versioni future rifiutate.
- Backup cifrato `.finpbackup` (AES-GCM + PBKDF2); `iaConfig`/chiavi API mai esportate o importate.
- `finp_ultimo_backup`, avviso in Oggi oltre 14 giorni (soglia configurabile).
- `save()` non ingoia più gli errori: `STORAGE_ERROR_EVENT` + banner in App.
- ErrorBoundary con "Esporta dati di emergenza".

### Privacy e sicurezza
- Firebase lazy (import dinamico, chunk separato) e solo con consenso + credenziali + login.
- Chiave API IA: campo password con mostra/nascondi, avviso "solo su questo dispositivo", esclusa da backup/export.
- Android WebView: file access disabilitati, debugging solo debug, bridge limitato all'origine attesa, permessi inutili rimossi.
- `server.js`: path traversal bloccato + header di sicurezza.

### Correttezza scientifica
- ACWR unificato: 0.8–1.3 ottimale, 1.3–1.5 attenzione, >1.5 elevato — stessa soglia in dominio, Registro e README; disclaimer "indicatore di monitoraggio".
- Calendario FINP: import JSON validato, inserimento manuale, avviso "non aggiornato" per calendario/record/regolamenti.
- Test estesi: CSS, ripartenze, Festività (Pasqua 2024–2035), PianoValidator, classi S/SB/SM.

### Accessibilità
- Nessun testo funzionale <12px; touch target ≥44px; aria-label su bottoni icona; colori semantici con testo; `aria-live` per toast; feedback disattivabile.

### Prestazioni
- Tesseract lazy (solo all'OCR); `.gitattributes` per gli asset generati; misure chunk annotate.

### Versioni e ciclo di vita
- `versionName` allineato a `package.json` (0.2.0), versione+build visibili in Altro.
- `docs/RILASCIO.md`: procedura build, firma, versionCode.

### Qualità del codice
- ESLint (typescript-eslint, react-hooks, jsx-a11y, unused-imports): 0 errori.
- `any` ridotti e tipizzati; `import.meta.env` tipizzato; `console.log` di debug rimossi.
- `noImplicitReturns` attivato; bug latente in `puntiTabellariService.calcolaPuntiGara` riparato (record `tm` invece di campo inesistente).
- Test: da 101 a **300 test** su 26 file.
