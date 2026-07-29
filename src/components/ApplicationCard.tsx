import { Link } from '@/i18n/navigation';

export type LocalizedApplication = { slug: string; title: string; description: string };

export function ApplicationCard({ application, linkLabel, index = 0 }: { application: LocalizedApplication; linkLabel: string; index?: number }) {
  return <Link href={`/urunler?application=${encodeURIComponent(application.slug)}`} className="group block border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-signal hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"><span className="mb-5 flex h-10 w-10 items-center justify-center border border-signal/60 text-xs font-black text-signal">0{index + 1}</span><h3 className="text-lg font-extrabold text-navy group-hover:text-signal">{application.title}</h3><p className="mt-3 text-sm leading-6 text-steel">{application.description}</p><span className="mt-5 inline-flex text-sm font-bold text-navy group-hover:text-signal">{linkLabel} <span aria-hidden="true" className="ms-1 to-inline-arrow">→</span></span></Link>;
}
