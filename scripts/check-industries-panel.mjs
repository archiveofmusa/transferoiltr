import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { chromium } from 'playwright';
import ts from 'typescript';
import sharp from 'sharp';

const root = process.cwd();
const output = path.join(root, 'docs/reference/industries-panel');
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const locales = ['tr', 'en', 'ru', 'ar'];
const slugs = ['offshore', 'savunma-sanayi', 'endustriyel-tesisler', 'rafineriler'];
const servicePath = '/hizmetler/4500-bar-test-merkezi';
await mkdir(output, { recursive: true });

async function walk(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]));
  return paths.flat();
}

async function protectedHashes() {
  const directories = ['public/assets/brand', 'public/assets/transfer-oil', 'public/fonts', 'src/content/transferoil', 'src/data/transferoil'];
  const files = [
    'transferoil_link_manifest.json', 'netlify.toml', 'src/data/sectors.ts', 'src/data/sectorContent.ts',
    'src/data/serviceContact.ts', 'src/data/testCenter.ts', 'src/config/contact.ts', 'src/data/brand.ts',
    'src/components/Hero.tsx', 'src/components/TestCenterPage.tsx', 'src/components/TestCenterTeaser.tsx',
    'src/components/ContactForm.tsx', 'src/app/[locale]/iletisim/page.tsx', 'src/app/sitemap.ts',
    'src/i18n/metadata.ts', 'src/styles/transferoil-typography.css', 'src/styles/transferoil-motion.css',
    'src/styles/transferoil-theme.css', 'tailwind.config.ts',
  ];
  for (const directory of directories) {
    try { files.push(...await walk(directory)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const hashes = {};
  for (let index = 0; index < files.length; index += 8) {
    await Promise.all(files.slice(index, index + 8).map(async (file) => {
      try { hashes[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }));
    if (index % 512 === 0) console.log(`Baseline hashes: ${index}/${files.length}`);
  }
  return hashes;
}

if (process.argv.includes('--baseline')) {
  const baseline = {
    createdAt: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    gitStatus: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }),
    protectedHashes: await protectedHashes(),
  };
  await writeFile(path.join(output, 'before.json'), JSON.stringify(baseline, null, 2));
  console.log(JSON.stringify({ baseline: 'saved', protectedFiles: Object.keys(baseline.protectedHashes).length }));
  process.exit(0);
}

if (process.argv.includes('--baseline-screenshots')) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${baseUrl}/tr`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, 'before-desktop-home.png') });
    await page.locator('[data-sector-section]').screenshot({ path: path.join(output, 'before-sectors.png') });
    await page.goto(`${baseUrl}/tr/urunler`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, 'before-products.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/tr`, { waitUntil: 'networkidle' });
    await page.locator('.to-mobile-trigger').click();
    await page.screenshot({ path: path.join(output, 'before-mobile-menu.png') });
  } finally { await browser.close(); }
  console.log('Baseline screenshots saved.');
  process.exit(0);
}

const report = { checkedAt: new Date().toISOString(), baseUrl, checks: [], errors: [] };
let recoverAfterFailure = async () => {};
const orderingSource = await readFile(path.join(root, 'src/lib/productPresentation.ts'), 'utf8');
const orderingModule = { exports: {} };
runInNewContext(ts.transpileModule(orderingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: orderingModule, exports: orderingModule.exports }, { timeout: 1000 });
const ordering = orderingModule.exports;
async function check(name, action) {
  try {
    const details = await action(); report.checks.push({ name, passed: true, ...(details || {}) });
    if (report.checks.length % 10 === 0) console.log(`QA progress: ${report.checks.length} passed, ${report.errors.length} failed`);
  } catch (error) {
    report.errors.push({ name, error: error.message });
    console.log(`FAIL: ${name}: ${error.message.slice(0, 1200)}`);
    await recoverAfterFailure();
  }
}

await check('Preserved source, brand, media, approved sector/test copy, contact, SEO and deployment configuration', async () => {
  const before = JSON.parse(await readFile(path.join(output, 'before.json'), 'utf8'));
  const changed = [];
  const presentationOnlyExceptions = [];
  const entries = Object.entries(before.protectedHashes);
  for (let start = 0; start < entries.length; start += 8) {
    await Promise.all(entries.slice(start, start + 8).map(async ([file, hash]) => {
      const bytes = await readFile(path.join(root, file));
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (file === 'src/components/Hero.tsx' && actual !== hash) {
        // This component also contains portfolio cards. Allow only their shared sorting
        // wrapper/import; compare every remaining byte so slider/media/motion stay intact.
        const source = execFileSync('git', ['show', `${before.commit}:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
        const expected = source
          .replace("import { ProductFinderDrawer } from '@/components/ProductFinderDrawer';", "import { ProductFinderDrawer } from '@/components/ProductFinderDrawer';\nimport { sortPortfolio } from '@/lib/productPresentation';")
          .replace('  const categories = [', '  const categories = sortPortfolio([')
          .replace('  ];\n\n  const beginSlideChange', '  ], (category) => category.key);\n\n  const beginSlideChange');
        assert.equal(bytes.toString('utf8').replaceAll('\r\n', '\n'), expected, 'Hero changes are limited to category sorting');
        presentationOnlyExceptions.push(file);
        return;
      }
      if (actual !== hash) changed.push(file);
    }));
  }
  assert.deepEqual(changed, []);
  return { files: Object.keys(before.protectedHashes).length, unchangedHashFiles: entries.length - presentationOnlyExceptions.length, presentationOnlyExceptions };
});

await check('Four licensed representative photos, four-language alt text, verified local derivatives without upscaling', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'public/assets/sectors/asset-manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.assets), slugs);
  assert.equal(new Set(Object.values(manifest.assets).map((asset) => asset.originalUrl)).size, 4);
  let derivatives = 0;
  for (const [slug, asset] of Object.entries(manifest.assets)) {
    assert.equal(asset.slug, slug);
    assert.equal(asset.commercialUseAllowed, true);
    assert(asset.sourceUrl.startsWith('https://') && asset.licenseUrl.startsWith('https://') && asset.license);
    assert(locales.every((locale) => asset.localizedAlt[locale]?.trim()));
    for (const variant of asset.variants) {
      const bytes = await readFile(path.join(root, 'public', variant.src));
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
      assert.equal(metadata.format, 'webp');
      assert(variant.width <= asset.downloadedWidth && variant.height <= asset.downloadedHeight);
      assert(Math.abs(variant.width / variant.height - asset.sourceWidth / asset.sourceHeight) < 0.01);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256);
      derivatives++;
    }
  }
  return { photos: 4, derivatives };
});

if (!process.argv.includes('--build-only')) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  const panel = page.locator('[data-industries-panel]');
  recoverAfterFailure = async () => {
    if (await panel.isVisible()) await page.keyboard.press('Escape');
  };
  const trigger = () => page.locator('[data-industries-trigger]:visible').first();
  const menuKeys = ['uhp', 'hidrolik', 'endustriyel', 'kurumsal', 'test-center'];
  const panelLabels = { tr: 'Endüstriler', en: 'Industries', ru: 'Отрасли', ar: 'القطاعات' };
  const serviceLabels = { tr: '4.500 Bar Test Merkezi', en: '4,500 Bar Test Center', ru: 'Испытательный центр 4500 бар', ar: 'مركز اختبار بضغط 4500 بار' };
  async function visit(route) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, `HTTP status for ${route}`);
  }
  async function closePanel() {
    if (await panel.isVisible()) await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
  }
  async function openPanel() {
    await trigger().click();
    await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
  }
  async function panelGeometry() {
    const state = await panel.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, innerWidth, innerHeight, dir: getComputedStyle(node).direction, fullscreen: Boolean(document.fullscreenElement), modal: node.matches(':modal') };
    });
    assert(Math.abs(state.x) <= 1 && Math.abs(state.y) <= 1, JSON.stringify(state));
    assert(Math.abs(state.width - state.innerWidth) <= 1 && Math.abs(state.height - state.innerHeight) <= 1, JSON.stringify(state));
    assert.equal(state.fullscreen, false);
    assert.equal(state.modal, true);
    return state;
  }
  async function noOverflow() {
    const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, html: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert(widths.body <= widths.viewport + 1 && widths.html <= widths.viewport + 1, JSON.stringify(widths));
  }
  try {
    for (const locale of locales) {
      await check(`${locale}: desktop bars, DOM order, social links, independent Industries trigger`, async () => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await visit(`/${locale}`);
        assert.deepEqual(await page.locator('[data-main-key]:visible').evaluateAll((nodes) => nodes.map((node) => node.dataset.mainKey)), menuKeys);
        assert.equal((await trigger().innerText()).trim(), panelLabels[locale]);
        assert.equal(await trigger().evaluate((node) => Boolean(node.closest('.to-utility-bar'))), true);
        const serviceLink = page.locator('[data-main-key="test-center"]');
        assert.equal(await serviceLink.evaluate((node) => node.tagName), 'A');
        assert.equal(await serviceLink.getAttribute('href'), `/${locale}${servicePath}`);
        assert.equal((await serviceLink.innerText()).trim(), serviceLabels[locale]);
        assert.equal(await serviceLink.getAttribute('aria-haspopup'), null);
        assert.equal(await page.locator('header .to-utility-bar').count(), 1);
        assert.equal(await page.locator('header .to-main-bar').count(), 1);
        assert.deepEqual(await page.locator('.to-home-category-card').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))), [`/${locale}/uhp`, `/${locale}/hidrolik`, `/${locale}/endustriyel`]);
        for (const href of ['https://it.linkedin.com/company/transfer-oil-s-p-a-', 'https://www.youtube.com/user/TransferOil']) {
          const link = page.locator(`header a[href="${href}"]:visible`);
          assert.equal(await link.count(), 1);
          assert.equal(await link.getAttribute('target'), '_blank');
          assert.match(await link.getAttribute('rel'), /noopener/);
        }
        await noOverflow();
        if (locale === 'tr') await page.screenshot({ path: path.join(output, 'desktop-header.png') });
      });
      await check(`${locale}: full viewport, sector order, image delivery, approved descriptions, native modality`, async () => {
        await page.locator('[data-main-key="uhp"]').hover();
        await openPanel();
        const geometry = await panelGeometry();
        assert.equal(geometry.dir, locale === 'ar' ? 'rtl' : 'ltr');
        assert.equal(await page.locator('.to-mega-menu:visible').count(), 0);
        assert.deepEqual(await panel.locator('[data-sector-card]').evaluateAll((nodes) => nodes.map((node) => node.dataset.sectorCard)), slugs);
        await page.waitForFunction(() => [...document.querySelectorAll('[data-industries-panel] [data-sector-card] img')].every((image) => image.complete && image.naturalWidth > 0));
        const cards = await panel.locator('[data-sector-card]').evaluateAll((nodes) => nodes.map((node) => {
          const image = node.querySelector('img'); const rect = node.getBoundingClientRect();
          return { href: node.getAttribute('href'), description: node.querySelector('p')?.textContent, image: image?.getAttribute('src'), alt: image?.alt, width: image?.naturalWidth, complete: image?.complete, sizes: image?.sizes || node.querySelector('source')?.sizes, x: rect.x, y: rect.y };
        }));
        assert.equal(new Set(cards.map((card) => card.image)).size, 4);
        assert.equal(new Set(cards.map((card) => Math.round(card.y))).size, 1, 'Four desktop cards in one row');
        for (let i = 0; i < cards.length; i++) {
          assert.equal(cards[i].href, `/${locale}/sektorler/${slugs[i]}`);
          assert(cards[i].complete && cards[i].width > 200 && cards[i].alt && cards[i].sizes && cards[i].description);
        }
        assert(locale !== 'ar' ? cards[0].x < cards[1].x : cards[0].x > cards[1].x, 'Visual reading order');
        assert(await panel.locator('a[href*="teknik-destek"],a[href^="mailto:"]').count() > 0);
        assert(await page.locator('[data-industries-close]').isVisible());
        assert(await panel.evaluate((node) => node.contains(document.activeElement)));
        await page.locator('.to-logo-link').evaluate((node) => node.focus());
        assert(await panel.evaluate((node) => node.contains(document.activeElement)), 'Native modal prevents background focus');
        const focusables = panel.locator('button:not([disabled]),a[href]');
        await focusables.last().focus(); await page.keyboard.press('Tab');
        assert(await panel.evaluate((node) => node.contains(document.activeElement)), 'Tab remains inside');
        await focusables.first().focus(); await page.keyboard.press('Shift+Tab');
        assert(await panel.evaluate((node) => node.contains(document.activeElement)), 'Shift+Tab remains inside');
        await panel.evaluate((node) => { node.scrollTop = 0; });
        await page.screenshot({ path: path.join(output, `${locale}-industries-panel.png`) });
        await closePanel();
        assert(await trigger().evaluate((node) => node === document.activeElement), 'Escape returns trigger focus');
        return { geometry, images: cards.map((card) => ({ src: card.image, alt: card.alt, naturalWidth: card.width })) };
      });
      await check(`${locale}: scroll lock, close-button restoration and no background scroll`, async () => {
        await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
        await page.waitForTimeout(100);
        const before = await page.evaluate(() => ({ scrollY, overflow: document.body.style.overflow, position: document.body.style.position }));
        await openPanel();
        const locked = await page.evaluate(() => ({ scrollY, overflow: document.body.style.overflow, position: document.body.style.position }));
        assert(locked.overflow === 'hidden' || locked.position === 'fixed', 'Body scroll lock');
        await page.mouse.move(20, 500); await page.mouse.wheel(0, 350); await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => scrollY), locked.scrollY);
        await page.locator('[data-industries-close]').click();
        await panel.waitFor({ state: 'hidden' });
        const after = await page.evaluate(() => ({ scrollY, overflow: document.body.style.overflow, position: document.body.style.position }));
        assert.deepEqual(after, before);
        assert(await trigger().evaluate((node) => node === document.activeElement));
      });
      await check(`${locale}: header remains two rows without overflow at intermediate breakpoints`, async () => {
        for (const width of [1024, 1280]) {
          await page.setViewportSize({ width, height: 1000 });
          await visit(`/${locale}`);
          await noOverflow();
          const helperCount = await page.locator('[data-industries-trigger]:visible').count();
          assert.equal(helperCount, 1, `Exactly one visible Industries control at ${width}`);
          if (width >= 1280) assert.deepEqual(await page.locator('[data-main-key]:visible').evaluateAll((nodes) => nodes.map((node) => node.dataset.mainKey)), menuKeys);
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      });
      for (const [route, key] of [['/uhp', 'uhp'], ['/hidrolik', 'hidrolik'], ['/endustriyel', 'endustriyel'], ['/kurumsal/about-us', 'kurumsal'], [servicePath, 'test-center']]) {
        await check(`${locale}${route}: correct active primary item`, async () => {
          await visit(`/${locale}${route}`);
          assert.deepEqual(await page.locator('[data-main-key][data-active="true"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.mainKey)), [key]);
        });
      }
      await check(`${locale}: test centre direct navigation and same-route language switching`, async () => {
        await visit(`/${locale}`);
        await page.locator('[data-main-key="test-center"]').click();
        await page.waitForURL(`**/${locale}${servicePath}`);
        assert(await page.locator('main h1').isVisible());
        if (locale === 'tr') await page.screenshot({ path: path.join(output, 'test-centre-navigation.png') });
        const target = locales[(locales.indexOf(locale) + 1) % locales.length];
        await page.locator('.to-language-trigger:visible').click();
        await page.getByRole('option').nth(locales.indexOf(target)).click();
        await page.waitForURL(`**/${target}${servicePath}`);
      });
      for (const [index, slug] of slugs.entries()) {
        await check(`${locale}: panel card ${slug} routes and unlocks body`, async () => {
          await visit(`/${locale}/sektorler`);
          await openPanel();
          const image = await panel.locator(`[data-sector-card="${slug}"] img`).getAttribute('src');
          await panel.locator(`[data-sector-card="${slug}"]`).click();
          await page.waitForURL(`**/${locale}/sektorler/${slug}`);
          await panel.waitFor({ state: 'hidden' });
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
          assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');
          assert(await page.locator('main h1').isVisible());
          const images = await page.locator('main img').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
          const extractSrc = (src) => src?.startsWith('/_next/image') ? new URL(src, baseUrl).searchParams.get('url') : src;
          assert(images.some((src) => extractSrc(src) === extractSrc(image)), 'Detail intro reuses sector registry image');
          if (index === 0) {
            const nextLocale = locales[(locales.indexOf(locale) + 1) % locales.length];
            await page.locator('.to-language-trigger:visible').click();
            await page.getByRole('option').nth(locales.indexOf(nextLocale)).click();
            await page.waitForURL(`**/${nextLocale}/sektorler/${slug}`);
          }
        });
      }
      for (const width of [320, 390, 768]) {
        await check(`${locale}: responsive ${width}px menu and scrollable fullscreen panel`, async () => {
          await page.setViewportSize({ width, height: 844 });
          await visit(`/${locale}`);
          await noOverflow();
          await page.locator('.to-mobile-trigger').click();
          assert.deepEqual(await page.locator('[data-mobile-main-key]').evaluateAll((nodes) => nodes.map((node) => node.dataset.mobileMainKey)), menuKeys);
          await trigger().click(); await panel.waitFor({ state: 'visible' });
          await page.waitForTimeout(250);
          await panelGeometry();
          assert.equal(await page.locator('#transferoil-mobile-menu:visible').count(), 0);
          assert(await page.locator('[data-industries-close]').isVisible());
          const cards = await panel.locator('[data-sector-card]').evaluateAll((nodes) => nodes.map((node) => ({ x: Math.round(node.getBoundingClientRect().x), y: Math.round(node.getBoundingClientRect().y) })));
          assert.equal(new Set(cards.map((card) => card.y)).size, width < 640 ? 4 : 2);
          assert.equal(new Set(cards.map((card) => card.x)).size, width < 640 ? 1 : 2);
          const scrolling = await panel.evaluate((node) => {
            const target = [node, ...node.querySelectorAll('*')].find((candidate) => candidate.scrollHeight > candidate.clientHeight + 10 && /(auto|scroll)/.test(getComputedStyle(candidate).overflowY));
            if (!target) return false;
            target.scrollTop = target.scrollHeight; return target.scrollTop > 0;
          });
          assert(scrolling, 'Panel has its own scroll container');
          const closeBox = await page.locator('[data-industries-close]').boundingBox();
          assert(closeBox && closeBox.y >= 0 && closeBox.y + closeBox.height <= 844, 'Close remains visible after scrolling');
          await noOverflow();
          if (width === 390 && ['tr', 'ar'].includes(locale)) {
            await panel.evaluate((node) => { for (const candidate of [node, ...node.querySelectorAll('*')]) candidate.scrollTop = 0; });
            await page.screenshot({ path: path.join(output, `${locale}-mobile-industries-panel.png`) });
          }
          await closePanel();
          assert(await trigger().evaluate((node) => node === document.activeElement));
        });
      }
    }
    await check('Reduced motion preference and route/unmount cleanup', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await visit('/tr'); await openPanel();
      const durations = await panel.evaluate((node) => ({ animation: getComputedStyle(node).animationDuration, transition: getComputedStyle(node).transitionDuration }));
      const seconds = (value) => value.split(',').map((part) => Number.parseFloat(part));
      assert([...seconds(durations.animation), ...seconds(durations.transition)].every((value) => value <= 0.01));
      await visit('/en/sektorler/offshore');
      assert.equal(await panel.isVisible(), false);
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });
    await check('UHP product/category screenshot', async () => {
      await visit('/tr/uhp');
      await page.screenshot({ path: path.join(output, 'hose-first-categories.png') });
      await visit('/tr/urunler');
      await page.screenshot({ path: path.join(output, 'hose-first-products.png') });
    });
    for (const locale of locales) {
      await check(`${locale}: Enter/Space opening and SPA Back close modal without leaving scroll locked`, async () => {
        await visit(`/${locale}/sektorler`);
        for (const key of ['Enter', 'Space']) {
          await trigger().focus();
          await page.keyboard.press(key);
          await panel.waitFor({ state: 'visible' });
          await closePanel();
          assert(await trigger().evaluate((node) => node === document.activeElement));
        }
        await page.locator('main [data-sector-card="offshore"]').click();
        await page.waitForURL(`**/${locale}/sektorler/offshore`);
        await openPanel();
        await page.goBack({ waitUntil: 'networkidle' });
        await page.waitForURL(`**/${locale}/sektorler`);
        await panel.waitFor({ state: 'hidden' });
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
        assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');
      });
      await check(`${locale}: registry category cards retain hierarchy and hose-first ordering`, async () => {
        const registry = JSON.parse(await readFile(path.join(root, 'src/data/transferoil/routes.generated.json'), 'utf8')).routes;
        const byId = new Map(registry.map((route) => [route.id, route]));
        for (const routePath of ['/uhp', '/hidrolik/very-high-pressure', '/endustriyel/fuel/h2']) {
          const route = registry.find((item) => item.routePath === routePath);
          const expected = Array.from(ordering.sortRegistryPresentation(route.childIds, (id) => id), (id) => `/${locale}${byId.get(id).routePath}`);
          await visit(`/${locale}${routePath}`);
          const links = await page.locator('main section[aria-label] a[href]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
          const actual = links.filter((href) => expected.includes(href));
          assert.deepEqual(actual, expected, routePath);
        }
      });
      await check(`${locale}: filtered product list and user sorting retain hose-first groups`, async () => {
        await visit(`/${locale}/urunler`);
        const familyRanks = { helix: 0, inserts: 1, adapters: 2, ferrules: 3, accessories: 4, certificates: 5 };
        for (const sort of ['reference', 'name', 'pressure', 'family']) {
          await page.locator('select').filter({ has: page.locator('option[value="reference"]') }).selectOption(sort);
          const families = await page.locator('[data-product-family]').evaluateAll((nodes) => nodes.map((node) => node.dataset.productFamily));
          assert.equal(families[0], 'helix');
          for (let i = 1; i < families.length; i++) assert(familyRanks[families[i - 1]] <= familyRanks[families[i]], JSON.stringify({ sort, families }));
        }
        await visit(`/${locale}/urunler?family=adapters`);
        const adapters = await page.locator('[data-product-family]').evaluateAll((nodes) => nodes.map((node) => node.dataset.productFamily));
        assert(adapters.length > 0 && adapters.every((family) => family === 'adapters'));
        await visit(`/${locale}/urunler?family=inserts`);
        const fittings = await page.locator('[data-product-family]').evaluateAll((nodes) => nodes.map((node) => node.dataset.productFamily));
        assert(fittings.length > 0 && fittings.every((family) => family === 'inserts'));
      });
      await check(`${locale}: product finder sorts before first 48 results and category options`, async () => {
        await visit(`/${locale}`);
        await page.locator('button[aria-controls="transfer-oil-product-finder"]').click();
        const finder = page.locator('#transfer-oil-product-finder');
        await finder.waitFor({ state: 'visible' });
        const results = await finder.locator('[data-finder-result-id]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.finderResultId)));
        assert.equal(results.length, 48);
        assert.equal(results[0], 233);
        assert(results.every((id) => ordering.registryPresentation(id).kind === 'hose'));
        const sections = await finder.locator('select').first().locator('option').evaluateAll((nodes) => nodes.map((node) => node.value));
        assert.deepEqual(sections.slice(1, 5), ['UHP', 'Hydraulic', 'Industrial', 'Fittings']);
        await finder.locator('select').first().selectOption('Fittings');
        const filtered = await finder.locator('[data-finder-result-id]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.finderResultId)));
        assert(filtered.length > 0 && filtered.every((id) => ordering.registryPresentation(id).portfolio === 'fittings'));
        assert(filtered.every((id) => ordering.registryPresentation(id).kind !== 'hose'));
        await page.keyboard.press('Escape');
      });
    }
    await check('No browser runtime errors', () => assert.deepEqual(runtimeErrors, []));
  } finally { await browser.close(); }
}

await writeFile(path.join(output, 'check.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.checks.length, errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
