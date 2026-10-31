import { siteContact } from '@/config/contact';
import { sectorServiceCopy } from '@/data/sectorContent';
import { getSector } from '@/data/sectors';
import type { Locale } from '@/i18n/routing';

type RequestContext = { sector?: string; service?: string };

/** Only editorially approved context is included; arbitrary query text is never echoed. */
export function serviceContactHref(locale: Locale, context: RequestContext = {}): string {
  const copy = sectorServiceCopy[locale];
  const sector = context.sector ? getSector(context.sector) : undefined;
  const content = sector
    ? copy.sectors[sector.slug]
    : context.service === 'pressure-test' ? copy.test : undefined;
  const subject = content?.emailSubject ?? copy.common.supportCta;
  const body = content?.emailBody ?? `${copy.common.supportCta}\n\n${copy.index.title}`;
  return `mailto:${siteContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
