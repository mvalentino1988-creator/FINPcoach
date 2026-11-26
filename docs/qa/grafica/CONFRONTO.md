# CONFRONTO PRIMA/DOPO — giro grafico

Dataset: stress-100 sulla build `.qa`, Pixel 411x923dp, tema scuro (chiaro dove indicato).

| Schermata | Prima | Dopo | File |
|-----------|-------|------|------|
| Oggi | microciclo in chip secondario, "Carico sett." ambiguo, nessuna sezione attenzioni | chip microciclo con colore semantico + fase, "Volume sett.", sezione "Attenzioni" comprimibile ordinata per urgenza, CTA "Vai in vasca" | `prima/oggi.jpg` → `dopo/oggi.jpg`, `dopo/oggi-chiaro.jpg` |
| Squadra | cognome+nome su una riga con ellissi, nessuna presenza/ACWR, filtri senza sfumatura | nome su due righe, badge classe + stato + icona presenza oggi + pallino ACWR, toggle "Compatta/Estesa" persistito, filtri con sfumatura | `prima/squadra.jpg` → `dopo/squadra.jpg`, `dopo/squadra-chiaro.jpg`, `dopo/squadra-font13.jpg` |
| Scheda atleta | modal con tab | invariata (FASE 4 parziale: già bottom sheet con tab) | `prima/scheda-atleta.jpg` → `dopo/scheda-atleta.jpg` |
| Piano · programmazione | liste senza overview | Timeline stagionale (macro/meso/micro/gare/oggi) + grafico volume settimanale con soglie +10%/+20% | `prima/piano-programmazione.jpg` → `dopo/piano-programmazione.jpg`, `dopo/piano-chiaro.jpg`, `dopo/piano-font13.jpg` |
| Piano · parametri | — | invariata | `prima/piano-parametri.jpg` → `dopo/piano-parametri.jpg` |
| Cronometro | stati con colore+simbolo | invariata + target touch portati a 48px | `prima/cronometro.jpg` → `dopo/cronometro.jpg` |
| Regia | controlli 44px | controlli 48px, chip LIVE/assegnati in header | `prima/regia.jpg` → `dopo/regia.jpg` |
| Dati | — | invariata | `prima/dati.jpg` → `dopo/dati.jpg` |
| Fonti | — | invariata | `prima/fonti.jpg` → `dopo/fonti.jpg` |

## Verifiche DOM/CDP (build .qa)
- Nessun testo calcolato < 12px su Oggi, Squadra, Piano, Vasca.
- Nessun target < 44px; Vasca/Regia >= 48px (2 controlli cronometro misurano 41px di larghezza per scala layout, altezza 48).
- Nessun titolo/intestazione con ellissi; nessun overflow orizzontale.

## Non verificato
- Contrasto misurato formalmente (solo verifica token chiaro/scuro esistente).
- Screenshot non ispezionati a vista (limite del modello): verifiche via DOM.
