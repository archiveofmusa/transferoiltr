import { Breadcrumbs } from '@/components/Breadcrumbs';
import { absoluteSiteUrl } from '@/i18n/metadata';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

type Item = { label: string; path: string };

export function SectorServiceBreadcrumbs({ locale, messages, items }: { locale: Locale; messages: Messages; items: Item[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ label: messages.Common.home, path: '' }, ...items].map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.label,
      item: absoluteSiteUrl(`/${locale}${item.path}`),
    })),
  };
  return <>
    <Breadcrumbs messages={messages} items={items.map((item, index) => ({ label: item.label, href: index === items.length - 1 ? undefined : item.path }))} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  </>;
}
