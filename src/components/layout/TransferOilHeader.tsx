'use client';

import { usePathname } from '@/i18n/navigation';
import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';
import type { TransferOilNavigation } from './navigation-types';
import { TransferOilMainNav } from './TransferOilMainNav';
import { TransferOilTopBar } from './TransferOilTopBar';
import { IndustriesPanel } from './IndustriesPanel';

export function TransferOilHeader({ messages, navigation, locale, industriesContent }: { messages: Messages; navigation: TransferOilNavigation; locale: Locale; industriesContent: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [menuEpoch, setMenuEpoch] = useState(0);
  const location = `${locale}:${pathname}`;
  const [previousLocation, setPreviousLocation] = useState(location);
  const industriesTriggerRef = useRef<HTMLElement | null>(null);

  // Reset route-bound UI during reconciliation, including browser Back/Forward and locale changes.
  if (previousLocation !== location) {
    setPreviousLocation(location);
    setIndustriesOpen(false);
    setMobileOpen(false);
    setMenuEpoch((current) => current + 1);
  }

  const openIndustries = (event: MouseEvent<HTMLButtonElement>) => {
    industriesTriggerRef.current = event.currentTarget;
    setMobileOpen(false);
    setMenuEpoch((current) => current + 1);
    setIndustriesOpen(true);
  };

  return (
    <header className="to-site-header sticky top-0 z-50">
      <TransferOilTopBar messages={messages} industriesOpen={industriesOpen} onOpenIndustries={openIndustries} />
      <TransferOilMainNav
        key={menuEpoch}
        messages={messages}
        navigation={navigation}
        pathname={pathname}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        onNavigate={() => setMobileOpen(false)}
        industriesOpen={industriesOpen}
        onOpenIndustries={openIndustries}
      />
      {industriesOpen && <IndustriesPanel title={messages.Header.utility.industries} closeLabel={messages.Common.close} returnFocus={industriesTriggerRef} onClose={() => setIndustriesOpen(false)}>{industriesContent}</IndustriesPanel>}
    </header>
  );
}
