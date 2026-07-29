import type { ReactNode } from 'react';

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-sm border border-navy/15 bg-mist px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-steel ${className}`}>{children}</span>;
}
