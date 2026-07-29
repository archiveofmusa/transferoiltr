import type { Metadata } from 'next';
import type { Messages } from './messages';
import { localeDetails, locales, type Locale } from './routing';
import { transferOilAssets } from '@/data/transferOilAssets';

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'http://localhost:3000';

export function absoluteSiteUrl(pathname = '/'): string {
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  return new URL(pathname.replace(/^\/+/, ''), base).toString();
}

export function languageAlternates(path = '') {
  return Object.fromEntries([
    ...locales.map((locale) => [locale, absoluteSiteUrl(`/${locale}${path}`)]),
    ['x-default', absoluteSiteUrl(`/tr${path}`)],
  ]);
}

export function createPageMetadata(locale: Locale, messages: Messages, key: keyof Messages['Meta'], path = ''): Metadata {
  const meta = messages.Meta[key];
  const canonical = absoluteSiteUrl(`/${locale}${path}`);
  const imageUrl = absoluteSiteUrl(transferOilAssets.heroHome);
  const imageAlt = `${meta.title} — Transfer Oil Türkiye`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      url: canonical,
      locale: localeDetails[locale].openGraph,
      alternateLocale: locales.filter((item) => item !== locale).map((item) => localeDetails[item].openGraph),
      siteName: 'Transfer Oil Türkiye',
      title: meta.title,
      description: meta.description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    robots: { index: true, follow: true },
  };
}
