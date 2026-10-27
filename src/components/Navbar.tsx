import React, { useState, useEffect } from 'react';
import { useApp } from '../data/AppContext';
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
  Sparkles,
  Sun,
  Moon,
  Monitor,
  LayoutGrid
} from 'lucide-react';
import { BackupModal } from './BackupModal';
import { Marquee } from './Marquee';
import type { LayoutMetrics } from '../hooks/useLayoutMetrics';

export type TabKey = 'oggi' | 'piano' | 'cronometro' | 'regia' | 'atleti' | 'fonti' | 'dati';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  layout: LayoutMetrics;
}

const CONTESTO: Record<TabKey, string> = {
  oggi: 'Oggi',
  piano: 'Piano',
  atleti: 'Atleti',
  fonti: 'Gare',
  cronometro: 'Cronometro',
  regia: 'Regia',
  dati: 'Dati',
};

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const { layoutScelto, setLayoutScelto, themeMode, setThemeMode } = useApp();
  const [backupOpen, setBackupOpen] = useState(false);
  const [altroOpen, setAltroOpen] = useState(false);
  const [aspettoOpen, setAspettoOpen] = useState(false);

  // Handle Android Back button / popstate for Altro modal
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (altroOpen) {
        e.preventDefault();
        setAltroOpen(false);
      }
    };
    if (altroOpen) {
      window.history.pushState({ altroOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [altroOpen]);

  const primary: { key: TabKey; label: string; short: string; icon: React.ReactNode }[] = [
    { key: 'oggi', label: 'Dashboard', short: 'Oggi', icon: <LayoutDashboard size={22} /> },
    { key: 'atleti', label: 'Atleti', short: 'Atleti', icon: <Users size={22} /> },
    { key: 'piano', label: 'Allenamenti', short: 'Piano', icon: <CalendarDays size={22} /> },
    { key: 'fonti', label: 'Gare', short: 'Gare', icon: <Trophy size={22} /> },
  ];

  const secondary: { key: TabKey; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'cronometro', label: 'Cronometro', desc: 'Cronometro multi-corsia a bordo vasca', icon: <Timer size={20} /> },
    { key: 'regia', label: 'Pianificatore', desc: 'Regia tecnica e assegnazione corsie', icon: <Sliders size={20} /> },
    { key: 'dati', label: 'Dati', desc: 'Schede vasca, tempi di ripartenza, registro', icon: <Database size={20} /> },
  ];

  const vai = (tab: TabKey) => {
    onTabChange(tab);
    setAltroOpen(false);
    if (['cronometro', 'regia', 'dati'].includes(tab)) {
      sessionStorage.setItem('finp_from_altro', 'true');
    } else {
      sessionStorage.removeItem('finp_from_altro');
    }
  };

  const stripTabs = [...primary, ...secondary];

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      <header
        ref={layout.headerRef}
        className="sticky top-0 z-40 bg-surface/92 backdrop-blur-xl border-b border-outline-variant/60"
        style={{ paddingTop: 'var(--safe-top, 0px)' }}
      >
        <div className="mx-auto max-w-[1600px] px-gutter-mobile sm:px-gutter py-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => vai('oggi')}
            className="flex items-center gap-2 min-w-0 min-h-[36px] text-left"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shrink-0 shadow-primary-sm">
              <Waves size={18} />
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-headline text-base text-on-surface tracking-tight font-bold truncate">
                FINP<span className="text-secondary">coach</span>
              </span>
              <span className="text-xs font-bold text-primary bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant/60 min-w-[70px] max-w-[120px]">
                <Marquee text={CONTESTO[currentTab]} />
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              title="Backup & Dati"
              aria-label="Backup e Dati"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline hover:bg-surface-container-high transition"
            >
              <CloudDownload size={15} />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>

        <nav aria-label="Sezioni principali" className="hidden sm:block relative border-t border-outline-variant/50 px-gutter">
          <div className="ds-hscroll flex items-center gap-1.5 py-1.5">
            {stripTabs.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-none flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-primary-sm'
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
      </header>

      {/* MOBILE BOTTOM NAV - 3 VARIANTS */}
      {layoutScelto === 'flottante' ? (
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-3 inset-x-4 z-40 bg-surface/95 backdrop-blur-xl rounded-3xl shadow-float border border-outline-variant px-2 py-1.5"
          style={{ paddingBottom: 'max(6px, var(--safe-bottom, 8px))' }}
        >
          <div className="h-12 flex items-center justify-around gap-1">
            {primary.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex items-center justify-center p-2 rounded-2xl transition-all ${
                    active ? 'bg-primary text-white shadow-primary-sm px-3' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.icon}
                  {active && <span className="text-xs font-bold font-headline ml-1.5">{tab.short}</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              aria-label="Altre sezioni"
              className={`flex items-center justify-center p-2 rounded-2xl transition-all ${
                altroOpen ? 'bg-primary text-white shadow-primary-sm px-3' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={22} />
              {altroOpen && <span className="text-xs font-bold font-headline ml-1.5">Altro</span>}
            </button>
          </div>
        </nav>
      ) : layoutScelto === 'azione-centrale' ? (
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-nav border-t border-outline-variant/60"
          style={{ paddingBottom: 'var(--safe-bottom, 8px)' }}
        >
          <div className="h-16 px-3 flex items-center justify-between gap-1 relative">
            <button
              type="button"
              onClick={() => vai('oggi')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${currentTab === 'oggi' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
            >
              <LayoutDashboard size={20} />
              <span className="text-[10px] font-headline mt-0.5">Oggi</span>
            </button>
            <button
              type="button"
              onClick={() => vai('atleti')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${currentTab === 'atleti' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
            >
              <Users size={20} />
              <span className="text-[10px] font-headline mt-0.5">Atleti</span>
            </button>

            {/* Central FAB Action */}
            <div className="relative -top-4 px-2">
              <button
                type="button"
                onClick={() => vai('cronometro')}
                aria-label="Cronometro"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-tertiary-container to-tertiary text-white flex items-center justify-center shadow-orange-glow hover:scale-105 transition-all"
              >
                <Timer size={26} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => vai('piano')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${currentTab === 'piano' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
            >
              <CalendarDays size={20} />
              <span className="text-[10px] font-headline mt-0.5">Piano</span>
            </button>
            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${altroOpen ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
            >
              <MoreHorizontal size={20} />
              <span className="text-[10px] font-headline mt-0.5">Altro</span>
            </button>
          </div>
        </nav>
      ) : (
        /* CLASSICA */
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-nav border-t border-outline-variant/60"
          style={{ paddingBottom: 'var(--safe-bottom, 8px)' }}
        >
          <div className="h-14 px-2 flex items-center justify-center gap-1">
            {primary.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1 rounded-xl transition-all ${
                    active ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.icon}
                  <span className="font-headline text-[10px] tracking-tight truncate max-w-full px-0.5">
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
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1 rounded-xl transition-all ${
                altroOpen ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={22} />
              <span className="font-headline text-[10px] tracking-tight">Altro</span>
            </button>
          </div>
        </nav>
      )}

      {/* ALTRO CENTERED MODAL POPUP (Scale + Fade, 2-Column Grid) */}
      {altroOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setAltroOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface transform transition-all duration-200 scale-100"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Altre sezioni"
          >
            <div className="flex items-center justify-between">
              <span className="font-headline text-lg font-bold text-on-surface">Altre Sezioni</span>
              <button
                type="button"
                onClick={() => setAltroOpen(false)}
                aria-label="Chiudi"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-3">
              {secondary
                .filter(tab => tab.key !== 'cronometro') // Remove Live Deck / Cronometro from Altro
                .map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => vai(tab.key)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-center border transition group ${
                      currentTab === tab.key
                        ? 'bg-primary text-white border-primary shadow-primary-sm'
                        : 'bg-surface-container-low border-outline-variant/60 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${currentTab === tab.key ? 'bg-white/20 text-white' : 'bg-primary-container text-white'}`}>
                      {tab.icon}
                    </span>
                    <span className="font-headline font-bold text-xs truncate max-w-full">{tab.label}</span>
                  </button>
                ))}

              <button
                type="button"
                onClick={() => {
                  setAltroOpen(false);
                  setAspettoOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-center border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container transition"
              >
                <span className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-sm">
                  <LayoutGrid size={22} />
                </span>
                <span className="font-headline font-bold text-xs truncate max-w-full">Aspetto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAltroOpen(false);
                  setBackupOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-center border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container transition"
              >
                <span className="w-12 h-12 rounded-2xl bg-tertiary text-white flex items-center justify-center shadow-sm">
                  <Database size={22} />
                </span>
                <span className="font-headline font-bold text-xs truncate max-w-full">Backup & Dati</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASPETTO MODAL (Settings) */}
      {aspettoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Aspetto & Navigazione</h3>
              <button onClick={() => setAspettoOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-primary">Tema Grafico</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sistema', label: 'Sistema', icon: <Monitor size={16} /> },
                  { id: 'chiaro', label: 'Chiaro', icon: <Sun size={16} /> },
                  { id: 'scuro', label: 'Scuro', icon: <Moon size={16} /> },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeMode(item.id as any)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                      themeMode === item.id
                        ? 'border-primary bg-primary text-white shadow-primary-sm'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-primary">Stile Navigazione Inferiore</label>
              <div className="space-y-2">
                {[
                  { id: 'classica', title: 'Classica', desc: 'Barra standard a tutta larghezza' },
                  { id: 'flottante', title: 'Flottante', desc: 'Pillola staccata con effetto blur' },
                  { id: 'azione-centrale', title: 'Azione Centrale', desc: 'Pulsante rapido centrale in evidenza' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayoutScelto(item.id as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition ${
                      layoutScelto === item.id
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div>
                      <div className="font-headline text-xs font-bold">{item.title}</div>
                      <div className="text-[11px] text-on-surface-variant">{item.desc}</div>
                    </div>
                    {layoutScelto === item.id && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAspettoOpen(false)}
              className="w-full ds-btn-primary py-3 rounded-xl text-center justify-center"
            >
              Salva e Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
