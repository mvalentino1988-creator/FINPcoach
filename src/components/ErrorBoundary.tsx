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
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 max-w-md w-full shadow-float border border-slate-200/70 text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-error-container text-error flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-lg">Si è verificato un imprevisto</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                L'applicazione ha riscontrato un errore di rendering. I tuoi dati locali sono al sicuro nello storage.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-error-container border border-error/40 rounded-xl text-left text-xs font-mono text-on-error-container break-words max-h-48 overflow-y-auto">
                  <div className="font-bold">{this.state.error.name}: {this.state.error.message}</div>
                  <pre className="text-[10px] text-on-surface-variant mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
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
                className="flex-1 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold transition"
              >
                Reset Tab
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-primary-container hover:bg-primary text-on-primary rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-card"
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
