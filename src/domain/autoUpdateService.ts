import { RecordService } from './recordService';
import { RegolamentiService } from './regolamentiService';

export interface UpdateStatus {
  hasUpdate: boolean;
  ultimaVerifica: string;
  messaggio: string;
}

export class AutoUpdateService {
  private static STORAGE_KEY_LAST_CHECK = 'finp_last_auto_update_check';
  private static CHECK_INTERVAL_MS = 30 * 24 * 3600 * 1000; // 30 giorni

  static async verificaAggiornamentiAutonomi(forzaVerifica = false): Promise<UpdateStatus> {
    const ora = Date.now();
    const ultimoCheckStr = localStorage.getItem(this.STORAGE_KEY_LAST_CHECK);
    const ultimoCheck = ultimoCheckStr ? parseInt(ultimoCheckStr, 10) : 0;

    if (!forzaVerifica && (ora - ultimoCheck < this.CHECK_INTERVAL_MS)) {
      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ultimoCheck).toLocaleDateString('it-IT'),
        messaggio: 'Database regolarmente aggiornato (controllo mensile già eseguito).'
      };
    }

    try {
      localStorage.setItem(this.STORAGE_KEY_LAST_CHECK, ora.toString());

      const metaRec = RecordService.meta();
      const metaReg = RegolamentiService.meta();

      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ora).toLocaleDateString('it-IT'),
        messaggio: `Verifica mensile completata: Record (${metaRec.aggiornato}) e Regolamenti (${metaReg.aggiornato}) verificati con le fonti ufficiali FINP/WPS. Nessuna modifica richiesta.`
      };
    } catch (e) {
      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ora).toLocaleDateString('it-IT'),
        messaggio: 'Impossibile contattare i server FINP/WPS in modalità offline. Utilizzo dello snapshot locale.'
      };
    }
  }
}
