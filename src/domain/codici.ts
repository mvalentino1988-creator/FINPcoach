import { CodiceAllenamentoKey, CodiceInfo } from '../types';

export const CODICI_ALLENAMENTO: Record<CodiceAllenamentoKey, CodiceInfo> = {
  A1: {
    codice: 'A1',
    nome: 'Aerobico di Base / Scioglimento',
    ambito: 'Riscaldamento, recupero attivo, tecnica di bracciata e mobilità.',
    hrBpm: '120-140 bpm',
    lattato: '< 2 mmol/L',
    containerBg: '#E0F2FE', // Aqua Chiaro
    textColor: '#0369A1'
  },
  A2: {
    codice: 'A2',
    nome: 'Resistenza Aerobica (Fondo)',
    ambito: 'Capacità aerobica generale, continuità di andatura, resistenza fondamentale.',
    hrBpm: '140-160 bpm',
    lattato: '2-3 mmol/L',
    containerBg: '#CCFBF1', // Teal Chiaro
    textColor: '#0F766E'
  },
  B1: {
    codice: 'B1',
    nome: 'Soglia Anaerobica',
    ambito: 'Innalzamento della soglia anaerobica, andature sottomassimali prolungate.',
    hrBpm: '160-175 bpm',
    lattato: '~4 mmol/L',
    containerBg: '#DBEAFE', // Blu Chiaro
    textColor: '#1D4ED8'
  },
  B2: {
    codice: 'B2',
    nome: 'VO2 Max / Potenza Aerobica',
    ambito: 'Massimo consumo di ossigeno, serie ad intervalli (HIIT), frequenza elevata.',
    hrBpm: '175-190 bpm',
    lattato: '6-8 mmol/L',
    containerBg: '#E0E7FF', // Indaco Chiaro
    textColor: '#4338CA'
  },
  C1: {
    codice: 'C1',
    nome: 'Tolleranza Lattacida',
    ambito: "Capacità di tollerare l'acidosi muscolare su sforzi di 100m-200m.",
    hrBpm: '> 185 bpm',
    lattato: '8-12 mmol/L',
    containerBg: '#FEF3C7', // Amber / Giallo
    textColor: '#B45309'
  },
  C2: {
    codice: 'C2',
    nome: 'Potenza Lattacida',
    ambito: 'Produzione e smaltimento di massimo lattato, velocità prolungata su 50m-100m.',
    hrBpm: 'Massimale',
    lattato: '> 12 mmol/L',
    containerBg: '#FFEDD5', // Arancio
    textColor: '#C2410C'
  },
  C3: {
    codice: 'C3',
    nome: 'Ritmo Gara (Peak)',
    ambito: 'Simulazione passo gara con ampi recuperi e massima precisione di andatura.',
    hrBpm: 'Gara',
    lattato: 'Variabile',
    containerBg: '#FCE7F3', // Rosa / Viola
    textColor: '#BE185D'
  },
  D: {
    codice: 'D',
    nome: 'Velocità / Forza Alattacida',
    ambito: 'Sforzi massimi brevissimi (< 15s), partenze, virate, reattività senza lattato.',
    hrBpm: 'Massima reattività',
    lattato: '< 3 mmol/L',
    containerBg: '#FEE2E2', // Rosso Chiaro
    textColor: '#B91C1C'
  }
};

export const CODICI_KEYS: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];
