import React, { useCallback } from 'react';
import { LandingPage } from './views/LandingPage.tsx';
import type { ConsolePage } from './context/ConsoleContext.tsx';

export default function App() {
  const handleOpenConsole = useCallback((initialPage: ConsolePage = 'war-room') => {
    const sectionMap: Record<ConsolePage, string> = {
      'war-room': 'features-contain',
      'live-storage': 'features-recover',
      'simulator': 'how',
      'incidents': 'features-contain',
      'analytics': 'demo',
      'canaries': 'features-detect',
      'setup': 'how',
      'health': 'how',
    };
    const targetId = sectionMap[initialPage] || 'how';
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return <LandingPage onOpenConsole={handleOpenConsole} />;
}
