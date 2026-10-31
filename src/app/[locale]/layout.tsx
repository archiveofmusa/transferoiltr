import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { Footer } from '@/components/Footer';
import { TransferOilHeader } from '@/components/layout/TransferOilHeader';
import { getMessages } from '@/i18n/messages';
import { isLocale, localeDetails, locales, type Locale } from '@/i18n/routing';
import { brandPageTitle, siteUrl } from '@/i18n/metadata';
import { buildTransferOilNavigation } from '@/data/navigation';
import { brand, brandAssets } from '@/data/brand';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : 'tr';
  const messages = getMessages(locale);

  return {
    metadataBase: new URL(siteUrl),
    applicationName: brand.name,
    title: brandPageTitle(messages.Meta.notFound.title),
    description: messages.Meta.notFound.description,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: brandAssets.mark, type: 'image/svg+xml' }],
      shortcut: brandAssets.mark,
      apple: [{ url: brandAssets.appleTouchIcon, sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: { title: brand.name },
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);
  const messages = getMessages(locale);
  const navigation = buildTransferOilNavigation(locale, messages);

  return (
    <html lang={locale} dir={localeDetails[locale].dir} suppressHydrationWarning>
      <body data-locale={locale}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TransferOilHeader messages={messages} navigation={navigation} />
          <main>{children}</main>
          <Footer messages={messages} locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
