import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { brand, brandAssets } from '@/data/brand';
import type { Messages } from '@/i18n/messages';
import { LanguageSelector } from '@/components/LanguageSelector';
import type { MouseEventHandler } from 'react';

export function TransferOilTopBar({ messages, industriesOpen, onOpenIndustries }: { messages: Messages; industriesOpen: boolean; onOpenIndustries: MouseEventHandler<HTMLButtonElement> }) {
  const utilityNavigationItems = [
    { label: messages.Header.utility.exhibitions, href: '/fuarlar' },
    { label: messages.Header.utility.news, href: '/haberler' },
    { label: messages.Header.utility.certificates, href: '/sertifikalar' },
    { label: messages.Header.utility.contact, href: '/iletisim' },
  ];
  const linkedInIcon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-current"><path d="M5.4 7.8H2.2V18h3.2V7.8ZM3.8 6.4A1.9 1.9 0 1 0 3.8 2.6a1.9 1.9 0 0 0 0 3.8ZM18.2 12.2c0-3.1-1.6-4.7-3.9-4.7-1.8 0-2.6 1-3.1 1.7V7.8H8V18h3.2v-5.1c0-1.3.3-2.6 1.9-2.6 1.6 0 1.7 1.5 1.7 2.7v5h3.2l.2-5.8Z" /></svg>;
  const youtubeIcon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px] fill-current"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12s0-3.2-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" /></svg>;

  return (
    <div className="to-utility-bar">
      <div className="to-utility-row flex h-full items-center gap-2.5 sm:gap-5">
        <Link href="/" aria-label={messages.Header.logoHome} className="to-logo-link [unicode-bidi:isolate]" dir="ltr" prefetch={false}>
          <Image
            src={brandAssets.logoWhite}
            alt={brand.name}
            width={462}
            height={64}
            priority
            className="h-auto w-[140px] max-w-full object-contain object-left min-[390px]:w-[180px] sm:w-[244px] xl:w-[279px]"
          />
        </Link>

        <div className="ms-auto hidden items-center gap-[10px] xl:flex">
          <a href="https://it.linkedin.com/company/transfer-oil-s-p-a-" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="to-social-icon">
            {linkedInIcon}
          </a>
          <a href="https://www.youtube.com/user/TransferOil" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="to-social-icon">
            {youtubeIcon}
          </a>
          <span className="mx-[8px] h-[22px] w-px bg-[rgb(255_255_255_/_25%)]" aria-hidden="true" />
          <button type="button" data-industries-trigger aria-haspopup="dialog" aria-expanded={industriesOpen} aria-controls={industriesOpen ? 'industries-panel' : undefined} onClick={onOpenIndustries} className="to-utility-link">
            {messages.Header.utility.industries}
          </button>
          {utilityNavigationItems.map((item) => (
            <Link key={item.label} href={item.href} className="to-utility-link">
              {item.label}
            </Link>
          ))}
          <LanguageSelector messages={messages} />
        </div>

        <div className="ms-auto flex items-center gap-[10px] xl:hidden">
          <a href="https://it.linkedin.com/company/transfer-oil-s-p-a-" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="to-social-icon">
            {linkedInIcon}
          </a>
          <a href="https://www.youtube.com/user/TransferOil" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="to-social-icon">
            {youtubeIcon}
          </a>
          <LanguageSelector messages={messages} />
        </div>
      </div>
    </div>
  );
}
