import { useEffect, useState } from 'react';

// Legge una variabile CSS del design system (si adatta a chiaro/scuro)
export const chartVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

// Incrementa quando cambia la classe .dark su <html>: forza il ridisegno dei canvas
export const useThemeTick = (): number => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setTick(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return tick;
};
