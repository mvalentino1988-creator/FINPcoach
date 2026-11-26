# Inventario pulsanti — FINPcoach

Generato da scripts/qa/inventory-buttons.mjs il 2026-11-26: 337 occorrenze.

| # | File:riga | Schermata/file | Etichetta | Handler | Disabilitato | Distruttivo | Effetto atteso | Test | Verifica device | Esito |
|---|-----------|----------------|-----------|---------|-------------|-------------|---------------|------|----------------|------|
| 1 | src\App.tsx:147 | src\App.tsx | Chiudi avviso salvataggio | `() => setSaveErrorHidden(true)` |  | no | da validare | - | no | da verificare |
| 2 | src\components\atletaAssenzeSezione.tsx:56 | src\components\atletaAssenzeSezione.tsx | Elimina assenza | `() => onEliminaAssenza(a.id)` |  | si | da validare | - | no | da verificare |
| 3 | src\components\atletaAssenzeSezione.tsx:116 | src\components\atletaAssenzeSezione.tsx | type="button" | `() => {
              if (dalParsed && alParsed) {
       ` | si | no | da validare | - | no | da verificare |
| 4 | src\components\atletaDettaglioModal.tsx:140 | src\components\atletaDettaglioModal.tsx | type="button" | `() => setModificaOpen(true)` |  | no | da validare | - | no | da verificare |
| 5 | src\components\atletaDettaglioModal.tsx:148 | src\components\atletaDettaglioModal.tsx | Chiudi dettaglio atleta | `onChiudi` |  | no | da validare | - | no | da verificare |
| 6 | src\components\atletaDettaglioModal.tsx:278 | src\components\atletaDettaglioModal.tsx | type="button" | `() => applicaClassiStimate(analisi.stimaClassi)` |  | no | da validare | - | no | da verificare |
| 7 | src\components\atletaDettaglioModal.tsx:301 | src\components\atletaDettaglioModal.tsx | type="button" | `generaCodici` |  | no | da validare | - | no | da verificare |
| 8 | src\components\atletaDettaglioModal.tsx:309 | src\components\atletaDettaglioModal.tsx | type="button" | `() => setGestioneTempiOpen(true)` |  | no | da validare | - | no | da verificare |
| 9 | src\components\atletaDettaglioModal.tsx:367 | src\components\atletaDettaglioModal.tsx | Elimina condizione | `() => onEliminaCondizione(c.id)` |  | si | da validare | - | no | da verificare |
| 10 | src\components\atletaDettaglioModal.tsx:393 | src\components\atletaDettaglioModal.tsx | type="button" | `() => {
                    onAggiungiCondizione({
       ` | si | no | da validare | - | no | da verificare |
| 11 | src\components\atletaDettaglioModal.tsx:439 | src\components\atletaDettaglioModal.tsx | variant="secondary" | `() => setModificaOpen(true)` |  | no | da validare | - | no | da verificare |
| 12 | src\components\atletaDettaglioModal.tsx:446 | src\components\atletaDettaglioModal.tsx | variant="danger" | `() => {
                if (window.confirm(`Sei sicuro di v` |  | no | da validare | - | no | da verificare |
| 13 | src\components\atletaDettaglioModal.tsx:459 | src\components\atletaDettaglioModal.tsx | Chiudi | `onChiudi` |  | no | da validare | - | no | da verificare |
| 14 | src\components\atletiModali.tsx:81 | src\components\atletiModali.tsx | Annulla | `onAnnulla` |  | no | da validare | - | no | da verificare |
| 15 | src\components\atletiModali.tsx:198 | src\components\atletiModali.tsx | key= | `() => {
                    setCodiciEccezione(prev =>
   ` |  | no | da validare | - | no | da verificare |
| 16 | src\components\atletiModali.tsx:239 | src\components\atletiModali.tsx | Annulla | `onAnnulla` |  | no | da validare | - | no | da verificare |
| 17 | src\components\atletiModali.tsx:242 | src\components\atletiModali.tsx | Salva Atleta | `(submit)` | si | no | da validare | - | no | da verificare |
| 18 | src\components\atletiModali.tsx:305 | src\components\atletiModali.tsx | Chiudi | `onChiudi` |  | no | da validare | - | no | da verificare |
| 19 | src\components\atletiModali.tsx:364 | src\components\atletiModali.tsx | Aggiungi Tempo | `(submit)` | si | no | da validare | - | no | da verificare |
| 20 | src\components\atletiModali.tsx:388 | src\components\atletiModali.tsx | Elimina tempo | `() => onEliminaTempo(t.id)` |  | si | da validare | - | no | da verificare |
| 21 | src\components\atletiModali.tsx:402 | src\components\atletiModali.tsx | Chiudi | `onChiudi` |  | no | da validare | - | no | da verificare |
| 22 | src\components\AtletiScreen.tsx:192 | src\components\AtletiScreen.tsx | Ricarica telemetrie squadra | `() => window.location.reload()` |  | no | da validare | - | no | da verificare |
| 23 | src\components\AtletiScreen.tsx:213 | src\components\AtletiScreen.tsx | Nuovo Atleta | `() => setNuovoOpen(true)` |  | no | da validare | - | no | da verificare |
| 24 | src\components\AtletiScreen.tsx:268 | src\components\AtletiScreen.tsx | type="button" | `toggleCompatto` |  | no | da validare | - | no | da verificare |
| 25 | src\components\AtletiScreen.tsx:289 | src\components\AtletiScreen.tsx | key= | `() => setCategoriaFiltro(f.id)` |  | no | da validare | - | no | da verificare |
| 26 | src\components\BackupModal.tsx:370 | src\components\BackupModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 27 | src\components\BackupModal.tsx:405 | src\components\BackupModal.tsx | Attiva sincronizzazione cloud | `handleToggleSync` |  | no | da validare | - | no | da verificare |
| 28 | src\components\BackupModal.tsx:430 | src\components\BackupModal.tsx | onClick= | `handleLogout` |  | si | da validare | - | no | da verificare |
| 29 | src\components\BackupModal.tsx:440 | src\components\BackupModal.tsx | onClick={() => { | `() => {
                  if (!FirebaseSync.getCurrentUser(` | si | no | da validare | - | no | da verificare |
| 30 | src\components\BackupModal.tsx:516 | src\components\BackupModal.tsx | type="button" | `handlePulisciLog` |  | no | da validare | - | no | da verificare |
| 31 | src\components\BackupModal.tsx:534 | src\components\BackupModal.tsx | onClick= | `handleDownload` |  | no | da validare | - | no | da verificare |
| 32 | src\components\BackupModal.tsx:549 | src\components\BackupModal.tsx | onClick= } | `() => { setEncPass(''); setEncPass2(''); setEncPassErr(null)` |  | no | da validare | - | no | da verificare |
| 33 | src\components\BackupModal.tsx:571 | src\components\BackupModal.tsx | onClick= | `() => fileInputRef.current?.click()` |  | no | da validare | - | no | da verificare |
| 34 | src\components\BackupModal.tsx:587 | src\components\BackupModal.tsx | onClick= | `handleRipristinaSnapshot` |  | no | da validare | - | no | da verificare |
| 35 | src\components\BackupModal.tsx:605 | src\components\BackupModal.tsx | onClick= | `handleResetDemo` |  | si | da validare | - | no | da verificare |
| 36 | src\components\BackupModal.tsx:620 | src\components\BackupModal.tsx | onClick= | `handleClearSquad` |  | si | da validare | - | no | da verificare |
| 37 | src\components\BackupModal.tsx:640 | src\components\BackupModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 38 | src\components\BackupModal.tsx:654 | src\components\BackupModal.tsx | Annulla | `() => setPendingImport(null)` |  | no | da validare | - | no | da verificare |
| 39 | src\components\BackupModal.tsx:657 | src\components\BackupModal.tsx | Importa e sovrascrivi | `confermaImport` |  | no | da validare | - | no | da verificare |
| 40 | src\components\BackupModal.tsx:680 | src\components\BackupModal.tsx | Annulla | `() => setEncModalOpen(false)` |  | no | da validare | - | no | da verificare |
| 41 | src\components\BackupModal.tsx:683 | src\components\BackupModal.tsx | Esporta cifrato | `() => void handleDownloadCifrato()` |  | no | da validare | - | no | da verificare |
| 42 | src\components\BackupModal.tsx:725 | src\components\BackupModal.tsx | Annulla | `() => setPendingCipher(null)` |  | no | da validare | - | no | da verificare |
| 43 | src\components\BackupModal.tsx:728 | src\components\BackupModal.tsx | Decifra e importa | `() => void confermaDecifra()` |  | no | da validare | - | no | da verificare |
| 44 | src\components\BackupModal.tsx:759 | src\components\BackupModal.tsx | Chiudi | `() => setImportErrors(null)` |  | no | da validare | - | no | da verificare |
| 45 | src\components\BadgeCodice.tsx:30 | src\components\BadgeCodice.tsx | type="button" | `() => setModalOpen(true)` |  | no | da validare | - | no | da verificare |
| 46 | src\components\BadgeCodice.tsx:54 | src\components\BadgeCodice.tsx | Chiudi | `() => setModalOpen(false)` |  | no | da validare | - | no | da verificare |
| 47 | src\components\BadgeCodice.tsx:82 | src\components\BadgeCodice.tsx | type="button" | `() => setModalOpen(false)` |  | no | da validare | - | no | da verificare |
| 48 | src\components\BordoVascaScreen.tsx:53 | src\components\BordoVascaScreen.tsx | type="button" | `() => setVista('cronometro')` |  | no | da validare | - | no | da verificare |
| 49 | src\components\BordoVascaScreen.tsx:66 | src\components\BordoVascaScreen.tsx | type="button" | `() => setVista('regia')` |  | no | da validare | - | no | da verificare |
| 50 | src\components\CalendarioScreen.tsx:140 | src\components\CalendarioScreen.tsx | Aggiungi evento | `() => { setShowForm(v => !v); setMsg(null); ` |  | no | da validare | - | no | da verificare |
| 51 | src\components\CalendarioScreen.tsx:143 | src\components\CalendarioScreen.tsx | Importa calendario JSON | `() => fileRef.current?.click()` |  | no | da validare | - | no | da verificare |
| 52 | src\components\CalendarioScreen.tsx:160 | src\components\CalendarioScreen.tsx | Chiudi form evento | `() => setShowForm(false)` |  | no | da validare | - | no | da verificare |
| 53 | src\components\CalendarioScreen.tsx:178 | src\components\CalendarioScreen.tsx | )} | `submitManuale` |  | no | da validare | - | no | da verificare |
| 54 | src\components\CalendarioScreen.tsx:250 | src\components\CalendarioScreen.tsx | Rimuovi | `() => rimuovi(evento)` |  | si | da validare | - | no | da verificare |
| 55 | src\components\CalendarioScreen.tsx:255 | src\components\CalendarioScreen.tsx | type="button" | `() => aggiungi(evento)` | si | no | da validare | - | no | da verificare |
| 56 | src\components\CronometroLayout.tsx:92 | src\components\CronometroLayout.tsx | Ripartenza generale | `onOpenRipGlobal` |  | no | da validare | - | no | da verificare |
| 57 | src\components\CronometroLayout.tsx:107 | src\components\CronometroLayout.tsx | Ricarica composizione dalla Regia | `onReloadSync` |  | no | da validare | - | no | da verificare |
| 58 | src\components\CronometroLayout.tsx:119 | src\components\CronometroLayout.tsx | type="button" | `onFine` | si | si | da validare | - | no | da verificare |
| 59 | src\components\CronometroLayout.tsx:128 | src\components\CronometroLayout.tsx | Azzera sessione | `onRequestReset` |  | si | da validare | - | no | da verificare |
| 60 | src\components\CronometroLayout.tsx:160 | src\components\CronometroLayout.tsx | type="button" | `onReloadSync` |  | no | da validare | - | no | da verificare |
| 61 | src\components\CronometroLayout.tsx:167 | src\components\CronometroLayout.tsx | type="button" | `() => onOpenPicker(lanesVisibili[0])` |  | no | da validare | - | no | da verificare |
| 62 | src\components\CronometroLayout.tsx:187 | src\components\CronometroLayout.tsx | type="button" | `() => onOpenLaneSheet(lane)` |  | no | da validare | - | no | da verificare |
| 63 | src\components\CronometroLayout.tsx:228 | src\components\CronometroLayout.tsx | type="button" | `() => onOpenPicker(lane)` |  | no | da validare | - | no | da verificare |
| 64 | src\components\CronometroLayout.tsx:244 | src\components\CronometroLayout.tsx | type="button" | `() => onOpenPicker(lane)` |  | no | da validare | - | no | da verificare |
| 65 | src\components\CronometroLayout.tsx:257 | src\components\CronometroLayout.tsx | type="button" | `addLane` |  | no | da validare | - | no | da verificare |
| 66 | src\components\CronometroLayout.tsx:275 | src\components\CronometroLayout.tsx | type="button" | `onLapGenerale` |  | no | da validare | - | no | da verificare |
| 67 | src\components\CronometroLayout.tsx:282 | src\components\CronometroLayout.tsx | type="button" | `-` |  | no | da validare | - | no | da verificare |
| 68 | src\components\CronometroLayout.tsx:292 | src\components\CronometroLayout.tsx | type="button" | `onResume` |  | no | da validare | - | no | da verificare |
| 69 | src\components\CronometroLayout.tsx:300 | src\components\CronometroLayout.tsx | type="button" | `onVia` | si | no | da validare | - | no | da verificare |
| 70 | src\components\CronometroLayout.tsx:310 | src\components\CronometroLayout.tsx | Annulla ultima azione | `undo` | si | no | da validare | - | no | da verificare |
| 71 | src\components\cronometroParts.tsx:122 | src\components\cronometroParts.tsx | type="button" | `e => {
        e.stopPropagation();
        onToggleStop()` |  | si | da validare | - | no | da verificare |
| 72 | src\components\cronometroParts.tsx:303 | src\components\cronometroParts.tsx | onChange(Math.min(max, value + step))} className="w-12 h-12  | `() => onChange(Math.max(min, value - step))` |  | no | da validare | - | no | da verificare |
| 73 | src\components\cronometroParts.tsx:305 | src\components\cronometroParts.tsx | ); | `() => onChange(Math.min(max, value + step))` |  | no | da validare | - | no | da verificare |
| 74 | src\components\cronometroParts.tsx:314 | src\components\cronometroParts.tsx | type="button" | `() => onPick(null)` |  | no | da validare | - | no | da verificare |
| 75 | src\components\cronometroParts.tsx:323 | src\components\cronometroParts.tsx | key= | `() => onPick(v)` |  | no | da validare | - | no | da verificare |
| 76 | src\components\cronometroParts.tsx:339 | src\components\cronometroParts.tsx | Chiudi finestra | `onClose` |  | si | da validare | - | no | da verificare |
| 77 | src\components\cronometroParts.tsx:364 | src\components\cronometroParts.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 78 | src\components\cronometroParts.tsx:386 | src\components\cronometroParts.tsx | key= | `() => onAddAthlete(lane.numero, a)` |  | no | da validare | - | no | da verificare |
| 79 | src\components\cronometroParts.tsx:433 | src\components\cronometroParts.tsx | type="button" | `() => onRemoveLane(lane)` |  | no | da validare | - | no | da verificare |
| 80 | src\components\cronometroParts.tsx:493 | src\components\cronometroParts.tsx | type="button" | `() => onSetAthleteRip(laneNumero, athlete.id, null)` |  | no | da validare | - | no | da verificare |
| 81 | src\components\cronometroParts.tsx:504 | src\components\cronometroParts.tsx | onSetTargetLaps(laneNumero, athlete.id, (athlete.targetLaps  | `() => onSetTargetLaps(laneNumero, athlete.id, athlete.target` |  | no | da validare | - | no | da verificare |
| 82 | src\components\cronometroParts.tsx:506 | src\components\cronometroParts.tsx | {athlete.targetLaps != null && ( | `() => onSetTargetLaps(laneNumero, athlete.id, (athlete.targe` |  | no | da validare | - | no | da verificare |
| 83 | src\components\cronometroParts.tsx:508 | src\components\cronometroParts.tsx | )} | `() => onSetTargetLaps(laneNumero, athlete.id, null)` |  | no | da validare | - | no | da verificare |
| 84 | src\components\cronometroParts.tsx:514 | src\components\cronometroParts.tsx | onCorrectLap(laneNumero, athlete.id, -1000)} className="h-12 | `() => onCorrectLap(laneNumero, athlete.id, -5000)` | si | no | da validare | - | no | da verificare |
| 85 | src\components\cronometroParts.tsx:515 | src\components\cronometroParts.tsx | onCorrectLap(laneNumero, athlete.id, 1000)} className="h-12  | `() => onCorrectLap(laneNumero, athlete.id, -1000)` | si | no | da validare | - | no | da verificare |
| 86 | src\components\cronometroParts.tsx:516 | src\components\cronometroParts.tsx | onCorrectLap(laneNumero, athlete.id, 5000)} className="h-12  | `() => onCorrectLap(laneNumero, athlete.id, 1000)` | si | no | da validare | - | no | da verificare |
| 87 | src\components\cronometroParts.tsx:517 | src\components\cronometroParts.tsx | onCorrectLap(laneNumero, athlete.id, Number.MIN_SAFE_INTEGER | `() => onCorrectLap(laneNumero, athlete.id, 5000)` | si | no | da validare | - | no | da verificare |
| 88 | src\components\cronometroParts.tsx:518 | src\components\cronometroParts.tsx | (icona) | `() => onCorrectLap(laneNumero, athlete.id, Number.MIN_SAFE_I` | si | no | da validare | - | no | da verificare |
| 89 | src\components\cronometroParts.tsx:523 | src\components\cronometroParts.tsx | (icona) | `() => onToggleFermo(laneNumero, athlete.id)` |  | no | da validare | - | no | da verificare |
| 90 | src\components\cronometroParts.tsx:528 | src\components\cronometroParts.tsx | Rimuovi | `() => onRemoveAthlete(laneNumero, athlete.id)` |  | si | da validare | - | no | da verificare |
| 91 | src\components\cronometroParts.tsx:563 | src\components\cronometroParts.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 92 | src\components\cronometroParts.tsx:595 | src\components\cronometroParts.tsx | (icona) | `onSalva` | si | no | da validare | - | no | da verificare |
| 93 | src\components\cronometroParts.tsx:598 | src\components\cronometroParts.tsx | Copia testo | `onCopia` |  | no | da validare | - | no | da verificare |
| 94 | src\components\cronometroParts.tsx:602 | src\components\cronometroParts.tsx | Torna alla seduta | `onRiprendi` |  | no | da validare | - | no | da verificare |
| 95 | src\components\cronometroParts.tsx:606 | src\components\cronometroParts.tsx | Nuova sessione | `onNuovaSessione` |  | no | da validare | - | no | da verificare |
| 96 | src\components\CronometroVasca.tsx:887 | src\components\CronometroVasca.tsx | Chiudi finestra | `() => setConfirmReset(false)` |  | si | da validare | - | no | da verificare |
| 97 | src\components\CronometroVasca.tsx:892 | src\components\CronometroVasca.tsx | Azzera | `() => setConfirmReset(false)` |  | si | da validare | - | no | da verificare |
| 98 | src\components\CronometroVasca.tsx:893 | src\components\CronometroVasca.tsx | (icona) | `handleReset` |  | si | da validare | - | no | da verificare |
| 99 | src\components\CronometroVasca.tsx:906 | src\components\CronometroVasca.tsx | type="button" | `() => {
                  sessionStorage.setItem('finp_vasc` |  | no | da validare | - | no | da verificare |
| 100 | src\components\CronometroVasca.tsx:920 | src\components\CronometroVasca.tsx | type="button" | `() => {
                  sessionStorage.setItem('finp_vasc` |  | no | da validare | - | no | da verificare |
| 101 | src\components\CronometroVasca.tsx:943 | src\components\CronometroVasca.tsx | Chiudi finestra | `() => resolveOverride('keep')` |  | si | da validare | - | no | da verificare |
| 102 | src\components\CronometroVasca.tsx:950 | src\components\CronometroVasca.tsx | Mantieni | `() => resolveOverride('keep')` |  | no | da validare | - | no | da verificare |
| 103 | src\components\CronometroVasca.tsx:953 | src\components\CronometroVasca.tsx | Sovrascrivi | `() => resolveOverride('overwrite')` |  | no | da validare | - | no | da verificare |
| 104 | src\components\DatiScreen.tsx:127 | src\components\DatiScreen.tsx | type="button" | `() => setModalitaNuovoModal(true)` |  | no | da validare | - | no | da verificare |
| 105 | src\components\DatiScreen.tsx:166 | src\components\DatiScreen.tsx | type="button" | `() => setVistaSchede('calendario')` |  | no | da validare | - | no | da verificare |
| 106 | src\components\DatiScreen.tsx:176 | src\components\DatiScreen.tsx | type="button" | `() => setVistaSchede('lista')` |  | no | da validare | - | no | da verificare |
| 107 | src\components\DatiScreen.tsx:189 | src\components\DatiScreen.tsx | type="button" | `() => setCalendarioEspanso(v => !v)` |  | no | da validare | - | no | da verificare |
| 108 | src\components\DatiScreen.tsx:197 | src\components\DatiScreen.tsx | type="button" | `() => setModalitaNuovoModal(true)` |  | no | da validare | - | no | da verificare |
| 109 | src\components\DatiScreen.tsx:213 | src\components\DatiScreen.tsx | Settimana precedente | `() => {
                      const parsed = parseData(calen` |  | no | da validare | - | no | da verificare |
| 110 | src\components\DatiScreen.tsx:230 | src\components\DatiScreen.tsx | Settimana successiva | `() => {
                      const parsed = parseData(calen` |  | no | da validare | - | no | da verificare |
| 111 | src\components\DatiScreen.tsx:269 | src\components\DatiScreen.tsx | key= | `() => {
                            if (workoutGiorno) setSe` |  | no | da validare | - | no | da verificare |
| 112 | src\components\DatiScreen.tsx:304 | src\components\DatiScreen.tsx | Chiudi | `() => setEditMode(false)` |  | no | da validare | - | no | da verificare |
| 113 | src\components\DatiScreen.tsx:333 | src\components\DatiScreen.tsx | Salva Allenamento | `salvaAllenamento` |  | no | da validare | - | no | da verificare |
| 114 | src\components\DatiScreen.tsx:336 | src\components\DatiScreen.tsx | Annulla | `() => setEditMode(false)` |  | no | da validare | - | no | da verificare |
| 115 | src\components\DatiScreen.tsx:395 | src\components\DatiScreen.tsx | type="button" | `() => {
                  setModalitaNuovoModal(false);
    ` |  | no | da validare | - | no | da verificare |
| 116 | src\components\DatiScreen.tsx:412 | src\components\DatiScreen.tsx | type="button" | `() => {
                  setModalitaNuovoModal(false);
    ` |  | no | da validare | - | no | da verificare |
| 117 | src\components\DatiScreen.tsx:523 | src\components\DatiScreen.tsx | Indietro | `onIndietro` |  | no | da validare | - | no | da verificare |
| 118 | src\components\DatiScreen.tsx:598 | src\components\DatiScreen.tsx | className="flex-1" | `copia` |  | no | da validare | - | no | da verificare |
| 119 | src\components\ErrorBoundary.tsx:66 | src\components\ErrorBoundary.tsx | type="button" | `this.esportaDatiEmergenza` |  | no | da validare | - | no | da verificare |
| 120 | src\components\ErrorBoundary.tsx:74 | src\components\ErrorBoundary.tsx | type="button" | `() => {
                  sessionStorage.removeItem('finp_a` |  | no | da validare | - | no | da verificare |
| 121 | src\components\ErrorBoundary.tsx:84 | src\components\ErrorBoundary.tsx | type="button" | `() => window.location.reload()` |  | no | da validare | - | no | da verificare |
| 122 | src\components\EsercizioEditor.tsx:113 | src\components\EsercizioEditor.tsx | type="button" | `() => setMostraTemplate(!mostraTemplate)` |  | no | da validare | - | no | da verificare |
| 123 | src\components\EsercizioEditor.tsx:125 | src\components\EsercizioEditor.tsx | type="button" | `aggiungiEsercizio` |  | no | da validare | - | no | da verificare |
| 124 | src\components\EsercizioEditor.tsx:162 | src\components\EsercizioEditor.tsx | Elimina template | `(e) => {
                      e.stopPropagation();
        ` |  | si | da validare | - | no | da verificare |
| 125 | src\components\EsercizioEditor.tsx:200 | src\components\EsercizioEditor.tsx | Salva come template | `() => setSalvaComeTemplate(salvaComeTemplate === idx ? null ` |  | no | da validare | - | no | da verificare |
| 126 | src\components\EsercizioEditor.tsx:211 | src\components\EsercizioEditor.tsx | Elimina esercizio | `() => eliminaEsercizio(es.id)` |  | si | da validare | - | no | da verificare |
| 127 | src\components\EsercizioEditor.tsx:232 | src\components\EsercizioEditor.tsx | type="button" | `() => salvaComeTemplateClick(idx)` |  | no | da validare | - | no | da verificare |
| 128 | src\components\EsercizioEditor.tsx:311 | src\components\EsercizioEditor.tsx | key= | `() => toggleAttrezzo(es.id, att)` |  | no | da validare | - | no | da verificare |
| 129 | src\components\EsercizioEditor.tsx:374 | src\components\EsercizioEditor.tsx | type="button" | `handleSalva` | si | no | da validare | - | no | da verificare |
| 130 | src\components\EsercizioEditor.tsx:383 | src\components\EsercizioEditor.tsx | type="button" | `onAnnulla` |  | no | da validare | - | no | da verificare |
| 131 | src\components\FontiScreen.tsx:63 | src\components\FontiScreen.tsx | Verifica aggiornamenti | `handleVerificaOra` | si | no | da validare | - | no | da verificare |
| 132 | src\components\GeneraSchedaIAModal.tsx:171 | src\components\GeneraSchedaIAModal.tsx | Configurazione IA | `() => setMostraConfig(!mostraConfig)` |  | no | da validare | - | no | da verificare |
| 133 | src\components\GeneraSchedaIAModal.tsx:174 | src\components\GeneraSchedaIAModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 134 | src\components\GeneraSchedaIAModal.tsx:213 | src\components\GeneraSchedaIAModal.tsx | type="button" | `() => setMostraApiKey(!mostraApiKey)` |  | no | da validare | - | no | da verificare |
| 135 | src\components\GeneraSchedaIAModal.tsx:222 | src\components\GeneraSchedaIAModal.tsx | Rimuovi chiave API | `() => setConfig({ ...config, apiKey: '' ` |  | si | da validare | - | no | da verificare |
| 136 | src\components\GeneraSchedaIAModal.tsx:247 | src\components\GeneraSchedaIAModal.tsx | Salva configurazione | `salvaConfig` |  | no | da validare | - | no | da verificare |
| 137 | src\components\GeneraSchedaIAModal.tsx:258 | src\components\GeneraSchedaIAModal.tsx | Copia prompt | `copiaPrompt` |  | no | da validare | - | no | da verificare |
| 138 | src\components\GeneraSchedaIAModal.tsx:261 | src\components\GeneraSchedaIAModal.tsx | Apri IA web | `apriWeb` |  | no | da validare | - | no | da verificare |
| 139 | src\components\GeneraSchedaIAModal.tsx:275 | src\components\GeneraSchedaIAModal.tsx | type="button" | `generaConAPI` | si | no | da validare | - | no | da verificare |
| 140 | src\components\GeneraSchedaIAModal.tsx:284 | src\components\GeneraSchedaIAModal.tsx | (icona) | `apriWeb` |  | no | da validare | - | no | da verificare |
| 141 | src\components\GeneraSchedaIAModal.tsx:319 | src\components\GeneraSchedaIAModal.tsx | type="button" | `usaTestoIA` | si | no | da validare | - | no | da verificare |
| 142 | src\components\IscrittiGaraPanel.tsx:114 | src\components\IscrittiGaraPanel.tsx | type="button" | `() => setOpen(v => !v)` |  | no | da validare | - | no | da verificare |
| 143 | src\components\IscrittiGaraPanel.tsx:173 | src\components\IscrittiGaraPanel.tsx | type="button" | `() => rimuoviEvento(iscr, idx)` |  | si | da validare | - | no | da verificare |
| 144 | src\components\IscrittiGaraPanel.tsx:199 | src\components\IscrittiGaraPanel.tsx | Rimuovi iscrizione | `() => {
                            if (window.confirm(`Rim` |  | si | da validare | - | no | da verificare |
| 145 | src\components\IscrittiGaraPanel.tsx:228 | src\components\IscrittiGaraPanel.tsx | type="button" | `() => aggiungiEvento(iscr)` | si | no | da validare | - | no | da verificare |
| 146 | src\components\IscrittiGaraPanel.tsx:276 | src\components\IscrittiGaraPanel.tsx | key= | `() => toggleEvento(chiave)` |  | no | da validare | - | no | da verificare |
| 147 | src\components\IscrittiGaraPanel.tsx:293 | src\components\IscrittiGaraPanel.tsx | type="button" | `confermaIscrizione` | si | no | da validare | - | no | da verificare |
| 148 | src\components\LoginScreen.tsx:90 | src\components\LoginScreen.tsx | onClick= | `onSkip` |  | no | da validare | - | no | da verificare |
| 149 | src\components\LoginScreen.tsx:142 | src\components\LoginScreen.tsx | type="button" | `() => { setIsRegistering(false); setError(null); ` |  | no | da validare | - | no | da verificare |
| 150 | src\components\LoginScreen.tsx:153 | src\components\LoginScreen.tsx | type="button" | `() => { setIsRegistering(true); setError(null); ` |  | no | da validare | - | no | da verificare |
| 151 | src\components\LoginScreen.tsx:167 | src\components\LoginScreen.tsx | type="button" | `async () => {
                  setLoading(true); setError(` | si | no | da validare | - | no | da verificare |
| 152 | src\components\LoginScreen.tsx:238 | src\components\LoginScreen.tsx | type="button" | `() => setShowPassword(!showPassword)` |  | no | da validare | - | no | da verificare |
| 153 | src\components\LoginScreen.tsx:268 | src\components\LoginScreen.tsx | type="submit" | `(submit)` | si | no | da validare | - | no | da verificare |
| 154 | src\components\LoginScreen.tsx:286 | src\components\LoginScreen.tsx | type="button" | `() => { setIsRegistering(!isRegistering); setError(null); ` |  | no | da validare | - | no | da verificare |
| 155 | src\components\LoginScreen.tsx:297 | src\components\LoginScreen.tsx | onClick= | `onSkip` |  | no | da validare | - | no | da verificare |
| 156 | src\components\Navbar.tsx:98 | src\components\Navbar.tsx | key= | `() => vai(key)` |  | no | da validare | - | no | da verificare |
| 157 | src\components\Navbar.tsx:130 | src\components\Navbar.tsx | type="button" | `() => vai('oggi')` |  | no | da validare | - | no | da verificare |
| 158 | src\components\Navbar.tsx:152 | src\components\Navbar.tsx | (icona) | `() => setBackupOpen(true)` |  | no | da validare | - | no | da verificare |
| 159 | src\components\Navbar.tsx:156 | src\components\Navbar.tsx | (icona) | `() => setAspettoOpen(true)` |  | no | da validare | - | no | da verificare |
| 160 | src\components\Navbar.tsx:171 | src\components\Navbar.tsx | type="button" | `() => vai('oggi')` |  | no | da validare | - | no | da verificare |
| 161 | src\components\Navbar.tsx:198 | src\components\Navbar.tsx | Aspetto | `() => setAspettoOpen(true)` |  | no | da validare | - | no | da verificare |
| 162 | src\components\Navbar.tsx:206 | src\components\Navbar.tsx | Backup e dati | `() => setBackupOpen(true)` |  | no | da validare | - | no | da verificare |
| 163 | src\components\Navbar.tsx:234 | src\components\Navbar.tsx | Chiudi finestra | `() => setAspettoOpen(false)` |  | si | da validare | - | no | da verificare |
| 164 | src\components\Navbar.tsx:244 | src\components\Navbar.tsx | Chiudi | `() => setAspettoOpen(false)` |  | no | da validare | - | no | da verificare |
| 165 | src\components\Navbar.tsx:257 | src\components\Navbar.tsx | key= | `() => setThemeMode(item.id)` |  | no | da validare | - | no | da verificare |
| 166 | src\components\Navbar.tsx:291 | src\components\Navbar.tsx | Chiudi | `() => setAspettoOpen(false)` |  | no | da validare | - | no | da verificare |
| 167 | src\components\OcrGaraModal.tsx:76 | src\components\OcrGaraModal.tsx | Chiudi | `onCancel` |  | no | da validare | - | no | da verificare |
| 168 | src\components\OcrGaraModal.tsx:84 | src\components\OcrGaraModal.tsx | type="button" | `() => setModoTesto(false)` |  | no | da validare | - | no | da verificare |
| 169 | src\components\OcrGaraModal.tsx:91 | src\components\OcrGaraModal.tsx | type="button" | `() => setModoTesto(true)` |  | no | da validare | - | no | da verificare |
| 170 | src\components\OcrGaraModal.tsx:100 | src\components\OcrGaraModal.tsx | type="button" | `handleRicalcolaDaTesto` |  | no | da validare | - | no | da verificare |
| 171 | src\components\OcrGaraModal.tsx:186 | src\components\OcrGaraModal.tsx | Elimina riga | `() => handleEliminaRiga(r.id)` |  | si | da validare | - | no | da verificare |
| 172 | src\components\OcrGaraModal.tsx:205 | src\components\OcrGaraModal.tsx | type="button" | `handleConferma` |  | no | da validare | - | no | da verificare |
| 173 | src\components\OcrGaraModal.tsx:213 | src\components\OcrGaraModal.tsx | type="button" | `onCancel` |  | no | da validare | - | no | da verificare |
| 174 | src\components\OcrPreviewModal.tsx:43 | src\components\OcrPreviewModal.tsx | Chiudi anteprima OCR | `onCancel` |  | no | da validare | - | no | da verificare |
| 175 | src\components\OcrPreviewModal.tsx:86 | src\components\OcrPreviewModal.tsx | type="button" | `() => onConfirm(text)` |  | no | da validare | - | no | da verificare |
| 176 | src\components\OcrPreviewModal.tsx:94 | src\components\OcrPreviewModal.tsx | type="button" | `onCancel` |  | no | da validare | - | no | da verificare |
| 177 | src\components\OggiScreen.tsx:93 | src\components\OggiScreen.tsx | (icona) | `() => vai('altro', 'piano')` |  | no | da validare | - | no | da verificare |
| 178 | src\components\OggiScreen.tsx:97 | src\components\OggiScreen.tsx | (icona) | `() => vai('squadra')` |  | no | da validare | - | no | da verificare |
| 179 | src\components\OggiScreen.tsx:355 | src\components\OggiScreen.tsx | type="button" | `() => window.dispatchEvent(new Event('finp:open-backup'))` |  | no | da validare | - | no | da verificare |
| 180 | src\components\OggiScreen.tsx:423 | src\components\OggiScreen.tsx | type="button" | `() => vai('vasca')` |  | no | da validare | - | no | da verificare |
| 181 | src\components\OggiScreen.tsx:433 | src\components\OggiScreen.tsx | type="button" | `() => setModalParametriOpen(true)` |  | no | da validare | - | no | da verificare |
| 182 | src\components\OggiScreen.tsx:441 | src\components\OggiScreen.tsx | type="button" | `() => setModalIAOpen(true)` |  | no | da validare | - | no | da verificare |
| 183 | src\components\OggiScreen.tsx:455 | src\components\OggiScreen.tsx | type="button" | `() => setAttenzioniOpen(v => !v)` |  | no | da validare | - | no | da verificare |
| 184 | src\components\OggiScreen.tsx:531 | src\components\OggiScreen.tsx | type="button" | `() => setActivePopup('squadra')` |  | no | da validare | - | no | da verificare |
| 185 | src\components\OggiScreen.tsx:541 | src\components\OggiScreen.tsx | type="button" | `() => setActivePopup('carico')` |  | no | da validare | - | no | da verificare |
| 186 | src\components\OggiScreen.tsx:551 | src\components\OggiScreen.tsx | type="button" | `() => setActivePopup('gare')` |  | no | da validare | - | no | da verificare |
| 187 | src\components\OggiScreen.tsx:565 | src\components\OggiScreen.tsx | Chiudi finestra | `() => setActivePopup(null)` |  | si | da validare | - | no | da verificare |
| 188 | src\components\OggiScreen.tsx:569 | src\components\OggiScreen.tsx | (icona) | `() => setActivePopup(null)` |  | no | da validare | - | no | da verificare |
| 189 | src\components\OggiScreen.tsx:581 | src\components\OggiScreen.tsx | Gestisci Squadra Completa | `() => { setActivePopup(null); vai('squadra'); ` |  | no | da validare | - | no | da verificare |
| 190 | src\components\OggiScreen.tsx:590 | src\components\OggiScreen.tsx | Chiudi finestra | `() => setActivePopup(null)` |  | si | da validare | - | no | da verificare |
| 191 | src\components\OggiScreen.tsx:594 | src\components\OggiScreen.tsx | (icona) | `() => setActivePopup(null)` |  | no | da validare | - | no | da verificare |
| 192 | src\components\OggiScreen.tsx:605 | src\components\OggiScreen.tsx | Vedi Piano Microciclo | `() => { setActivePopup(null); vai('altro', 'piano'); ` |  | no | da validare | - | no | da verificare |
| 193 | src\components\OggiScreen.tsx:614 | src\components\OggiScreen.tsx | Chiudi finestra | `() => setActivePopup(null)` |  | si | da validare | - | no | da verificare |
| 194 | src\components\OggiScreen.tsx:618 | src\components\OggiScreen.tsx | (icona) | `() => setActivePopup(null)` |  | no | da validare | - | no | da verificare |
| 195 | src\components\OggiScreen.tsx:633 | src\components\OggiScreen.tsx | Vedi gare in Piano | `() => { setActivePopup(null); vai('altro', 'piano'); ` |  | no | da validare | - | no | da verificare |
| 196 | src\components\OggiScreen.tsx:690 | src\components\OggiScreen.tsx | Chiudi finestra | `() => setModalEsercizioOpen(false)` |  | si | da validare | - | no | da verificare |
| 197 | src\components\OnboardingModal.tsx:49 | src\components\OnboardingModal.tsx | key= | `() => setSelectedTheme(item.id)` |  | no | da validare | - | no | da verificare |
| 198 | src\components\OnboardingModal.tsx:67 | src\components\OnboardingModal.tsx | type="button" | `handleSave` |  | no | da validare | - | no | da verificare |
| 199 | src\components\ParametriSedutaModal.tsx:95 | src\components\ParametriSedutaModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 200 | src\components\ParametriSedutaModal.tsx:108 | src\components\ParametriSedutaModal.tsx | key= | `() => setVasca(v)` |  | no | da validare | - | no | da verificare |
| 201 | src\components\ParametriSedutaModal.tsx:141 | src\components\ParametriSedutaModal.tsx | key= | `() => setDurata(d)` |  | no | da validare | - | no | da verificare |
| 202 | src\components\ParametriSedutaModal.tsx:193 | src\components\ParametriSedutaModal.tsx | type="button" | `() => { onApplicaOggi(nuoviParametri); onClose(); ` |  | no | da validare | - | no | da verificare |
| 203 | src\components\ParametriSedutaModal.tsx:200 | src\components\ParametriSedutaModal.tsx | type="button" | `() => { onApplicaGiorno(nuoviParametri); onClose(); ` |  | no | da validare | - | no | da verificare |
| 204 | src\components\ParametriSedutaModal.tsx:210 | src\components\ParametriSedutaModal.tsx | type="button" | `() => { onRimuoviOverride(); onClose(); ` |  | si | da validare | - | no | da verificare |
| 205 | src\components\ParaSwimmingAnalyticsView.tsx:325 | src\components\ParaSwimmingAnalyticsView.tsx | type="submit" | `(submit)` | si | no | da validare | - | no | da verificare |
| 206 | src\components\PianoAtletaPanel.tsx:85 | src\components\PianoAtletaPanel.tsx | type="button" | `stampa` |  | no | da validare | - | no | da verificare |
| 207 | src\components\PianoAtletaPanel.tsx:92 | src\components\PianoAtletaPanel.tsx | type="button" | `esportaCsv` |  | no | da validare | - | no | da verificare |
| 208 | src\components\pianoModali.tsx:121 | src\components\pianoModali.tsx | type="button" | `() => {
              const ini = parseData(inizioStagione)` |  | no | da validare | - | no | da verificare |
| 209 | src\components\pianoModali.tsx:186 | src\components\pianoModali.tsx | Chiudi | `onChiudi` |  | no | da validare | - | no | da verificare |
| 210 | src\components\pianoModali.tsx:199 | src\components\pianoModali.tsx | key= | `() => setTipo(t)` |  | no | da validare | - | no | da verificare |
| 211 | src\components\pianoModali.tsx:296 | src\components\pianoModali.tsx | type="button" | `() => onSblocca(micro)` |  | no | da validare | - | no | da verificare |
| 212 | src\components\pianoModali.tsx:308 | src\components\pianoModali.tsx | type="button" | `onChiudi` |  | no | da validare | - | no | da verificare |
| 213 | src\components\pianoModali.tsx:315 | src\components\pianoModali.tsx | type="button" | `() => {
                onSalva({
                  ...mic` | si | no | da validare | - | no | da verificare |
| 214 | src\components\pianoOverlayModals.tsx:42 | src\components\pianoOverlayModals.tsx | Chiudi | `() => setEvento(null)` |  | no | da validare | - | no | da verificare |
| 215 | src\components\pianoOverlayModals.tsx:107 | src\components\pianoOverlayModals.tsx | type="button" | `() => {
              const d1 = parseData(evento.dal);
  ` |  | no | da validare | - | no | da verificare |
| 216 | src\components\pianoOverlayModals.tsx:139 | src\components\pianoOverlayModals.tsx | type="button" | `() => setEvento(null)` |  | no | da validare | - | no | da verificare |
| 217 | src\components\pianoOverlayModals.tsx:176 | src\components\pianoOverlayModals.tsx | Chiudi | `onChiudi` |  | no | da validare | - | no | da verificare |
| 218 | src\components\pianoOverlayModals.tsx:189 | src\components\pianoOverlayModals.tsx | key= | `() => setNumCorsie(n)` |  | no | da validare | - | no | da verificare |
| 219 | src\components\pianoOverlayModals.tsx:213 | src\components\pianoOverlayModals.tsx | key= | `() => onTogglePresente(a.id)` |  | no | da validare | - | no | da verificare |
| 220 | src\components\pianoOverlayModals.tsx:264 | src\components\pianoOverlayModals.tsx | type="button" | `onChiudi` |  | no | da validare | - | no | da verificare |
| 221 | src\components\PianoScreen.tsx:218 | src\components\PianoScreen.tsx | onClick= | `() => setModalParametriPianoOpen(true)` |  | no | da validare | - | no | da verificare |
| 222 | src\components\PianoScreen.tsx:227 | src\components\PianoScreen.tsx | onClick={() => { | `() => {
                if (stagione) {
                  ` |  | no | da validare | - | no | da verificare |
| 223 | src\components\PianoScreen.tsx:245 | src\components\PianoScreen.tsx | type="button" | `() => setMenuAltroOpen(v => !v)` |  | no | da validare | - | no | da verificare |
| 224 | src\components\PianoScreen.tsx:258 | src\components\PianoScreen.tsx | Chiudi menu | `() => setMenuAltroOpen(false)` |  | no | da validare | - | no | da verificare |
| 225 | src\components\PianoScreen.tsx:265 | src\components\PianoScreen.tsx | type="button" | `() => { setMenuAltroOpen(false); setArchiviaConferma(false);` |  | si | da validare | - | no | da verificare |
| 226 | src\components\PianoScreen.tsx:274 | src\components\PianoScreen.tsx | type="button" | `() => {
                        setMenuAltroOpen(false);
 ` |  | no | da validare | - | no | da verificare |
| 227 | src\components\PianoScreen.tsx:304 | src\components\PianoScreen.tsx | type="button" | `() => setVistaPiano('parametri')` |  | no | da validare | - | no | da verificare |
| 228 | src\components\PianoScreen.tsx:316 | src\components\PianoScreen.tsx | type="button" | `() => setVistaPiano('programmazione')` |  | no | da validare | - | no | da verificare |
| 229 | src\components\PianoScreen.tsx:356 | src\components\PianoScreen.tsx | Chiudi modifica date stagione | `() => setModificaDateOpen(false)` |  | no | da validare | - | no | da verificare |
| 230 | src\components\PianoScreen.tsx:410 | src\components\PianoScreen.tsx | type="button" | `() => setModificaDateOpen(false)` |  | no | da validare | - | no | da verificare |
| 231 | src\components\PianoScreen.tsx:417 | src\components\PianoScreen.tsx | type="button" | `() => {
                  const pInizio = parseData(modIniz` |  | no | da validare | - | no | da verificare |
| 232 | src\components\PianoScreen.tsx:485 | src\components\PianoScreen.tsx | type="button" | `() => salvaImpostazioni({ ...impostazioni, giorni: undefined` |  | si | da validare | - | no | da verificare |
| 233 | src\components\PianoScreen.tsx:499 | src\components\PianoScreen.tsx | key= | `() => {
                      const current = parametriEffe` |  | no | da validare | - | no | da verificare |
| 234 | src\components\PianoScreen.tsx:565 | src\components\PianoScreen.tsx | key= | `() => impostaParametriGiorno(dow, { ...p, vascaMetri: v ` |  | no | da validare | - | no | da verificare |
| 235 | src\components\PianoScreen.tsx:597 | src\components\PianoScreen.tsx | key= | `() => impostaParametriGiorno(dow, { ...p, numeroCorsie: n ` |  | no | da validare | - | no | da verificare |
| 236 | src\components\PianoScreen.tsx:618 | src\components\PianoScreen.tsx | key= | `() => {
                                const nextList = is` |  | no | da validare | - | no | da verificare |
| 237 | src\components\PianoScreen.tsx:724 | src\components\PianoScreen.tsx | type="button" | `() => {
                salvaImpostazioni({
              ` |  | no | da validare | - | no | da verificare |
| 238 | src\components\PianoScreen.tsx:738 | src\components\PianoScreen.tsx | type="button" | `rigeneraPianoCompleto` |  | no | da validare | - | no | da verificare |
| 239 | src\components\PianoScreen.tsx:768 | src\components\PianoScreen.tsx | type="button" | `() => {
                if (macroCorrente) {
             ` |  | no | da validare | - | no | da verificare |
| 240 | src\components\PianoScreen.tsx:782 | src\components\PianoScreen.tsx | type="button" | `() => setEspandiTutti(!espandiTutti)` |  | no | da validare | - | no | da verificare |
| 241 | src\components\PianoScreen.tsx:880 | src\components\PianoScreen.tsx | key= | `() => {
                        setSelectedMacroId(ma.id);` |  | no | da validare | - | no | da verificare |
| 242 | src\components\PianoScreen.tsx:933 | src\components\PianoScreen.tsx | key= | `() => setSelectedMesoId(me.id)` |  | no | da validare | - | no | da verificare |
| 243 | src\components\PianoScreen.tsx:1018 | src\components\PianoScreen.tsx | key= | `() => focusMicro(mi.id)` |  | no | da validare | - | no | da verificare |
| 244 | src\components\PianoScreen.tsx:1205 | src\components\PianoScreen.tsx | type="button" | `() => setMicroSelezionato(mi)` |  | no | da validare | - | no | da verificare |
| 245 | src\components\PianoScreen.tsx:1326 | src\components\PianoScreen.tsx | type="button" | `() => setMicroSelezionato(mi)` |  | no | da validare | - | no | da verificare |
| 246 | src\components\PianoScreen.tsx:1436 | src\components\PianoScreen.tsx | Chiudi archiviazione stagione | `() => setArchiviaOpen(false)` |  | si | da validare | - | no | da verificare |
| 247 | src\components\PianoScreen.tsx:1475 | src\components\PianoScreen.tsx | type="button" | `() => { setArchiviaConferma(false); setArchiviaOpen(false); ` |  | si | da validare | - | no | da verificare |
| 248 | src\components\PianoScreen.tsx:1482 | src\components\PianoScreen.tsx | type="button" | `async () => {
                    if (!archiviaConferma) {` | si | si | da validare | - | no | da verificare |
| 249 | src\components\RecordScreen.tsx:42 | src\components\RecordScreen.tsx | key= | `() => onChange(o.value)` |  | no | da validare | - | no | da verificare |
| 250 | src\components\RecordScreen.tsx:156 | src\components\RecordScreen.tsx | type="button" | `() => setRecordInfo(r)` |  | no | da validare | - | no | da verificare |
| 251 | src\components\RecordScreen.tsx:409 | src\components\RecordScreen.tsx | type="button" | `() => setRecordInfo(record)` |  | no | da validare | - | no | da verificare |
| 252 | src\components\RegiaCorsiaCard.tsx:80 | src\components\RegiaCorsiaCard.tsx | Diminuisci ripartenza corsia | `() => update(a => impostaRipartenzaCorsia(a, c.numero, secon` | si | no | da validare | - | no | da verificare |
| 253 | src\components\RegiaCorsiaCard.tsx:90 | src\components\RegiaCorsiaCard.tsx | Aumenta ripartenza corsia | `() => update(a => impostaRipartenzaCorsia(a, c.numero, secon` | si | no | da validare | - | no | da verificare |
| 254 | src\components\RegiaCorsiaCard.tsx:98 | src\components\RegiaCorsiaCard.tsx | Ripartenza corsia ereditata | `() => update(a => impostaRipartenzaCorsia(a, c.numero, null)` | si | no | da validare | - | no | da verificare |
| 255 | src\components\RegiaCorsiaCard.tsx:108 | src\components\RegiaCorsiaCard.tsx | type="button" | `() => {
                const opts: (number | null)[] = [nu` | si | no | da validare | - | no | da verificare |
| 256 | src\components\RegiaCorsiaCard.tsx:125 | src\components\RegiaCorsiaCard.tsx | type="button" | `() => update(a => impostaBloccoCorsia(a, c.numero, !c.blocca` |  | no | da validare | - | no | da verificare |
| 257 | src\components\RegiaCorsiaCard.tsx:194 | src\components\RegiaCorsiaCard.tsx | type="button" | `e => {
                        e.stopPropagation();
      ` |  | si | da validare | - | no | da verificare |
| 258 | src\components\RegiaNonAssegnati.tsx:62 | src\components\RegiaNonAssegnati.tsx | key= | `() => onTapAtleta(a.id)` | si | no | da validare | - | no | da verificare |
| 259 | src\components\RegiaNonAssegnati.tsx:101 | src\components\RegiaNonAssegnati.tsx | type="button" | `onToggleNonPresenti` |  | no | da validare | - | no | da verificare |
| 260 | src\components\RegiaNonAssegnati.tsx:115 | src\components\RegiaNonAssegnati.tsx | key= | `() => onTogglePresente(a.id)` | si | no | da validare | - | no | da verificare |
| 261 | src\components\RegiaSheetAtleta.tsx:32 | src\components\RegiaSheetAtleta.tsx | Chiudi finestra | `onClose` |  | si | da validare | - | no | da verificare |
| 262 | src\components\RegiaSheetAtleta.tsx:44 | src\components\RegiaSheetAtleta.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 263 | src\components\RegiaSheetAtleta.tsx:63 | src\components\RegiaSheetAtleta.tsx | key= | `() => {
                  if (!attiva) update(a => assegnaA` | si | no | da validare | - | no | da verificare |
| 264 | src\components\RegiaSheetAtleta.tsx:90 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => update(a => scambiaConAdiacente(a, corsia.numero, atle` | si | no | da validare | - | no | da verificare |
| 265 | src\components\RegiaSheetAtleta.tsx:98 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => update(a => scambiaConAdiacente(a, corsia.numero, atle` | si | no | da validare | - | no | da verificare |
| 266 | src\components\RegiaSheetAtleta.tsx:118 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => {
                  const cur = corrente.ripartenzeAt` | si | no | da validare | - | no | da verificare |
| 267 | src\components\RegiaSheetAtleta.tsx:132 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => {
                  const cur = corrente.ripartenzeAt` | si | no | da validare | - | no | da verificare |
| 268 | src\components\RegiaSheetAtleta.tsx:142 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => update(a => impostaRipartenzaAtleta(a, atleta.id, null` | si | no | da validare | - | no | da verificare |
| 269 | src\components\RegiaSheetAtleta.tsx:156 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => {
                update(a => rimuoviDaCorsia(a, atle` | si | si | da validare | - | no | da verificare |
| 270 | src\components\RegiaSheetAtleta.tsx:174 | src\components\RegiaSheetAtleta.tsx | type="button" | `() => {
              onTogglePresente(atleta.id);
       ` | si | no | da validare | - | no | da verificare |
| 271 | src\components\RegiaTecnicaCorsie.tsx:284 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `stampa` |  | no | da validare | - | no | da verificare |
| 272 | src\components\RegiaTecnicaCorsie.tsx:302 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => vaiAVistaVasca('cronometro')` |  | no | da validare | - | no | da verificare |
| 273 | src\components\RegiaTecnicaCorsie.tsx:319 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `ripristinaPrecedente` |  | no | da validare | - | no | da verificare |
| 274 | src\components\RegiaTecnicaCorsie.tsx:326 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => setPrecedente(null)` |  | no | da validare | - | no | da verificare |
| 275 | src\components\RegiaTecnicaCorsie.tsx:341 | src\components\RegiaTecnicaCorsie.tsx | Riduci corsie | `() => cambiaNumeroCorsie(-1)` | si | no | da validare | - | no | da verificare |
| 276 | src\components\RegiaTecnicaCorsie.tsx:353 | src\components\RegiaTecnicaCorsie.tsx | Aumenta corsie | `() => cambiaNumeroCorsie(1)` | si | no | da validare | - | no | da verificare |
| 277 | src\components\RegiaTecnicaCorsie.tsx:365 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => update(a => applicaSuggerimento(a, atleti, tempi))` | si | no | da validare | - | no | da verificare |
| 278 | src\components\RegiaTecnicaCorsie.tsx:373 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => setConfermaSvuota(true)` | si | si | da validare | - | no | da verificare |
| 279 | src\components\RegiaTecnicaCorsie.tsx:385 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => setIntensitaAperta(v => !v)` |  | no | da validare | - | no | da verificare |
| 280 | src\components\RegiaTecnicaCorsie.tsx:458 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => vaiAVistaVasca('cronometro')` | si | no | da validare | - | no | da verificare |
| 281 | src\components\RegiaTecnicaCorsie.tsx:472 | src\components\RegiaTecnicaCorsie.tsx | Chiudi finestra | `() => setConfermaSvuota(false)` |  | si | da validare | - | no | da verificare |
| 282 | src\components\RegiaTecnicaCorsie.tsx:479 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => setConfermaSvuota(false)` |  | si | da validare | - | no | da verificare |
| 283 | src\components\RegiaTecnicaCorsie.tsx:486 | src\components\RegiaTecnicaCorsie.tsx | type="button" | `() => {
                  update(a => svuotaCorsie(a));
  ` |  | si | da validare | - | no | da verificare |
| 284 | src\components\RegistroScreen.tsx:201 | src\components\RegistroScreen.tsx | type="button" | `() => {
                const d = dataParsed ?? todayISO();` |  | no | da validare | - | no | da verificare |
| 285 | src\components\RegistroScreen.tsx:271 | src\components\RegistroScreen.tsx | type="button" | `() => {
                        setRighe(prev => ({
      ` |  | no | da validare | - | no | da verificare |
| 286 | src\components\RegistroScreen.tsx:311 | src\components\RegistroScreen.tsx | Diminuisci RPE | `() => setRpe(rpeNum - 1)` |  | no | da validare | - | no | da verificare |
| 287 | src\components\RegistroScreen.tsx:323 | src\components\RegistroScreen.tsx | Aumenta RPE | `() => setRpe(rpeNum + 1)` |  | no | da validare | - | no | da verificare |
| 288 | src\components\RegistroScreen.tsx:348 | src\components\RegistroScreen.tsx | onClick= | `handleSalvaSeduta` | si | no | da validare | - | no | da verificare |
| 289 | src\components\RegistroScreen.tsx:370 | src\components\RegistroScreen.tsx | key= | `() => setAtletaSelId(a.id)` |  | no | da validare | - | no | da verificare |
| 290 | src\components\RegistroScreen.tsx:407 | src\components\RegistroScreen.tsx | key= | `() => setAtletaSelId(a.id)` |  | no | da validare | - | no | da verificare |
| 291 | src\components\registroSezioni.tsx:96 | src\components\registroSezioni.tsx | key= | `() => setStile(s)` |  | no | da validare | - | no | da verificare |
| 292 | src\components\registroSezioni.tsx:113 | src\components\registroSezioni.tsx | key= | `() => setContesto(c)` |  | no | da validare | - | no | da verificare |
| 293 | src\components\registroSezioni.tsx:128 | src\components\registroSezioni.tsx | key= | `() => setVasca(v)` |  | no | da validare | - | no | da verificare |
| 294 | src\components\registroSezioni.tsx:150 | src\components\registroSezioni.tsx | type="submit" | `(submit)` | si | no | da validare | - | no | da verificare |
| 295 | src\components\registroSezioni.tsx:225 | src\components\registroSezioni.tsx | Elimina tempo | `() => onElimina(t.id)` |  | si | da validare | - | no | da verificare |
| 296 | src\components\RegolamentiScreen.tsx:147 | src\components\RegolamentiScreen.tsx | type="button" | `() => toggleSezione(chiave)` |  | no | da validare | - | no | da verificare |
| 297 | src\components\RegolamentiScreen.tsx:180 | src\components\RegolamentiScreen.tsx | type="button" | `() => toggleCapitolo(chiave)` |  | no | da validare | - | no | da verificare |
| 298 | src\components\RegolamentiScreen.tsx:245 | src\components\RegolamentiScreen.tsx | Cancella ricerca | `() => setQuery('')` |  | si | da validare | - | no | da verificare |
| 299 | src\components\RegolamentiScreen.tsx:259 | src\components\RegolamentiScreen.tsx | type="button" | `() => setDocFiltro('tutti')` |  | no | da validare | - | no | da verificare |
| 300 | src\components\RegolamentiScreen.tsx:271 | src\components\RegolamentiScreen.tsx | key= | `() => setDocFiltro(d.id)` |  | no | da validare | - | no | da verificare |
| 301 | src\components\RegolamentiScreen.tsx:320 | src\components\RegolamentiScreen.tsx | type="button" | `() => apriRisultato(r)` |  | no | da validare | - | no | da verificare |
| 302 | src\components\RevisioneSchedaModal.tsx:120 | src\components\RevisioneSchedaModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 303 | src\components\RevisioneSchedaModal.tsx:156 | src\components\RevisioneSchedaModal.tsx | type="button" | `() => {
                          const val =
              ` |  | no | da validare | - | no | da verificare |
| 304 | src\components\RevisioneSchedaModal.tsx:180 | src\components\RevisioneSchedaModal.tsx | (icona) | `() => apprendi(idx)` |  | no | da validare | - | no | da verificare |
| 305 | src\components\RevisioneSchedaModal.tsx:197 | src\components\RevisioneSchedaModal.tsx | Applica scheda corretta | `applicaTutto` |  | no | da validare | - | no | da verificare |
| 306 | src\components\RevisioneSchedaModal.tsx:200 | src\components\RevisioneSchedaModal.tsx | Annulla | `onClose` |  | no | da validare | - | no | da verificare |
| 307 | src\components\SchedeVascaScreen.tsx:239 | src\components\SchedeVascaScreen.tsx | type="button" | `() => setTabParametri('sessione')` |  | no | da validare | - | no | da verificare |
| 308 | src\components\SchedeVascaScreen.tsx:252 | src\components\SchedeVascaScreen.tsx | type="button" | `() => setTabParametri('destinatario')` |  | no | da validare | - | no | da verificare |
| 309 | src\components\SchedeVascaScreen.tsx:278 | src\components\SchedeVascaScreen.tsx | type="button" | `() => selezionaAtleta(null)` |  | no | da validare | - | no | da verificare |
| 310 | src\components\SchedeVascaScreen.tsx:291 | src\components\SchedeVascaScreen.tsx | key= | `() => selezionaAtleta(a.id)` |  | no | da validare | - | no | da verificare |
| 311 | src\components\SchedeVascaScreen.tsx:339 | src\components\SchedeVascaScreen.tsx | key= | `() => applicaVasca(v)` |  | no | da validare | - | no | da verificare |
| 312 | src\components\SchedeVascaScreen.tsx:448 | src\components\SchedeVascaScreen.tsx | (icona) | `() => setModalIAOpen(true)` |  | no | da validare | - | no | da verificare |
| 313 | src\components\SchedeVascaScreen.tsx:460 | src\components\SchedeVascaScreen.tsx | (icona) | `resetParametriData` |  | si | da validare | - | no | da verificare |
| 314 | src\components\SchedeVascaScreen.tsx:481 | src\components\SchedeVascaScreen.tsx | (icona) | `generaProposta` |  | no | da validare | - | no | da verificare |
| 315 | src\components\SchedeVascaScreen.tsx:502 | src\components\SchedeVascaScreen.tsx | (icona) | `salvaProposta` |  | no | da validare | - | no | da verificare |
| 316 | src\components\SchedeVascaScreen.tsx:506 | src\components\SchedeVascaScreen.tsx | (icona) | `handleCopy` |  | no | da validare | - | no | da verificare |
| 317 | src\components\SchedeVascaScreen.tsx:510 | src\components\SchedeVascaScreen.tsx | (icona) | `() => setScheda(null)` |  | no | da validare | - | no | da verificare |
| 318 | src\components\SchedeVascaScreen.tsx:520 | src\components\SchedeVascaScreen.tsx | (icona) | `() => setModalIAOpen(true)` |  | no | da validare | - | no | da verificare |
| 319 | src\components\Sezione.tsx:51 | src\components\Sezione.tsx | type="button" | `() => setAperto(!aperto)` |  | no | da validare | - | no | da verificare |
| 320 | src\components\TempiRipartenzeScreen.tsx:196 | src\components\TempiRipartenzeScreen.tsx | type="button" | `() => setTestModalOpen(true)` |  | no | da validare | - | no | da verificare |
| 321 | src\components\TempiRipartenzeScreen.tsx:441 | src\components\TempiRipartenzeScreen.tsx | type="submit" | `(submit)` | si | no | da validare | - | no | da verificare |
| 322 | src\components\TempiRipartenzeScreen.tsx:499 | src\components\TempiRipartenzeScreen.tsx | Elimina tempo | `() => eliminaTempo(t.id)` |  | si | da validare | - | no | da verificare |
| 323 | src\components\TestCalibrazioneModal.tsx:87 | src\components\TestCalibrazioneModal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 324 | src\components\TestCalibrazioneModal.tsx:107 | src\components\TestCalibrazioneModal.tsx | key= | `() => setVasca(v)` |  | no | da validare | - | no | da verificare |
| 325 | src\components\TestCalibrazioneModal.tsx:153 | src\components\TestCalibrazioneModal.tsx | type="submit" | `(submit)` | si | no | da validare | - | no | da verificare |
| 326 | src\components\TestCalibrazioneModal.tsx:160 | src\components\TestCalibrazioneModal.tsx | type="button" | `onClose` |  | no | da validare | - | no | da verificare |
| 327 | src\components\TimelineStagione.tsx:85 | src\components\TimelineStagione.tsx | key= | `() => onSelezionaMacro?.(ma.id)` |  | no | da validare | - | no | da verificare |
| 328 | src\components\TimelineStagione.tsx:105 | src\components\TimelineStagione.tsx | key= | `() => onSelezionaMeso?.(me.id)` |  | no | da validare | - | no | da verificare |
| 329 | src\components\TimelineStagione.tsx:124 | src\components\TimelineStagione.tsx | key= | `() => onSelezionaMicro?.(mi)` |  | no | da validare | - | no | da verificare |
| 330 | src\components\ui\Button.tsx:48 | src\components\ui\Button.tsx | ref= | `-` | si | no | da validare | - | no | da verificare |
| 331 | src\components\ui\EmptyState.tsx:42 | src\components\ui\EmptyState.tsx | )} | `onAction` |  | no | da validare | - | no | da verificare |
| 332 | src\components\ui\Modal.tsx:54 | src\components\ui\Modal.tsx | Chiudi finestra | `onClose` |  | si | da validare | - | no | da verificare |
| 333 | src\components\ui\Modal.tsx:74 | src\components\ui\Modal.tsx | Chiudi | `onClose` |  | no | da validare | - | no | da verificare |
| 334 | src\components\ui\Tabs.tsx:65 | src\components\ui\Tabs.tsx | key= | `() => !tab.disabled && onChange(tab.id)` | si | no | da validare | - | no | da verificare |
| 335 | src\components\ui\Toast.tsx:94 | src\components\ui\Toast.tsx | Chiudi notifica | `() => dismiss(t.id)` |  | no | da validare | - | no | da verificare |
| 336 | src\components\WelcomeScreen.tsx:70 | src\components\WelcomeScreen.tsx | type="button" | `() => avvia(true)` |  | no | da validare | - | no | da verificare |
| 337 | src\components\WelcomeScreen.tsx:92 | src\components\WelcomeScreen.tsx | type="button" | `() => avvia(false)` |  | no | da validare | - | no | da verificare |

## Note
- "Effetto atteso" e "Test" vanno compilati per i pulsanti ad alto rischio (Vasca/Regia/Cronometro, Backup/Dati, Piano, scheda atleta).
- Pulsanti non cliccabili in automatico (file picker nativo, stampa, condivisione): verificare a mano.