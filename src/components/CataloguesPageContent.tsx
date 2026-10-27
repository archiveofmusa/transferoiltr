import Image from 'next/image';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';
import { finalTransferOilAssets } from '@/data/finalTransferOilAssets';
import { specialContent, specialPageCopy } from '@/data/transferoil/special-content';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from './Button';
import { Container } from './Container';
import { SectionTitle } from './SectionTitle';

export function CataloguesPageContent({ messages, locale, certificatesOnly = false }: { messages: Messages; locale: Locale; certificatesOnly?: boolean }) {
  const breadcrumb = certificatesOnly ? messages.Certificates.breadcrumb : messages.Catalogues.page.breadcrumb;
  const eyebrow = certificatesOnly ? messages.Certificates.eyebrow : messages.Catalogues.page.eyebrow;
  const title = certificatesOnly ? messages.Certificates.title : messages.Catalogues.page.title;
  const description = certificatesOnly ? messages.Certificates.description : messages.Catalogues.page.description;
  const copy = specialPageCopy[locale].certificates;

  return (
    <>
      <section className="border-b border-line bg-mist py-12">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: breadcrumb }]} />
          <SectionTitle as="h1" eyebrow={eyebrow} title={title} description={description} />
        </Container>
      </section>

      {!certificatesOnly && (
        <section className="border-b border-line py-14">
          <Container className="grid gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
            <div className="relative min-h-64 overflow-hidden bg-graphite shadow-card">
              <Image src={finalTransferOilAssets.certificates} alt={messages.Certificates.title} fill sizes="360px" className="object-cover" />
            </div>
            <div className="border-s-4 border-signal bg-white p-7 shadow-card sm:p-9">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal">{eyebrow}</p>
              <h2 className="mt-3 text-3xl font-extrabold text-navy">{copy.downloadsTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-steel">{copy.downloadsText}</p>
              <a
                href={specialContent.sources.downloads}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex bg-signal px-5 py-3 text-sm font-bold text-white transition hover:bg-signalHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
              >
                {copy.downloadsButton}
              </a>
            </div>
          </Container>
        </section>
      )}

      <section className="py-18">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold text-navy">{copy.listTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-steel">{copy.listDescription}</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {specialContent.certificates.map((certificate, index) => (
              <article key={certificate.id} className="flex min-h-52 flex-col border border-line bg-white p-6 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-signal">
                <span dir="ltr" className="text-start text-xs font-black text-signal">{String(index + 1).padStart(2, '0')}</span>
                <h3 dir="auto" className="mt-4 text-lg font-extrabold leading-snug text-navy">{certificate.title}</h3>
                <p className="mt-3 text-xs leading-5 text-steel">{copy.verification}</p>
                <a
                  href={certificate.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-fit border-b-2 border-signal pt-5 pb-1 text-sm font-bold text-navy transition hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  {copy.document}
                </a>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <a href={specialContent.sources.certificates} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-navy underline decoration-signal decoration-2 underline-offset-4 transition hover:text-signal">
              {copy.sourceButton}
            </a>
          </div>
        </Container>
      </section>

      <section className="bg-graphiteDark py-16 text-white">
        <Container className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-signal">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold">{certificatesOnly ? messages.Certificates.request : messages.Catalogues.page.requestTitle}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{certificatesOnly ? messages.Certificates.description : messages.Catalogues.page.requestText}</p>
          </div>
          <Button href="/iletisim?request=certificate" variant="light">{certificatesOnly ? messages.Certificates.button : messages.Catalogues.page.requestButton}</Button>
        </Container>
      </section>
    </>
  );
}
