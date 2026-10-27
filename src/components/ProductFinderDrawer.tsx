'use client';

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import { productFinderData, type ProductFinderItem } from '@/data/transferoil/product-finder';

type ProductFinderCopy = Messages['Hero']['productFinderPanel'];

const localeIndexes = { tr: 0, en: 1, ru: 2, ar: 3 } as const;
const maximumVisibleResults = 48;

const normalizedSectionCopyKeys = {
  fittings: 'fittings',
  genel: 'general',
  hydraulic: 'hydraulic',
  industrial: 'industrial',
  surdurulebilirlik: 'sustainability',
  uhp: 'uhp',
  yasal: 'legal',
  iletisim: 'contact',
  icerik: 'content',
  sirket: 'company',
} as const satisfies Record<string, keyof ProductFinderCopy['sections']>;

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function includesEveryTerm(haystack: string, query: string): boolean {
  const terms = normalizeSearchValue(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const normalizedHaystack = normalizeSearchValue(haystack);
  return terms.every((term) => normalizedHaystack.includes(term));
}

function sectionCopyKey(value: string): keyof ProductFinderCopy['sections'] {
  const normalized = normalizeSearchValue(value).replace(/\s+/g, '');
  return normalizedSectionCopyKeys[normalized as keyof typeof normalizedSectionCopyKeys] ?? 'general';
}

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function resultSearchText(item: ProductFinderItem): string {
  return [...item.t, ...item.f, ...item.g, ...item.p, ...item.c, item.s, item.r].join(' ');
}

export function ProductFinderDrawer({ triggerLabel, copy }: { triggerLabel: string; copy: ProductFinderCopy }) {
  const rawLocale = useLocale();
  const locale = rawLocale in localeIndexes ? (rawLocale as keyof typeof localeIndexes) : 'tr';
  const localeIndex = localeIndexes[locale];
  const isRtl = locale === 'ar';
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const familyListId = useId();
  const pressureListId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [family, setFamily] = useState('');
  const [pressure, setPressure] = useState('');
  const [connection, setConnection] = useState('');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 30);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previouslyFocused?.focus());
    };
  }, [open]);

  const sections = useMemo(
    () => [...new Set(productFinderData.items.map((item) => item.s))]
      .sort((left, right) => {
        const leftLabel = copy.sections[sectionCopyKey(left)];
        const rightLabel = copy.sections[sectionCopyKey(right)];
        return leftLabel.localeCompare(rightLabel, locale);
      }),
    [copy.sections, locale],
  );

  const familySuggestions = useMemo(
    () => [...new Set(
      productFinderData.items
        .filter((item) => !section || item.s === section)
        .map((item) => item.f[localeIndex])
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right, locale)),
    [locale, localeIndex, section],
  );

  const pressureSuggestions = useMemo(
    () => [...new Set(productFinderData.items.flatMap((item) => item.p))]
      .sort((left, right) => {
        const leftUnit = left.toLocaleLowerCase().includes('psi') ? 1 : 0;
        const rightUnit = right.toLocaleLowerCase().includes('psi') ? 1 : 0;
        return leftUnit - rightUnit || Number.parseFloat(left.replace(',', '.')) - Number.parseFloat(right.replace(',', '.'));
      }),
    [],
  );

  const connections = useMemo(
    () => [...new Set(productFinderData.items.flatMap((item) => item.c))]
      .sort((left, right) => left.localeCompare(right, 'en')),
    [],
  );

  const filteredResults = useMemo(() => {
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    return productFinderData.items
      .filter((item) => {
        if (section && item.s !== section) return false;
        if (connection && !item.c.includes(connection)) return false;
        if (!includesEveryTerm(resultSearchText(item), deferredQuery)) return false;
        if (!includesEveryTerm([...item.f, ...item.g].join(' '), family)) return false;
        if (!includesEveryTerm(item.p.join(' '), pressure)) return false;
        return true;
      })
      .sort((left, right) => Number(right.x) - Number(left.x) || collator.compare(left.t[localeIndex], right.t[localeIndex]));
  }, [connection, deferredQuery, family, locale, localeIndex, pressure, section]);

  const clearFilters = () => {
    setQuery('');
    setSection('');
    setFamily('');
    setPressure('');
    setConnection('');
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const sectionLabel = (value: string) => {
    return copy.sections[sectionCopyKey(value)];
  };

  const visibleResults = filteredResults.slice(0, maximumVisibleResults);
  const countText = fillTemplate(copy.showing, {
    shown: visibleResults.length,
    total: filteredResults.length,
    catalog: productFinderData.sourceCount,
  });

  const drawer = open ? (
    <div className="to-finder-layer fixed inset-0 z-[120]" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        className="to-finder-backdrop absolute inset-0 cursor-default bg-[#15191d]/75 backdrop-blur-[2px]"
        aria-label={copy.close}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        id="transfer-oil-product-finder"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        className="to-finder-panel absolute inset-y-0 start-0 flex w-full max-w-[760px] flex-col overflow-hidden border-e border-white/15 bg-[#f1f2f3] shadow-[18px_0_50px_rgb(0_0_0_/_35%)]"
      >
        <header className="relative shrink-0 bg-[var(--to-menu-bg)] px-6 py-7 text-white sm:px-9">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-signalLight">{copy.eyebrow}</span>
          <h2 id={dialogTitleId} className="mt-2 text-2xl font-semibold sm:text-[30px]">{copy.title}</h2>
          <p id={dialogDescriptionId} className="mt-3 max-w-[620px] text-sm leading-6 text-white/70">{copy.description}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center border border-white/25 text-2xl leading-none text-white transition hover:border-[var(--to-red)] hover:bg-[var(--to-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:end-6 sm:top-6"
            aria-label={copy.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="shrink-0 border-b border-[#cfd2d4] bg-white px-6 py-6 sm:px-9">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="to-finder-label">{copy.queryLabel}</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.queryPlaceholder}
                className="to-finder-control"
                autoComplete="off"
              />
            </label>
            <label>
              <span className="to-finder-label">{copy.sectionLabel}</span>
              <select value={section} onChange={(event) => setSection(event.target.value)} className="to-finder-control">
                <option value="">{copy.allSections}</option>
                {sections.map((value) => <option value={value} key={value}>{sectionLabel(value)}</option>)}
              </select>
            </label>
            <label>
              <span className="to-finder-label">{copy.familyLabel}</span>
              <input
                value={family}
                onChange={(event) => setFamily(event.target.value)}
                placeholder={copy.familyPlaceholder}
                className="to-finder-control"
                list={familyListId}
                autoComplete="off"
              />
              <datalist id={familyListId}>{familySuggestions.map((value) => <option value={value} key={value} />)}</datalist>
            </label>
            <label>
              <span className="to-finder-label">{copy.pressureLabel}</span>
              <input
                value={pressure}
                onChange={(event) => setPressure(event.target.value)}
                placeholder={copy.pressurePlaceholder}
                className="to-finder-control"
                list={pressureListId}
                inputMode="search"
                autoComplete="off"
              />
              <datalist id={pressureListId}>{pressureSuggestions.map((value) => <option value={value} key={value} />)}</datalist>
            </label>
            <label>
              <span className="to-finder-label">{copy.connectionLabel}</span>
              <select value={connection} onChange={(event) => setConnection(event.target.value)} className="to-finder-control">
                <option value="">{copy.allConnections}</option>
                {connections.map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e2e4] pt-4">
            <p className="text-xs font-semibold text-[#596068]" aria-live="polite">{countText}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-black uppercase tracking-[0.08em] text-[var(--to-button-bg)] underline decoration-[var(--to-red)] decoration-2 underline-offset-4 hover:text-[var(--to-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--to-red)]"
            >
              {copy.clear}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-9">
          {visibleResults.length ? (
            <ul className="grid gap-3" aria-label={copy.resultsLabel}>
              {visibleResults.map((item) => (
                <li key={item.i}>
                  <Link
                    href={item.r}
                    onClick={() => setOpen(false)}
                    className="group block border-s-[3px] border-[var(--to-red)] bg-white px-5 py-4 shadow-[0_2px_9px_rgb(0_0_0_/_8%)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_7px_18px_rgb(0_0_0_/_13%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--to-red)]"
                  >
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--to-red)]">{sectionLabel(item.s)}</span>
                        <span className="mt-1 block text-[16px] font-bold leading-5 text-[#33383d]">{item.t[localeIndex]}</span>
                        {item.f[localeIndex] !== item.t[localeIndex] ? (
                          <span className="mt-1 block text-xs text-[#747a80]">{item.f[localeIndex]}</span>
                        ) : null}
                      </span>
                      <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#3f4449] transition group-hover:text-[var(--to-red)]">
                        {copy.openResult}<span aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>›</span>
                      </span>
                    </span>
                    {item.p.length || item.c.length ? (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {item.p.slice(0, 3).map((value) => <span key={value} className="to-finder-chip">{value}</span>)}
                        {item.c.slice(0, 4).map((value) => <span key={value} className="to-finder-chip">{value}</span>)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t-[3px] border-[var(--to-red)] bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-bold text-[#34393e]">{copy.emptyTitle}</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6b7177]">{copy.emptyText}</p>
              <button type="button" onClick={clearFilters} className="mt-5 bg-[var(--to-button-bg)] px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[var(--to-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--to-red)] focus-visible:ring-offset-2">
                {copy.clear}
              </button>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#d1d4d6] bg-[#e5e7e8] px-6 py-3 text-[11px] text-[#62686e] sm:px-9">
          {copy.keyboardHint}
        </footer>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="to-product-finder-tab"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls="transfer-oil-product-finder"
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>
      {drawer && typeof document !== 'undefined' ? createPortal(drawer, document.body) : null}
    </>
  );
}
