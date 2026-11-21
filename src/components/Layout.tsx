import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity, AlertOctagon, BarChart3, ChevronRight, FlaskConical,
  HardDrive, HeartPulse, Menu, Moon, Search, Settings2, Shield, Sun, Vault, X,
} from 'lucide-react';
import { type ConsolePage, useConsole } from '../context/ConsoleContext.tsx';
import type { Role } from '../shared/types.ts';
import { CommandPalette } from './CommandPalette.tsx';

const navigation = [
  { title: 'Monitor', items: [
    { id: 'war-room', label: 'Overview', icon: Activity },
    { id: 'incidents', label: 'Incidents', icon: AlertOctagon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] },
  { title: 'Manage', items: [
    { id: 'live-storage', label: 'Storage', icon: HardDrive },
    { id: 'canaries', label: 'Canaries & vault', icon: Vault },
    { id: 'simulator', label: 'Test lab', icon: FlaskConical },
    { id: 'health', label: 'System health', icon: HeartPulse },
    { id: 'setup', label: 'Settings', icon: Settings2 },
  ] },
] as const;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, activePage, setActivePage, role, setRole, wsConnected, reconnectWs, toasts, dismissToast } = useConsole();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const reducedMotion = useReducedMotion();
  const active = navigation.flatMap(group => [...group.items]).find(item => item.id === activePage)!;
  const degraded = !wsConnected || Boolean(state?.health.streamGapSimulated);
  const unresolved = state?.incidents.filter(incident => ['ACTIVE', 'CONTAINED'].includes(incident.status)).length || 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem('defyswarm-theme', next); } catch { /* Theme still works when storage is unavailable. */ }
  }

  function navigate(page: ConsolePage) {
    setActivePage(page);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }

  const rail = <>
    <div className="workspace-brand">
      <span className="brand-symbol"><Shield size={20} strokeWidth={1.8} /></span>
      <span><strong>DefySwarm</strong><small>Storage security</small></span>
      <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setNavOpen(false)}><X size={18} /></button>
    </div>
    <button className="workspace-search" onClick={() => setPaletteOpen(true)}>
      <Search size={15} /><span>Search console</span><kbd>⌘ K</kbd>
    </button>
    <nav className="workspace-nav" aria-label="Console navigation">
      {navigation.map(group => <div className="nav-group" key={group.title}>
        <p>{group.title}</p>
        {group.items.map(item => <button key={item.id} aria-current={activePage === item.id ? 'page' : undefined}
          className={`nav-item ${activePage === item.id ? 'selected' : ''}`} onClick={() => navigate(item.id)}>
          <item.icon size={17} strokeWidth={1.65} /><span>{item.label}</span>
          {item.id === 'incidents' && unresolved > 0 && <span className="nav-count">{unresolved}</span>}
        </button>)}
      </div>)}
    </nav>
    <div className="workspace-footer">
      <div className="connection-status"><span className={`status-dot ${degraded ? 'warning' : ''}`} />{degraded ? 'Telemetry interrupted' : 'Telemetry connected'}</div>
      <label>Console role
      <select value={role} onChange={event => setRole(event.target.value as Role)}>
        <option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option>
      </select></label>
    </div>
  </>;

  return <div className="workspace-shell">
    <aside className="workspace-rail">{rail}</aside>
    <AnimatePresence>{navOpen && <motion.div className="mobile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)}>
      <motion.aside className="workspace-rail mobile-rail" initial={{ x: reducedMotion ? 0 : -240 }} animate={{ x: 0 }} exit={{ x: reducedMotion ? 0 : -240 }} transition={{ duration: .18 }} onClick={event => event.stopPropagation()}>{rail}</motion.aside>
    </motion.div>}</AnimatePresence>
    <div className="workspace-content">
      <header className="workspace-header">
        <div className="workspace-breadcrumb">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
          <span className="breadcrumb-workspace">Workspace</span><ChevronRight size={14} className="breadcrumb-workspace" /><strong>{active?.label}</strong>
        </div>
        <div className="header-tools">
          <span className="enforcement-state">{state?.policy.mode === 'dry-run' ? 'Dry-run mode' : 'Active monitoring'}</span>
          <button className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>
      {degraded && <div className="stream-warning" role="status"><span>Live telemetry is interrupted.</span><button onClick={reconnectWs}>Reconnect</button></div>}
      <main className="workspace-main">
        <motion.div key={activePage} className="page-canvas" initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .16 }}>{children}</motion.div>
      </main>
    </div>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>{toasts.map(toast => <motion.div className={`console-toast ${toast.tone}`} key={toast.id} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div><strong>{toast.title}</strong>{toast.detail && <p>{toast.detail}</p>}</div>
        <button className="icon-button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification"><X size={16} /></button>
      </motion.div>)}</AnimatePresence>
    </div>
  </div>;
};
