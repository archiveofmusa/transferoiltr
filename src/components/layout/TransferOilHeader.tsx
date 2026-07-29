'use client';

import { usePathname } from '@/i18n/navigation';
import { useState } from 'react';
import type { Messages } from '@/i18n/messages';
import type { TransferOilNavigation } from './navigation-types';
import { TransferOilMainNav } from './TransferOilMainNav';
import { TransferOilTopBar } from './TransferOilTopBar';

export function TransferOilHeader({ messages, navigation }: { messages: Messages; navigation: TransferOilNavigation }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="to-site-header sticky top-0 z-50">
      <TransferOilTopBar messages={messages} />
      <TransferOilMainNav
        messages={messages}
        navigation={navigation}
        pathname={pathname}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
    </header>
  );
}
