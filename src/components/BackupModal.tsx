import React, { useState, useRef, useEffect } from 'react';
import { FINPStorage } from '../data/storage';
import { FirebaseSync, SyncStatus } from '../data/firebaseSync';
import { isFirebaseConfigured } from '../data/firebaseConfig';
import { LoginScreen } from './LoginScreen';
import { Download, Upload, RefreshCw, X, ShieldCheck, Database, Cloud, CloudOff, LogOut, Loader2, Trash2, Info, AlertTriangle } from 'lucide-react';
import { Button, Modal, ToastProvider, useToast } from './ui';

interface Props {
  onClose: () => void;
}

export const BackupModal: React.FC<Props> = (props) => (
  <ToastProvider>
    <BackupModalContent {...props} />
  </ToastProvider>
);

const BackupModalContent: React.FC<Props> = ({ onClose }) => {
  const { toast } = useToast();
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Firebase sync state
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const isConfigured = isFirebaseConfigured();

  // Load sync settings
  useEffect(() => {
    const syncSettings = localStorage.getItem('finp_sync_enabled');
    setSyncEnabled(syncSettings === 'true');
    
    const syncState = FirebaseSync.getState();
    setSyncStatus(syncState.status);
    setLastSync(syncState.lastSync);
  }, []);

  // Toggle sync
  const handleToggleSync = async () => {
    if (!isConfigured) {
      toast({ variant: 'error', title: 'Firebase non configurato', message: 'Controlla il file .env' });
      return;
    }

    if (!syncEnabled) {
      // Enable sync
      setSyncEnabled(true);
      localStorage.setItem('finp_sync_enabled', 'true');
      if (!FirebaseSync.getCurrentUser()) {
        setShowLogin(true);
      } else {
        toast({ variant: 'success', title: 'Sincronizzazione attiva', message: 'Sincronizzazione cloud abilitata.' });
      }
    } else {
      // Disable sync
      setSyncEnabled(false);
      localStorage.setItem('finp_sync_enabled', 'false');
      await FirebaseSync.logout();
      setSyncStatus('disconnected');
      setLastSync(null);
      toast({ variant: 'info', title: 'Sincronizzazione disattivata', message: 'I dati restano disponibili offline.' });
    }
  };

  // Manual sync
  const handleManualSync = async () => {
    if (!syncEnabled || !FirebaseSync.getCurrentUser()) {
      toast({ variant: 'error', title: 'Accesso richiesto', message: 'Effettua prima il login per sincronizzare' });
      return;
    }

    setSyncing(true);
    try {
      // Export local data
      const data = {
        version: '1.0',
        lastSync: new Date().toISOString(),
        atleti: FINPStorage.getAtleti(),
        condizioni: FINPStorage.getCondizioni(),
        assenze: FINPStorage.getAssenze(),
        tempi: FINPStorage.getTempi(),
        logSedute: FINPStorage.getLogSedute(),
        stagione: FINPStorage.getStagione(),
        chiusure: FINPStorage.getChiusure(),
        gare: FINPStorage.getGare(),
        macrocicli: FINPStorage.getMacrocicli(),
        mesocicli: FINPStorage.getMesocicli(),
        microcicli: FINPStorage.getMicrocicli(),
        impostazioni: FINPStorage.getImpostazioni()
      };

      const success = await FirebaseSync.saveToCloud(data);
      if (success) {
        const state = FirebaseSync.getState();
        setLastSync(state.lastSync);
        toast({ variant: 'success', title: 'Sincronizzazione completata', message: 'Dati sincronizzati con successo!' });
      } else {
        toast({ variant: 'error', title: 'Errore di sincronizzazione', message: 'Riprova più tardi' });
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Errore di sincronizzazione', message: 'Impossibile raggiungere il cloud' });
    }
    setSyncing(false);
  };

  // Logout
  const handleLogout = async () => {
    if (confirm('Vuoi effettuare il logout? I dati rimarranno disponibili offline.')) {
      await FirebaseSync.logout();
      setSyncStatus('disconnected');
      setLastSync(null);
      toast({ variant: 'info', title: 'Logout effettuato', message: 'I dati rimarranno disponibili offline.' });
    }
  };

  const handleDownload = () => {
    try {
      const json = FINPStorage.exportBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `FINPcoach_backup_${dateStr}.json`;
      const bridge = (window as unknown as { AndroidBridge?: { exportTextFile?: (n: string, c: string) => boolean } }).AndroidBridge;
      if (bridge?.exportTextFile?.(fileName, json)) {
        toast({ variant: 'success', title: 'Backup esportato', message: 'Backup salvato in Download!' });
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ variant: 'success', title: 'Backup esportato', message: 'Backup scaricato con successo!' });
    } catch {
      toast({ variant: 'error', title: 'Errore export', message: 'Errore durante la generazione del backup.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Conferma in modal prima di sovrascrivere i dati esistenti
        setPendingImport(content);
      } catch {
        toast({ variant: 'error', title: 'File non leggibile', message: 'Impossibile leggere il file selezionato.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confermaImport = () => {
    if (pendingImport == null) return;
    const content = pendingImport;
    setPendingImport(null);
    try {
      const ok = FINPStorage.importBackup(content);
      if (ok) {
        toast({ variant: 'success', title: 'Import completato', message: 'Dati importati con successo! Ricarico…' });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({ variant: 'error', title: 'Backup non valido', message: 'Formato del file di backup non valido.' });
      }
    } catch {
      toast({ variant: 'error', title: 'Import fallito', message: 'Impossibile leggere il file selezionato.' });
    }
  };

  const handleResetDemo = () => {
    if (confirm('Vuoi davvero ripristinare i dati demo predefiniti? Tutte le modifiche attuali verranno sovrascritte.')) {
      FINPStorage.resetToDefault();
      toast({ variant: 'success', title: 'Dati ripristinati', message: 'Ricarico…' });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  /** Torna allo stato "squadra vuota" (stesso stato del primo avvio) azzerando lo storage. */
  const handleClearSquad = () => {
    if (
      confirm(
        'Vuoi svuotare tutti i dati (atleti, stagione, piano, tempi, registro) e ripartire da una squadra vuota?\n\n' +
          'L\'operazione non è reversibile: esporta prima un backup JSON se ti serve conservarli.'
      )
    ) {
      FINPStorage.startLiveSquad();
      toast({ variant: 'success', title: 'Squadra svuotata', message: 'Ricarico…' });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  if (showLogin) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          setShowLogin(false);
          setSyncStatus(FirebaseSync.getState().status);
          toast({ variant: 'success', title: 'Accesso effettuato', message: 'Sincronizzazione attiva.' });
        }}
        onSkip={() => setShowLogin(false)}
      />
    );
  }

  const syncStato = syncEnabled && FirebaseSync.getCurrentUser()
    ? { label: 'Connesso e sincronizzato', dot: 'bg-status-live' }
    : isConfigured
      ? { label: 'Configurato, accesso richiesto', dot: 'bg-accent-gold' }
      : { label: 'Modalità Offline Locale', dot: 'bg-outline' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-float max-w-md w-full border border-outline-variant max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-5 border-b border-outline-variant flex items-center justify-between gap-3 bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface leading-tight">
                Dati & Backup
              </h2>
              <span className="text-xs text-on-surface-variant leading-snug block mt-0.5">
                Esportazione JSON e sincronizzazione cloud
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="ds-btn-icon shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3 text-[13px] leading-relaxed flex-1 min-h-0 overflow-y-auto">
          <div className="p-3.5 bg-primary-fixed/40 border border-primary/20 rounded-xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-on-surface-variant leading-relaxed text-xs">
              Tutti i dati della squadra, visite mediche, programmazione e presenze sono memorizzati localmente nel tuo browser con persistenza crittografica sul dispositivo.
            </p>
          </div>

          {/* Firebase Sync Section (Always Visible) */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {syncEnabled && FirebaseSync.getCurrentUser() ? (
                  <Cloud size={18} className="text-primary shrink-0" />
                ) : (
                  <CloudOff size={18} className="text-on-surface-variant shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-xs">Sincronizzazione Cloud (Firebase)</div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${syncStato.dot}`} />
                    {syncStato.label}
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleSync}
                aria-label="Attiva sincronizzazione cloud"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  syncEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-surface-container-lowest shadow transition-transform ${
                    syncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-on-surface-variant truncate">
                  {FirebaseSync.getCurrentUser() ? `Account: ${FirebaseSync.getCurrentUser()?.email}` : (isConfigured ? 'Nessun account collegato' : 'Credenziali .env assenti')}
                </span>
                {FirebaseSync.getCurrentUser() && (
                  <button
                    onClick={handleLogout}
                    className="ds-btn-danger !min-h-[32px] !px-2.5 !py-1 text-[11px] shrink-0"
                  >
                    <LogOut size={12} />
                    Logout
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  if (!FirebaseSync.getCurrentUser()) {
                    setShowLogin(true);
                    return;
                  }
                  handleManualSync();
                }}
                disabled={syncing}
                className="ds-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sincronizzazione in corso...
                  </>
                ) : FirebaseSync.getCurrentUser() ? (
                  <>
                    <RefreshCw size={14} />
                    Sincronizza Ora nel Cloud
                  </>
                ) : (
                  'Accedi o Registrati con Firebase'
                )}
              </button>
            </div>
          </div>

          {/* Versione App & Note Aggiornamenti */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-on-surface gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <Info size={14} className="text-primary shrink-0" />
                Versione FINPcoach
              </span>
              <span className="ds-chip-blue !min-h-[26px] font-mono">
                v0.2.0
              </span>
            </div>
            <p className="text-on-surface-variant leading-relaxed">
              • <strong>Web Browser:</strong> gli aggiornamenti si applicano in automatico ad ogni riavvio o ricaricamento della pagina.
            </p>
            <p className="text-on-surface-variant leading-relaxed">
              • <strong>App Android (APK):</strong> per aggiornare l'app sui dispositivi già installati, scarica il nuovo file APK rilasciato o abilita la sincronizzazione cloud per condividere i dati tra dispositivi.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Download Backup */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/40 hover:bg-surface-container transition group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Download size={17} className="text-primary shrink-0 group-hover:scale-110 transition" />
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm">Esporta Backup Completo (JSON)</div>
                  <div className="text-xs text-on-surface-variant font-normal">Salva atleti, piani, tempi e registro su file</div>
                </div>
              </div>
              <span className="ds-chip-blue shrink-0">Scarica</span>
            </button>

            {/* Import Backup */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/40 hover:bg-surface-container transition group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Upload size={17} className="text-primary shrink-0 group-hover:scale-110 transition" />
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm">Importa / Ripristina Backup</div>
                  <div className="text-xs text-on-surface-variant font-normal">Carica un file JSON esportato in precedenza</div>
                </div>
              </div>
              <span className="ds-chip-blue shrink-0">Sfoglia</span>
            </button>

            {/* Reset to Seed Demo */}
            <button
              onClick={handleResetDemo}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-error/30 bg-error-container/40 hover:border-error/50 hover:bg-error-container/60 transition group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RefreshCw size={16} className="text-error shrink-0 group-hover:rotate-180 transition duration-500" />
                <div className="min-w-0">
                  <div className="font-bold text-error text-sm">Ripristina Dati Esempio FINP</div>
                  <div className="text-xs text-on-error-container font-normal">Ricarica i profili atleti e la stagione dimostrativa</div>
                </div>
              </div>
              <span className="ds-chip-coral shrink-0">Reset</span>
            </button>

            {/* Clear squad - back to empty state */}
            <button
              onClick={handleClearSquad}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-on-surface-variant/50 hover:bg-surface-container transition group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Trash2 size={16} className="text-on-surface-variant shrink-0 group-hover:text-error transition" />
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm">Svuota squadra</div>
                  <div className="text-xs text-on-surface-variant font-normal">
                    Azzera tutto e riparti da una squadra vuota
                  </div>
                </div>
              </div>
              <span className="ds-chip-neutral shrink-0">Svuota</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 bg-surface-container-low border-t border-outline-variant flex justify-end shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>

      {/* Conferma import: sovrascrittura dati */}
      <Modal
        open={pendingImport != null}
        onClose={() => setPendingImport(null)}
        title="Importa backup?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPendingImport(null)}>
              Annulla
            </Button>
            <Button variant="primary" className="flex-1" onClick={confermaImport}>
              Importa e sovrascrivi
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 text-sm text-on-surface-variant">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <p>
            L'importazione <strong className="text-on-surface">sovrascriverà tutti i dati attuali</strong> (atleti,
            stagione, piano, tempi, registro). Esporta un backup se vuoi conservare i dati correnti.
          </p>
        </div>
      </Modal>
    </div>
  );
};
