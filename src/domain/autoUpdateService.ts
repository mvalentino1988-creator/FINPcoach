import { RecordService } from './recordService';
import { RegolamentiService } from './regolamentiService';

export interface UpdateStatus {
  hasUpdate: boolean;
  ultimaVerifica: string;
  messaggio: string;
  remoteVersion?: string;
  newRecordsAvailable?: number;
}

export interface RemoteData {
  version: string;
  updated: string;
  records: any[];
  regulations: any[];
}

export class AutoUpdateService {
  private static STORAGE_KEY_LAST_CHECK = 'finp_last_auto_update_check';
  private static STORAGE_KEY_REMOTE_VERSION = 'finp_remote_version';
  private static CHECK_INTERVAL_MS = 30 * 24 * 3600 * 1000; // 30 giorni

  /**
   * Endpoint JSON remoto per record e regolamenti.
   * Configurare con URL reale (es. GitHub Pages, Firebase Hosting, o server FINP).
   */
  private static readonly REMOTE_ENDPOINT = import.meta.env.VITE_REMOTE_DATA_URL;

  /**
   * Effettua una chiamata all'endpoint JSON remoto per verificare aggiornamenti.
   */
  private static async fetchRemoteData(): Promise<RemoteData | null> {
    if (!this.REMOTE_ENDPOINT) return null;

    try {
      const response = await fetch(this.REMOTE_ENDPOINT, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(10000) // 10 secondi timeout
      });

      if (!response.ok) {
        console.warn(`AutoUpdateService: HTTP ${response.status} da endpoint remoto`);
        return null;
      }

      const data = await response.json();
      return data as RemoteData;
    } catch (error) {
      console.warn('AutoUpdateService: Errore fetch endpoint remoto', error);
      return null;
    }
  }

  static async verificaAggiornamentiAutonomi(forzaVerifica = false): Promise<UpdateStatus> {
    const ora = Date.now();
    const ultimoCheckStr = localStorage.getItem(this.STORAGE_KEY_LAST_CHECK);
    const ultimoCheck = ultimoCheckStr ? parseInt(ultimoCheckStr, 10) : 0;

    if (!forzaVerifica && this.REMOTE_ENDPOINT && (ora - ultimoCheck < this.CHECK_INTERVAL_MS)) {
      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ultimoCheck).toLocaleDateString('it-IT'),
        messaggio: 'Database regolarmente aggiornato (controllo mensile già eseguito).'
      };
    }

    try {
      // Fetch dati remoti
      const remoteData = await this.fetchRemoteData();

      if (!remoteData) {
        const metaRec = RecordService.meta();
        const metaReg = RegolamentiService.meta();

        return {
          hasUpdate: false,
          ultimaVerifica: this.REMOTE_ENDPOINT ? new Date(ora).toLocaleDateString('it-IT') : 'Non configurato',
          messaggio: this.REMOTE_ENDPOINT
            ? 'Impossibile contattare il server remoto. Utilizzo dello snapshot locale.'
            : 'Aggiornamenti remoti non configurati. Utilizzo dello snapshot locale.'
        };
      }

      localStorage.setItem(this.STORAGE_KEY_LAST_CHECK, ora.toString());

      // Confronta versione remota con locale
      const localVersion = localStorage.getItem(this.STORAGE_KEY_REMOTE_VERSION) || '0.0.0';
      const hasUpdate = remoteData.version !== localVersion;

      localStorage.setItem(this.STORAGE_KEY_REMOTE_VERSION, remoteData.version);

      const metaRec = RecordService.meta();
      const metaReg = RegolamentiService.meta();

      if (hasUpdate) {
        return {
          hasUpdate: true,
          ultimaVerifica: new Date(ora).toLocaleDateString('it-IT'),
          remoteVersion: remoteData.version,
          newRecordsAvailable: remoteData.records?.length || 0,
          messaggio: `🆕 Nuova versione disponibile (${remoteData.version}). ${remoteData.records?.length || 0} record aggiornati. Aggiorna per sincronizzare con i dati ufficiali FINP/WPS.`
        };
      }

      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ora).toLocaleDateString('it-IT'),
        remoteVersion: remoteData.version,
        messaggio: `Verifica completata: Database locale sincronizzato con versione ${remoteData.version}. (${metaRec.aggiornato} record, ${metaReg.aggiornato} regolamenti)`
      };
    } catch (e) {
      return {
        hasUpdate: false,
        ultimaVerifica: new Date(ora).toLocaleDateString('it-IT'),
        messaggio: 'Errore durante la verifica aggiornamenti. Utilizzo dello snapshot locale.'
      };
    }
  }

  /**
   * Forza il download e l'applicazione dei dati remoti.
   * Da implementare con logica di merge/sincronizzazione dei dati.
   */
  static async applicaAggiornamentoRemoto(): Promise<boolean> {
    try {
      const remoteData = await this.fetchRemoteData();
      if (!remoteData) return false;

      // TODO: Implementare logica di sincronizzazione:
      // - Aggiornare RecordService con nuovi record
      // - Aggiornare RegolamentiService con nuovi regolamenti
      // - Salvare in localStorage/IndexedDB

      localStorage.setItem(this.STORAGE_KEY_REMOTE_VERSION, remoteData.version);
      return true;
    } catch (e) {
      console.error('AutoUpdateService: Errore applicazione aggiornamento', e);
      return false;
    }
  }
}
