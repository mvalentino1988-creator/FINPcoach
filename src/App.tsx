import React, { useState } from 'react';
import { AppProvider } from './data/AppContext';
import { Navbar, TabKey } from './components/Navbar';
import { OggiScreen } from './components/OggiScreen';
import { AtletiScreen } from './components/AtletiScreen';
import { PianoScreen } from './components/PianoScreen';
import { SchedeVascaScreen } from './components/SchedeVascaScreen';
import { TempiRipartenzeScreen } from './components/TempiRipartenzeScreen';
import { RegistroScreen } from './components/RegistroScreen';
import { DatiScreen } from './components/DatiScreen';

export const AppContent: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('oggi');

  return (
    <div className="min-h-screen flex flex-col bg-[#F4FAFC]">
      <Navbar currentTab={tab} onTabChange={setTab} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20 sm:pb-8">
        {tab === 'oggi' && <OggiScreen onNavigateTab={setTab} />}
        {tab === 'piano' && <PianoScreen />}
        {tab === 'atleti' && <AtletiScreen />}
        {tab === 'dati' && <DatiScreen />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};
