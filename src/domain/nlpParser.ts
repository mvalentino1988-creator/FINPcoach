export interface RisultatoParsing { successo: boolean; dati?: any; messaggio: string; domande?: string[]; }
export function parseTempo(t: string): RisultatoParsing { return { successo: true, messaggio: '', dati: {} }; }
export function parseSeduta(t: string): RisultatoParsing { return { successo: true, messaggio: '', dati: {} }; }
export const formattaTempoDisplay = (t: any) => '';
export const STILE_ETICHETTE = {};
