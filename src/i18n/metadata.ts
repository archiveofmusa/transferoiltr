import type { Metadata } from 'next';
import type { Messages } from './messages';
import { localeDetails, locales, type Locale } from './routing';
import { brand, brandAssets, rebrandSiteText } from '@/data/brand';
import { siteUrl } from '@/config/site';

export { siteUrl } from '@/config/site';

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

export function brandPageTitle(title: string): string {
  // Source catalogue titles retain their product names; only the site identity changes.
  const pageTitle = rebrandSiteText(title).trim();
  return pageTitle.includes(brand.name) ? pageTitle : `${pageTitle} | ${brand.name}`;
}

export function createPageMetadata(locale: Locale, messages: Messages, key: keyof Messages['Meta'], path = ''): Metadata {
  const meta = messages.Meta[key];
  const title = brandPageTitle(meta.title);
  const canonical = absoluteSiteUrl(`/${locale}${path}`);
  const imageUrl = absoluteSiteUrl(brandAssets.openGraph);
  const imageAlt = title;

  return {
    title,
    description: meta.description,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      url: canonical,
      locale: localeDetails[locale].openGraph,
      alternateLocale: locales.filter((item) => item !== locale).map((item) => localeDetails[item].openGraph),
      siteName: brand.name,
      title,
      description: meta.description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: meta.description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    robots: { index: true, follow: true },
  };
}
