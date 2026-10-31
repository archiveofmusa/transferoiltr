import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { sectorServiceCopy } from '@/data/sectorContent';
import { testCenter } from '@/data/testCenter';
import type { Locale } from '@/i18n/routing';

export function TestCenterTeaser({ locale }: { locale: Locale }) {
  const copy = sectorServiceCopy[locale].test;
  return (
    <section data-test-center-teaser className="border-y border-line py-18">
      <Container className="grid items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
        <SectionTitle eyebrow="UHPHORTUM" title={copy.title} description={copy.intro} />
        <div className="min-w-0 border-s-4 border-signal ps-6">
          <p className="mb-6 text-base leading-7 text-steel">{copy.teaserDescription}</p>
          <Button href={testCenter.path}>{copy.teaserCta}</Button>
        </div>
      </Container>
    </section>
  );
}
