/**
 * Firebase Configuration
 * 
 * Per usare Firebase Sync:
 * 1. Crea un progetto su https://console.firebase.google.com/
 * 2. Abilita Firestore Database e Authentication (Email/Password)
 * 3. Copia la configurazione qui sotto
 * 4. Aggiungi le variabili d'ambiente nel tuo file .env locale
 */

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || '',
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || ''
};

/**
 * Verifica se la configurazione Firebase è completa
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

export default firebaseConfig;
