# Prova utente — FINPcoach QA (dataset stress-100)

Build: **FINPcoach QA** (icona con badge rosso "QA · dati simulati").
Tutti i nomi iniziano con `SIM-` e sono dati generati: nessun dato reale.
Password dei backup cifrati: **`qa-test-2026`**

Dataset caricato: 100 atleti simulati, 1 stagione, 48 presenti in vasca,
~14.900 sedute, ~4.900 tempi, 15 gare, 574 iscrizioni.

## 1. Controllo iniziale
- [ ] Apri l'app: compare la schermata Oggi senza errori né schemi bianchi.
- [ ] In alto c'è il badge rosso "QA · dati simulati" (solo nella build QA).
- [ ] Naviga Oggi → Vasca → Squadra → Piano → Dati & Backup: nessun crash.

## 2. Squadra
- [ ] Squadra mostra 100 atleti; cerca un cognome `SIM-` qualsiasi: la lista si filtra in tempo reale.
- [ ] Apri un atleta: dati, classi, tempi e storico si vedono senza errori.

## 3. Piano / Gare
- [ ] Piano → Programmazione: la stagione e i microcicli sono visibili.
- [ ] Piano → Parametri: modifica un parametro e torna indietro.
- [ ] Gare: l'elenco gare/iscrizioni si apre senza errori.

## 4. Regia
- [ ] Vasca → Regia: le corsie stanno dentro le schede (nessun controllo tagliato).
- [ ] I cognomi lunghi (`SIM-...`) sono leggibili su una o due righe, senza "…".
- [ ] Sposta un atleta con drag & drop o tocco lungo: la corsia si aggiorna.

## 5. Cronometro (48 atleti)
- [ ] Vasca → Cronometro: partenza generale, le 6 corsie e i 48 atleti sono visibili.
- [ ] Premi VIA: il tempo scorre, i tempi per atleta si aggiornano.
- [ ] Schermo ruotato orizzontale/verticale: layout leggibile.

## 6. Precisione
- [ ] Con il cronometro in corso, premi il tasto home per ~1 minuto e torna:
      il tempo continua senza salti evidenti.
- [ ] Se una partenza automatica era in attesa, l'atleta parte con il
      marcatore "↺" (partenza recuperata).

## 7. Interruzioni
- [ ] Con una seduta/cronometro attivo, chiudi e riapri l'app: lo stato è ripristinato.
- [ ] Blocca e sblocca lo schermo: l'app riprende senza crash.

## 8. Backup
- [ ] Dati & Backup → Esporta backup: salva il file (JSON o .finpbackup).
- [ ] Importa `stress-100.json` da Download (è in /sdcard/Download):
      l'importazione completa e i dati tornano a 100 atleti.
- [ ] Importa `stress-100-cifrato.finpbackup`: password `qa-test-2026`.

## 9. Biomeccanica / Fonti
- [ ] Dati & Backup → Biomeccanica & WPS: le schede si aprono.
- [ ] Altro → Fonti: l'elenco fonti/regolamenti si apre; cerca "tempo limite"
      e "partenza": escono risultati pertinenti.

## 10. Impostazioni di sistema
- [ ] Tema scuro/chiaro, dimensione font e animazioni: cambiale nelle
      impostazioni Android e verifica che l'app resti leggibile.
- [ ] Riserva batteria / sospensione schermo aggressiva: l'app non va in crash.

## Esito
Annota per ogni blocco: OK / PROBLEMA (con cosa hai fatto e cosa hai visto).
