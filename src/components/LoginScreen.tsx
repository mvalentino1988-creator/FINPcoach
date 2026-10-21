import React, { useState, useEffect } from 'react';
import { FirebaseSync } from '../data/firebaseSync';
import { isFirebaseConfigured } from '../data/firebaseConfig';
import { Waves, Mail, Lock, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
  onSkip: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onSkip }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    // Auto-login se già autenticato
    const unsubscribe = FirebaseSync.onAuthStateChange((user) => {
      if (user) {
        setSuccess(true);
        setTimeout(() => onLoginSuccess(), 500);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await FirebaseSync.login(email, password);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => onLoginSuccess(), 500);
    } else {
      setError(result.error || 'Errore durante il login');
    }
    
    setLoading(false);
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-container-low to-surface-container-high flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest rounded-xl shadow-float max-w-md w-full p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary-container flex items-center justify-center">
              <Waves size={32} className="text-primary-fixed" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              FINP<span className="text-primary-container">coach</span>
            </h1>
            <p className="text-sm text-on-surface-variant">Nuoto Paralimpico</p>
          </div>

          <div className="bg-surface-container-low border border-tertiary-fixed-dim rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-tertiary-container shrink-0 mt-0.5" />
              <div className="text-sm text-on-tertiary-fixed">
                <p className="font-bold mb-1">Firebase non configurato</p>
                <p className="text-tertiary">
                  Per abilitare la sincronizzazione cloud, copia il file <code className="bg-tertiary-fixed px-1 rounded">.env.example</code> in <code className="bg-tertiary-fixed px-1 rounded">.env</code> e inserisci le tue credenziali Firebase.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onSkip}
            className="w-full py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-bold transition"
          >
            Continua senza sincronizzazione
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-container-low to-surface-container-high flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-float max-w-md w-full p-6 sm:p-8">
        {/* Success state */}
        {success ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-fixed flex items-center justify-center">
              <CheckCircle size={40} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Accesso effettuato!</h2>
            <p className="text-sm text-on-surface-variant">Caricamento dati...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary-container flex items-center justify-center">
                <Waves size={32} className="text-primary-fixed" />
              </div>
              <h1 className="text-2xl font-bold text-on-surface mb-2">
                FINP<span className="text-primary-container">coach</span>
              </h1>
              <p className="text-sm text-on-surface-variant">Nuoto Paralimpico</p>
            </div>

            {/* Info box */}
            <div className="bg-surface-container-low border border-primary-fixed-dim rounded-xl p-4 mb-6">
              <p className="text-xs text-primary leading-relaxed">
                Accedi per sincronizzare i tuoi dati tra tutti i dispositivi. I dati rimangono privati e sicuri su Firebase.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-error-container border border-error/40 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@email.com"
                    className="w-full h-12 pl-10 pr-4 border border-slate-200/70 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-10 border border-slate-200/70 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface-variant"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary-container hover:bg-primary text-on-primary rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  'Accedi'
                )}
              </button>
            </form>

            {/* Skip button */}
            <button
              onClick={onSkip}
              className="w-full mt-3 py-3 text-sm text-on-surface-variant hover:text-on-surface font-medium transition"
            >
              Continua senza sincronizzazione
            </button>
          </>
        )}
      </div>
    </div>
  );
};
