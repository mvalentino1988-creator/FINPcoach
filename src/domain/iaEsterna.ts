/**
 * Integrazione con un'IA esterna per la creazione di una scheda di allenamento.
 *
 * Due modalita':
 *  1. endpoint OpenAI-compatible configurato dall'allenatore (chiamata diretta)
 *  2. fallback: prompt copiato negli appunti e IA web aperta in una nuova scheda
 *
 * Il risultato viene sempre convertito nel formato testuale usato dalle schede
 * manuali, cosi' entra nello stesso flusso di salvataggio/stampa.
 */

import {
  Atleta,
  CondizioneMedica,
  FaseMesociclo,
  ParametriSeduta,
  Tempo,
  TipoMicrociclo,
} from '../types';
import { formattaData } from './dateUtils';
import { DURATA_MAX, DURATA_MIN, VASCHE_VALIDE } from './parametriSeduta';
import { formattaTempo } from './tempoUtils';

export type ProviderWebIA = 'chatgpt' | 'claude' | 'gemini';

export interface IAConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  providerWeb: ProviderWebIA;
}

export const IA_CONFIG_DEFAULT: IAConfig = {
  endpoint: '',
  model: '',
  apiKey: '',
  providerWeb: 'chatgpt',
};

export function configIAValida(config: IAConfig): boolean {
  return Boolean(config.endpoint.trim() && config.model.trim() && config.apiKey.trim());
}

export interface IAContesto {
  data: string;
  atleta: Atleta | null;
  squadra: boolean;
  etaAtleta: number | null;
  fase: FaseMesociclo;
  tipoMicro: TipoMicrociclo;
  parametri: ParametriSeduta;
  volumeSessione: number;
  volumeSettimana: number;
  condizioni: CondizioneMedica[];
  tempi: Tempo[];
  note: string[];
}

export interface IASerieProposta {
  sezione?: string;
  codice?: string;
  ripetizioni: number;
  distanza: number;
  descrizione: string;
}

export interface IARisposta {
  titolo?: string;
  serie: IASerieProposta[];
  note?: string;
}



const FASI: Record<FaseMesociclo, string> = {
  PREPARAZIONE_GENERALE: 'Preparazione generale',
  PREPARAZIONE_SPECIFICA: 'Preparazione specifica',
  PRE_GARA: 'Pre-gara',
  COMPETITIVA: 'Competitiva',
};

const TIPI: Record<TipoMicrociclo, string> = {
  ADATTAMENTO: 'adattamento',
  CARICO: 'carico',
  SCARICO: 'scarico',
  RECUPERO: 'recupero',
  GARA: 'gara',
  PAUSA: 'pausa',
};

export function costruisciPromptScheda(ctx: IAContesto, ripartizioneCodici?: Partial<Record<string, number>>): string {
  const destinatario = ctx.atleta
    ? `${ctx.atleta.cognome} ${ctx.atleta.nome}` +
      (ctx.atleta.classeS ? ` (classe S${ctx.atleta.classeS}${ctx.atleta.classeSB ? `, SB${ctx.atleta.classeSB}` : ''}${ctx.atleta.classeSM ? `, SM${ctx.atleta.classeSM}` : ''})` : '')
    : 'Squadra (scheda collettiva)';

  const condizioni = ctx.condizioni.length > 0
    ? ctx.condizioni.map((c) => `- ${c.descrizione}: ${c.limitazioni || 'nessuna limitazione indicata'}`).join('\n')
    : '- Nessuna condizione medica segnalata';

  const tempi = ctx.tempi.length > 0
    ? ctx.tempi.slice(0, 8).map((t) => `- ${t.distanzaMetri}m ${t.stile.replace('_', ' ').toLowerCase()}: ${formattaTempo(t.centesimi)} (${formattaData(t.data)})`).join('\n')
    : '- Nessun tempo registrato';

  const vasca = VASCHE_VALIDE.includes(ctx.parametri.vascaMetri as 25 | 50) ? ctx.parametri.vascaMetri : 25;

  // Se viene fornita la ripartizione dei codici, include nel prompt
  const codiciSection = ripartizioneCodici && Object.keys(ripartizioneCodici).length > 0
    ? `\n## Ripartizione dei Codici Obiettivo (calcolata dal sistema)\n${Object.entries(ripartizioneCodici)
        .map(([codice, metri]) => `- ${codice}: ${metri}m`)
        .join('\n')}`
    : '';

  return `Sei un allenatore di nuoto paralimpico FINP esperto. Progetta UNA seduta di allenamento DETTAGLIATA con esercizi specifici.

## Atleta
- Destinatario: ${destinatario}
- Età: ${ctx.etaAtleta != null ? `${ctx.etaAtleta} anni` : 'non disponibile'}
- Data seduta: ${formattaData(ctx.data)}

## Contesto della seduta
- Fase della stagione: ${FASI[ctx.fase] ?? ctx.fase}
- Tipo microciclo: ${TIPI[ctx.tipoMicro] ?? ctx.tipoMicro}
- Vasca: ${vasca} metri
- Durata disponibile: ${ctx.parametri.durataMin} minuti
- Volume target della singola seduta: ${ctx.volumeSessione} m (settimana: ${ctx.volumeSettimana} m)
- Note tecniche: ${ctx.note.length > 0 ? ctx.note.join(' | ') : 'nessuna'}
${codiciSection}

## Condizioni mediche e limitazioni
${condizioni}

## Tempi recenti dell'atleta
${tempi}

## Regole di prescrizione IMPORTANTI
1. Rispetta la vasca da ${vasca}m: usa distanze multiple di ${vasca}m (${vasca}, ${vasca * 2}, ${vasca * 4}, ...). Non prescrivere 25m in vasca da 50m.
2. ${ripartizioneCodici ? 'RISPETTA ESATTAMENTE la ripartizione dei codici fornita sopra. Il volume totale deve essere vicino a ' + ctx.volumeSessione + 'm (tolleranza +/-10%).' : 'Il volume totale delle serie deve essere vicino a ' + ctx.volumeSessione + 'm (tolleranza +/-10%).'}
3. Usa i codici di intensità FINP: A1 (riscaldamento/tecnica), A2 (fondo aerobico), B1 (soglia), B2 (VO2max), C1/C2 (lattacido/potenza), C3 (ritmo gara), D (velocità/reattività).
4. Rispetta le limitazioni mediche: riduci o elimina i codici controindicati e spiega il motivo nelle note.
5. Struttura consigliata: riscaldamento, attivazione/tecnica, serie principale, defaticamento.
6. Includi recuperi/ripartenze in secondi per ogni serie principale.
7. PER OGNI SERIE: specifica numero ripetizioni, distanza, descrizione dettagliata dell'esercizio (es. "4x100m stile libero a 1'30" con focus tecnico specifico).

## Formato di risposta (SOLO JSON valido, nessun testo fuori)
{
  "titolo": "titolo breve della seduta",
  "serie": [
    {
      "sezione": "Riscaldamento",
      "codice": "A1",
      "ripetizioni": 1,
      "distanza": 400,
      "descrizione": "stile libero e dorso sciolti, 200m con pull buoy, focus su assetto orizzontale"
    }
  ],
  "note": "eventuali avvertenze mediche o indicazioni per l'allenatore"
}`;
}

/** Estrae il primo oggetto JSON valido da una risposta testuale (gestisce i code fence). */
export function estraiRisposta(testo: string): IARisposta | null {
  if (!testo) return null;
  const pulito = testo.replace(/```(?:json)?/gi, '').trim();
  const inizio = pulito.indexOf('{');
  const fine = pulito.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) return null;

  try {
    const obj = JSON.parse(pulito.slice(inizio, fine + 1));
    const serieRaw = Array.isArray(obj?.serie) ? obj.serie : Array.isArray(obj?.series) ? obj.series : null;
    if (!serieRaw) return null;

    const serie: IASerieProposta[] = serieRaw
      .map((s: any) => ({
        sezione: typeof s?.sezione === 'string' ? s.sezione : undefined,
        codice: typeof s?.codice === 'string' ? s.codice.toUpperCase() : undefined,
        ripetizioni: Number(s?.ripetizioni ?? s?.reps ?? 1),
        distanza: Number(s?.distanza ?? s?.distance ?? 0),
        descrizione: String(s?.descrizione ?? s?.description ?? ''),
      }))
      .filter((s: IASerieProposta) => s.distanza > 0);

    if (serie.length === 0) return null;
    return {
      titolo: typeof obj?.titolo === 'string' ? obj.titolo : undefined,
      serie,
      note: typeof obj?.note === 'string' ? obj.note : undefined,
    };
  } catch {
    return null;
  }
}

/** Converte la risposta IA nel formato testuale delle schede manuali. */
export function rispostaToTesto(risposta: IARisposta): string {
  const righe: string[] = [];
  let sezioneCorrente = '';
  for (const s of risposta.serie) {
    if (s.sezione && s.sezione !== sezioneCorrente) {
      sezioneCorrente = s.sezione;
      righe.push(sezioneCorrente);
    }
    const rip = Math.max(1, Math.round(s.ripetizioni || 1));
    const dist = Math.max(1, Math.round(s.distanza));
    const codice = (s.codice || '').toUpperCase();
    const parti = [`${rip}x${dist}`];
    if (codice) parti.push(codice);
    if (s.descrizione) parti.push(s.descrizione);
    righe.push(parti.join(' '));
  }
  return righe.join('\n').trim();
}

export interface EsitoChiamataIA {
  ok: boolean;
  testo?: string;
  errore?: string;
}

/** Chiamata a un endpoint OpenAI-compatible (`/chat/completions`). */
export async function chiamaIA(config: IAConfig, prompt: string, timeoutMs = 90000): Promise<EsitoChiamataIA> {
  if (!configIAValida(config)) {
    return { ok: false, errore: 'Configura endpoint, modello e API key nelle impostazioni IA.' };
  }

  const base = config.endpoint.trim().replace(/\/+$/, '');
  const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'Rispondi solo con JSON valido conforme allo schema richiesto, senza commenti.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => '');
      return {
        ok: false,
        errore: `Errore ${res.status}${corpo ? `: ${corpo.slice(0, 300)}` : ''}`,
      };
    }

    const json = await res.json();
    const testo = json?.choices?.[0]?.message?.content;
    if (typeof testo !== 'string' || !testo.trim()) {
      return { ok: false, errore: 'Risposta IA vuota o in formato inatteso.' };
    }
    return { ok: true, testo };
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Timeout della richiesta IA.' : (e?.message || 'Errore di rete.');
    return { ok: false, errore: msg };
  } finally {
    clearTimeout(timer);
  }
}

export function urlProviderWeb(provider: ProviderWebIA, prompt: string): string {
  const q = encodeURIComponent(prompt);
  switch (provider) {
    case 'claude':
      return `https://claude.ai/new?q=${q}`;
    case 'gemini':
      return `https://gemini.google.com/app?q=${q}`;
    default:
      return `https://chatgpt.com/?q=${q}`;
  }
}

/**
 * Fallback senza API: copia il prompt e apre l'IA web.
 * Ritorna false se il browser blocca gli appunti (in quel caso il prompt resta
 * visibile nel modal per copia manuale).
 */
export async function apriIAWeb(provider: ProviderWebIA, prompt: string): Promise<boolean> {
  let copiato = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copiato = true;
  } catch {
    copiato = false;
  }
  window.open(urlProviderWeb(provider, prompt), '_blank', 'noopener,noreferrer');
  return copiato;
}

export function etichettaParametri(p: ParametriSeduta): string {
  const durata = Math.min(DURATA_MAX, Math.max(DURATA_MIN, p.durataMin || 0));
  return `vasca ${p.vascaMetri}m · ${durata} min`;
}

/**
 * Costruisce un prompt per generare SOLO i codici di allenamento per la sessione odierna,
 * senza specificare gli esercizi dettagliati. L'IA suggerirà la ripartizione dei codici
 * (A1, A2, B1, B2, C1, C2, C3, D) e il target di metri per ogni codice.
 */
export function costruisciPromptSessioneCodici(ctx: IAContesto): string {
  const destinatario = ctx.atleta
    ? `${ctx.atleta.cognome} ${ctx.atleta.nome}` +
      (ctx.atleta.classeS ? ` (classe S${ctx.atleta.classeS}${ctx.atleta.classeSB ? `, SB${ctx.atleta.classeSB}` : ''}${ctx.atleta.classeSM ? `, SM${ctx.atleta.classeSM}` : ''})` : '')
    : 'Squadra (sessione collettiva)';

  const condizioni = ctx.condizioni.length > 0
    ? ctx.condizioni.map((c) => `- ${c.descrizione}: ${c.limitazioni || 'nessuna limitazione indicata'}`).join('\n')
    : '- Nessuna condizione medica segnalata';

  const tempi = ctx.tempi.length > 0
    ? ctx.tempi.slice(0, 8).map((t) => `- ${t.distanzaMetri}m ${t.stile.replace('_', ' ').toLowerCase()}: ${formattaTempo(t.centesimi)} (${formattaData(t.data)})`).join('\n')
    : '- Nessun tempo registrato';

  const vasca = VASCHE_VALIDE.includes(ctx.parametri.vascaMetri as 25 | 50) ? ctx.parametri.vascaMetri : 25;

  return `Sei un allenatore di nuoto paralimpico FINP esperto. Progetta la RIPARTIZIONE DEI CODICI per UNA seduta di allenamento odierna.

## Atleta
- Destinatario: ${destinatario}
- Età: ${ctx.etaAtleta != null ? `${ctx.etaAtleta} anni` : 'non disponibile'}
- Data seduta: ${formattaData(ctx.data)}

## Contesto della seduta
- Fase della stagione: ${FASI[ctx.fase] ?? ctx.fase}
- Tipo microciclo: ${TIPI[ctx.tipoMicro] ?? ctx.tipoMicro}
- Vasca: ${vasca} metri
- Durata disponibile: ${ctx.parametri.durataMin} minuti
- Volume target della singola seduta: ${ctx.volumeSessione} m (settimana: ${ctx.volumeSettimana} m)
- Note tecniche: ${ctx.note.length > 0 ? ctx.note.join(' | ') : 'nessuna'}

## Condizioni mediche e limitazioni
${condizioni}

## Tempi recenti dell'atleta
${tempi}

## Istruzioni IMPORTANTI
1. NON specificare esercizi dettagliati (es. "4x100m stile libero con pull buoy")
2. Fornisci SOLO la ripartizione dei codici di intensità FINP per questa seduta
3. Codici disponibili: A1 (riscaldamento/tecnica), A2 (fondo aerobico), B1 (soglia), B2 (VO2max), C1 (lattacido), C2 (potenza), C3 (ritmo gara), D (velocità/reattività)
4. Per ogni codice specifica: percentuale del volume totale o metri target
5. Rispetta le limitazioni mediche: riduci o elimina i codici controindicati
6. Adatta la ripartizione alla fase della stagione e al tipo di microciclo
7. Considera l'età dell'atleta per l'intensità appropriata

## Formato di risposta (SOLO JSON valido, nessun testo fuori)
{
  "titolo": "titolo breve della sessione (es. 'Seduta di qualità B1/B2')",
  "ripartizione": [
    {
      "codice": "A1",
      "metri": 400,
      "percentuale": 20,
      "motivazione": "riscaldamento tecnico con focus su assetto"
    }
  ],
  "note": "spiegazione sintetica della strategia di allenamento e avvertenze mediche"
}`;
}
