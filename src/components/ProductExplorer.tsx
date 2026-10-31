'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';
import type { LocalizedUhpProduct } from '@/i18n/localizeProducts';
import { uhpFamilies as sourceUhpFamilies, type UhpProductFamily } from '@/data/uhpProducts';
import { Button } from './Button';
import { ProductCard } from './ProductCard';
import { sortUhpFamilies, sortUhpProducts } from '@/lib/productPresentation';

const uhpFamilies = sortUhpFamilies(sourceUhpFamilies);

type PressureFilter = '' | '1500' | '2200' | 'technical';
type Filters = { search: string; family: UhpProductFamily | ''; pressure: PressureFilter; application: string; sort: 'reference' | 'family' | 'pressure' | 'name' };

export function ProductExplorer({ locale, messages, products }: { locale: Locale; messages: Messages; products: LocalizedUhpProduct[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const incomingFamily = params.get('family');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: params.get('search') ?? '',
    family: uhpFamilies.includes(incomingFamily as UhpProductFamily) ? (incomingFamily as UhpProductFamily) : '',
    pressure: (params.get('pressure') as PressureFilter) ?? '',
    application: params.get('application') ?? '',
    sort: 'reference',
  });

  const copy = messages.Products.filters;
  const familyLabels = Object.fromEntries(uhpFamilies.map((family) => [family, messages.Products.families[family].label])) as Record<UhpProductFamily, string>;
  const applications = useMemo(() => {
    const ids = [...new Set(products.flatMap((product) => product.applicationIds))];
    return ids.map((id) => ({ id, label: messages.Products.applications[id] })).sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale, messages, products]);

  const filtered = useMemo(() => sortUhpProducts(products.filter((product) => {
    const term = filters.search.toLocaleLowerCase(locale).trim();
    const matchesText = !term || `${product.name} ${product.familyLabel} ${product.shortDescription}`.toLocaleLowerCase(locale).includes(term);
    const matchesFamily = !filters.family || product.family === filters.family;
    const matchesApplication = !filters.application || product.applicationIds.includes(filters.application as (typeof product.applicationIds)[number]);
    const matchesPressure = !filters.pressure || (filters.pressure === 'technical' && !product.pressureBar) || (filters.pressure === '1500' && product.pressureBar === 1500) || (filters.pressure === '2200' && product.pressureBar === 2200);
    return matchesText && matchesFamily && matchesApplication && matchesPressure;
  }), (a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name, locale) : filters.sort === 'pressure' ? (b.pressureBar ?? 0) - (a.pressureBar ?? 0) : filters.sort === 'family' ? a.familyLabel.localeCompare(b.familyLabel, locale) || a.name.localeCompare(b.name, locale) : 0), [filters, locale, products]);

  const pressureOptions = [
    { value: '' as PressureFilter, label: messages.Products.pressure.all },
    { value: '1500' as PressureFilter, label: messages.Products.pressure.upTo1500 },
    { value: '2200' as PressureFilter, label: messages.Products.pressure.upTo2200 },
    { value: 'technical' as PressureFilter, label: messages.Products.pressure.technical },
  ];
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => { setFilters({ search: '', family: '', pressure: '', application: '', sort: 'reference' }); router.replace('/urunler'); };

  const controls = <div className="space-y-5">
    <label className="block text-sm font-bold text-navy">{copy.productName}<input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder={copy.searchPlaceholder} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-normal outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20" /></label>
    <label className="block text-sm font-bold text-navy">{copy.family}<select value={filters.family} onChange={(event) => setFilter('family', event.target.value as Filters['family'])} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-normal outline-none focus:border-signal"><option value="">{copy.allFamilies}</option>{uhpFamilies.map((family) => <option key={family} value={family}>{familyLabels[family]}</option>)}</select></label>
    <label className="block text-sm font-bold text-navy">{copy.pressure}<select value={filters.pressure} onChange={(event) => setFilter('pressure', event.target.value as PressureFilter)} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-normal outline-none focus:border-signal">{pressureOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label className="block text-sm font-bold text-navy">{copy.application}<select value={filters.application} onChange={(event) => setFilter('application', event.target.value)} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-normal outline-none focus:border-signal"><option value="">{copy.allApplications}</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.label}</option>)}</select></label>
    <button type="button" onClick={reset} className="text-sm font-bold text-signal underline underline-offset-4">{copy.clear}</button>
  </div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[275px_minmax(0,1fr)]">
      <aside className="hidden self-start border-t-4 border-signal bg-mist p-6 lg:block"><h2 className="text-lg font-extrabold text-navy">{copy.title}</h2><div className="mt-6">{controls}</div></aside>
      <div>
        <div className="mb-5 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFilter('family', '')} className={`px-3 py-2 text-xs font-extrabold transition ${!filters.family ? 'bg-graphiteDark text-white' : 'bg-mist text-steel hover:bg-signal hover:text-white'}`}>{messages.Common.all}</button>{uhpFamilies.map((family) => <button key={family} type="button" onClick={() => setFilter('family', family)} className={`px-3 py-2 text-xs font-extrabold transition ${filters.family === family ? 'bg-graphiteDark text-white' : 'bg-mist text-steel hover:bg-signal hover:text-white'}`}>{familyLabels[family]}</button>)}</div><button type="button" onClick={() => setMobileFiltersOpen((open) => !open)} className="border border-navy/25 px-4 py-2 text-sm font-bold text-navy lg:hidden">{mobileFiltersOpen ? copy.hide : copy.show}</button></div>
        {mobileFiltersOpen && <div className="mb-6 border-t-4 border-signal bg-mist p-5 lg:hidden">{controls}</div>}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-steel">{copy.count.replace('{count}', String(filtered.length))}</p><label className="flex items-center gap-3 text-sm font-bold text-navy">{copy.sort}<select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value as Filters['sort'])} className="h-10 border border-line bg-white px-3 text-sm font-normal outline-none focus:border-signal"><option value="reference">{copy.reference}</option><option value="family">{copy.sortFamily}</option><option value="pressure">{copy.sortPressure}</option><option value="name">{copy.sortName}</option></select></label></div>
        {filtered.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((product) => <ProductCard key={product.slug} product={product} messages={messages} />)}</div> : <div className="border border-dashed border-navy/25 bg-mist p-9 text-center"><h2 className="text-xl font-extrabold text-navy">{copy.emptyTitle}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-steel">{copy.emptyText}</p><Button href="/teknik-destek" className="mt-6">{messages.Common.requestTechnicalSupport}</Button></div>}
      </div>
    </div>
  );
}
