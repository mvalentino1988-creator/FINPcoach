import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeVariant = 'neutral' | 'blue' | 'coral' | 'green' | 'secondary' | 'tertiary';
export type BadgeSize = 'sm' | 'md';
export type SwimZone = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3' | 'D';
export type AcwrLevel = 'ok' | 'attenzione' | 'critico';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Zona di nuoto — sovrascrive variant */
  zone?: SwimZone;
  /** Livello ACWR semantico — sovrascrive variant e zone */
  acwr?: AcwrLevel;
  level?: AcwrLevel; // alias for acwr
}

const variantClass: Record<BadgeVariant, string> = {
  neutral:   'ds-chip-neutral',
  blue:      'ds-chip-blue',
  coral:     'ds-chip-coral',
  green:     'ds-chip-green',
  secondary: 'ds-chip-secondary',
  tertiary:  'ds-chip-tertiary',
};

const zoneColorMap: Record<SwimZone, string> = {
  A1: '#3b82f6',
  A2: '#0ea5e9',
  B1: '#10b981',
  B2: '#059669',
  C1: '#f59e0b',
  C2: '#f59e0b',
  C3: '#f59e0b',
  D:  '#8b5cf6',
};

const acwrColorMap: Record<AcwrLevel, string> = {
  ok:         '#059669',
  attenzione: '#d97706',
  critico:    '#dc2626',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  zone,
  acwr,
  level,
}: BadgeProps) {
  const acwrLevel = acwr ?? level;

  let baseClass = variantClass[variant];
  let inlineStyle: React.CSSProperties | undefined;

  if (acwrLevel) {
    const color = acwrColorMap[acwrLevel];
    baseClass = 'ds-chip';
    inlineStyle = {
      backgroundColor: `${color}18`,
      color: color,
      border: `1px solid ${color}40`,
    };
  } else if (zone) {
    const color = zoneColorMap[zone];
    baseClass = 'ds-chip';
    inlineStyle = {
      backgroundColor: `${color}18`,
      color: color,
      border: `1px solid ${color}40`,
    };
  }

  return (
    <span
      className={cn(
        'ds-chip',
        baseClass,
        size === 'sm' && 'text-[10px] px-1.5 py-0.5',
        className
      )}
      style={inlineStyle}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
