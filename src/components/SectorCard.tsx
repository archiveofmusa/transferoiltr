import { Link } from '@/i18n/navigation';
import { sectorRoute, type SectorSlug } from '@/data/sectors';
import type { SectorContent } from '@/data/sectorContent';

export function SectorCard({ slug, content, linkLabel, index, heading = 'h3' }: {
  slug: SectorSlug;
  content: SectorContent;
  linkLabel: string;
  index: number;
  heading?: 'h2' | 'h3';
}) {
  const Heading = heading;
  return (
    <Link href={sectorRoute(slug)} data-sector-card={slug} aria-label={`${content.title} — ${linkLabel}`} className="group block min-w-0 border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-signal hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
      <span aria-hidden="true" className="mb-5 flex h-10 w-10 items-center justify-center border border-signal/60 text-xs font-black text-signal">0{index + 1}</span>
      <Heading className="text-lg font-extrabold text-navy group-hover:text-signal">{content.title}</Heading>
      <p className="mt-3 text-sm leading-6 text-steel">{content.cardDescription}</p>
      <span className="mt-5 inline-flex text-sm font-bold text-navy group-hover:text-signal">{linkLabel}<span aria-hidden="true" className="ms-1 to-inline-arrow">→</span></span>
    </Link>
  );
}
