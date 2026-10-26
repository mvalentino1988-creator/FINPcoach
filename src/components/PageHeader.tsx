import React from 'react';

/**
 * PageHeader — intestazione di pagina identica alla dashboard (OggiScreen).
 *
 * Replica esattamente il blocco di intestazione della dashboard:
 *  - contenitore `rounded-2xl bg-surface-container-low` con hairline;
 *  - cerchio decorativo `bg-secondary-fixed` in basso a destra;
 *  - etichetta `ds-label text-primary` + titolo `headline-lg`;
 *  - slot destro opzionale (chip di stato o azione primaria).
 *
 * Usare questo componente in TUTTE le schermate per mantenere lo stesso
 * stile di colori, forme e tipografia della dashboard.
 */
export interface PageHeaderProps {
  /** Etichetta piccola in maiuscolo sopra il titolo (es. "SQUADRA FINP"). */
  label: string;
  /** Titolo principale della schermata. */
  title: string;
  /** Riga secondaria opzionale sotto il titolo (metadati, date, conteggi). */
  meta?: React.ReactNode;
  /** Icona opzionale accanto all'etichetta. */
  icon?: React.ReactNode;
  /** Slot destro: chip di stato o pulsante azione. */
  right?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ label, title, meta, icon, right }) => {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-3 sm:px-4 sm:py-3 border border-slate-200/60">
      <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-secondary-fixed opacity-40 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="ds-label text-primary flex items-center gap-1.5 truncate">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          <h1 className="text-base xs:text-lg sm:text-headline-lg text-on-surface tracking-tight leading-tight mt-0.5 truncate">
            {title}
          </h1>
          {meta && (
            <p className="text-[11px] sm:text-xs text-on-surface-variant leading-snug mt-0.5 truncate">
              {meta}
            </p>
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </section>
  );
};
