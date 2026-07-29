import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { formatExhibitionStand, formatSpecialDateRange, specialContent, specialPageCopy } from '@/data/transferoil/special-content';
import { resolveTransferOilHdAssetPath } from '@/data/transferoil/hd-assets.generated';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(props.params);
  return createPageMetadata(locale, messages, 'exhibitions', '/fuarlar');
}

export default async function ExhibitionsPage(props: Props) {
  const { locale, messages } = await resolveLocale(props.params);
  const copy = messages.Exhibitions;
  const specialCopy = specialPageCopy[locale];

  return (
    <>
      <section className="border-b border-line bg-mist py-12">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: copy.breadcrumb }]} />
          <SectionTitle as="h1" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        </Container>
      </section>

      <section className="py-18">
        <Container>
          <div className="space-y-7">
            {specialContent.exhibitions.map((item) => {
              const date = formatSpecialDateRange(locale, item.startDate, item.endDate);
              const stand = formatExhibitionStand(locale, item.stand);
              return (
                <article key={item.id} className="grid overflow-hidden border border-line bg-white shadow-card lg:grid-cols-[380px_1fr]">
                  {item.localImage ? (
                    <div className="relative min-h-72 overflow-hidden bg-mist">
                      <Image src={resolveTransferOilHdAssetPath(item.localImage)} alt={item.title} fill sizes="(min-width: 1024px) 380px, 100vw" className="object-contain p-7" />
                    </div>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center bg-mist p-8 text-center text-xs font-semibold leading-5 text-steel">
                      {specialCopy.noImage}
                    </div>
                  )}
                  <div className="flex flex-col border-t-4 border-signal p-7 sm:p-9 lg:border-s-0 lg:border-t-0 lg:border-e-4 lg:border-e-signal">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal">{specialCopy.exhibition.current}</p>
                    <h2 className="mt-3 text-3xl font-extrabold text-navy">{item.title}</h2>
                    <dl className="mt-7 grid gap-5 sm:grid-cols-2">
                      {date && <Fact label={specialCopy.exhibition.date} value={date} />}
                      {item.location && <Fact label={specialCopy.exhibition.location} value={item.location} />}
                      {stand && <Fact label={specialCopy.exhibition.stand} value={stand} />}
                    </dl>
                    <a
                      href={item.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-8 inline-flex w-fit bg-signal px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c86416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
                    >
                      {specialCopy.officialDetail}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-s-4 border-signal bg-mist p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold leading-6 text-navy">{copy.notice}</p>
            <a href={specialContent.sources.exhibitions} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-navy underline decoration-signal decoration-2 underline-offset-4 transition hover:text-signal">
              {specialCopy.officialSource}
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">{label}</dt>
      <dd dir="auto" className="mt-2 text-sm font-bold leading-6 text-navy">{value}</dd>
    </div>
  );
}
