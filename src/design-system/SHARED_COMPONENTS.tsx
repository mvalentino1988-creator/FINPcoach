/**
 * FINPcoach Shared UI Components
 * ===============================
 * Reusable components for all screens.
 * Ensures consistent design across the app.
 */

import React from 'react';
import { ChevronLeft, ChevronRight, X, MoreHorizontal, CloudDownload } from 'lucide-react';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, LAYOUT } from './DESIGN_TOKENS';
import { Marquee } from '../components/Marquee';

// ============================================================================
// SCREEN HEADER
// ============================================================================
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  return (
    <header
      className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xl"
      style={{
        paddingTop: 'var(--safe-top, 0px)',
        height: `calc(${LAYOUT.headerHeight} + var(--safe-top, 0px))`,
      }}
    >
      <div className="h-full flex items-center justify-between px-4" style={{ paddingLeft: 'max(16px, var(--safe-top, 0px))' }}>
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={onBack}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:scale-95 transition"
              aria-label="Indietro"
            >
              <ChevronLeft size={20} className="text-on-surface" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div
              style={{
                ...TYPOGRAPHY.headlineMedium,
                color: COLORS.onSurface,
              }}
            >
              <Marquee text={title} />
            </div>
            {subtitle && (
              <div
                style={{
                  ...TYPOGRAPHY.labelSmall,
                  color: COLORS.onSurfaceVariant,
                  marginTop: '2px',
                }}
              >
                <Marquee text={subtitle} />
              </div>
            )}
          </div>
        </div>

        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
};

// ============================================================================
// HERO CARD
// ============================================================================
interface HeroCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  rightAction?: React.ReactNode;
  accent?: 'primary' | 'secondary' | 'tertiary';
}

export const HeroCard: React.FC<HeroCardProps> = ({
  title,
  subtitle,
  badge,
  rightAction,
  accent = 'primary',
}) => {
  const accentColors = {
    primary: { bg: COLORS.primaryContainer, text: COLORS.onPrimary },
    secondary: { bg: COLORS.secondaryContainer, text: COLORS.onSecondary },
    tertiary: { bg: COLORS.tertiaryContainer, text: COLORS.onTertiary },
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-4 border border-slate-200/60"
      style={{
        backgroundColor: COLORS.surfaceContainerLow,
        boxShadow: SHADOWS.card,
      }}
    >
      {/* Decorative circle - positioned to NOT clip content */}
      <div
        className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full opacity-30 pointer-events-none"
        style={{
          backgroundColor: accentColors[accent].bg,
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2
            className="truncate"
            style={{
              ...TYPOGRAPHY.headlineLarge,
              color: COLORS.onSurface,
              lineHeight: '1.2',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="mt-1"
              style={{
                ...TYPOGRAPHY.bodyMedium,
                color: COLORS.onSurfaceVariant,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge}
          {rightAction}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// SECTION CARD
// ============================================================================
interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  badge?: number | string;
  rightAction?: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  children,
  badge,
  rightAction,
  className = '',
}) => {
  return (
    <section
      className={`rounded-2xl border border-slate-200/60 ${className}`}
      style={{
        backgroundColor: COLORS.surfaceContainerLowest,
        boxShadow: SHADOWS.card,
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/40">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="truncate"
            style={{
              ...TYPOGRAPHY.headlineSmall,
              color: COLORS.onSurface,
            }}
          >
            {title}
          </h3>
          {badge && (
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: COLORS.primaryContainer,
                color: COLORS.onPrimary,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
};

// ============================================================================
// CHIP / BADGE
// ============================================================================
interface ChipProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  onClick,
}) => {
  const variants: Record<'primary' | 'secondary' | 'tertiary' | 'neutral' | 'outline', { bg: string; text: string; border?: string }> = {
    primary: { bg: COLORS.primary, text: COLORS.onPrimary },
    secondary: { bg: COLORS.secondary, text: COLORS.onSecondary },
    tertiary: { bg: COLORS.tertiary, text: COLORS.onTertiary },
    neutral: { bg: COLORS.surfaceContainer, text: COLORS.onSurfaceVariant },
    outline: { bg: 'transparent', text: COLORS.onSurfaceVariant, border: `1px solid ${COLORS.outline}` },
  };

  const sizes = {
    sm: { padding: '4px 8px', fontSize: TYPOGRAPHY.labelSmall.fontSize },
    md: { padding: '6px 12px', fontSize: TYPOGRAPHY.labelMedium.fontSize },
    lg: { padding: '8px 16px', fontSize: TYPOGRAPHY.labelLarge.fontSize },
  };

  const style = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider transition active:scale-95"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: style.border || 'none',
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        minHeight: LAYOUT.touchTarget,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
};

// ============================================================================
// STAT TILE
// ============================================================================
interface StatTileProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, icon, trend = 'neutral' }) => {
  return (
    <div
      className="rounded-xl p-3 border border-slate-200/60"
      style={{
        backgroundColor: COLORS.surfaceContainerLowest,
        boxShadow: SHADOWS.card,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="uppercase tracking-wider"
          style={{
            ...TYPOGRAPHY.labelSmall,
            color: COLORS.onSurfaceVariant,
          }}
        >
          {label}
        </span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <div
        className="tabular-nums"
        style={{
          ...TYPOGRAPHY.headlineMedium,
          color: COLORS.primary,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {value}
      </div>
    </div>
  );
};

// ============================================================================
// BUTTONS
// ============================================================================
interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const PrimaryButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  icon,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-95 ${className}`}
      style={{
        backgroundColor: disabled ? COLORS.surfaceContainer : COLORS.primaryContainer,
        color: disabled ? COLORS.onSurfaceVariant : COLORS.onPrimary,
        minHeight: LAYOUT.touchTarget,
        padding: `0 ${SPACING.lg}`,
        boxShadow: !disabled ? SHADOWS.primarySm : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const SecondaryButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  icon,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-95 ${className}`}
      style={{
        backgroundColor: disabled ? COLORS.surfaceContainer : COLORS.surfaceContainerHigh,
        color: disabled ? COLORS.onSurfaceVariant : COLORS.onSurface,
        minHeight: LAYOUT.touchTarget,
        padding: `0 ${SPACING.lg}`,
        border: `1px solid ${COLORS.outline}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

// ============================================================================
// LIST ROW
// ============================================================================
interface ListRowProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  right,
  icon,
  onClick,
  badge,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition active:scale-98 text-left"
      style={{
        backgroundColor: COLORS.surfaceContainerLowest,
        border: `1px solid ${COLORS.outlineVariant}`,
        minHeight: LAYOUT.touchTarget,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4
            className="truncate"
            style={{
              ...TYPOGRAPHY.bodyMedium,
              fontWeight: '600',
              color: COLORS.onSurface,
            }}
          >
            {title}
          </h4>
          {badge}
        </div>
        {subtitle && (
          <p
            className="truncate"
            style={{
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.onSurfaceVariant,
              marginTop: '2px',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {right && <span className="shrink-0">{right}</span>}
    </button>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed"
      style={{
        backgroundColor: COLORS.surfaceContainerLow,
        borderColor: COLORS.outlineVariant,
      }}
    >
      {icon && (
        <div
          className="mb-4"
          style={{ color: COLORS.outline, fontSize: '48px' }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          ...TYPOGRAPHY.headlineMedium,
          color: COLORS.onSurface,
          marginBottom: SPACING.sm,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            ...TYPOGRAPHY.bodyMedium,
            color: COLORS.onSurfaceVariant,
            maxWidth: '320px',
            marginBottom: SPACING.lg,
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// ============================================================================
// CLOUD DOWNLOAD ACTION (consistent across screens)
// ============================================================================
export const CloudDownloadAction: React.FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = 'Backup',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition active:scale-95"
      style={{
        backgroundColor: COLORS.surfaceContainer,
        color: COLORS.primary,
        border: `1px solid ${COLORS.outlineVariant}`,
        minHeight: '40px',
      }}
      title="Gestione Dati & Backup"
    >
      <CloudDownload size={16} className="shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
