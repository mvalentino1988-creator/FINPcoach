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
    <section className="relative overflow-hidden rounded-2xl bg-surface-container-low border border-outline-variant px-4 py-2.5 sm:py-3.5 shadow-card flex items-center justify-between gap-2 sm:gap-4 max-[639px]:flex-col max-[639px]:items-stretch">
      {/* Subtle decorative blob */}
      <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-primary/10 pointer-events-none" />
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-primary/80 font-headline" title={label}>
            {label}
          </span>
        </div>
        <h1 className="text-base sm:text-headline-sm text-on-surface tracking-tight leading-snug font-bold font-headline whitespace-normal break-words">
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
