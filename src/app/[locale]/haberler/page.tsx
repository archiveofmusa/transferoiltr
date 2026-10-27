import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Container } from '@/components/Container';
import { formatSpecialDate, specialContent, specialPageCopy } from '@/data/transferoil/special-content';
import { resolveTransferOilHdAssetPath } from '@/data/transferoil/hd-assets.generated';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(props.params);
  return createPageMetadata(locale, messages, 'news', '/haberler');
}

export default async function NewsPage(props: Props) {
  const { locale, messages } = await resolveLocale(props.params);
  const copy = messages.News;
  const specialCopy = specialPageCopy[locale];

  return (
    <>
      <section className="relative isolate min-h-[360px] overflow-hidden bg-graphiteDark sm:min-h-[430px]">
        <Image
          src={resolveTransferOilHdAssetPath('/assets/transfer-oil/news/334-news-intro.webp')}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-graphiteDark/85 via-graphiteDark/48 to-graphiteDark/15" />
        <Container className="relative flex min-h-[360px] items-end py-12 sm:min-h-[430px] sm:py-16">
          <div className="max-w-3xl border-s-4 border-signal ps-6 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-signalLight">{copy.eyebrow}</p>
            <h1 dir="auto" className="mt-3 text-4xl font-bold leading-tight tracking-[-0.025em] sm:text-6xl">{copy.title}</h1>
            <p dir="auto" className="mt-4 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{copy.description}</p>
          </div>
        </Container>
      </section>

      <div className="border-b border-line bg-white">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: copy.breadcrumb }]} className="mb-0 py-4" />
        </Container>
      </div>

      <section className="bg-mist/55 py-16 sm:py-18">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {specialContent.news.map((item) => {
              const translation = specialCopy.news[item.id];
              const date = formatSpecialDate(locale, item.publishedDate);
              return (
                <article key={item.id} className="flex min-h-full flex-col overflow-hidden border border-line bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:border-signal/70">
                  {item.localImage ? (
                    <div className="relative h-52 overflow-hidden bg-graphite">
                      <Image src={resolveTransferOilHdAssetPath(item.localImage)} alt={translation?.title || item.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex min-h-24 items-center border-b border-line bg-mist px-6 py-5 text-xs font-semibold leading-5 text-steel">
                      {specialCopy.noImage}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-extrabold uppercase tracking-[0.13em] text-signal">
                      <span>{copy.eyebrow}</span>
                      {date && <time dateTime={item.publishedDate || undefined}>{date}</time>}
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold leading-snug text-navy">{translation?.title || item.title}</h2>
                    {(translation?.summary || item.summary) && <p className="mt-3 text-sm leading-6 text-steel">{translation?.summary || item.summary}</p>}
                    <a
                      href={item.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex w-fit border-b-2 border-signal pt-6 pb-1 text-sm font-bold text-navy transition hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                    >
                      {specialCopy.officialDetail}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-10 flex justify-end">
            <a href={specialContent.sources.news} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-navy underline decoration-signal decoration-2 underline-offset-4 transition hover:text-signal">
              {specialCopy.officialSource}
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
