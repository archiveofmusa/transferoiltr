import type { Metadata } from 'next';
import { CataloguesPageContent } from '@/components/CataloguesPageContent';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata(props: Props): Promise<Metadata> { const { locale, messages } = await resolveLocale(props.params); return createPageMetadata(locale, messages, 'catalogues', '/kataloglar-sertifikalar'); }
export default async function CataloguesPage(props: Props) { const { locale, messages } = await resolveLocale(props.params); return <CataloguesPageContent messages={messages} locale={locale} />; }
