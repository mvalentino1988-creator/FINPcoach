import React from 'react';
import { cn } from '../../lib/cn';

export type CardVariant = 'default' | 'flat' | 'elevated' | 'primary' | 'tertiary';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const variantClass: Record<CardVariant, string> = {
  default:  'ds-card',
  flat:     'ds-card-flat',
  elevated: 'ds-card-elevated',
  primary:  'ds-card-primary',
  tertiary: 'ds-card-tertiary',
};

const paddingClass: Record<CardPadding, string> = {
  none: 'p-0',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
}: CardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={cn(
        variantClass[variant],
        paddingClass[padding],
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
