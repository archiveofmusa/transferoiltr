import type { Messages } from '@/i18n/messages';
import { Badge } from './Badge';
import { Button } from './Button';

export type LocalizedCatalogue = { key: string; title: string; label: string; description: string; fileUrl: string };

export function CatalogueCard({ catalogue, messages }: { catalogue: LocalizedCatalogue; messages: Messages }) {
  return <article className="flex h-full flex-col rounded-sm border border-navy/10 bg-white p-6 shadow-card"><div className="flex items-start justify-between gap-4"><Badge>{catalogue.label}</Badge><span className="text-xs font-extrabold tracking-[0.14em] text-signal">PDF</span></div><h3 className="mt-6 text-xl font-extrabold text-navy">{catalogue.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-steel">{catalogue.description}</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{catalogue.fileUrl ? <Button href={catalogue.fileUrl} variant="secondary" className="px-3 py-2.5 text-xs">{messages.Common.downloadPdf}</Button> : <span aria-disabled="true" title={messages.Common.pdfSoon} className="inline-flex cursor-not-allowed items-center justify-center rounded-sm border border-navy/20 px-3 py-2.5 text-center text-xs font-bold text-steel/70">{messages.Common.pdfSoon}</span>}<Button href="/iletisim?request=catalogue" variant="secondary" className="px-3 py-2.5 text-xs">{messages.Common.technicalInformation}</Button></div></article>;
}
