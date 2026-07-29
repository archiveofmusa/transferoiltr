import { Link } from '@/i18n/navigation';
import type { Messages } from '@/i18n/messages';

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, messages, className = '' }: { items: Crumb[]; messages: Messages; className?: string }) {
  return (
    <nav aria-label={messages.Common.breadcrumb} className={`mb-7 flex flex-wrap items-center gap-2 text-sm text-steel ${className}`}>
      <Link href="/" className="transition hover:text-signal">{messages.Common.home}</Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="text-signal">/</span>
          {item.href ? <Link href={item.href} className="transition hover:text-signal">{item.label}</Link> : <span className="font-medium text-navy">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
