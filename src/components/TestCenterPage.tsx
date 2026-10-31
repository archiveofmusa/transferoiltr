import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { SectorServiceBreadcrumbs } from '@/components/SectorServiceBreadcrumbs';
import { SectorServiceFAQ } from '@/components/SectorServiceFAQ';
import { ServiceContact } from '@/components/ServiceContact';
import { sectorServiceCopy } from '@/data/sectorContent';
import { testCenter } from '@/data/testCenter';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

export function TestCenterPage({ locale, messages }: { locale: Locale; messages: Messages }) {
  const copy = sectorServiceCopy[locale];
  const content = copy.test;
  return <>
    <section className="border-b border-line bg-mist py-12">
      <Container>
        <SectorServiceBreadcrumbs locale={locale} messages={messages} items={[{ label: copy.common.testCenterLabel, path: testCenter.path }]} />
        <SectionTitle as="h1" eyebrow="UHPHORTUM" title={content.title} description={content.intro} />
      </Container>
    </section>
    <section className="py-18">
      <Container className="grid items-start gap-12 lg:grid-cols-[1.65fr_1fr]">
        <div className="min-w-0 space-y-12">
          <section><h2 className="text-2xl font-extrabold text-navy">{content.aboutTitle}</h2><p className="mt-4 text-base leading-7 text-steel">{content.aboutText}</p><p className="mt-5 border-s-4 border-signal ps-5 text-sm leading-7 text-navy">{content.capacityNote}</p></section>
          <section><h2 className="text-2xl font-extrabold text-navy">{content.evaluationTitle}</h2><p className="mt-4 text-base leading-7 text-steel">{content.evaluationText}</p><p className="mt-4 text-sm leading-7 text-steel">{content.technicalNote}</p></section>
          <SectorServiceFAQ title={copy.common.faqTitle} items={content.faq} />
        </div>
        <div className="min-w-0 space-y-8">
          <section className="border border-line p-6 sm:p-8"><h2 className="text-xl font-extrabold text-navy">{content.informationTitle}</h2><ul className="mt-5 list-disc space-y-3 ps-5 text-sm leading-7 text-steel">{content.information.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <ServiceContact locale={locale} service="pressure-test" title={content.contactTitle} action={content.contactCta} />
        </div>
      </Container>
    </section>
  </>;
}
