import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';
import type { LocalizedUhpProduct } from '@/i18n/localizeProducts';
import { Badge } from './Badge';
import { Button } from './Button';

export function ProductCard({ product, messages }: { product: LocalizedUhpProduct; messages: Messages }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-signal/60 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-graphite"><Image src={product.image} alt={messages.ProductDetail.imageAlt.replace('{name}', product.name)} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-1 bg-signal" /></div>
      <div className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><Badge className="bg-mist">{product.familyLabel.toUpperCase()}</Badge><span dir="ltr" className="text-end text-[10px] font-extrabold uppercase tracking-[0.1em] text-signal">{product.pressureText}</span></div><h3 className="mt-5 text-xl font-extrabold text-navy">{product.name}</h3><p className="mt-3 flex-1 text-sm leading-6 text-steel">{product.shortDescription}</p><div className="mt-5 flex flex-wrap gap-2">{product.applications.slice(0, 2).map((application) => <span key={application} className="rounded-sm bg-mist px-2 py-1 text-[10px] font-bold text-steel">{application}</span>)}</div><div className="mt-6 grid grid-cols-2 gap-2"><Link href={`/urunler/${product.slug}`} className="inline-flex items-center justify-center border border-navy/25 px-3 py-2.5 text-xs font-bold text-navy transition hover:border-signal hover:text-signal">{messages.Common.details}</Link><Button href={`/iletisim?request=quote&urun=${encodeURIComponent(product.name)}`} className="px-3 py-2.5 text-xs">{messages.Common.requestQuoteLong}</Button></div></div>
    </article>
  );
}
