import React, { useState, useEffect } from 'react';
import { FirebaseSync } from '../data/firebaseSync';
import { isFirebaseConfigured } from '../data/firebaseConfig';
import { Waves, Mail, Lock, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
  onSkip: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onSkip }) => {
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    const unsubscribe = FirebaseSync.onAuthStateChange((user) => {
      if (user) {
        setSuccess(true);
        setTimeout(() => onLoginSuccess(), 500);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Inserisci email e password'); return; }
    if (isRegistering) {
      if (password.length < 6) { setError('La password deve contenere almeno 6 caratteri'); return; }
      if (password !== confirmPassword) { setError('Le password non coincidono'); return; }
    }

    setLoading(true);
    setError(null);

    const result = isRegistering
      ? await FirebaseSync.register(email, password)
      : await FirebaseSync.login(email, password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => onLoginSuccess(), 500);
    } else {
      setError(result.error || (isRegistering ? 'Errore durante la registrazione' : 'Errore durante il login'));
    }

    setLoading(false);
  };

  /* ------------------------------------------------------------------ */
  /* NOT CONFIGURED                                                       */
  /* ------------------------------------------------------------------ */
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07101f] via-[#0F3D99]/20 to-[#07101f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-blue flex items-center justify-center shadow-primary-md">
              <Waves size={30} className="text-white" />
            </div>
            <h1 className="font-headline text-2xl font-bold text-white">
              FINP<span className="text-tertiary">coach</span>
            </h1>
            <p className="text-sm text-white/50 mt-1">Nuoto Paralimpico</p>
          </div>

          <div className="ds-card p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-warning/10 border border-warning/30">
              <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
              <div className="text-sm text-white/80">
                <p className="font-bold mb-0.5">Firebase non configurato</p>
                <p className="text-xs text-white/50">
                  Copia <code className="bg-white/10 px-1 rounded">.env.example</code> in <code className="bg-white/10 px-1 rounded">.env</code> con le credenziali Firebase per abilitare la sincronizzazione cloud.
                </p>
              </div>
            </div>

            <button
              onClick={onSkip}
              className="w-full ds-btn-secondary text-on-surface"
            >
              Continua senza sincronizzazione
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* MAIN LOGIN                                                           */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07101f] via-[#0F3D99]/20 to-[#07101f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* BG decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-tertiary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {success ? (
          /* SUCCESS STATE */
          <div className="text-center py-16 space-y-4 animate-scale-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
              <CheckCircle size={36} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-white font-headline">Accesso effettuato!</h2>
            <p className="text-sm text-white/50">Caricamento dati in corso...</p>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-blue flex items-center justify-center shadow-primary-md">
                <Waves size={30} className="text-white" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-white">
                FINP<span className="text-tertiary">coach</span>
              </h1>
              <p className="text-sm text-white/50 mt-1">Accedi per sincronizzare i tuoi dati</p>
            </div>

            {/* Card */}
            <div
              className="rounded-3xl p-6 border space-y-5"
              style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}
            >
              {/* Tab Accedi / Registrati */}
              <div className="grid grid-cols-2 p-1 bg-black/20 rounded-2xl text-xs font-bold font-headline">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(null); }}
                  className={`py-2.5 rounded-xl transition-all ${
                    !isRegistering
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setError(null); }}
                  className={`py-2.5 rounded-xl transition-all ${
                    isRegistering
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Crea Account
                </button>
              </div>

              {/* Google login */}
              <button
                type="button"
                onClick={async () => {
                  setLoading(true); setError(null);
                  const res = await FirebaseSync.loginWithGoogle();
                  if (res.success) { setSuccess(true); setTimeout(() => onLoginSuccess(), 500); }
                  else { setError(res.error || 'Errore login con Google'); }
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full h-12 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.14C3.18 21.32 7.22 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.39-1.5-.39-2.24s.14-1.52.39-2.24V6.62H1.18C.43 8.14 0 9.87 0 12s.43 3.86 1.18 5.38l4.09-3.14z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.18 2.68 1.18 6.62l4.09 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                <span>Accedi con Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-white/15" />
                <span className="flex-shrink mx-4 text-xs text-white/40 font-medium">o con email</span>
                <div className="flex-grow border-t border-white/15" />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-error/15 border border-error/30">
                  <AlertCircle size={15} className="text-error shrink-0 mt-0.5" />
                  <p className="text-xs text-white/80">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="nome@email.com"
                      className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-2xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1.5">
                    Password {isRegistering && <span className="font-normal text-white/40">(min. 6 caratteri)</span>}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-10 pr-11 bg-white/10 border border-white/20 rounded-2xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                {isRegistering && (
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-1.5">Conferma Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-2xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 ds-btn-primary rounded-2xl justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {isRegistering ? 'Creazione account...' : 'Accesso in corso...'}
                    </>
                  ) : (
                    isRegistering ? 'Registrati e Sincronizza' : 'Accedi'
                  )}
                </button>
              </form>

              {/* Switch mode */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                  className="text-xs text-primary font-bold hover:text-primary-fixed transition-colors"
                >
                  {isRegistering ? 'Hai già un account? Accedi qui' : 'Non hai un account? Registrati ora'}
                </button>
              </div>
            </div>

            {/* Skip */}
            <button
              onClick={onSkip}
              className="w-full mt-4 py-3 text-sm text-white/40 hover:text-white/70 font-medium transition-colors text-center"
            >
              Continua senza sincronizzazione →
            </button>
          </>
        )}
      </div>
    </div>
  );
};
