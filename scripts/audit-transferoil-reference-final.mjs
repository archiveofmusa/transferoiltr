import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'transferoil_link_manifest.json');
const referenceRoot = path.join(root, 'docs', 'reference');
const screenshotRoot = path.join(referenceRoot, 'screenshots', 'reference-final');
const reportPath = path.join(referenceRoot, 'reference-audit.json');
const sourceCacheRoot = path.join(root, '.cache', 'transferoil', 'source-html');

const EXPECTED_SOURCE_ROWS = 343;
const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

const normalizeUrl = (value) => {
  const url = new URL(value);
  url.hash = '';
  return url.href;
};

const asPosix = (value) => value.replaceAll(path.sep, '/');
const relativeToRoot = (value) => asPosix(path.relative(root, value));

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest() {
  if (!(await pathExists(manifestPath))) {
    throw new Error('transferoil_link_manifest.json proje kökünde bulunamadı. Denetim yalnız kökteki tek kaynak doğruluk dosyasını kullanır.');
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const rows = Array.isArray(manifest) ? manifest : manifest.rows;
  if (!Array.isArray(rows)) throw new Error('Manifest içinde rows dizisi bulunamadı.');

  const urls = rows.map((row) => normalizeUrl(row.sourceUrl));
  const uniqueUrls = new Set(urls);
  const ids = new Set(rows.map((row) => row.id));

  if (rows.length !== EXPECTED_SOURCE_ROWS || uniqueUrls.size !== EXPECTED_SOURCE_ROWS || ids.size !== EXPECTED_SOURCE_ROWS) {
    throw new Error(`Manifest sayımı geçersiz: satır=${rows.length}, benzersiz URL=${uniqueUrls.size}, benzersiz id=${ids.size}. Beklenen ${EXPECTED_SOURCE_ROWS}.`);
  }

  return { manifest, rows, allowlist: uniqueUrls };
}

function findReferenceRows(rows) {
  const bySourcePath = (fragment) => rows.find((row) => row.sourcePath?.toLowerCase().includes(fragment.toLowerCase()));
  const bySectionRoot = (section) => rows.find((row) => row.mainSection === section && row.pageType === 'Kategori / seri');
  const firstProduct = (section) => rows.find((row) => row.mainSection === section && ['Ürün', 'UHP fitting', 'Insert'].includes(row.pageType));

  const candidates = [
    ['home', rows.find((row) => row.pageType === 'Ana sayfa')],
    ['company', bySourcePath('/about-us.aspx')],
    ['hydraulic-category', bySectionRoot('Hydraulic')],
    ['industrial-category', bySectionRoot('Industrial')],
    ['uhp-category', bySectionRoot('UHP')],
    ['product-detail', firstProduct('Hydraulic') ?? firstProduct('Industrial') ?? firstProduct('UHP')],
    ['news', bySourcePath('/news.aspx')],
    ['exhibitions', bySourcePath('/exhibitions.aspx')],
    ['certificates', bySourcePath('/rd-quality-certificates.aspx')],
    ['contact', rows.find((row) => row.pageType === 'İletişim sayfası')],
  ];

  const seen = new Set();
  return candidates.flatMap(([key, row]) => {
    if (!row || seen.has(row.id)) return [];
    seen.add(row.id);
    return [{ key, row }];
  });
}

function rgbToHex(value) {
  const match = String(value ?? '').match(/rgba?\(([^)]+)\)/i);
  if (!match) return value || 'NEEDS_MANUAL_PICK';
  const values = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (values.length < 3 || values.slice(0, 3).some(Number.isNaN)) return value || 'NEEDS_MANUAL_PICK';
  const [red, green, blue, alpha = 1] = values;
  const hex = `#${[red, green, blue].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return alpha < 1 ? `${hex} @ ${Number(alpha.toFixed(3))}` : hex;
}

function colorValue(value) {
  return { rgb: value || 'NEEDS_MANUAL_PICK', hex: rgbToHex(value) };
}

async function gotoAllowlisted(page, url, allowlist) {
  const normalized = normalizeUrl(url);
  if (!allowlist.has(normalized)) throw new Error(`Allowlist dışı sayfa isteği engellendi: ${url}`);

  let response = null;
  let acquisitionMode = 'direct-playwright';
  let directError = null;
  try {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        response = await page.goto(url, { waitUntil: 'commit', timeout: 25_000 });
        await page.waitForTimeout(1_100);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(attempt * 450);
      }
    }
    if (lastError) throw lastError;
  } catch (error) {
    directError = error instanceof Error ? error.message : String(error);
    const usableDom = await page.evaluate(() => (document.body?.textContent?.trim().length ?? 0) > 500).catch(() => false);
    if (!usableDom) {
      acquisitionMode = 'allowlisted-html-fallback';
      const sourceRow = [...allowlist].indexOf(normalized) + 1;
      const cachePath = sourceRow > 0
        ? path.join(sourceCacheRoot, `${String(sourceRow).padStart(3, '0')}.html`)
        : null;
      let html = cachePath && await pathExists(cachePath) ? await readFile(cachePath, 'utf8') : null;
      let fallbackStatus = html ? 200 : null;
      let fallbackError = null;
      if (!html) {
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 35_000);
          try {
            const fallback = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
              },
            });
            if (!fallback.ok) throw new Error(`Fallback HTTP ${fallback.status}`);
            html = await fallback.text();
            fallbackStatus = fallback.status;
            if (cachePath) {
              await mkdir(sourceCacheRoot, { recursive: true });
              await writeFile(cachePath, html, 'utf8');
            }
            fallbackError = null;
            break;
          } catch (fetchError) {
            fallbackError = fetchError;
            await page.waitForTimeout(attempt * 700);
          } finally {
            clearTimeout(timer);
          }
        }
      }
      if (fallbackError || !html) throw fallbackError ?? new Error('Fallback HTML alınamadı.');
      const sanitized = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
      const withBase = sanitized.replace(/<head([^>]*)>/i, `<head$1><base href="${url}">`);
      await page.goto('about:blank', { waitUntil: 'commit', timeout: 10_000 });
      await page.setContent(withBase, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1_100);
      response = { status: fallbackStatus };
    } else {
      acquisitionMode = 'direct-playwright-timeout-dom-usable';
    }
  }

  const blocked = await page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    return /just a moment|enable javascript and cookies|attention required|access denied/i.test(text);
  });
  if (blocked) throw new Error('Kaynak sayfa güvenlik/ara ekranı nedeniyle ölçülemedi.');

  return {
    status: typeof response?.status === 'function' ? response.status() : response?.status ?? null,
    finalUrl: page.url(),
    title: await page.title(),
    acquisitionMode,
    directError,
  };
}

async function inspectComputedStyles(page) {
  return page.evaluate(() => {
    const NEEDS = 'NEEDS_MANUAL_PICK';
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const exactText = (text, yMin = 0, yMax = Number.POSITIVE_INFINITY) => Array.from(document.querySelectorAll('a, button, span, div, h1, h2, h3, p'))
      .find((element) => element.textContent?.trim() === text && visible(element) && element.getBoundingClientRect().y >= yMin && element.getBoundingClientRect().y <= yMax) ?? null;
    const opaqueAncestor = (element) => {
      let current = element;
      while (current && current !== document.body) {
        const value = getComputedStyle(current).backgroundColor;
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') return current;
        current = current.parentElement;
      }
      return element?.parentElement ?? null;
    };
    const style = (element) => {
      if (!element) return null;
      const css = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        backgroundColor: css.backgroundColor,
        color: css.color,
        borderColor: css.borderColor,
        borderBottomColor: css.borderBottomColor,
        fontFamily: css.fontFamily,
        fontSize: css.fontSize,
        fontWeight: css.fontWeight,
        lineHeight: css.lineHeight,
        letterSpacing: css.letterSpacing,
        padding: css.padding,
        margin: css.margin,
        gap: css.gap,
        transitionDuration: css.transitionDuration,
        transitionTimingFunction: css.transitionTimingFunction,
        opacity: css.opacity,
      };
    };

    const topLink = exactText('Exhibitions', 0, 120) ?? exactText('News', 0, 120);
    const company = exactText('Company', 35, 180);
    const topBar = opaqueAncestor(topLink);
    const lowerBar = opaqueAncestor(company);
    const logo = Array.from(document.images).find((image) => /transfer oil logo/i.test(image.alt || '') && visible(image))
      ?? Array.from(document.images).find((image) => /transferoil|transfer-oil/i.test(image.currentSrc || image.src) && visible(image))
      ?? null;
    const heroHeading = Array.from(document.querySelectorAll('h1, h2, h3')).find(visible) ?? null;
    const heroParagraph = Array.from(document.querySelectorAll('p')).find((element) => visible(element) && element.getBoundingClientRect().y > 120) ?? null;
    const primaryButton = Array.from(document.querySelectorAll('a, button')).find((element) => visible(element) && /read more|discover|scopri/i.test(element.textContent ?? '')) ?? null;
    const sliderCandidate = Array.from(document.querySelectorAll('[class*="slider" i], [class*="slide" i], [class*="carousel" i], video'))
      .filter(visible)
      .sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return rb.width * rb.height - ra.width * ra.height;
      })[0] ?? null;
    const navItems = ['Company', 'Sustainability', 'Hydraulic', 'Industrial', 'UHP']
      .map((label) => exactText(label, 35, 190))
      .filter(Boolean);
    const navRects = navItems.map((element) => element.getBoundingClientRect());
    const navHorizontalGaps = navRects.slice(1).map((rect, index) => Math.round(rect.left - navRects[index].right));
    const fonts = Array.from(document.fonts ?? []).map((font) => ({
      family: font.family,
      style: font.style,
      weight: font.weight,
      status: font.status,
    }));
    const stylesheets = Array.from(document.styleSheets).map((sheet) => sheet.href).filter(Boolean);

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      colors: {
        topBarOrange: style(topBar)?.backgroundColor ?? NEEDS,
        lowerNavGrey: style(lowerBar)?.backgroundColor ?? NEEDS,
        activeOrange: style(topBar)?.backgroundColor ?? NEEDS,
        mainText: style(document.body)?.color ?? NEEDS,
        mutedText: style(heroParagraph)?.color ?? NEEDS,
        border: style(lowerBar)?.borderBottomColor ?? NEEDS,
        heroTitle: style(heroHeading)?.color ?? NEEDS,
        heroSubtitle: style(heroParagraph)?.color ?? NEEDS,
        buttonBackground: style(primaryButton)?.backgroundColor ?? NEEDS,
        buttonText: style(primaryButton)?.color ?? NEEDS,
      },
      typography: {
        body: style(document.body),
        utilityLink: style(topLink),
        navLink: style(company),
        heroHeading: style(heroHeading),
        heroParagraph: style(heroParagraph),
        button: style(primaryButton),
        loadedFonts: fonts,
        stylesheetSources: stylesheets,
      },
      geometry: {
        topBar: style(topBar),
        lowerNav: style(lowerBar),
        logo: style(logo),
        slider: style(sliderCandidate),
        navHorizontalGaps,
      },
      motion: {
        slider: style(sliderCandidate) ? {
          duration: style(sliderCandidate).transitionDuration,
          easing: style(sliderCandidate).transitionTimingFunction,
        } : NEEDS,
        button: style(primaryButton) ? {
          duration: style(primaryButton).transitionDuration,
          easing: style(primaryButton).transitionTimingFunction,
        } : NEEDS,
      },
      breakpoints: {
        note: 'Responsive breakpoint değerleri dört zorunlu viewport görüntüsü ve görünür navigasyon durumu ile ölçülür.',
        currentDesktopNavVisible: visible(company),
      },
    };
  });
}

async function capturePage(page, reference, viewport, navigation) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.waitForTimeout(240);
  const filePath = path.join(screenshotRoot, `${reference.key}-${viewport.name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled', timeout: 20_000 });

  const responsiveState = await page.evaluate(() => ({
    desktopNavVisible: Array.from(document.querySelectorAll('a')).some((element) => element.textContent?.trim() === 'Company' && element.getBoundingClientRect().width > 0),
    bodyDirection: getComputedStyle(document.body).direction,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  return {
    id: reference.row.id,
    sourceUrl: reference.row.sourceUrl,
    viewport,
    screenshot: relativeToRoot(filePath),
    ...navigation,
    responsiveState,
  };
}

async function captureMegaMenu(page, label, key, homeUrl, allowlist) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const navigation = await gotoAllowlisted(page, homeUrl, allowlist);
  const trigger = await page.evaluate((wanted) => {
    const candidates = Array.from(document.querySelectorAll('a'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return element.textContent?.trim() === wanted && rect.width > 0 && rect.height > 0 && rect.y >= 55 && rect.y <= 180;
      });
    if (candidates.length !== 1) return { count: candidates.length };
    const rect = candidates[0].getBoundingClientRect();
    return { count: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, label);
  if (trigger.count !== 1) throw new Error(`${label} mega menü tetikleyicisi alt navigasyonda benzersiz bulunamadı (adet: ${trigger.count}).`);
  await page.mouse.move(trigger.x, trigger.y, { steps: 8 });
  await page.waitForTimeout(500);
  const filePath = path.join(screenshotRoot, `mega-menu-${key}-1920x1080.png`);
  await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: 1920, height: 760 }, animations: 'disabled', timeout: 20_000 });

  const metrics = await page.evaluate((activeLabel) => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const candidates = Array.from(document.querySelectorAll('[class*="menu" i], [class*="dropdown" i], [class*="mega" i]'))
      .filter((element) => visible(element) && element.getBoundingClientRect().y >= 60 && element.getBoundingClientRect().height > 140)
      .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height);
    const overlay = candidates[0] ?? null;
    if (!overlay) return { label: activeLabel, overlay: 'NEEDS_MANUAL_PICK' };
    const rect = overlay.getBoundingClientRect();
    const css = getComputedStyle(overlay);
    const columnCandidates = Array.from(overlay.children).filter(visible);
    return {
      label: activeLabel,
      overlay: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        opacity: css.opacity,
        backgroundColor: css.backgroundColor,
        transitionDuration: css.transitionDuration,
        transitionTimingFunction: css.transitionTimingFunction,
        visibleChildColumns: columnCandidates.length,
        columnWidths: columnCandidates.map((element) => Math.round(element.getBoundingClientRect().width)).filter(Boolean),
      },
    };
  }, label);

  return { key, label, screenshot: relativeToRoot(filePath), ...navigation, metrics };
}

async function main() {
  const startedAt = new Date().toISOString();
  const { manifest, rows, allowlist } = await loadManifest();
  const references = findReferenceRows(rows);
  const home = references.find((reference) => reference.key === 'home');
  if (!home) throw new Error('Manifestte Ana sayfa kaydı bulunamadı.');

  await mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() === 'font') await route.abort();
    else await route.continue();
  });
  const page = await context.newPage();
  const captures = [];
  const captureFailures = [];
  const menus = [];

  try {
    await gotoAllowlisted(page, home.row.sourceUrl, allowlist);
    const computed = await inspectComputedStyles(page);
    computed.colors = Object.fromEntries(Object.entries(computed.colors).map(([key, value]) => [key, colorValue(value)]));

    for (const reference of references) {
      let navigation;
      try {
        await page.setViewportSize({ width: 1920, height: 1080 });
        navigation = await gotoAllowlisted(page, reference.row.sourceUrl, allowlist);
      } catch (error) {
        for (const viewport of viewports) {
          captureFailures.push({
            id: reference.row.id,
            key: reference.key,
            sourceUrl: reference.row.sourceUrl,
            viewport: viewport.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      for (const viewport of viewports) {
        try {
          captures.push(await capturePage(page, reference, viewport, navigation));
        } catch (error) {
          captureFailures.push({
            id: reference.row.id,
            key: reference.key,
            sourceUrl: reference.row.sourceUrl,
            viewport: viewport.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    for (const menu of [
      ['Company', 'company'],
      ['Hydraulic', 'hydraulic'],
      ['Industrial', 'industrial'],
      ['UHP', 'uhp'],
    ]) {
      try {
        menus.push(await captureMegaMenu(page, menu[0], menu[1], home.row.sourceUrl, allowlist));
      } catch (error) {
        captureFailures.push({
          key: `mega-menu-${menu[1]}`,
          sourceUrl: home.row.sourceUrl,
          viewport: '1920x1080',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      startedAt,
      policy: {
        sourceOfTruth: 'transferoil_link_manifest.json',
        officialPageNavigation: 'Manifest allowlist only',
        copiedCssOrJs: false,
        screenshotMode: 'Viewport screenshot; animations disabled only during capture',
      },
      manifest: {
        schemaVersion: manifest.schemaVersion ?? null,
        expectedSourceRows: EXPECTED_SOURCE_ROWS,
        mappedSourceRows: rows.length,
        uniqueSourceUrls: allowlist.size,
        selectedReferencePages: references.length,
      },
      measuredFrom: home.row.sourceUrl,
      computed,
      captures,
      menus,
      failures: captureFailures,
      summary: {
        expectedScreenshots: references.length * viewports.length + 4,
        screenshotsCreated: captures.length + menus.length,
        failedCaptures: captureFailures.length,
        pass: captureFailures.length === 0,
      },
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ report: relativeToRoot(reportPath), ...report.summary }, null, 2));
    if (captureFailures.length) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
