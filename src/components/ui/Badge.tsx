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

const zoneVarMap: Record<SwimZone, string> = {
  A1: 'var(--color-zone-a1)',
  A2: 'var(--color-zone-a2)',
  B1: 'var(--color-zone-b1)',
  B2: 'var(--color-zone-b2)',
  C1: 'var(--color-zone-c1)',
  C2: 'var(--color-zone-c2)',
  C3: 'var(--color-zone-c)', // alias: non esiste token zone-c3
  D:  'var(--color-zone-d)',
};

const acwrVarMap: Record<AcwrLevel, string> = {
  ok:         'var(--color-acwr-ok)',
  attenzione: 'var(--color-acwr-attenzione)',
  critico:    'var(--color-acwr-critico)',
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

  const semanticColor = acwrLevel
    ? acwrVarMap[acwrLevel]
    : zone
      ? zoneVarMap[zone]
      : null;

  const baseClass = semanticColor ? 'ds-chip' : variantClass[variant];
  const inlineStyle: React.CSSProperties | undefined = semanticColor
    ? {
        backgroundColor: `color-mix(in srgb, ${semanticColor} 10%, transparent)`,
        color: semanticColor,
        border: `1px solid color-mix(in srgb, ${semanticColor} 25%, transparent)`,
      }
    : undefined;

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
