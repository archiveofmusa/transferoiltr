import {
  transferOilHdRuntimeAssetPathMap,
  transferOilHdSemanticAssets,
} from './transferoil/hd-assets.generated';

const hd = (currentPath: string): string => (
  transferOilHdRuntimeAssetPathMap as Record<string, string>
)[currentPath] ?? currentPath;

export const transferOilAssets = {
  logo: '/assets/transfer-oil/final/logo/transfer-oil-logo-white.svg',
  heroHome: transferOilHdSemanticAssets.heroHomePoster ?? hd('/assets/transfer-oil/final/hero/reference-hero.webp'),
  heroHydraulic: transferOilHdSemanticAssets.heroHydraulic ?? hd('/assets/transfer-oil/final/hero/reference-hero.webp'),
  heroIndustrial: transferOilHdSemanticAssets.heroIndustrial ?? hd('/assets/transfer-oil/menu/industrial-menu.webp'),
  heroUhp: transferOilHdSemanticAssets.heroUhp ?? hd('/assets/transfer-oil/final/uhp/helix-2-spiral.webp'),
  homeHeroVideo: transferOilHdSemanticAssets.homeVideo ?? hd('/assets/transfer-oil/videos/085-ana-sayfa-video-to-home.mp4'),
  menuHydraulic: transferOilHdSemanticAssets.menuHydraulic ?? hd('/assets/transfer-oil/menu/hydraulic-menu.webp'),
  menuIndustrial: transferOilHdSemanticAssets.menuIndustrial ?? hd('/assets/transfer-oil/menu/industrial-menu.webp'),
  menuUhp: transferOilHdSemanticAssets.menuUhp ?? hd('/assets/transfer-oil/final/uhp/helix-2-spiral.webp'),
  menuCorporate: transferOilHdSemanticAssets.menuCorporate ?? hd('/assets/transfer-oil/final/corporate/corporate-reference.webp'),
  menuFittings: hd('/assets/transfer-oil/final/uhp/bspp.webp'),
  contact: hd('/assets/transfer-oil/final/contact/contact-reference.webp'),
  placeholder: '/assets/transfer-oil/final/placeholders/transfer-oil-placeholder.svg',
} as const;
