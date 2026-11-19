// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock della config: forza Firebase "configurato" per esercitare i flussi,
// senza mai toccare la rete (i moduli SDK sono mockati sotto).
vi.mock('./firebaseConfig', () => ({
  default: { apiKey: 'test', projectId: 'test' },
  isFirebaseConfigured: () => true,
}));

const signInMock = vi.fn();
const createUserMock = vi.fn();
const signInPopupMock = vi.fn();
const signOutMock = vi.fn();
const setDocMock = vi.fn();
const getDocMock = vi.fn();
const onAuthStateChangedMock = vi.fn();
const onSnapshotMock = vi.fn();
const authState: { currentUser: { uid: string; email: string | null; displayName: string | null } | null } = { currentUser: null };

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ __app: true })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ __db: true })),
  doc: vi.fn((...a: unknown[]) => ({ __doc: a })),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  onSnapshot: (...a: unknown[]) => onSnapshotMock(...a),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => authState),
  signInWithEmailAndPassword: (...a: unknown[]) => signInMock(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => createUserMock(...a),
  signOut: (...a: unknown[]) => signOutMock(...a),
  onAuthStateChanged: (...a: unknown[]) => onAuthStateChangedMock(...a),
  GoogleAuthProvider: class {},
  signInWithPopup: (...a: unknown[]) => signInPopupMock(...a),
}));

import { FirebaseSync } from './firebaseSync';
import type { SyncData } from './firebaseSync';

const user = { uid: 'u1', email: 'a@b.c', displayName: null };
const okSignIn = async () => { authState.currentUser = user; return { user }; };
const okSignOut = async () => { authState.currentUser = null; };

const emptyData: SyncData = {
  version: '1', lastSync: '', atleti: [], condizioni: [], assenze: [],
  tempi: [], logSedute: [], stagione: null, chiusure: [], gare: [],
  iscrizioniGare: [], macrocicli: [], mesocicli: [], microcicli: [], impostazioni: {},
};

describe('FirebaseSync con SDK mockato', () => {
  beforeEach(() => {
    localStorage.clear();
    authState.currentUser = null;
    vi.clearAllMocks();
    signInMock.mockImplementation(okSignIn);
    createUserMock.mockImplementation(okSignIn);
    signInPopupMock.mockImplementation(okSignIn);
    signOutMock.mockImplementation(okSignOut);
    setDocMock.mockResolvedValue(undefined);
    getDocMock.mockResolvedValue({ exists: () => false, data: () => null });
    onAuthStateChangedMock.mockReturnValue(() => {});
    onSnapshotMock.mockReturnValue(() => {});
  });

  it('login riuscito imposta utente e stato synced', async () => {
    const r = await FirebaseSync.login('a@b.c', 'pw');
    expect(r.success).toBe(true);
    expect(FirebaseSync.getCurrentUser()?.uid).toBe('u1');
    expect(signInMock).toHaveBeenCalled();
  });

  it('login con errore SDK ritorna errore controllato', async () => {
    signInMock.mockRejectedValue(new Error('auth/wrong-password'));
    const r = await FirebaseSync.login('a@b.c', 'pw');
    expect(r.success).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('register riuscito', async () => {
    const r = await FirebaseSync.register('a@b.c', 'pw');
    expect(r.success).toBe(true);
    expect(createUserMock).toHaveBeenCalled();
  });

  it('loginWithGoogle usa signInWithPopup', async () => {
    const r = await FirebaseSync.loginWithGoogle();
    expect(r.success).toBe(true);
    expect(signInPopupMock).toHaveBeenCalled();
  });

  it('saveToCloud scrive su Firestore dopo login', async () => {
    await FirebaseSync.login('a@b.c', 'pw');
    const ok = await FirebaseSync.saveToCloud(emptyData);
    expect(ok).toBe(true);
    expect(setDocMock).toHaveBeenCalled();
    const payload = setDocMock.mock.calls[0][1] as SyncData;
    expect(payload.lastSync).toBeTruthy();
  });

  it('loadFromCloud con cloud vuoto mantiene i dati locali', async () => {
    await FirebaseSync.login('a@b.c', 'pw');
    const r = await FirebaseSync.loadFromCloud(emptyData);
    expect(r).toEqual(emptyData);
  });

  it('loadFromCloud con cloud più recente vince', async () => {
    await FirebaseSync.login('a@b.c', 'pw');
    const cloud = { ...emptyData, atleti: [{ id: 'x' } as never], lastSync: '2999-01-01T00:00:00.000Z' };
    getDocMock.mockResolvedValue({ exists: () => true, data: () => cloud });
    const r = await FirebaseSync.loadFromCloud(emptyData);
    expect(r?.atleti).toHaveLength(1);
  });

  it('logout resetta utente e stato', async () => {
    await FirebaseSync.login('a@b.c', 'pw');
    await FirebaseSync.logout();
    expect(FirebaseSync.getCurrentUser()).toBeNull();
    expect(signOutMock).toHaveBeenCalled();
  });

  it('onAuthStateChange senza consenso non tocca l SDK', () => {
    const cb = vi.fn();
    FirebaseSync.onAuthStateChange(cb);
    expect(cb).toHaveBeenCalledWith(null);
    expect(onAuthStateChangedMock).not.toHaveBeenCalled();
  });

  it('onAuthStateChange con consenso registra listener auth', async () => {
    localStorage.setItem('finp_sync_enabled', 'true');
    localStorage.setItem('finp_sync_consent', 'true');
    const cb = vi.fn();
    FirebaseSync.onAuthStateChange(cb);
    await new Promise(r => setTimeout(r, 20));
    expect(onAuthStateChangedMock).toHaveBeenCalled();
  });
});
