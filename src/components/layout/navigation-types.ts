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
