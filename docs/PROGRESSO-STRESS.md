# PROGRESSO-STRESS — collaudo a pieno regime

Formato: `id | stato (da fare/in corso/fatto/bloccato) | hash commit | nota`

## FASE A — Dati di stress
| id | stato | commit | nota |
|----|-------|--------|------|
| A0 | in corso | — | setup: PROGRESSO/DECISIONI/BLOCCHI + baseline tsc/test |
| A1 | da fare | — | Assenza.ambito/garaId, IscrizioneGara, regole, UI minima |
| A1-T | da fare | — | test dominio assenze/iscrizioni |
| A2 | da fare | — | scripts/qa/gen-stress.mjs -> stress-100.json (+ cifrato) |
| A3 | da fare | — | test validità dataset + manifest incongruenze |
| A4 | da fare | — | misura storage; mitigazione se >50% quota |

## FASE B — Correzioni dominio
| B1 | da fare | — | biomechanics/records reali, bug classe.includes, C(v), indici |
| B2 | da fare | — | regolamenti WPS/FINP, gare-ammissibili, ricerca 25 query, recordService |
| B3 | da fare | — | funzione unica assenza/presenza, rientro graduale |
| B4 | da fare | — | cronometro: nomi lunghi, target 44px, partenza recuperata/drift |

## FASE C — Stress test automatici
| C1 | da fare | — | src/test/stressDataset.ts + budget performance |
| C2 | da fare | — | correttezza su tutto il dataset |
| C3 | da fare | — | corsie 48 presenti / 100 atleti |
| C4 | da fare | — | vista Piano atleta + CSV squadra |

## FASE D — Matrice collaudo
| D1 | da fare | — | scripts/qa/inventory.mjs + MATRICE-COLLAUDO.md |
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
