export type MainNavigationKey = 'kurumsal' | 'hidrolik' | 'endustriyel' | 'uhp';

export type NavigationTreeNode = {
  id: number;
  label: string;
  href: string;
  children: NavigationTreeNode[];
};

export type NavigationMenu = {
  key: MainNavigationKey;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
  routeCount: number;
  nodes: NavigationTreeNode[];
};

export type TransferOilNavigation = Record<MainNavigationKey, NavigationMenu>;

/** A page link must never be treated as an empty mega-menu trigger. */
export type MainNavigationItem =
  | { kind: 'mega'; key: MainNavigationKey; menu: NavigationMenu }
  | { kind: 'link'; key: 'test-center'; label: string; href: string };

export const mainNavigationOrder: readonly MainNavigationKey[] = ['uhp', 'hidrolik', 'endustriyel', 'kurumsal'];
