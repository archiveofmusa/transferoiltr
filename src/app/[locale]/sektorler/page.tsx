import type { Metadata } from 'next';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { SectorCard } from '@/components/SectorCard';
import { SectorServiceBreadcrumbs } from '@/components/SectorServiceBreadcrumbs';
import { sectorServiceCopy } from '@/data/sectorContent';
import { sectors } from '@/data/sectors';
import { serviceContactHref } from '@/data/serviceContact';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(params);
  return createPageMetadata(locale, messages, sectorServiceCopy[locale].index.meta, '/sektorler');
}

export default async function SectorsPage({ params }: Props) {
  const { locale, messages } = await resolveLocale(params);
  const copy = sectorServiceCopy[locale];
  return <>
    <section className="border-b border-line bg-mist py-12"><Container>
      <SectorServiceBreadcrumbs locale={locale} messages={messages} items={[{ label: copy.common.sectorsLabel, path: '/sektorler' }]} />
      <SectionTitle as="h1" eyebrow="UHPHORTUM" title={copy.index.eyebrow} description={copy.index.title} />
      <p className="mt-4 max-w-3xl text-base leading-7 text-steel">{copy.index.description}</p>
    </Container></section>
    <section data-sector-section className="py-18"><Container>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{sectors.map((sector, index) => <SectorCard key={sector.slug} slug={sector.slug} content={copy.sectors[sector.slug]} linkLabel={copy.common.explore} index={index} heading="h2" />)}</div>
      <div className="mt-8 flex flex-wrap gap-4"><Button href={serviceContactHref(locale)}>{copy.common.supportCta}</Button><Button href="/uygulamalar" variant="secondary">{copy.common.applicationsLabel}</Button></div>
      <p className="mt-3 text-sm leading-6 text-steel">{copy.common.emailNote}</p>
    </Container></section>
  </>;
}
