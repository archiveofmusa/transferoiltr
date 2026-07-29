import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ContactForm } from '@/components/ContactForm';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

const contact = {
  company: 'Transfer Oil Türkiye',
  person: 'Umut Gündoğdu',
  phone: '0 544 636 91 22',
  phoneHref: 'tel:+905446369122',
  email: 'info.trk@transferoil.com',
  latitude: '40.848771688250984',
  longitude: '29.295564869254044',
};

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(props.params);
  return createPageMetadata(locale, messages, 'contact', '/iletisim');
}

export default async function ContactPage(props: Props) {
  const { messages } = await resolveLocale(props.params);
  const copy = messages.Contact;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=29.285564869254044%2C40.843771688250984%2C29.305564869254044%2C40.853771688250984&layer=mapnik&marker=${contact.latitude}%2C${contact.longitude}`;

  return (
    <>
      <section className="border-b border-navy/10 bg-[#3f464d] py-14 text-white">
        <Container>
          <Breadcrumbs messages={messages} items={[{ label: copy.breadcrumb }]} className="text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_span:last-child]:text-white" />
          <SectionTitle as="h1" tone="inverse" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        </Container>
      </section>

      <section className="py-18">
        <Container className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="border-t-4 border-signal bg-mist p-7 sm:p-9">
            <p className="text-xs font-extrabold tracking-[0.16em] text-signal">{copy.info}</p>
            <h2 className="mt-3 text-3xl font-extrabold text-navy">{contact.company}</h2>
            <div className="mt-8 space-y-6">
              <ContactItem label={copy.person}><p className="text-lg font-bold text-navy">{contact.person}</p></ContactItem>
              <ContactItem label={copy.phone}><a dir="ltr" className="inline-block text-lg font-bold text-navy transition hover:text-signal" href={contact.phoneHref}>{contact.phone}</a></ContactItem>
              <ContactItem label={copy.email}><a dir="ltr" className="inline-block break-words text-lg font-bold text-navy transition hover:text-signal" href={`mailto:${contact.email}`}>{contact.email}</a></ContactItem>
              <ContactItem label={copy.address}>
                <address className="not-italic leading-7 text-steel">{copy.addressLines.map((line) => <span key={line} className="block">{line}</span>)}</address>
              </ContactItem>
              <ContactItem label={copy.coordinates}><p dir="ltr" className="inline-block text-sm font-semibold text-navy">{contact.latitude}, {contact.longitude}</p></ContactItem>
            </div>
          </aside>

          <div className="border border-navy/10 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-2xl font-extrabold text-navy">{copy.formTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-steel">{copy.formText}</p>
            <div className="mt-7">
              <Suspense fallback={<div className="h-96 animate-pulse bg-mist" aria-label={copy.formLoading} />}>
                <ContactForm messages={messages} />
              </Suspense>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-navy/10 bg-mist py-14">
        <Container>
          <div className="min-h-[420px] overflow-hidden border border-navy/15 bg-white shadow-card">
            <iframe title={copy.mapTitle} src={mapSrc} className="h-[420px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </Container>
      </section>
    </>
  );
}

function ContactItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-steel">{label}</p>{children}</div>;
}
