/**
 * Helper per i test di componente: seed del dataset di stress in
 * localStorage e wrapper con i provider reali (AppProvider +
 * VascaSessionProvider), così i componenti girano con il wiring vero.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '../data/AppContext';
import { VascaSessionProvider } from '../data/VascaSessionContext';
import { FINPStorage } from '../data/storage';
import { datasetStress } from './stressDataset';

let seminato = false;

/** Carica il dataset stress-100 in localStorage (una volta per file di test). */
export function seedStressLive(): void {
  if (seminato) return;
  localStorage.clear();
  localStorage.setItem('finp_mode', 'live');
  localStorage.setItem('finp_onboarded', '1');
  const r = FINPStorage.importBackup(datasetStress().json);
  if (!r.ok) throw new Error(`Seed stress fallito: ${r.errors.join(' | ')}`);
  seminato = true;
}

/** Forza il reseed (dopo test che mutano i dati). */
export function reseedStressLive(): void {
  seminato = false;
  seedStressLive();
}

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  seedStressLive();
  return (
    <AppProvider>
      <VascaSessionProvider>{children}</VascaSessionProvider>
    </AppProvider>
  );
};

/** Render con dataset di stress caricato e provider reali. */
export function renderConDati(ui: React.ReactElement) {
  return render(<Providers>{ui}</Providers>);
}
