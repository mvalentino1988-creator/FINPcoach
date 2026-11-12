import React, { useRef } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
  ariaLabel,
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const enabledIndexes = tabs
    .map((t, i) => (t.disabled ? -1 : i))
    .filter((i) => i >= 0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const pos = enabledIndexes.indexOf(index);
    if (pos === -1) return;
    let nextPos: number | null = null;
    if (e.key === 'ArrowRight') nextPos = (pos + 1) % enabledIndexes.length;
    if (e.key === 'ArrowLeft')
      nextPos = (pos - 1 + enabledIndexes.length) % enabledIndexes.length;
    if (e.key === 'Home') nextPos = 0;
    if (e.key === 'End') nextPos = enabledIndexes.length - 1;
    if (nextPos === null) return;
    e.preventDefault();
    const nextIndex = enabledIndexes[nextPos];
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto border-b border-outline-variant"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'inline-flex min-h-[48px] items-center gap-2 px-4 text-body-bold whitespace-nowrap transition-colors',
                'border-b-2 -mb-px',
                'focus-visible:outline-2 focus-visible:outline-offset-2',
                'disabled:opacity-50 disabled:pointer-events-none',
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  );
}
