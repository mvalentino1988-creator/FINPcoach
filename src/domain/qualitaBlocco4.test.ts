import { describe, it, expect } from 'vitest';
import {
  CalcoloScienzaNuoto,
  livelloACWR,
  ACWR_SOTTO_CARICO,
  ACWR_ATTENZIONE,
  ACWR_ELEVATO,
} from './calcoloCSS';
import { CalcoloRitmiRipartenze } from './calcoloRitmiRipartenze';
import { Festivita } from './festivita';
import { PianoValidator } from './validatori';
import { ClassiSportive } from './classiSportive';
import { CalendarioService, importaCalendarioJson, validaEventoCalendario } from './calendarioService';
import { Stagione, Microciclo } from '../types';

describe('ACWR — soglie unificate 0.8/1.3/1.5', () => {
  it('costanti coerenti con la scala documentata', () => {
    expect(ACWR_SOTTO_CARICO).toBe(0.8);
    expect(ACWR_ATTENZIONE).toBe(1.3);
    expect(ACWR_ELEVATO).toBe(1.5);
  });

  it.each([
    [0.5, 'sotto-allenamento'],
    [0.79, 'sotto-allenamento'],
    [0.8, 'ottimale'],
    [1.0, 'ottimale'],
    [1.3, 'ottimale'],
    [1.31, 'attenzione'],
    [1.5, 'attenzione'],
    [1.51, 'elevato'],
    [2.0, 'elevato'],
  ])('rapporto %s → %s', (rapporto, atteso) => {
    expect(livelloACWR(rapporto)).toBe(atteso);
  });

  it('calcolaACWR restituisce enum senza emoji', () => {
    const r = CalcoloScienzaNuoto.calcolaACWR(2000, [1000, 1000, 1000, 1000]);
    expect(r.acwrRapporto).toBe(2);
    expect(r.livelloRischio).toBe('elevato');
    expect(r.livelloRischio).not.toMatch(/[⚠️✅⚡🔵]/);
    expect(r.avvisoInfortunio).toContain('2.00');
  });

  it('cronico minimo 1.0 evita divisioni estreme', () => {
    const r = CalcoloScienzaNuoto.calcolaACWR(0.4, []);
    expect(r.caricoCronicoMedio).toBe(1);
    expect(r.acwrRapporto).toBe(0.4);
    expect(r.livelloRischio).toBe('sotto-allenamento');
  });

  it('usa solo le ultime 4 settimane di carico', () => {
    const r = CalcoloScienzaNuoto.calcolaACWR(500, [100, 100, 100, 100, 900, 900]);
    // ultime 4 = [100,100,100,100] → media 100 → rapporto 5
    expect(r.caricoCronicoMedio).toBe(100);
    expect(r.acwrRapporto).toBe(5);
  });
});

describe('CSS — casi limite', () => {
  it('t400 <= t100 restituisce null', () => {
    expect(CalcoloScienzaNuoto.calcolaCSS(6000, 6000)).toBeNull();
    expect(CalcoloScienzaNuoto.calcolaCSS(5000, 6000)).toBeNull();
  });

  it('valori nulli/zero non producono NaN', () => {
    expect(CalcoloScienzaNuoto.calcolaCSS(0, 0)).toBeNull();
    const r = CalcoloScienzaNuoto.calcolaCSS(27000, 6000);
    expect(r).not.toBeNull();
    expect(r!.cssVelocitaMs).toBeCloseTo(300 / 210, 5);
    expect(r!.passo100mCentesimi).toBeGreaterThan(0);
  });

  it('calcolaCSSRidotto 200/50 e 100/25', () => {
    const r1 = CalcoloScienzaNuoto.calcolaCSSRidotto(12000, 3500, 200, 50);
    expect(r1).not.toBeNull();
    // CSS = 150 / (120 - 35) = 1.764 m/s
    expect(r1!.cssVelocitaMs).toBeCloseTo(150 / 85, 5);
    const r2 = CalcoloScienzaNuoto.calcolaCSSRidotto(7000, 2000, 100, 25);
    expect(r2).not.toBeNull();
    expect(r2!.cssVelocitaMs).toBeCloseTo(75 / 50, 5);
  });

  it('calcolaCSSRidotto con deltaTempo <= 0 → null', () => {
    expect(CalcoloScienzaNuoto.calcolaCSSRidotto(3500, 12000, 200, 50)).toBeNull();
  });
});

describe('Tabella ritmi — arrotondamento e limiti', () => {
  it('arrotonda ripartenze ai multipli di 5 secondi', () => {
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, 6000, 'STILE_LIBERO', 25);
    for (const r of Object.values(t.ritmi)) {
      expect(r.ripartenzaSecondi % 5).toBe(0);
      expect(r.pausaSecondi % 5).toBe(0);
    }
  });

  it('tempo 100m molto basso viene clampato a 40"', () => {
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, 1000);
    expect(t.tempoRiferimento100mCentesimi).toBe(4000);
    expect(t.ritmi.B1.passo100mCentesimi).toBeGreaterThanOrEqual(4000);
  });

  it('tempo negativo/zero non genera valori impossibili', () => {
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, -500);
    expect(t.tempoRiferimento100mCentesimi).toBe(4000);
    for (const r of Object.values(t.ritmi)) {
      expect(r.passo100mCentesimi).toBeGreaterThanOrEqual(2500);
      expect(Number.isFinite(r.ripartenzaSecondi)).toBe(true);
    }
  });

  it('con CSS come riferimento B1 usa il passo CSS', () => {
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, 6000, 'STILE_LIBERO', 25, 5500);
    // B1 = CSS + 0 → 5500 centesimi
    expect(t.ritmi.B1.passo100mCentesimi).toBe(5500);
  });
});

describe('Festivita — Pasqua 2024-2035', () => {
  const attese: Record<number, string> = {
    2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05',
    2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01',
    2030: '2030-04-21', 2031: '2031-04-13', 2032: '2032-03-28',
    2033: '2033-04-17', 2034: '2034-04-09', 2035: '2035-03-25',
  };
  for (const [anno, iso] of Object.entries(attese)) {
    it(`Pasqua ${anno} = ${iso}`, () => {
      expect(Festivita.pasqua(Number(anno))).toBe(iso);
    });
  }

  it('perStagione include Capodanno e Natale in stagione annuale', () => {
    const stagione: Stagione = {
      id: 1, nome: 'Test', inizio: '2026-01-01', fine: '2026-12-31', vascaMetri: 25,
    } as Stagione;
    const chiusure = Festivita.perStagione(stagione);
    const motivi = chiusure.map(c => c.motivo);
    expect(motivi).toContain('Capodanno');
    expect(motivi).toContain('Natale');
    expect(motivi).toContain('Pasqua');
    expect(motivi).toContain("Lunedì dell'Angelo");
    expect(motivi).toContain('Ferragosto');
    expect(motivi).toContain('Immacolata Concezione');
  });
});

function mkMicro(id: number, inizio: string, tipo: Microciclo['tipo'], vol: number, sedute = 3): Microciclo {
  return {
    id, mesocicloId: 1, nome: `M${id}`, inizio,
    fine: inizio, tipo, volumeTargetMetri: vol, sedutePreviste: sedute,
    note: '', bloccato: false,
  } as Microciclo;
}
const stagioneOk: Stagione = { id: 1, nome: 'S', inizio: '2026-01-01', fine: '2026-12-31', vascaMetri: 25 } as Stagione;

describe('PianoValidator — soglie carico', () => {
  it('+10% esatto non genera avviso', () => {
    const micro = [
      mkMicro(1, '2026-01-05', 'CARICO', 3000),
      mkMicro(2, '2026-01-12', 'CARICO', 3300), // +10%
    ];
    expect(PianoValidator.valida(stagioneOk, micro, []).filter(a => a.messaggio.includes('%'))).toHaveLength(0);
  });

  it('+11% genera ATTENZIONE', () => {
    const micro = [
      mkMicro(1, '2026-01-05', 'CARICO', 3000),
      mkMicro(2, '2026-01-12', 'CARICO', 3333),
    ];
    const avvisi = PianoValidator.valida(stagioneOk, micro, []);
    expect(avvisi.some(a => a.gravita === 'ATTENZIONE' && a.messaggio.includes('+'))).toBe(true);
  });

  it('+21% genera ERRORE', () => {
    const micro = [
      mkMicro(1, '2026-01-05', 'CARICO', 3000),
      mkMicro(2, '2026-01-12', 'CARICO', 3630),
    ];
    const avvisi = PianoValidator.valida(stagioneOk, micro, []);
    expect(avvisi.some(a => a.gravita === 'ERRORE')).toBe(true);
  });

  it('5+ microcicli CARICO consecutivi generano avviso; una pausa azzera il conteggio', () => {
    const micro = [
      mkMicro(1, '2026-01-05', 'CARICO', 1000),
      mkMicro(2, '2026-01-12', 'SCARICO', 500),
      mkMicro(3, '2026-01-19', 'CARICO', 1000),
      mkMicro(4, '2026-01-26', 'CARICO', 1000),
      mkMicro(5, '2026-02-02', 'CARICO', 1000),
      mkMicro(6, '2026-02-09', 'CARICO', 1000),
      mkMicro(7, '2026-02-16', 'CARICO', 1000), // 5° consecutivo → avviso
    ];
    const avvisi = PianoValidator.valida(stagioneOk, micro, []);
    expect(avvisi.some(a => a.messaggio.includes('settimane di carico consecutive'))).toBe(true);
  });
});

describe('Classi sportive', () => {
  it('valida classi legittime', () => {
    expect(ClassiSportive.valida(5, 3, 7)).toEqual([]);
    expect(ClassiSportive.valida(null, null, null)).toEqual([]);
  });

  it('S/SB/SM fuori range 1-14 → errore', () => {
    expect(ClassiSportive.valida(0)).not.toEqual([]);
    expect(ClassiSportive.valida(15)).not.toEqual([]);
    expect(ClassiSportive.valida(null, 15)).not.toEqual([]);
    expect(ClassiSportive.valida(null, null, 0)).not.toEqual([]);
  });

  it('SB10 non esiste → errore', () => {
    expect(ClassiSportive.valida(null, 10)).not.toEqual([]);
    expect(ClassiSportive.valida(null, 9)).toEqual([]);
    expect(ClassiSportive.valida(null, 11)).toEqual([]);
  });
});

describe('CalendarioService — import e aggiornamento', () => {
  it('validaEventoCalendario accetta date ISO e italiane', () => {
    expect(validaEventoCalendario({ titolo: 'Gara', dal: '2026-05-01', al: '2026-05-02' })).toEqual([]);
    expect(validaEventoCalendario({ titolo: 'Gara', dal: '01/05/2026', al: '02/05/2026' })).toEqual([]);
  });

  it('rifiuta eventi non validi', () => {
    expect(validaEventoCalendario(null)).not.toEqual([]);
    expect(validaEventoCalendario({ titolo: '', dal: 'x', al: 'y' }).length).toBeGreaterThanOrEqual(2);
    expect(validaEventoCalendario({ titolo: 'G', dal: '2026-05-10', al: '2026-05-01' })).not.toEqual([]);
  });

  it('importaCalendarioJson rifiuta JSON non valido e array vuoto', () => {
    expect(importaCalendarioJson('non json').ok).toBe(false);
    expect(importaCalendarioJson('{"foo":1}').ok).toBe(false);
  });

  it('importaCalendarioJson accetta array di eventi validi', () => {
    const json = JSON.stringify([
      { titolo: 'Meeting Test', dal: '2027-06-01', al: '2027-06-01', luogo: 'X', disciplina: 'Nuoto' },
    ]);
    const esito = importaCalendarioJson(json);
    expect(esito.ok).toBe(true);
    expect(esito.aggiunti).toBe(1);
    expect(CalendarioService.eventi().some(e => e.titolo === 'Meeting Test')).toBe(true);
  });

  it("statoAggiornamento segnala calendario fermo dopo l'ultimo evento noto", () => {
    const s = CalendarioService.statoAggiornamento('2028-06-01');
    expect(s.aggiornato).toBe(false);
    expect(s.motivo).toContain('non aggiornato');
  });
});
