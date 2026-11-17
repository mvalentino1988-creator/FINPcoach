# CHANGELOG

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
