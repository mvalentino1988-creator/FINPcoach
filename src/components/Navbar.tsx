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
import type { LayoutMetrics } from '../hooks/useLayoutMetrics';

export type TabKey = 'oggi' | 'piano' | 'cronometro' | 'regia' | 'atleti' | 'fonti' | 'dati';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  layout: LayoutMetrics;
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

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const [backupOpen, setBackupOpen] = useState(false);
  const [altroOpen, setAltroOpen] = useState(false);

  /** Le 4 voci del dock mobile (design Stitch): massimo 5 target da 48px.
      `short` è l'etichetta del dock: deve stare in ~56px anche a 280px. */
  const primary: { key: TabKey; label: string; short: string; icon: React.ReactNode }[] = [
    { key: 'oggi', label: 'Dashboard', short: 'Oggi', icon: <LayoutDashboard size={22} /> },
    { key: 'atleti', label: 'Atleti', short: 'Atleti', icon: <Users size={22} /> },
    { key: 'piano', label: 'Allenamenti', short: 'Piano', icon: <CalendarDays size={22} /> },
    { key: 'fonti', label: 'Gare', short: 'Gare', icon: <Trophy size={22} /> },
  ];

  /** Voci secondarie: vivono nel foglio "Altro" (mobile) e nella strip (desktop). */
  const secondary: { key: TabKey; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'cronometro', label: 'Live Deck', desc: 'Cronometro multi-corsia a bordo vasca', icon: <Timer size={20} /> },
    { key: 'regia', label: 'Pianificatore', desc: 'Regia tecnica e assegnazione corsie', icon: <Sliders size={20} /> },
    { key: 'dati', label: 'Dati', desc: 'Schede vasca, tempi di ripartenza, registro', icon: <Database size={20} /> },
  ];

  const vai = (tab: TabKey) => {
    onTabChange(tab);
    setAltroOpen(false);
  };

  const stripTabs = [...primary, ...secondary];

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* ============ HEADER STICKY ============
          Sticky (non fixed): resta nel flusso, quindi il contenuto non può
          finire sotto l'header. L'altezza reale viene misurata a runtime
          (--header-h) e usata per lo scroll alle ancore. */}
      <header
        ref={layout.headerRef}
        className="sticky top-0 z-40 bg-surface/92 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      >
        <div className="pt-safe">
          <div className="mx-auto max-w-[1600px] px-gutter-mobile sm:px-gutter">
            <div className="flex h-12 items-center justify-between gap-2">
              {/* Brand */}
              <button
                type="button"
                onClick={() => vai('oggi')}
                className="flex items-center gap-2 min-w-0 min-h-[40px] text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-primary-sm">
                  <Waves size={18} className="text-primary-fixed" />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none truncate">
                    FINP<span className="text-secondary">coach</span>
                  </span>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant truncate mt-0.5 hidden xs:block">
                    {CONTESTO[currentTab]}
                  </span>
                </span>
              </button>

              {/* Azioni */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setBackupOpen(true)}
                  title="Gestione Dati & Backup"
                  aria-label="Gestione Dati e Backup"
                  className="inline-flex items-center gap-1.5 h-10 px-2 sm:px-2.5 rounded-full bg-surface-container text-primary text-xs font-bold border border-slate-200/70 hover:bg-surface-container-high transition"
                >
                  <CloudDownload size={16} />
                  <span className="hidden sm:inline">Backup</span>
                </button>
              </div>
            </div>

            {/* ============ STRIP NAV (>= 640px) ============
                Tutte le sezioni sono visibili: se lo spazio non basta la strip
                scorre orizzontalmente, nessuna voce viene "nascosta". */}
            <nav aria-label="Sezioni principali" className="hidden sm:block relative">
              <div className="ds-hscroll flex items-center gap-1.5 py-1.5 -mb-1.5">
                {stripTabs.map(tab => {
                  const active = currentTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => vai(tab.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex-none flex items-center gap-1.5 px-3 h-11 rounded-full text-xs font-bold transition ${
                        active
                          ? 'bg-primary text-on-primary shadow-primary-sm'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {tab.icon}
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* ============ DOCK BOTTOM (mobile < 640px) ============ */}
      <nav
        ref={layout.dockRef}
        aria-label="Navigazione principale"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-nav pb-safe"
      >
        <div className="h-14 px-1 flex items-center justify-around">
          {primary.map(tab => {
            const active = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => vai(tab.key)}
                aria-current={active ? 'page' : undefined}
                aria-label={tab.label}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1 rounded-lg transition-all ${
                  active ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
                }`}
              >
                {tab.icon}
                <span className="font-label-md text-[10px] xs:text-label-md tracking-tight truncate max-w-full px-0.5">
                  {tab.short}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAltroOpen(true)}
            aria-label="Altre sezioni"
            aria-expanded={altroOpen}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1 rounded-lg transition-all ${
              secondary.some(s => s.key === currentTab)
                ? 'text-primary font-bold bg-primary/10'
                : 'text-on-surface-variant'
            }`}
          >
            <MoreHorizontal size={22} />
            <span className="font-label-md text-[10px] xs:text-label-md tracking-tight">Altro</span>
          </button>
        </div>
      </nav>

      {/* ============ FOGLIO "ALTRO" ============ */}
      {altroOpen && (
        <>
          <div className="ds-sheet-scrim" onClick={() => setAltroOpen(false)} />
          <div className="ds-sheet sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-full sm:max-w-md sm:rounded-2xl sm:border" role="dialog" aria-label="Altre sezioni">
            <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto mb-3" />
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="ds-title">Altre sezioni</span>
              <button
                type="button"
                onClick={() => setAltroOpen(false)}
                aria-label="Chiudi"
                className="w-11 h-11 -mr-1 rounded-full flex items-center justify-center text-on-surface-variant active:bg-surface-container shrink-0"
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
