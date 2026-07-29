import type { ReactNode } from 'react';

type SectionTitleProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  tone?: 'default' | 'inverse';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
};

export function SectionTitle({ eyebrow, title, description, align = 'left', tone = 'default', className = '', as = 'h2' }: SectionTitleProps) {
  const centered = align === 'center';
  const inverse = tone === 'inverse';
  const Heading = as;
  return (
    <div className={`${centered ? 'mx-auto text-center' : ''} ${className}`}>
      <div className={`mb-4 h-1 w-10 ${inverse ? 'bg-signalLight' : 'bg-signal'} ${centered ? 'mx-auto' : ''}`} />
      {eyebrow && <p className={`mb-3 text-xs font-extrabold uppercase tracking-[0.18em] ${inverse ? 'text-signalLight' : 'text-signal'}`}>{eyebrow}</p>}
      <Heading className={`to-section-title ${inverse ? 'text-white' : 'text-navy'}`}>{title}</Heading>
      {description && <p className={`mt-4 max-w-2xl text-base leading-7 ${inverse ? 'text-white/75' : 'text-steel'} ${centered ? 'mx-auto' : ''}`}>{description}</p>}
    </div>
  );
}
