import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { ApplicationCard } from '@/components/ApplicationCard';
import { CatalogueCard } from '@/components/CatalogueCard';
import { CTASection } from '@/components/CTASection';
import { Container } from '@/components/Container';
import { Hero } from '@/components/Hero';
import { SectionTitle } from '@/components/SectionTitle';
import { uhpApplications } from '@/data/uhpApplications';
import { uhpDocuments } from '@/data/uhpCatalogues';
import { transferOilAssets } from '@/data/transferOilAssets';
import { Link } from '@/i18n/navigation';
import { createPageMetadata } from '@/i18n/metadata';
import { getMessages } from '@/i18n/messages';
import { isLocale, type Locale } from '@/i18n/routing';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

async function resolve(props: Props) {
  const { locale: value } = await props.params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  setRequestLocale(locale);
  return { locale, messages: getMessages(locale) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, messages } = await resolve(props);
  return createPageMetadata(locale, messages, 'home');
}

export default async function HomePage(props: Props) {
  const { locale, messages } = await resolve(props);
  const applications = uhpApplications.map((item) => ({ slug: item.slug, ...messages.Applications.items[item.key] }));
  const documents = uhpDocuments.map((item) => ({ key: item.key, fileUrl: item.fileUrl, ...messages.Catalogues.items[item.key] }));
  const portfolio = [
    { key: 'hydraulic' as const, href: '/hidrolik', image: transferOilAssets.menuHydraulic },
    { key: 'industrial' as const, href: '/endustriyel', image: transferOilAssets.menuIndustrial },
    { key: 'uhp' as const, href: '/uhp', image: transferOilAssets.menuUhp },
    { key: 'fittings' as const, href: '/baglanti-elemanlari', image: transferOilAssets.menuFittings },
  ];

  return <><Hero messages={messages} /><section className="py-18"><Container><SectionTitle eyebrow={messages.Home.families.eyebrow} title={messages.Home.families.title} description={messages.Home.families.description} /><div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{portfolio.map((item) => { const copy = messages.Home.families.items[item.key]; return <Link key={item.key} href={item.href} className="group overflow-hidden border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--to-red)]"><span className="relative block h-44 overflow-hidden bg-[#f1f2f3]"><Image src={item.image} alt={copy.title} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.04]" /></span><span className="block border-t-[3px] border-[var(--to-red)] p-6"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--to-red)]">{copy.label}</span><span className="mt-3 block text-xl font-extrabold text-ink">{copy.title}</span><span className="mt-3 block text-sm leading-6 text-steel">{copy.description}</span><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--to-button-bg)]">{copy.link}<span aria-hidden="true" className="text-[var(--to-red)]">›</span></span></span></Link>; })}</div></Container></section><section className="bg-mist py-18"><Container><SectionTitle eyebrow={messages.Home.applications.eyebrow} title={messages.Home.applications.title} description={messages.Home.applications.description} /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{applications.map((application, index) => <ApplicationCard key={application.slug} application={application} linkLabel={messages.Applications.page.link} index={index} />)}</div></Container></section><section className="bg-graphiteDark py-18 text-white"><Container><SectionTitle tone="inverse" eyebrow={messages.Home.why.eyebrow} title={messages.Home.why.title} description={messages.Home.why.description} /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{messages.Home.why.items.map((item, index) => <article key={item.title} className="border-t-2 border-[var(--to-red)] bg-white/5 p-6"><span className="text-sm font-black text-[var(--to-red)]">0{index + 1}</span><h3 className="mt-5 text-xl font-extrabold text-white">{item.title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{item.text}</p></article>)}</div></Container></section><CTASection messages={messages} /><section className="py-18"><Container><SectionTitle eyebrow={messages.Home.resources.eyebrow} title={messages.Home.resources.title} description={messages.Home.resources.description} /><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{documents.map((document) => <CatalogueCard key={document.key} catalogue={document} messages={messages} />)}</div></Container></section></>;
}
