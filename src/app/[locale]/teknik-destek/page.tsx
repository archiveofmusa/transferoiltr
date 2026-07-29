import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { TechnicalSupportForm } from '@/components/TechnicalSupportForm';
import { createWhatsAppLink } from '@/components/WhatsAppFloatingButton';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(props.params);
  return createPageMetadata(locale, messages, 'support', '/teknik-destek');
}

export default async function TechnicalSupportPage(props: Props) {
  const { messages } = await resolveLocale(props.params);
  const copy = messages.Support;

  return (
    <>
      <section className="bg-graphiteDark py-14 text-white">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: copy.breadcrumb }]} className="text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_span:last-child]:text-white" />
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-signal">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">{copy.description}</p>
        </Container>
      </section>
      <section className="py-18">
        <Container>
          <SectionTitle eyebrow={copy.topicsEyebrow} title={copy.topicsTitle} description={copy.topicsDescription} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.topics.map((topic, index) => (
              <article key={topic.title} className="border border-line p-5 transition hover:border-signal hover:shadow-card">
                <span className="text-xs font-black text-signal">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-lg font-extrabold text-navy">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-steel">{topic.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section className="bg-mist py-18">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionTitle eyebrow={copy.formEyebrow} title={copy.formTitle} description={copy.formDescription} />
            <div className="mt-7 border-s-4 border-signal bg-white p-6">
              <p className="text-sm font-extrabold text-navy">{copy.fastTitle}</p>
              <p className="mt-2 text-sm leading-6 text-steel">{copy.fastText}</p>
              <a href={createWhatsAppLink(messages.WhatsApp.message)} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-signal">
                {copy.whatsapp}<span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="bg-white p-6 shadow-card sm:p-8"><TechnicalSupportForm messages={messages} /></div>
        </Container>
      </section>
    </>
  );
}
