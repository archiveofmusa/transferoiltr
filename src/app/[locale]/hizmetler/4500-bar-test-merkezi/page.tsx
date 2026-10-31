import type { Metadata } from 'next';
import { TestCenterPage } from '@/components/TestCenterPage';
import { sectorServiceCopy } from '@/data/sectorContent';
import { testCenter } from '@/data/testCenter';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, messages } = await resolveLocale(params);
  return createPageMetadata(locale, messages, sectorServiceCopy[locale].test.meta, testCenter.path);
}
export default async function PressureTestPage({ params }: Props) {
  const { locale, messages } = await resolveLocale(params);
  return <TestCenterPage locale={locale} messages={messages} />;
}
