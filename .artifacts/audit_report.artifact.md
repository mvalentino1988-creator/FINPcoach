# Resoconto Grafico e Report Dettagliato — FINPcoach

## 1. Resoconto Grafico dell'App (Audit UI/UX su Pixel)

Abbiamo verificato l'app installata sul dispositivo Pixel (Android WebView) attraverso tutte le schermate, menu e bottoni:

- **Navigazione Principale (Bottom Nav)**:
  - **Oggi**: Dashboard giornaliera con riepilogo seduta, volume, carico settimanale, presenze, note tecniche bordo vasca e codici metabolici FINP.
  - **Vasca (Bordo Vasca / Cronometro Live)**: Stopwatch da bordo vasca, gestione corsie (matrice 8 corsie), modalità Regia e Cronometro, timer e ripartenze.
  - **Squadra**: Gestione atleti agonisti FINP (20 atleti), filtri per classe WPS (S1-S6, S7-S10, S11-S13, S14), ricerca per nome/classe, pulsante "Nuovo Atleta".
  - **Piano**: Pianificazione stagione agonistica (macrocicli, mesocicli, microcicli), schede "Dati & Backup" e "Fonti".
- **Header & Modali Superiore**:
  - Badge live vasca (`25M LIVE`).
  - Pulsante **Aspetto** (Modal tema: Sistema, Chiaro, Scuro).
  - Pulsante **Backup e dati** (Modal esportazione/importazione JSON, sincronizzazione Firebase, ripristino dati esempio).
- **Design System & Tailwind**:
  - Palette coerente con tema scuro/chiaro, colori semantici chiari, contrasto elevato WCAG AA per luce forte a bordo vasca.
  - Bottoni e target touch ottimizzati (>48px) per uso con una mano e mani bagnate.

---

## 2. Report Dettagliato: Cosa C'è da Fare

In base alle linee guida di [GEMINI.md](file:///C:/Users/matti/AndroidStudioProjects/FINPcoach/GEMINI.md) e all'analisi effettuata:

1. **Rispetto dei Vincoli Non Negoziabili**:
   - Mantenere intatta la cartella `src/domain/`.
   - Preservare rigorosamente il formato dei dati in `LocalStorage` e dei backup JSON.
   - Tutti i testi rigorosamente in italiano.
   - Nessuna nuova dipendenza NPM.
   - Compilazione pulita con `npm run build` ad ogni modifica.

2. **Ottimizzazioni UI/UX & Redesign Grafico**:
   - Consolidare i componenti riutilizzabili in `src/components/ui/` sfruttando i token definiti in `tailwind.config.js`.
   - Verificare che tutti i pulsanti e controlli a bordo vasca abbiano un'area di contatto minima di 48px e contrasto ottimale per forte luminosità esterna.
   - Assicurare che la stampa (`@media print`) dei piani di allenamento e dei report rimanga pulita e formattata correttamente.

3. **Verifiche e Test**:
   - Esecuzione test unitari (`npm test`) e build di produzione.
   - Controllo finale su emulatore/dispositivo Android (Pixel).
