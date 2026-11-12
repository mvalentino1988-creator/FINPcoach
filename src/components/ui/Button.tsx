import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:   'ds-btn-primary',
  secondary: 'ds-btn-secondary',
  ghost:     'ds-btn-ghost',
  danger:    'ds-btn-danger',
  icon:      'ds-btn-icon',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-[40px]',
  md: 'min-h-[48px]',
  lg: 'min-h-[56px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          variantClass[variant],
          sizeClass[size],
          'active:scale-[0.96] transition-all',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          loading && 'pointer-events-none opacity-70',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : icon ? (
          <span className="inline-flex items-center gap-2">
            {icon}
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
