# Report UI FINPcoach (2026-11-12)

URL: http://localhost:3000/ · viewport 412x915

## Riepilogo

| Schermata | Tema | Problemi axe | Target <48px | Overflow orizzontale |
|---|---|---|---|---|
| Finestra iniziale | light | 1 | 0 | no |
| OGGI | light | 1 | 0 | no |
| VASCA | light | 1 | 19 | no |
| SQUADRA | light | 0 | 0 | no |
| SQUADRA - finestra Nuovo Atleta | light | 0 | 9 | no |
| PIANO | light | 0 | 11 | no |
| PIANO - finestra Modifica sedute o volume | light | 1 | 14 | no |
| PIANO - finestra Modifica sedute o volume | light | 1 | 14 | no |
| PIANO - finestra Modifica sedute o volume | light | 1 | 14 | no |
| Finestra iniziale | dark | 0 | 0 | no |
| OGGI | dark | 0 | 0 | no |
| VASCA | dark | 1 | 19 | no |
| SQUADRA | dark | 0 | 0 | no |
| SQUADRA - finestra Nuovo Atleta | dark | 0 | 9 | no |
| PIANO | dark | 1 | 11 | no |
| PIANO - finestra Modifica sedute o volume | dark | 2 | 14 | no |
| PIANO - finestra Modifica sedute o volume | dark | 2 | 14 | no |
| PIANO - finestra Modifica sedute o volume | dark | 2 | 14 | no |

## Dettaglio

### Finestra iniziale [light]  (file: finestra-iniziale-light-*.png)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → h3

### OGGI [light]  (file: oggi-light-*.png)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → h3

### VASCA [light]  (file: vasca-light-*.png)
- [serious] label-content-name-mismatch: Elements must have their visible text as part of their accessible name (5 elementi) → .col-span-6 | .col-span-4 | .ring-2 > .text-left.active\:scale-\[0\.99\].gap-3
- Target piccoli (19): button "Cronometro" 192x40; button "Regia" 192x40; input "Ripartenza globale in formato 45 s, 2 m " 64x28; select "Tutti assegnati" 253x44; button "Corsia" 101x44; button "Corsia precedente" 40x44; button "Corsia 1" 82x44; button "Corsia 2" 86x44

### SQUADRA - finestra Nuovo Atleta [light]  (file: squadra-finestra-nuovo-atleta-light-*.png)
- Target piccoli (9): input "" 20x20; input "" 20x20; button "*" 40x48; button "T" 40x48; button "A" 40x48; button "Y" 40x48; button "E" 40x48; button "7" 40x48

### PIANO [light]  (file: piano-light-*.png)
- Target piccoli (11): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [light]  (file: piano-finestra-modifica-sedute-o-volume-light-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [light]  (file: piano-finestra-modifica-sedute-o-volume-light-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [light]  (file: piano-finestra-modifica-sedute-o-volume-light-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### VASCA [dark]  (file: vasca-dark-*.png)
- [serious] label-content-name-mismatch: Elements must have their visible text as part of their accessible name (5 elementi) → .col-span-6 | .col-span-4 | .ring-2 > .text-left.active\:scale-\[0\.99\].gap-3
- Target piccoli (19): button "Cronometro" 192x40; button "Regia" 192x40; input "Ripartenza globale in formato 45 s, 2 m " 64x28; select "Tutti assegnati" 253x44; button "Corsia" 101x44; button "Corsia precedente" 40x44; button "Corsia 1" 82x44; button "Corsia 2" 86x44

### SQUADRA - finestra Nuovo Atleta [dark]  (file: squadra-finestra-nuovo-atleta-dark-*.png)
- Target piccoli (9): input "" 20x20; input "" 20x20; button "*" 40x48; button "T" 40x48; button "A" 40x48; button "Y" 40x48; button "E" 40x48; button "7" 40x48

### PIANO [dark]  (file: piano-dark-*.png)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → .text-on-primary\/70
- Target piccoli (11): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [dark]  (file: piano-finestra-modifica-sedute-o-volume-dark-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → .text-on-primary\/70
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [dark]  (file: piano-finestra-modifica-sedute-o-volume-dark-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → .text-on-primary\/70
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44

### PIANO - finestra Modifica sedute o volume [dark]  (file: piano-finestra-modifica-sedute-o-volume-dark-*.png)
- [critical] label: Form elements must have labels (5 elementi) → input[min="0"] | input[step="50"] | input[type="time"][value=""]:nth-child(1)
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 elementi) → .text-on-primary\/70
- Target piccoli (14): button "Parametri" 41x44; button "Date" 39x44; button "Elimina" 41x44; button "Parametri" 187x44; button "Programmazione" 187x44; button "Oggi" 80x44; button "Tutti a vista" 110x44; button "Preparazione generale4 sett." 254x44
