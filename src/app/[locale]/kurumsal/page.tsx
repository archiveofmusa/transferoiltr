import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { corporateLandingCards } from '@/data/transferoil/special-content';
import { getTransferOilRoute } from '@/data/transferoil/registry';
import { finalTransferOilAssets } from '@/data/finalTransferOilAssets';
import { Link } from '@/i18n/navigation';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(props.params);
  return createPageMetadata(locale, messages, 'corporate', '/kurumsal');
}

export default async function CorporatePage(props: Props) {
  const { locale, messages } = await resolveLocale(props.params);
  const copy = messages.Corporate;

  return (
    <>
      <section className="bg-graphiteDark py-14 text-white">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: copy.breadcrumb }]} className="text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_span:last-child]:text-white" />
          <div className="grid gap-10 lg:grid-cols-[1fr_430px] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-signal">{copy.eyebrow}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{copy.title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">{copy.description}</p>
            </div>
            <div className="relative min-h-60 overflow-hidden border border-white/15">
              <Image src={finalTransferOilAssets.corporate} alt={copy.title} fill sizes="430px" className="object-cover" />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-18">
        <Container>
          <SectionTitle eyebrow={copy.eyebrow} title={copy.breadcrumb} description={copy.description} />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {corporateLandingCards.map((card, index) => {
              const route = getTransferOilRoute(card.id);
              if (!route) return null;
              return (
                <Link
                  key={card.id}
                  href={route.routePath}
                  className="group flex min-h-56 flex-col border border-line bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <span dir="ltr" className="text-start text-xs font-black text-signal">{String(index + 1).padStart(2, '0')}</span>
                  <h2 className="mt-5 text-xl font-extrabold text-navy transition group-hover:text-signal">{card.title[locale]}</h2>
                  <p className="mt-3 text-sm leading-7 text-steel">{card.description[locale]}</p>
                  <span aria-hidden="true" dir="ltr" className="mt-auto pt-5 text-xl font-bold text-signal">{locale === 'ar' ? '←' : '→'}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-10">
            <Button href="/iletisim">{copy.cta}</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
