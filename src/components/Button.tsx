import { Link } from '@/i18n/navigation';
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';

type CommonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light';
  className?: string;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkProps = CommonProps & { href: string; target?: string; rel?: string; onClick?: MouseEventHandler<HTMLAnchorElement> };

const styles = {
  primary: 'bg-signal text-white hover:bg-[#913b00] focus-visible:ring-signal',
  secondary: 'border border-navy/70 bg-white text-navy hover:border-signal hover:text-signal focus-visible:ring-navy',
  light: 'border border-white/50 bg-white/10 text-white hover:border-signalLight hover:bg-white hover:text-navy focus-visible:ring-white',
};

const base = 'inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export function Button(props: ButtonProps | LinkProps) {
  const { children, variant = 'primary', className = '' } = props;
  const classes = `${base} ${styles[variant]} ${className}`;

  if ('href' in props) {
    const { href, target, rel, onClick } = props;
    return <Link href={href} target={target} rel={rel} onClick={onClick} className={classes}>{children}</Link>;
  }

  const { children: _children, variant: _variant, className: _className, type = 'button', ...buttonProps } = props;
  return <button type={type} className={classes} {...buttonProps}>{children}</button>;
}
