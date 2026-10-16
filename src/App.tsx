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

  return (
    <div className="min-h-screen flex flex-col bg-[#F4FAFC]">
      <Navbar currentTab={tab} onTabChange={setTab} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20 sm:pb-8">
        {tab === 'oggi' && <OggiScreen onNavigateTab={setTab} />}
        {tab === 'piano' && <PianoScreen />}
        {tab === 'atleti' && <AtletiScreen />}
        {tab === 'dati' && <DatiScreen />}
        {tab === 'fonti' && <FontiScreen />}
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
