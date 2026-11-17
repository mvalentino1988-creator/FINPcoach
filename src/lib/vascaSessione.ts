import { useEffect, useState } from 'react';
import { VascaSession } from '../domain/cronometroVasca';

export const VASCA_SESSION_KEY = 'finp_vasca_session_v1';
export const VASCA_SESSION_EVENT = 'finp:vasca-session';
export const VASCA_VISTA_EVENT = 'finp:vasca-vista';

export function leggiSessioneVasca(): VascaSession | null {
  try {
    const raw = localStorage.getItem(VASCA_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as VascaSession;
    if (!s || !Array.isArray(s.lanes) || typeof s.stato !== 'string') return null;
    return s;
  } catch {
    return null;
  }
}

/** Notifica i listener (Regia) che la sessione cronometro è cambiata. */
export function notificaSessioneVasca(): void {
  try {
    window.dispatchEvent(new Event(VASCA_SESSION_EVENT));
  } catch {
    /* noop */
  }
}

/** Stato reattivo della sessione del cronometro (null se assente). */
export function useSessioneVasca(): VascaSession | null {
  const [s, setS] = useState<VascaSession | null>(() => leggiSessioneVasca());
  useEffect(() => {
    const upd = () => setS(leggiSessioneVasca());
    window.addEventListener(VASCA_SESSION_EVENT, upd);
    window.addEventListener('storage', upd);
    return () => {
      window.removeEventListener(VASCA_SESSION_EVENT, upd);
      window.removeEventListener('storage', upd);
    };
  }, []);
  return s;
}

/** Composizione bloccata mentre la sessione è in corso o ferma. */
export function sessioneBloccaRegia(s: VascaSession | null): boolean {
  return !!s && (s.stato === 'in_corso' || s.stato === 'ferma');
}

/** Cambia la vista interna della pagina Vasca (cronometro/regia). */
export function vaiAVistaVasca(vista: 'cronometro' | 'regia'): void {
  try {
    window.dispatchEvent(new CustomEvent(VASCA_VISTA_EVENT, { detail: vista }));
  } catch {
    /* noop */
  }
}
