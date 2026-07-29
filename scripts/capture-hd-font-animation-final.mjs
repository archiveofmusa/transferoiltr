import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const outputDirectory = path.join(root, 'docs', 'reference', 'screenshots', 'hd-font-animation-final');
const reportPath = path.join(root, 'docs', 'reference', 'hd-font-animation-visual-report.json');
const routesDocument = JSON.parse(await readFile(path.join(root, 'src', 'data', 'transferoil', 'routes.generated.json'), 'utf8'));
const routeById = new Map(routesDocument.routes.map((route) => [route.id, route.routePath]));

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

const staticPages = [
  { key: 'company', pathname: '/tr/kurumsal/about-us' },
  { key: 'hydraulic-category', pathname: '/tr/hidrolik' },
  { key: 'industrial-category', pathname: '/tr/endustriyel' },
  { key: 'uhp-category', pathname: '/tr/uhp' },
  { key: 'steel-braid-product', pathname: `/tr${routeById.get(105)}` },
  { key: 'uhp-metric-product', pathname: `/tr${routeById.get(298)}` },
  { key: 'news', pathname: '/tr/haberler' },
  { key: 'certificates', pathname: '/tr/sertifikalar' },
  { key: 'contact', pathname: '/tr/iletisim' },
  { key: 'russian-home', pathname: '/ru' },
  { key: 'arabic-home', pathname: '/ar', expectedDirection: 'rtl' },
];

const menuKeys = ['company', 'hydraulic', 'industrial', 'uhp'];
const captures = [];
const failures = [];

async function settle(page, { freeze = true } = {}) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => document.fonts?.ready);
  if (freeze) {
    await page.addStyleTag({ content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    ` });
  }
  await page.waitForTimeout(120);
}

async function goto(page, pathname, options) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  if (!response || response.status() >= 400) throw new Error(`${pathname} HTTP ${response?.status() ?? 'no-response'}`);
  await settle(page, options);
  return response.status();
}

async function screenshot(page, fileName, details) {
  const filePath = path.join(outputDirectory, fileName);
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled', timeout: 30_000 });
  captures.push({ ...details, screenshot: path.relative(root, filePath).replaceAll('\\', '/') });
}

async function captureSlides(page, viewport) {
  await goto(page, '/tr', { freeze: true });
  const dots = page.locator('[data-hero-slide-index]');
  const dotCount = await dots.count();
  if (dotCount < 3) throw new Error(`Slider denetimleri bulunamadı: ${dotCount}`);
  for (let index = 0; index < 3; index += 1) {
    await dots.nth(index).click();
    await page.waitForTimeout(80);
    await screenshot(page, `home-slide-${index + 1}-${viewport.name}.png`, {
      type: 'hero-slide', slide: index + 1, pathname: '/tr', viewport,
    });
  }
}

async function captureDesktopMenu(page, viewport, menuIndex) {
  await goto(page, '/tr', { freeze: true });
  const trigger = page.locator('.to-main-link').nth(menuIndex);
  await trigger.hover();
  await page.locator('.to-mega-menu').waitFor({ state: 'visible', timeout: 5_000 });
  await screenshot(page, `mega-menu-${menuKeys[menuIndex]}-${viewport.name}.png`, {
    type: 'mega-menu', menu: menuKeys[menuIndex], pathname: '/tr', viewport,
  });
}

async function captureMobileMenu(page, viewport, menuIndex) {
  await goto(page, '/tr', { freeze: true });
  await page.locator('.to-mobile-trigger').click();
  await page.locator('#transferoil-mobile-menu').waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.to-mobile-section-trigger').nth(menuIndex).click();
  await screenshot(page, `mobile-menu-${menuKeys[menuIndex]}-${viewport.name}.png`, {
    type: 'mobile-menu', menu: menuKeys[menuIndex], pathname: '/tr', viewport,
  });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: 'tr-TR', colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();

    try {
      await captureSlides(page, viewport);
    } catch (error) {
      failures.push({ type: 'hero-slides', viewport, error: error instanceof Error ? error.message : String(error) });
    }

    for (let index = 0; index < menuKeys.length; index += 1) {
      try {
        if (viewport.width >= 1024) await captureDesktopMenu(page, viewport, index);
        else await captureMobileMenu(page, viewport, index);
      } catch (error) {
        failures.push({ type: 'menu', menu: menuKeys[index], viewport, error: error instanceof Error ? error.message : String(error) });
      }
    }

    for (const item of staticPages) {
      try {
        const status = await goto(page, item.pathname, { freeze: true });
        if (item.expectedDirection) {
          const direction = await page.locator('html').getAttribute('dir');
          if (direction !== item.expectedDirection) throw new Error(`Beklenen yön ${item.expectedDirection}, bulunan ${direction}`);
        }
        await screenshot(page, `${item.key}-${viewport.name}.png`, {
          type: 'page', key: item.key, pathname: item.pathname, viewport, status,
        });
      } catch (error) {
        failures.push({ type: 'page', key: item.key, pathname: item.pathname, viewport, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (viewport.width === 390) {
      try {
        await goto(page, '/ar', { freeze: true });
        await page.locator('.to-mobile-trigger').click();
        await page.locator('#transferoil-mobile-menu').waitFor({ state: 'visible', timeout: 5_000 });
        await screenshot(page, `arabic-mobile-menu-${viewport.name}.png`, {
          type: 'arabic-mobile-menu', pathname: '/ar', viewport,
        });
      } catch (error) {
        failures.push({ type: 'arabic-mobile-menu', viewport, error: error instanceof Error ? error.message : String(error) });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const expectedCaptureCount = (viewports.length * (3 + 4 + staticPages.length)) + 1;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewports,
  expectedCaptureCount,
  capturedCount: captures.length,
  captures,
  failures,
  passed: captures.length === expectedCaptureCount && failures.length === 0,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  expected: expectedCaptureCount,
  captured: captures.length,
  failures: failures.length,
  passed: report.passed,
  report: path.relative(root, reportPath).replaceAll('\\', '/'),
}, null, 2));
if (!report.passed) process.exitCode = 1;
