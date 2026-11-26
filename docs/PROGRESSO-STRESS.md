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
| R2 | fatto | 8076c62 | Copertura componenti+dominio: 4 nuovi file test (schermate 21, piano 12, bordoVasca 8, serviziExtra 25) + jsdomEnv/renderApp; vitest globals+alias JSON; MATRICE 243 elementi, 0 "non provato" senza motivo (2 con motivo: firebaseConfig, staticData); npm run qa:matrice fallisce se resta un gap. Suite 502 test verdi, tsc/lint ok |
| R3 | fatto | — | device-live-test.mjs: VIA 6 corsie, catena auto L1 (8/8), tap->partenza, long-press->fermo, reset conferma/annulla OK; MISURA 48 tessere h=40px fail=0 portrait+landscape (run live-nodrift). Deriva: 13 campioni visibili/16, driftVis=854ms picco-picco su ~7,5min, nessun trend (jitter rAF/schermo, motore Date.now); background 5min: sessione in_corso, 14 timer coerenti, nessun autoLate perche il WebView ha continuato a girare (recuperata coperta da cronometroVasca.test.ts). Rotazione/font/tema/display: no overflowX (device-misc-test). Screenshot in docs/qa/pixel/ |
| R4 | fatto | 3d8b6ae | VERIFICA-REGOLAMENTI.md: 244/248 testi FINP fedeli (4 scarti encoding), capitolo NP.1.24 assente (gap noto), WPS non verificabile con fonti locali, gare-ammissibili 10.4.1 verificato (test), record 50/50 ok, 25 query coperte da regolamentiRicerca.test.ts |
| R5 | fatto | 18e2dff | quota reale .qa ~2,36MB (misura QUOTA-STORAGE.md); storageQuota.ts + card Spazio in BackupModal, avviso >70%, pulizia log vecchi con doppia conferma+backup |
| R6 | fatto | 3d8b6ae+18e2dff | badge A-race: whitespace-nowrap su .ds-chip (anti-a-capo su trattino), nome gara 2 righe, data+belt shrink-0; cestino stagione: conferma con riepilogo (micro/gare/iscrizioni/chiusure) + salvaSnapshotDati() prima di eliminaStagione |
| R7 | fatto | 1fa17e9,515c774,e2091c1,2741542,aeb6652,96f0174 | Scomposizione: Regia 976->505, Registro 842->414, Atleti 1398->424, Piano 1933->1337, Cronometro 1875->1075 (parziale, vedi DECISIONI) |

## QUINTO GIRO — "SCHEGGIA"
| passo | stato | nota |
|-------|-------|------|
| 1.1-1.2 Regia wrap+cognomi | fatto | header flex-wrap, controlli >=44px, cognome line-clamp-2; chip nonAssegnati già ok |
| 1.3 Badge QA | fatto | BuildConfig.IS_QA_BUILD + badge DOM rosso "QA · dati simulati" in MainActivity |
| 1.4 Capitoli regolamento | fatto | +10 sezioni verbatim -> 258; test aggiornati 41/41 |
| 2.1-2.4 Storage IDB | fatto | kvStore.ts, migrazione LS->IDB con checksum+snapshot, storageQuota via estimate(), 13 test |
| 2.5-2.6 Device storage | fatto | .qa: migrazione una tantum (ts invariato al riavvio), 100/14900/4883/15/574 invariati, LS<200KB; force-stop OK; prod install -r OK |
| 3.1 Generatore | fatto | --atleti/--stagioni/--presenti; stress-300x3.json 33,7MB generato |
| 3.2 Budget | fatto | device: Squadra 157ms, ricerca 19ms, Registro 170ms, import ~4s, PSS 348MB — tutti nei limiti |
| 3.3 Archivia stagione | fatto | archivio .json.gz + doppia conferma + snapshot; test dominio |
| 3.4 Limiti | fatto | nessun limite artificiale trovato |
| 4.1 Freeze 90s | fatto | CDP frozen: 7 autoLate e marker ↺; background: catena completata senza perdita |
| 4.2 Deriva | in corso | misura in-page 10min |
| 4.3 300x3 device | fatto | import ~4s, tour squadre/regia/cronometro OK |
| 5.1-5.3 Pixel | in corso | PROVA-UTENTE.md scritto; pm clear+import+Download pendenti |

## GIRO GRAFICO — "4 ORE"
| fase | stato | t+min | nota |
|------|-------|-------|------|
| FASE 0 base | fatto | t+20 | .qa allineata a HEAD, stress-100 attivo, demo SystemUI, 9 screenshot prima/*, DIFETTI.md; screenshot con dati personali rimosso (23c3970) |
| FASE 1 fondazioni | fatto | t+60 | token label>=12px, semantica.ts unico, PageHeader status, ds-btn focus, acwr/zone a tema |
| FASE 2 oggi+squadra | fatto | t+70 | Oggi: chip semantici, Attenzioni, Volume sett.; Squadra: nome 2 righe, presenza+ACWR, modo compatto |
| FASE 3 piano | fatto | t+90 | TimelineStagione + GraficoVolumeSettimane, menu Altro per Elimina/Archivia |
| FASE 4 scheda atleta | parziale | t+95 | già bottom sheet con tab; refactor tab non fatto (tempo) |
| FASE 5 vasca/regia | fatto | t+100 | controlli 44->48px, chip stati da STATO_VASCA condiviso |
| FASE 6 verifica | fatto | t+105 | 15 screenshot dopo/*, audit DOM pulito |
| FASE 7 consegna | in corso | t+110 | build ok, .qa+prod installate, restore impostazioni |
| FASE 0 audit geometrico | fatto | residuo 110min | layout-audit.mjs: 10 sch x 4 combo, AUDIT-PRIMA/DOPO |
| FASE A fotocamera/insets | fatto | residuo 95min | cutout SHORT_EDGES + unione insets + __finpInsets + safe-area CSS; overlay emulator non supportati dal device (documentato) |
| FASE B difetti visivi | fatto | residuo 75min | card collassata, navbar, header squadra, gare, cronometro pronta; bloccanti=0 |
| FASE C pulsanti | parziale | residuo 60min | C.1 inventario 337 + C.5 TODO ok + C.6 qa:pulsanti; C.2/C.3 tagliati |
| FASE D extra | saltata | - | oltre budget |
| FASE E consegna | fatto | residuo 20min | test verdi (1 flaky sotto carico, verde isolato), lint 8 warning preesistenti, tsc ok, .qa+prod installate, telefono ripristinato |
