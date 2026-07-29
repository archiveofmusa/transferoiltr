import Image from 'next/image';
import Link from 'next/link';

type ProductMenuVisualBlockProps = {
  title: string;
  text: string;
  image: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  onNavigate?: () => void;
};

export function ProductMenuVisualBlock({ title, text, image, href, active = false, disabled = false, onNavigate }: ProductMenuVisualBlockProps) {
  const content = (
    <>
      <span className="relative block aspect-[16/9] overflow-hidden bg-[rgb(255_255_255_/_8%)]">
        <Image src={image} alt={`${title} menü görseli`} fill sizes="(min-width: 1280px) 280px, 100vw" className="object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-[rgb(33_37_41_/_58%)] via-transparent to-transparent" aria-hidden="true" />
      </span>
      <span className="block p-4">
        <span className="block text-[13px] font-black uppercase tracking-[0.08em] text-[var(--to-white)]">{title}</span>
        <span className="mt-2 block text-[12px] leading-5 text-[rgb(255_255_255_/_75%)]">{text}</span>
        {disabled && <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(255_255_255_/_42%)]">Bilgilendirme bloğu</span>}
        {active && <span className="mt-3 block h-[3px] w-16 bg-[var(--to-red)]" aria-hidden="true" />}
      </span>
    </>
  );

  const className = `to-product-menu-block ${active ? 'to-product-menu-block-active' : ''} ${disabled ? 'to-product-menu-block-disabled' : ''}`;

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onNavigate} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} aria-disabled={disabled || undefined}>
      {content}
    </div>
  );
}
