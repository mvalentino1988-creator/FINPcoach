import React from 'react';
import { cn } from '../../lib/cn';

export interface TableColumn<T = Record<string, React.ReactNode>> {
  /** Chiave usata per recuperare il valore dalla riga */
  key: keyof T & string;
  header: React.ReactNode;
  /** Allineamento cella */
  align?: 'left' | 'center' | 'right';
  /** Colonna numerica: tabular-nums e peso maggiore */
  numeric?: boolean;
  className?: string;
}

export interface TableProps<T = Record<string, React.ReactNode>> {
  columns: TableColumn<T>[];
  rows: T[];
  /** 'numeric' ingrandisce i valori (tempi, ripartenze) */
  variant?: 'default' | 'numeric';
  /** Contenuto mostrato quando rows è vuoto */
  emptyState?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
  getRowKey?: (row: T, index: number) => React.Key;
  className?: string;
}

const alignClass = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
} as const;

export function Table<T extends Record<string, React.ReactNode>>({
  columns,
  rows,
  variant = 'default',
  emptyState,
  onRowClick,
  getRowKey,
  className,
}: TableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  const numeric = variant === 'numeric';

  return (
    <div
      className={cn(
        'ds-card overflow-x-auto',
        numeric && 'ds-card-flat',
        className
      )}
    >
      <table className="w-full min-w-[480px] border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-label-caps text-on-surface-variant whitespace-nowrap',
                  alignClass[col.align ?? 'left'],
                  col.numeric && 'tabular-nums',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const clickable = !!onRowClick;
            return (
              <tr
                key={getRowKey ? getRowKey(row, index) : index}
                onClick={clickable ? () => onRowClick(row, index) : undefined}
                className={cn(
                  'border-b border-outline-variant/60 last:border-b-0 transition-colors',
                  index % 2 === 1 && 'bg-surface-container-low/60',
                  clickable &&
                    'cursor-pointer hover:bg-primary/5 focus-visible:outline-2 focus-visible:-outline-offset-2',
                  numeric && 'hover:bg-surface-container-low'
                )}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? 'button' : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row, index);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-on-surface',
                      alignClass[col.align ?? 'left'],
                      col.numeric || numeric
                        ? cn(
                            'tabular-nums',
                            numeric ? 'text-body-lg font-semibold' : 'font-medium'
                          )
                        : undefined,
                      col.className
                    )}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
