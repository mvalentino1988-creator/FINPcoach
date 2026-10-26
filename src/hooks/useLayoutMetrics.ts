import { RefCallback, useCallback, useEffect, useState } from 'react';

/**
 * Misure REALI di header e dock, pubblicate come custom property CSS
 * (`--header-h`, `--dock-h`) sul documentElement.
 *
 * Perché serve:
 * - l'header sticky non ha altezza fissa (safe-area notch, font di sistema,
 *   rotazione, zoom utente): il padding del contenuto deve seguirlo;
 * - il dock mobile esiste solo sotto 640px: su schermi grandi deve valere 0,
 *   altrimenti il contenuto resta "spinto" e inutilizzabile;
 * - il classico `h-14` + `pt-header` hardcoded nascondeva l'ultima riga di
 *   qualsiasi schermata sotto il dock.
 *
 * I ref sono callback: l'header/dock possono comparire dopo il primo render
 * (es. dopo la schermata di benvenuto) e la misura parte comunque.
 */
export interface LayoutMetrics {
  headerRef: RefCallback<HTMLElement>;
  dockRef: RefCallback<HTMLElement>;
}

const HEADER_VAR = '--header-h';
const DOCK_VAR = '--dock-h';

export function useLayoutMetrics(): LayoutMetrics {
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);

  const headerRef = useCallback((el: HTMLElement | null) => setHeaderEl(el), []);
  const dockRef = useCallback((el: HTMLElement | null) => setDockEl(el), []);

  useEffect(() => {
    const root = document.documentElement;

    const measure = () => {
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
      let dockH = 0;
      if (dockEl) {
        const style = window.getComputedStyle(dockEl);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          dockH = dockEl.getBoundingClientRect().height;
        }
      }

      root.style.setProperty(HEADER_VAR, `${Math.round(headerH)}px`);
      root.style.setProperty(DOCK_VAR, `${Math.round(dockH)}px`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (headerEl) observer.observe(headerEl);
    if (dockEl) observer.observe(dockEl);

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    // I font di sistema possono cambiare l'altezza delle righe: ri-misura dopo il caricamento.
    const timer = window.setTimeout(measure, 400);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.clearTimeout(timer);
    };
  }, [headerEl, dockEl]);

  return { headerRef, dockRef };
}
