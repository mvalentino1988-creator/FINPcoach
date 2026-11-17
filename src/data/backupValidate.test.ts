import { describe, expect, it } from 'vitest';
import { validaBackup, BACKUP_VERSIONE } from './backupValidate';

const base = {
  version: BACKUP_VERSIONE,
  timestamp: '2025-06-01T00:00:00Z',
  atleti: [
    { id: 1, nome: 'A', cognome: 'B', stato: 'UFFICIALE', fattoreVolume: 1, note: '', volumeAuto: true },
    { id: 2, nome: 'C', cognome: 'D', stato: 'UFFICIALE', fattoreVolume: 1, note: '', volumeAuto: true },
  ],
  condizioni: [],
  assenze: [],
  tempi: [{ id: 1, atletaId: 1, data: '2025-06-01', stile: 'STILE_LIBERO', distanzaMetri: 100, centesimi: 6000, contesto: 'GARA', vascaMetri: 50, note: '' }],
  logSedute: [{ id: 1, atletaId: 2, data: '2025-06-01', presente: true, durataMin: 60, metriEffettivi: 2000, note: '' }],
  stagione: { id: 1, nome: 'S', inizio: '2025-01-01', fine: '2025-12-31', vascaMetri: 50 },
  mode: 'demo',
};

describe('validaBackup', () => {
  it('accetta un backup valido', () => {
    const r = validaBackup(JSON.stringify(base));
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.data).not.toBeNull();
  });

  it('accetta ancora la versione 1.0', () => {
    const r = validaBackup(JSON.stringify({ ...base, version: '1.0' }));
    expect(r.ok).toBe(true);
  });

  it('rifiuta JSON non valido e oggetti non-oggetto', () => {
    expect(validaBackup('non-json').ok).toBe(false);
    expect(validaBackup('[1,2]').ok).toBe(false);
    expect(validaBackup('{}').ok).toBe(false);
  });

  it('rifiuta versioni future con messaggio chiaro', () => {
    const r = validaBackup(JSON.stringify({ ...base, version: '9.9' }));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/più recente/i);
  });

  it('segnala errori tipizzati: id duplicati, campi mancanti, range', () => {
    const r = validaBackup(JSON.stringify({
      ...base,
      atleti: [
        { id: 1, nome: 'A' }, // manca cognome
        { id: 1, nome: 'B', cognome: 'C' }, // id duplicato
        { id: 2, nome: 'D', cognome: 'E', classeS: 20 }, // classeS fuori range
      ],
      tempi: [{ id: 1, atletaId: 1, data: 'non-una-data', distanzaMetri: -5, centesimi: 0 }],
    }));
    expect(r.ok).toBe(false);
    const msg = r.errors.join(' | ');
    expect(msg).toMatch(/cognome mancante/);
    expect(msg).toMatch(/id duplicato/);
    expect(msg).toMatch(/classeS fuori range/);
    expect(msg).toMatch(/data non valida/);
    expect(msg).toMatch(/distanzaMetri non valida/);
    expect(msg).toMatch(/centesimi non valido/);
  });

  it('riferimenti orfani -> warning, non errore', () => {
    const r = validaBackup(JSON.stringify({
      ...base,
      tempi: [{ id: 1, atletaId: 999, data: '2025-06-01', distanzaMetri: 100, centesimi: 6000 }],
    }));
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes('999'))).toBe(true);
  });

  it('iaConfig presente in vecchi backup non genera errori (e non viene importato)', () => {
    const r = validaBackup(JSON.stringify({ ...base, iaConfig: { apiKey: 'segreta' } }));
    expect(r.ok).toBe(true);
  });
});
