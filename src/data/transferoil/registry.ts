import pagesJson from '@/content/transferoil/pages.generated.json';
import routesJson from './routes.generated.json';
import sourceMapJson from './source-map.generated.json';

export const transferOilLocales = ['tr', 'en', 'ru', 'ar'] as const;
export const transferOilNamedRouteOwners = ['/', '/iletisim'] as const;

export type TransferOilLocale = (typeof transferOilLocales)[number];

export type TransferOilPageType =
  | 'Kategori / seri'
  | 'Aksesuar'
  | 'Bağlantı kategorisi'
  | 'Insert'
  | 'Ferrule'
  | 'Ana sayfa'
  | 'Ürün'
  | 'Kurumsal sayfa'
  | 'Adaptör kategorisi'
  | 'Adaptör'
  | 'UHP fitting'
  | 'Yasal sayfa'
  | 'İletişim sayfası'
  | 'Doküman sayfası'
  | 'Liste sayfası';

export type TransferOilLocalizedRoutes = Record<TransferOilLocale, string>;

export type TransferOilBreadcrumb = {
  id: number;
  label: string;
  routePath: string;
};

export type TransferOilSourceRow = {
  id: number;
  mainSection: string;
  category: string | null;
  subCategory: string | null;
  seriesOrGroup: string | null;
  pageOrProduct: string | null;
  pageType: TransferOilPageType;
  hierarchy: string;
  sourceUrl: string;
  sourcePath: string;
  controlStatus: string;
  note: string | null;
  canonicalResolutionRequired: boolean;
  routeHint: string;
  registryKey: string;
  title: string;
  routePath: string;
  pathSegments: string[];
  localizedRoutes: TransferOilLocalizedRoutes;
  parentId: number | null;
  ancestorIds: number[];
  childIds: number[];
  breadcrumbs: TransferOilBreadcrumb[];
  isProductOrPart: boolean;
  resolvedUrl: string | null;
  finalStatus: string;
  resolutionNote: string | null;
  resolutionAttempts: unknown[];
  snapshotPath: string | null;
};

export type TransferOilRoute = {
  id: number;
  registryKey: string;
  routePath: string;
  pathSegments: string[];
  localizedRoutes: TransferOilLocalizedRoutes;
  parentId: number | null;
  ancestorIds: number[];
  childIds: number[];
  breadcrumbs: TransferOilBreadcrumb[];
  mainSection: string;
  pageType: TransferOilPageType;
  sourceUrl: string;
};

export type TransferOilTranslation = {
  title: string;
  eyebrow: string | null;
  summary: string | null;
  description: string | null;
  benefits: string[];
  applications: string[];
  metadataTitle: string | null;
  metadataDescription: string | null;
  altText: string | null;
  extractionStatus: string;
};

export type TransferOilContentPage = {
  id: number;
  registryKey: string;
  sourceUrl: string;
  resolvedUrl: string | null;
  route: string;
  pageType: TransferOilPageType;
  mainSection: string;
  hierarchy: string;
  technicalData: Record<string, unknown>;
  tables: unknown[];
  assets: unknown[];
  documentLinks: unknown[];
  relatedPageIds: number[];
  translations: Record<TransferOilLocale, TransferOilTranslation>;
  lastExtractionTimestamp: string | null;
};

const sourceRows = sourceMapJson.rows as unknown as TransferOilSourceRow[];
const routeRows = routesJson.routes as unknown as TransferOilRoute[];
const contentPages = pagesJson.pages as unknown as TransferOilContentPage[];

const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
const routeById = new Map(routeRows.map((route) => [route.id, route]));
const routeByPath = new Map(routeRows.map((route) => [normalizeTransferOilPath(route.routePath), route]));
const pageById = new Map(contentPages.map((page) => [page.id, page]));

export const transferOilSourceRows = sourceRows;
export const transferOilRoutes = routeRows;
export const transferOilPages = contentPages;

export function normalizeTransferOilPath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || '/';
  const localeExpression = new RegExp(`^/(${transferOilLocales.join('|')})(?=/|$)`, 'i');
  const withoutLocale = pathOnly.replace(localeExpression, '');
  const normalized = `/${withoutLocale.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
}

export function isTransferOilLocale(value: string | undefined): value is TransferOilLocale {
  return Boolean(value && transferOilLocales.includes(value as TransferOilLocale));
}

export function getTransferOilSource(id: number): TransferOilSourceRow | undefined {
  return sourceById.get(id);
}

export function getTransferOilRoute(id: number): TransferOilRoute | undefined {
  return routeById.get(id);
}

export function getTransferOilRouteByPath(pathname: string): TransferOilRoute | undefined {
  return routeByPath.get(normalizeTransferOilPath(pathname));
}

export function getTransferOilRouteBySegments(segments: string[]): TransferOilRoute | undefined {
  return getTransferOilRouteByPath(`/${segments.join('/')}`);
}

export function getTransferOilPage(id: number): TransferOilContentPage | undefined {
  return pageById.get(id);
}

export function getTransferOilPageByPath(pathname: string): TransferOilContentPage | undefined {
  const route = getTransferOilRouteByPath(pathname);
  return route ? getTransferOilPage(route.id) : undefined;
}

export function getLocalizedTransferOilPath(id: number, locale: TransferOilLocale): string | undefined {
  return routeById.get(id)?.localizedRoutes[locale];
}

export function getTransferOilStaticParams(): Array<{
  locale: TransferOilLocale;
  slug: string[];
}> {
  return transferOilRoutes.flatMap((route) =>
    transferOilLocales.map((locale) => ({
      locale,
      slug: route.pathSegments,
    })),
  );
}

export function getTransferOilCatchAllStaticParams(): Array<{
  locale: TransferOilLocale;
  slug: string[];
}> {
  const namedOwnerPaths = new Set<string>(transferOilNamedRouteOwners);
  return transferOilRoutes
    .filter((route) => !namedOwnerPaths.has(route.routePath))
    .flatMap((route) =>
      transferOilLocales.map((locale) => ({
        locale,
        slug: route.pathSegments,
      })),
    );
}

export function getTransferOilRegistrySummary() {
  const localizedRouteCount = transferOilRoutes.reduce(
    (total, route) => total + Object.keys(route.localizedRoutes).length,
    0,
  );

  return {
    sourceRows: transferOilSourceRows.length,
    routeMappings: transferOilRoutes.length,
    contentPages: transferOilPages.length,
    localizedRouteCount,
    localeRouteCounts: Object.fromEntries(
      transferOilLocales.map((locale) => [
        locale,
        transferOilRoutes.filter((route) => Boolean(route.localizedRoutes[locale])).length,
      ]),
    ) as Record<TransferOilLocale, number>,
  };
}
