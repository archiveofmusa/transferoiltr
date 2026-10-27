import finderJson from './product-finder.generated.json';
import { resolveProductDisplayName } from '@/i18n/productDisplayName';

export type ProductFinderItem = {
  /** Manifest id. */
  i: number;
  /** Localized titles ordered as TR, EN, RU, AR. */
  t: [string, string, string, string];
  /** Locale-neutral application route; next-intl adds the active locale. */
  r: string;
  /** Manifest main section. */
  s: string;
  /** Localized immediate parent/family titles ordered as TR, EN, RU, AR. */
  f: [string, string, string, string];
  /** Category, subcategory and series terms used by the local filter. */
  g: string[];
  /** Pressure terms extracted from the local official-page snapshot. */
  p: string[];
  /** Connection standards derived from source technical text. */
  c: string[];
  /** Product or part rather than a catalogue/editorial parent page. */
  x: boolean;
};

type ProductFinderPayload = {
  schemaVersion: number;
  generatedAt: string;
  sourceCount: number;
  items: ProductFinderItem[];
};

const locales = ['tr', 'en', 'ru', 'ar'] as const;
const localizeTitles = (titles: ProductFinderItem['t']): ProductFinderItem['t'] =>
  locales.map((locale, index) => resolveProductDisplayName(titles[1], titles[index], locale)) as ProductFinderItem['t'];

// Keep the source index and routes untouched; localize only display/search labels.
export const productFinderData: ProductFinderPayload = {
  ...finderJson,
  items: (finderJson as ProductFinderPayload).items.map((item) => ({
    ...item,
    t: localizeTitles(item.t),
    f: localizeTitles(item.f),
  })),
};
