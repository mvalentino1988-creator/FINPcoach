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
import { FINPStorage } from './data/storage';

export const AppContent: React.FC = () => {
  const [tab, setTab] = useState<TabKey>(() => {
    return (sessionStorage.getItem('finp_active_tab') as TabKey) || 'oggi';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<'demo' | 'live' | null>(() => FINPStorage.getMode());

  useEffect(() => {
    sessionStorage.setItem('finp_active_tab', tab);
  }, [tab]);

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

  /* Le viste "bordo vasca" (regia, cronometro) sono command center a tutto
     schermo: su desktop non devono stare dentro il contenitore da 1024px. */
  const wide = tab === 'regia' || tab === 'cronometro';

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar currentTab={tab} onTabChange={setTab} />

      <main
        className={`flex-1 w-full mx-auto pt-header pb-dock lg:pb-8 px-gutter-mobile sm:px-gutter py-3 sm:py-4 ${
          wide ? 'max-w-none' : 'max-w-5xl'
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
