import React, { useState, useRef, useEffect } from 'react';
import { FINPStorage } from '../data/storage';
import { FirebaseSync, SyncStatus } from '../data/firebaseSync';
import { isFirebaseConfigured } from '../data/firebaseConfig';
import { LoginScreen } from './LoginScreen';
import { Download, Upload, RefreshCw, X, CheckCircle, AlertTriangle, ShieldCheck, Database, Cloud, CloudOff, LogOut, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const BackupModal: React.FC<Props> = ({ onClose }) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      setErrorMsg('Firebase non configurato. Controlla il file .env');
      return;
    }

    if (!syncEnabled) {
      // Enable sync
      setSyncEnabled(true);
      localStorage.setItem('finp_sync_enabled', 'true');
      if (!FirebaseSync.getCurrentUser()) {
        setShowLogin(true);
      } else {
        setSuccessMsg('Sincronizzazione cloud abilitata.');
      }
    } else {
      // Disable sync
      setSyncEnabled(false);
      localStorage.setItem('finp_sync_enabled', 'false');
      await FirebaseSync.logout();
      setSyncStatus('disconnected');
      setLastSync(null);
      setSuccessMsg('Sincronizzazione cloud disabilitata.');
    }
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Manual sync
  const handleManualSync = async () => {
    if (!syncEnabled || !FirebaseSync.getCurrentUser()) {
      setErrorMsg('Effettua prima il login per sincronizzare');
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
        setSuccessMsg('Dati sincronizzati con successo!');
      } else {
        setErrorMsg('Errore durante la sincronizzazione');
      }
    } catch (err) {
      setErrorMsg('Errore durante la sincronizzazione');
    }
    setSyncing(false);
    setTimeout(() => setSuccessMsg(null), 3000);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  // Logout
  const handleLogout = async () => {
    if (confirm('Vuoi effettuare il logout? I dati rimarranno disponibili offline.')) {
      await FirebaseSync.logout();
      setSyncStatus('disconnected');
      setLastSync(null);
      setSuccessMsg('Logout effettuato con successo');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDownload = () => {
    try {
      const json = FINPStorage.exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `FINPcoach_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Backup scaricato con successo!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Errore durante la generazione del backup.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const ok = FINPStorage.importBackup(content);
        if (ok) {
          setSuccessMsg('Dati importati con successo! Ricarico l\'app...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setErrorMsg('Formato del file di backup non valido.');
        }
      } catch {
        setErrorMsg('Impossibile leggere il file selezionato.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Vuoi davvero ripristinare i dati demo predefiniti? Tutte le modifiche attuali verranno sovrascritte.')) {
      FINPStorage.resetToDefault();
      setSuccessMsg('Dati ripristinati! Ricarico...');
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
          setSuccessMsg('Accesso effettuato. Sincronizzazione attiva.');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
        onSkip={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006874] text-white flex items-center justify-center shadow-xs">
              <Database size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">
                Gestione Dati & Backup
              </h2>
              <span className="text-[11px] text-slate-500">
                Salvataggio locale sicuro & Esportazione JSON
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-[#006874] shrink-0 mt-0.5" />
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Tutti i dati della squadra, visite mediche, programmazione e presenze sono memorizzati localmente nel tuo browser con persistenza crittografica sul dispositivo.
            </p>
          </div>

          {/* Firebase Sync Section */}
          {isConfigured && (
            <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {syncEnabled ? (
                    <Cloud size={18} className="text-[#006874]" />
                  ) : (
                    <CloudOff size={18} className="text-slate-400" />
                  )}
                  <span className="font-bold text-slate-700 text-xs">Sincronizzazione Cloud</span>
                </div>
                <button
                  onClick={handleToggleSync}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    syncEnabled ? 'bg-[#006874]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      syncEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {syncEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      {syncStatus === 'synced' && lastSync ? `Ultimo sync: ${new Date(lastSync).toLocaleString('it-IT')}` : 'Non sincronizzato'}
                    </span>
                    {FirebaseSync.getCurrentUser() && (
                      <button
                        onClick={handleLogout}
                        className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
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
                    className="w-full h-10 bg-[#006874] hover:bg-[#004f58] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Sincronizzazione...
                      </>
                    ) : FirebaseSync.getCurrentUser() ? (
                      <>
                        <RefreshCw size={14} />
                        Sincronizza Ora
                      </>
                    ) : (
                      'Accedi per sincronizzare'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            {/* Download Backup */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#006874] hover:bg-slate-50 transition group font-bold text-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <Download size={16} className="text-[#006874] group-hover:scale-110 transition" />
                <div className="text-left">
                  <div>Esporta Backup Completo (JSON)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Salva atleti, piani, tempi e registro su file</div>
                </div>
              </div>
              <span className="text-[11px] text-[#006874] font-bold">Scarica</span>
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
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#006874] hover:bg-slate-50 transition group font-bold text-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <Upload size={16} className="text-[#006874] group-hover:scale-110 transition" />
                <div className="text-left">
                  <div>Importa / Ripristina Backup</div>
                  <div className="text-[10px] text-slate-400 font-normal">Carica un file JSON esportato in precedenza</div>
                </div>
              </div>
              <span className="text-[11px] text-[#006874] font-bold">Sfoglia</span>
            </button>

            {/* Reset to Seed Demo */}
            <button
              onClick={handleResetDemo}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 transition group font-semibold text-rose-700 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw size={15} className="text-rose-500 group-hover:rotate-180 transition duration-500" />
                <div className="text-left">
                  <div>Ripristina Dati Esempio FINP</div>
                  <div className="text-[10px] text-rose-400 font-normal">Ricarica i profili atleti e la stagione dimostrativa</div>
                </div>
              </div>
              <span className="text-[11px] text-rose-600 font-bold">Reset</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-12 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
