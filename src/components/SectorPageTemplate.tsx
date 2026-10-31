import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { SectorServiceBreadcrumbs } from '@/components/SectorServiceBreadcrumbs';
import { SectorServiceFAQ } from '@/components/SectorServiceFAQ';
import { ServiceContact } from '@/components/ServiceContact';
import { sectorServiceCopy } from '@/data/sectorContent';
import { sectors, sectorRoute, type SectorSlug } from '@/data/sectors';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

export function SectorPageTemplate({ locale, messages, slug }: { locale: Locale; messages: Messages; slug: SectorSlug }) {
  const copy = sectorServiceCopy[locale];
  const sector = sectors.find((item) => item.slug === slug)!;
  const content = copy.sectors[slug];
  return <>
    <section className="border-b border-line bg-mist py-12">
      <Container>
        <SectorServiceBreadcrumbs locale={locale} messages={messages} items={[{ label: copy.common.sectorsLabel, path: '/sektorler' }, { label: content.title, path: sectorRoute(slug) }]} />
        <SectionTitle as="h1" eyebrow="UHPHORTUM" title={content.h1} description={content.intro} className="[overflow-wrap:anywhere]" />
      </Container>
    </section>
    <section className="py-18">
      <Container className="grid items-start gap-12 lg:grid-cols-[1.65fr_1fr]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-2xl font-extrabold text-navy">{copy.common.needsTitle}</h2>
            <div className="mt-6 space-y-6">{content.needs.map((need) => <div key={need.title} className="border-s-2 border-signal ps-5"><h3 className="text-lg font-bold text-navy">{need.title}</h3><p className="mt-2 text-sm leading-7 text-steel">{need.text}</p></div>)}</div>
          </section>
          <section>
            <h2 className="text-2xl font-extrabold text-navy">{copy.common.relatedTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-steel">{copy.common.relatedNote}</p>
            <ul className="mt-5 divide-y divide-line border-y border-line" data-related-solutions>{sector.relatedRoutes.map((href) => <li key={href}><Link href={href} className="flex items-center justify-between gap-4 py-4 text-sm font-bold text-navy hover:text-signal focus-visible:outline-signal"><span>{content.relatedLabels[href]}</span><span aria-hidden="true" className="to-inline-arrow">→</span></Link></li>)}</ul>
          </section>
          <SectorServiceFAQ title={copy.common.faqTitle} items={content.faq} />
          <Button href="/sektorler" variant="secondary">{copy.common.backToSectors}</Button>
        </div>
        <div className="min-w-0 space-y-8">
          <section className="border border-line p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy">{copy.common.informationTitle}</h2>
            <ul className="mt-5 list-disc space-y-3 ps-5 text-sm leading-7 text-steel">{content.information.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <ServiceContact locale={locale} sector={slug} title={copy.common.contactTitle} action={copy.common.supportCta} />
        </div>
      </Container>
    </section>
  </>;
}
