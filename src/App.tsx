import React, { useState, useEffect } from 'react';
import { AppProvider } from './data/AppContext';
import { FirebaseSync } from './data/firebaseSync';
import { Navbar, TabKey } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { OggiScreen } from './components/OggiScreen';
import { AtletiScreen } from './components/AtletiScreen';
import { PianoScreen } from './components/PianoScreen';
import { DatiScreen } from './components/DatiScreen';
import { FontiScreen } from './components/FontiScreen';
import { CronometroLiveMultiCorsia } from './components/CronometroLiveMultiCorsia';
import { RegiaTecnicaCorsie } from './components/RegiaTecnicaCorsie';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { FINPStorage } from './data/storage';
import { useLayoutMetrics } from './hooks/useLayoutMetrics';

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

      <main
        className={`app-main w-full mx-auto px-gutter-mobile sm:px-gutter ${
          wide ? 'max-w-none' : 'max-w-[1600px]'
        }`}
      >
        {tab === 'oggi' && <OggiScreen onNavigateTab={setTab} />}
        {tab === 'piano' && <PianoScreen />}
        {tab === 'cronometro' && <CronometroLiveMultiCorsia />}
        {tab === 'regia' && <RegiaTecnicaCorsie />}
        {tab === 'atleti' && <AtletiScreen />}
        {tab === 'fonti' && <FontiScreen />}
        {tab === 'dati' && <DatiScreen />}
      </main>
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
