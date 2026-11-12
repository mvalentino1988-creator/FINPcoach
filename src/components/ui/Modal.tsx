import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  className?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClass: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  full: 'max-w-full',
};

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  className,
  children,
  footer,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, handleEscape]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'bg-surface-container-lowest rounded-2xl shadow-float border border-outline-variant animate-slide-up w-full',
          sizeClass[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-title-md text-on-surface">{title}</h2>
            <button
              onClick={onClose}
              className="ds-btn-icon"
              aria-label="Chiudi"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-4 pb-4">{children}</div>
        {footer && (
          <div className="px-4 pb-4 pt-2 border-t border-outline-variant">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
