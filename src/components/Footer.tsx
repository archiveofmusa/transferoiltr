import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import { Container } from './Container';
import { brand, brandAssets } from '@/data/brand';
import { siteContact } from '@/config/contact';
import { sectorServiceCopy } from '@/data/sectorContent';
import { testCenter } from '@/data/testCenter';
import type { Locale } from '@/i18n/routing';

export function Footer({ messages, locale }: { messages: Messages; locale: Locale }) {
  const serviceLinks = sectorServiceCopy[locale].common;
  const columns = [
    { title: messages.Footer.corporate, links: [[messages.Footer.links.about, '/kurumsal/about-us'], [messages.Footer.links.support, '/teknik-destek'], [messages.Footer.links.contact, '/iletisim']] },
    { title: messages.Footer.products, links: [[messages.Footer.links.hydraulic, '/hidrolik'], [messages.Footer.links.industrial, '/endustriyel'], [messages.Footer.links.uhp, '/uhp'], [messages.Footer.links.fittings, '/baglanti-elemanlari']] },
    { title: messages.Footer.resources, links: [[serviceLinks.sectorsLabel, '/sektorler'], [serviceLinks.testCenterLabel, testCenter.path], [messages.Footer.links.applications, '/uygulamalar'], [messages.Footer.links.catalogues, '/kataloglar-sertifikalar'], [messages.Footer.links.certificates, '/sertifikalar']] },
    { title: messages.Footer.links.legal, links: [[messages.Footer.links.sustainability, '/surdurulebilirlik/sustainability'], [messages.Footer.links.cookiePolicy, '/yasal/cookie-policy'], [messages.Footer.links.legalNotice, '/yasal/copyright-legal'], [messages.Footer.links.privacy, '/yasal/privacy'], [messages.Footer.links.salesConditions, '/yasal/sales-conditions']] },
  ];
  const copyright = messages.Footer.copyright.replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="border-t-8 border-[var(--brand-accent)] bg-graphiteDark text-white">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
        <div className="min-w-0"><Link href="/" aria-label={messages.Header.logoHome} className="inline-flex max-w-full [unicode-bidi:isolate]" dir="ltr"><Image src={brandAssets.logoWhite} alt={brand.name} width={462} height={64} className="h-auto w-[270px] max-w-full object-contain sm:w-[308px]" /></Link><p className="mt-5 max-w-xs text-sm leading-6 text-white/65">{messages.Footer.intro}</p></div>
        {columns.map((column) => <div key={column.title}><h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">{column.title}</h2><ul className="mt-5 space-y-3">{column.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-white/65 transition hover:text-signalLight">{label}</Link></li>)}</ul></div>)}
        <div><h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">{messages.Footer.contact}</h2><div className="mt-5 space-y-3 text-sm leading-6 text-white/65"><a href={`mailto:${siteContact.email}`} dir="ltr" className="block break-all text-start hover:text-signalLight">{siteContact.email}</a><p>{messages.Footer.address.map((line) => <span key={line} className="block">{line}</span>)}</p></div></div>
      </Container>
      <div className="border-t border-white/10"><Container className="flex flex-col gap-3 py-5 text-xs leading-5 text-white/50 md:flex-row md:items-center md:justify-between"><p>{copyright}</p><p className="max-w-3xl">{messages.Footer.legal}</p></Container></div>
    </footer>
  );
}
