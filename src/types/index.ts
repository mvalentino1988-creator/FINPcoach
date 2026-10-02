export type StatoClassificazione = 'UFFICIALE' | 'IN_ATTESA';

export type FaseMesociclo = 
  | 'PREPARAZIONE_GENERALE'
  | 'PREPARAZIONE_SPECIFICA'
  | 'PRE_GARA'
  | 'COMPETITIVA';

export const FASE_MESOCICLO_LABEL: Record<FaseMesociclo, string> = {
  PREPARAZIONE_GENERALE: 'Preparazione generale',
  PREPARAZIONE_SPECIFICA: 'Preparazione specifica',
  PRE_GARA: 'Pre-gara',
  COMPETITIVA: 'Competitiva'
};

export type TipoMicrociclo = 
  | 'ADATTAMENTO'
  | 'CARICO'
  | 'SCARICO'
  | 'GARA'
  | 'RECUPERO'
  | 'PAUSA';

export const TIPO_MICROCICLO_LABEL: Record<TipoMicrociclo, string> = {
  ADATTAMENTO: 'Adattamento',
  CARICO: 'Carico',
  SCARICO: 'Scarico',
  GARA: 'Gara',
  RECUPERO: 'Recupero post-gara',
  PAUSA: 'Pausa'
};

export type Stile = 'STILE_LIBERO' | 'DORSO' | 'RANA' | 'FARFALLA' | 'MISTI';

export const STILE_LABEL: Record<Stile, string> = {
  STILE_LIBERO: 'Stile libero',
  DORSO: 'Dorso',
  RANA: 'Rana',
  FARFALLA: 'Farfalla',
  MISTI: 'Misti'
};

export type ContestoTempo = 'GARA' | 'ALLENAMENTO' | 'TEST';

export const CONTESTO_TEMPO_LABEL: Record<ContestoTempo, string> = {
  GARA: 'Gara',
  ALLENAMENTO: 'Allenamento',
  TEST: 'Test'
};

// DayOfWeek: 1 = Monday, 7 = Sunday
export type DayOfWeekNum = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DAY_OF_WEEK_NAMES: Record<DayOfWeekNum, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Gio',
  5: 'Ven',
  6: 'Sab',
  7: 'Dom'
};

export const DAY_OF_WEEK_FULL_NAMES: Record<DayOfWeekNum, string> = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  7: 'Domenica'
};

export interface Atleta {
  id: number;
  nome: string;
  cognome: string;
  dataNascita?: string; // YYYY-MM-DD
  classeS?: number;    // 1-14
  classeSB?: number;   // 1-9, 11-14
  classeSM?: number;   // 1-14
  stato: StatoClassificazione;
  fattoreVolume: number; // 0.1 - 1.0 (default 1.0)
  note: string;
  volumeAuto: boolean;   // true = calcolato dall'app
}

export interface CondizioneMedica {
  id: number;
  atletaId: number;
  descrizione: string;
  limitazioni: string;
  attiva: boolean;
}

export interface Assenza {
  id: number;
  atletaId: number;
  dal: string; // YYYY-MM-DD
  al: string;  // YYYY-MM-DD
  motivo: string;
}

export interface AtletaAttributo {
  id: number;
  atletaId: number;
  chiave: string;
  valore: string;
}

export interface Stagione {
  id: number;
  nome: string;
  inizio: string; // YYYY-MM-DD
  fine: string;   // YYYY-MM-DD
  vascaMetri: number; // 25 o 50
}

export interface Macrociclo {
  id: number;
  stagioneId: number;
  nome: string;
  inizio: string;
  fine: string;
  obiettivo: string;
}

export interface Mesociclo {
  id: number;
  macrocicloId: number;
  fase: FaseMesociclo;
  inizio: string;
  fine: string;
}

export interface Microciclo {
  id: number;
  mesocicloId: number;
  inizio: string;      // Lunedì
  fine: string;        // Domenica
  tipo: TipoMicrociclo;
  sedutePreviste: number;
  volumeTargetMetri: number; // totale della settimana, volume al 100%
  note: string;
  bloccato: boolean;   // true = bloccato a mano
}

export interface Chiusura {
  id: number;
  stagioneId: number;
  dal: string;
  al: string;
  motivo: string;
}

export interface Gara {
  id: number;
  stagioneId: number;
  nome: string;
  dal: string;
  al: string;
  luogo: string;
  prioritaria: boolean;
}

export interface Tempo {
  id: number;
  atletaId: number;
  data: string; // YYYY-MM-DD
  stile: Stile;
  distanzaMetri: number;
  centesimi: number; // 6235 = 1:02.35
  contesto: ContestoTempo;
  vascaMetri: number; // 25 o 50
  note: string;
}

export interface LogSeduta {
  id: number;
  atletaId: number;
  data: string; // YYYY-MM-DD
  presente: boolean;
  durataMin: number;
  metriEffettivi: number;
  rpe?: number; // 1-10
  note: string;
}

export interface MesoGen {
  meso: Mesociclo;
  micro: Microciclo[];
}

export interface MacroGen {
  macro: Macrociclo;
  meso: MesoGen[];
}

export interface ImpostazioniPiano {
  giorni?: DayOfWeekNum[];
  metriBaseSeduta?: number;
  numeroMacrocicli?: number;
  settimaneCicloCarico?: number;
}

export interface ParametriPiano {
  giorniAllenamento: DayOfWeekNum[];
  numeroMacrocicli: number;
  metriBaseSeduta: number;
  settimaneCicloCarico: number;
}

export type CodiceAllenamentoKey = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3' | 'D';

export interface CodiceInfo {
  codice: CodiceAllenamentoKey;
  nome: string;
  ambito: string;
  hrBpm: string;
  lattato: string;
  containerBg: string;
  textColor: string;
}

export interface RitmoCodice {
  codice: CodiceAllenamentoKey;
  passo100mCentesimi: number;
  passo100mFormatted: string;
  ripartenzaSecondi: number;
  ripartenzaFormatted: string;
  pausaSecondi: number;
  pausaFormatted: string;
  noteTecniche: string;
}

export interface TabellaRitmiAtleta {
  atletaId: number;
  tempoRiferimento100mCentesimi: number;
  stileRiferimento: Stile;
  vascaMetri: number;
  ritmi: Record<CodiceAllenamentoKey, RitmoCodice>;
}

export interface TempoImportato {
  stile: Stile;
  distanzaMetri: number;
  centesimi: number;
  formatted: string;
  contesto: ContestoTempo;
  note: string;
}

export interface FormCheckConsiglio {
  necessario: boolean;
  titoloTest: string;
  motivazione: string;
  istruzioniVasca: string;
}

export interface RisultatoCSS {
  cssVelocitaMs: number;
  passo100mCentesimi: number;
  passo100mFormatted: string;
  spiegazioneMetodologica: string;
}

export interface RisultatoACWR {
  caricoAcuto: number;
  caricoCronicoMedio: number;
  acwrRapporto: number;
  livelloRischio: string;
  avvisoInfortunio: string | null;
}

export interface TrattoSeduta {
  sezione: string;
  codice: CodiceAllenamentoKey;
  metri: number;
  ripetizioni: string;
  descrizione: string;
  ripartenza?: string | null;
  notaSpecifica?: string | null;
}

export interface SchedaSeduta {
  titolo: string;
  data: string | null;
  nomeAtleta: string | null;
  etaAtleta: number | null;
  categoriaEta: string | null;
  faseStagione: FaseMesociclo;
  tipoMicrociclo: TipoMicrociclo;
  volumeTotaleMetri: number;
  ripartizioneCodici: Partial<Record<CodiceAllenamentoKey, number>>;
  tratti: TrattoSeduta[];
  adattamentiEta: string[];
  avvertenzeMediche: string[];
  tempiUtilizzati: Tempo[];
  noteCalibrazione: string[];
  tipoSeduta: string;
}

export type Gravita = 'INFO' | 'ATTENZIONE' | 'ERRORE';

export interface Avviso {
  gravita: Gravita;
  messaggio: string;
}

export interface StimaClassiFINP {
  classeS: number;
  classeSB: number;
  classeSM: number;
  motivazione: string;
  eleggibile: boolean;
  affidabilita: 'Alta' | 'Media' | 'Bassa';
}

export interface AnalisiMedicaResult {
  condizione: string;
  riassuntoIdrodinamico: string;
  fattoriNuotata: string[];
  stimaClassi: StimaClassiFINP;
  raccomandazioniAllenamento: string[];
}

export interface FlagMedici {
  spalla: boolean;
  neurologica: boolean;
  cardiorespiratoria: boolean;
  visiva: boolean;
  epilessia: boolean;
  termoregolazione: boolean;
  coperta: boolean;
}

export interface Primato {
  stile: Stile;
  distanzaMetri: number;
  vascaMetri: number;
  centesimi: number;
  data: string;
}

export interface RiepilogoSettimana {
  lunedi: string;
  sedute: number;
  assenze: number;
  metri: number;
  rpeMedio: number | null;
  caricoSrpe: number;
  metriPrevisti: number | null;
}

export interface VolumeAtleta {
  metri: number;
  note: string[];
}
