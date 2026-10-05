import React, { useState } from 'react';
import { Calendar, CheckCircle2, ClipboardList, Database, Timer, Users, Waves } from 'lucide-react';
import { BackupModal } from './BackupModal';

export type TabKey = 'oggi' | 'piano' | 'atleti' | 'dati';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange }) => {
  const [backupOpen, setBackupOpen] = useState(false);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'oggi', label: 'Oggi', icon: <Waves size={18} /> },
    { key: 'piano', label: 'Piano', icon: <Calendar size={18} /> },
    { key: 'atleti', label: 'Atleti', icon: <Users size={18} /> },
    { key: 'dati', label: 'Dati', icon: <Database size={18} /> }
  ];

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#006874] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center border border-white/20">
              <Waves size={20} className="text-cyan-200" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                FINP<span className="text-cyan-200">coach</span>
              </h1>
              <span className="text-[10px] text-cyan-100 font-medium tracking-wide uppercase">
                Nuoto Paralimpico
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    currentTab === tab.key
                      ? 'bg-white text-[#006874] shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Backup / Data Management button */}
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              title="Gestione Dati & Backup"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition ml-1"
            >
              <Database size={16} className="text-cyan-200" />
              <span className="hidden md:inline">Backup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg safe-bottom">
        <div className="grid grid-cols-4 h-14">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                currentTab === tab.key ? 'text-[#006874]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  currentTab === tab.key ? 'bg-cyan-100 text-[#006874]' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
