import type { Metadata } from 'next';
import { ApplicationCard } from '@/components/ApplicationCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CTASection } from '@/components/CTASection';
import { Container } from '@/components/Container';
import { SectionTitle } from '@/components/SectionTitle';
import { uhpApplications } from '@/data/uhpApplications';
import { createPageMetadata } from '@/i18n/metadata';
import { resolveLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata(props: Props): Promise<Metadata> { const { locale, messages } = await resolveLocale(props.params); return createPageMetadata(locale, messages, 'applications', '/uygulamalar'); }
export default async function ApplicationsPage(props: Props) { const { messages } = await resolveLocale(props.params); const page = messages.Applications.page; const applications = uhpApplications.map((item) => ({ slug: item.slug, ...messages.Applications.items[item.key] })); return <><section className="border-b border-line bg-mist py-12"><Container><Breadcrumbs messages={messages} items={[{ label: page.breadcrumb }]} /><SectionTitle as="h1" eyebrow={page.eyebrow} title={page.title} description={page.description} /></Container></section><section className="py-18"><Container><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{applications.map((application, index) => <ApplicationCard key={application.slug} application={application} linkLabel={page.link} index={index} />)}</div></Container></section><CTASection messages={messages} /></>; }
