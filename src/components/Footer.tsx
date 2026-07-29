import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import { Container } from './Container';
import { transferOilAssets } from '@/data/transferOilAssets';

export function Footer({ messages }: { messages: Messages }) {
  const columns = [
    { title: messages.Footer.corporate, links: [[messages.Footer.links.about, '/kurumsal/about-us'], [messages.Footer.links.support, '/teknik-destek'], [messages.Footer.links.contact, '/iletisim']] },
    { title: messages.Footer.products, links: [[messages.Footer.links.hydraulic, '/hidrolik'], [messages.Footer.links.industrial, '/endustriyel'], [messages.Footer.links.uhp, '/uhp'], [messages.Footer.links.fittings, '/baglanti-elemanlari']] },
    { title: messages.Footer.resources, links: [[messages.Footer.links.applications, '/uygulamalar'], [messages.Footer.links.catalogues, '/kataloglar-sertifikalar'], [messages.Footer.links.certificates, '/sertifikalar']] },
    { title: messages.Footer.links.legal, links: [[messages.Footer.links.sustainability, '/surdurulebilirlik/sustainability'], [messages.Footer.links.cookiePolicy, '/yasal/cookie-policy'], [messages.Footer.links.legalNotice, '/yasal/copyright-legal'], [messages.Footer.links.privacy, '/yasal/privacy'], [messages.Footer.links.salesConditions, '/yasal/sales-conditions']] },
  ];
  const copyright = messages.Footer.copyright.replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="border-t-8 border-[var(--to-red)] bg-graphiteDark text-white">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
        <div><div className="flex items-center gap-3"><Image src={transferOilAssets.logo} alt="Transfer Oil" width={217} height={34} className="h-auto w-[210px] object-contain sm:w-[240px]" /><span className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[var(--to-red)]">Türkiye</span></div><p className="mt-5 max-w-xs text-sm leading-6 text-white/65">{messages.Footer.intro}</p></div>
        {columns.map((column) => <div key={column.title}><h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">{column.title}</h2><ul className="mt-5 space-y-3">{column.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-white/65 transition hover:text-[var(--to-red)]">{label}</Link></li>)}</ul></div>)}
        <div><h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-white">{messages.Footer.contact}</h2><div className="mt-5 space-y-3 text-sm leading-6 text-white/65"><a href="tel:+905446369122" dir="ltr" className="block text-start hover:text-[var(--to-red)]">0 544 636 91 22</a><a href="mailto:info.trk@transferoil.com" dir="ltr" className="block break-all text-start hover:text-[var(--to-red)]">info.trk@transferoil.com</a><p>{messages.Footer.address.map((line) => <span key={line} className="block">{line}</span>)}</p></div></div>
      </Container>
      <div className="border-t border-white/10"><Container className="flex flex-col gap-3 py-5 text-xs leading-5 text-white/50 md:flex-row md:items-center md:justify-between"><p>{copyright}</p><p className="max-w-3xl">{messages.Footer.legal}</p></Container></div>
    </footer>
  );
}
