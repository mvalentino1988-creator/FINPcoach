# DECISIONI — collaudo stress

## 2026-11-19 — Ambito assenze e IscrizioneGara
- `Assenza.ambito` opzionale ('TUTTO'|'ALLENAMENTO'|'GARA'), default 'TUTTO' per retrocompatibilità; `garaId` solo con ambito GARA. Migrazione `finp_assenze` v1→v2.
- Nuova chiave `finp_iscrizioni_gare` (v1) inclusa in backup, validazione, sync Firebase e snapshot automatici.
- Funzione unica `isAssenteInData`/`assenzaCopreAmbito` in `src/domain/assenze.ts`: è il riferimento per VolumeIndividuale, validatori, registro e (in B3) gli altri moduli.
- Scelta: l'assenza con ambito GARA e garaId copre SOLO quella gara; senza garaId copre l'ambito gara in generale.

## 2026-11-19 — Dataset di stress
- Generatore in `scripts/qa/gen-stress-core.ts` (TS, usato da Vitest e da `gen-stress.mjs` via bundle esbuild): un solo sorgente, output identico per seme.
- `meta.simulato=true` su backup/stagione/gare; nomi "SIM-".
- Giorno di prova = 2026-11-19 (oggi) con overrideSedute: 6 corsie, 48 atletiPresentiIds. Gli assenti per assenza nel giorno di prova sono 23 (20 designati + 3 sovrapposizioni casuali di altri periodi): la selezione dei 48 è comunque esatta e deterministica.
- Incongruenze volute (iscritto_con_assenza, tempo_gara_in_assenza) elencate in `stress-100-manifest.json`; ogni altra regola è verificata pulita dai test.

## 2026-11-19 — Mitigazione storage (A4)
- Misura a pieno regime (100 atleti, 14.900 log, 4.883 tempi): dati live ≈ 2,52 MiB; 3 snapshot inline sarebbero ≈ 7,7 MiB (totale ~10,2 MiB, oltre la quota tipica).
- Scelta: snapshot compressi con gzip (CompressionStream) per dataset > 400 KiB; formato inline invariato per dataset piccoli (backward compatible). `ripristinaSnapshot` ora asincrono.
- Dopo: snapshot compresso ≈ 193 KiB ciascuno → totale stimato ≈ 3,1 MiB (31% di 10 MiB).
- L'API `salvaSnapshotDati()` resta sincrona lato chiamante: la compressione è accodata (`snapshotFlush()` per i test).
