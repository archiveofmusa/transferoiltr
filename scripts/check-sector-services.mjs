import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { chromium } from 'playwright';
import ts from 'typescript';

const root = process.cwd();
const output = path.join(root, 'docs/reference/sector-services');
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const siteUrl = 'https://uhphortum.com';
const locales = ['tr', 'en', 'ru', 'ar'];
const slugs = ['offshore', 'savunma-sanayi', 'endustriyel-tesisler', 'rafineriler'];
const servicePath = '/hizmetler/4500-bar-test-merkezi';
const paths = ['/sektorler', ...slugs.map((slug) => `/sektorler/${slug}`), servicePath];
const email = 'info@uhphortum.com';
const updateDate = '2026-10-28';
const baseline = JSON.parse(await readFile(path.join(output, 'before.json'), 'utf8'));
const buildOnly = process.argv.includes('--build-only');
const report = { checkedAt: new Date().toISOString(), baseUrl, baselineCommit: baseline.commit, buildChecks: [], uiChecks: [], warnings: [], errors: [] };
await mkdir(output, { recursive: true });

async function check(group, name, action) {
  try {
    const details = await action();
    report[group].push({ name, passed: true, ...(details || {}) });
  } catch (error) {
    report.errors.push({ name, error: error.message });
  }
}

await check('buildChecks', 'Protected brand, media, products, routes, contact and configuration', async () => {
  const entries = Object.entries(baseline.protectedHashes);
  const changed = [];
  for (let start = 0; start < entries.length; start += 8) {
    await Promise.all(entries.slice(start, start + 8).map(async ([file, expected]) => {
      const hash = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
      if (hash !== expected) changed.push(file);
    }));
  }
  assert.deepEqual(changed, [], 'Protected files changed');
  return { files: entries.length };
});

await check('buildChecks', 'Editorial exclusivity guard remains unverified', async () => {
  const source = await readFile(path.join(root, 'src/data/testCenter.ts'), 'utf8');
  assert.match(source, /maxTestPressureBar:\s*4500/);
  assert.match(source, /exclusiveClaimVerified:\s*false/);
  assert.match(source, /requestedHeadline:\s*['"]Türkiye’nin Tek 4\.500 Bar Test Merkezi['"]/);
});

await check('buildChecks', 'Contact context allowlist rejects arbitrary sector and service values', async () => {
  async function loadLocalModule(file, dependencies = {}) {
    const source = await readFile(path.join(root, file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const moduleState = { exports: {} };
    runInNewContext(compiled, {
      module: moduleState,
      exports: moduleState.exports,
      require: (id) => {
        assert(Object.hasOwn(dependencies, id), `Unexpected test dependency ${id}`);
        return dependencies[id];
      },
    }, { filename: file, timeout: 1000 });
    return moduleState.exports;
  }
  const sectors = await loadLocalModule('src/data/sectors.ts');
  const copy = await loadLocalModule('src/data/sectorContent.ts');
  const contact = await loadLocalModule('src/config/contact.ts');
  const { serviceContactHref } = await loadLocalModule('src/data/serviceContact.ts', {
    '@/config/contact': contact,
    '@/data/sectorContent': copy,
    '@/data/sectors': sectors,
  });
  for (const locale of locales) {
    const fallback = serviceContactHref(locale);
    assert.equal(serviceContactHref(locale, { sector: '__proto__', service: 'unknown' }), fallback);
    assert.equal(serviceContactHref(locale, { sector: 'offshore\r\nBcc:other@example.com' }), fallback);
    assert.equal(serviceContactHref(locale, { service: 'pressure-test&recipient=other@example.com' }), fallback);
    for (const slug of slugs) {
      const href = serviceContactHref(locale, { sector: slug });
      const url = new URL(href);
      assert.equal(url.pathname, email);
      assert.equal(url.searchParams.get('subject'), copy.sectorServiceCopy[locale].sectors[slug].emailSubject);
      assert.equal(url.searchParams.get('body'), copy.sectorServiceCopy[locale].sectors[slug].emailBody);
    }
    const test = new URL(serviceContactHref(locale, { service: 'pressure-test' }));
    assert.equal(test.pathname, email);
    assert.equal(test.searchParams.get('subject'), copy.sectorServiceCopy[locale].test.emailSubject);
    assert.equal(test.searchParams.get('body'), copy.sectorServiceCopy[locale].test.emailBody);
  }
});

const browser = await chromium.launch({ headless: true });
const parser = await browser.newPage();
const relatedLinks = new Set();
const titles = new Set();
const descriptions = new Set();
const contactContexts = Object.fromEntries(locales.map((locale) => [locale, new Set()]));
const forbiddenClaim = /Türkiye[’']nin\s+[Tt]ek\s+4[.,]500|Turkey[’']s\s+only\s+4[.,]500|единственн[\p{L}]*\s+(?:в\s+Турции|центр)|المركز\s+الوحيد\s+في\s+تركيا/iu;
const turkishLeak = /Sektörü İncele|Projeniz İçin Teknik Destek Alın|Test Hizmeti Hakkında Bilgi Alın|Test uygulanabilirliği ve koşulları|Hortum ve Bağlantı Çözümleri/;

try {
  for (const locale of locales) {
    for (const routePath of paths) {
      const route = `/${locale}${routePath}`;
      await check('buildChecks', `${route}: prerendered content, metadata, breadcrumbs and contact`, async () => {
        const html = await readFile(path.join(root, '.next/server/app', `${route.slice(1)}.html`), 'utf8');
        const data = await parser.evaluate((source) => {
          const doc = new DOMParser().parseFromString(source, 'text/html');
          const main = doc.querySelector('main');
          const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent));
          main?.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
          return {
            lang: doc.documentElement.lang, dir: doc.documentElement.dir,
            headings: [...(main?.querySelectorAll('h1') || [])].map((node) => node.textContent.trim()),
            text: main?.textContent.replace(/\s+/g, ' ').trim() || '',
            title: doc.querySelector('title')?.textContent || '',
            description: doc.querySelector('meta[name="description"]')?.content || '',
            canonical: doc.querySelector('link[rel="canonical"]')?.href,
            alternates: Object.fromEntries([...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => [link.hreflang, link.href])),
            ogUrl: doc.querySelector('meta[property="og:url"]')?.content,
            ogTitle: doc.querySelector('meta[property="og:title"]')?.content,
            ogDescription: doc.querySelector('meta[property="og:description"]')?.content,
            ogImage: doc.querySelector('meta[property="og:image"]')?.content,
            robots: doc.querySelector('meta[name="robots"]')?.content,
            links: [...(main?.querySelectorAll('a[href]') || [])].map((link) => ({ href: link.getAttribute('href'), text: link.textContent.trim() })),
            forms: main?.querySelectorAll('form').length || 0,
            schemas,
          };
        }, html);
        assert.equal(data.lang, locale);
        assert.equal(data.dir, locale === 'ar' ? 'rtl' : 'ltr');
        assert.equal(data.headings.length, 1, 'Exactly one H1 per page');
        assert(data.headings[0].length > 8);
        assert(data.text.length > 250, 'Meaningful content must exist in initial HTML');
        assert(data.title.includes('UHPHORTUM'));
        assert.equal(data.title.match(/UHPHORTUM/g)?.length, 1, 'Brand duplicated in title');
        assert(data.description.length > 40);
        assert(!titles.has(data.title), `Duplicate title: ${data.title}`);
        assert(!descriptions.has(data.description), `Duplicate description: ${data.description}`);
        titles.add(data.title);
        descriptions.add(data.description);
        assert.equal(data.canonical, `${siteUrl}${route}`);
        for (const alternate of locales) assert.equal(data.alternates[alternate], `${siteUrl}/${alternate}${routePath}`);
        assert.equal(data.alternates['x-default'], `${siteUrl}/tr${routePath}`);
        assert.equal(data.ogUrl, data.canonical);
        assert.equal(data.ogTitle, data.title);
        assert.equal(data.ogDescription, data.description);
        assert(data.ogImage?.startsWith(`${siteUrl}/`));
        assert(!data.robots?.includes('noindex'), 'New page must be indexable');
        assert(!forbiddenClaim.test(`${data.text} ${data.title} ${data.description} ${JSON.stringify(data.schemas)}`), 'Unverified exclusivity claim published');
        if (locale !== 'tr') assert(!turkishLeak.test(`${data.text} ${data.title} ${data.description}`), 'Turkish UI leaked into another locale');
        const flatSchemas = data.schemas.flatMap((schema) => Array.isArray(schema) ? schema : schema['@graph'] || [schema]);
        const breadcrumbs = flatSchemas.find((schema) => schema['@type'] === 'BreadcrumbList');
        assert(breadcrumbs?.itemListElement?.length >= 2, 'BreadcrumbList missing');
        assert.equal(breadcrumbs.itemListElement.at(-1).item, data.canonical);
        assert.equal(data.forms, 0, 'New requests must not use the frontend-only demo form');
        const mails = data.links.filter((link) => link.href.startsWith('mailto:'));
        assert(mails.length > 0, 'Direct email contact missing');
        const contextual = mails.filter((link) => link.href.includes('?'));
        assert(contextual.length > 0, 'Localized email context missing');
        for (const link of contextual) {
          const uri = new URL(link.href);
          assert.equal(uri.pathname, email);
          assert(uri.searchParams.get('subject')?.length > 8);
          assert(uri.searchParams.get('body')?.length > 30);
          assert(link.href.includes('%'), 'Email context must be URL encoded');
        }
        if (routePath !== '/sektorler') {
          const context = new URL(contextual[0].href).searchParams.toString();
          assert(!contactContexts[locale].has(context), 'Distinct sectors/services need distinct email context');
          contactContexts[locale].add(context);
        }
        assert(!data.links.some((link) => /^(?:tel:|https?:\/\/(?:wa\.me|api\.whatsapp\.com))/.test(link.href)));
        assert(!data.text.includes('info.trk@transferoil.com'));
        for (const link of data.links) {
          if (link.href.startsWith(`/${locale}/`) && !link.href.includes('?') && !link.href.includes('#')) relatedLinks.add(link.href);
        }
        if (routePath === servicePath) {
          assert(/4[.,\s\u00a0]?500/.test(data.headings[0]), '4500 bar capacity is missing or ambiguous');
          assert(!flatSchemas.some((schema) => /Product|Offer|AggregateRating/.test(schema['@type'] || '')));
        }
        return { h1: data.headings[0], title: data.title, canonical: data.canonical };
      });
    }
  }

  await check('buildChecks', 'Sitemap preserves all old URLs and adds all 24 locale pages', async () => {
    const xml = await readFile(path.join(root, '.next/server/app/sitemap.xml.body'), 'utf8');
    const entries = await parser.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, 'application/xml');
      return [...doc.querySelectorAll('url')].map((node) => ({
        url: node.querySelector('loc')?.textContent,
        lastModified: node.querySelector('lastmod')?.textContent || '',
        alternates: Object.fromEntries([...node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')].map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])),
      }));
    }, xml);
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
    assert.equal(byUrl.size, entries.length, 'Duplicate sitemap URLs');
    for (const url of baseline.sitemapUrls) assert(byUrl.has(url), `Existing URL removed: ${url}`);
    for (const locale of locales) {
      for (const routePath of paths) {
        const url = `${siteUrl}/${locale}${routePath}`;
        const entry = byUrl.get(url);
        assert(entry, `New URL missing: ${url}`);
        assert(entry.lastModified.startsWith(updateDate), 'Content update date must be fixed');
        assert.equal(entry.alternates['x-default'], `${siteUrl}/tr${routePath}`);
        for (const alternate of locales) assert.equal(entry.alternates[alternate], `${siteUrl}/${alternate}${routePath}`);
      }
    }
    assert.equal(entries.length, baseline.sitemapUrls.length + 24, 'Unexpected sitemap URL additions/removals');
    return { preserved: baseline.sitemapUrls.length, added: 24, total: entries.length };
  });

  if (!buildOnly) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => report.errors.push({ name: page.url(), error: error.message }));
    async function visit(route, status = 200) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 60000 });
      assert.equal(response.status(), status, route);
      if (status === 200) {
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
      }
    }
    async function hydrated() {
      await page.waitForLoadState('networkidle', { timeout: 20000 });
    }
    for (const locale of locales) {
      for (const routePath of paths) {
        const route = `/${locale}${routePath}`;
        await check('uiChecks', `${route}: direct navigation and refresh`, async () => {
          await visit(route);
          const response = await page.reload({ waitUntil: 'load' });
          assert.equal(response.status(), 200);
          assert.equal(await page.locator('main h1').count(), 1);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          assert.equal(await page.locator('main a a, main a button').count(), 0, 'Nested interactive elements');
          assert.equal(await page.locator('a[href^="tel:"], a[href*="wa.me"]').count(), 0);
          const capture = (locale === 'tr' && ['/sektorler/offshore', servicePath].includes(routePath))
            || (locale === 'en' && routePath === '/sektorler/savunma-sanayi')
            || (locale === 'ru' && routePath === servicePath);
          if (capture) await page.screenshot({ path: path.join(output, `${locale}-${routePath.split('/').at(-1)}.png`), fullPage: true, animations: 'disabled' });
        });
      }
      await check('uiChecks', `${locale}: unknown sector is a real 404`, async () => visit(`/${locale}/sektorler/does-not-exist`, 404));
      await check('uiChecks', `${locale}: one ordered homepage sector section and test teaser`, async () => {
        await visit(`/${locale}`);
        const section = page.locator('[data-sector-section]');
        assert.equal(await section.count(), 1);
        assert.deepEqual(await section.locator('[data-sector-card]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-sector-card'))), slugs);
        for (const slug of slugs) assert.equal(await section.locator(`[data-sector-card="${slug}"]`).getAttribute('href'), `/${locale}/sektorler/${slug}`);
        assert.equal(await section.locator('a[href*="?application="]').count(), 0);
        const teaser = page.locator('[data-test-center-teaser]');
        assert.equal(await teaser.count(), 1);
        assert.equal(await teaser.locator(`a[href="/${locale}${servicePath}"]`).count(), 1);
        const cards = await section.locator('[data-sector-card]').evaluateAll((items) => items.map((item) => ({ x: item.getBoundingClientRect().x, y: item.getBoundingClientRect().y })));
        assert.equal(new Set(cards.map((card) => Math.round(card.y))).size, 1, 'Desktop must have four cards on one row');
        assert(await section.evaluate((node) => Boolean(node.nextElementSibling?.hasAttribute('data-test-center-teaser'))), 'Test teaser must directly follow sectors');
        assert.equal(await page.locator(`footer a[href="/${locale}/sektorler"]`).count(), 1);
        assert.equal(await page.locator(`footer a[href="/${locale}${servicePath}"]`).count(), 1);
        if (locale === 'tr') {
          await section.scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, 'tr-home-sectors.png'), animations: 'disabled' });
          await teaser.scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, 'tr-home-test-teaser.png'), animations: 'disabled' });
        }
      });
    }

    await check('uiChecks', 'All internal sector/service related links resolve', async () => {
      for (const href of relatedLinks) {
        const response = await page.request.get(`${baseUrl}${href}`);
        assert.equal(response.status(), 200, href);
      }
      return { links: relatedLinks.size };
    });

    for (const routePath of ['/sektorler/rafineriler', servicePath]) {
      await check('uiChecks', `Language switching retains ${routePath}`, async () => {
        await visit(`/tr${routePath}`);
        for (const locale of ['en', 'ru', 'ar', 'tr']) {
          await hydrated();
          await page.locator('.to-language-trigger:visible').click();
          await page.locator('.to-language-menu').waitFor();
          await page.locator('.to-language-option').nth(locales.indexOf(locale)).click();
          await page.waitForURL((url) => url.pathname === `/${locale}${routePath}`, { timeout: 30000 });
          assert.equal(await page.locator('html').getAttribute('lang'), locale);
        }
      });
    }

    await check('uiChecks', 'Desktop corporate submenu exposes new pages with keyboard navigation', async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await visit('/tr/sektorler');
      await hydrated();
      assert.equal(await page.locator('.to-main-link').count(), 4, 'Top-level navigation must stay unchanged');
      const trigger = page.locator('button[aria-controls="transferoil-menu-kurumsal"]');
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      const menu = page.locator('#transferoil-menu-kurumsal');
      await menu.waitFor();
      for (const routePath of paths) assert.equal(await menu.locator(`a[href="/tr${routePath}"]`).count(), 1);
      let focused = '';
      for (let step = 0; step < 40; step++) {
        focused = await page.evaluate(() => document.activeElement?.getAttribute('href'));
        if (focused === `/tr${servicePath}`) break;
        await page.keyboard.press('Tab');
      }
      assert.equal(focused, `/tr${servicePath}`, 'Test-center link must be reachable with Tab');
      await page.keyboard.press('Enter');
      await page.waitForURL((url) => url.pathname === `/tr${servicePath}`);
    });

    await check('uiChecks', 'Mobile corporate submenu retains existing menus and reaches sector pages', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await visit('/tr/sektorler');
      await hydrated();
      await page.locator('.to-mobile-trigger').focus();
      await page.keyboard.press('Enter');
      await page.locator('#transferoil-mobile-menu').waitFor();
      assert.equal(await page.locator('.to-mobile-section-trigger').count(), 4);
      await page.locator('button[aria-controls="transferoil-mobile-submenu-kurumsal"]').press('Enter');
      const submenu = page.locator('#transferoil-mobile-submenu-kurumsal');
      await submenu.waitFor();
      for (const routePath of paths) assert.equal(await submenu.locator(`a[href="/tr${routePath}"]`).count(), 1);
      await submenu.locator('a[href="/tr/sektorler/offshore"]').press('Enter');
      await page.waitForURL((url) => url.pathname === '/tr/sektorler/offshore');
      assert.equal(await page.locator('#transferoil-mobile-menu').count(), 0);
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    await check('uiChecks', 'Existing six application cards preserve original filter URLs', async () => {
      await visit('/tr/uygulamalar');
      const hrefs = await page.locator('main a[href*="?application="]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      assert.deepEqual(hrefs, baseline.applicationKeys.map((key) => `/tr/urunler?application=${key}`));
    });
    for (const [key, count] of Object.entries(baseline.legacyFilterCounts)) {
      await check('uiChecks', `Legacy application=${key} retains baseline result count`, async () => {
        await visit(`/tr/urunler?application=${key}`);
        await hydrated();
        assert.equal(await page.locator('main article').count(), count);
        if (count === 0) report.warnings.push(`application=${key} already had no matching product applicationIds before this task; behavior preserved.`);
      });
    }

    for (const width of [768, 390, 320]) {
      await check('uiChecks', `Homepage card layout at ${width}px`, async () => {
        await page.setViewportSize({ width, height: 844 });
        await visit('/tr');
        const cards = await page.locator('[data-sector-card]').evaluateAll((items) => items.map((item) => ({ x: Math.round(item.getBoundingClientRect().x), y: Math.round(item.getBoundingClientRect().y) })));
        assert.equal(cards.length, 4);
        assert.equal(new Set(cards.map((card) => card.y)).size, width >= 640 ? 2 : 4);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      });
    }
    for (const width of [320, 390]) {
      for (const locale of locales) {
        for (const routePath of paths) {
          await check('uiChecks', `${locale}${routePath}: no overflow at ${width}px`, async () => {
            await page.setViewportSize({ width, height: 844 });
            await visit(`/${locale}${routePath}`);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          });
        }
      }
    }
    for (const routePath of ['/sektorler/offshore', servicePath]) {
      await check('uiChecks', `Arabic mobile RTL ${routePath}`, async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await visit(`/ar${routePath}`);
        assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const logoTransform = await page.locator('.to-logo-link img').first().evaluate((node) => getComputedStyle(node).transform);
        assert(!logoTransform.includes('matrix(-1'), 'Logo must not be mirrored');
        await page.screenshot({ path: path.join(output, `ar-mobile-${routePath.split('/').at(-1)}.png`), fullPage: true, animations: 'disabled' });
      });
    }
    for (const width of [390, 320]) {
      await check('uiChecks', `Russian refinery long heading at ${width}px`, async () => {
        await page.setViewportSize({ width, height: 844 });
        await visit('/ru/sektorler/rafineriler');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, `ru-mobile-refineries-${width}.png`), animations: 'disabled' });
      });
    }
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, buildOnly ? 'build-check.json' : 'check.json'), `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify({ buildChecks: report.buildChecks.length, uiChecks: report.uiChecks.length, warnings: report.warnings, errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
