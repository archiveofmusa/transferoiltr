import type { Locale } from './routing';
import { localizeProductName } from './productNameTranslations';

/** Prefer the reviewed source-name translation; retain existing localized copy
 * for names outside the catalogue glossary (for example corporate pages). */
export function resolveProductDisplayName(sourceName: string, translatedName: string, locale: Locale): string {
  const reviewed = localizeProductName(sourceName, locale);
  return reviewed !== sourceName || locale === 'en'
    ? reviewed
    : localizeProductName(translatedName, locale);
}
