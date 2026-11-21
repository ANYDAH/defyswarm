/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { ConfirmSheet } from './components/ConfirmSheet.tsx';
import { Layout } from './components/Layout.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { ConsoleProvider, useConsole } from './context/ConsoleContext.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { CanariesVaultView } from './views/CanariesVaultView.tsx';
import { HealthView } from './views/HealthView.tsx';
import { IncidentsView } from './views/IncidentsView.tsx';
import { LiveStorageView } from './views/LiveStorageView.tsx';
import { SetupView } from './views/SetupView.tsx';
import { SimulatorView } from './views/SimulatorView.tsx';
import { WarRoomView } from './views/WarRoomView.tsx';

const ConsoleRouter: React.FC = () => {
  const { activePage, loading, error, refreshBootstrap } = useConsole();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--ink-primary)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--accent-indigo)]/35 bg-[var(--accent-indigo)]/15 text-[var(--accent-text)]">
          <Shield className="h-5 w-5" />
        </div>
        <p className="mt-3.5 text-[14px] font-medium">Connecting to DefySwarm Control Plane…</p>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Synchronizing ledger &amp; WORM vault manifest
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 text-center text-[var(--ink-primary)]">
        <p className="text-[15px] font-semibold text-[var(--signal-crimson)]">Control Plane Unreachable</p>
        <p className="mt-1.5 max-w-md text-[13px] text-[var(--ink-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => void refreshBootstrap()}
          className="mt-4 inline-flex h-[32px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <Layout>
      {activePage === 'war-room' && <WarRoomView />}
      {activePage === 'live-storage' && <LiveStorageView />}
      {activePage === 'simulator' && <SimulatorView />}
      {activePage === 'incidents' && <IncidentsView />}
      {activePage === 'analytics' && <AnalyticsView />}
      {activePage === 'canaries' && <CanariesVaultView />}
      {activePage === 'setup' && <SetupView />}
      {activePage === 'health' && <HealthView />}
      <OnboardingModal />
      <ConfirmSheet />
    </Layout>
  );
};

export default function App() {
  return (
    <ConsoleProvider>
      <ConsoleRouter />
    </ConsoleProvider>
  );
}
