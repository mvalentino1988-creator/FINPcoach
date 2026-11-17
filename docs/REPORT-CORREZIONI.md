# Report correzioni FINPcoach

## Baseline (stato di partenza)

Eseguita il 2026-06-01 su `main` (commit `8754eb0`):

- `npm ci`: OK — 257 pacchetti. `npm audit`: 6 vulnerabilità (1 moderate, 5 high) — da analizzare nel blocco 3.5.
- `npx tsc --noEmit`: pulito, nessun errore.
- `npm test` (vitest): 10 file, 101 test, tutti verdi.
- `npm run build`: OK (tsc + vite + sync asset Android). Warning noto: chunk `vendor-firebase` >500 kB.
- `npm run lint`: script non presente (blocco 9).

## Punti risolti

(in aggiornamento)

## Punti non applicati / già risolti

(in aggiornamento)

## Decisioni prese

(in aggiornamento)

## Da verificare a mano su Pixel

(in aggiornamento)
