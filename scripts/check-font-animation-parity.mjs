import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function walk(directory, extensions = new Set()) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...walk(relative(root, path), extensions));
    else if (extensions.size === 0 || extensions.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

const hero = read('src/components/Hero.tsx');
const mainNav = read('src/components/layout/TransferOilMainNav.tsx');
const motion = read('src/styles/transferoil-motion.css');
const typographyPath = 'src/styles/transferoil-typography.css';
const fontAuditPath = 'docs/reference/transferoil-font-audit.json';
const typography = existsSync(join(root, typographyPath)) ? read(typographyPath) : '';
const fontAudit = existsSync(join(root, fontAuditPath)) ? JSON.parse(read(fontAuditPath)) : null;
const cssFiles = walk('src', new Set(['.css']));
const allCss = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const fontFiles = [
  ...walk('public', new Set(['.woff2', '.woff', '.ttf', '.otf'])),
  ...walk('src', new Set(['.woff2', '.woff', '.ttf', '.otf'])),
];

function customProperties(cssBlock) {
  return Object.fromEntries(
    [...cssBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

const desktopTypographyBlock = typography.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const mobileTypographyBlock = typography.match(/@media\s*\(max-width:\s*767px\)[\s\S]*?:root\s*\{([^}]*)\}/)?.[1] ?? '';
const desktopTokens = customProperties(desktopTypographyBlock);
const mobileTokens = { ...desktopTokens, ...customProperties(mobileTypographyBlock) };

function pixelValue(value) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function weightValue(tokenName) {
  const parsed = Number.parseInt(desktopTokens[tokenName] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const typographyComparisons = [];
const typographySpecs = [
  { id: 'utility', audit: 'utility', size: '--to-text-utility', leading: '--to-leading-utility', weight: '--to-font-weight-regular' },
  { id: 'main-nav', audit: 'mainNav', size: '--to-text-main-nav', leading: '--to-leading-main-nav', weight: '--to-font-weight-regular' },
  { id: 'mega-heading', audit: 'megaHeading', size: '--to-text-mega-heading', leading: '--to-leading-mega-heading', weight: '--to-font-weight-medium' },
  { id: 'mega-item', audit: 'megaItem', size: '--to-text-mega-item', leading: '--to-leading-mega-item', weight: '--to-font-weight-light' },
  { id: 'mega-description', audit: 'megaDescription', size: '--to-text-mega-description', leading: '--to-leading-mega-description', weight: '--to-font-weight-regular' },
  { id: 'section-title', audit: 'sectionTitle', size: '--to-text-section-title', leading: '--to-leading-section-title', weight: '--to-font-weight-bold' },
  { id: 'product-title', audit: 'productTitle', size: '--to-text-product-title', leading: '--to-leading-product-title', weight: '--to-font-weight-medium' },
  { id: 'body', audit: 'body', size: '--to-text-body', leading: '--to-leading-body', weight: '--to-font-weight-regular' },
  { id: 'caption', audit: 'caption', size: '--to-text-caption', leading: '--to-leading-caption', weight: '--to-font-weight-regular' },
];

function addTypographyComparison({ id, metric, actual, expected, tolerance, unit = '' }) {
  const numeric = typeof actual === 'number' && typeof expected === 'number';
  const delta = numeric ? Math.abs(actual - expected) : null;
  const pass = numeric ? delta <= tolerance : actual === expected;
  const comparison = { id, metric, actual, expected, tolerance, unit, delta, pass };
  typographyComparisons.push(comparison);
  return {
    id: `font-${id}-${metric}`,
    expected: `${expected}${unit}${numeric ? ` (±${tolerance}${unit})` : ''}`,
    actual: actual === null ? null : `${actual}${unit}`,
    pass,
  };
}

const checks = [
  {
    id: 'slider-home-duration',
    expected: '32000ms',
    pass: /HOME_SLIDE_DURATION\s*=\s*32_000/.test(hero),
  },
  {
    id: 'slider-standard-duration',
    expected: '5000ms',
    pass: /STANDARD_SLIDE_DURATION\s*=\s*5_000/.test(hero),
  },
  {
    id: 'slider-fade-duration',
    expected: '800ms',
    pass: /--to-slider-fade-duration:\s*800ms/.test(motion),
  },
  {
    id: 'slider-rendered-height',
    expected: '436px mobile portrait and 480px desktop',
    pass: /h-\[436px\]/.test(hero) && /md:h-\[480px\]/.test(hero),
  },
  {
    id: 'slider-item-entry-duration',
    expected: '1000ms',
    pass: /--to-slider-item-duration:\s*1000ms/.test(motion),
  },
  {
    id: 'slider-copy-entry-duration',
    expected: '1500ms',
    pass: /--to-slider-copy-duration:\s*1500ms/.test(motion),
  },
  {
    id: 'slider-link-entry-duration',
    expected: '1800ms',
    pass: /--to-slider-link-duration:\s*1800ms/.test(motion),
  },
  {
    id: 'slider-easing',
    expected: 'fade ease; copy uses jQuery swing visual equivalent cubic-bezier(.445,.05,.55,.95)',
    pass: /--to-slider-fade-easing:\s*ease/.test(motion)
      && /--to-slider-copy-easing:\s*cubic-bezier\(\.445, \.05, \.55, \.95\)/.test(motion),
  },
  {
    id: 'slider-independent-pause-sources',
    expected: 'hover, focus-within, and reduced-motion independently pause autoplay',
    pass: /const isPaused = isHovered \|\| isFocusWithin \|\| prefersReducedMotion/.test(hero)
      && /onMouseEnter=\{\(\) => setIsHovered\(true\)\}/.test(hero)
      && /onMouseLeave=\{\(\) => setIsHovered\(false\)\}/.test(hero)
      && /onFocusCapture=\{\(\) => setIsFocusWithin\(true\)\}/.test(hero)
      && /setIsFocusWithin\(false\)/.test(hero),
  },
  {
    id: 'slider-deterministic-hooks',
    expected: 'root active key and indexed controls',
    pass: /data-active-slide=\{activeSlide\.key\}/.test(hero)
      && /data-hero-slide-index=\{index\}/.test(hero),
  },
  {
    id: 'slider-reduced-motion',
    expected: 'dynamic media-query subscription, timer pause, video pause/resume, and CSS motion removal',
    pass: /useSyncExternalStore\(subscribeToReducedMotion/.test(hero)
      && /preference\.addEventListener\('change'/.test(hero)
      && /video\.pause\(\)/.test(hero)
      && /video\.play\(\)/.test(hero)
      && /autoPlay=\{!prefersReducedMotion\}/.test(hero)
      && /@media \(prefers-reduced-motion:\s*reduce\)/.test(motion),
  },
  {
    id: 'slider-copy-after-fade',
    expected: 'incoming title, subtitle, and CTA start after the 800ms fade',
    pass: /data-entry-phase=\{entryPhase\}/.test(hero)
      && /entryPhase=\{hasTransitioned \? 'after-fade' : 'initial'\}/.test(hero)
      && /data-entry-phase='after-fade'[\s\S]*animation-delay:\s*var\(--to-slider-fade-duration\)/.test(motion),
  },
  {
    id: 'slider-copy-exit',
    expected: 'reference title/subtitle 1500ms and link 1800ms exit layer',
    pass: /state:\s*'active' \| 'outgoing'/.test(hero)
      && /COPY_EXIT_DURATION\s*=\s*1_800/.test(hero)
      && /@keyframes toHeroTitleOut/.test(motion)
      && /@keyframes toHeroSubtitleOut/.test(motion)
      && /@keyframes toHeroLinkOut/.test(motion),
  },
  {
    id: 'slider-copy-no-multiplied-opacity',
    expected: 'no whole-copy opacity animation multiplying child opacity curves',
    pass: !/\.to-hero-copy\s*\{\s*animation:/.test(motion),
  },
  {
    id: 'mega-menu-overlay',
    expected: 'rgba(152,152,152,.97)',
    pass: /--to-mega-overlay:\s*rgb\(152 152 152 \/ 97%\)/.test(motion),
  },
  {
    id: 'mega-menu-shadow',
    expected: '0 1px 4px rgba(30,30,30,.7)',
    pass: /--to-mega-shadow:\s*0 1px 4px rgb\(30 30 30 \/ 70%\)/.test(motion),
  },
  {
    id: 'mega-menu-immediate-open-close',
    expected: '0ms/none desktop entry and 0ms scheduled close',
    pass: /--to-mega-motion-duration:\s*0ms/.test(motion)
      && /\.to-mega-menu\s*\{[\s\S]*?animation:\s*none/.test(motion)
      && /},\s*0\);/.test(mainNav),
  },
  {
    id: 'main-nav-active-underline',
    expected: 'immediate state change with no invented transition',
    pass: /\.to-main-link::after\s*\{\s*transition:\s*none/.test(motion),
  },
  {
    id: 'button-arrow-hover',
    expected: 'direction-aware 4px arrow motion',
    pass: /\.to-hero-cta:hover \.to-hero-cta-arrow/.test(motion)
      && /translateX\(4px\)/.test(motion)
      && /translateX\(-4px\) scaleX\(-1\)/.test(motion),
  },
  {
    id: 'font-montserrat-family',
    expected: 'Montserrat declared in local CSS',
    pass: /Montserrat/i.test(allCss),
  },
  {
    id: 'font-arabic-fallback',
    expected: 'Noto Sans Arabic declared in local CSS',
    pass: /Noto Sans Arabic/i.test(allCss),
  },
  {
    id: 'font-local-files',
    expected: 'at least one locally hosted webfont file',
    pass: fontFiles.length > 0 && fontFiles.every((file) => statSync(file).size > 0),
  },
  {
    id: 'font-no-proprietary-transferoil-font',
    expected: 'no local proprietary TransferOil icon/font binary',
    pass: !fontFiles.some((file) => /transferoil/i.test(file.split(/[\\/]/).at(-1) ?? '')),
  },
];

for (const spec of typographySpecs) {
  const reference = fontAudit?.tokenEvidence?.[spec.audit];
  checks.push(
    addTypographyComparison({
      id: spec.id,
      metric: 'font-size',
      actual: pixelValue(desktopTokens[spec.size]),
      expected: pixelValue(reference?.fontSize),
      tolerance: 1,
      unit: 'px',
    }),
    addTypographyComparison({
      id: spec.id,
      metric: 'line-height',
      actual: pixelValue(desktopTokens[spec.leading]),
      expected: pixelValue(reference?.lineHeight),
      tolerance: 1,
      unit: 'px',
    }),
    addTypographyComparison({
      id: spec.id,
      metric: 'font-weight',
      actual: weightValue(spec.weight),
      expected: Number.parseInt(reference?.fontWeight ?? '', 10) || null,
      tolerance: 0,
    }),
    addTypographyComparison({
      id: spec.id,
      metric: 'letter-spacing',
      actual: /letter-spacing:\s*normal/.test(typography) ? 'normal' : null,
      expected: reference?.letterSpacing ?? null,
      tolerance: 0.1,
      unit: 'px',
    }),
  );
}

for (const spec of [
  { id: 'hero-title-desktop', audit: 'heroTitle', sizeKey: 'fontSizeDesktop', leadingKey: 'lineHeightDesktop', tokens: desktopTokens, size: '--to-text-hero-title', leading: '--to-leading-hero-title' },
  { id: 'hero-title-mobile', audit: 'heroTitle', sizeKey: 'fontSizeMobile', leadingKey: 'lineHeightMobile', tokens: mobileTokens, size: '--to-text-hero-title', leading: '--to-leading-hero-title' },
  { id: 'hero-subtitle-desktop', audit: 'heroSubtitle', sizeKey: 'fontSizeDesktop', leadingKey: 'lineHeightDesktop', tokens: desktopTokens, size: '--to-text-hero-subtitle', leading: '--to-leading-hero-subtitle' },
  { id: 'hero-subtitle-mobile', audit: 'heroSubtitle', sizeKey: 'fontSizeMobile', leadingKey: 'lineHeightMobile', tokens: mobileTokens, size: '--to-text-hero-subtitle', leading: '--to-leading-hero-subtitle' },
]) {
  const reference = fontAudit?.tokenEvidence?.[spec.audit];
  checks.push(
    addTypographyComparison({ id: spec.id, metric: 'font-size', actual: pixelValue(spec.tokens[spec.size]), expected: pixelValue(reference?.[spec.sizeKey]), tolerance: 1, unit: 'px' }),
    addTypographyComparison({ id: spec.id, metric: 'line-height', actual: pixelValue(spec.tokens[spec.leading]), expected: pixelValue(reference?.[spec.leadingKey]), tolerance: 1, unit: 'px' }),
    addTypographyComparison({ id: spec.id, metric: 'font-weight', actual: weightValue('--to-font-weight-regular'), expected: Number.parseInt(reference?.fontWeight ?? '', 10) || null, tolerance: 0 }),
    addTypographyComparison({ id: spec.id, metric: 'letter-spacing', actual: /letter-spacing:\s*normal/.test(typography) ? 'normal' : null, expected: reference?.letterSpacing ?? null, tolerance: 0.1, unit: 'px' }),
  );
}

const failed = checks.filter((check) => !check.pass);
const tolerances = {
  typography: {
    fontSizePx: 1,
    lineHeightPx: 1,
    letterSpacingPx: 0.1,
    fontWeight: 'same computed or functional weight',
  },
  animation: {
    durationMs: 30,
    delayMs: 30,
    translatePx: 2,
    opacity: 0.03,
    easing: 'same cubic-bezier or measured visual equivalent',
  },
};
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'font and animation parity only',
  reference: {
    page: 'https://www.transferoil.com/en/default.aspx',
    cachedHtml: '.cache/transferoil/source-html/085.html',
    note: 'Measured public behavior was recreated; no proprietary CSS or JavaScript was copied.',
  },
  inspected: {
    cssFiles: cssFiles.map((file) => relative(root, file).replaceAll('\\', '/')),
    fontFiles: fontFiles.map((file) => relative(root, file).replaceAll('\\', '/')),
    typography: typographyPath,
    fontAudit: fontAuditPath,
  },
  tolerances,
  typographyComparisons,
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    status: failed.length === 0 ? 'pass' : 'fail',
  },
  checks,
};

const output = join(root, 'docs/reference/font-animation-parity-report.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Font/animation parity: ${report.summary.passed}/${report.summary.total} checks passed.`);
console.log(`Report: ${relative(root, output)}`);
if (failed.length) {
  for (const check of failed) console.error(`FAIL ${check.id}: expected ${check.expected}`);
  process.exitCode = 1;
}
