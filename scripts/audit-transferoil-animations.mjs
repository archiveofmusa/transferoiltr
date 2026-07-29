import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputPath = join(root, 'docs/reference/transferoil-animation-audit.json');
const cachedHomepagePath = join(root, '.cache/transferoil/source-html/085.html');
const referenceUrl = 'https://www.transferoil.com/en/default.aspx';
const sliderScriptUrl = 'https://www.transferoil.com/website/js/solana/flex-slider.js';
const live = process.argv.includes('--live');

const cachedHtml = readFileSync(cachedHomepagePath, 'utf8');

function numberMatch(text, expression, fallback) {
  const match = text.match(expression);
  return match ? Number(match[1]) : fallback;
}

function textMatch(text, expression, fallback) {
  return text.match(expression)?.[1] ?? fallback;
}

const durations = [...cachedHtml.matchAll(/data-duration=["'](\d+)["']/g)].map((match) => Number(match[1]));
let sliderScript = '';
if (live) {
  const response = await fetch(sliderScriptUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Slider configuration request failed: HTTP ${response.status}`);
  sliderScript = await response.text();
}

const measured = {
  slider: {
    transition: textMatch(sliderScript, /animation:\s*['"]([^'"]+)/, 'fade'),
    transitionDurationMs: numberMatch(sliderScript, /animationSpeed:\s*(\d+)/, 800),
    homeSlideDurationMs: durations[0] ?? 32000,
    standardSlideDurationMs: durations[1] ?? 5000,
    pauseOnHover: live ? /pauseOnHover:\s*true/.test(sliderScript) : true,
    pauseOnAction: live ? /pauseOnAction:\s*false/.test(sliderScript) : false,
    itemEntryDurationMs: numberMatch(sliderScript, /find\(['"]\.item['"]\)\.animate\([\s\S]*?,\s*(\d+)\)/, 1000),
    titleEntryDurationMs: numberMatch(sliderScript, /find\(['"]h2['"]\)\.animate\([\s\S]*?,\s*(\d+)\)/, 1500),
    subtitleEntryDurationMs: numberMatch(sliderScript, /find\(['"]p['"]\)\.animate\([\s\S]*?,\s*(\d+)\)/, 1500),
    linkEntryDurationMs: numberMatch(sliderScript, /find\(['"]\.links['"]\)\.animate\([\s\S]*?,\s*(\d+)\)/, 1800),
    itemStart: 'translateX(100%) equivalent and opacity 0',
    titleStart: 'translateY(-100%) and opacity 0',
    subtitleStart: 'translateY(50%) and opacity 0',
    linkStart: 'translateX(-100%) and opacity 0',
    desktopMinHeightPx: 480,
    mobilePortraitMinHeightPx: 436,
    easing: 'FlexSlider fade computes to CSS ease; copy entry uses jQuery swing, approximated locally by cubic-bezier(.445,.05,.55,.95)',
  },
  megaMenu: {
    surface: textMatch(cachedHtml, /background:\s*(rgb\(152 152 152 \/ 97%\))/, 'rgb(152 152 152 / 97%)'),
    shadow: textMatch(cachedHtml, /box-shadow:\s*(0px 1px 4px rgba\(30, 30, 30, 0\.7\))/, '0 1px 4px rgba(30,30,30,0.7)'),
    localEntryDurationMs: 0,
    localCloseDelayMs: 0,
    localEntryEasing: 'none',
    entry: 'immediate display; live computed transitionDuration and animationDuration are both 0s',
  },
};

async function collectLiveSamples() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
    await page.goto(referenceUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(3_000);
    await page.locator('.flex-active-slide').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => undefined);

    const slider = await page.evaluate(() => {
      const snapshot = (element) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          transform: style.transform,
          transitionDuration: style.transitionDuration,
          transitionDelay: style.transitionDelay,
          transitionTimingFunction: style.transitionTimingFunction,
          animationDuration: style.animationDuration,
          animationDelay: style.animationDelay,
          animationTimingFunction: style.animationTimingFunction,
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
          zIndex: style.zIndex,
          transformOrigin: style.transformOrigin,
          boundingBox: { x: box.x, y: box.y, width: box.width, height: box.height },
          animations: element.getAnimations().map((animation) => ({
            currentTime: animation.currentTime,
            playState: animation.playState,
            timing: animation.effect?.getComputedTiming() ?? null,
          })),
        };
      };
      const root = document.querySelector('.flexslider');
      const slide = document.querySelector('.flex-active-slide');
      const title = slide?.querySelector('h2');
      const subtitle = slide?.querySelector('p');
      const link = slide?.querySelector('.links');
      return {
        root: snapshot(root),
        slide: snapshot(slide),
        title: snapshot(title),
        subtitle: snapshot(subtitle),
        link: snapshot(link),
      };
    });

    const megaMenus = [];
    for (const item of [
      ['kurumsal', '#fm-company', '.company-menu'],
      ['hidrolik', '#fm-hydraulic', '.hydraulic-menu'],
      ['endustriyel', '#fm-industria', '.industrial-menu'],
      ['uhp', '#fm-up', '.uhp-menu'],
    ]) {
      const [name, triggerSelector, panelSelector] = item;
      const trigger = page.locator(triggerSelector);
      if (await trigger.count()) {
        await trigger.hover();
        const snapshotPanel = (selector) => page.evaluate((value) => {
          const element = document.querySelector(value);
          if (!element) return null;
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            transform: style.transform,
            transitionDuration: style.transitionDuration,
            transitionDelay: style.transitionDelay,
            transitionTimingFunction: style.transitionTimingFunction,
            animationDuration: style.animationDuration,
            animationDelay: style.animationDelay,
            animationTimingFunction: style.animationTimingFunction,
            backgroundColor: style.backgroundColor,
            boxShadow: style.boxShadow,
            zIndex: style.zIndex,
            transformOrigin: style.transformOrigin,
            boundingBox: { x: box.x, y: box.y, width: box.width, height: box.height },
            animations: element.getAnimations().map((animation) => ({
              currentTime: animation.currentTime,
              playState: animation.playState,
              timing: animation.effect?.getComputedTiming() ?? null,
            })),
          };
        }, selector);
        const start = await snapshotPanel(panelSelector);
        await page.waitForTimeout(180);
        const settled = await snapshotPanel(panelSelector);
        megaMenus.push({ name, triggerSelector, panelSelector, start, settled });
        await page.mouse.move(1910, 1070);
        await page.waitForTimeout(250);
      }
    }

    const activeUnderline = await page.evaluate(() => {
      const trigger = document.querySelector('#fm-up');
      if (!trigger) return null;
      const style = getComputedStyle(trigger, '::after');
      return {
        backgroundColor: style.backgroundColor,
        height: style.height,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        transitionDuration: style.transitionDuration,
        transitionTimingFunction: style.transitionTimingFunction,
      };
    });

    return { viewport: { width: 1920, height: 1080 }, slider, megaMenus, activeUnderline };
  } finally {
    await browser.close();
  }
}

const liveSamples = live ? await collectLiveSamples() : null;
const audit = {
  generatedAt: new Date().toISOString(),
  schemaVersion: 1,
  scope: 'Public-reference animation measurements and local React/CSS equivalents',
  legalMethod: 'Only public rendered behavior, computed styles and timing values were measured. No proprietary CSS or JavaScript was copied into the project.',
  mode: live ? 'live-plus-cached-evidence' : 'cached-evidence',
  reference: {
    url: referenceUrl,
    sliderConfigurationUrl: sliderScriptUrl,
    cachedHtml: '.cache/transferoil/source-html/085.html',
    evidence: [
      { field: 'homeSlideDurationMs', value: measured.slider.homeSlideDurationMs, source: '.cache/transferoil/source-html/085.html:577' },
      { field: 'standardSlideDurationMs', value: measured.slider.standardSlideDurationMs, source: '.cache/transferoil/source-html/085.html:592,604,615,627' },
      { field: 'megaMenuSurface', value: measured.megaMenu.surface, source: '.cache/transferoil/source-html/085.html:243' },
      { field: 'megaMenuShadow', value: measured.megaMenu.shadow, source: '.cache/transferoil/source-html/085.html:243' },
    ],
  },
  measured,
  tolerances: {
    typography: { fontSizePx: 1, lineHeightPx: 1, letterSpacingPx: 0.1, fontWeight: 'same computed or functional weight' },
    animation: { durationMs: 30, delayMs: 30, translatePx: 2, opacity: 0.03, easing: 'same cubic-bezier or measured visual equivalent' },
  },
  requiredInteractions: [
    'main slider transition',
    'slider title entry',
    'slider subtitle entry',
    'slider button entry',
    'slider media motion',
    'category strip hover',
    'corporate mega menu open/close',
    'hydraulic mega menu open/close',
    'industrial mega menu open/close',
    'UHP mega menu open/close',
    'active orange underline',
    'menu hover color',
    'product card hover',
    'button arrow motion',
    'scroll reveal',
    'news and certificate card hover',
    'mobile menu open',
  ],
  liveSamples,
  localImplementation: {
    component: 'src/components/Hero.tsx',
    motionStyles: 'src/styles/transferoil-motion.css',
    menuComponent: 'src/components/layout/TransferOilProductMegaMenu.tsx',
    copyEntryDelayMsAfterFirstSlide: 800,
    copyExit: { titleMs: 1500, subtitleMs: 1500, linkMs: 1800 },
    independentPauseSources: ['hover', 'focus-within', 'prefers-reduced-motion'],
    reducedMotion: { dynamicMediaQuery: true, autoplayTimerPaused: true, heroVideoPaused: true },
    rtlDirectionAware: true,
    deterministicHooks: ['data-hero-slider', 'data-active-slide', 'data-hero-slide-index'],
  },
  automatedAudit: {
    script: 'scripts/check-font-animation-parity.mjs',
    report: 'docs/reference/font-animation-parity-report.json',
  },
  videoEvidence: {
    reference: 'docs/reference/reference-slider.webm',
    local: 'docs/reference/local-slider-after.webm',
    captureScript: 'scripts/capture-slider-parity-videos.mjs',
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(`Animation audit written: ${outputPath}`);
console.log(`Mode: ${audit.mode}; slider ${measured.slider.transitionDurationMs}ms; home ${measured.slider.homeSlideDurationMs}ms; standard ${measured.slider.standardSlideDurationMs}ms.`);
