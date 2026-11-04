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
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  Settings2
} from 'lucide-react';
import { BackupModal } from './BackupModal';
import { Marquee } from './Marquee';
import type { LayoutMetrics } from '../hooks/useLayoutMetrics';
import { pushBackHandler } from '../lib/backHandler';

export type TabKey = 'oggi' | 'cronometro' | 'regia' | 'atleti' | 'fonti' | 'dati' | 'piano';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  layout: LayoutMetrics;
}

interface NavItem {
  key: TabKey;
  label: string;
  short: string;
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const ITEMS: Record<TabKey, NavItem> = {
  oggi:      { key: 'oggi',      label: 'Dashboard',      short: 'Oggi',   Icon: LayoutDashboard },
  cronometro:{ key: 'cronometro',label: 'Cronometro',     short: 'Crono',  Icon: Timer },
  regia:     { key: 'regia',     label: 'Regia',          short: 'Regia',  Icon: Sliders },
  atleti:    { key: 'atleti',    label: 'Atleti',         short: 'Atleti', Icon: Users },
  dati:      { key: 'dati',      label: 'Archivio Dati',  short: 'Dati',   Icon: Database },
  fonti:     { key: 'fonti',     label: 'Gare & Record',  short: 'Gare',   Icon: Trophy },
  piano:     { key: 'piano',     label: 'Periodizzazione',short: 'Piano',  Icon: CalendarDays },
};

const CONTESTO: Record<TabKey, string> = {
  oggi:       'Dashboard',
  cronometro: 'Cronometro',
  regia:      'Regia',
  atleti:     'Atleti',
  dati:       'Archivio Dati',
  fonti:      'Gare & Record',
  piano:      'Periodizzazione',
};

const GRUPPO_VASCA: TabKey[]    = ['oggi', 'cronometro', 'regia'];
const GRUPPO_GESTIONE: TabKey[] = ['atleti', 'dati', 'fonti', 'piano'];
const ORDINE: TabKey[]          = [...GRUPPO_VASCA, ...GRUPPO_GESTIONE];
const DOCK_KEYS: TabKey[]       = ['oggi', 'cronometro', 'regia', 'atleti'];

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const { layoutScelto, setLayoutScelto, themeMode, setThemeMode } = useApp();
  const [backupOpen, setBackupOpen]   = useState(false);
  const [altroOpen, setAltroOpen]     = useState(false);
  const [aspettoOpen, setAspettoOpen] = useState(false);

  useEffect(() => {
    if (!altroOpen && !aspettoOpen && !backupOpen) return undefined;
    return pushBackHandler(() => {
      if (backupOpen)  { setBackupOpen(false);  return true; }
      if (aspettoOpen) { setAspettoOpen(false); return true; }
      if (altroOpen)   { setAltroOpen(false);   return true; }
      return false;
    });
  }, [altroOpen, aspettoOpen, backupOpen]);

  const vai = (tab: TabKey) => {
    onTabChange(tab);
    setAltroOpen(false);
    if (['cronometro', 'regia', 'dati'].includes(tab)) {
      sessionStorage.setItem('finp_from_altro', 'true');
    } else {
      sessionStorage.removeItem('finp_from_altro');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= ORDINE.length) {
        e.preventDefault();
        vai(ORDINE[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dockItems  = DOCK_KEYS.map(k => ITEMS[k]);
  const altroItems = ORDINE.filter(k => !DOCK_KEYS.includes(k)).map(k => ITEMS[k]);
  const altroAttivo = altroOpen || altroItems.some(i => i.key === currentTab);

  /* ------------------------------------------------------------------ */
  /* SIDEBAR ITEM                                                         */
  /* ------------------------------------------------------------------ */
  const renderSidebarItem = (key: TabKey) => {
    const item   = ITEMS[key];
    const active = currentTab === key;
    const numero = ORDINE.indexOf(key) + 1;
    return (
      <button
        key={key}
        type="button"
        onClick={() => vai(key)}
        aria-current={active ? 'page' : undefined}
        title={`${item.label} (tasto ${numero})`}
        className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
      >
        <item.Icon size={18} className="shrink-0" />
        <span className="truncate flex-1">{item.label}</span>
        <span
          aria-hidden="true"
          className={`text-xs font-semibold tabular-nums shrink-0 ${active ? 'text-white/60' : 'text-on-surface-variant'}`}
        >
          {numero}
        </span>
      </button>
    );
  };

  /* ------------------------------------------------------------------ */
  /* RENDER                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* ================================================================ */}
      {/* DESKTOP SIDEBAR                                                   */}
      {/* ================================================================ */}
      <aside
        aria-label="Menu principale"
        className="hidden lg:flex flex-col shrink-0 w-[256px] sticky top-0 self-start h-[100dvh] overflow-y-auto border-r border-outline-variant px-3 pb-4"
        style={{
          paddingTop: 'max(1rem, var(--safe-top, 0px))',
          background: 'var(--color-surface-container-lowest)',
        }}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => vai('oggi')}
          className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container transition-colors mb-2"
        >
          <span className="w-10 min-h-[48px] rounded-2xl bg-gradient-blue flex items-center justify-center shrink-0 shadow-primary-sm">
            <Waves size={20} className="text-white" />
          </span>
          <span className="font-headline text-xl font-bold text-on-surface tracking-tight">
            FINP<span style={{ color: 'var(--color-tertiary)' }}>coach</span>
          </span>
        </button>

        {/* Nav groups */}
        <nav aria-label="Sezioni principali" className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-0.5">
            <span className="sidebar-section-label">Operatività Vasca</span>
            {GRUPPO_VASCA.map(renderSidebarItem)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="sidebar-section-label">Gestione Squadra</span>
            {GRUPPO_GESTIONE.map(renderSidebarItem)}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="mt-auto pt-4 flex flex-col gap-0.5 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            className="sidebar-item sidebar-item-inactive"
          >
            <CloudDownload size={18} className="shrink-0" />
            <span>Backup e dati</span>
          </button>
          <button
            type="button"
            onClick={() => setAspettoOpen(true)}
            className="sidebar-item sidebar-item-inactive"
          >
            <Settings2 size={18} className="shrink-0" />
            <span>Aspetto</span>
          </button>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* MOBILE / TABLET HEADER                                           */}
      {/* ================================================================ */}
      <header
        ref={layout.headerRef}
        className="lg:hidden sticky top-0 z-40 border-b border-outline-variant ds-glass"
        style={{ paddingTop: 'var(--safe-top, 0px)' }}
      >
        <div className="mx-auto max-w-[1600px] px-gutter-mobile sm:px-gutter py-3 flex items-center justify-between gap-3">
          {/* Left: logo + context */}
          <button
            type="button"
            onClick={() => vai('oggi')}
            className="flex items-center gap-3 min-w-0 min-h-[44px]"
          >
            <span className="w-10 min-h-[48px] rounded-xl bg-gradient-blue flex items-center justify-center shrink-0 shadow-primary-sm">
              <Waves size={20} className="text-white" />
            </span>
            <span className="flex items-center gap-3 min-w-0">
              <span className="font-headline text-lg font-bold text-on-surface tracking-tight">
                FINP<span style={{ color: 'var(--color-tertiary)' }}>coach</span>
              </span>
              <span className="text-xs font-bold text-primary bg-surface-container px-3 py-1 rounded-full border border-outline-variant min-w-[70px] max-w-[170px] text-center">
                <Marquee text={CONTESTO[currentTab]} />
              </span>
            </span>
          </button>

          {/* Right: backup btn */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              title="Backup & Dati"
              aria-label="Backup e Dati"
              className="inline-flex items-center gap-1.5 min-h-[48px] px-4 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant hover:bg-surface-container-high transition-all duration-250 active:scale-95"
            >
              <CloudDownload size={16} />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>

        {/* Tablet horizontal nav (sm and above, hidden on pure mobile) */}
        <nav aria-label="Sezioni principali" className="hidden sm:block border-t border-outline-variant px-gutter">
          <div className="ds-hscroll flex items-center gap-3 py-2.5">
            {ORDINE.filter(key => !(layoutScelto === 'azione-centrale' && key === 'cronometro')).map(key => {
              const tab    = ITEMS[key];
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-none flex items-center gap-3 px-4 min-h-[48px] rounded-xl text-xs font-bold font-headline transition-all duration-250 ${
                    active
                      ? 'bg-gradient-blue text-white shadow-primary-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <tab.Icon size={16} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ================================================================ */}
      {/* MOBILE BOTTOM DOCK — FLOTTANTE                                   */}
      {/* ================================================================ */}
      {layoutScelto === 'flottante' ? (
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-4 inset-x-4 z-40 ds-glass rounded-3xl border border-outline-variant shadow-float px-3 py-2"
          style={{ paddingBottom: 'max(8px, var(--safe-bottom, 10px))' }}
        >
          <div className="h-16 flex items-center justify-around gap-2">
            {dockItems.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex items-center justify-center min-w-[52px] min-h-[52px] p-3 rounded-2xl transition-all duration-250 ${
                    active
                      ? 'bg-gradient-blue text-white shadow-primary-sm px-4'
                      : 'text-on-surface-variant hover:bg-surface-container/80'
                  }`}
                >
                  <tab.Icon size={24} />
                  {active && <span className="text-xs font-bold font-headline ml-1.5">{tab.short}</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              aria-label="Altre sezioni"
              className={`flex items-center justify-center min-w-[52px] min-h-[52px] p-3 rounded-2xl transition-all duration-250 ${
                altroAttivo
                  ? 'bg-gradient-blue text-white shadow-primary-sm px-4'
                  : 'text-on-surface-variant hover:bg-surface-container/80'
              }`}
            >
              <MoreHorizontal size={24} />
              {altroAttivo && <span className="text-xs font-bold font-headline ml-1.5">Altro</span>}
            </button>
          </div>
        </nav>

      ) : layoutScelto === 'azione-centrale' ? (
        /* AZIONE CENTRALE */
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 ds-glass shadow-nav border-t border-outline-variant"
          style={{ paddingBottom: 'var(--safe-bottom, 10px)' }}
        >
          <div className="h-20 px-3 grid grid-cols-5 items-end pt-2">
            {(['oggi', 'atleti'] as TabKey[]).map(key => {
              const tab    = ITEMS[key];
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center min-h-[56px] py-1.5 px-3 rounded-2xl transition-all duration-250 ${
                    active ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  <tab.Icon size={24} className={active ? 'text-primary' : ''} />
                  <span className={`text-xs font-headline mt-1 ${active ? 'text-primary' : ''}`}>{tab.short}</span>
                </button>
              );
            })}

            {/* FAB centrale — Cronometro */}
            <div className="relative flex flex-col items-center justify-end min-h-[56px] pb-1.5">
              <button
                type="button"
                onClick={() => vai('cronometro')}
                aria-label="Cronometro"
                aria-current={currentTab === 'cronometro' ? 'page' : undefined}
                className={`absolute -top-8 w-16 h-16 rounded-full bg-gradient-orange text-white flex items-center justify-center shadow-tertiary-glow hover:scale-105 active:scale-95 transition-all duration-250 ${
                  currentTab === 'cronometro' ? 'ring-4 ring-primary/30' : ''
                }`}
              >
                <Timer size={28} />
              </button>
              <span className={`text-xs font-headline mt-auto ${currentTab === 'cronometro' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                Crono
              </span>
            </div>

            {(['regia'] as TabKey[]).map(key => {
              const tab    = ITEMS[key];
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center min-h-[56px] py-1.5 px-3 rounded-2xl transition-all duration-250 ${
                    active ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  <tab.Icon size={24} />
                  <span className={`text-xs font-headline mt-1 ${active ? 'text-primary' : ''}`}>{tab.short}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              aria-label="Altre sezioni"
              aria-expanded={altroOpen}
              className={`flex flex-col items-center justify-center min-h-[56px] py-1.5 ${
                altroAttivo ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={24} />
              <span className="text-xs font-headline mt-1">Altro</span>
            </button>
          </div>
        </nav>

      ) : (
        /* CLASSICA */
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 ds-glass shadow-nav border-t border-outline-variant"
          style={{ paddingBottom: 'var(--safe-bottom, 10px)' }}
        >
          <div className="h-20 px-3 flex items-center justify-center gap-1">
            {dockItems.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 min-h-[56px] py-2 rounded-2xl transition-all duration-250 ${
                    active ? 'text-primary font-bold bg-primary' : 'text-on-surface-variant hover:bg-surface-container/70'
                  }`}
                >
                  <tab.Icon size={24} />
                  <span className="font-headline text-xs tracking-tight truncate max-w-full px-0.5">
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
              className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 min-h-[56px] py-2 rounded-2xl transition-all duration-250 ${
                altroAttivo ? 'text-primary font-bold bg-primary' : 'text-on-surface-variant hover:bg-surface-container/70'
              }`}
            >
              <MoreHorizontal size={24} />
              <span className="font-headline text-xs tracking-tight">Altro</span>
            </button>
          </div>
        </nav>
      )}

      {/* ================================================================ */}
      {/* DRAWER: ALTRE SEZIONI                                            */}
      {/* ================================================================ */}
      {altroOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setAltroOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-3xl p-5 max-w-sm w-full shadow-float border border-outline-variant space-y-4 text-on-surface animate-slide-up"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Altre sezioni"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-headline text-base font-bold text-on-surface">Altre sezioni</span>
              <button
                type="button"
                onClick={() => setAltroOpen(false)}
                aria-label="Chiudi"
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid di sezioni */}
            <div className="grid grid-cols-2 gap-3">
              {altroItems.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl text-center border transition-all group ${
                    currentTab === tab.key
                      ? 'bg-gradient-blue text-white border-primary/0 shadow-primary-sm'
                      : 'bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container hover:border-outline-variant'
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      currentTab === tab.key ? 'bg-white/20 text-white' : 'bg-primary text-primary'
                    }`}
                  >
                    <tab.Icon size={20} />
                  </span>
                  <span className="font-headline font-bold text-xs truncate max-w-full">{tab.label}</span>
                </button>
              ))}

              {/* Aspetto */}
              <button
                type="button"
                onClick={() => { setAltroOpen(false); setAspettoOpen(true); }}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl text-center border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container transition group"
              >
                <span className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Settings2 size={20} />
                </span>
                <span className="font-headline font-bold text-xs">Aspetto</span>
              </button>

              {/* Backup */}
              <button
                type="button"
                onClick={() => { setAltroOpen(false); setBackupOpen(true); }}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl text-center border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container transition group"
              >
                <span className="w-11 h-11 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CloudDownload size={20} />
                </span>
                <span className="font-headline font-bold text-xs">Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DRAWER: ASPETTO                                                   */}
      {/* ================================================================ */}
      {aspettoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setAspettoOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-3xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-slide-up"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Aspetto e navigazione"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Aspetto e Navigazione</h3>
              <button
                type="button"
                onClick={() => setAspettoOpen(false)}
                aria-label="Chiudi"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tema */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold text-primary uppercase tracking-widest">Tema</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sistema', label: 'Sistema', icon: <Monitor size={18} /> },
                  { id: 'chiaro',  label: 'Chiaro',  icon: <Sun size={18} /> },
                  { id: 'scuro',   label: 'Scuro',   icon: <Moon size={18} /> },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeMode(item.id as any)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                      themeMode === item.id
                        ? 'border-primary bg-gradient-blue text-white shadow-primary-sm'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">
                «Sistema» segue automaticamente il tema del dispositivo.
              </p>
            </div>

            {/* Layout barra mobile */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold text-primary uppercase tracking-widest">Barra Navigazione</span>
              <div className="space-y-2">
                {[
                  { id: 'classica',         title: 'Classica',         desc: 'Barra a tutta larghezza con icone ed etichette' },
                  { id: 'flottante',        title: 'Flottante',        desc: 'Pillola staccata con effetto glass e blur' },
                  { id: 'azione-centrale',  title: 'Azione Centrale',  desc: 'Cronometro in primo piano al centro della barra' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayoutScelto(item.id as any)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition-all ${
                      layoutScelto === item.id
                        ? 'border-primary bg-primary text-primary font-bold'
                        : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div>
                      <div className="font-headline text-sm font-bold">{item.title}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                      layoutScelto === item.id ? 'border-primary bg-primary' : 'border-outline-variant bg-transparent'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAspettoOpen(false)}
              className="w-full ds-btn-primary py-3 rounded-2xl justify-center"
            >
              Salva e chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
