import { Button } from '@/components/Button';
import { siteContact } from '@/config/contact';
import { sectorServiceCopy } from '@/data/sectorContent';
import { serviceContactHref } from '@/data/serviceContact';
import type { Locale } from '@/i18n/routing';

export function ServiceContact({ locale, title, action, sector, service }: { locale: Locale; title: string; action: string; sector?: string; service?: string }) {
  const copy = sectorServiceCopy[locale].common;
  const href = serviceContactHref(locale, { sector, service });
  return (
    <aside data-service-contact data-contact-sector={sector} data-contact-service={service} className="min-w-0 border-t-4 border-signal bg-mist p-6 sm:p-8">
      <h2 className="text-2xl font-extrabold text-navy">{title}</h2>
      <div className="mt-6"><Button href={href}>{action}</Button></div>
      <a href={href} dir="ltr" className="mt-5 inline-block max-w-full break-all text-sm font-bold text-navy underline underline-offset-4 hover:text-signal">{siteContact.email}</a>
      <p className="mt-3 text-sm leading-6 text-steel">{copy.emailNote}</p>
    </aside>
  );
}
