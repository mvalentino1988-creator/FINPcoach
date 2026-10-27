import React from 'react';
import { Marquee } from './Marquee';

export interface PageHeaderProps {
  label: string;
  title: string;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ label, title, meta, icon, right }) => {
  return (
    <section className="rounded-xl bg-surface-container-low px-3 py-2 sm:px-4 sm:py-2.5 border border-slate-200/60">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              <Marquee text={label} />
            </span>
          </div>
          <h1 className="text-sm sm:text-base text-on-surface tracking-tight leading-snug mt-0.5 font-bold">
            <Marquee text={title} />
          </h1>
          {meta && typeof meta === 'string' ? (
            <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
              <Marquee text={meta} />
            </p>
          ) : (
            meta
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </section>
  );
};
