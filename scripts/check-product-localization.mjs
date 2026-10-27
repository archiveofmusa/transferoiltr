import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const output = path.join(root, 'docs/reference/product-localization');
const locales = ['tr', 'en', 'ru', 'ar'];
const sourceFile = 'src/data/transferoil/source-map.generated.json';
const source = JSON.parse(await readFile(path.join(root, sourceFile), 'utf8'));
const extractedPages = JSON.parse(await readFile(path.join(root, 'src/content/transferoil/pages.generated.json'), 'utf8')).pages;
const originalTitles = new Map(extractedPages.map((page) => [page.id, page.translations]));
const finderItems = JSON.parse(await readFile(path.join(root, 'src/data/transferoil/product-finder.generated.json'), 'utf8')).items;
const catalogue = source.rows.filter((row) => ['Fittings', 'Hydraulic', 'Industrial', 'UHP'].includes(row.mainSection));
const rawFiles = [sourceFile, 'src/data/transferoil/routes.generated.json', 'transferoil_link_manifest.json'];
const report = { baseUrl, checkedAt: new Date().toISOString(), catalogueRecords: catalogue.length, renderedChecks: [], uiChecks: [], errors: [] };
const sx = catalogue.find((row) => row.title === 'SXD - EXTRA TOUGH COVER WITH INTERNAL SPIRAL');
assert(sx, 'SXD source record must exist');
await mkdir(output, { recursive: true });

// Source URLs, product identity and routes must not change as a translation shortcut.
for (const relative of rawFiles) {
  const baseline = execFileSync('git', ['show', `HEAD:${relative}`], { cwd: root }).toString('utf8').replace(/\r\n/g, '\n');
  const current = (await readFile(path.join(root, relative), 'utf8')).replace(/\r\n/g, '\n');
  assert.equal(current, baseline, `Raw source/route file changed: ${relative}`);
}

const englishDescription = /\b(?:HOSE MENDER|KINK PROTECTOR|MULTILINE HOSE SPLITTER|SPARE BLADE|GO NO GO GAUGE|FEMALE HEAVY|FEMALE LIGHT|STANDPIPE|FERRULES?|NON CONDUCTIVE|HEAVY DUTY HYDRAULIC|HYBRID REINFORCEMENT|ANTIABRASION|TWO STEEL BRAIDS|STEEL BRAID|TWIN HOSE|JACK HOSE|TUBE STUB|MALE O-RING BOSS|WATER DELIVERY HOSE|GLAND NUT|TELESCOPIC SKIVING TOOL|WARNING LABEL|BEND RESTRICTOR|EXTRA TOUGH COVER WITH INTERNAL SPIRAL|PVC CLEAR PROTECTION JACKET|HOSE ARRESTOR|STAINLESS STEEL|PROOF TEST FEMALE|COMPACT ONE PIECE|DOUBLE COVER|NO HEXAGON|PROTECTION JACKET|HOSE INSTALLATION GUIDELINES)\b/i;
const turkishDescription = /(?:İç Spiral|Dış Kaplama|Çelik Örgü|Yüksükler|İkiz Hortum|Bağlantı Elemanları|Sabit Basınç|Yüksek Basınç|Hortum Montaj)/;
const technicalToken = /\b(?:\d[A-Z0-9.+]*[A-Z][A-Z0-9.+]*|[A-Z]{2,}\d[A-Z0-9/-]*|SAE|DIN|BSPP|BSPT|NPTF?|NPSM|JIC|DKOS|DKOL|PTFE|HELIX|CNG|LPG|ORFS|ORB|CP|NEO|MARINER|YACHTING|HYDRO-CHEM|HORTITECH|WATERFLOW|ECOLOGY)\b/g;
const browser = await chromium.launch({ headless: true });
const parser = await browser.newPage();

try {
  // Read prerendered HTML, not embedded RSC/source strings that are intentionally untranslated.
  const cases = catalogue.flatMap((row) => locales.map((locale) => ({ row, locale })));
  for (let start = 0; start < cases.length; start += 20) {
    const batch = await Promise.all(cases.slice(start, start + 20).map(async ({ row, locale }) => ({
      id: row.id, locale, sourceTitle: row.title, route: `/${locale}${row.routePath}`,
      html: await readFile(path.join(root, '.next/server/app', `${locale}${row.routePath}.html`), 'utf8'),
    })));
    const parsed = await parser.evaluate((items) => items.map((item) => {
      const doc = new DOMParser().parseFromString(item.html, 'text/html');
      const main = doc.querySelector('main');
      main?.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
      return { id: item.id, locale: item.locale, sourceTitle: item.sourceTitle, route: item.route,
        heading: main?.querySelector('h1')?.textContent?.trim() ?? '',
        text: main?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        lang: doc.documentElement.lang, dir: doc.documentElement.dir,
      };
    }), batch);
    for (const item of parsed) {
      const errors = [];
      if (!item.heading) errors.push('Missing product/category heading');
      if (item.lang !== item.locale) errors.push(`Wrong document language: ${item.lang}`);
      if (item.locale === 'ar' && item.dir !== 'rtl') errors.push('Arabic RTL missing');
      const code = item.sourceTitle.match(/^([A-Za-z0-9]+)\s+-\s+/)?.[1];
      if (code && !item.heading.startsWith(`${code} - `)) errors.push(`Product code changed: ${code}`);
      const tokens = [...new Set(item.sourceTitle.match(technicalToken) || [])];
      for (const token of tokens) if (!item.heading.toUpperCase().includes(token)) errors.push(`Technical series/code removed: ${token}`);
      const englishLeak = item.locale === 'tr' ? item.text.match(englishDescription)?.[0] : null;
      if (englishLeak) errors.push(`Untranslated English description: ${englishLeak}`);
      const turkishLeak = item.locale === 'en' ? item.text.match(turkishDescription)?.[0] : null;
      if (turkishLeak) errors.push(`Turkish description on English page: ${turkishLeak}`);
      report.renderedChecks.push({ route: item.route, locale: item.locale, originalTitle: originalTitles.get(item.id)?.[item.locale]?.title, heading: item.heading, passed: errors.length === 0 });
      for (const error of errors) report.errors.push({ route: item.route, error });
    }
  }

  if (!process.argv.includes('--build-only')) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => report.errors.push({ route: page.url(), error: error.message }));
    async function check(name, action) {
      try { await action(); report.uiChecks.push({ name, passed: true }); }
      catch (error) { report.errors.push({ name, error: error.message }); }
    }
    async function visit(route) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(response.status(), 200, route);
      await page.locator('main h1').waitFor();
    }
    const expected = {
      tr: /SXD - İç Spiral Takviyeli Ekstra Dayanıklı Dış Kaplama/,
      en: /SXD - Extra Tough Cover with Internal Spiral/i,
      ru: /SXD - .*спирал.*прочн|SXD - .*прочн.*спирал/i,
      ar: /SXD - .*لولب|SXD - .*حلزون/,
    };
    for (const locale of locales) {
      await check(`${locale}: SXD detail, breadcrumb, table codes and locale`, async () => {
        await visit(`/${locale}${sx.routePath}`);
        assert.match(await page.locator('main h1').innerText(), expected[locale]);
        const breadcrumb = page.locator('main [aria-current="page"]');
        assert.match(await breadcrumb.innerText(), expected[locale]);
        const main = await page.locator('main').innerText();
        for (let index = 1; index <= 8; index++) assert(main.includes(`SXD00${index}`));
        if (locale === 'tr') assert(!englishDescription.test(main));
        if (locale === 'en') assert(!turkishDescription.test(main));
        await page.screenshot({ path: path.join(output, `sxd-${locale}.png`), fullPage: true, animations: 'disabled' });
      });
    }
    await check('TR category card title/summary and related items', async () => {
      await visit('/tr/uhp/accessories');
      const main = page.locator('main');
      assert.match(await main.innerText(), expected.tr);
      assert(!englishDescription.test(await main.innerText()));
      await page.screenshot({ path: path.join(output, 'category-tr.png'), fullPage: true, animations: 'disabled' });
    });
    await check('TR listing descriptions and legacy product names', async () => {
      await visit('/tr/urunler');
      await page.locator('main article').first().waitFor({ state: 'visible' });
      const text = await page.locator('main').innerText();
      assert(!/\bferrules?\b/i.test(text), 'Use the reviewed Turkish term yüksük rather than ferrule');
      assert(!/\b(?:UHP Ferrules|UHP Accessories|UHP Certificates|Male \| Male|Female \| Female|External Cone|Flat Seal)\b/i.test(text));
      await page.screenshot({ path: path.join(output, 'listing-tr.png'), fullPage: true, animations: 'disabled' });
    });
    await check('TR mega menu uses localized SXD name', async () => {
      await page.locator('button[aria-controls="transferoil-menu-uhp"]').hover();
      const menu = page.locator('#transferoil-menu-uhp');
      await menu.waitFor({ state: 'visible' });
      assert.match(await menu.innerText(), expected.tr);
      assert(!englishDescription.test(await menu.innerText()));
      await page.screenshot({ path: path.join(output, 'uhp-menu-tr.png'), animations: 'disabled' });
      await page.keyboard.press('Escape');
    });
    await check('TR homepage product-category card terminology', async () => {
      await page.mouse.move(1200, 900);
      await visit('/tr');
      assert(!/\bferrules?\b/i.test(await page.locator('main').innerText()), 'Category-card description must use yüksük');
      await page.screenshot({ path: path.join(output, 'home-header-tr.png'), animations: 'disabled' });
    });
    await check('TR product finder translated result and family', async () => {
      await page.mouse.move(1200, 900);
      await visit('/tr');
      await page.keyboard.press('Escape');
      await page.locator('.to-product-finder-tab').click();
      const dialog = page.locator('#transfer-oil-product-finder');
      await dialog.waitFor({ state: 'visible' });
      assert.match(await dialog.locator('input').nth(1).getAttribute('placeholder'), /Yüksek Basınç/i, 'TR family example must be localized');
      assert(!/High Pressure|\bferrules?\b/i.test((await dialog.locator('input').evaluateAll((inputs) => inputs.map((input) => input.getAttribute('placeholder') || ''))).join(' ')), 'TR finder examples must not retain English descriptions');
      await dialog.locator('input').first().fill('SXD');
      await page.waitForFunction(() => document.querySelector('#transfer-oil-product-finder ul')?.textContent?.includes('SXD'));
      assert.match(await dialog.innerText(), expected.tr);
      assert(!englishDescription.test(await dialog.innerText()));
      await page.screenshot({ path: path.join(output, 'finder-tr.png'), animations: 'disabled' });
      const connectionSelect = dialog.locator('select').last();
      assert.equal(await connectionSelect.locator('option[value="Standpipe"]').innerText(), 'Boru Ucu');
      await dialog.locator('input').first().fill('');
      await connectionSelect.selectOption('Standpipe');
      assert.equal(await connectionSelect.inputValue(), 'Standpipe', 'Filter key must remain the original technical value');
      const allowedRoutes = finderItems.filter((item) => item.c.includes('Standpipe')).map((item) => `/tr${item.r}`);
      assert(allowedRoutes.length > 0);
      await page.waitForFunction((allowed) => {
        const links = [...document.querySelectorAll('#transfer-oil-product-finder ul a')];
        return links.length > 0 && links.every((link) => allowed.includes(link.getAttribute('href')));
      }, allowedRoutes);
      assert(!/\b(?:Standpipe|Flat Seal|Metric)\b/.test(await dialog.innerText()), 'Connection descriptions must use Turkish display labels');
      await page.screenshot({ path: path.join(output, 'finder-connection-tr.png'), animations: 'disabled' });
      await page.keyboard.press('Escape');
      for (const [locale, expression] of [['en', /High Pressure/], ['ru', /высокое давление/i], ['ar', /ضغط.*عال/]]) {
        await page.mouse.move(1200, 900);
        await visit(`/${locale}`);
        await page.locator('.to-product-finder-tab').click();
        const localizedDialog = page.locator('#transfer-oil-product-finder');
        await localizedDialog.waitFor({ state: 'visible' });
        const placeholder = await localizedDialog.locator('input').nth(1).getAttribute('placeholder');
        assert.match(placeholder, expression, `${locale} family example must be localized`);
        if (locale !== 'en') {
          const examples = await localizedDialog.locator('input').evaluateAll((inputs) => inputs.map((input) => input.getAttribute('placeholder') || ''));
          assert(!/High Pressure|\bferrules?\b/i.test(examples.join(' ')), `${locale} finder examples must not retain English descriptions`);
        }
        await page.screenshot({ path: path.join(output, `finder-${locale}-placeholders.png`), animations: 'disabled' });
        await page.keyboard.press('Escape');
      }
    });
    await check('Mobile TR header and long localized title fit viewport', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await visit(`/tr${sx.routePath}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const logo = page.locator('header img[src*="uhphortum-logo"]').first();
      assert(await logo.isVisible());
      await page.screenshot({ path: path.join(output, 'mobile-header-tr.png'), animations: 'disabled' });
    });
    await page.close();
  }
} finally {
  await browser.close();
  report.changedTitleCounts = Object.fromEntries(locales.map((locale) => [locale, report.renderedChecks.filter((item) => item.locale === locale && item.heading !== item.originalTitle).length]));
  await writeFile(path.join(output, 'check.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ catalogueRecords: catalogue.length, renderedChecks: report.renderedChecks.length, changedTitleCounts: report.changedTitleCounts, uiChecks: report.uiChecks.length, errorCount: report.errors.length, firstErrors: report.errors.slice(0, 30) }, null, 2));
if (report.errors.length) process.exitCode = 1;
