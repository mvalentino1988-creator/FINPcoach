import React, { useState } from 'react';
import {
  Calendar,
  Database,
  Users,
  Waves,
  Timer,
  LayoutDashboard,
  Trophy,
  Sliders
} from 'lucide-react';
import { BackupModal } from './BackupModal';

export type TabKey = 'oggi' | 'piano' | 'cronometro' | 'regia' | 'atleti' | 'fonti' | 'dati';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange }) => {
  const [backupOpen, setBackupOpen] = useState(false);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'oggi', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { key: 'piano', label: 'Allenamenti', icon: <Calendar size={18} /> },
    { key: 'cronometro', label: 'Live Deck', icon: <Timer size={18} /> },
    { key: 'regia', label: 'Pianificatore', icon: <Sliders size={18} /> },
    { key: 'atleti', label: 'Atleti', icon: <Users size={18} /> },
    { key: 'fonti', label: 'Gare & Record', icon: <Trophy size={18} /> },
    { key: 'dati', label: 'Dati', icon: <Database size={18} /> }
  ];

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* Top Header - Stitch Aquatic Paralympic Design System */}
      <header className="sticky top-0 z-40 bg-[#faf8ff]/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006874] text-white flex items-center justify-center shadow-xs">
              <Waves size={22} className="text-cyan-200" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#006874] leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                FINP<span className="text-[#006399]">coach</span>
              </h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                Aquatic Paralympic System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-bold transition ${
                    currentTab === tab.key
                      ? 'bg-[#006874] text-white shadow-xs'
                      : 'bg-surface-container text-[#131b2e] hover:bg-[#dae2fd]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Quick Live Deck button on tablet */}
            <button
              type="button"
              onClick={() => onTabChange('cronometro')}
              className={`hidden sm:flex lg:hidden items-center gap-1 px-3 h-10 rounded-full font-bold text-xs transition ${
                currentTab === 'cronometro'
                  ? 'bg-[#006874] text-white'
                  : 'bg-cyan-50 text-[#006874] border border-cyan-200'
              }`}
            >
              <Timer size={16} />
              <span>Live Deck</span>
            </button>

            {/* Backup / Data Management button */}
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              title="Gestione Dati & Backup"
              className="px-3 h-10 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#006874] text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
            >
              <Database size={15} />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Stitch Design System */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-lg pb-safe">
        <div className="grid grid-cols-7 h-16 px-1 items-center">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition min-h-[48px] ${
                currentTab === tab.key ? 'text-[#006874]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`px-2 py-1 rounded-full transition ${
                  currentTab === tab.key ? 'bg-[#eaedff] text-[#006874]' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="truncate max-w-[46px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

