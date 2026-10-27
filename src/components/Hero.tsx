'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';
import { transferOilAssets } from '@/data/transferOilAssets';
import type { Messages } from '@/i18n/messages';
import { ProductFinderDrawer } from '@/components/ProductFinderDrawer';

type SlideKey = 'home' | 'hydraulic' | 'industrial' | 'uhp';
type HeroSlide = { key: SlideKey; title: string; subtitle: string; href: string; objectPosition?: string };

const HOME_SLIDE_DURATION = 32_000;
const STANDARD_SLIDE_DURATION = 5_000;
const COPY_EXIT_DURATION = 1_800;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const preference = window.matchMedia(REDUCED_MOTION_QUERY);
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const heroImages: Record<Exclude<SlideKey, 'home'>, string> = {
  hydraulic: transferOilAssets.heroHydraulic,
  industrial: transferOilAssets.heroIndustrial,
  uhp: transferOilAssets.heroUhp,
};

const categoryImages: Record<Exclude<SlideKey, 'home'>, string> = {
  hydraulic: transferOilAssets.menuHydraulic,
  industrial: transferOilAssets.menuIndustrial,
  uhp: transferOilAssets.menuUhp,
};

function HeroCopy({
  slide,
  readMore,
  state,
  entryPhase = 'initial',
}: {
  slide: HeroSlide;
  readMore: string;
  state: 'active' | 'outgoing';
  entryPhase?: 'initial' | 'after-fade';
}) {
  const outgoing = state === 'outgoing';

  return (
    <div
      className="to-hero-copy col-start-1 row-start-1 max-w-[710px]"
      data-copy-state={state}
      data-entry-phase={entryPhase}
      data-hero-copy={slide.key}
      aria-hidden={outgoing || undefined}
    >
      <div className="to-hero-copy-title inline-block bg-[var(--brand-primary)] px-6 py-4 shadow-2xl md:px-8 md:py-5">
        {outgoing ? (
          <div className="text-[30px] font-medium uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-[42px] md:text-[52px]">
            {slide.title}
          </div>
        ) : (
          <h1 className="text-[30px] font-medium uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-[42px] md:text-[52px]">
            {slide.title}
          </h1>
        )}
      </div>
      <div className="to-hero-copy-subtitle mt-2 max-w-[610px] bg-[var(--to-hero-subtitle)] px-6 py-4 shadow-xl md:px-8">
        <p className="text-sm font-normal uppercase leading-6 tracking-[0.03em] text-white md:text-[18px]">{slide.subtitle}</p>
      </div>
      {outgoing ? (
        <span className="to-hero-cta to-hero-copy-link mt-4 inline-flex">
          <span>{readMore}</span><span aria-hidden="true" className="to-hero-cta-arrow">›</span>
        </span>
      ) : (
        <Link href={slide.href} className="to-hero-cta to-hero-copy-link mt-4 inline-flex" tabIndex={0}>
          <span>{readMore}</span><span aria-hidden="true" className="to-hero-cta-arrow">›</span>
        </Link>
      )}
    </div>
  );
}

export function Hero({ messages }: { messages: Messages }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, () => false);
  const timerRemaining = useRef(HOME_SLIDE_DURATION);
  const timerStartedAt = useRef(0);
  const timerSlideIndex = useRef(0);
  const homeVideoRef = useRef<HTMLVideoElement>(null);
  const slides = useMemo<HeroSlide[]>(() => [
    { key: 'home', ...messages.Hero.slides.home, href: '/kurumsal/about-us' },
    { key: 'uhp', ...messages.Hero.slides.uhp, href: '/uhp', objectPosition: '50% 60%' },
    { key: 'hydraulic', ...messages.Hero.slides.hydraulic, href: '/hidrolik', objectPosition: '50% 60%' },
    { key: 'industrial', ...messages.Hero.slides.industrial, href: '/endustriyel', objectPosition: '50% 50%' },
  ], [messages]);
  const isPaused = isHovered || isFocusWithin || prefersReducedMotion;
  const categories = [
    {
      key: 'hydraulic' as const,
      title: messages.Hero.categories.hydraulic,
      description: messages.Hero.categoryDescriptions.hydraulic,
      href: '/hidrolik',
    },
    {
      key: 'industrial' as const,
      title: messages.Hero.categories.industrial,
      description: messages.Hero.categoryDescriptions.industrial,
      href: '/endustriyel',
    },
    {
      key: 'uhp' as const,
      title: messages.Hero.categories.uhp,
      description: messages.Hero.categoryDescriptions.uhp,
      href: '/uhp',
    },
  ];

  const beginSlideChange = useCallback((nextIndex: number) => {
    if (nextIndex === activeIndex) return;
    setOutgoingIndex(prefersReducedMotion ? null : activeIndex);
    setHasTransitioned(true);
    setActiveIndex(nextIndex);
  }, [activeIndex, prefersReducedMotion]);

  useEffect(() => {
    const video = homeVideoRef.current;
    if (!video) return;
    if (prefersReducedMotion) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (outgoingIndex === null) return undefined;
    const timer = window.setTimeout(() => setOutgoingIndex(null), COPY_EXIT_DURATION);
    return () => window.clearTimeout(timer);
  }, [outgoingIndex]);

  useEffect(() => {
    if (timerSlideIndex.current !== activeIndex) {
      timerSlideIndex.current = activeIndex;
      timerRemaining.current = slides[activeIndex]?.key === 'home'
        ? HOME_SLIDE_DURATION
        : STANDARD_SLIDE_DURATION;
    }

    if (isPaused) return undefined;

    const duration = timerRemaining.current;
    timerStartedAt.current = window.performance.now();
    const timer = window.setTimeout(() => {
      timerRemaining.current = 0;
      beginSlideChange((activeIndex + 1) % slides.length);
    }, duration);

    return () => {
      window.clearTimeout(timer);
      const elapsed = window.performance.now() - timerStartedAt.current;
      timerRemaining.current = Math.max(0, duration - elapsed);
    };
  }, [activeIndex, beginSlideChange, isPaused, slides]);

  const activeSlide = slides[activeIndex];
  const outgoingSlide = outgoingIndex === null ? null : slides[outgoingIndex];

  return (
    <section className="relative overflow-hidden bg-[#eef0f2]">
      <div
        className="relative h-[436px] overflow-hidden bg-[#343a40] md:h-[480px]"
        data-hero-slider
        data-active-slide={activeSlide.key}
        data-paused={isPaused ? 'true' : 'false'}
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocusWithin(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsFocusWithin(false);
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            className="to-hero-slide absolute inset-0"
            data-active={index === activeIndex ? 'true' : 'false'}
            data-slide-key={slide.key}
            data-slide-duration={slide.key === 'home' ? HOME_SLIDE_DURATION : STANDARD_SLIDE_DURATION}
            aria-hidden={index !== activeIndex}
          >
            {slide.key === 'home' ? (
              <>
                <div className="absolute inset-0 bg-white" />
                <video
                  ref={homeVideoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={transferOilAssets.homeHeroVideo}
                  poster={transferOilAssets.heroHome}
                  autoPlay={!prefersReducedMotion}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,30,34,.62),rgba(27,30,34,.12)_60%,transparent)]" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(110deg,#343a40_0%,#42484e_48%,#24292e_100%)]" />
                <Image
                  src={heroImages[slide.key]}
                  alt={messages.Hero.imageAlt.replace('{title}', slide.title)}
                  fill
                  priority={index === 1}
                  sizes="100vw"
                  className="object-cover opacity-90"
                  style={{ objectPosition: slide.objectPosition }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,30,34,.78),rgba(27,30,34,.38)_48%,rgba(27,30,34,.08))]" />
              </>
            )}
          </div>
        ))}

        <ProductFinderDrawer
          triggerLabel={messages.Hero.productFinder}
          copy={messages.Hero.productFinderPanel}
        />

        <div className="relative z-10 mx-auto flex h-full max-w-[1660px] items-center px-8 sm:px-16 lg:px-[130px]">
          <div className="grid w-full max-w-[710px]">
            {outgoingSlide && (
              <HeroCopy
                key={`outgoing-${outgoingSlide.key}-${activeSlide.key}`}
                slide={outgoingSlide}
                readMore={messages.Hero.readMore}
                state="outgoing"
              />
            )}
            <HeroCopy
              key={activeSlide.key}
              slide={activeSlide}
              readMore={messages.Hero.readMore}
              state="active"
              entryPhase={hasTransitioned ? 'after-fade' : 'initial'}
            />
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2" dir="ltr">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              data-hero-slide-index={index}
              aria-label={messages.Hero.slideAria.replace('{title}', slide.title)}
              aria-current={activeIndex === index ? 'true' : undefined}
              onClick={() => beginSlideChange(index)}
              className={`to-hero-pagination-button h-[4px] w-11 ${activeIndex === index ? 'bg-[var(--to-red)]' : 'bg-white/55 hover:bg-white focus-visible:bg-white'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-20 mx-auto max-w-[1660px] px-4 pb-12 sm:px-8 lg:-mt-1 lg:px-[130px]">
        <div className="grid overflow-hidden rounded-b-sm bg-white shadow-[0_8px_22px_rgb(0_0_0_/_18%)] lg:grid-cols-[1.05fr_repeat(3,1fr)]">
          <div className="flex min-h-[315px] flex-col justify-center border-b border-[#e4e4e4] p-8 text-[var(--to-hero-title)] lg:border-b-0 lg:p-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--to-red)]">{messages.Hero.intro.eyebrow}</p>
            <h2 className="mt-4 text-[24px] font-bold leading-tight">{messages.Hero.intro.title}</h2>
            <p className="mt-5 text-[15px] leading-6 text-[var(--to-body-text)]">{messages.Hero.intro.description}</p>
            <Link href="/hidrolik" className="mt-6 inline-flex w-fit items-stretch bg-[var(--to-button-bg)] text-[12px] font-semibold text-white">
              <span className="px-5 py-3">{messages.Hero.intro.button}</span>
              <span aria-hidden="true" className="flex w-11 items-center justify-center bg-[var(--to-red)] text-xl">›</span>
            </Link>
          </div>

          {categories.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              className="to-home-category-card group relative flex min-h-[315px] flex-col overflow-hidden border-b border-white/20 p-7 text-white lg:border-b-0 lg:border-s lg:border-white/20"
              style={{ backgroundColor: index === 2 ? 'var(--brand-primary-hover)' : 'var(--brand-primary)' }}
            >
              <span className="text-center text-[23px] font-medium uppercase tracking-[-0.01em]">{item.title}</span>
              <span className="relative my-2 block min-h-[130px] flex-1">
                <Image
                  src={categoryImages[item.key]}
                  alt={messages.Hero.categoryAlt.replace('{title}', item.title)}
                  fill
                  sizes="(min-width: 1024px) 24vw, 100vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </span>
              <span className="text-center text-[13px] leading-5 text-white">{item.description}</span>
              <span aria-hidden="true" className="mx-auto mt-5 h-[2px] w-10 bg-white/75 transition-all duration-200 group-hover:w-20" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
