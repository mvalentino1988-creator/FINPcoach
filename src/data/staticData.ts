/**
 * Dati statici voluminosi (record FINP e regolamenti).
 *
 * Vivono in `public/data` e vengono scaricati una sola volta all'avvio:
 * tenerli fuori dal bundle evita ~1,2 MB di JSON da trasferire e parsare a
 * ogni avvio dell'app. Restano comunque disponibili offline, perché in
 * Android i file sono impacchettati negli asset e serviti localmente da
 * `appassets.androidplatform.net` (nessuna rete richiesta).
 */

let records: unknown = null;
let regolamenti: unknown = null;
let caricamento: Promise<void> | null = null;

async function caricaJson(nome: string): Promise<unknown> {
  const url = new URL(`data/${nome}`, document.baseURI).toString();
  const risposta = await fetch(url);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status} su ${nome}`);
  return risposta.json();
}

/**
 * Carica i dataset statici. Idempotente: le chiamate successive riusano la
 * cache e non ripetono la richiesta.
 */
export function caricaDatiStatici(): Promise<void> {
  if (records && regolamenti) return Promise.resolve();
  if (caricamento) return caricamento;

  caricamento = (async () => {
    const [rec, reg] = await Promise.allSettled([
      caricaJson('records.json'),
      caricaJson('regolamenti.json')
    ]);
    if (rec.status === 'fulfilled') records = rec.value;
    else console.error('Record FINP non caricati:', rec.reason);
    if (reg.status === 'fulfilled') regolamenti = reg.value;
    else console.error('Regolamenti non caricati:', reg.reason);
    caricamento = null;
  })();

  return caricamento;
}

/** Payload dei record (null finché `caricaDatiStatici()` non è terminato). */
export function payloadRecord(): unknown | null {
  return records;
}

/** Payload dei regolamenti (null finché `caricaDatiStatici()` non è terminato). */
export function payloadRegolamenti(): unknown | null {
  return regolamenti;
}
