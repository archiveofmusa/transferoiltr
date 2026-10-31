import { Link } from '@/i18n/navigation';
import { sectorRoute, type SectorSlug } from '@/data/sectors';
import type { SectorContent } from '@/data/sectorContent';
import type { Locale } from '@/i18n/routing';
import { SectorImage } from '@/components/SectorImage';

export function SectorCard({ slug, locale, content, linkLabel, heading = 'h3', onNavigate }: {
  slug: SectorSlug;
  locale: Locale;
  content: SectorContent;
  linkLabel: string;
  index: number;
  heading?: 'h2' | 'h3';
  onNavigate?: () => void;
}) {
  const Heading = heading;
  return (
    <Link href={sectorRoute(slug)} onClick={onNavigate} data-sector-card={slug} aria-label={`${content.title} — ${linkLabel}`} className="group flex min-w-0 flex-col border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-signal hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none motion-reduce:transition-none">
      <SectorImage slug={slug} locale={locale} />
      <div className="flex flex-1 flex-col p-6">
      <Heading className="text-lg font-extrabold text-navy [overflow-wrap:anywhere] group-hover:text-signal">{content.title}</Heading>
      <p className="mt-3 text-sm leading-6 text-steel">{content.cardDescription}</p>
      <span className="mt-auto inline-flex pt-5 text-sm font-bold text-navy group-hover:text-signal">{linkLabel}<span aria-hidden="true" className="ms-1 to-inline-arrow">→</span></span>
      </div>
    </Link>
  );
}
