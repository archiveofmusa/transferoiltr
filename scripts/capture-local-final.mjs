import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const baseUrl = (process.env.BASE_URL || process.argv.find((value) => value.startsWith('--base-url='))?.split('=')[1] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const outputDirectory = path.join(root, 'docs', 'reference', 'screenshots', 'local-final');
const routesDocument = JSON.parse(await import('node:fs/promises').then(({ readFile }) => readFile(path.join(root, 'src', 'data', 'transferoil', 'routes.generated.json'), 'utf8')));
const routeById = new Map(routesDocument.routes.map((route) => [route.id, route.routePath]));

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

const pages = [
  { key: 'home', pathname: '/tr' },
  { key: 'company', pathname: '/tr/kurumsal/about-us' },
  { key: 'hydraulic-category', pathname: '/tr/hidrolik' },
  { key: 'industrial-category', pathname: '/tr/endustriyel' },
  { key: 'uhp-category', pathname: '/tr/uhp' },
  { key: 'product-detail', pathname: `/tr${routeById.get(89)}` },
  { key: 'news', pathname: '/tr/haberler' },
  { key: 'exhibitions', pathname: '/tr/fuarlar' },
  { key: 'certificates', pathname: '/tr/sertifikalar' },
  { key: 'contact', pathname: '/tr/iletisim' },
];

const menus = [
  { key: 'company', label: 'Kurumsal' },
  { key: 'hydraulic', label: 'Hidrolik' },
  { key: 'industrial', label: 'Endüstriyel' },
  { key: 'uhp', label: 'UHP' },
];

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      scroll-behavior: auto !important;
      caret-color: transparent !important;
    }
  ` });
  await page.waitForTimeout(150);
}

async function gotoLocal(page, pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response || response.status() >= 400) throw new Error(`${pathname} HTTP ${response?.status() ?? 'no-response'}`);
  await settle(page);
  return response.status();
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures = [];
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'tr-TR', colorScheme: 'light' });
    const page = await context.newPage();
    for (const item of pages) {
      const fileName = `${item.key}-${viewport.name}.png`;
      const filePath = path.join(outputDirectory, fileName);
      try {
        const status = await gotoLocal(page, item.pathname);
        await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled', timeout: 20_000 });
        captures.push({ type: 'page', ...item, viewport, status, screenshot: path.relative(root, filePath).replaceAll('\\', '/') });
      } catch (error) {
        failures.push({ type: 'page', ...item, viewport, error: error instanceof Error ? error.message : String(error) });
      }
    }
    await context.close();
  }

  const menuContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce', locale: 'tr-TR' });
  const menuPage = await menuContext.newPage();
  for (const item of menus) {
    const fileName = `mega-menu-${item.key}-1920x1080.png`;
    const filePath = path.join(outputDirectory, fileName);
    try {
      const status = await gotoLocal(menuPage, '/tr');
      const trigger = menuPage.locator('.to-main-link', { hasText: item.label }).filter({ hasText: new RegExp(`^${item.label}$`) }).first();
      await trigger.hover();
      await menuPage.locator('.to-mega-menu').waitFor({ state: 'visible', timeout: 5_000 });
      await menuPage.waitForTimeout(100);
      await menuPage.screenshot({ path: filePath, clip: { x: 0, y: 0, width: 1920, height: 760 }, animations: 'disabled', timeout: 20_000 });
      captures.push({ type: 'menu', ...item, viewport: { width: 1920, height: 1080 }, status, screenshot: path.relative(root, filePath).replaceAll('\\', '/') });
    } catch (error) {
      failures.push({ type: 'menu', ...item, error: error instanceof Error ? error.message : String(error) });
    }
  }
  await menuContext.close();

  const arContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'ar-SA' });
  const arPage = await arContext.newPage();
  const arabicPath = path.join(outputDirectory, 'arabic-mobile-390x844.png');
  try {
    const status = await gotoLocal(arPage, '/ar');
    const direction = await arPage.locator('html').getAttribute('dir');
    if (direction !== 'rtl') throw new Error(`Arabic html dir beklenen rtl, bulunan ${direction}`);
    await arPage.screenshot({ path: arabicPath, fullPage: false, animations: 'disabled' });
    captures.push({ type: 'arabic-mobile', pathname: '/ar', viewport: { width: 390, height: 844 }, status, direction, screenshot: path.relative(root, arabicPath).replaceAll('\\', '/') });
  } catch (error) {
    failures.push({ type: 'arabic-mobile', pathname: '/ar', error: error instanceof Error ? error.message : String(error) });
  }
  await arContext.close();

  const deliverables = [
    ['home-1440x900.png', 'final-home-after.png'],
    ['mega-menu-uhp-1920x1080.png', 'final-uhp-menu-after.png'],
    ['contact-1440x900.png', 'final-contact-after.png'],
    ['arabic-mobile-390x844.png', 'final-mobile-after.png'],
  ];
  for (const [source, target] of deliverables) {
    try {
      await copyFile(path.join(outputDirectory, source), path.join(root, 'docs', 'reference', target));
    } catch (error) {
      failures.push({ type: 'deliverable-copy', source, target, error: error instanceof Error ? error.message : String(error) });
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  expectedReferenceMatchedCaptures: 44,
  referenceMatchedCaptures: captures.filter((item) => item.type === 'page' || item.type === 'menu').length,
  arabicMobileCaptures: captures.filter((item) => item.type === 'arabic-mobile').length,
  captures,
  failures,
  passed: captures.filter((item) => item.type === 'page' || item.type === 'menu').length === 44
    && captures.some((item) => item.type === 'arabic-mobile')
    && failures.length === 0,
};

const reportPath = path.join(root, 'docs', 'reference', 'local-capture-report.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  expected: report.expectedReferenceMatchedCaptures,
  captured: report.referenceMatchedCaptures,
  arabicMobile: report.arabicMobileCaptures,
  failures: failures.length,
  passed: report.passed,
  report: path.relative(root, reportPath),
}, null, 2));
if (!report.passed) process.exitCode = 1;
