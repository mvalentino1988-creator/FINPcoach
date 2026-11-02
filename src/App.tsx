import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AppProvider } from './data/AppContext';
import { FirebaseSync } from './data/firebaseSync';
import { Navbar, TabKey } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { OggiScreen } from './components/OggiScreen';
import { CronometroLiveMultiCorsia } from './components/CronometroLiveMultiCorsia';
import { RegiaTecnicaCorsie } from './components/RegiaTecnicaCorsie';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { FINPStorage } from './data/storage';
import { useLayoutMetrics } from './hooks/useLayoutMetrics';
import { pushBackHandler } from './lib/backHandler';
import { Waves } from 'lucide-react';

// Code-splitting delle schermate gestionali pesanti per ottimizzare il bundle e l'avvio su mobile
const AtletiScreen = lazy(() => import('./components/AtletiScreen').then(m => ({ default: m.AtletiScreen })));
const PianoScreen = lazy(() => import('./components/PianoScreen').then(m => ({ default: m.PianoScreen })));
const DatiScreen = lazy(() => import('./components/DatiScreen').then(m => ({ default: m.DatiScreen })));
const FontiScreen = lazy(() => import('./components/FontiScreen').then(m => ({ default: m.FontiScreen })));

const TabFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shadow-primary-sm mb-3 animate-pulse">
      <Waves size={24} />
    </div>
    <span className="text-xs font-bold font-headline text-on-surface-variant">Caricamento in corso...</span>
  </div>
);

export const AppContent: React.FC = () => {
  const [tab, setTab] = useState<TabKey>(() => {
    return (sessionStorage.getItem('finp_active_tab') as TabKey) || 'oggi';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  useEffect(() => {
    sessionStorage.setItem('finp_active_tab', tab);
  }, [tab]);

  const tabRef = useRef<TabKey>(tab);
  tabRef.current = tab;
  useEffect(() => {
    return pushBackHandler(() => {
      if (tabRef.current !== 'oggi') {
        setTab('oggi');
        return true;
      }
      return false;
    });
  }, []);

  const isBordoVasca = tab === 'oggi' || tab === 'cronometro' || tab === 'regia';
  const fixed = isBordoVasca;

  useEffect(() => {
    document.body.classList.toggle('app-no-scroll', fixed);
  }, [fixed]);

  useEffect(() => {
    const syncEnabled = localStorage.getItem('finp_sync_enabled') === 'true';
    const user = FirebaseSync.getCurrentUser();
    if (syncEnabled && !user) {
      setShowLogin(true);
    } else if (user) {
      setIsLoggedIn(true);
      setShowLogin(false);
    }
  }, []);

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

  const wide = tab === 'regia' || tab === 'cronometro';

  return (
    <div className={`app-shell ${fixed ? 'app-shell-fixed' : ''}`}>
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}

      <Navbar currentTab={tab} onTabChange={setTab} layout={layout} />

      <div className="app-content">
        <main
          className={`app-main w-full mx-auto px-gutter-mobile sm:px-gutter ${
            wide ? 'max-w-none' : 'max-w-[1536px]'
          }`}
        >
          {tab === 'oggi' && <OggiScreen />}
          {tab === 'cronometro' && <CronometroLiveMultiCorsia />}
          {tab === 'regia' && <RegiaTecnicaCorsie />}
          <Suspense fallback={<TabFallback />}>
            {tab === 'piano' && <PianoScreen />}
            {tab === 'atleti' && <AtletiScreen />}
            {tab === 'fonti' && <FontiScreen />}
            {tab === 'dati' && <DatiScreen />}
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
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};
