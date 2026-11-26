// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineStagione, GraficoVolumeSettimane } from './TimelineStagione';
import type { Gara, Macrociclo, Mesociclo, Microciclo, Stagione } from '../types';

const stagione: Stagione = { id: 1, nome: 'Stagione test', inizio: '2026-09-01', fine: '2027-06-30', vascaMetri: 25 };
const macro: Macrociclo[] = [
  { id: 1, stagioneId: 1, nome: 'Preparazione', inizio: '2026-09-01', fine: '2027-03-31', obiettivo: 'base' },
];
const meso: Mesociclo[] = [
  { id: 1, macrocicloId: 1, fase: 'PREPARAZIONE_GENERALE', inizio: '2026-09-01', fine: '2026-10-31' },
];
const microBase = { mesocicloId: 1, note: '', bloccato: false };
const micro: Microciclo[] = [
  { ...microBase, id: 1, inizio: '2026-09-07', fine: '2026-09-13', tipo: 'ADATTAMENTO', sedutePreviste: 3, volumeTargetMetri: 9000 },
  { ...microBase, id: 2, inizio: '2026-09-14', fine: '2026-09-20', tipo: 'CARICO', sedutePreviste: 4, volumeTargetMetri: 12000 },
  { ...microBase, id: 3, inizio: '2026-09-21', fine: '2026-09-27', tipo: 'CARICO', sedutePreviste: 4, volumeTargetMetri: 16000 },
];
const gare: Gara[] = [
  { id: 1, stagioneId: 1, nome: 'Coppa Italiana', dal: '2026-11-20', al: '2026-11-22', luogo: 'Roma', prioritaria: true },
];

describe('TimelineStagione', () => {
  it('renderizza titolo, macro e marca la linea oggi', () => {
    render(<TimelineStagione stagione={stagione} macro={macro} meso={meso} micro={micro} gare={gare} oggi="2026-11-26" />);
    expect(screen.getByText('Timeline stagionale')).toBeTruthy();
    expect(screen.getByText('Preparazione')).toBeTruthy();
    expect(screen.getByText('oggi')).toBeTruthy();
  });

  it('invia le selezioni ai callback', () => {
    const onMacro = vi.fn();
    const onMeso = vi.fn();
    const onMicro = vi.fn();
    render(<TimelineStagione stagione={stagione} macro={macro} meso={meso} micro={micro} gare={gare} oggi="2026-09-10" onSelezionaMacro={onMacro} onSelezionaMeso={onMeso} onSelezionaMicro={onMicro} />);
    fireEvent.click(screen.getByTitle(/^Preparazione ·/));
    expect(onMacro).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByLabelText('Preparazione generale'));
    expect(onMeso).toHaveBeenCalledWith(1);
  });

  it('con stagione senza macro/meso/micro/gare renderizza solo intestazione e linea oggi', () => {
    render(<TimelineStagione stagione={stagione} macro={[]} meso={[]} micro={[]} gare={[]} oggi="2026-09-10" />);
    expect(screen.getByText('Timeline stagionale')).toBeTruthy();
    expect(screen.getByText('oggi')).toBeTruthy();
  });
});

describe('GraficoVolumeSettimane', () => {
  it('renderizza le barre e segnala il salto >20%', () => {
    render(<GraficoVolumeSettimane micro={micro} />);
    expect(screen.getByText('Volume settimanale')).toBeTruthy();
    // terza settimana CARICO: 16000/4 vs 12000/4 = +33% -> flag errore
    expect(document.querySelectorAll('.bg-acwr-critico').length).toBeGreaterThan(0);
  });

  it('restituisce null senza microcicli', () => {
    const { container } = render(<GraficoVolumeSettimane micro={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
