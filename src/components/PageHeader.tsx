import React from 'react';

export interface PageHeaderProps {
  label: string;
  title: string;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ label, title, meta, icon, right }) => {
  return (
    <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant px-space-md py-space-sm sm:px-space-lg sm:py-space-md shadow-card flex items-center justify-between gap-space-sm sm:gap-space-lg max-[639px]:flex-col max-[639px]:items-stretch">
      {/* Subtle decorative blob */}
      <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-primary/10 pointer-events-none" />
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon && (
            <span className="w-6 h-6 rounded-md bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">
              {icon}
            </span>
          )}
          <span className="min-w-0 truncate font-label-caps text-label-caps uppercase tracking-wider text-primary" title={label}>
            {label}
          </span>
        </div>
        <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-snug font-bold whitespace-normal break-words">
          {title}
        </h1>
        {meta && typeof meta === 'string' ? (
          <p className="hidden sm:block text-xs text-on-surface-variant leading-tight mt-1 whitespace-normal break-words">
            {meta}
          </p>
        ) : meta ? (
          <div className="mt-1">{meta}</div>
        ) : null}
      </div>

      {right && <div className="relative z-10 shrink-0 flex flex-wrap items-center justify-end gap-1.5 max-[639px]:justify-start">{right}</div>}
    </section>
  );
};
