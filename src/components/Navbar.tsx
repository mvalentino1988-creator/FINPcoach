import React, { useEffect, useState } from 'react';
import { useApp } from '../data/AppContext';
import {
  CalendarDays,
  CloudDownload,
  LayoutDashboard,
  Monitor,
  Moon,
  Palette,
  Settings2,
  Sun,
  Timer,
  Users,
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
  altro:  { key: 'altro',  label: 'Piano',   Icon: CalendarDays },
};

const CONTESTO: Record<TabKey, string> = {
  oggi:    'Oggi',
  vasca:   'Bordo Vasca',
  squadra: 'Squadra',
  altro:   'Piano',
};

const ORDINE: TabKey[] = ['oggi', 'vasca', 'squadra', 'altro'];

export const Navbar: React.FC<Props> = ({ currentTab, onTabChange, layout }) => {
  const { themeMode, setThemeMode, stagione } = useApp();
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
            ? `ds-nav-item ${active ? 'ds-nav-item-active' : ''}`
            : `sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
        }
      >
        <item.Icon size={mobile ? 22 : 18} className="shrink-0" />
        <span className={mobile ? '' : 'truncate flex-1'}>{item.label}</span>
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
          className="flex items-center gap-space-sm px-2 py-3 rounded-xl hover:bg-surface-container-low transition-colors mb-2"
        >
          <img src="/swim-icon.svg" alt="FINPcoach" className="h-9 w-9 object-contain shrink-0" />
          <span className="flex flex-col items-start min-w-0">
            <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight leading-none">
              FINPcoach
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              {CONTESTO[currentTab]}
            </span>
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

      {/* Mobile header — stile mockup Stitch: logo + contesto + pill vasca + azioni */}
      <header
        ref={layout.headerRef}
        className="lg:hidden sticky top-0 z-40 ds-glass border-b border-[color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingTop: 'var(--safe-top, 0px)' }}
      >
        <div className="mx-auto max-w-[1600px] px-gutter h-16 flex items-center justify-between gap-space-sm">
          {/* Brand — stile mockup Stitch: logo + titolo headline-sm + contesto uppercase */}
        <button
          type="button"
          onClick={() => vai('oggi')}
          className="flex items-center gap-1.5 min-w-0 min-h-[44px] rounded-xl px-1 -ml-1 hover:bg-surface-container-low transition-colors"
        >
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary shrink-0">
            FINP<span className="text-on-surface font-normal">coach</span>
          </span>
          <span className="text-outline-variant text-xs shrink-0">·</span>
          <span className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate">
            {CONTESTO[currentTab]}
          </span>
        </button>

        <div className="flex items-center gap-space-sm shrink-0">
          {stagione?.vascaMetri && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/90 text-primary whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-label-caps text-label-caps uppercase text-on-surface">
                {stagione.vascaMetri}m LIVE
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAspettoOpen(true)}
            aria-label="Aspetto"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high text-on-surface border border-[color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] hover:bg-surface-container-highest transition-all active:scale-95"
          >
            <Palette size={17} />
          </button>
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            aria-label="Backup e dati"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high text-on-surface border border-[color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] hover:bg-surface-container-highest transition-all active:scale-95"
          >
            <CloudDownload size={17} />
          </button>
        </div>
        </div>
      </header>

      {/* Mobile bottom dock — stile mockup: pill attiva primary */}
      <nav
        ref={layout.dockRef}
        aria-label="Navigazione principale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 ds-glass border-t border-[color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] shadow-[0_-1px_12px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'var(--safe-bottom, 10px)' }}
      >
        <div className="h-20 px-space-sm flex items-center justify-around gap-space-xs">
          {ORDINE.map(k => renderItem(k, true))}
        </div>
      </nav>

      {/* Aspetto modal */}
      {aspettoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setAspettoOpen(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-md w-full shadow-float border border-outline-variant space-y-5 text-on-surface animate-slide-up" onClick={e => e.stopPropagation()} role="dialog" aria-label="Aspetto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm font-bold">Aspetto</h3>
              <button type="button" onClick={() => setAspettoOpen(false)} aria-label="Chiudi" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <span className="block font-label-caps text-label-caps uppercase tracking-wider text-primary">Tema</span>
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
                    className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border font-label-caps text-label-caps uppercase tracking-wider transition-all ${
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

            <button type="button" onClick={() => setAspettoOpen(false)} className="w-full ds-btn-primary py-3 rounded-xl justify-center">
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
