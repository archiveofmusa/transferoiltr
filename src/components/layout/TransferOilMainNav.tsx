'use client';

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEventHandler } from 'react';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import { mainNavigationOrder, type MainNavigationKey, type MainNavigationItem, type TransferOilNavigation } from './navigation-types';
import { TransferOilDropdown } from './TransferOilDropdown';
import { testCenter } from '@/data/testCenter';

type TransferOilMainNavProps = {
  pathname: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNavigate: () => void;
  messages: Messages;
  navigation: TransferOilNavigation;
  industriesOpen: boolean;
  onOpenIndustries: MouseEventHandler<HTMLButtonElement>;
};

function isActive(pathname: string, key: MainNavigationItem['key']) {
  switch (key) {
    case 'kurumsal': return pathname.startsWith('/kurumsal');
    case 'hidrolik': return pathname.startsWith('/hidrolik') || pathname.startsWith('/baglanti-elemanlari');
    case 'endustriyel': return pathname.startsWith('/endustriyel');
    case 'uhp': return pathname.startsWith('/uhp') || pathname.startsWith('/urunler');
    case 'test-center': return pathname === testCenter.path;
    default: return false;
  }
}

export function TransferOilMainNav({
  pathname,
  mobileOpen,
  onMobileOpenChange,
  onNavigate,
  messages,
  navigation,
  industriesOpen,
  onOpenIndustries,
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
  const items: MainNavigationItem[] = [
    ...mainNavigationOrder.map((key) => ({ kind: 'mega' as const, key, menu: navigation[key] })),
    { kind: 'link', key: 'test-center', label: messages.Header.main.testCenter, href: testCenter.path },
  ];
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
        <div className="hidden h-full items-stretch gap-5 xl:flex 2xl:gap-10">
          {items.map((item) => item.kind === 'link' ? (
            <Link key={item.key} href={item.href} data-main-key={item.key} data-active={isActive(pathname, item.key)} aria-current={isActive(pathname, item.key) ? 'page' : undefined} className="to-main-link" onMouseEnter={() => setOpenMenu(null)} onFocus={() => setOpenMenu(null)} onClick={closeMenus}>{item.label}</Link>
          ) : (
            <button
              key={item.key}
              ref={(element) => {
                menuTriggerRefs.current[item.key] = element;
              }}
              type="button"
              aria-haspopup="true"
              aria-controls={`transferoil-menu-${item.key}`}
              aria-expanded={openMenu === item.key}
              data-main-key={item.key}
              data-active={isActive(pathname, item.key)}
              aria-current={isActive(pathname, item.key) ? 'page' : undefined}
              className="to-main-link"
              onMouseEnter={() => openMenuFor(item.key)}
              onKeyDown={(event) => openFromKeyboard(event, item.key)}
              onClick={() => setOpenMenu((current) => (current === item.key ? null : item.key))}
            >
              {item.menu.label}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center justify-between xl:hidden">
          <button type="button" data-industries-trigger aria-haspopup="dialog" aria-expanded={industriesOpen} aria-controls={industriesOpen ? 'industries-panel' : undefined} onClick={onOpenIndustries} className="to-main-link">
            {messages.Header.utility.industries}
          </button>
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
          className="to-mobile-menu absolute inset-x-0 top-full z-[80] max-h-[calc(100dvh-138px)] overflow-y-auto border-b border-[rgb(0_0_0_/_25%)] px-5 py-5 shadow-2xl xl:hidden"
        >
          <div className="grid gap-0">
            {items.map((item) => item.kind === 'link' ? (
              <Link key={item.key} data-mobile-main-key={item.key} href={item.href} aria-current={isActive(pathname, item.key) ? 'page' : undefined} data-active={isActive(pathname, item.key)} onClick={closeMenus} className="to-mobile-section-trigger border-b border-white/20 py-3 text-start text-base font-medium text-white">{item.label}</Link>
            ) : (
              <div key={item.key}>
                <button
                  type="button"
                  data-mobile-main-key={item.key}
                  data-active={isActive(pathname, item.key)}
                  aria-current={isActive(pathname, item.key) ? 'page' : undefined}
                  onClick={() => setMobileExpanded((current) => (current === item.key ? null : item.key))}
                  aria-controls={`transferoil-mobile-submenu-${item.key}`}
                  aria-expanded={mobileExpanded === item.key}
                  className="to-mobile-section-trigger flex w-full items-center justify-between border-b border-[rgb(255_255_255_/_16%)] py-3 text-start text-base font-medium text-[var(--to-white)]"
                >
                  {item.menu.label}
                  <span aria-hidden="true" className="text-xl font-light">{mobileExpanded === item.key ? '−' : '+'}</span>
                </button>
                {mobileExpanded === item.key && (
                  <div id={`transferoil-mobile-submenu-${item.key}`}>
                    <TransferOilDropdown menu={item.menu} messages={messages} mobile onNavigate={closeMenus} />
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
