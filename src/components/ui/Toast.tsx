import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastInput {
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: ToastInput | string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={20} />,
  error:   <AlertCircle size={20} />,
  info:    <Info size={20} />,
};

const variantClass: Record<ToastVariant, string> = {
  success: 'text-success',
  error:   'text-error',
  info:    'text-primary',
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput | string) => {
      const item: ToastItem =
        typeof input === 'string'
          ? { id: nextId++, variant: 'info', message: input }
          : { id: nextId++, variant: input.variant ?? 'info', ...input };
      setToasts((prev) => [...prev.slice(-3), item]);
      const timer = setTimeout(
        () => dismiss(item.id),
        item.duration ?? (item.variant === 'error' ? 6000 : 4000)
      );
      timers.current.set(item.id, timer);
    },
    [dismiss]
  );

  const content = (
    <div
      className="fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'ds-card-elevated pointer-events-auto flex items-start gap-3 px-4 py-3 animate-slide-up',
            t.variant === 'error' && 'border border-error/40'
          )}
        >
          <span className={cn('mt-0.5 shrink-0', variantClass[t.variant])}>
            {variantIcon[t.variant]}
          </span>
          <div className="flex-1 min-w-0">
            {t.title && (
              <p className="text-body-bold text-on-surface">{t.title}</p>
            )}
            <p className="text-body-sm text-on-surface-variant">{t.message}</p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="ds-btn-icon shrink-0"
            aria-label="Chiudi notifica"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(content, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve essere usato dentro <ToastProvider>');
  }
  return ctx;
}
