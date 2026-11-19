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
| D2 | da fare | — | @testing-library/react + test componenti |
| D3 | da fare | — | scomposizione Cronometro/Regia (<600 righe) |
| D4 | da fare | — | test espliciti funzioni app (firebase mock, OCR, CSS...) |

## FASE E — Pixel (.qa)
| E1 | da fare | — | rebuild/reinstall .qa, import stress-100, misure |
| E2 | da fare | — | rendering/fluidità/a11y per schermate |
| E3 | da fare | — | Regia 48 + Cronometro scenario reali |
| E4 | da fare | — | backup/export/import/pm clear .qa |
| E5 | da fare | — | stampa |
| E6 | da fare | — | fix difetti + regression test |

## FASE F — Consegna
| F1 | da fare | — | REPORT/CHANGELOG/RILASCIO/README/DECISIONI |
| F2 | da fare | — | tsc/lint/test/build, git pulito |
| F3 | da fare | — | rebase + push |
