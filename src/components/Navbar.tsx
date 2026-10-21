import React, { useState } from 'react';
import {
  CalendarDays,
  Database,
  Users,
  Waves,
  Timer,
  LayoutDashboard,
  Trophy,
  Sliders,
  MoreHorizontal,
  X,
  CloudDownload,
} from 'lucide-react';
import { BackupModal } from './BackupModal';

export type TabKey = 'oggi' | 'piano' | 'cronometro' | 'regia' | 'atleti' | 'fonti' | 'dati';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

/** Sotto-titolo contestuale nell'header (come nei mockup Stitch). */
const CONTESTO: Record<TabKey, string> = {
  oggi: 'Dashboard',
  piano: 'Allenamenti',
  atleti: 'Atleti',
  fonti: 'Gare & Record',
  cronometro: 'Live Deck',
  regia: 'Pianificatore',
  dati: 'Dati',
};

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange }) => {
  const [backupOpen, setBackupOpen] = useState(false);
  const [altroOpen, setAltroOpen] = useState(false);

  /** Le 4 voci del dock mobile (design Stitch): massimo 5 target da 48px. */
  const primary: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'oggi', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
    { key: 'atleti', label: 'Atleti', icon: <Users size={22} /> },
    { key: 'piano', label: 'Allenamenti', icon: <CalendarDays size={22} /> },
    { key: 'fonti', label: 'Gare', icon: <Trophy size={22} /> },
  ];

  /** Voci secondarie: vive nel foglio "Altro", non nel dock (spazio prezioso). */
  const secondary: { key: TabKey; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'cronometro', label: 'Live Deck', desc: 'Cronometro multi-corsia a bordo vasca', icon: <Timer size={20} /> },
    { key: 'regia', label: 'Pianificatore', desc: 'Regia tecnica e assegnazione corsie', icon: <Sliders size={20} /> },
    { key: 'dati', label: 'Dati', desc: 'Schede vasca, tempi di ripartenza, registro', icon: <Database size={20} /> },
  ];

  const vai = (tab: TabKey) => {
    onTabChange(tab);
    setAltroOpen(false);
  };

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* ============ HEADER FISSO ============ */}
      <header
        className="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 8px)' }}
      >
        <div className="h-16 px-gutter-mobile sm:px-gutter mx-auto max-w-6xl flex items-center justify-between gap-space-sm">
          {/* Brand */}
          <button
            type="button"
            onClick={() => vai('oggi')}
            className="flex items-center gap-space-sm min-w-0 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-primary-sm">
              <Waves size={20} className="text-primary-fixed" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none truncate">
                FINP<span className="text-secondary">coach</span>
              </span>
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant truncate mt-0.5">
                {CONTESTO[currentTab]}
              </span>
            </span>
          </button>

          {/* Azioni */}
          <div className="flex items-center gap-1 shrink-0">
            <nav className="hidden lg:flex items-center gap-1">
              {[...primary, ...secondary].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  className={`flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-bold transition ${
                    currentTab === tab.key
                      ? 'bg-primary text-on-primary shadow-primary-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              title="Gestione Dati & Backup"
              aria-label="Gestione Dati e Backup"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-10 rounded-full bg-surface-container text-primary text-xs font-bold border border-slate-200/70 hover:bg-surface-container-high transition"
            >
              <CloudDownload size={15} />
              <span>Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              aria-label="Altre sezioni"
              className="lg:hidden inline-flex items-center justify-center w-12 h-12 -mr-2 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container transition"
            >
              <MoreHorizontal size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ============ DOCK BOTTOM (mobile) ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-nav pb-safe">
        <div className="h-16 px-1 flex items-center justify-around">
          {primary.map(tab => {
            const active = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => vai(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] py-1 rounded-lg transition-all ${
                  active ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
                }`}
              >
                {tab.icon}
                <span className="font-label-md text-label-md tracking-tight truncate max-w-full px-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAltroOpen(true)}
            aria-label="Altre sezioni"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] py-1 rounded-lg transition-all ${
              secondary.some(s => s.key === currentTab)
                ? 'text-primary font-bold bg-primary/10'
                : 'text-on-surface-variant'
            }`}
          >
            <MoreHorizontal size={22} />
            <span className="font-label-md text-label-md tracking-tight">Altro</span>
          </button>
        </div>
      </nav>

      {/* ============ FOGLIO "ALTRO" ============ */}
      {altroOpen && (
        <>
          <div className="ds-sheet-scrim" onClick={() => setAltroOpen(false)} />
          <div className="ds-sheet" role="dialog" aria-label="Altre sezioni">
            <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto mb-3" />
            <div className="flex items-center justify-between mb-2">
              <span className="ds-title">Altre sezioni</span>
              <button
                type="button"
                onClick={() => setAltroOpen(false)}
                aria-label="Chiudi"
                className="w-10 h-10 -mr-1 rounded-full flex items-center justify-center text-on-surface-variant active:bg-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 pb-3">
              {secondary.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left min-h-[56px] transition ${
                    currentTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  <span className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
                    {tab.icon}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="font-body-bold text-body-bold">{tab.label}</span>
                    <span className="font-body-base text-body-base text-on-surface-variant truncate">
                      {tab.desc}
                    </span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setAltroOpen(false);
                  setBackupOpen(true);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low text-on-surface text-left min-h-[56px] transition"
              >
                <span className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
                  <Database size={20} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-body-bold text-body-bold">Backup & Dati</span>
                  <span className="font-body-base text-body-base text-on-surface-variant truncate">
                    Esporta, importa, ripristina e sincronizza
                  </span>
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
