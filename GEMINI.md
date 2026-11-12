# FINPcoach: regole per il redesign grafico

Stack: React 18, TypeScript, Vite 6, Tailwind CSS, Lucide React.
Uso: allenatore di nuoto paralimpico, smartphone Android (WebView) a bordo
vasca, mani bagnate, luce forte, uso con una mano.

## Vincoli non negoziabili
- NON modificare src/domain/.
- NON cambiare il formato dei dati in LocalStorage né del backup JSON.
- Mantieni tutte le funzionalità e tutti i testi in italiano.
- Nessuna nuova dipendenza.
- Il codice deve compilare: esegui `npm run build` dopo ogni modifica.
- La stampa (@media print) deve restare pulita.

## Direzioni di design
- Token in tailwind.config: palette, tipografia, spaziature, raggi, ombre,
  colori semantici ACWR (verde/giallo/rosso) e zone A1-D.
- Bottom navigation, target touch minimi 48px, numeri grandi e contrastati.
- Dark e light mode secondo le preferenze di sistema.
- Componenti riutilizzabili in src/components/ui/.
- Contrasto WCAG AA, focus visibile, aria dove serve.

## Metodo
Lavora una fase per volta e fermati a fine fase con un riassunto di max 8 righe.