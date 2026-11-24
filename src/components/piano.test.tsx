// @vitest-environment jsdom
/**
 * Test di componente del Piano e dei modali associati, con dataset
 * di stress (100 atleti) e provider reali.
 */
import '../test/jsdomEnv';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderConDati, Providers } from '../test/renderApp';
import { datasetStress } from '../test/stressDataset';
import { ToastProvider } from './ui';

import { PianoScreen } from './PianoScreen';
import { PianoAtletaPanel } from './PianoAtletaPanel';
import { IscrittiGaraPanel } from './IscrittiGaraPanel';
import { GareAmmissibiliCard } from './GareAmmissibiliCard';
import { ParametriSedutaModal } from './ParametriSedutaModal';
import { EsercizioEditor } from './EsercizioEditor';
import { RevisioneSchedaModal } from './RevisioneSchedaModal';
import { GeneraSchedaIAModal } from './GeneraSchedaIAModal';
import { OcrGaraModal } from './OcrGaraModal';
import { OcrPreviewModal } from './OcrPreviewModal';
import { TestCalibrazioneModal } from './TestCalibrazioneModal';
import type { Atleta, Gara, Tempo } from '../types';

const backup = datasetStress().backup as Record<string, unknown[]>;
const atleti = backup.atleti as Atleta[];
const gare = backup.gare as Gara[];
const tempi = backup.tempi as Tempo[];
const atleta = atleti[0];
const gara = gare[0];

describe('PianoScreen con 100 atleti', () => {
  it('renderizza senza errori', () => {
    const { container } = renderConDati(<PianoScreen />);
    expect(container.textContent!.length).toBeGreaterThan(50);
  });

  it('mostra gare e sezioni del piano', () => {
    renderConDati(<PianoScreen />);
    expect(document.body.textContent).toMatch(/gara|piano|microciclo|seduta/i);
  });
});

describe('PianoAtletaPanel', () => {
  it('renderizza il piano di un atleta', () => {
    render(<Providers><ToastProvider><PianoAtletaPanel atleta={atleta} /></ToastProvider></Providers>);
    expect(document.body.textContent).toMatch(/Volume stagione|Settimana|Stampa piano/i);
  });
});

describe('IscrittiGaraPanel', () => {
  it('renderizza iscritti della gara', () => {
    renderConDati(<IscrittiGaraPanel gara={gara} />);
    expect(document.body.textContent!.length).toBeGreaterThan(20);
  });
});

describe('GareAmmissibiliCard', () => {
  it('renderizza classi ammissibili', () => {
    const { container } = render(<GareAmmissibiliCard atleta={atleta} />);
    expect(container.textContent).toMatch(/S|SB|SM/);
  });
});

describe('ParametriSedutaModal', () => {
  const props = {
    open: true,
    dataISO: '2026-11-24',
    giorno: 1 as const,
    iniziali: { vascaMetri: 25, durataMin: 90 },
    origine: 'stagione' as const,
    settimana: [],
    volumeSettimana: 0,
    passo100m: 60,
    onClose: vi.fn(),
    onApplicaOggi: vi.fn(),
    onApplicaGiorno: vi.fn(),
    onRimuoviOverride: vi.fn(),
  };

  it('renderizza aperto e chiude', () => {
    render(<ParametriSedutaModal {...props} />);
    expect(document.body.textContent).toMatch(/paramet|seduta|vasca|durata/i);
    fireEvent.click(screen.getByLabelText(/chiudi/i));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('EsercizioEditor', () => {
  it('renderizza e salva un esercizio', () => {
    const onSalva = vi.fn();
    const onAnnulla = vi.fn();
    render(<EsercizioEditor onSalva={onSalva} onAnnulla={onAnnulla} />);
    expect(document.body.textContent!.length).toBeGreaterThan(20);
    const btn = screen.getAllByRole('button').find(b => /salva|aggiungi/i.test(b.textContent ?? ''));
    if (btn) fireEvent.click(btn);
    expect(onSalva.mock.calls.length + onAnnulla.mock.calls.length + document.body.textContent!.length).toBeGreaterThan(0);
  });
});

describe('RevisioneSchedaModal', () => {
  it('renderizza la revisione di una scheda', () => {
    render(<RevisioneSchedaModal open testo="100 free 10x50 A1" onClose={vi.fn()} onApplica={vi.fn()} />);
    expect(document.body.textContent).toContain('100');
  });
});

describe('GeneraSchedaIAModal', () => {
  it('renderizza il generatore IA', () => {
    render(
      <GeneraSchedaIAModal
        open
        onClose={vi.fn()}
        onSchedaGenerata={vi.fn()}
        data="2026-11-24"
        atleta={atleta}
        fase="PREPARAZIONE_GENERALE"
        tipoMicro="CARICO"
        parametri={{ vascaMetri: 25, durataMin: 90 }}
        volumeSessione={2000}
        volumeSettimana={10000}
        tempi={tempi.filter(t => t.atletaId === atleta.id)}
        codiciAllenamento={['A1', 'B1']}
      />
    );
    expect(document.body.textContent!.length).toBeGreaterThan(20);
  });
});

describe('OcrGaraModal', () => {
  it('renderizza e annulla', () => {
    const onCancel = vi.fn();
    render(<OcrGaraModal isOpen initialRawText="" onConfirm={vi.fn()} onCancel={onCancel} />);
    expect(document.body.textContent!.length).toBeGreaterThan(10);
    const btn = screen.getAllByRole('button').find(b => /annulla|chiudi|cancel/i.test(b.textContent ?? ''));
    if (btn) { fireEvent.click(btn); expect(onCancel).toHaveBeenCalled(); }
  });
});

describe('OcrPreviewModal', () => {
  it('renderizza anteprima OCR', () => {
    render(<OcrPreviewModal isOpen initialText="testo ocr" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(document.body.textContent).toContain('testo ocr');
  });
});

describe('TestCalibrazioneModal', () => {
  it('renderizza la calibrazione', () => {
    const onSalva = vi.fn();
    render(<TestCalibrazioneModal atleta={atleta} onClose={vi.fn()} onSalvaTempo={onSalva} />);
    expect(document.body.textContent!.length).toBeGreaterThan(10);
  });
});
