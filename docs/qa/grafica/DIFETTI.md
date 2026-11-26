# DIFETTI visivi — baseline "PRIMA" (stress-100, Pixel 411x923dp)

Rilevati da ispezione DOM/CDP e lettura codice (screenshot in `prima/*.jpg`).

1. **Testi sotto 12px**: i token `label-sm` (10px) e `label-caps` (11px) sono usati
   in ~300 punti (etichette, badge, timestamp) — sotto il pavimento di 12px.
2. **Intestazioni**: i chip di stato ("25M LIVE", "ROSA ATTIVA") sono sparsi dentro
   le card/header invece che in una riga dedicata sotto il titolo.
3. **Oggi**: metrica "CARICO SETT. 8,0km" è in realtà volume — etichetta ambigua;
   gli stati vuoti non hanno un unico passo successivo.
4. **Squadra**: cognome+nome in una riga sola con `truncate` → i cognomi lunghi
   `SIM-...` vengono tagliati con ellissi; tre badge classe (S/SB/SM) occupano
   spazio e nessuna modalità compatta.
5. **Piano**: nessuna timeline stagionale; macro/meso/microcicli solo a liste;
   nessun colore semantico condiviso per i microcicli.
6. **Raggi/ombre sparsi**: `rounded-xl`, `rounded-2xl`, `rounded-[16px]`, `ds-card`
   e `shadow-card` combinati in modo non uniforme tra sezioni.
7. **Bottoni ad hoc**: molte azioni usano classi Tailwind inline
   (`h-12 rounded-xl bg-primary-container ...`) invece delle varianti `ds-btn-*`.
8. **Colori semantici non centralizzati**: stati atleta, microcicli e classi
   hanno colori hardcoded nei componenti invece di una mappa token unica.
9. **Vasca/Regia**: cognomi lunghi a rischio troncamento nelle tessere; stati
   espressi quasi solo dal colore in alcune tessere.
10. **Contrasto/tema chiaro**: alcune combinazioni `*/10` + testo colorato sui
    container chiari non sono verificate sistematicamente.
