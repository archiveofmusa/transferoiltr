import finderJson from './product-finder.generated.json';

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

export const productFinderData = finderJson as ProductFinderPayload;
