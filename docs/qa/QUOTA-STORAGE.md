# Quota LocalStorage misurata — Pixel .qa (R5)

Data: 2026-11-24. Misura con `scripts/qa/device-quota-test.mjs` (solo pacchetto .qa).

## Esiti

- `navigator.storage.estimate().quota` = **10.737.418.240 byte (10 GiB)** — pool
  dell'intero origin (IndexedDB + Cache + localStorage). NON e' la quota di
  localStorage: non usarla per la percentuale.
- Riempimento reale di chiavi di prova: `QuotaExceededError` dopo ~2,0-2,25 MB
  di chiavi aggiuntive, con ~2,69 MB gia' occupati → **quota effettiva
  localStorage ≈ 4,9-5,2 MB** (coerente col limite WebView di ~5 MB).
- Uso attuale dataset stress-100: **2.692.503 byte (2,69 MB) ≈ 52-54%**.
- `QUOTA_LOCALSTORAGE_BYTES = 5_000_000` in `src/lib/storageQuota.ts` e'
  la costante usata per la percentuale (con `stimata=false` onesta).

## Stima crescita

- Una stagione a 100 atleti ≈ 2,5 MiB (misura FASE E) — ma include una sola
  stagione di log; l'accumulo reale e' logSedute + tempi nel tempo.
- Con i dati correnti (2,69 MB) si e' gia' al ~52%: **la soglia 70% (3,5 MB)
  verra' raggiunta con meno di una stagione aggiuntiva di registro**; il
  100% (~5 MB) in ~1-2 stagioni a pieno regime.
- Mitigazione implementata: avviso >70% in BackupModal + "Pulisci registro
  vecchio" (logSedute precedenti all'inizio stagione, con backup promemoria).
  Snapshot auto ruotano a max 3 e sono compressi gzip oltre 400 KiB.
