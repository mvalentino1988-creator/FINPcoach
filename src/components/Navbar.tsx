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
  LayoutGrid
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
  Icon: React.ComponentType<{ size?: number | string }>;
}

const ITEMS: Record<TabKey, NavItem> = {
  oggi: { key: 'oggi', label: 'Dashboard', short: 'Oggi', Icon: LayoutDashboard },
  cronometro: { key: 'cronometro', label: 'Cronometro', short: 'Crono', Icon: Timer },
  regia: { key: 'regia', label: 'Regia', short: 'Regia', Icon: Sliders },
  atleti: { key: 'atleti', label: 'Atleti', short: 'Atleti', Icon: Users },
  dati: { key: 'dati', label: 'Archivio Dati', short: 'Dati', Icon: Database },
  fonti: { key: 'fonti', label: 'Gare & Record', short: 'Gare', Icon: Trophy },
  piano: { key: 'piano', label: 'Periodizzazione', short: 'Piano', Icon: CalendarDays },
};

const CONTESTO: Record<TabKey, string> = {
  oggi: 'Oggi',
  cronometro: 'Cronometro',
  regia: 'Regia',
  atleti: 'Atleti',
  dati: 'Archivio Dati',
  fonti: 'Gare & Record',
  piano: 'Periodizzazione',
};

const GRUPPO_VASCA: TabKey[] = ['oggi', 'cronometro', 'regia'];
const GRUPPO_GESTIONE: TabKey[] = ['atleti', 'dati', 'fonti', 'piano'];
const ORDINE: TabKey[] = [...GRUPPO_VASCA, ...GRUPPO_GESTIONE];
const DOCK_KEYS: TabKey[] = ['oggi', 'cronometro', 'regia', 'atleti'];

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const { layoutScelto, setLayoutScelto, themeMode, setThemeMode } = useApp();
  const [backupOpen, setBackupOpen] = useState(false);
  const [altroOpen, setAltroOpen] = useState(false);
  const [aspettoOpen, setAspettoOpen] = useState(false);

  useEffect(() => {
    if (!altroOpen && !aspettoOpen && !backupOpen) return undefined;
    return pushBackHandler(() => {
      if (backupOpen) {
        setBackupOpen(false);
        return true;
      }
      if (aspettoOpen) {
        setAspettoOpen(false);
        return true;
      }
      if (altroOpen) {
        setAltroOpen(false);
        return true;
      }
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

  const dockItems = DOCK_KEYS.map(k => ITEMS[k]);
  const altroItems = ORDINE.filter(k => !DOCK_KEYS.includes(k)).map(k => ITEMS[k]);
  const altroAttivo = altroOpen || altroItems.some(i => i.key === currentTab);

  const renderSidebarItem = (key: TabKey) => {
    const item = ITEMS[key];
    const active = currentTab === key;
    const numero = ORDINE.indexOf(key) + 1;
    return (
      <button
        key={key}
        type="button"
        onClick={() => vai(key)}
        aria-current={active ? 'page' : undefined}
        title={`${item.label} (tasto ${numero})`}
        className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-bold transition ${
          active
            ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-primary-sm'
            : 'text-on-surface hover:bg-surface-container'
        }`}
      >
        <item.Icon size={20} />
        <span className="truncate">{item.label}</span>
        <span
          aria-hidden="true"
          className={`ml-auto text-[11px] font-semibold tabular-nums ${active ? 'text-white/70' : 'text-on-surface-variant'}`}
        >
          {numero}
        </span>
      </button>
    );
  };

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      <aside
        aria-label="Menu principale"
        className="hidden lg:flex flex-col shrink-0 w-60 xl:w-64 sticky top-0 self-start h-[100dvh] overflow-y-auto bg-surface-container-lowest border-r border-outline-variant/60 px-3 pb-4"
        style={{ paddingTop: 'max(1rem, var(--safe-top, 0px))' }}
      >
        <button
          type="button"
          onClick={() => vai('oggi')}
          className="flex items-center gap-2.5 px-2 min-h-[44px] text-left"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shrink-0 shadow-primary-sm">
            <Waves size={20} />
          </span>
          <span className="font-headline text-lg text-on-surface tracking-tight font-bold">
            FINP<span className="text-secondary">coach</span>
          </span>
        </button>

        <nav aria-label="Sezioni principali" className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="px-3 pb-1 text-xs font-semibold text-on-surface-variant">Operatività Quotidiana</span>
            {GRUPPO_VASCA.map(renderSidebarItem)}
          </div>
          <div className="flex flex-col gap-1">
            <span className="px-3 pb-1 text-xs font-semibold text-on-surface-variant">Gestione Squadra</span>
            {GRUPPO_GESTIONE.map(renderSidebarItem)}
          </div>
        </nav>

        <div className="mt-auto pt-5 flex flex-col gap-1 border-t border-outline-variant/60">
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition"
          >
            <CloudDownload size={20} />
            <span>Backup e dati</span>
          </button>
          <button
            type="button"
            onClick={() => setAspettoOpen(true)}
            className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition"
          >
            <LayoutGrid size={20} />
            <span>Aspetto</span>
          </button>
        </div>
      </aside>

      <header
        ref={layout.headerRef}
        className="lg:hidden sticky top-0 z-40 bg-surface/92 backdrop-blur-xl border-b border-outline-variant/60"
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
            {ORDINE.map(key => {
              const tab = ITEMS[key];
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-none flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-primary-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <tab.Icon size={20} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {layoutScelto === 'flottante' ? (
        <nav
          ref={layout.dockRef}
          aria-label="Navigazione principale"
          className="sm:hidden fixed bottom-3 inset-x-4 z-40 bg-surface/95 backdrop-blur-xl rounded-3xl shadow-float border border-outline-variant px-2 py-1.5"
          style={{ paddingBottom: 'max(6px, var(--safe-bottom, 8px))' }}
        >
          <div className="h-14 flex items-center justify-around gap-1">
            {dockItems.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-2xl transition-all ${
                    active ? 'bg-primary text-white shadow-primary-sm px-3' : 'text-on-surface-variant'
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
              className={`flex items-center justify-center min-w-[48px] min-h-[48px] p-2 rounded-2xl transition-all ${
                altroAttivo ? 'bg-primary text-white shadow-primary-sm px-3' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={24} />
              {altroAttivo && <span className="text-xs font-bold font-headline ml-1.5">Altro</span>}
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
            {(['oggi', 'cronometro'] as TabKey[]).map(key => {
              const tab = ITEMS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={currentTab === key ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 ${
                    currentTab === key ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  <tab.Icon size={22} />
                  <span className="text-[11px] font-headline mt-0.5">{tab.short}</span>
                </button>
              );
            })}

            {/* Pulsante centrale: Cronometro rapido */}
            <div className="relative -top-4 px-2">
              <button
                type="button"
                onClick={() => vai('cronometro')}
                aria-label="Cronometro"
                className={`w-14 h-14 rounded-full bg-gradient-to-r from-tertiary-container to-tertiary text-white flex items-center justify-center shadow-orange-glow hover:scale-105 transition-all ${
                  currentTab === 'cronometro' ? 'ring-4 ring-primary/40' : ''
                }`}
              >
                <Timer size={26} />
              </button>
            </div>

            {(['regia'] as TabKey[]).map(key => {
              const tab = ITEMS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => vai(key)}
                  aria-current={currentTab === key ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 ${
                    currentTab === key ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  <tab.Icon size={22} />
                  <span className="text-[11px] font-headline mt-0.5">{tab.short}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setAltroOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 ${
                altroAttivo ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={22} />
              <span className="text-[11px] font-headline mt-0.5">Altro</span>
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
          <div className="h-16 px-2 flex items-center justify-center gap-1">
            {dockItems.map(tab => {
              const active = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => vai(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[52px] py-1 rounded-xl transition-all ${
                    active ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
                  }`}
                >
                  <tab.Icon size={24} />
                  <span className="font-headline text-[11px] tracking-tight truncate max-w-full px-0.5">
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
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[52px] py-1 rounded-xl transition-all ${
                altroAttivo ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant'
              }`}
            >
              <MoreHorizontal size={24} />
              <span className="font-headline text-[11px] tracking-tight">Altro</span>
            </button>
          </div>
        </nav>
      )}

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
              <span className="font-headline text-lg font-bold text-on-surface">Altre sezioni</span>
              <button
                type="button"
                onClick={() => setAltroOpen(false)}
                aria-label="Chiudi"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {altroItems.map(tab => (
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
                  <span
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      currentTab === tab.key ? 'bg-white/20 text-white' : 'bg-primary-container text-white'
                    }`}
                  >
                    <tab.Icon size={22} />
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
                <span className="font-headline font-bold text-xs truncate max-w-full">Backup e dati</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {aspettoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Aspetto e navigazione</h3>
              <button
                type="button"
                onClick={() => setAspettoOpen(false)}
                aria-label="Chiudi"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <span className="block text-xs font-bold text-primary">Tema</span>
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
              <p className="text-[11px] text-on-surface-variant">
                «Sistema» segue il tema chiaro o scuro del dispositivo.
              </p>
            </div>

            <div className="space-y-3">
              <span className="block text-xs font-bold text-primary">Barra di navigazione del telefono</span>
              <div className="space-y-2">
                {[
                  { id: 'classica', title: 'Classica', desc: 'Barra a tutta larghezza' },
                  { id: 'flottante', title: 'Flottante', desc: 'Pillola staccata con effetto blur' },
                  { id: 'azione-centrale', title: 'Azione centrale', desc: 'Pulsante rapido al centro' },
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
              Salva e chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
