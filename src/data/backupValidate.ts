/**
 * Validazione del file di backup FINPcoach (JSON).
 * Funzioni pure, senza dipendenze: usate da storage.importBackup e testate
 * in ambiente node.
 */

export const BACKUP_VERSIONE = '1.1';
const VERSIONI_ACCETTATE = new Set(['1.0', BACKUP_VERSIONE]);

export interface BackupValidato {
  ok: boolean;
  /** Errori bloccanti: se presenti, l'importazione non parte. */
  errors: string[];
  /** Avvisi non bloccanti (es. riferimenti orfani). */
  warnings: string[];
  /** Dati parsati e validati (solo se ok). */
  data: Record<string, unknown> | null;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isDateStr = (v: unknown): v is string =>
  isStr(v) && /^\d{4}-\d{2}-\d{2}/.test(v);

function validaArray(
  nome: string,
  v: unknown,
  errors: string[],
  check: (item: unknown, i: number) => string[]
): unknown[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    errors.push(`${nome}: atteso un array`);
    return undefined;
  }
  const out: unknown[] = [];
  v.forEach((item, i) => {
    for (const e of check(item, i)) errors.push(`${nome}[${i}]: ${e}`);
    out.push(item);
  });
  return out;
}

function idUnivoci(items: unknown[], campo: string, errors: string[], nome: string): void {
  const visti = new Set<unknown>();
  for (const it of items) {
    if (!isObj(it)) continue;
    const id = it[campo];
    if (visti.has(id)) errors.push(`${nome}: id duplicato ${String(id)}`);
    visti.add(id);
  }
}

function checkConId(atletaCheck?: (item: Record<string, unknown>) => string[]): (item: unknown, i?: number) => string[] {
  return (item) => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err: string[] = [];
    if (!isNum(item.id) || item.id <= 0) err.push('id mancante o non valido');
    err.push(...(atletaCheck?.(item) ?? []));
    return err;
  };
}

function checkRifAtleta(getId: (item: Record<string, unknown>) => unknown, nome: string, atletaIds: Set<number>, warnings: string[]): (item: unknown, i: number) => string[] {
  return (item) => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err = checkConId()(item);
    const rid = getId(item);
    if (isNum(rid) && !atletaIds.has(rid)) {
      warnings.push(`${nome}: riferimento a atletaId ${rid} non presente nell'elenco atleti`);
    }
    return err;
  };
}

/**
 * Valida il contenuto di un backup. Ritorna sempre un oggetto con
 * errors/warnings; `data` è popolato solo se non ci sono errori.
 */
export function validaBackup(jsonString: string): BackupValidato {
  const errors: string[] = [];
  const warnings: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { ok: false, errors: ['File non è un JSON valido.'], warnings, data: null };
  }
  if (!isObj(raw)) {
    return { ok: false, errors: ['Il backup non contiene un oggetto valido.'], warnings, data: null };
  }

  // Versione: rifiuta esplicitamente versioni future sconosciute.
  const versione = isStr(raw.version) ? raw.version : null;
  if (versione == null) {
    errors.push('Campo "version" mancante: file non riconosciuto come backup FINPcoach.');
  } else if (!VERSIONI_ACCETTATE.has(versione)) {
    const num = parseFloat(versione);
    if (Number.isFinite(num) && num > parseFloat(BACKUP_VERSIONE)) {
      return {
        ok: false,
        errors: [`Backup di versione ${versione}: più recente di quella supportata (${BACKUP_VERSIONE}). Aggiorna l'app prima di importare.`],
        warnings,
        data: null,
      };
    }
    errors.push(`Versione backup non riconosciuta: ${versione}`);
  }

  // --- Sezioni array con validazione tipizzata ---
  const atleti = validaArray('atleti', raw.atleti, errors, item => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err: string[] = [];
    if (!isNum(item.id) || item.id <= 0) err.push('id non valido');
    if (!isStr(item.nome) || !item.nome.trim()) err.push('nome mancante');
    if (!isStr(item.cognome) || !item.cognome.trim()) err.push('cognome mancante');
    if (item.classeS !== undefined && !(isNum(item.classeS) && item.classeS >= 1 && item.classeS <= 14)) err.push('classeS fuori range 1-14');
    if (item.classeSB !== undefined && !(isNum(item.classeSB) && item.classeSB >= 1 && item.classeSB <= 14 && item.classeSB !== 10)) err.push('classeSB non valida (1-14, no 10)');
    if (item.classeSM !== undefined && !(isNum(item.classeSM) && item.classeSM >= 1 && item.classeSM <= 14)) err.push('classeSM fuori range 1-14');
    if (item.fattoreVolume !== undefined && !(isNum(item.fattoreVolume) && item.fattoreVolume > 0 && item.fattoreVolume <= 1)) err.push('fattoreVolume fuori range');
    if (item.dataNascita !== undefined && item.dataNascita !== null && !isDateStr(item.dataNascita)) err.push('dataNascita non valida');
    return err;
  });
  if (atleti) idUnivoci(atleti, 'id', errors, 'atleti');
  const atletaIds = new Set<number>((atleti ?? []).filter(isObj).map(x => x.id as number).filter(isNum));

  const conAtleta = (nome: string) =>
    checkRifAtleta(it => it.atletaId, nome, atletaIds, warnings);

  const condizioni = validaArray('condizioni', raw.condizioni, errors, conAtleta('condizioni'));
  if (condizioni) idUnivoci(condizioni, 'id', errors, 'condizioni');

  const assenze = validaArray('assenze', raw.assenze, errors, item => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err = checkConId()(item);
    const rid = item.atletaId;
    if (isNum(rid) && !atletaIds.has(rid)) warnings.push(`assenze: riferimento a atletaId ${rid} non presente`);
    if (!isDateStr(item.dal)) err.push('dal non valido');
    if (!isDateStr(item.al)) err.push('al non valido');
    if (item.ambito !== undefined && item.ambito !== 'TUTTO' && item.ambito !== 'ALLENAMENTO' && item.ambito !== 'GARA') {
      err.push('ambito non valido (TUTTO|ALLENAMENTO|GARA)');
    }
    if (item.garaId !== undefined && !(isNum(item.garaId) && item.garaId > 0)) err.push('garaId non valido');
    return err;
  });
  if (assenze) idUnivoci(assenze, 'id', errors, 'assenze');

  const tempi = validaArray('tempi', raw.tempi, errors, item => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err = checkConId()(item);
    const rid = item.atletaId;
    if (isNum(rid) && !atletaIds.has(rid)) warnings.push(`tempi: riferimento a atletaId ${rid} non presente`);
    if (!isDateStr(item.data)) err.push('data non valida');
    if (!(isNum(item.distanzaMetri) && item.distanzaMetri > 0)) err.push('distanzaMetri non valida');
    if (!(isNum(item.centesimi) && item.centesimi > 0)) err.push('centesimi non valido');
    if (item.vascaMetri !== undefined && !(item.vascaMetri === 25 || item.vascaMetri === 50)) err.push('vascaMetri deve essere 25 o 50');
    return err;
  });
  if (tempi) idUnivoci(tempi, 'id', errors, 'tempi');

  const logSedute = validaArray('logSedute', raw.logSedute, errors, item => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err = checkConId()(item);
    const rid = item.atletaId;
    if (isNum(rid) && !atletaIds.has(rid)) warnings.push(`logSedute: riferimento a atletaId ${rid} non presente`);
    if (!isDateStr(item.data)) err.push('data non valida');
    if (!isBool(item.presente)) err.push('presente non booleano');
    if (!(isNum(item.durataMin) && item.durataMin >= 0)) err.push('durataMin non valida');
    if (!(isNum(item.metriEffettivi) && item.metriEffettivi >= 0)) err.push('metriEffettivi non valido');
    return err;
  });
  if (logSedute) idUnivoci(logSedute, 'id', errors, 'logSedute');

  // --- Sezioni singole / array senza atletaId ---
  if (raw.stagione !== undefined && raw.stagione !== null) {
    if (!isObj(raw.stagione)) errors.push('stagione: atteso un oggetto o null');
    else {
      if (!isNum(raw.stagione.id)) errors.push('stagione.id non valido');
      if (!isDateStr(raw.stagione.inizio)) errors.push('stagione.inizio non valido');
      if (!isDateStr(raw.stagione.fine)) errors.push('stagione.fine non valido');
      if (!(raw.stagione.vascaMetri === 25 || raw.stagione.vascaMetri === 50)) errors.push('stagione.vascaMetri deve essere 25 o 50');
    }
  }
  for (const nome of ['chiusure', 'gare', 'macrocicli', 'mesocicli', 'microcicli', 'customWorkouts'] as const) {
    const v = raw[nome];
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) { errors.push(`${nome}: atteso un array`); continue; }
    v.forEach((item, i) => {
      if (!isObj(item)) errors.push(`${nome}[${i}]: atteso un oggetto`);
      else if (!isNum(item.id)) errors.push(`${nome}[${i}]: id non valido`);
    });
  }
  // Iscrizioni alle gare: chiave dedicata, inclusa in backup/validazione.
  const gareIds = new Set<number>();
  if (Array.isArray(raw.gare)) {
    for (const g of raw.gare) {
      if (isObj(g) && isNum(g.id)) gareIds.add(g.id);
    }
  }
  const iscrizioni = validaArray('iscrizioniGare', raw.iscrizioniGare, errors, item => {
    if (!isObj(item)) return ['atteso un oggetto'];
    const err = checkConId()(item);
    const rid = item.atletaId;
    if (isNum(rid) && !atletaIds.has(rid)) warnings.push(`iscrizioniGare: riferimento a atletaId ${rid} non presente`);
    if (!(isNum(item.garaId) && item.garaId > 0)) err.push('garaId non valido');
    else if (gareIds.size > 0 && !gareIds.has(item.garaId)) warnings.push(`iscrizioniGare: garaId ${item.garaId} non presente nell'elenco gare`);
    if (!['ISCRITTO', 'RITIRATO', 'ASSENTE'].includes(item.stato as string)) err.push('stato non valido');
    if (item.eventi !== undefined) {
      if (!Array.isArray(item.eventi)) err.push('eventi: atteso un array');
      else {
        item.eventi.forEach((e, i) => {
          if (!isObj(e)) { err.push(`eventi[${i}]: atteso un oggetto`); return; }
          if (!isStr(e.stile)) err.push(`eventi[${i}].stile mancante`);
          if (!(isNum(e.distanzaMetri) && e.distanzaMetri > 0)) err.push(`eventi[${i}].distanzaMetri non valida`);
        });
      }
    }
    return err;
  });
  if (iscrizioni) idUnivoci(iscrizioni, 'id', errors, 'iscrizioniGare');

  if (raw.impostazioni !== undefined && raw.impostazioni !== null && !isObj(raw.impostazioni)) {
    errors.push('impostazioni: atteso un oggetto');
  }
  if (raw.assegnazioneVasca !== undefined && raw.assegnazioneVasca !== null) {
    if (!isObj(raw.assegnazioneVasca)) errors.push('assegnazioneVasca: atteso un oggetto');
    else if (!isDateStr(raw.assegnazioneVasca.data)) errors.push('assegnazioneVasca.data non valida');
  }
  if (raw.mode !== undefined && raw.mode !== null && raw.mode !== 'demo' && raw.mode !== 'live') {
    errors.push('mode non riconosciuto');
  }

  if (errors.length > 0) return { ok: false, errors, warnings, data: null };
  return { ok: true, errors, warnings, data: raw };
}
