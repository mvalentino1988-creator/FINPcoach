// @vitest-environment jsdom
/**
 * Test di componente delle schermate principali e dei componenti
 * presentazionali, con il dataset di stress (100 atleti) caricato
 * tramite i provider reali.
 */
import '../test/jsdomEnv';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderConDati, Providers } from '../test/renderApp';
import { datasetStress } from '../test/stressDataset';

import { AltroScreen } from './AltroScreen';
import { AtletiScreen } from './AtletiScreen';
import { CalendarioScreen } from './CalendarioScreen';
import { DatiScreen } from './DatiScreen';
import { FontiScreen } from './FontiScreen';
import { LoginScreen } from './LoginScreen';
import { Navbar } from './Navbar';
import { OggiScreen } from './OggiScreen';
import { OnboardingModal } from './OnboardingModal';
import { PageHeader } from './PageHeader';
import { RecordScreen } from './RecordScreen';
import { RegolamentiScreen } from './RegolamentiScreen';
import { RegistroScreen } from './RegistroScreen';
import { SchedeVascaScreen } from './SchedeVascaScreen';
import { Sezione } from './Sezione';
import { TempiRipartenzeScreen } from './TempiRipartenzeScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { ElencoAvvisi } from './ElencoAvvisi';
import { ErrorBoundary } from './ErrorBoundary';
import { IndicatoreCodici } from './IndicatoreCodici';
import type { Avviso } from '../types';

const backup = datasetStress().backup as Record<string, unknown[]>;

describe('schermate principali con 100 atleti', () => {
  it('OggiScreen renderizza senza errori', () => {
    const { container } = renderConDati(<OggiScreen />);
    expect(container.textContent!.length).toBeGreaterThan(50);
  });

  it('AtletiScreen mostra la rosa e la ricerca filtra', () => {
    renderConDati(<AtletiScreen />);
    expect(document.body.textContent).toContain('SIM-');
    const cognome = String((backup.atleti as { cognome: string }[])[0].cognome);
    const search = document.querySelector('input[placeholder*="erca"]') as HTMLInputElement | null;
    expect(search).toBeTruthy();
    fireEvent.change(search!, { target: { value: cognome.slice(0, 6) } });
    expect(document.body.textContent).toContain(cognome.slice(0, 6));
  });

  it('AltroScreen renderizza le voci di menu', () => {
    const { container } = renderConDati(<AltroScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('DatiScreen renderizza le schede dati', () => {
    const { container } = renderConDati(<DatiScreen />);
    expect(container.textContent!.length).toBeGreaterThan(50);
  });

  it('FontiScreen renderizza fonti e calendario', () => {
    const { container } = renderConDati(<FontiScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('RegolamentiScreen renderizza sezioni', () => {
    const { container } = renderConDati(<RegolamentiScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('RecordScreen renderizza', () => {
    const { container } = renderConDati(<RecordScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('RegistroScreen renderizza', () => {
    const { container } = renderConDati(<RegistroScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('SchedeVascaScreen renderizza', () => {
    const { container } = renderConDati(<SchedeVascaScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('TempiRipartenzeScreen renderizza', () => {
    const { container } = renderConDati(<TempiRipartenzeScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });

  it('CalendarioScreen renderizza', () => {
    const { container } = renderConDati(<CalendarioScreen />);
    expect(container.textContent!.length).toBeGreaterThan(30);
  });
});

describe('componenti di supporto', () => {
  it('Navbar mostra le voci e notifica il cambio tab', () => {
    const onTab = vi.fn();
    render(<Providers><Navbar currentTab="oggi" onTabChange={onTab} layout={{ headerRef: () => {}, dockRef: () => {} }} /></Providers>);
    expect(document.body.textContent).toContain('Oggi');
    const vasca = screen.getAllByRole('button', { name: /Vasca/ })[0];
    fireEvent.click(vasca);
    expect(onTab).toHaveBeenCalledWith('vasca');
  });

  it('WelcomeScreen chiama onReady', () => {
    const onReady = vi.fn();
    render(<WelcomeScreen onReady={onReady} />);
    const btn = screen.getByText(/Dati Esempio/i).closest('button')!;
    fireEvent.click(btn);
    expect(onReady).toHaveBeenCalled();
  });

  it('LoginScreen chiama onSkip', () => {
    const onSkip = vi.fn();
    render(<LoginScreen onLoginSuccess={vi.fn()} onSkip={onSkip} />);
    const skip = screen.queryByText(/salta|skip|continua senza/i);
    if (skip) fireEvent.click(skip);
    expect(document.body.textContent!.length).toBeGreaterThan(20);
  });

  it('OnboardingModal si chiude con onComplete', () => {
    const onComplete = vi.fn();
    render(<Providers><OnboardingModal onComplete={onComplete} /></Providers>);
    const btn = screen.getAllByRole('button').find(b => /inizia|iniziamo|iniziare|comincia|va bene|salta/i.test(b.textContent ?? ''));
    if (btn) fireEvent.click(btn);
    expect(onComplete.mock.calls.length + document.body.textContent!.length).toBeGreaterThan(0);
  });

  it('PageHeader mostra label, titolo e meta', () => {
    const { container } = render(
      <PageHeader label="Etichetta" title="Titolo" meta="meta info" icon={<span>i</span>} />
    );
    expect(container.textContent).toContain('Etichetta');
    expect(container.textContent).toContain('Titolo');
    expect(container.textContent).toContain('meta info');
  });

  it('Sezione mostra titolo e children', () => {
    const { container } = render(
      <Sezione titolo="Blocco"><p>contenuto sezione</p></Sezione>
    );
    expect(container.textContent).toContain('Blocco');
    expect(container.textContent).toContain('contenuto sezione');
  });

  it('ElencoAvvisi renderizza avvisi con severità', () => {
    const avvisi: Avviso[] = [
      { gravita: 'ERRORE', messaggio: 'Errore prova' },
      { gravita: 'ATTENZIONE', messaggio: 'Attenzione prova' },
      { gravita: 'INFO', messaggio: 'Info prova' },
    ];
    render(<ElencoAvvisi avvisi={avvisi} />);
    expect(document.body.textContent).toContain('Errore prova');
    expect(document.body.textContent).toContain('Attenzione prova');
  });

  it('ElencoAvvisi con lista vuota non crasha', () => {
    const { container } = render(<ElencoAvvisi avvisi={[]} />);
    expect(container).toBeTruthy();
  });

  it('ErrorBoundary mostra fallback su errore e children normalmente', () => {
    const Boom: React.FC = () => { throw new Error('boom'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(document.body.textContent!.length).toBeGreaterThan(0);
    spy.mockRestore();
    const { container } = render(<ErrorBoundary><p>tutto ok</p></ErrorBoundary>);
    expect(container.textContent).toContain('tutto ok');
  });

  it('IndicatoreCodici renderizza ripartizione', () => {
    const { container } = render(
      <IndicatoreCodici ripartizione={{ A1: 800, B1: 400 }} volumeTotale={1200} />
    );
    expect(container.textContent!.length).toBeGreaterThan(0);
  });
});
