/**
 * Test dei servizi di dominio non coperti da file dedicati:
 * casi tipici, limiti e input non validi.
 */
import { describe, expect, it, vi } from 'vitest';
import { datasetStress } from '../test/stressDataset';

vi.mock('./ocrService', () => ({
  OCRService: {
    riconosciTestoDaImmagine: vi.fn()
      .mockRejectedValueOnce(new Error('OCR non disponibile'))
      .mockResolvedValueOnce('testo estratto'),
  },
}));

// Stub LocalStorage per l'ambiente node.
function storageMemoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}
(globalThis as Record<string, unknown>).localStorage = storageMemoria();

import { AutoUpdateService } from './autoUpdateService';
import { BiomechanicsEngine } from './biomechanicsEngine';
import { CalcoloScienzaNuoto, livelloACWR, ACWR_SOTTO_CARICO, ACWR_ATTENZIONE, ACWR_ELEVATO } from './calcoloCSS';
import { CalcoloRitmiRipartenze } from './calcoloRitmiRipartenze';
import { CalendarioService, validaEventoCalendario, importaCalendarioJson, aggiungiEventoManuale } from './calendarioService';
import { CalibrazioneAtletaService } from './calibrazioneAtleta';
import { ClassiSportive } from './classiSportive';
import { Festivita } from './festivita';
import { FINPSpecialistAI } from './finpAnalisiMedica';
import { GestioneTemplate } from './gestioneTemplate';
import { HydrodynamicsEngine } from './hydrodynamicsEngine';
import { OcrWeb } from './ocrWeb';
import { OcrWorkoutStandardizer } from './ocrWorkoutStandardizer';
import { ParaSwimmingViewModel } from './paraSwimmingViewModel';
import { PuntiTabellariService } from './puntiTabellariService';
import { Riepilogo } from './riepilogo';
import { RilevamentoLivello } from './rilevamentoLivello';
import { AtletaValidator, PianoValidator } from './validatori';
import type { Atleta, Gara, Microciclo, Stagione, Tempo } from '../types';

const backup = datasetStress().backup as Record<string, unknown[]>;
const atleti = backup.atleti as Atleta[];
const tempi = backup.tempi as Tempo[];
const gare = backup.gare as Gara[];
const micro = backup.microcicli as Microciclo[];
const stagione = backup.stagione as unknown as Stagione;
const atleta = atleti[0];

describe('autoUpdateService', () => {
  it('verificaAggiornamentiAutonomi senza endpoint remoto', async () => {
    const s = await AutoUpdateService.verificaAggiornamentiAutonomi(true);
    expect(typeof s.hasUpdate).toBe('boolean');
    expect(typeof s.messaggio).toBe('string');
  });
});

describe('calcoloCSS', () => {
  it('livelloACWR copre tutte le soglie', () => {
    expect(livelloACWR(0.5)).toBe('sotto-allenamento');
    expect(livelloACWR(1.0)).toBe('ottimale');
    expect(livelloACWR(ACWR_ATTENZIONE)).toBe('ottimale');
    expect(livelloACWR(ACWR_ATTENZIONE + 0.01)).toBe('attenzione');
    expect(livelloACWR(ACWR_ELEVATO)).toBe('attenzione');
    expect(livelloACWR(ACWR_ELEVATO + 0.01)).toBe('elevato');
    expect(ACWR_SOTTO_CARICO).toBeLessThan(ACWR_ATTENZIONE);
  });

  it('calcolaCSS con input valido e limite', () => {
    const r = CalcoloScienzaNuoto.calcolaCSS(28000, 7000); // 280" e 70"
    expect(r).not.toBeNull();
    expect(r!.passo100mCentesimi).toBeGreaterThan(0);
    expect(CalcoloScienzaNuoto.calcolaCSS(7000, 28000)).toBeNull(); // delta <= 0
    expect(CalcoloScienzaNuoto.calcolaCSS(0, 0)).toBeNull();
  });

  it('calcolaACWR senza storico usa il carico corrente', () => {
    const r = CalcoloScienzaNuoto.calcolaACWR(1000, []);
    expect(r).toBeTruthy();
  });
});

describe('calcoloRitmiRipartenze', () => {
  it('calcolaTabellaRitmi restituisce tutti i codici', () => {
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(atleta.id, 7000, 'STILE_LIBERO', 25, 6500);
    expect(Object.keys(t.ritmi ?? t)).toEqual(expect.arrayContaining(['A1', 'B1', 'C1', 'D']));
  });

  it('parseImportaTempi tollera righe vuote e non valide', () => {
    const out = CalcoloRitmiRipartenze.parseImportaTempi('01:10.50\n\nnon valido\n2:05.00');
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('calendarioService', () => {
  it('meta, eventi e filtri base', () => {
    expect(CalendarioService.meta()).toBeTruthy();
    expect(Array.isArray(CalendarioService.eventi())).toBe(true);
    expect(Array.isArray(CalendarioService.discipline())).toBe(true);
    expect(CalendarioService.statoAggiornamento('2026-01-01')).toBeTruthy();
    expect(Array.isArray(CalendarioService.prossimi('2026-01-01'))).toBe(true);
  });

  it('validaEventoCalendario rifiuta input non validi', () => {
    expect(validaEventoCalendario(null).length).toBeGreaterThan(0);
    expect(validaEventoCalendario({ nome: 'X' }).length).toBeGreaterThan(0);
    expect(validaEventoCalendario({ titolo: 'Trofeo', dal: '2026-06-01', al: '2026-06-02', disciplina: 'nuoto' })).toEqual([]);
  });

  it('aggiungiEventoManuale aggiunge e persiste evento valido', () => {
    const ev = aggiungiEventoManuale({ titolo: 'Evento test', dal: '2026-06-01', al: '2026-06-01', disciplina: 'nuoto', luogo: '', regione: '', tipologia: '', prioritaria: false });
    expect(ev).not.toBeNull();
    expect(ev!.id).toBeTruthy();
    expect(aggiungiEventoManuale({ titolo: '', dal: 'x', al: 'y' } as never)).toBeNull();
  });

  it('importaCalendarioJson rifiuta JSON corrotto', () => {
    const r = importaCalendarioJson('{non-json');
    expect(r).toBeTruthy();
    const ok = importaCalendarioJson(JSON.stringify([{ titolo: 'T', dal: '2026-01-01', al: '2026-01-02', disciplina: 'nuoto' }]));
    expect(ok.ok).toBe(true);
  });
});

describe('calibrazioneAtleta', () => {
  it('calibra con e senza tempi', () => {
    const conTempi = CalibrazioneAtletaService.calibra(atleta, tempi.filter(t => t.atletaId === atleta.id), []);
    expect(conTempi.passo100mCentesimi).toBeGreaterThan(0);
    const senza = CalibrazioneAtletaService.calibra(atleta, [], []);
    expect(senza.passo100mCentesimi).toBeGreaterThan(0);
  });
});

describe('classiSportive', () => {
  it('valida classi tipiche e invalide', () => {
    expect(ClassiSportive.valida(5).length).toBe(0);
    expect(ClassiSportive.valida(0).length).toBeGreaterThan(0);
    expect(ClassiSportive.valida(99).length).toBeGreaterThan(0);
    expect(ClassiSportive.valida(5, 3, 7).length).toBe(0);
  });
});

describe('festivita', () => {
  it('calcola Pasqua per anni noti', () => {
    expect(Festivita.pasqua(2024)).toBe('2024-03-31');
    expect(Festivita.pasqua(2025)).toBe('2025-04-20');
  });

  it('perStagione restituisce chiusure', () => {
    expect(Array.isArray(Festivita.perStagione(stagione))).toBe(true);
  });
});

describe('finpAnalisiMedica', () => {
  it('analizza condizioni tipiche e vuote', () => {
    const r = FINPSpecialistAI.analizza('Paraplegia', '', 30);
    expect(r).toBeTruthy();
    const vuoto = FINPSpecialistAI.analizza('', '');
    expect(vuoto).toBeTruthy();
    expect(FINPSpecialistAI.flagMedici('testo qualsiasi')).toBeTruthy();
  });
});

describe('gestioneTemplate', () => {
  it('template: carica, aggiungi, usa, elimina', () => {
    GestioneTemplate.caricaTemplate();
    const t = GestioneTemplate.aggiungiTemplate({
      nome: 'Test', descrizione: 'desc', categoria: 'TECNICA',
      serie: [{ nome: 's1', ripetizioni: 4, metri: 50, recupero: '30s', note: '' }],
      attrezzi: [],
    } as never);
    expect(t).toBeTruthy();
    GestioneTemplate.usaTemplate((t as { id: string }).id);
    GestioneTemplate.eliminaTemplate((t as { id: string }).id);
    expect(Array.isArray(GestioneTemplate.getTemplate())).toBe(true);
    expect(GestioneTemplate.calcolaMetriTotali([])).toBe(0);
  });
});

describe('hydrodynamicsEngine', () => {
  it('calcola forze e potenze con valori limite', () => {
    expect(HydrodynamicsEngine.calcolaForzaResistente(30, 1.5)).toBeCloseTo(67.5);
    expect(HydrodynamicsEngine.calcolaForzaResistente(30, 0)).toBe(0);
    expect(HydrodynamicsEngine.calcolaPotenzaIntraCiclo(30, 1.5, 0.5)).toBeGreaterThan(0);
    expect(HydrodynamicsEngine.calcolaAreaResistenza(30, 1.8)).toBeGreaterThan(0);
    expect(Array.isArray(HydrodynamicsEngine.benchmarkRecord('ITALIA' as never, 'S10', 'STILE_LIBERO', 100, 0.5))).toBe(true);
  });
});

describe('ocrWeb / ocrWorkoutStandardizer / paraSwimmingViewModel', () => {
  it('OcrWeb restituisce stringa vuota su errore e testo su successo', async () => {
    expect(await OcrWeb.riconosciTestoDaImmagine(new Blob(['x']))).toBe('');
    expect(await OcrWeb.riconosciTestoDaImmagine(new Blob(['y']))).toBe('testo estratto');
  });

  it('standardizza testo OCR', () => {
    const out = OcrWorkoutStandardizer.standardizzaEsepara('Cognome 10x50', atleti);
    expect(Array.isArray(out)).toBe(true);
    expect(typeof OcrWorkoutStandardizer.formattaStandard('testo')).toBe('string');
  });

  it('paraSwimmingViewModel persiste e filtra', () => {
    ParaSwimmingViewModel.savePerformances([]);
    expect(Array.isArray(ParaSwimmingViewModel.getPerformances())).toBe(true);
    const r = ParaSwimmingViewModel.checkAndFetchMonthlyData();
    expect(typeof r.refreshed).toBe('boolean');
    expect(Array.isArray(ParaSwimmingViewModel.getFilteredPerformances(null, 'STILE_LIBERO', 100))).toBe(true);
  });
});

describe('puntiTabellariService / riepilogo / rilevamentoLivello / validatori', () => {
  it('punti tabellari con gara e input limite', () => {
    expect(PuntiTabellariService.calcolaPunti(9000, 5000).punti).toBeGreaterThan(0);
    expect(PuntiTabellariService.calcolaPunti(0, 5000).punti).toBe(0);
    expect(PuntiTabellariService.calcolaTempoTargetPerPunti(1000, 5000)).toBeGreaterThan(0);
    expect(PuntiTabellariService.calcolaTempoTargetPerPunti(0, 5000)).toBe(0);
  });

  it('riepilogo per atleta', () => {
    const r = Riepilogo.perAtleta(atleta, [], micro, [], 4);
    expect(r).toBeTruthy();
  });

  it('rilevamentoLivello con e senza tempi', () => {
    const con = RilevamentoLivello.valuta(atleta, tempi.filter(t => t.atletaId === atleta.id), []);
    expect(['PRINCIPIANTE', 'INTERMEDIO', 'AVANZATO']).toContain(con.livello);
    const senza = RilevamentoLivello.valuta(atleta, [], []);
    expect(senza.livello).toBeTruthy();
  });

  it('validatori: piano e atleta', () => {
    const avvisi = PianoValidator.valida(stagione, micro, gare);
    expect(Array.isArray(avvisi)).toBe(true);
    const avvisiAtleta = AtletaValidator.valida(atleta, [], [], '2026-01-01');
    expect(Array.isArray(avvisiAtleta)).toBe(true);
  });

  it('biomechanicsEngine calcoli base', () => {
    expect(BiomechanicsEngine.calcolaCostoEnergetico(1.5)).toBeGreaterThan(0);
    expect(BiomechanicsEngine.indiceCostoEnergetico(1.5)).toBeGreaterThan(0);
    expect(BiomechanicsEngine.calcolaVelocitaMedia(100, 60)).toBeCloseTo(100 / 60, 1);
    expect(Array.isArray(BiomechanicsEngine.generaClusterElite('ITALIA' as never, 'STILE_LIBERO', 100))).toBe(true);
  });
});
