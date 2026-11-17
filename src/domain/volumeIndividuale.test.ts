import { describe, it, expect } from 'vitest';
import { VolumeIndividuale } from './volumeIndividuale';
import { Atleta, Assenza, Microciclo } from '../types';

const mkAtleta = (partial: Partial<Atleta> = {}): Atleta => ({
  id: 1, nome: 'Test', cognome: 'Atleta',
  stato: 'UFFICIALE', fattoreVolume: 1.0, note: '', volumeAuto: true,
  ...partial,
});

const mkMicro = (inizio: string, target = 30000): Microciclo => ({
  id: 1, mesocicloId: 1, inizio, fine: '',
  tipo: 'CARICO', sedutePreviste: 3, volumeTargetMetri: target,
  note: '', bloccato: false,
});

const mkAssenza = (dal: string, al: string, atletaId = 1): Assenza => ({
  id: 1, atletaId, dal, al, motivo: 'test',
});

describe('VolumeIndividuale.settimana', () => {
  it('settimana piena, fattore 1 -> target invariato', () => {
    const micro = mkMicro('2025-01-06', 30000); // lun 6 gen 2025
    const v = VolumeIndividuale.settimana(micro, mkAtleta(), []);
    expect(v.metri).toBe(30000);
    expect(v.note).toEqual([]);
  });

  it('fattore volume < 1 riduce il volume e aggiunge nota', () => {
    const micro = mkMicro('2025-01-06', 30000);
    const v = VolumeIndividuale.settimana(micro, mkAtleta({ fattoreVolume: 0.5 }), []);
    expect(v.metri).toBe(15000);
    expect(v.note).toContain('volume al 50%');
  });

  it('assenza parziale riduce proporzionalmente', () => {
    const micro = mkMicro('2025-01-06', 28000); // lun-dom
    const assenze = [mkAssenza('2025-01-06', '2025-01-07')]; // lun+mar assente
    const v = VolumeIndividuale.settimana(micro, mkAtleta(), assenze);
    expect(v.metri).toBe(Math.round(28000 * (5 / 7)));
    expect(v.note).toContain('assente 2 giorni');
  });

  it('assenza di tutta la settimana -> 0 metri', () => {
    const micro = mkMicro('2025-01-06', 30000);
    const assenze = [mkAssenza('2025-01-06', '2025-01-12')];
    const v = VolumeIndividuale.settimana(micro, mkAtleta(), assenze);
    expect(v.metri).toBe(0);
    expect(v.note).toContain('assente tutta la settimana');
  });

  it('assenza < 14 giorni non attiva il rientro graduale', () => {
    const micro = mkMicro('2025-01-13', 30000); // settimana dopo
    const assenze = [mkAssenza('2025-01-06', '2025-01-10')]; // 5 giorni
    const v = VolumeIndividuale.settimana(micro, mkAtleta(), assenze);
    expect(v.metri).toBe(30000);
    expect(v.note).not.toContain('rientro graduale');
  });

  it('rientro graduale: 60% nella settimana del rientro, 80% nella successiva', () => {
    // Assenza lunga: 6 gen -> 19 gen (14 giorni). Rientro lun 20 gen.
    const assenze = [mkAssenza('2025-01-06', '2025-01-19')];
    const microRientro = mkMicro('2025-01-20', 30000);
    const v1 = VolumeIndividuale.settimana(microRientro, mkAtleta(), assenze);
    expect(v1.metri).toBe(18000); // 60%
    expect(v1.note).toContain('rientro graduale');

    const microDopo = mkMicro('2025-01-27', 30000);
    const v2 = VolumeIndividuale.settimana(microDopo, mkAtleta(), assenze);
    expect(v2.metri).toBe(24000); // 80%
  });

  it('assenzze che non toccano la settimana non influenzano', () => {
    const micro = mkMicro('2025-02-03', 30000);
    const assenze = [mkAssenza('2025-01-01', '2025-01-05')]; // prima della settimana
    const v = VolumeIndividuale.settimana(micro, mkAtleta(), assenze);
    expect(v.metri).toBe(30000);
  });
});
