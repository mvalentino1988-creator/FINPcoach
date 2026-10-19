import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Errore non catturato in FINPcoach:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4FAFC] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">Si è verificato un imprevisto</h2>
              <p className="text-xs text-slate-500 mt-1">
                L'applicazione ha riscontrato un errore di rendering. I tuoi dati locali sono al sicuro nello storage.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs font-mono text-rose-800 break-words max-h-48 overflow-y-auto">
                  <div className="font-bold">{this.state.error.name}: {this.state.error.message}</div>
                  <pre className="text-[10px] text-slate-600 mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('finp_active_tab');
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Reset Tab
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-[#006874] hover:bg-[#004f58] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <RefreshCw size={16} />
                <span>Ricarica</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
