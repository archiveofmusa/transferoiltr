import Image from 'next/image';
import { sectorImageCaption, sectorImages } from '@/data/sectorImages';
import type { SectorSlug } from '@/data/sectors';
import type { Locale } from '@/i18n/routing';

export function SectorImage({ slug, locale, sizes = '(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw', eager = false }: {
  slug: SectorSlug;
  locale: Locale;
  sizes?: string;
  eager?: boolean;
}) {
  const asset = sectorImages[slug];
  return <figure className="m-0 min-w-0">
    <picture className="block aspect-[3/2] overflow-hidden bg-mist">
      <source type="image/webp" srcSet={asset.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')} sizes={sizes} />
      <Image
        src={asset.imageSrc}
        width={asset.imageWidth}
        height={asset.imageHeight}
        alt={asset.localizedAlt[locale]}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        unoptimized
        className="h-full w-full object-cover"
        style={{ objectPosition: asset.imagePosition }}
      />
    </picture>
    <figcaption className="border-b border-line bg-mist px-4 py-2 text-[11px] leading-4 text-steel">
      {sectorImageCaption[locale]}
      {asset.attributionRequired && <span dir="auto"> · {asset.photographer} / {asset.provider} · {asset.license}</span>}
    </figcaption>
  </figure>;
}
