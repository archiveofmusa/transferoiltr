import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectorPageTemplate } from '@/components/SectorPageTemplate';
import { sectorServiceCopy } from '@/data/sectorContent';
import { getSector, sectors, sectorRoute } from '@/data/sectors';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return sectors.map(({ slug }) => ({ slug })); }

async function resolve(params: Props['params']) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  return { ...await resolveLocale(params), sector };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, messages, sector } = await resolve(params);
  return createPageMetadata(locale, messages, sectorServiceCopy[locale].sectors[sector.slug].meta, sectorRoute(sector.slug));
}

export default async function SectorPage({ params }: Props) {
  const { locale, messages, sector } = await resolve(params);
  return <SectorPageTemplate locale={locale} messages={messages} slug={sector.slug} />;
}
