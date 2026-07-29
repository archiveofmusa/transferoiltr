import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { TransferOilManifestPage } from '@/components/transferoil/TransferOilManifestPage';
import { getManifestDescription, getManifestTitle, getManifestTranslation } from '@/components/transferoil/manifest-page-utils';
import {
  getTransferOilCatchAllStaticParams,
  getTransferOilPage,
  getTransferOilRouteBySegments,
  getTransferOilSource,
  isTransferOilLocale,
  transferOilLocales,
  type TransferOilLocale,
} from '@/data/transferoil/registry';
import { localeDetails } from '@/i18n/routing';
import { siteUrl } from '@/i18n/metadata';
import { transferOilAssets } from '@/data/transferOilAssets';

type Props = {
  params: Promise<{ locale: string; slug: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getTransferOilCatchAllStaticParams();
}

async function resolveManifestPage(params: Props['params']) {
  const { locale: requestedLocale, slug } = await params;
  if (!isTransferOilLocale(requestedLocale) || !Array.isArray(slug) || slug.length === 0) notFound();
  const locale = requestedLocale as TransferOilLocale;
  setRequestLocale(locale);

  const route = getTransferOilRouteBySegments(slug);
  if (!route) notFound();
  const page = getTransferOilPage(route.id);
  const source = getTransferOilSource(route.id);
  if (!page || !source) notFound();
  return { locale, route, page, source };
}

function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, route, page, source } = await resolveManifestPage(props.params);
  const translation = getManifestTranslation(page, locale);
  const title = getManifestTitle(page, locale);
  const description = translation.metadataDescription
    || getManifestDescription(page, locale)
    || source.hierarchy;
  const metadataTitle = translation.metadataTitle || `${title} | Transfer Oil Türkiye`;
  const canonicalPath = route.localizedRoutes[locale];
  const languages = Object.fromEntries([
    ...transferOilLocales.map((item) => [item, absoluteUrl(route.localizedRoutes[item])]),
    ['x-default', absoluteUrl(route.localizedRoutes.tr)],
  ]);

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages,
    },
    openGraph: {
      type: 'website',
      url: absoluteUrl(canonicalPath),
      siteName: 'Transfer Oil Türkiye',
      title: metadataTitle,
      description,
      locale: localeDetails[locale].openGraph,
      alternateLocale: transferOilLocales
        .filter((item) => item !== locale)
        .map((item) => localeDetails[item].openGraph),
      images: [{
        url: absoluteUrl(transferOilAssets.heroHome),
        width: 1200,
        height: 630,
        alt: translation.altText || title,
      }],
    },
    robots: { index: true, follow: true },
    other: { 'transfer-oil-source': page.resolvedUrl || page.sourceUrl },
  };
}

export default async function ManifestPage(props: Props) {
  const { locale, route, page, source } = await resolveManifestPage(props.params);
  return <TransferOilManifestPage page={page} source={source} route={route} locale={locale} />;
}
