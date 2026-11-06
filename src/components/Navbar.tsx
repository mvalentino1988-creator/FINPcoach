import React, { useEffect, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  CloudDownload,
  LayoutDashboard,
  Monitor,
  Moon,
  MoreHorizontal,
  Palette,
  Settings2,
  Sun,
  Timer,
  Users,
  Waves,
  X,
} from 'lucide-react';
import { BackupModal } from './BackupModal';
import type { LayoutMetrics } from '../hooks/useLayoutMetrics';
import { pushBackHandler } from '../lib/backHandler';

export type TabKey = 'oggi' | 'vasca' | 'squadra' | 'altro';

interface Props {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  layout: LayoutMetrics;
}

interface NavItem {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const ITEMS: Record<TabKey, NavItem> = {
  oggi:   { key: 'oggi',   label: 'Oggi',    Icon: LayoutDashboard },
  vasca:  { key: 'vasca',  label: 'Vasca',   Icon: Timer },
  squadra:{ key: 'squadra',label: 'Squadra', Icon: Users },
  altro:  { key: 'altro',  label: 'Altro',   Icon: MoreHorizontal },
};

const CONTESTO: Record<TabKey, string> = {
  oggi:    'Oggi',
  vasca:   'Vasca',
  squadra: 'Squadra',
  altro:   'Altro',
};

const ORDINE: TabKey[] = ['oggi', 'vasca', 'squadra', 'altro'];

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const { themeMode, setThemeMode } = useApp();
  const [backupOpen, setBackupOpen] = useState(false);
  const [aspettoOpen, setAspettoOpen] = useState(false);

  useEffect(() => {
    if (!aspettoOpen && !backupOpen) return undefined;
    return pushBackHandler(() => {
      if (backupOpen) { setBackupOpen(false); return true; }
      if (aspettoOpen) { setAspettoOpen(false); return true; }
      return false;
    });
  }, [aspettoOpen, backupOpen]);

  const vai = (tab: TabKey) => {
    onTabChange(tab);
    sessionStorage.removeItem('finp_from_altro');
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

  const renderItem = (key: TabKey, mobile = false) => {
    const item = ITEMS[key];
    const active = currentTab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => vai(key)}
        aria-current={active ? 'page' : undefined}
        className={
          mobile
            ? `flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-2 rounded-2xl transition-all duration-200 ${
                active ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant hover:bg-surface-container'
              }`
            : `sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
        }
      >
        <item.Icon size={mobile ? 24 : 18} className="shrink-0" />
        <span className={mobile ? 'font-headline text-xs tracking-tight' : 'truncate flex-1'}>{item.label}</span>
        {!mobile && (
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${active ? 'text-primary/60' : 'text-on-surface-variant'}`}>
            {ORDINE.indexOf(key) + 1}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}

      {/* Desktop sidebar */}
      <aside
        aria-label="Menu principale"
        className="hidden lg:flex flex-col shrink-0 w-[240px] sticky top-0 self-start h-[100dvh] overflow-y-auto border-r border-outline-variant px-3 pb-4"
        style={{ paddingTop: 'max(1rem, var(--safe-top, 0px))', background: 'var(--color-surface-container-lowest)' }}
      >
        <button
          type="button"
          onClick={() => vai('oggi')}
          className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors mb-2"
        >
          <span className="w-10 h-10 rounded-2xl bg-gradient-blue flex items-center justify-center shrink-0 shadow-primary-sm">
            <Waves size={20} className="text-white" />
          </span>
          <span className="font-headline text-xl font-bold text-on-surface tracking-tight">
            FINP<span style={{ color: 'var(--color-tertiary)' }}>coach</span>
          </span>
        </button>

        <nav aria-label="Sezioni principali" className="flex flex-col gap-1 flex-1">
          <span className="sidebar-section-label">Navigazione</span>
          {ORDINE.map(k => renderItem(k))}
        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-outline-variant">
          <button type="button" onClick={() => setBackupOpen(true)} className="sidebar-item sidebar-item-inactive">
            <CloudDownload size={18} className="shrink-0" />
            <span>Backup e dati</span>
          </button>
          <button type="button" onClick={() => setAspettoOpen(true)} className="sidebar-item sidebar-item-inactive">
            <Settings2 size={18} className="shrink-0" />
            <span>Aspetto</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header
        ref={layout.headerRef}
        className="lg:hidden sticky top-0 z-40 border-b border-outline-variant bg-surface-container-lowest backdrop-blur"
        style={{ paddingTop: 'var(--safe-top, 0px)' }}
      >
        <div className="mx-auto max-w-[1600px] px-gutter-mobile sm:px-gutter h-14 flex items-center justify-between gap-3">
          <button type="button" onClick={() => vai('oggi')} className="flex items-center gap-2.5 min-w-0 min-h-[44px]">
            <span className="w-9 h-9 rounded-xl bg-gradient-blue flex items-center justify-center shrink-0 shadow-primary-sm">
              <Waves size={18} className="text-white" />
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-headline text-base font-bold text-on-surface tracking-tight whitespace-nowrap">
                FINP<span style={{ color: 'var(--color-tertiary)' }}>coach</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/15 max-w-[140px] truncate">
                {CONTESTO[currentTab]}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAspettoOpen(true)}
              aria-label="Aspetto"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2 sm:px-3.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant hover:bg-surface-container-high transition-all active:scale-95"
            >
              <Palette size={18} />
              <span className="hidden sm:inline">Aspetto</span>
            </button>
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              aria-label="Backup e dati"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2 sm:px-3.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-outline-variant hover:bg-surface-container-high transition-all active:scale-95"
            >
              <CloudDownload size={18} />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom dock */}
      <nav
        ref={layout.dockRef}
        aria-label="Navigazione principale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-outline-variant bg-surface-container-lowest"
        style={{ paddingBottom: 'var(--safe-bottom, 10px)' }}
      >
        <div className="h-[68px] px-2 flex items-center justify-around gap-1">
          {ORDINE.map(k => renderItem(k, true))}
        </div>
      </nav>

      {/* Aspetto modal */}
      {aspettoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setAspettoOpen(false)}>
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-slide-up" onClick={e => e.stopPropagation()} role="dialog" aria-label="Aspetto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">Aspetto</h3>
              <button type="button" onClick={() => setAspettoOpen(false)} aria-label="Chiudi" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <span className="block text-xs font-bold text-primary uppercase tracking-widest">Tema</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sistema' as const, label: 'Sistema', icon: <Monitor size={18} /> },
                  { id: 'chiaro' as const, label: 'Chiaro', icon: <Sun size={18} /> },
                  { id: 'scuro' as const, label: 'Scuro', icon: <Moon size={18} /> },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeMode(item.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                      themeMode === item.id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">«Sistema» segue automaticamente il tema del dispositivo.</p>
            </div>

            <button type="button" onClick={() => setAspettoOpen(false)} className="w-full ds-btn-primary py-3 rounded-2xl justify-center">
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
