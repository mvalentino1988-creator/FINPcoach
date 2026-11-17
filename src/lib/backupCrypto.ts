/**
 * Backup cifrato con password: WebCrypto AES-GCM-256 + PBKDF2-SHA256.
 *
 * File `.finpbackup`: JSON con salt/iv in chiaro e ciphertext in base64.
 * La password NON è mai salvata: se dimenticata, i dati non sono recuperabili.
 */

export const BACKUP_CIFRATO_TIPO = 'finpcoach-backup-cifrato';
export const BACKUP_CIFRATO_VERSIONE = 1;
const PBKDF2_ITER = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

export interface BackupCifratoFile {
  tipo: typeof BACKUP_CIFRATO_TIPO;
  v: number;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64
  iv: string;   // base64
  data: string; // base64 ciphertext
}

const te = new TextEncoder();
const td = new TextDecoder();

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derivaChiave(password: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Cifra un testo (backup JSON) e restituisce il contenuto del file .finpbackup. */
export async function cifraBackup(testo: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await derivaChiave(password, salt, PBKDF2_ITER);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    te.encode(testo)
  );
  const file: BackupCifratoFile = {
    tipo: BACKUP_CIFRATO_TIPO,
    v: BACKUP_CIFRATO_VERSIONE,
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITER,
    salt: b64encode(salt),
    iv: b64encode(iv),
    data: b64encode(ct),
  };
  return JSON.stringify(file);
}

/** Riconosce un file cifrato (contenuto o suffisso). */
export function eBackupCifrato(testo: string, nomeFile?: string): boolean {
  if (nomeFile?.toLowerCase().endsWith('.finpbackup')) return true;
  try {
    const j = JSON.parse(testo) as Partial<BackupCifratoFile>;
    return j?.tipo === BACKUP_CIFRATO_TIPO && typeof j.data === 'string';
  } catch {
    return false;
  }
}

/** Decifra un file .finpbackup. Lancia errore se password errata o file corrotto. */
export async function decifraBackup(testo: string, password: string): Promise<string> {
  let j: BackupCifratoFile;
  try {
    j = JSON.parse(testo) as BackupCifratoFile;
  } catch {
    throw new Error('File cifrato non leggibile.');
  }
  if (j?.tipo !== BACKUP_CIFRATO_TIPO || j.v !== BACKUP_CIFRATO_VERSIONE) {
    throw new Error('Formato di backup cifrato non supportato.');
  }
  const key = await derivaChiave(password, b64decode(j.salt), j.iter ?? PBKDF2_ITER);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(j.iv) as BufferSource },
      key,
      b64decode(j.data) as BufferSource
    );
    return td.decode(plain);
  } catch {
    throw new Error('Password errata o file danneggiato.');
  }
}
