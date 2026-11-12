import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Icona Lucide (componente) o nodo React */
  icon?: React.ReactNode;
  title: string;
  message?: string;
  /** Testo e handler dell'azione primaria opzionale */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'ds-card-flat flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        className
      )}
    >
      <div className="text-on-surface-variant">
        {icon ?? <Inbox size={40} strokeWidth={1.5} />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-title-md text-on-surface">{title}</h3>
        {message && (
          <p className="text-body-sm text-on-surface-variant">{message}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
