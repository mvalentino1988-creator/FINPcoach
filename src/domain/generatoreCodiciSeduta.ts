import { CodiceAllenamentoKey, CondizioneMedica, FaseMesociclo, TipoMicrociclo } from '../types';
import { FINPSpecialistAI } from './finpAnalisiMedica';

export interface PropostaCodiciSeduta {
  codici: CodiceAllenamentoKey[];
}

export interface OpzioniPropostaCodici {
  fase: FaseMesociclo;
  tipoMicro: TipoMicrociclo;
  etaAtleta?: number | null;
  condizioni?: CondizioneMedica[];
}

const CODICI_QUALITA: CodiceAllenamentoKey[] = ['B1', 'B2', 'C1', 'C2', 'C3'];
const CODICI_AEROBICI: CodiceAllenamentoKey[] = ['A1', 'A2', 'D'];

function quoteBase(fase: FaseMesociclo, tipo: TipoMicrociclo): Partial<Record<CodiceAllenamentoKey, number>> {
  switch (tipo) {
    case 'ADATTAMENTO':
    case 'RECUPERO':
      return { A1: 0.5, A2: 0.4, D: 0.1 };
    case 'SCARICO':
      return { A1: 0.45, A2: 0.25, B2: 0.15, D: 0.15 };
    case 'GARA':
      return { A1: 0.45, C3: 0.3, D: 0.25 };
    case 'PAUSA':
      return { A1: 1 };
    case 'CARICO':
      switch (fase) {
        case 'PREPARAZIONE_GENERALE':
          return { A1: 0.3, A2: 0.45, B1: 0.2, D: 0.05 };
        case 'PREPARAZIONE_SPECIFICA':
          return { A1: 0.25, A2: 0.3, B1: 0.2, B2: 0.15, D: 0.1 };
        case 'PRE_GARA':
          return { A1: 0.3, A2: 0.2, B2: 0.2, C1: 0.15, D: 0.15 };
        case 'COMPETITIVA':
          return { A1: 0.35, A2: 0.15, C2: 0.2, C3: 0.15, D: 0.15 };
      }
  }
}

const ORDINAMENTO_CANONICO: CodiceAllenamentoKey[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3', 'D'];

function regolaQuote({
  fase,
  tipoMicro,
  etaAtleta = null,
  condizioni = [],
}: OpzioniPropostaCodici): Record<CodiceAllenamentoKey, number> {
  const quote: Record<CodiceAllenamentoKey, number> = {
    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, C3: 0, D: 0,
    ...quoteBase(fase, tipoMicro),
  };

  const sposta = (da: CodiceAllenamentoKey, a: CodiceAllenamentoKey, frazione: number) => {
    const spostamento = quote[da] * frazione;
    quote[da] -= spostamento;
    quote[a] += spostamento;
  };

  if (etaAtleta != null) {
    if (etaAtleta < 12) {
      for (const codice of ['C1', 'C2'] as const) {
        sposta(codice, 'A1', 0.6);
        sposta(codice, 'D', 1);
      }
    } else if (etaAtleta >= 35) {
      for (const codice of ['C1', 'C2'] as const) sposta(codice, 'A1', 0.5);
    } else if (etaAtleta <= 14) {
      sposta('C2', 'B1', 0.5);
    }
  }

  const testoCondizioni = condizioni
    .filter(condizione => condizione.attiva)
    .map(condizione => `${condizione.descrizione} ${condizione.limitazioni}`)
    .join(' | ');
  const flag = FINPSpecialistAI.flagMedici(testoCondizioni);

  if (flag.spalla) sposta('B2', 'A1', 0.4);
  if (flag.neurologica) {
    for (const codice of ['C1', 'C2'] as const) {
      sposta(codice, 'A2', 0.7);
      sposta(codice, 'A1', 1);
    }
    // Con compromissione neurologica/funzionale il lattacido alto e' escluso, non solo ridotto.
    quote.C1 = 0;
    quote.C2 = 0;
  }
  if (flag.cardiorespiratoria) {
    sposta('C2', 'A2', 1);
    sposta('C1', 'A2', 0.5);
    sposta('B2', 'A2', 0.7);
  }

  return quote;
}

/** Codici ancora compatibili dopo le regole di età e condizioni (non solo i due migliori). */
export function codiciConsentiti(opts: OpzioniPropostaCodici): CodiceAllenamentoKey[] {
  const quote = regolaQuote(opts);
  return ORDINAMENTO_CANONICO.filter(codice => quote[codice] > 0.005);
}

export function generaCodiciSeduta(opts: OpzioniPropostaCodici): PropostaCodiciSeduta {
  const quote = regolaQuote(opts);

  const codiciQualita = CODICI_QUALITA
    .filter(codice => quote[codice] > 0.01)
    .sort((a, b) => quote[b] - quote[a]);
  const candidati = codiciQualita.length > 0
    ? codiciQualita
    : CODICI_AEROBICI.filter(codice => quote[codice] > 0.01).sort((a, b) => quote[b] - quote[a]);

  return { codici: candidati.slice(0, 2).length > 0 ? candidati.slice(0, 2) : ['A1'] };
}
