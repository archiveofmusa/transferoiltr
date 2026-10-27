import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Container } from '@/components/Container';
import { ProductExplorer } from '@/components/ProductExplorer';
import { SectionTitle } from '@/components/SectionTitle';
import { uhpProducts } from '@/data/uhpProducts';
import { localizeProducts } from '@/i18n/localizeProducts';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> { const { locale, messages } = await resolveLocale(props.params); return createPageMetadata(locale, messages, 'products', '/urunler'); }

export default async function ProductsPage(props: Props) {
  const { locale, messages } = await resolveLocale(props.params);
  const products = localizeProducts(uhpProducts, locale, messages);
  const page = messages.Products.page;
  return <><section className="border-b border-line bg-mist py-12"><Container><Breadcrumbs messages={messages} items={[{ label: page.breadcrumb }]} /><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-signal">{page.eyebrow}</p><h1 className="mt-3 text-4xl font-extrabold text-navy sm:text-5xl">{page.title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-steel">{page.description}</p></Container></section><section className="py-14"><Container><Suspense fallback={<div className="h-96 animate-pulse bg-mist" aria-label={messages.Common.loading} />}><ProductExplorer locale={locale} messages={messages} products={products} /></Suspense></Container></section><section className="bg-mist py-14"><Container><SectionTitle eyebrow={page.noteEyebrow} title={page.noteTitle} description={page.noteDescription} /><a href={`/${locale}/teknik-destek`} className="mt-7 inline-flex bg-signal px-5 py-3 text-sm font-bold text-white transition hover:bg-signalHover">{messages.Common.requestTechnicalSupport}</a></Container></section></>;
}
