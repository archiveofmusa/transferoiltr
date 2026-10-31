import manifest from '../../public/assets/sectors/asset-manifest.json';
import type { Locale } from '@/i18n/routing';
import type { SectorSlug } from '@/data/sectors';

export type SectorImageAsset = {
  slug: SectorSlug;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  imagePosition: string;
  localizedAlt: Record<Locale, string>;
  sourceUrl: string;
  photographer: string;
  provider: string;
  license: string;
  licenseUrl: string;
  attributionRequired: boolean;
  variants: { src: string; width: number; height: number }[];
};

/** The same licensed photographs serve cards, the industries dialog and detail intros. */
export const sectorImages = manifest.assets as Record<SectorSlug, SectorImageAsset>;

export const sectorImageCaption: Record<Locale, string> = {
  tr: 'Temsili sektör görseli',
  en: 'Representative industry image',
  ru: 'Иллюстративная фотография отрасли',
  ar: 'صورة توضيحية للقطاع',
};
