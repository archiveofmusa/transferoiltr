import type { MetadataRoute } from 'next';
import { transferOilLocales, transferOilRoutes } from '@/data/transferoil/registry';
import { uhpProducts } from '@/data/uhpProducts';
import { siteUrl } from '@/i18n/metadata';
import { sectors, sectorRoute } from '@/data/sectors';
import { testCenter } from '@/data/testCenter';

const cleanSiteUrl = siteUrl.replace(/\/$/, '');

function absoluteUrl(pathname: string): string {
  return `${cleanSiteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

const namedRoutes = [
  '/',
  '/fuarlar',
  '/haberler',
  '/iletisim',
  '/kataloglar-sertifikalar',
  '/kurumsal',
  '/sertifikalar',
  '/teknik-destek',
  '/urunler',
  '/uygulamalar',
] as const;

function localizedPath(locale: string, path: string): string {
  return `/${locale}${path === '/' ? '' : path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const serviceRoutes = ['/sektorler', ...sectors.map(({ slug }) => sectorRoute(slug)), testCenter.path];
  // Only pages edited in this content release get a known editorial date.
  // Do not claim that every catalogue page changed whenever the sitemap is built.
  const updatedRoutes = new Set(['/', ...serviceRoutes]);
  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  for (const route of transferOilRoutes) {
    const languages = {
      ...Object.fromEntries(
        transferOilLocales.map((locale) => [locale, absoluteUrl(route.localizedRoutes[locale])]),
      ),
      'x-default': absoluteUrl(route.localizedRoutes.tr),
    };

    for (const locale of transferOilLocales) {
      const url = absoluteUrl(route.localizedRoutes[locale]);
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      entries.push({
        url,
        ...(updatedRoutes.has(route.routePath) ? { lastModified: testCenter.contentUpdatedAt } : {}),
        changeFrequency: route.routePath === '/' ? 'weekly' : 'monthly',
        priority: route.routePath === '/' ? 1 : route.parentId === null ? 0.9 : 0.7,
        alternates: { languages },
      });
    }
  }

  const additionalRoutes = [
    ...namedRoutes,
    ...serviceRoutes,
    ...uhpProducts.map((product) => `/urunler/${product.slug}` as const),
  ];

  for (const path of additionalRoutes) {
    const languages = {
      ...Object.fromEntries(
        transferOilLocales.map((locale) => [locale, absoluteUrl(localizedPath(locale, path))]),
      ),
      'x-default': absoluteUrl(localizedPath('tr', path)),
    };

    for (const locale of transferOilLocales) {
      const url = absoluteUrl(localizedPath(locale, path));
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      entries.push({
        url,
        ...(updatedRoutes.has(path) ? { lastModified: testCenter.contentUpdatedAt } : {}),
        changeFrequency: path === '/' || path === '/haberler' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : path.startsWith('/urunler/') ? 0.75 : 0.8,
        alternates: { languages },
      });
    }
  }

  return entries;
}
