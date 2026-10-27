import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/Badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { ProductCard } from '@/components/ProductCard';
import { Link } from '@/i18n/navigation';
import { findUhpProduct, uhpProducts } from '@/data/uhpProducts';
import { localizeProduct } from '@/i18n/localizeProducts';
import { absoluteSiteUrl, brandPageTitle, createPageMetadata } from '@/i18n/metadata';
import { getMessages } from '@/i18n/messages';
import { isLocale, locales, type Locale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() { return locales.flatMap((locale) => uhpProducts.map((product) => ({ locale, slug: product.slug }))); }

async function resolve(props: Props) {
  const { locale: value, slug } = await props.params;
  if (!isLocale(value)) notFound();
  const locale = value as Locale;
  setRequestLocale(locale);
  return { locale, slug, messages: getMessages(locale) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug, messages } = await resolve(props);
  const product = findUhpProduct(slug);
  if (!product) {
    const metadata = createPageMetadata(locale, messages, 'notFound', `/urunler/${slug}`);
    return { ...metadata, robots: { index: false, follow: false } };
  }
  const localized = localizeProduct(product, locale, messages);
  const metadata = createPageMetadata(locale, messages, 'products', `/urunler/${slug}`);
  const title = brandPageTitle(product.name);
  const description = localized.shortDescription;
  const imageUrl = absoluteSiteUrl(product.image);
  const imageAlt = messages.ProductDetail.imageAlt.replace('{name}', product.name);

  return {
    ...metadata,
    title,
    description,
    openGraph: {
      ...(metadata.openGraph ?? {}),
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}

export default async function ProductDetailPage(props: Props) {
  const { locale, slug, messages } = await resolve(props);
  const baseProduct = findUhpProduct(slug);
  if (!baseProduct) notFound();
  const product = localizeProduct(baseProduct, locale, messages);
  const related = (baseProduct.related?.map(findUhpProduct).filter(Boolean) ?? []).map((item) => localizeProduct(item!, locale, messages));
  const copy = messages.ProductDetail;

  return <><section className="border-b border-line bg-mist py-10"><Container><Breadcrumbs messages={messages} items={[{ label: messages.Products.page.breadcrumb, href: '/urunler' }, { label: product.familyLabel, href: `/urunler?family=${product.family}` }, { label: product.name }]} /><div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end"><div><Badge className="bg-white">{product.familyLabel.toUpperCase()}</Badge><h1 dir="auto" className="to-product-title mt-5 text-navy">{product.name}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-steel">{product.description}</p></div><div className="relative min-h-56 overflow-hidden bg-graphite shadow-card"><Image src={product.image} alt={copy.imageAlt.replace('{name}', product.name)} fill sizes="(max-width: 1024px) 100vw, 420px" className="object-cover" /><div className="absolute inset-x-0 bottom-0 border-t-2 border-signal bg-graphiteDark/90 p-4 text-white"><p className="text-[10px] font-extrabold tracking-[0.16em] text-signal">{copy.pressureInfo}</p><p dir="ltr" className="mt-1 text-start text-xl font-extrabold">{product.pressureText}</p>{product.pressurePsi && <p dir="ltr" className="text-start text-sm text-white/70">{product.pressurePsi}</p>}</div></div></div></Container></section><section className="py-14"><Container className="grid gap-10 lg:grid-cols-[1fr_340px]"><div><div className="border-b border-line pb-8"><h2 className="text-2xl font-extrabold text-navy">{copy.overview}</h2><p className="mt-4 max-w-3xl leading-7 text-steel">{product.description}</p><p className="mt-5 border-s-2 border-signal bg-mist p-4 text-sm leading-6 text-navy">{copy.technicalDisclaimer}</p></div><div className="grid gap-8 py-9 md:grid-cols-2"><div><h2 className="text-xl font-extrabold text-navy">{copy.benefits}</h2><ul className="mt-4 space-y-3">{product.benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm leading-6 text-steel"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-signal" />{benefit}</li>)}</ul></div><div><h2 className="text-xl font-extrabold text-navy">{copy.applications}</h2><div className="mt-4 flex flex-wrap gap-2">{product.applications.map((application, index) => <Link key={application} href={`/urunler?application=${product.applicationIds[index]}`} className="border border-line bg-mist px-3 py-2 text-xs font-bold text-navy transition hover:border-signal hover:text-signal">{application}</Link>)}</div></div></div><div className="grid gap-5 border-t border-line pt-9 md:grid-cols-2"><article className="border border-line p-6"><p className="text-xs font-extrabold tracking-[0.16em] text-signal">{copy.compatibilityEyebrow}</p><h2 className="mt-3 text-xl font-extrabold text-navy">{copy.compatibilityTitle}</h2><p className="mt-3 text-sm leading-6 text-steel">{copy.compatibilityText}</p><Link href="/teknik-destek" className="mt-5 inline-flex text-sm font-bold text-signal">{copy.compatibilityLink} <span className="ms-1 to-inline-arrow">→</span></Link></article><article className="border border-line p-6"><p className="text-xs font-extrabold tracking-[0.16em] text-signal">{copy.documentationEyebrow}</p><h2 className="mt-3 text-xl font-extrabold text-navy">{copy.documentationTitle}</h2><p className="mt-3 text-sm leading-6 text-steel">{copy.documentationText}</p><Link href="/sertifikalar" className="mt-5 inline-flex text-sm font-bold text-signal">{copy.documentationLink} <span className="ms-1 to-inline-arrow">→</span></Link></article></div></div><aside className="self-start border-t-4 border-signal bg-graphiteDark p-7 text-white lg:sticky lg:top-24"><p className="text-xs font-extrabold tracking-[0.16em] text-signal">{copy.supportEyebrow}</p><h2 className="mt-3 text-2xl font-extrabold">{copy.supportTitle}</h2><p className="mt-4 text-sm leading-6 text-white/70">{copy.supportText}</p><div className="mt-6 grid gap-3"><Button href={`/teknik-destek?urun=${encodeURIComponent(product.name)}`} variant="light">{messages.Common.requestTechnicalSupport}</Button><Button href={`/iletisim?request=quote&urun=${encodeURIComponent(product.name)}`}>{messages.Common.requestQuote}</Button></div></aside></Container></section>{related.length > 0 && <section className="bg-mist py-14"><Container><h2 className="text-2xl font-extrabold text-navy">{copy.related}</h2><div className="mt-7 grid gap-5 md:grid-cols-3">{related.map((item) => <ProductCard key={item.slug} product={item} messages={messages} />)}</div></Container></section>}</>;
}
