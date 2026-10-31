import { Button } from '@/components/Button';
import { SectorCard } from '@/components/SectorCard';
import { sectors } from '@/data/sectors';
import { sectorServiceCopy } from '@/data/sectorContent';
import type { Locale } from '@/i18n/routing';

/** Render approved copy on the server; do not ship the entire editorial registry to the header. */
export function IndustriesPanelContent({ locale }: { locale: Locale }) {
  const copy = sectorServiceCopy[locale];
  return (
    <>
      <p id="industries-panel-description" className="max-w-3xl text-lg leading-relaxed text-steel sm:text-xl">{copy.index.title}</p>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {sectors.map((sector, index) => (
          <SectorCard key={sector.slug} slug={sector.slug} locale={locale} content={copy.sectors[sector.slug]} linkLabel={copy.common.explore} index={index} />
        ))}
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <Button href="/teknik-destek">{copy.common.supportCta}</Button>
      </div>
    </>
  );
}
