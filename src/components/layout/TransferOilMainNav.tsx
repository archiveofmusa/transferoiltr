'use client';

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import type { MainNavigationKey, NavigationMenu, TransferOilNavigation } from './navigation-types';
import { TransferOilDropdown } from './TransferOilDropdown';

type TransferOilMainNavProps = {
  pathname: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNavigate: () => void;
  messages: Messages;
  navigation: TransferOilNavigation;
};

const menuOrder: MainNavigationKey[] = ['kurumsal', 'hidrolik', 'endustriyel', 'uhp'];

function isActive(pathname: string, item: NavigationMenu) {
  if (item.key === 'kurumsal') return pathname.startsWith('/kurumsal');
  if (item.key === 'hidrolik') return pathname.startsWith('/hidrolik') || pathname.startsWith('/baglanti-elemanlari');
  if (item.key === 'endustriyel') return pathname.startsWith('/endustriyel');
  return pathname.startsWith('/uhp') || pathname.startsWith('/urunler');
}

export function TransferOilMainNav({
  pathname,
  mobileOpen,
  onMobileOpenChange,
  onNavigate,
  messages,
  navigation,
}: TransferOilMainNavProps) {
  const [openMenu, setOpenMenu] = useState<MainNavigationKey | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<MainNavigationKey | null>(null);
  const [focusFirstItemIn, setFocusFirstItemIn] = useState<MainNavigationKey | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRefs = useRef<Partial<Record<MainNavigationKey, HTMLButtonElement | null>>>({});
  const openMenuRef = useRef<MainNavigationKey | null>(null);
  const mobileOpenRef = useRef(mobileOpen);
  const items = menuOrder.map((key) => navigation[key]);
  const mobileUtilityItems = [
    { label: messages.Header.utility.exhibitions, href: '/fuarlar' },
    { label: messages.Header.utility.news, href: '/haberler' },
    { label: messages.Header.utility.certificates, href: '/sertifikalar' },
    { label: messages.Header.utility.contact, href: '/iletisim' },
  ];

  const closeMenus = () => {
    setOpenMenu(null);
    setMobileExpanded(null);
    onNavigate();
  };

  const cancelScheduledClose = () => {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) return;
      setOpenMenu(null);
    }, 0);
  };

  const openMenuFor = (key: MainNavigationKey) => {
    cancelScheduledClose();
    setOpenMenu(key);
  };

  const restoreTriggerFocus = (key: MainNavigationKey) => {
    window.requestAnimationFrame(() => menuTriggerRefs.current[key]?.focus());
  };

  useEffect(() => {
    openMenuRef.current = openMenu;
  }, [openMenu]);

  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!focusFirstItemIn || openMenu !== focusFirstItemIn) return;

    const frame = window.requestAnimationFrame(() => {
      const menu = document.getElementById(`transferoil-menu-${focusFirstItemIn}`);
      menu?.querySelector<HTMLElement>('a[href], summary, button:not([disabled])')?.focus();
      setFocusFirstItemIn(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusFirstItemIn, openMenu]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const menuToRestore = openMenuRef.current;
      const restoreMobileTrigger = mobileOpenRef.current;

      if (!menuToRestore && !restoreMobileTrigger && !mobileExpanded) return;
      event.preventDefault();
      setOpenMenu(null);
      setMobileExpanded(null);
      onMobileOpenChange(false);

      if (menuToRestore) {
        restoreTriggerFocus(menuToRestore);
      } else if (restoreMobileTrigger) {
        window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      cancelScheduledClose();
    };
  }, [mobileExpanded, onMobileOpenChange]);

  const openFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, key: MainNavigationKey) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenuFor(key);
      setFocusFirstItemIn(key);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpenMenu((current) => (current === key ? null : key));
    }
  };

  const closeWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setOpenMenu(null);
  };

  return (
    <div
      ref={rootRef}
      className="to-main-bar"
      onMouseEnter={cancelScheduledClose}
      onMouseLeave={scheduleClose}
      onFocusCapture={cancelScheduledClose}
      onBlurCapture={closeWhenFocusLeaves}
    >
      <nav className="to-main-row flex h-full items-stretch" aria-label={messages.Header.mainMenu}>
        <div className="hidden h-full items-stretch gap-10 lg:flex">
          {items.map((item) => (
            <button
              key={item.key}
              ref={(element) => {
                menuTriggerRefs.current[item.key] = element;
              }}
              type="button"
              aria-haspopup="true"
              aria-controls={`transferoil-menu-${item.key}`}
              aria-expanded={openMenu === item.key}
              data-active={isActive(pathname, item)}
              className="to-main-link"
              onMouseEnter={() => openMenuFor(item.key)}
              onKeyDown={(event) => openFromKeyboard(event, item.key)}
              onClick={() => setOpenMenu((current) => (current === item.key ? null : item.key))}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center lg:hidden">
          <button
            ref={mobileTriggerRef}
            type="button"
            aria-label={mobileOpen ? messages.Header.closeMenu : messages.Header.openMenu}
            aria-controls="transferoil-mobile-menu"
            aria-expanded={mobileOpen}
            onClick={() => onMobileOpenChange(!mobileOpen)}
            className="to-mobile-trigger"
          >
            <span aria-hidden="true" className="relative block h-5 w-6">
              <span className={`to-hamburger-line top-0 ${mobileOpen ? 'translate-y-[9px] rotate-45' : ''}`} />
              <span className={`to-hamburger-line top-[9px] ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`to-hamburger-line top-[18px] ${mobileOpen ? '-translate-y-[9px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </nav>

      {openMenu && (
        <TransferOilDropdown menu={navigation[openMenu]} messages={messages} onNavigate={closeMenus} />
      )}

      {mobileOpen && (
        <div
          id="transferoil-mobile-menu"
          className="to-mobile-menu absolute inset-x-0 top-full z-[80] max-h-[calc(100vh-138px)] overflow-y-auto border-b border-[rgb(0_0_0_/_25%)] px-5 py-5 shadow-2xl lg:hidden"
        >
          <div className="grid gap-0">
            {items.map((item) => (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setMobileExpanded((current) => (current === item.key ? null : item.key))}
                  aria-controls={`transferoil-mobile-submenu-${item.key}`}
                  aria-expanded={mobileExpanded === item.key}
                  className="to-mobile-section-trigger flex w-full items-center justify-between border-b border-[rgb(255_255_255_/_16%)] py-3 text-start text-base font-medium text-[var(--to-white)]"
                >
                  {item.label}
                  <span aria-hidden="true" className="text-xl font-light">{mobileExpanded === item.key ? '−' : '+'}</span>
                </button>
                {mobileExpanded === item.key && (
                  <div id={`transferoil-mobile-submenu-${item.key}`}>
                    <TransferOilDropdown menu={item} messages={messages} mobile onNavigate={closeMenus} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="to-mobile-utility-links">
            {mobileUtilityItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenus} className="to-mobile-utility-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
