import React, { useState, useRef } from 'react';
import { FINPStorage } from '../data/storage';
import { Download, Upload, RefreshCw, X, CheckCircle, AlertTriangle, ShieldCheck, Database } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const BackupModal: React.FC<Props> = ({ onClose }) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
