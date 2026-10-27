import 'server-only';

import routesJson from './transferoil/routes.generated.json';
import pagesJson from '@/content/transferoil/pages.generated.json';
import { transferOilAssets } from './transferOilAssets';
import { brand } from './brand';
import type { Messages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';
import { resolveProductDisplayName } from '@/i18n/productDisplayName';
import type {
  MainNavigationKey,
  NavigationMenu,
  NavigationTreeNode,
  TransferOilNavigation,
} from '@/components/layout/navigation-types';

type RegistryRoute = {
  id: number;
  routePath: string;
  parentId: number | null;
  childIds: number[];
  mainSection: string;
  breadcrumbs: Array<{ label: string }>;
};

type RegistryPage = {
  id: number;
  translations: Record<Locale, { title: string }>;
};

const routes = routesJson.routes as RegistryRoute[];
const pages = pagesJson.pages as RegistryPage[];
const routeById = new Map(routes.map((route) => [route.id, route]));
const routeByPath = new Map(routes.map((route) => [route.routePath, route]));
const pageById = new Map(pages.map((page) => [page.id, page]));

function routeLabel(route: RegistryRoute, locale: Locale): string {
  const sourceLabel = route.breadcrumbs.at(-1)?.label ?? route.routePath;
  const translations = pageById.get(route.id)?.translations;
  return resolveProductDisplayName(translations?.en.title?.trim() || sourceLabel, translations?.[locale]?.title?.trim() || sourceLabel, locale);
}

function routeToNode(route: RegistryRoute, locale: Locale): NavigationTreeNode {
  return {
    id: route.id,
    label: routeLabel(route, locale),
    href: route.routePath,
    children: route.childIds
      .map((id) => routeById.get(id))
      .filter((child): child is RegistryRoute => Boolean(child))
      .map((child) => routeToNode(child, locale)),
  };
}

function descendants(route: RegistryRoute): number {
  return 1 + route.childIds.reduce((total, id) => {
    const child = routeById.get(id);
    return total + (child ? descendants(child) : 0);
  }, 0);
}

function registryMenu(
  key: MainNavigationKey,
  locale: Locale,
  details: Omit<NavigationMenu, 'key' | 'nodes' | 'routeCount'>,
  rootPath: string,
  additionalRoots: string[] = [],
): NavigationMenu {
  const root = routeByPath.get(rootPath);
  if (!root) throw new Error(`Transfer Oil navigation root is missing: ${rootPath}`);
  const extraRoutes = additionalRoots
    .map((path) => routeByPath.get(path))
    .filter((route): route is RegistryRoute => Boolean(route));

  return {
    key,
    ...details,
    nodes: [
      ...root.childIds
        .map((id) => routeById.get(id))
        .filter((route): route is RegistryRoute => Boolean(route))
        .map((route) => routeToNode(route, locale)),
      ...extraRoutes.map((route) => routeToNode(route, locale)),
    ],
    routeCount: descendants(root) + extraRoutes.reduce((total, route) => total + descendants(route), 0),
  };
}

function corporateMenu(locale: Locale, messages: Messages): NavigationMenu {
  const corporateRoutes = routes.filter((route) => route.mainSection === 'Şirket');
  return {
    key: 'kurumsal',
    label: messages.Header.main.corporate,
    eyebrow: brand.name,
    title: messages.Header.corporate.title,
    description: messages.Header.corporate.intro,
    href: '/kurumsal/about-us',
    image: transferOilAssets.menuCorporate,
    imageAlt: messages.Header.mega.menuImage.replace('{title}', messages.Header.corporate.title),
    routeCount: corporateRoutes.length,
    nodes: corporateRoutes.map((route) => routeToNode(route, locale)),
  };
}

export function buildTransferOilNavigation(locale: Locale, messages: Messages): TransferOilNavigation {
  const imageAlt = (title: string) => messages.Header.mega.menuImage.replace('{title}', title);

  return {
    kurumsal: corporateMenu(locale, messages),
    hidrolik: registryMenu(
      'hidrolik',
      locale,
      {
        label: messages.Header.main.hydraulic,
        eyebrow: messages.Header.mega.hydraulicEyebrow,
        title: messages.Header.mega.hydraulicTitle,
        description: messages.Header.mega.hydraulicDescription,
        href: '/hidrolik',
        image: transferOilAssets.menuHydraulic,
        imageAlt: imageAlt(messages.Header.mega.hydraulicTitle),
      },
      '/hidrolik',
      ['/baglanti-elemanlari'],
    ),
    endustriyel: registryMenu(
      'endustriyel',
      locale,
      {
        label: messages.Header.main.industrial,
        eyebrow: messages.Header.mega.industrialEyebrow,
        title: messages.Header.mega.industrialTitle,
        description: messages.Header.mega.industrialDescription,
        href: '/endustriyel',
        image: transferOilAssets.menuIndustrial,
        imageAlt: imageAlt(messages.Header.mega.industrialTitle),
      },
      '/endustriyel',
    ),
    uhp: registryMenu(
      'uhp',
      locale,
      {
        label: messages.Header.main.uhp,
        eyebrow: 'TO UHP',
        title: 'UHP',
        description: messages.Header.mega.uhpDescription,
        href: '/uhp',
        image: transferOilAssets.menuUhp,
        imageAlt: imageAlt('UHP'),
      },
      '/uhp',
    ),
  };
}
