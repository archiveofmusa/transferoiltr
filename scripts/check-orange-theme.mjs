import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const phase = process.argv.includes('--before') ? 'before' : 'after';
const output = path.resolve('docs/reference/orange-restore');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const protectedFiles = [
  'public/assets/brand/uhphortum-logo.svg', 'public/assets/brand/uhphortum-logo-white.svg',
  'public/assets/brand/uhphortum-og.png', 'src/components/layout/TransferOilTopBar.tsx',
  'src/components/Footer.tsx', 'src/components/Hero.tsx', 'src/components/ProductFinderDrawer.tsx',
  'messages/tr.json', 'messages/en.json', 'messages/ru.json', 'messages/ar.json',
  'src/i18n/productNameTranslations.ts', 'src/i18n/productDisplayName.ts',
  'src/i18n/technicalTextTranslations.ts', 'transferoil_link_manifest.json',
  'src/data/transferoil/routes.generated.json',
];
await mkdir(output, { recursive: true });
const hashes = Object.fromEntries(await Promise.all(protectedFiles.map(async (file) =>
  [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
const baseline = phase === 'after' ? JSON.parse(await readFile(path.join(output, 'before.json'), 'utf8')) : null;
if (baseline) assert.deepEqual(hashes, baseline.hashes, 'Logo, content, routes or component layout changed during palette restoration');
const report = { phase, hashes, checks: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.on('pageerror', (error) => report.errors.push(error.message));

try {
  const cases = [
    ...['tr', 'en', 'ru', 'ar'].map((locale) => ({ locale, width: 1440 })),
    { locale: 'tr', width: 390 }, { locale: 'ar', width: 390 },
  ];
  for (const { locale, width } of cases) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const response = await page.goto(`${baseUrl}/${locale}/uhp/accessories`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const probe = await page.evaluate(() => {
      const logo = document.querySelector('.to-logo-link img');
      const box = logo.getBoundingClientRect();
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect().height;
      const style = getComputedStyle(document.documentElement);
      return {
        bodyText: document.querySelector('main').innerText,
        logo: { x: box.x, y: box.y, width: box.width, height: box.height, src: logo.getAttribute('src') },
        topHeight: rect('.to-utility-bar'), navHeight: rect('.to-main-bar'),
        overflow: document.documentElement.scrollWidth > innerWidth,
        headerBackground: getComputedStyle(document.querySelector('.to-utility-bar')).backgroundColor,
        footerAccent: getComputedStyle(document.querySelector('footer')).borderTopColor,
        primaryRgb: style.getPropertyValue('--brand-primary-rgb').trim(),
        navyRgb: style.getPropertyValue('--brand-navy-rgb').trim(),
      };
    });
    assert(!probe.overflow, 'Horizontal overflow');
    const key = `${locale}-${width}`;
    if (baseline) {
      const old = baseline.checks.find((item) => item.key === key).probe;
      assert.deepEqual(probe.logo, old.logo, 'Logo geometry changed');
      assert.equal(probe.topHeight, old.topHeight);
      assert.equal(probe.navHeight, old.navHeight);
      assert.equal(probe.bodyText, old.bodyText, 'Localized product content changed');
      assert.equal(probe.headerBackground, 'rgb(201, 80, 22)');
      assert.equal(probe.footerAccent, 'rgb(201, 80, 22)');
      assert.equal(probe.primaryRgb, '201 80 22');
      assert.equal(probe.navyRgb, '16 32 51');
    }
    report.checks.push({ key, probe, passed: true });
    if (locale === 'tr' || width === 390) await page.screenshot({ path: path.join(output, `${phase}-${key}.png`), animations: 'disabled' });
  }
  if (phase === 'after') {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/tr`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, 'home-orange.png'), animations: 'disabled' });
    await page.locator('.to-language-trigger:visible').click();
    const checkmark = page.locator('.to-language-option[aria-selected="true"] .text-signal');
    await checkmark.waitFor();
    assert.equal(await checkmark.evaluate((node) => getComputedStyle(node).color), 'rgb(255, 255, 255)');
    const manifest = await (await page.request.get(`${baseUrl}/manifest.webmanifest`)).json();
    assert.equal(manifest.theme_color, '#C95016');
    report.checks.push({ key: 'language-checkmark-and-manifest', passed: true });
  }
} catch (error) {
  report.errors.push(error.message);
} finally {
  await browser.close();
  await writeFile(path.join(output, `${phase}.json`), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ phase, checks: report.checks.length, errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
