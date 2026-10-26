---
name: Aquatic Paralympic Coaching System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f484a'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6f797b'
  outline-variant: '#bec8ca'
  surface-tint: '#016874'
  primary: '#004e58'
  on-primary: '#ffffff'
  primary-container: '#006874'
  on-primary-container: '#97e4f2'
  inverse-primary: '#85d2e0'
  secondary: '#006399'
  on-secondary: '#ffffff'
  secondary-container: '#7ec2fd'
  on-secondary-container: '#004f7b'
  tertiary: '#793000'
  on-tertiary: '#ffffff'
  tertiary-container: '#9e4202'
  on-tertiary-container: '#ffceb7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a2effd'
  primary-fixed-dim: '#85d2e0'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#95ccff'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#004a75'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb692'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#793000'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-base:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-bold:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an athletic, high-contrast, poolside-engineered interface tailored for Paralympic swimming coaches, sports scientists, and technical federations. Operating in challenging outdoor and indoor aquatic environments characterized by severe water glare, wet hands, and time-critical decision making, the aesthetic discards low-contrast nuances and decorative ambiguity in favor of crisp legibility, authoritative athletic structure, and functional precision.

The style unites **Corporate / Modern** discipline with **High-Contrast / Bold** accessibility:
- **Atmosphere:** Crystalline, clean, and disciplined. Deep aquatic teals anchor the institutional authority of competitive swimming, balanced by energetic athletic warm accents and luminous cyan highlights.
- **Poolside Ergonomics:** Built explicitly around fail-safe interaction. High-frequency controls enforce expanded tap targets (minimum 48px to 52px) to guarantee accuracy during active training intervals and wet touch handling.
- **Accessibility & Cognitive Load:** Adheres strictly to WCAG AAA contrast ratios for vital parameters, medical safety alerts, and metabolic pacing tags. Anti-truncation mandates ensure critical coaching instructions and athlete physiological directives are never occluded by ellipses on small mobile screens.

## Colors

The color palette is calibrated to survive direct sunlight, artificial pool illumination, and reflective water surfaces while enabling instant visual triage of athlete data and training zones.

### Core Roles
- **Primary (`#006874` — Deep Aquatic Teal):** Institutional anchor representing aquatic mastery and federation leadership. Deployed across sticky navigation headers, elevated primary action buttons, active tab indicators, and primary visual anchors.
- **Secondary (`#006399` — Olympic Deep Blue):** Represents competitive pacing standards, split-time differentials, multi-class functional tags, and secondary action affordances.
- **Tertiary (`#9B4000` — Athletic Coral):** A high-visibility warm energetic accent reserved for peak volume load highlights, high-priority timers, and active coaching focus areas.
- **Neutral (`#0F172A` — Deep Slate Navy):** The structural text anchor providing uncompromising typographic contrast across all bright surfaces.

### Surface Architecture
- **Global Glacial Canvas (`#F4FAFC`):** A soft, glare-diffusing pale cyan tint that suppresses the harsh eye fatigue caused by pure white backgrounds in bright environments.
- **Deck Container Surface (`#FFFFFF`):** High-luminance white dedicated to cards, modals, and data grids, bounded by crisp hairline slate borders (`#E2E8F0`).
- **Interactive Container Tiers (`#F1F5F9` to `#E2E8F0`):** Soft neutral fills for nested table headers, secondary chip groups, and resting input fields.

### Physiological Training Zones (Codici Fisiologici FINP)
Metabolic pacing zones utilize paired semantic background and foreground values for split-second roadside and deck classification:
- **Zone A1 (Aerobico Base / Recovery):** Background `#E0F2FE`, Text `#0369A1`
- **Zone A2 (Resistenza Aerobica Fondo):** Background `#CCFBF1`, Text `#0F766E`
- **Zone B1 (Soglia Anaerobica / CSS):** Background `#DBEAFE`, Text `#1D4ED8`
- **Zone B2 (VO2 Max / Potenza Aerobica):** Background `#E0E7FF`, Text `#4338CA`
- **Zone C1 (Tolleranza Lattacida):** Background `#FEF3C7`, Text `#B45309`
- **Zone C2 (Potenza Lattacida):** Background `#FFEDD5`, Text `#C2410C`
- **Zone C3 (Ritmo Gara / Race Pace):** Background `#FCE7F3`, Text `#BE185D`
- **Zone D (Velocità Pura / Alattacido):** Background `#FEE2E2`, Text `#B91C1C`

### Medical & Critical Safety Callouts
- **High Risk / Dysreflexia (`#FFF1F2` background, `#FECDD3` border, `#881337` text):** Reserved strictly for critical medical parameters such as autonomic dysreflexia in spinal cord injuries (T6+) and acute lactic overload limits.
- **Caution / Load Warning (`#FFFBEB` background, `#FDE68A` border, `#78350F` text):** Indicates training volume spikes (>15% weekly jumps) or pending class reviews.
- **Validated Classification (`#F0FDF4` background, `#BBF7D0` border, `#14532D` text):** Confirmed national/WPS classification status and validated qualifying standards.

## Typography

The typographic hierarchy pairs the authoritative, geometric precision of **Space Grotesk** for headings, metrics, and functional tags with the neutral, hyper-legible institutional clarity of **Public Sans** for instructional workout bodies, medical classifications, and exercise logs.

### Operational Principles
- **Anti-Truncation Guarantee:** Exercise descriptions and instructional buttons explicitly mandate multi-line wrapping (`white-space: normal`, `word-break: break-word`). A coach on deck must never miss crucial pacing guidelines (`ripartenza 1'15"`) due to truncated text.
- **Tabular Figures & Metrics:** Pacing splits (`1:14.85 /100m`), rest intervals (`@30"`), and volume readouts (`2,400 m`) rely on monospace numeral alignments within `Space Grotesk` to prevent jitter across dynamic updates.
- **Visual Cadence:** `label-caps` is utilized exclusively for WPS sport classification codes (`S9`, `SB8`, `SM9`), record labels (`ITA`, `EUR`, `WR`), and training code pills to provide clear, high-density metadata parsing.

## Layout & Spacing

The layout follows a mobile-first fluid structure optimized for handheld tablets and ruggedized poolside smartphones.

### Grid & Layout Structure
- **Mobile (<768px):** Single-column fluid view with `1rem` outer canvas padding and `0.75rem` internal component gaps. A fixed bottom dock reserves a dedicated `56px` plus device-safe-area margin (`safe-bottom`) to ensure bottom interactive elements never clip.
- **Tablet & Desktop (≥768px):** Transitions to a multi-column fixed-max layout centered at `1024px` (`max-w-5xl`) with `1.5rem` outer margins and `1rem` gutters. Side-by-side splits display workout composition alongside athlete real-time parameters.

### Spatial Discipline
All spacing strictly adheres to a 4px/8px modular rhythm. Card interiors maintain a disciplined `1rem` (`space-md`) padding for standard cards and `1.5rem` (`space-lg`) for major summary dashboards. Dense workout lists use `0.5rem` (`space-sm`) vertical item separation to preserve maximum informational density above the fold.

## Elevation & Depth

This design system deliberately minimizes blurry, heavy drop shadows, which wash out in bright aquatic environments and create perceptual muddiness. Instead, depth and visual hierarchy are established through crisp tonal contrast, layered card containers, and hairline outlines.

### Depth Mechanics
- **Base Canvas:** Recessed glare-diffusing ground at `#F4FAFC`.
- **Level 1 (Card & Section Surfaces):** Pure White (`#FFFFFF`) surfaces elevated solely by a 1px solid hairline border in `#E2E8F0` and an imperceptible micro-shadow (`0 1px 2px rgba(15, 23, 42, 0.05)`).
- **Level 2 (Active States & Popovers):** Elevated contextual sheets, training code filter popovers, and bottom sheets adopt a clean `#FFFFFF` ground reinforced with a structural border (`#CBD5E1`) and a directional ambient shadow (`0 4px 12px rgba(15, 23, 42, 0.08)`).
- **Level 3 (Modal Sheets & Emergency Alerts):** Centered floating dialogs sit atop a translucent Deep Slate scrim (`rgba(15, 23, 42, 0.5)`). Medical alerts use vivid flat fills paired with high-contrast saturated border strokes rather than drop shadows to ensure instant visual capture under wet glare.

## Shapes

The interface balances athletic aerodynamics with solid tactile control:
- **Default Rounding (0.5rem / 8px):** Applied to interactive buttons, inputs, segmented controls, and workout series rows.
- **Card Containers (`rounded-lg` / 1rem):** Workout session cards, roster profile decks, and modal containers use generous 16px corner radii to project modern sports-tech polish.
- **Pill Badges (`rounded-full`):** Reserved for metabolic training zones (`A1`, `B1`, `C2`), swimming sport classes (`S1`–`S14`), and status indicators, producing immediate silhouette recognition against angular table rows.

## Components

### Buttons & Interactive Touch Targets
- **Ergonomic Standards:** Minimum height of `48px` (primary controls extend to `52px`). Explicit text-wrapping enabled (`white-space: normal`).
- **Primary Button:** Solid Deep Aquatic Teal (`#006874`) fill, `#FFFFFF` text, `Space Grotesk` semi-bold font, `8px` corner radius. Focus states apply a `2px` cyan ring (`#97F0FF`) with an offset.
- **Secondary Action:** Ghost deck style with `#F1F5F9` background, `1px` `#E2E8F0` border, `#0F172A` text, transitioning on press to `#E2E8F0`.
- **Poolside Quick-Action Tools:** Floating quick-copy and quick-print actions use high-contrast circular or pill-shaped buttons with immediate tactile feedback.

### Form Fields & Inputs
- **Touch Bounds:** Input height locked at `48px` with `12px` horizontal padding.
- **Resting State:** `#F8FAFC` background with a distinct `1px` `#94A3B8` border.
- **Active / Focus State:** Crisp `#FFFFFF` background, `#006874` border, accompanied by a high-contrast focus outline.
- **Labels:** Set in uppercase `label-caps` (`Space Grotesk`, 10px, bold) in `#475569` placed cleanly above the input field.

### Chips & Badges
- **Metabolic Code Badge (`BadgeCodice`):** Compact pill badge (`rounded-full`, 11px uppercase bold, padding `4px 10px`) adopting dedicated physiological background and text colors (A1 through D).
- **Paralympic Sport Class Badge:** Dual-tone chip featuring `#001F24` background with `#97F0FF` text, signaling athlete functional classification (e.g. `S9 · SB8 · SM9`).

### Lists & Series Rows
- **Workout Series Items:** Structured workout rows nested inside card containers. Alternating or border-separated intervals with monospace time/distance indicators aligned right and drill descriptions aligned left.
- **Touch-Friendly Expandable Sections:** Collapsible warmup (`Riscaldamento`), main set (`Serie Principale`), and cool-down (`Defaticamento`) sections with full-width chevron triggers and total meterage tallies.

### Cards & Deck Containers
- **Profile & Workout Cards:** Pure `#FFFFFF` surfaces with `#E2E8F0` borders. Clear distinction between metadata headers (athlete name, stroke, total volume) and detailed exercise breakdowns.
- **Metabolic Distribution Bar:** Proportional horizontal segmented bar (`12px` height, rounded full) illustrating percentage share of aerobic, anaerobic, and lactic workloads for the session.

### Checkboxes & Radios
- **Dimensions:** Sized at `22px × 22px` to permit confident selection on mobile screens.
- **Active Fill:** `#006874` with a high-contrast pure white checkmark icon.

### Alert Banners
- **Medical & Load Alerts:** Edge-to-edge or inset alert boxes featuring a thick `4px` left accent border, high-contrast semantic background, and mandatory dedicated icon (e.g., AlertCircle, AlertTriangle) to deliver actionable poolside precautions without relying solely on color.