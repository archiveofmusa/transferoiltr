'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { localeDetails, locales, type Locale } from '@/i18n/routing';
import type { Messages } from '@/i18n/messages';

function persistLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageSelector({ messages }: { messages: Messages }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => locales.indexOf(locale));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const restoreTriggerFocus = () => {
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) restoreTriggerFocus();
  };

  const openMenu = (index = locales.indexOf(locale)) => {
    setActiveIndex(index);
    setOpen(true);
  };

  useEffect(() => {
    const closeOnPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('mousedown', closeOnPointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnPointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
  }, [activeIndex, open]);

  const changeLocale = (nextLocale: Locale) => {
    const query = window.location.search.slice(1);
    const hash = window.location.hash;
    const href = `${pathname}${query ? `?${query}` : ''}${hash}`;
    setOpen(false);
    persistLocaleCookie(nextLocale);
    router.replace(href, { locale: nextLocale, scroll: false });
  };

  const moveFocus = (nextIndex: number) => {
    const normalizedIndex = (nextIndex + locales.length) % locales.length;
    setActiveIndex(normalizedIndex);
    optionRefs.current[normalizedIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? locales.length - 1
          : locales.indexOf(locale);
      openMenu(index);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(locales.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative" dir="ltr">
      <button
        ref={triggerRef}
        type="button"
        aria-label={messages.LocaleSwitcher.label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        title={messages.LocaleSwitcher.current}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="to-language-trigger"
      >
        <Image src={localeDetails[locale].flag} alt="" width={22} height={15} className="h-[15px] w-[22px] shrink-0 object-cover" />
        <span>{localeDetails[locale].code}</span>
        <span aria-hidden="true" className={`text-[9px] transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div id={menuId} role="listbox" aria-label={messages.LocaleSwitcher.label} className="to-language-menu">
          {locales.map((option, index) => (
            <button
              key={option}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              role="option"
              aria-selected={option === locale}
              aria-label={messages.LocaleSwitcher.options[option].aria}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => changeLocale(option)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className="to-language-option"
            >
              <Image src={localeDetails[option].flag} alt="" width={24} height={16} className="h-4 w-6 shrink-0 object-cover" />
              <span dir="auto" className="min-w-0 flex-1 text-start">{messages.LocaleSwitcher.options[option].label}</span>
              {option === locale && <span aria-hidden="true" className="text-signal">•</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
