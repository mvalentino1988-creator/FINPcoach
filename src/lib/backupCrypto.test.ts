import { describe, expect, it } from 'vitest';
import { cifraBackup, decifraBackup, eBackupCifrato } from './backupCrypto';

const haWebCrypto = typeof crypto !== 'undefined' && !!crypto.subtle;

describe('backupCrypto', () => {
  it('eBackupCifrato riconosce il formato', () => {
    expect(eBackupCifrato('{"tipo":"finpcoach-backup-cifrato","data":"x"}')).toBe(true);
    expect(eBackupCifrato('{"version":"1.1"}', 'backup.finpbackup')).toBe(true);
    expect(eBackupCifrato('{"version":"1.1"}', 'backup.json')).toBe(false);
    expect(eBackupCifrato('non-json')).toBe(false);
  });

  it.skipIf(!haWebCrypto)('cifra e decifra con la stessa password', async () => {
    const plain = JSON.stringify({ version: '1.1', atleti: [] });
    const cifrato = await cifraBackup(plain, 'password-segreta-123');
    expect(eBackupCifrato(cifrato)).toBe(true);
    // Il ciphertext non contiene il plaintext.
    expect(cifrato).not.toContain('atleti');
    const out = await decifraBackup(cifrato, 'password-segreta-123');
    expect(out).toBe(plain);
  });

  it.skipIf(!haWebCrypto)('password sbagliata -> errore', async () => {
    const cifrato = await cifraBackup('{}', 'giusta');
    await expect(decifraBackup(cifrato, 'sbagliata')).rejects.toThrow();
  });
});
