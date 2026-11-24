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

## 2026-… — B4 tessere cronometro compatte (6x8)
- Scelta: in `compact` la pressione lunga (450 ms) fa da STOP/Riprendi
  (toggle = "annulla sempre disponibile"); il pannello atleta resta
  raggiungibile con atleta fermo o in fase pronta. L'area bottone ■ (44 px)
  è rimossa dalle tessere compatte: il cognome usa tutta la larghezza e va
  su due righe (font 12 px, max 2 righe). Motivo: requisiti B4(a); target
  >=44 px mantenuti sui controlli (w-9->w-11 in Regia). La tessera con
  altezza <34 px mantiene il troncamento (una sola riga possibile).

## 2026-11-19 — D3 scomposizione componenti rinviata
Scelta: NON scomporre CronometroVasca/RegiaTecnicaCorsie/AtletiScreen/PianoScreen in questa sessione.
Motivo: i componenti superano ampiamente 600 righe (fino a ~1900) e la scomposizione senza test di componente
schermata rischia regressioni comportamentali; le modifiche B4 sul cronometro sono già testate a livello dominio
(cronometroVasca.test.ts) e la regola utente prevede "se rischioso, annota e passa oltre".
Mitigazione: test di componente UI (ui.test.tsx) e mock Firebase (firebaseSync.test.ts) aggiunti; la matrice
segnala i componenti come non provati a livello schermo.

## 2026-11-24 — R5 archiviazione storage
- Misura reale quota su .qa in corso (device-quota-test.mjs); `navigator.storage.estimate()` usato quando disponibile, fallback 5 MB.
- Scelta: NON migrazione IndexedDB (troppo invasiva per il guadagno). Implementato: `src/lib/storageQuota.ts` (misura UTF-8 reale, percentuale), avviso >70% + card "Spazio occupato" in BackupModal, e "Pulisci registro vecchio" = rimuove logSedute anteriori all'inizio stagione corrente con doppia conferma e promemoria backup (i tempi di gara non vengono mai toccati). L'export completo esistente resta il backup di emergenza.
- Motivazione: il dato pesante accumulato nel tempo e' logSedute/tempi; i tempi sono record agonistici (mai cancellati), il registro allenamenti e' comprimibile solo con consenso esplicito. L'archiviazione "stagioni chiuse" non si applica: l'app tiene una sola stagione corrente.

## 2026-11-24 — R7 scomposizione rinviata di nuovo
- Resta valida la decisione D3: i test di componente R2 coprono rendering e interazioni base, ma la scomposizione di file da 1900 righe richiede un giro dedicato con piu' tempo; qui si privilegiano le prove device e la consegna.
