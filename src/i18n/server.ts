import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getMessages } from './messages';
import { isLocale, type Locale } from './routing';

export async function resolveLocale(params: Promise<{ locale: string }>) {
  const { locale: value } = await params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  setRequestLocale(locale);
  return { locale, messages: getMessages(locale) };
}
