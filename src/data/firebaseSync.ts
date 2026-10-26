import {
  initializeApp,
  getApps,
  FirebaseApp
} from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig, { isFirebaseConfigured } from './firebaseConfig';
import {
  Atleta,
  CondizioneMedica,
  Assenza,
  Tempo,
  LogSeduta,
  Stagione,
  Chiusura,
  Gara,
  Macrociclo,
  Mesociclo,
  Microciclo,
  ImpostazioniPiano
} from '../types';

/**
 * Struttura dati sincronizzata su Firebase
 */
export interface SyncData {
  version: string;
  lastSync: string; // ISO timestamp
  atleti: Atleta[];
  condizioni: CondizioneMedica[];
  assenze: Assenza[];
  tempi: Tempo[];
  logSedute: LogSeduta[];
  stagione: Stagione | null;
  chiusure: Chiusura[];
  gare: Gara[];
  macrocicli: Macrociclo[];
  mesocicli: Mesociclo[];
  microcicli: Microciclo[];
  impostazioni: ImpostazioniPiano;
  customWorkouts?: unknown[];
}

export type SyncStatus = 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  userId: string | null;
}

/**
 * FirebaseSync - Gestisce la sincronizzazione con Firebase Firestore
 */
export class FirebaseSync {
  private static app: FirebaseApp | null = null;
  private static db: Firestore | null = null;
  private static auth: Auth | null = null;
  private static unsubscribe: Unsubscribe | null = null;
  private static listeners: Set<(data: SyncData) => void> = new Set();
  private static state: SyncState = {
    status: 'disconnected',
    lastSync: null,
    error: null,
    userId: null
  };

  /**
   * Inizializza Firebase (singleton)
   */
  private static initialize(): boolean {
    if (this.app) return true;

    /* Senza chiavi configurate (tipico in sviluppo e per chi non usa il
       cloud) non si inizializza nulla: evita l'errore auth/invalid-api-key
       a ogni avvio e non tocca il SDK. */
    if (!isFirebaseConfigured()) {
      this.state.status = 'disconnected';
      return false;
    }

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.state.status = 'error';
      this.state.error = 'Errore inizializzazione Firebase';
      return false;
    }
  }

  /**
   * Login con email e password
   */
  static async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.initialize()) {
      return { success: false, error: 'Firebase non configurato' };
    }

    try {
      this.state.status = 'connecting';
      const userCredential = await signInWithEmailAndPassword(this.auth!, email, password);
      this.state.userId = userCredential.user.uid;
      this.state.status = 'synced';
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      this.state.status = 'error';
      this.state.error = this.getAuthErrorMessage(error.code);
      return { success: false, error: this.state.error };
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    if (this.auth) {
      await firebaseSignOut(this.auth);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.state = {
      status: 'disconnected',
      lastSync: null,
      error: null,
      userId: null
    };
  }

  /**
   * Ottieni l'utente corrente
   */
  static getCurrentUser(): User | null {
    return this.auth?.currentUser || null;
  }

  /**
   * Iscriviti ai cambiamenti dello stato di autenticazione
   */
  static onAuthStateChange(callback: (user: User | null) => void): () => void {
    try {
      if (!this.initialize() || !this.auth) {
        callback(null);
        return () => {};
      }
      return onAuthStateChanged(this.auth, callback);
    } catch (e) {
      console.error('Auth state change error:', e);
      callback(null);
      return () => {};
    }
  }

  /**
   * Carica i dati dal cloud con conflict resolution (ultimo wins)
   */
  static async loadFromCloud(localData: SyncData | null): Promise<SyncData | null> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId || !this.db) {
      return null;
    }

    try {
      this.state.status = 'syncing';
      const docRef = doc(this.db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as SyncData;
        
        // Conflict resolution: ultimo wins basato su timestamp
        if (localData && localData.lastSync) {
          const localTime = new Date(localData.lastSync).getTime();
          const cloudTime = new Date(cloudData.lastSync).getTime();
          
          if (cloudTime > localTime) {
            // Cloud è più recente, usa i dati cloud
            console.log('Conflict resolved: cloud data is newer');
            this.state.lastSync = cloudData.lastSync;
            localStorage.setItem('finp_last_sync', cloudData.lastSync);
            this.state.status = 'synced';
            return cloudData;
          } else {
            // Locale è più recente o uguale, mantieni locale
            console.log('Conflict resolved: local data is newer or equal');
            this.state.status = 'synced';
            return localData;
          }
        } else {
          // Nessun dato locale o senza timestamp, usa cloud
          this.state.lastSync = new Date().toISOString();
          this.state.status = 'synced';
          return cloudData;
        }
      } else {
        // Nessun dato nel cloud, salva locale come base
        if (localData) {
          await this.saveToCloud(localData);
        }
        this.state.status = 'synced';
        return localData;
      }
    } catch (error) {
      console.error('Load from cloud error:', error);
      this.state.status = 'error';
      this.state.error = 'Errore caricamento dati dal cloud';
      return localData; // Fallback ai dati locali
    }
  }

  /**
   * Salva i dati sul cloud
   */
  static async saveToCloud(data: SyncData): Promise<boolean> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId || !this.db) {
      return false;
    }

    try {
      this.state.status = 'syncing';
      const docRef = doc(this.db, 'users', userId);
      
      const dataWithTimestamp: SyncData = JSON.parse(JSON.stringify({
        ...data,
        version: '1.0',
        lastSync: new Date().toISOString()
      }));

      await setDoc(docRef, dataWithTimestamp);
      this.state.lastSync = dataWithTimestamp.lastSync;
      localStorage.setItem('finp_last_sync', dataWithTimestamp.lastSync);
      this.state.status = 'synced';
      return true;
    } catch (error) {
      console.error('Save to cloud error:', error);
      this.state.status = 'error';
      this.state.error = 'Errore salvataggio dati sul cloud';
      return false;
    }
  }

  /**
   * Iscriviti ai cambiamenti real-time dei dati dal cloud
   */
  static subscribeToUpdates(callback: (data: SyncData | null) => void): () => void {
    const userId = this.getCurrentUser()?.uid;
    if (!userId || !this.db) {
      return () => {};
    }

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const docRef = doc(this.db, 'users', userId);
    this.unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as SyncData);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Subscribe error:', error);
        this.state.status = 'error';
        this.state.error = 'Errore sincronizzazione real-time';
      }
    );

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  /**
   * Ottieni lo stato corrente della sincronizzazione
   */
  static getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Resetta lo stato della sincronizzazione
   */
  static resetState(): void {
    this.state = {
      status: 'disconnected',
      lastSync: null,
      error: null,
      userId: null
    };
  }

  /**
   * Converte messaggi di errore Firebase in messaggi italiani
   */
  private static getAuthErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
      'auth/invalid-email': 'Email non valida',
      'auth/user-disabled': 'Utente disabilitato',
      'auth/user-not-found': 'Utente non trovato',
      'auth/wrong-password': 'Password errata',
      'auth/email-already-in-use': 'Email già in uso',
      'auth/weak-password': 'Password troppo debole (minimo 6 caratteri)',
      'auth/too-many-requests': 'Troppi tentativi, riprova più tardi',
      'auth/network-request-failed': 'Errore di connessione, verifica la tua rete'
    };
    return errorMessages[code] || 'Errore di autenticazione';
  }
}
