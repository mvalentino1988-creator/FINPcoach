import React from 'react';
import { cn } from '../../lib/cn';

export type ProgressTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'acwr-ok'
  | 'acwr-attenzione'
  | 'acwr-critico';

const TONE_CLASS: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  tertiary: 'bg-tertiary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-outline',
  'acwr-ok': 'bg-acwr-ok',
  'acwr-attenzione': 'bg-acwr-attenzione',
  'acwr-critico': 'bg-acwr-critico',
};

export interface ProgressProps {
  /** Valore corrente (0..max). */
  value: number;
  max?: number;
  tone?: ProgressTone;
  /** Etichetta sopra la barra. */
  label?: React.ReactNode;
  /** Testo a destra/sotto: mai affidarsi al solo colore. */
  valueLabel?: React.ReactNode;
  className?: string;
  trackClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  tone = 'primary',
  label,
  valueLabel,
  className,
  trackClassName,
}) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={cn('w-full', className)}>
      {(label || valueLabel) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant truncate">
            {label}
          </span>
          {valueLabel != null && (
            <span className="font-label-caps text-label-caps text-on-surface font-bold tabular-nums shrink-0">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className={cn('h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high', trackClassName)}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', TONE_CLASS[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
