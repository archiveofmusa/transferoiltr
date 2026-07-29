import type { Messages } from '@/i18n/messages';
import type { NavigationMenu } from './navigation-types';
import { TransferOilProductMegaMenu } from './TransferOilProductMegaMenu';

type TransferOilDropdownProps = {
  menu: NavigationMenu;
  messages: Messages;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function TransferOilDropdown({ menu, messages, mobile = false, onNavigate }: TransferOilDropdownProps) {
  return (
    <TransferOilProductMegaMenu
      menu={menu}
      overviewLabel={messages.Header.mega.overview}
      technicalInformation={messages.Header.mega.technicalInformation}
      mobile={mobile}
      onNavigate={onNavigate}
    />
  );
}
