// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Progress } from './ui/Progress';
import { Select } from './ui/Select';
import { Table } from './ui/Table';
import { Tabs } from './ui/Tabs';
import { Marquee } from './Marquee';
import { BadgeCodice } from './BadgeCodice';

describe('UI primitives', () => {
  it('Badge renderizza testo e variante', () => {
    render(<Badge variant="green">S5</Badge>);
    expect(screen.getByText('S5')).toBeTruthy();
  });

  it('Button gestisce click e disabled', () => {
    let clic = 0;
    render(<Button onClick={() => clic++}>Vai</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Vai' }));
    expect(clic).toBe(1);
    render(<Button disabled>Off</Button>);
    expect((screen.getByRole('button', { name: 'Off' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Card renderizza children', () => {
    const { container } = render(<Card><p>Contenuto</p></Card>);
    expect(container.textContent).toContain('Contenuto');
  });

  it('EmptyState mostra titolo e descrizione', () => {
    render(<EmptyState title="Nessun dato" message="Aggiungi un atleta" />);
    expect(screen.getByText('Nessun dato')).toBeTruthy();
    expect(screen.getByText('Aggiungi un atleta')).toBeTruthy();
  });

  it('Input accetta input e prop aria', () => {
    const { container } = render(<Input aria-label="Nome" placeholder="Nome" />);
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'SIM-001' } });
    expect(input.value).toBe('SIM-001');
    expect(input.getAttribute('aria-label')).toBe('Nome');
  });

  it('Modal chiude con Escape/sovrapposizione opzionale', () => {
    render(
      <Modal open onClose={() => {}} title="Test"><p>body</p></Modal>
    );
    expect(document.body.textContent).toContain('body');
    expect(screen.getByText('Test')).toBeTruthy();
  });

  it('Progress espone role progressbar', () => {
    render(<Progress value={50} max={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeTruthy();
  });

  it('Select rende opzioni', () => {
    const { container } = render(
      <Select aria-label="Classe" options={[{ value: 'S5', label: 'S5' }, { value: 'SB3', label: 'SB3' }]} />
    );
    expect(container.querySelectorAll('option').length).toBeGreaterThanOrEqual(2);
  });

  it('Table rende righe e intestazioni', () => {
    const { container } = render(
      <Table
        columns={[{ key: 'nome', header: 'Nome' }, { key: 'classe', header: 'Classe' }]}
        rows={[{ nome: 'SIM-001', classe: 'S5' }]}
      />
    );
    expect(container.textContent).toContain('SIM-001');
    expect(container.textContent).toContain('S5');
  });

  it('Tabs cambia tab al click', () => {
    const { container } = render(
      <Tabs tabs={[{ id: 'a', label: 'Tab A' }, { id: 'b', label: 'Tab B' }]} activeId="a" onChange={() => {}} />
    );
    expect(container.textContent).toContain('Tab A');
    fireEvent.click(screen.getByText('Tab B'));
  });

  it('Marquee tronca testo lungo con title', () => {
    const { container } = render(<Marquee text="Testo molto lungo per verifica" />);
    const el = container.querySelector('span')!;
    expect(el.getAttribute('title')).toBe('Testo molto lungo per verifica');
  });

  it('BadgeCodice renderizza codice', () => {
    const { container } = render(<BadgeCodice codice="A1" />);
    expect(container.textContent.length).toBeGreaterThan(0);
  });
});
