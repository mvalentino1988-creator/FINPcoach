import { describe, expect, it } from 'vitest';
import { Atleta, Assenza, CodiceAllenamentoKey, CondizioneMedica, Gara, LogSeduta, Microciclo, ParametriPiano, Stagione, Tempo } from '../types';
import { CODICI_ALLENAMENTO, CODICI_KEYS } from './codici';
import { convertiPasso100m, formattaTempo } from './tempoUtils';
import { CalcoloRitmiRipartenze } from './calcoloRitmiRipartenze';
import { CalcoloScienzaNuoto } from './calcoloCSS';
import { ClassiSportive } from './classiSportive';
import { ProfiloAtletaService } from './profiloAtleta';
import { RegolamentoGare } from './regolamentoGare';
import { PianoGenerator } from './pianoGenerator';
import { GeneratoreSmartSeduta } from './generatoreSmartSeduta';
import { VolumeIndividuale } from './volumeIndividuale';
import { FINPSpecialistAI } from './finpAnalisiMedica';
import { ParametriSeduta } from './parametriSeduta';
import { RecordService } from './recordService';
import { RegolamentiService } from './regolamentiService';
import { CalendarioService } from './calendarioService';

function cond(descrizione: string, limitazioni = ''): CondizioneMedica {
  return { id: 1, atletaId: 1, descrizione, limitazioni, attiva: true };
}

function atleta(over: Partial<Atleta> = {}): Atleta {
  return {
    id: 1,
    nome: 'Test',
    cognome: 'Atleta',
    dataNascita: '2000-01-01',
    stato: 'UFFICIALE',
    fattoreVolume: 1.0,
    note: '',
    volumeAuto: true,
    ...over
  };
}

function tempo(over: Partial<Tempo> = {}): Tempo {
  return {
    id: 1,
    atletaId: 1,
    data: '2026-01-01',
    stile: 'STILE_LIBERO',
    distanzaMetri: 100,
    centesimi: 6000,
    contesto: 'GARA',
    vascaMetri: 25,
    note: '',
    ...over
  };
}

describe('tempoUtils.convertiPasso100m', () => {
  it('è identità sui 100m', () => {
    expect(convertiPasso100m(6000, 100, 25)).toBe(6000);
  });

  it('la conversione da 50m è conservativa (più lenta del doppio del tempo)', () => {
    const p50 = convertiPasso100m(2900, 50, 25);
    // Non si può tenere il passo dei 50m sui 100m: il passo stimato è più lento di 2x29.00.
    expect(p50).toBeGreaterThan(5800);
  });

  it('il passo sui 400m è più lento di quello sui 100m', () => {
    const p400 = convertiPasso100m(26000, 400, 25);
    const p100 = convertiPasso100m(6000, 100, 25);
    expect(p400).toBeGreaterThan(p100);
  });
});

describe('codici', () => {
  it('ogni chiave ha una definizione completa', () => {
    for (const k of CODICI_KEYS) {
      const info = CODICI_ALLENAMENTO[k];
      expect(info).toBeDefined();
      expect(info.codice).toBe(k);
      expect(info.nome.length).toBeGreaterThan(0);
    }
  });

  it('include i nuovi codici tecnica/gambe/partenze', () => {
    expect(CODICI_KEYS).toContain('T');
    expect(CODICI_KEYS).toContain('G');
    expect(CODICI_KEYS).toContain('P');
  });
});

describe('CalcoloRitmiRipartenze.calcolaTabellaRitmi', () => {
  const tabella = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, 6420, 'STILE_LIBERO', 25, null);

  it('produce un ritmo per ogni codice', () => {
    for (const k of CODICI_KEYS) {
      expect(tabella.ritmi[k]).toBeDefined();
      expect(tabella.ritmi[k].passo100mCentesimi).toBeGreaterThan(0);
    }
  });

  it('A1 è più lento di B1 (soglia) e D è il più veloce', () => {
    expect(tabella.ritmi.A1.passo100mCentesimi).toBeGreaterThan(tabella.ritmi.B1.passo100mCentesimi);
    const passi = CODICI_KEYS.map(k => tabella.ritmi[k].passo100mCentesimi);
    expect(tabella.ritmi.D.passo100mCentesimi).toBe(Math.min(...passi));
  });

  it('ordina le andature aerobiche in modo monotono (A1 > A2 > B1 > B2 > C1 > C2)', () => {
    const ordine: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    for (let i = 0; i < ordine.length - 1; i++) {
      expect(tabella.ritmi[ordine[i]].passo100mCentesimi).toBeGreaterThan(
        tabella.ritmi[ordine[i + 1]].passo100mCentesimi
      );
    }
  });

  it('ancora B1 alla CSS quando fornita', () => {
    const css = 7932;
    const t = CalcoloRitmiRipartenze.calcolaTabellaRitmi(1, 6420, 'STILE_LIBERO', 25, css);
    expect(t.ritmi.B1.passo100mCentesimi).toBe(css);
  });

  it('T è più lento di A1 e P è più veloce di B1', () => {
    expect(tabella.ritmi.T.passo100mCentesimi).toBeGreaterThan(tabella.ritmi.A1.passo100mCentesimi);
    expect(tabella.ritmi.P.passo100mCentesimi).toBeLessThan(tabella.ritmi.B1.passo100mCentesimi);
  });
});

describe('CalcoloScienzaNuoto.calcolaACWR', () => {
  it('soglia di attenzione a 1.3 e rischio elevato a 1.5', () => {
    expect(CalcoloScienzaNuoto.calcolaACWR(100, [100, 100, 100, 100]).livelloRischio).toContain('Ottimale');
    expect(CalcoloScienzaNuoto.calcolaACWR(135, [100, 100, 100, 100]).livelloRischio).toContain('Attenzione');
    expect(CalcoloScienzaNuoto.calcolaACWR(160, [100, 100, 100, 100]).livelloRischio).toContain('Rischio Elevato');
    expect(CalcoloScienzaNuoto.calcolaACWR(50, [100, 100, 100, 100]).livelloRischio).toContain('Sotto-allenamento');
  });
});

describe('ClassiSportive', () => {
  it('rifiuta SB10 (inesistente)', () => {
    expect(ClassiSportive.valida(10, 10, 10).length).toBeGreaterThan(0);
  });

  it('accetta SB11-SB14', () => {
    expect(ClassiSportive.valida(11, 11, 11)).toEqual([]);
  });

  it('stima SM = (3S+SB)/4 per S>=5', () => {
    expect(ClassiSportive.stimaSM(9, 8)).toBe(Math.round((3 * 9 + 8) / 4));
  });

  it('stima SM = (2S+SB)/3 per S<=4', () => {
    expect(ClassiSportive.stimaSM(4, 3)).toBe(Math.round((2 * 4 + 3) / 3));
  });

  it('segnala incoerenza SM', () => {
    expect(ClassiSportive.valida(9, 8, 2).length).toBeGreaterThan(0);
  });
});

describe('ProfiloAtletaService', () => {
  it('un S2 che nuota 2:00 è di alto livello (relativo alla classe)', () => {
    const p = ProfiloAtletaService.profila(atleta({ classeS: 2 }), [tempo({ centesimi: 12000 })]);
    expect(p.indicePrestazione).toBeGreaterThanOrEqual(90);
    expect(['ELITE', 'TOP_MONDIALE']).toContain(p.fascia);
  });

  it('un S14 che nuota 2:00 è principiante (relativo alla classe)', () => {
    const p = ProfiloAtletaService.profila(atleta({ classeS: 14 }), [tempo({ centesimi: 12000 })]);
    expect(p.indicePrestazione).toBeLessThan(30);
    expect(['ESORDIENTE', 'PRINCIPIANTE']).toContain(p.fascia);
  });

  it('un S9 che nuota 54" è top mondiale', () => {
    const p = ProfiloAtletaService.profila(atleta({ classeS: 9 }), [tempo({ centesimi: 5400 })]);
    expect(p.fascia).toBe('TOP_MONDIALE');
  });

  it('un S9 che nuota 1:30 è principiante', () => {
    const p = ProfiloAtletaService.profila(atleta({ classeS: 9 }), [tempo({ centesimi: 9000 })]);
    expect(['ESORDIENTE', 'PRINCIPIANTE']).toContain(p.fascia);
  });

  it('consiglia doppie sedute solo per agonisti/élite', () => {
    const elite = ProfiloAtletaService.profila(atleta({ classeS: 9 }), [tempo({ centesimi: 5400 })]);
    const beginner = ProfiloAtletaService.profila(atleta({ classeS: 9 }), [tempo({ centesimi: 9000 })]);
    expect(elite.doppieSeduteConsigliate).toBe(true);
    expect(beginner.doppieSeduteConsigliate).toBe(false);
  });

  it('riduce la fascia per i bambini', () => {
    const p = ProfiloAtletaService.profila(
      atleta({ classeS: 9, dataNascita: '2018-01-01' }),
      [tempo({ centesimi: 5400 })]
    );
    expect(p.fascia).not.toBe('TOP_MONDIALE');
  });
});

describe('RegolamentoGare (programma WPS riconosciuto)', () => {
  const trova = (gare: typeof RegolamentoGare.GARE_STILE_LIBERO, dist: number) =>
    gare.find(g => g.distanzaMetri === dist)!;

  it('400m sl ammette S6-S14, non S5', () => {
    const g = trova(RegolamentoGare.GARE_STILE_LIBERO, 400);
    expect(RegolamentoGare.classeAmmessa(g, 6)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 14)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 5)).toBe(false);
  });

  it('200m sl ammette S1-S5 e S14, non S8', () => {
    const g = trova(RegolamentoGare.GARE_STILE_LIBERO, 200);
    expect(RegolamentoGare.classeAmmessa(g, 3)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 14)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 8)).toBe(false);
  });

  it('100m dorso ammette S1-S2 e S6-S14, non S3-S5', () => {
    const g = trova(RegolamentoGare.GARE_DORSO, 100);
    expect(RegolamentoGare.classeAmmessa(g, 1)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 2)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 3)).toBe(false);
    expect(RegolamentoGare.classeAmmessa(g, 6)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 14)).toBe(true);
  });

  it('50m farfalla ammette S2-S7, non S8', () => {
    const g = trova(RegolamentoGare.GARE_FARFALLA, 50);
    expect(RegolamentoGare.classeAmmessa(g, 2)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 7)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 8)).toBe(false);
  });

  it('100m rana ammette SB4-SB9 e SB11-SB14, non SB10', () => {
    const g = trova(RegolamentoGare.GARE_RANA, 100);
    expect(RegolamentoGare.classeAmmessa(g, 4)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 9)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 10)).toBe(false);
    expect(RegolamentoGare.classeAmmessa(g, 11)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g, 14)).toBe(true);
  });

  it('150m misti ammette SM1-SM4, 200m misti SM5-SM14', () => {
    const g150 = trova(RegolamentoGare.GARE_MISTI, 150);
    const g200 = trova(RegolamentoGare.GARE_MISTI, 200);
    expect(RegolamentoGare.classeAmmessa(g150, 4)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g150, 5)).toBe(false);
    expect(RegolamentoGare.classeAmmessa(g200, 5)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g200, 14)).toBe(true);
    expect(RegolamentoGare.classeAmmessa(g200, 4)).toBe(false);
  });

  it('800m e 1500m non sono nel programma WPS', () => {
    expect(trova(RegolamentoGare.GARE_STILE_LIBERO, 800).wps).toBe(false);
    expect(trova(RegolamentoGare.GARE_STILE_LIBERO, 1500).wps).toBe(false);
  });
});

describe('PianoGenerator — tapering', () => {
  const stagione: Stagione = {
    id: 1,
    nome: '2026/27',
    inizio: '2026-09-07',
    fine: '2027-06-28',
    vascaMetri: 25
  };
  const gara: Gara = {
    id: 1,
    stagioneId: 1,
    nome: 'Campionati Italiani',
    dal: '2027-03-15',
    al: '2027-03-15',
    luogo: 'Roma',
    prioritaria: true
  };
  const p: ParametriPiano = {
    giorniAllenamento: [3, 6],
    numeroMacrocicli: 1,
    metriBaseSeduta: 3000,
    settimaneCicloCarico: 4,
    doppieSedute: false,
    vascaMetri: 25,
    durataSedutaMin: 75,
    vascaPerGiorno: {},
    durataPerGiorno: {},
    overrideSedute: {}
  };

  const macro = PianoGenerator.genera(stagione, [], [gara], p);
  const micro = macro.flatMap(m => m.meso.flatMap(me => me.micro));
  const perInizio = new Map(micro.map(m => [m.inizio, m]));

  it('la settimana pre-gara è in scarico con nota di tapering', () => {
    const pre = perInizio.get('2027-03-08')!;
    expect(pre).toBeDefined();
    expect(pre.tipo).toBe('SCARICO');
    expect(pre.note).toContain('Tapering');
  });

  it('il volume cala progressivamente avvicinandosi alla gara', () => {
    const treSettimane = perInizio.get('2027-02-22')!;
    const dueSettimane = perInizio.get('2027-03-01')!;
    const unaSettimana = perInizio.get('2027-03-08')!;
    expect(dueSettimane.volumeTargetMetri).toBeLessThan(treSettimane.volumeTargetMetri);
    expect(unaSettimana.volumeTargetMetri).toBeLessThan(dueSettimane.volumeTargetMetri);
  });

  it('con doppie sedute aumenta il volume settimanale', () => {
    const macroD = PianoGenerator.genera(stagione, [], [gara], { ...p, doppieSedute: true });
    const microD = macroD.flatMap(m => m.meso.flatMap(me => me.micro));
    const carico = micro.find(m => m.tipo === 'CARICO')!;
    const caricoD = microD.find(m => m.tipo === 'CARICO')!;
    expect(caricoD.volumeTargetMetri).toBeGreaterThan(carico.volumeTargetMetri);
    expect(caricoD.note).toContain('Doppie sedute');
  });
});

describe('GeneratoreSmartSeduta', () => {
  it('include i codici tecnica e gambe in preparazione generale', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      3000,
      'PREPARAZIONE_GENERALE',
      'CARICO'
    );
    expect(scheda.ripartizioneCodici.T ?? 0).toBeGreaterThan(0);
    expect(scheda.ripartizioneCodici.G ?? 0).toBeGreaterThan(0);
    expect(scheda.volumeTotaleMetri).toBeGreaterThan(0);
  });

  it('con doppia seduta aggiunge i tratti pomeridiani', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      3000,
      'PREPARAZIONE_SPECIFICA',
      'CARICO',
      null,
      [],
      [],
      [],
      null,
      [],
      { doppiaSeduta: true }
    );
    const pm = scheda.tratti.filter(t => t.sezione.startsWith('PM · '));
    expect(pm.length).toBeGreaterThan(0);
    expect(scheda.noteCalibrazione.some(n => n.includes('Doppia seduta'))).toBe(true);
    // Il volume è il totale giornaliero: AM+PM non devono raddoppiare la seduta.
    const singola = GeneratoreSmartSeduta.genera('2026-10-14', 3000, 'PREPARAZIONE_SPECIFICA', 'CARICO');
    expect(scheda.volumeTotaleMetri).toBeLessThan(singola.volumeTotaleMetri * 1.4);
    expect(scheda.volumeTotaleMetri).toBeGreaterThan(singola.volumeTotaleMetri * 0.8);
  });

  it('produce una scheda con volume coerente e tratti non vuoti', () => {
    const scheda = GeneratoreSmartSeduta.genera('2026-10-14', 2500, 'PREPARAZIONE_SPECIFICA', 'CARICO');
    expect(scheda.tratti.length).toBeGreaterThan(0);
    const somma = scheda.tratti.reduce((acc, t) => acc + t.metri, 0);
    expect(scheda.volumeTotaleMetri).toBe(somma);
  });
});

describe('FINPSpecialistAI - riconoscimento SMA / neuromuscolare', () => {
  it('riconosce SMA3 come neuromuscolare con limitazione degli arti inferiori', () => {
    const f = FINPSpecialistAI.flagMedici('SMA3');
    expect(f.neuromuscolare).toBe(true);
    expect(f.limitazioneArtiInferiori).toBe(true);
  });

  it('riconosce "atrofia muscolare spinale tipo 3"', () => {
    const f = FINPSpecialistAI.flagMedici('atrofia muscolare spinale tipo 3');
    expect(f.neuromuscolare).toBe(true);
    expect(f.limitazioneArtiInferiori).toBe(true);
  });

  it('non confonde l\'asma con la SMA', () => {
    const f = FINPSpecialistAI.flagMedici('asma bronchiale');
    expect(f.neuromuscolare).toBe(false);
    expect(f.limitazioneArtiInferiori).toBe(false);
    expect(f.cardiorespiratoria).toBe(true);
  });

  it('analizza SMA3 con raccomandazioni coerenti', () => {
    const a = FINPSpecialistAI.analizza('SMA3', '');
    expect(a.riassuntoIdrodinamico.toLowerCase()).toContain('neuromuscolare');
    expect(a.raccomandazioniAllenamento.join(' ').toLowerCase()).toContain('gambe');
  });
});

describe('GeneratoreSmartSeduta - vincoli medici ed età', () => {
  it('con SMA3 esclude gambe e lavori lattacidi', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      2000,
      'PRE_GARA',
      'CARICO',
      atleta({ dataNascita: '2016-01-01' }),
      [cond('SMA3')],
      [],
      [],
      null,
      []
    );
    expect(scheda.ripartizioneCodici.G ?? 0).toBe(0);
    expect(scheda.ripartizioneCodici.C1 ?? 0).toBe(0);
    expect(scheda.ripartizioneCodici.C2 ?? 0).toBe(0);
    expect(scheda.ripartizioneCodici.C3 ?? 0).toBe(0);
    expect(scheda.avvertenzeMediche.some(a => a.includes('Arti inferiori'))).toBe(true);
    expect(scheda.avvertenzeMediche.some(a => a.includes('neuromuscolare'))).toBe(true);
  });

  it('per un atleta under 12 esclude i lavori lattacidi', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      2000,
      'COMPETITIVA',
      'CARICO',
      atleta({ dataNascita: '2016-01-01' }),
      [],
      [],
      [],
      null,
      []
    );
    expect(scheda.ripartizioneCodici.C1 ?? 0).toBe(0);
    expect(scheda.ripartizioneCodici.C2 ?? 0).toBe(0);
    expect(scheda.ripartizioneCodici.C3 ?? 0).toBe(0);
  });

  it('senza condizioni mantiene il lavoro di gambe', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      3000,
      'PREPARAZIONE_GENERALE',
      'CARICO',
      atleta({ dataNascita: '2000-01-01' }),
      [],
      [],
      [],
      null,
      []
    );
    expect(scheda.ripartizioneCodici.G ?? 0).toBeGreaterThan(0);
  });
});

describe('GeneratoreSmartSeduta - somma esatta del volume', () => {
  const casi = [
    { v: 600, fase: 'PREPARAZIONE_GENERALE' as const, tipo: 'CARICO' as const },
    { v: 650, fase: 'PREPARAZIONE_GENERALE' as const, tipo: 'CARICO' as const },
    { v: 1200, fase: 'PREPARAZIONE_SPECIFICA' as const, tipo: 'CARICO' as const },
    { v: 2300, fase: 'PREPARAZIONE_SPECIFICA' as const, tipo: 'CARICO' as const },
    { v: 3500, fase: 'COMPETITIVA' as const, tipo: 'CARICO' as const },
    { v: 900, fase: 'PRE_GARA' as const, tipo: 'SCARICO' as const },
    { v: 2000, fase: 'PREPARAZIONE_SPECIFICA' as const, tipo: 'GARA' as const }
  ];

  it('la somma dei tratti coincide sempre col volume totale e col target', () => {
    for (const c of casi) {
      const scheda = GeneratoreSmartSeduta.genera('2026-10-14', c.v, c.fase, c.tipo);
      const somma = scheda.tratti.reduce((acc, t) => acc + t.metri, 0);
      expect(somma).toBe(scheda.volumeTotaleMetri);
      expect(scheda.volumeTotaleMetri).toBe(scheda.volumeTargetMetri);
      expect(somma % 50).toBe(0);
    }
  });

  it('la somma resta esatta anche con doppia seduta', () => {
    const scheda = GeneratoreSmartSeduta.genera(
      '2026-10-14',
      3000,
      'PREPARAZIONE_SPECIFICA',
      'CARICO',
      null,
      [],
      [],
      [],
      null,
      [],
      { doppiaSeduta: true }
    );
    const somma = scheda.tratti.reduce((acc, t) => acc + t.metri, 0);
    expect(somma).toBe(scheda.volumeTotaleMetri);
    expect(somma).toBe(scheda.volumeTargetMetri);
  });
});

describe('GeneratoreSmartSeduta - volume guidato dai tempi', () => {
  it('senza tempi il volume segue il piano di squadra', () => {
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 2000,
      atleta: atleta(),
      tipoMicro: 'CARICO'
    });
    expect(p.basata_su_tempi).toBe(false);
    expect(p.metri).toBe(2000);
  });

  it('con tempi reali il volume riflette il livello dell\'atleta (non sottostimato)', () => {
    const forte = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1000,
      atleta: atleta({ classeS: 9 }),
      tempi: [tempo({ atletaId: 1, distanzaMetri: 100, centesimi: 5400, stile: 'STILE_LIBERO' })],
      tipoMicro: 'CARICO'
    });
    expect(forte.basata_su_tempi).toBe(true);
    expect(forte.metri).toBeGreaterThan(1000);
  });

  it('la scheda personale usa esattamente il volume prescritto', () => {
    const a = atleta({ classeS: 9 });
    const t = [tempo({ atletaId: 1, distanzaMetri: 100, centesimi: 5400 })];
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 2000,
      atleta: a,
      tempi: t,
      tipoMicro: 'CARICO',
      oggi: '2026-10-14'
    });
    const scheda = GeneratoreSmartSeduta.genera('2026-10-14', 2000, 'PREPARAZIONE_GENERALE', 'CARICO', a, [], t, [], null, []);
    expect(scheda.volumeTotaleMetri).toBe(p.metri);
    expect(scheda.volumeTargetMetri).toBe(p.metri);
  });

  it('in pausa o senza volume previsto non forza metri artificiali', () => {
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 0,
      atleta: atleta(),
      tipoMicro: 'PAUSA'
    });
    expect(p.metri).toBe(0);
    const scheda = GeneratoreSmartSeduta.genera('2026-10-14', 0, 'PREPARAZIONE_GENERALE', 'PAUSA');
    expect(scheda.volumeTotaleMetri).toBe(0);
    expect(scheda.tratti).toHaveLength(0);
  });
});

describe('formattaTempo', () => {
  it('formatta minuti e secondi', () => {
    expect(formattaTempo(7932)).toBe("1:19.32");
    expect(formattaTempo(5400)).toBe("54.00");
  });
});

describe('ProfiloAtletaService - modello a 360° (età + livello + storico)', () => {
  // Bambino di 10 anni, S10, 100m sl in 2:04.90 (12490), SMA3.
  const bimbo = () =>
    atleta({ dataNascita: '2016-01-01', classeS: 10, classeSB: 9, classeSM: 10, fattoreVolume: 0.6 });
  const tempoBimbo = () => [tempo({ distanzaMetri: 100, centesimi: 12490, stile: 'STILE_LIBERO' })];
  const sma3 = () => [cond('Atrofia muscolare spinale tipo 3 (SMA3)', 'Debolezza prossimale, arti inferiori non propulsivi')];

  it('corregge il riferimento per l\'età: indice age-graded > indice grezzo', () => {
    const p = ProfiloAtletaService.profila(bimbo(), tempoBimbo());
    expect(p.eta).toBe(10);
    expect(p.fattoreEta).toBeGreaterThan(1.5);
    expect(p.indicePrestazione).toBeGreaterThan(p.indiceGrezzo);
    expect(p.indicePrestazione).toBeGreaterThanOrEqual(40);
  });

  it('un adulto non subisce correzione per età', () => {
    const p = ProfiloAtletaService.profila(atleta({ classeS: 9 }), [tempo({ centesimi: 5400 })]);
    expect(p.fattoreEta).toBe(1.0);
    expect(p.indicePrestazione).toBe(p.indiceGrezzo);
  });

  it('il volume di un bambino SMA3 non è più quello di un principiante (≥ 1400 m)', () => {
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400,
      atleta: bimbo(),
      tempi: tempoBimbo(),
      condizioniMediche: sma3(),
      tipoMicro: 'CARICO',
      oggi: '2026-10-14'
    });
    expect(p.basata_su_tempi).toBe(true);
    expect(p.volume360).not.toBeNull();
    expect(p.metri).toBeGreaterThanOrEqual(1400);
    expect(p.fattoreMedico).toBe(0.75);
  });

  it('il fattore medico è applicato UNA sola volta (niente doppio conteggio)', () => {
    const con = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400, atleta: bimbo(), tempi: tempoBimbo(), condizioniMediche: sma3(),
      tipoMicro: 'CARICO', oggi: '2026-10-14'
    });
    const senza = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400, atleta: bimbo(), tempi: tempoBimbo(), condizioniMediche: [],
      tipoMicro: 'CARICO', oggi: '2026-10-14'
    });
    // Il rapporto è ~0.75 (una sola applicazione), non ~0.56 (doppia).
    expect(con.metri / senza.metri).toBeGreaterThan(0.7);
    expect(con.metri / senza.metri).toBeLessThan(0.8);
  });

  it('lo storico reale alza il volume (sovraccarico progressivo)', () => {
    const log: LogSeduta[] = [
      { id: 1, atletaId: 1, data: '2026-10-01', presente: true, metriEffettivi: 2000, rpe: 5, durataMin: 50, note: '' },
      { id: 2, atletaId: 1, data: '2026-10-04', presente: true, metriEffettivi: 2100, rpe: 5, durataMin: 50, note: '' },
      { id: 3, atletaId: 1, data: '2026-10-08', presente: true, metriEffettivi: 2200, rpe: 6, durataMin: 55, note: '' }
    ];
    const p = ProfiloAtletaService.profila(bimbo(), tempoBimbo(), log);
    expect(p.volumeDaStorico).not.toBeNull();
    expect(p.volumeBaseGiornaliero).toBeGreaterThanOrEqual(p.volumeDaStorico!);
  });

  it('l\'override manuale non riapplica il fattore medico', () => {
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 2000,
      atleta: { ...bimbo(), volumeAuto: false, fattoreVolume: 0.6 },
      tempi: tempoBimbo(),
      condizioniMediche: sma3(),
      tipoMicro: 'CARICO',
      oggi: '2026-10-14'
    });
    // 2000 × 0.6 = 1200, senza il secondo taglio 0.75.
    expect(p.metri).toBe(1200);
  });

  it('senza tempi il volume segue il piano del tecnico', () => {
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1800,
      atleta: bimbo(),
      tempi: [],
      tipoMicro: 'CARICO',
      oggi: '2026-10-14'
    });
    expect(p.basata_su_tempi).toBe(false);
    expect(p.metri).toBe(1800);
  });

  it('la card settimanale usa il volume a 360° (non il fattoreVolume)', () => {
    const micro: Microciclo = {
      id: 1, mesocicloId: 1, inizio: '2026-10-12', fine: '2026-10-18',
      tipo: 'CARICO', sedutePreviste: 3, volumeTargetMetri: 4200, note: '', bloccato: false
    };
    const sedute = micro.sedutePreviste;
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: Math.round(micro.volumeTargetMetri / sedute),
      atleta: bimbo(),
      tempi: tempoBimbo(),
      condizioniMediche: sma3(),
      tipoMicro: micro.tipo,
      oggi: '2026-10-14'
    });
    // 1400 m/seduta × 3 = 4200 m: non più 4200 × 0.6 = 2520.
    expect(p.metri * sedute).toBeGreaterThan(3000);
  });

  it('il rientro dopo assenza riduce il volume prescritto', () => {
    const micro: Microciclo = {
      id: 1, mesocicloId: 1, inizio: '2026-10-12', fine: '2026-10-18',
      tipo: 'CARICO', sedutePreviste: 3, volumeTargetMetri: 4200, note: '', bloccato: false
    };
    const assenze: Assenza[] = [
      { id: 1, atletaId: 1, dal: '2026-09-28', al: '2026-10-11', motivo: 'infortunio' }
    ];
    const f = VolumeIndividuale.fattorePresenza(micro, assenze).fattore;
    expect(f).toBeLessThan(1);
    const p = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400, atleta: bimbo(), tempi: tempoBimbo(), condizioniMediche: [],
      tipoMicro: 'CARICO', oggi: '2026-10-14', fattoreRientro: f
    });
    expect(p.fattoreRientro).toBe(f);
    expect(p.metri).toBeLessThan(1400);
  });
});

describe('GeneratoreSmartSeduta - vasca, durata e arrotondamento a 100 m', () => {
  const adulto = () => atleta({ classeS: 9 });
  const tempiAdulto = () => [tempo({ centesimi: 5400 })];

  it('ogni esercizio è un multiplo di 100 m e la somma è esatta', () => {
    for (const vasca of [25, 50] as const) {
      for (const vol of [1400, 2000, 2300, 3000, 3200]) {
        const s = GeneratoreSmartSeduta.genera(
          '2026-10-14', vol, 'PREPARAZIONE_SPECIFICA', 'CARICO',
          adulto(), [], tempiAdulto(), [], null, [], { vascaMetri: vasca }
        );
        for (const t of s.tratti) {
          expect(t.metri % 100, `${t.codice} ${t.ripetizioni} = ${t.metri}`).toBe(0);
        }
        const somma = s.tratti.reduce((acc, t) => acc + t.metri, 0);
        expect(somma).toBe(s.volumeTotaleMetri);
        expect(somma).toBe(s.volumeTargetMetri);
        expect(s.volumeTargetMetri % 100).toBe(0);
      }
    }
  });

  it('la vasca da 50 m non produce ripetute da 25 m', () => {
    const s = GeneratoreSmartSeduta.genera(
      '2026-10-14', 2300, 'PREPARAZIONE_SPECIFICA', 'CARICO',
      adulto(), [], tempiAdulto(), [], null, [], { vascaMetri: 50 }
    );
    for (const t of s.tratti) {
      const m = /x\s*(\d+)m/.exec(t.ripetizioni);
      if (m) expect(Number(m[1]) % 50, t.ripetizioni).toBe(0);
    }
    expect(s.vascaMetri).toBe(50);
  });

  it('la vasca da 25 m ammette ripetute da 25 m (partenze/virate)', () => {
    const s = GeneratoreSmartSeduta.genera(
      '2026-10-14', 2300, 'PREPARAZIONE_SPECIFICA', 'CARICO',
      adulto(), [], tempiAdulto(), [], null, [], { vascaMetri: 25 }
    );
    expect(s.vascaMetri).toBe(25);
    const p = s.tratti.find(t => t.codice === 'P');
    if (p) expect(p.ripetizioni).toContain('25m');
  });

  it('la durata della seduta fa da tetto al volume', () => {
    const bimbo = atleta({ dataNascita: '2016-01-01', classeS: 10, classeSB: 9, classeSM: 10, fattoreVolume: 0.6 });
    const tb = [tempo({ distanzaMetri: 100, centesimi: 12490 })];
    const sma = [cond('Atrofia muscolare spinale tipo 3 (SMA3)', '')];
    const corta = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400, atleta: bimbo, tempi: tb, condizioniMediche: sma,
      tipoMicro: 'CARICO', oggi: '2026-10-14', durataSedutaMin: 45
    });
    const lunga = GeneratoreSmartSeduta.volumePrescritto({
      metriTarget: 1400, atleta: bimbo, tempi: tb, condizioniMediche: sma,
      tipoMicro: 'CARICO', oggi: '2026-10-14', durataSedutaMin: 75
    });
    expect(corta.capDurata).not.toBeNull();
    expect(corta.metri).toBeLessThan(lunga.metri);
    expect(corta.metri % 100).toBe(0);
    expect(lunga.metri).toBe(1400);
  });

  it('la scheda espone vasca e durata stimata coerenti col volume', () => {
    const s = GeneratoreSmartSeduta.genera(
      '2026-10-14', 2000, 'PREPARAZIONE_SPECIFICA', 'CARICO',
      adulto(), [], tempiAdulto(), [], null, [], { vascaMetri: 25 }
    );
    expect(s.vascaMetri).toBe(25);
    expect(s.durataStimataMin).toBeGreaterThan(0);
    // ~1,7 min/100m per un S9 sui 54" + 10' di transizioni.
    expect(s.durataStimataMin).toBeGreaterThanOrEqual(Math.round(s.volumeTotaleMetri / 100 * 1.6));
  });

  it('anche la doppia seduta resta a multipli di 100 m', () => {
    const s = GeneratoreSmartSeduta.genera(
      '2026-10-14', 3000, 'PREPARAZIONE_SPECIFICA', 'CARICO',
      adulto(), [], tempiAdulto(), [], null, [], { doppiaSeduta: true, vascaMetri: 25 }
    );
    for (const t of s.tratti) expect(t.metri % 100).toBe(0);
    expect(s.tratti.reduce((acc, t) => acc + t.metri, 0)).toBe(s.volumeTargetMetri);
  });
});

describe('ParametriSeduta - vasca/durata per giorno e override per seduta', () => {
  const base: ParametriPiano = {
    giorniAllenamento: [1, 3, 5],
    numeroMacrocicli: 1,
    metriBaseSeduta: 3000,
    settimaneCicloCarico: 4,
    doppieSedute: false,
    vascaMetri: 25,
    durataSedutaMin: 75,
    vascaPerGiorno: {},
    durataPerGiorno: {},
    overrideSedute: {}
  };

  it('senza configurazione usa il default globale', () => {
    expect(ParametriSeduta.risolvi('2026-10-14', base)).toEqual({ vascaMetri: 25, durataSedutaMin: 75 });
  });

  it('applica vasca e durata del giorno della settimana', () => {
    const p: ParametriPiano = { ...base, vascaPerGiorno: { 3: 50 }, durataPerGiorno: { 3: 90 } };
    // 2026-10-14 è un mercoledì (dow 3).
    expect(ParametriSeduta.risolvi('2026-10-14', p)).toEqual({ vascaMetri: 50, durataSedutaMin: 90 });
    // Un altro giorno ricade sul default.
    expect(ParametriSeduta.risolvi('2026-10-15', p)).toEqual({ vascaMetri: 25, durataSedutaMin: 75 });
  });

  it("l'override della singola seduta vince su giorno e default", () => {
    const p: ParametriPiano = {
      ...base,
      vascaPerGiorno: { 3: 50 },
      durataPerGiorno: { 3: 90 },
      overrideSedute: { '2026-10-14': { vascaMetri: 25, durataSedutaMin: 60 } }
    };
    expect(ParametriSeduta.risolvi('2026-10-14', p)).toEqual({ vascaMetri: 25, durataSedutaMin: 60 });
  });

  it("l'override parziale mantiene il valore del giorno per il campo non specificato", () => {
    const p: ParametriPiano = {
      ...base,
      vascaPerGiorno: { 3: 50 },
      durataPerGiorno: { 3: 90 },
      overrideSedute: { '2026-10-14': { durataSedutaMin: 45 } }
    };
    expect(ParametriSeduta.risolvi('2026-10-14', p)).toEqual({ vascaMetri: 50, durataSedutaMin: 45 });
  });

  it('haOverride riconosce solo le date con override esplicito', () => {
    const p: ParametriPiano = { ...base, overrideSedute: { '2026-10-14': { vascaMetri: 50 } } };
    expect(ParametriSeduta.haOverride('2026-10-14', p)).toBe(true);
    expect(ParametriSeduta.haOverride('2026-10-15', p)).toBe(false);
    expect(ParametriSeduta.haOverride(null, p)).toBe(false);
  });

  it('la scheda generata rispetta la vasca del giorno', () => {
    const p: ParametriPiano = { ...base, vascaPerGiorno: { 3: 50 } };
    const vd = ParametriSeduta.risolvi('2026-10-14', p);
    const s = GeneratoreSmartSeduta.genera(
      '2026-10-14', 2300, 'PREPARAZIONE_SPECIFICA', 'CARICO',
      atleta({ classeS: 9 }), [], [tempo({ centesimi: 5400 })], [], null, [],
      { vascaMetri: vd.vascaMetri, durataSedutaMin: vd.durataSedutaMin }
    );
    expect(s.vascaMetri).toBe(50);
    for (const t of s.tratti) {
      const m = /x\s*(\d+)m/.exec(t.ripetizioni);
      if (m) expect(Number(m[1]) % 50, t.ripetizioni).toBe(0);
    }
  });
});

describe('RecordService', () => {
  it('espone eventi individuali senza staffette', () => {
    const evs = RecordService.eventiIndividuali(50);
    expect(evs.length).toBeGreaterThan(0);
    expect(evs.every(e => !/Staff|Mistaffetta/i.test(e))).toBe(true);
  });

  it('trova classi per evento e genere', () => {
    const ev = RecordService.eventiIndividuali(50)[0];
    const generi = RecordService.generi(50, ev);
    expect(generi.length).toBeGreaterThan(0);
    const classi = RecordService.classi(50, ev, generi[0]);
    expect(classi.length).toBeGreaterThan(0);
  });

  it('confronta un tempo con un record', () => {
    const lento = RecordService.confronta(6500, 6400);
    expect(lento.deltaCentesimi).toBe(100);
    expect(lento.migliore).toBe(false);
    expect(lento.percentuale).toBeCloseTo(101.56, 1);
    expect(RecordService.confronta(6300, 6400).migliore).toBe(true);
  });

  it('mappa lo stile sulla classe dell\'atleta', () => {
    const a = atleta({ classeS: 9, classeSB: 8, classeSM: 9 });
    expect(RecordService.classePerStile(a, 'STILE_LIBERO')).toBe('S9');
    expect(RecordService.classePerStile(a, 'RANA')).toBe('SB8');
    expect(RecordService.classePerStile(a, 'MISTI')).toBe('SM9');
  });

  it('costruisce l\'evento da un tempo', () => {
    expect(RecordService.eventoPerTempo(tempo({ stile: 'STILE_LIBERO', distanzaMetri: 100 }))).toBe('100 Stile Libero');
  });
});

describe('RegolamentiService', () => {
  it('espone documenti e sezioni', () => {
    expect(RegolamentiService.documenti().length).toBeGreaterThanOrEqual(2);
    expect(RegolamentiService.totaleSezioni()).toBeGreaterThan(100);
  });

  it('trova sezioni pertinenti a una query', () => {
    const res = RegolamentiService.cerca('categorie età');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].punteggio).toBeGreaterThan(0);
    expect(res[0].estratto.length).toBeGreaterThan(0);
  });

  it('restituisce vuoto per query troppo corta', () => {
    expect(RegolamentiService.cerca('')).toEqual([]);
    expect(RegolamentiService.cerca('a')).toEqual([]);
  });

  it('filtra per documento', () => {
    const res = RegolamentiService.cerca('classification', 10, 'wps-rules-2026');
    expect(res.length).toBeGreaterThan(0);
    expect(res.every(r => r.documentoId === 'wps-rules-2026')).toBe(true);
  });

  it('raggruppa le sezioni in capitoli senza perdere articoli', () => {
    for (const doc of RegolamentiService.documenti()) {
      const capitoli = RegolamentiService.capitoli(doc.id);
      expect(capitoli.length).toBeGreaterThan(0);
      // Ogni capitolo ha almeno una sezione.
      expect(capitoli.every(c => c.sezioni.length > 0)).toBe(true);
      // Nessun titolo di capitolo vuoto.
      expect(capitoli.every(c => c.titolo.trim().length > 0)).toBe(true);
      // Gli indici delle sezioni coprono l'intero documento, senza duplicati.
      const indici = capitoli.flatMap(c => c.sezioni.flatMap(s => s.indici)).sort((a, b) => a - b);
      expect(indici).toEqual(doc.sezioni.map((_, i) => i));
    }
  });

  it('riduce drasticamente il numero di voci rispetto alle sezioni grezze', () => {
    const finp = RegolamentiService.documento('finp-tecnico-2026')!;
    const capitoli = RegolamentiService.capitoli('finp-tecnico-2026');
    expect(capitoli.length).toBeLessThan(finp.sezioni.length / 3);
    expect(RegolamentiService.totaleCapitoli()).toBeLessThan(RegolamentiService.totaleSezioni());
  });

  it('unisce le parti "(parte N)" dello stesso titolo', () => {
    const capitoli = RegolamentiService.capitoli('finp-tecnico-2026');
    const titoli = capitoli.flatMap(c => c.sezioni.map(s => s.titolo));
    expect(titoli.some(t => /\(parte\s*\d+\)/i.test(t))).toBe(false);
  });

  it('individua il capitolo che contiene una sezione', () => {
    const cap = RegolamentiService.capitoloDi('finp-tecnico-2026', 0);
    expect(cap).not.toBeNull();
    expect(cap!.sezioni.some(s => s.indici.includes(0))).toBe(true);
    expect(RegolamentiService.capitoloDi('finp-tecnico-2026', 99999)).toBeNull();
  });
});

describe('CalendarioService', () => {
  it('espone gli eventi ordinati per data', () => {
    const evs = CalendarioService.eventi();
    expect(evs.length).toBeGreaterThan(0);
    for (let i = 1; i < evs.length; i++) {
      expect(evs[i].dal >= evs[i - 1].dal).toBe(true);
    }
  });

  it('formatta il periodo di un evento', () => {
    const multi = CalendarioService.eventi().find(e => e.dal !== e.al);
    expect(multi).toBeDefined();
    expect(CalendarioService.formattaPeriodo(multi!)).toMatch(/\d/);
  });

  it('filtra per disciplina', () => {
    const nuoto = CalendarioService.perDisciplina('Nuoto');
    expect(nuoto.length).toBeGreaterThan(0);
    expect(nuoto.every(e => e.disciplina === 'Nuoto')).toBe(true);
    expect(CalendarioService.perDisciplina(null).length).toBe(CalendarioService.eventi().length);
  });

  it('filtra i prossimi eventi', () => {
    expect(CalendarioService.prossimi('2026-01-01').length).toBe(CalendarioService.eventi().length);
    expect(CalendarioService.prossimi('2030-01-01').length).toBe(0);
  });

  it('mostra solo gli eventi di nuoto in vasca', () => {
    const vasca = CalendarioService.nuotoVasca();
    expect(vasca.length).toBeGreaterThan(0);
    expect(vasca.every(e => e.disciplina === 'Nuoto')).toBe(true);
    expect(vasca.length).toBeLessThan(CalendarioService.eventi().length);
  });
});
