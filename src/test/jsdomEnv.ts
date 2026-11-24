/**
 * Polyfill delle API browser assenti in jsdom, necessari ai test di
 * componente (importare per side-effect IN TESTA al file di test).
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;

  // Define del build Vite (versione app) non presente in jsdom.
  (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.0.0-test';
  (globalThis as Record<string, unknown>).__APP_BUILD_DATE__ = '2026-01-01';

  if (!w.matchMedia) {
    w.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!w.ResizeObserver) {
    w.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!w.IntersectionObserver) {
    w.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  const el = Element.prototype as unknown as Record<string, unknown>;
  for (const m of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture']) {
    if (typeof el[m] !== 'function') el[m] = () => false;
  }
  if (typeof el.scrollTo !== 'function') el.scrollTo = () => {};

  const nav = window.navigator as unknown as Record<string, unknown>;
  if (nav.vibrate == null) nav.vibrate = () => true;
  if (nav.share == null) nav.share = () => Promise.reject(new Error('no share'));
  if (nav.clipboard == null) {
    nav.clipboard = { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') };
  }

  if (!w.print) w.print = () => {};
  if (!w.requestAnimationFrame) {
    w.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
    w.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  const url = w.URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown } | undefined;
  if (url && url.createObjectURL == null) {
    url.createObjectURL = () => 'blob:mock';
    url.revokeObjectURL = () => {};
  }

  // Canvas 2D: contesto fittizio che assorbe disegno e misure testuali.
  if (window.HTMLCanvasElement && !window.HTMLCanvasElement.prototype.getContext) {
    // jsdom ha getContext che ritorna null: lo sovrascriviamo con un proxy.
  }
  if (window.HTMLCanvasElement) {
    window.HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
      const gradient = { addColorStop: () => {} };
      const target = {
        canvas: this,
        measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        createPattern: () => ({}),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        getLineDash: () => [],
      };
      return new Proxy(target, {
        get(t, p) {
          if (p in t) return (t as Record<string | symbol, unknown>)[p];
          return () => {};
        },
        set() { return true; },
      });
    } as unknown as typeof window.HTMLCanvasElement.prototype.getContext;
  }
}
