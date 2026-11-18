import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AppProvider } from './data/AppContext';
import { VascaSessionProvider } from './data/VascaSessionContext';
import { FirebaseSync } from './data/firebaseSync';
import { Navbar, TabKey } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { OggiScreen } from './components/OggiScreen';
import { BordoVascaScreen } from './components/BordoVascaScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { FINPStorage, STORAGE_ERROR_EVENT, getUltimoErroreSalvataggio } from './data/storage';
import { useLayoutMetrics } from './hooks/useLayoutMetrics';
import { pushBackHandler } from './lib/backHandler';
import { Waves } from 'lucide-react';

const AtletiScreen = lazy(() => import('./components/AtletiScreen').then(m => ({ default: m.AtletiScreen })));
const AltroScreen = lazy(() => import('./components/AltroScreen').then(m => ({ default: m.AltroScreen })));

const TabFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
    <div className="w-12 h-12 rounded-2xl bg-gradient-blue flex items-center justify-center text-white shadow-primary-sm mb-3 animate-pulse">
      <Waves size={24} />
    </div>
    <span className="text-xs font-bold font-headline text-on-surface-variant">Caricamento in corso...</span>
  </div>
);

function normalizeTab(value: string | null): TabKey {
  switch (value) {
    case 'vasca':
    case 'squadra':
    case 'altro':
    case 'oggi':
      return value;
    case 'atleti':
      return 'squadra';
    case 'cronometro':
    case 'regia':
      return 'vasca';
    case 'piano':
    case 'dati':
    case 'fonti':
      return 'altro';
    default:
      return 'oggi';
  }
}

export const AppContent: React.FC = () => {
  const [tab, setTab] = useState<TabKey>(() => normalizeTab(sessionStorage.getItem('finp_active_tab')));
  const [showLogin, setShowLogin] = useState(() =>
    localStorage.getItem('finp_sync_enabled') === 'true' && !FirebaseSync.getCurrentUser()
  );
  const [, setIsLoggedIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('finp_onboarded'));
  const [mode, setMode] = useState<'demo' | 'live' | null>(() => {
    const m = FINPStorage.getMode();
    if (!m) {
      FINPStorage.applyDemoSeed();
      return 'demo';
    }
    return m;
  });
  const layout = useLayoutMetrics();
  const [saveError, setSaveError] = useState<string | null>(() => getUltimoErroreSalvataggio());
  const [saveErrorHidden, setSaveErrorHidden] = useState(false);

  useEffect(() => {
    const onErr = (e: Event) => {
      setSaveError((e as CustomEvent<string>).detail ?? getUltimoErroreSalvataggio());
      setSaveErrorHidden(false);
    };
    const onClear = () => setSaveErrorHidden(true);
    window.addEventListener(STORAGE_ERROR_EVENT, onErr);
    window.addEventListener(`${STORAGE_ERROR_EVENT}:cleared`, onClear);
    return () => {
      window.removeEventListener(STORAGE_ERROR_EVENT, onErr);
      window.removeEventListener(`${STORAGE_ERROR_EVENT}:cleared`, onClear);
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('finp_active_tab', tab);
  }, [tab]);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const target = (event as CustomEvent<TabKey>).detail;
      if (target === 'oggi' || target === 'vasca' || target === 'squadra' || target === 'altro') {
        setTab(target);
      }
    };
    window.addEventListener('finp:navigate', onNavigate);
    return () => window.removeEventListener('finp:navigate', onNavigate);
  }, []);

  const tabRef = useRef<TabKey>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    return pushBackHandler(() => {
      if (tabRef.current !== 'oggi') {
        setTab('oggi');
        return true;
      }
      return false;
    });
  }, []);

  const fixed = tab === 'vasca' || tab === 'oggi';
  const wide = tab === 'vasca';

  useEffect(() => {
    document.body.classList.toggle('app-no-scroll', fixed);
  }, [fixed]);

  if (!mode) {
    return <WelcomeScreen onReady={() => setMode(FINPStorage.getMode())} />;
  }

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLogin(false);
  };

  const handleSkipLogin = () => {
    setShowLogin(false);
  };

  if (showLogin) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} onSkip={handleSkipLogin} />;
  }

  return (
    <div className={`app-shell ${fixed ? 'app-shell-fixed' : ''}`}>
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}

      {saveError && !saveErrorHidden && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[80] flex items-center gap-2 px-4 py-2 bg-error-container text-on-error-container text-xs font-semibold"
        >
          <span className="flex-1">{saveError} — i dati potrebbero non essere salvati. Verifica lo spazio disponibile.</span>
          <button
            type="button"
            aria-label="Chiudi avviso salvataggio"
            onClick={() => setSaveErrorHidden(true)}
            className="min-w-11 min-h-11 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      <Navbar currentTab={tab} onTabChange={setTab} layout={layout} />

      <div className="app-content flex-1 min-h-0 flex flex-col">
        <main
          className={`app-main flex-1 min-h-0 h-full flex flex-col w-full mx-auto px-gutter-mobile sm:px-gutter ${
            wide ? 'max-w-none' : 'max-w-[1200px]'
          }`}
        >
          {tab === 'oggi' && <OggiScreen />}
          {tab === 'vasca' && <BordoVascaScreen />}
          <Suspense fallback={<TabFallback />}>
            {tab === 'squadra' && <AtletiScreen />}
            {tab === 'altro' && <AltroScreen />}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <VascaSessionProvider>
          <AppContent />
        </VascaSessionProvider>
      </AppProvider>
    </ErrorBoundary>
  );
};
