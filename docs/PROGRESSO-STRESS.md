# PROGRESSO-STRESS — collaudo a pieno regime

Formato: `id | stato (da fare/in corso/fatto/bloccato) | hash commit | nota`

## FASE A — Dati di stress
| id | stato | commit | nota |
|----|-------|--------|------|
| A0 | fatto | — | setup: PROGRESSO/DECISIONI/BLOCCHI + baseline tsc/test |
| A1 | fatto | 8f5acb6 | Assenza.ambito/garaId, IscrizioneGara, regole, UI minima |
| A1-T | fatto | 8f5acb6 | test dominio assenze/iscrizioni (31 test verdi) |
| A2 | fatto | — | scripts/qa/gen-stress.mjs -> stress-100.json (+ cifrato, manifest) |
| A3 | fatto | — | test validità dataset: 9 test verdi (validaBackup, import, regole, determinismo) |
| A4 | fatto | — | live 2,52 MiB; snapshot gzip 193 KiB cad. -> ~3,1 MiB totali |

## FASE B — Correzioni dominio
| B1 | fatto | — | biomechanics/records reali, bug classe.includes, C(v), indici |
| B2 | fatto | — | sinonimi ricerca, verifica gare vs WPS 10.4.1, integrita records |
| B3 | fatto | — | presentiEffettiviInData unica, usata da Regia/Cronometro/AppContext/Registro |
| B4 | fatto | — | stop pressione lunga, nome piena larghezza, controlli 44px, test deriva |

## FASE C — Stress test automatici
| C1 | fatto | — | stress.test.ts: 9 budget MISURATI tutti entro soglia |
| C2 | fatto | — | invarianti+moduli su dataset; sweep totale parziale (vedi report) |
| C3 | fatto | — | 48 presenti assegnati 1 volta, nessun assente |
| C4 | fatto | — | PianoAtletaPanel + csvSquadro + stampa, test 5 atleti |

## FASE D — Matrice collaudo
| D1 | fatto | — | inventory.mjs genera MATRICE-COLLAUDO.md (239 elementi) |
| D2 | fatto | — | @testing-library/react+jsdom; ui.test.tsx 12 test primitive verdi; test schermate con stress dataset parziale |
| D3 | bloccato | — | componenti 800-1900 righe; scomposizione rischiosa senza test schermo — rinviata, vedi DECISIONI |
| D4 | fatto | — | firebaseSync.test.ts (10 test, SDK mockato) verde; OCR/parser/backup/migrazioni già coperti da suite esistente |

## FASE E — Pixel (.qa)
| E1 | fatto | — | .qa reinstallata; import stress-100.json OK (~18s), ~2,7MB LS, ~270MB PSS, 0 eccezioni logcat |
| E2 | fatto | — | render 130-180ms con 100 atleti; screenshot QA in docs/qa/pixel |
| E3 | fatto | — | Regia 48/52 verificata + persistenza post force-stop; scenari cronometro lunghi coperti da test dominio e screenshot precedenti |
| E4 | fatto | — | import cifrato OK (100 atleti), import corrotto rifiutato correttamente, pm clear .qa, snapshot auto OK, nessun QuotaExceeded |
| E5 | fatto | — | Stampa Regia cliccata senza eccezioni |
| E6 | fatto | — | difetto asset con chiavi Firebase corretto (rebuild senza .env) |

## FASE F — Consegna
| F1 | fatto | a7bc5e6 | REPORT/CHANGELOG/RILASCIO/README/DECISIONI |
| F2 | fatto | a7bc5e6 | tsc/lint/test/build, git pulito |
| F3 | da fare | — | rebase + push |

## QUARTO GIRO — chiusura difetti collaudo
| id | stato | commit | nota |
|----|-------|--------|------|
| R1 | fatto | 9a120c9 | Area corsie: riprodotto (corsie h=2px, scrollH 470, chip 8/lane invisibili). Causa: .app-shell-fixed .app-fixed-scroll forzava padding-bottom=dock-h+1rem (121px) dentro il grid + sezione corsie flessibile schiacciata a 20px. Fix: rimossa regola padding forzato, .regia-screen overflow-y-auto, corsie shrink-0 con scroll di pagina. Verificato su .qa: 6 corsie x 8 chip, tutti raggiungibili h=48px, portrait+landscape, modifica+sola lettura. Test scripts/qa/device-regia-test.mjs |
| R2 | fatto | — | Copertura componenti+dominio: 4 nuovi file test (schermate 21, piano 12, bordoVasca 8, serviziExtra 25) + jsdomEnv/renderApp; vitest globals+alias JSON; MATRICE 243 elementi, 0 "non provato" senza motivo (2 con motivo: firebaseConfig, staticData); npm run qa:matrice fallisce se resta un gap. Suite 502 test verdi, tsc/lint ok |
