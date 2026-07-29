import { defineRouting } from 'next-intl/routing';

export const locales = ['tr', 'en', 'ru', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'tr',
  localePrefix: 'always',
  localeDetection: false,
});

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export const localeDetails: Record<Locale, { code: string; flag: string; label: string; dir: 'ltr' | 'rtl'; openGraph: string }> = {
  tr: { code: 'TR', flag: '/assets/flags/tr.svg', label: 'Türkçe — TR', dir: 'ltr', openGraph: 'tr_TR' },
  en: { code: 'EN', flag: '/assets/flags/us.svg', label: 'English — United States', dir: 'ltr', openGraph: 'en_US' },
  ru: { code: 'RU', flag: '/assets/flags/ru.svg', label: 'Русский — RU', dir: 'ltr', openGraph: 'ru_RU' },
  ar: { code: 'AR', flag: '/assets/flags/sa.svg', label: 'العربية — AR', dir: 'rtl', openGraph: 'ar_SA' },
};
