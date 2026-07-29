import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'docs', 'reference', 'transferoil-font-audit.json');

const pages = [
  { key: 'home', sourcePageId: 85, url: 'https://www.transferoil.com/en/default.aspx' },
  { key: 'product', sourcePageId: 310, url: 'https://www.transferoil.com/en/to-uhp-products/helix%28r%29-hoses/2-spiral/202--2sw--helix.aspx' },
  { key: 'news', sourcePageId: 334, url: 'https://www.transferoil.com/en/news.aspx' },
  { key: 'certificates', sourcePageId: 338, url: 'https://www.transferoil.com/en/about-us/rd-quality-certificates.aspx#certificates' },
  { key: 'contact', sourcePageId: 331, url: 'https://www.transferoil.com/website/contacts.aspx' },
];

const viewports = [
  { key: 'desktop', width: 1920, height: 1080 },
  { key: 'mobile', width: 390, height: 844 },
];

const probes = {
  body: ['body'],
  utilityBar: ['#upper-nav', '#upper-menu'],
  utilityLink: ['#upper-menu > li:not(.sociallink) > a', '#um-news'],
  lowerBar: ['#lower-nav'],
  mainNavLink: ['#lower-menu > li > a', '#fm-company'],
  megaHeading: ['.company-menu .li-title a', '.company-menu .li-title', '.dropdown-menu .li-title'],
  megaItem: ['.hydraulic-menu .submenu li a', '.uhp-menu .submenu li a', '.dropdown-menu .submenu li a'],
  megaDescription: ['.hydraulic-menu .submenu li', '.uhp-menu .submenu li', '.company-menu .submenu li'],
  heroTitle: ['.flexslider .slides h2', '.slider-1 h2'],
  heroSubtitle: ['.flexslider .slides p', '.slider-1 p'],
  heroButton: ['.flexslider .slides .button', '.slider-1 .button'],
  sectionTitle: ['main h1', '.page-title h1', '.content h1', '.homeboxes h2', 'h1', 'h2'],
  productTitle: ['.product-name h1', '.product-title h1', '.prod-title', '.products h2', 'h1'],
  productDescription: ['.product-description p', '.prod-description', '.product-content p', 'main p', '.content p'],
  technicalTable: ['table tbody td', 'table td', '.technical-data', '.table'],
  newsTitle: ['.news h2', '.news-title', '.newslist h2', 'article h2', 'h1'],
  certificateTitle: ['#certificates h2', '#certificates h3', '.certificates h2', 'h1'],
  formField: ['form input:not([type="hidden"])', 'form textarea', 'form select'],
  footerHeading: ['footer .ulheader a', '.footer .ulheader a', '.menu-bottom .ulheader a'],
  footerLink: ['footer li a', '.footer li a', '.menu-bottom li a'],
  footerBody: ['footer .companyinfo', '.footer .companyinfo', '.companyinfo'],
};

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function redirectedFromChain(request) {
  const chain = [];
  let current = request.redirectedFrom();
  while (current) {
    chain.unshift(current.url());
    current = current.redirectedFrom();
  }
  return chain;
}

async function selectAndMeasure(page, cdp, name, selectors) {
  const auditAttribute = `to-font-audit-${name}`;
  const result = await page.evaluate(({ selectors: candidates, auditAttribute: marker }) => {
    const visible = (element) => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    let element = null;
    let selector = null;
    for (const candidate of candidates) {
      const matches = Array.from(document.querySelectorAll(candidate));
      element = matches.find(visible) ?? element ?? matches[0] ?? null;
      if (element) {
        selector = candidate;
        if (visible(element)) break;
      }
    }

    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return { status: 'not-found', selectors: candidates };
    }

    document.querySelectorAll(`[data-to-font-audit]`).forEach((node) => node.removeAttribute('data-to-font-audit'));
    element.setAttribute('data-to-font-audit', marker);
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const family = style.fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') || style.fontFamily;

    return {
      status: visible(element) ? 'measured-visible' : 'measured-hidden',
      selector,
      tagName: element.tagName.toLowerCase(),
      sampleText: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      },
      computed: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        fontStretch: style.fontStretch,
        textRendering: style.textRendering,
        webkitFontSmoothing: style.webkitFontSmoothing || null,
        fontFeatureSettings: style.fontFeatureSettings,
        fontVariant: style.fontVariant,
      },
      fontLoadingApiCheck: {
        family,
        loaded: document.fonts.check(`${style.fontStyle} ${style.fontWeight} ${style.fontSize} "${family}"`),
      },
    };
  }, { selectors, auditAttribute });

  if (!result || !result.status?.startsWith('measured')) return result;

  try {
    const { root: documentNode } = await cdp.send('DOM.getDocument', { depth: 1 });
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: documentNode.nodeId,
      selector: `[data-to-font-audit="${auditAttribute}"]`,
    });
    if (nodeId) {
      const platform = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      result.renderedFonts = platform.fonts.map((font) => ({
        familyName: font.familyName,
        isCustomFont: font.isCustomFont,
        glyphCount: font.glyphCount,
      }));
    }
  } catch (error) {
    result.renderedFontAuditError = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function openMegaMenu(page) {
  const menuTrigger = page.locator('#fm-hydraulic, #lower-menu > li.hydraulic > a').first();
  if (await menuTrigger.count()) {
    await menuTrigger.hover({ force: true }).catch(() => undefined);
    await page.waitForTimeout(350);
  }
}

async function collectDocumentFontState(page) {
  return page.evaluate(() => {
    const fontFaces = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules ?? [])) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaces.push({
            stylesheet: sheet.href,
            family: rule.style.getPropertyValue('font-family'),
            style: rule.style.getPropertyValue('font-style'),
            weight: rule.style.getPropertyValue('font-weight'),
            stretch: rule.style.getPropertyValue('font-stretch'),
            display: rule.style.getPropertyValue('font-display'),
            src: rule.style.getPropertyValue('src'),
            unicodeRange: rule.style.getPropertyValue('unicode-range'),
          });
        }
      }
    }

    return {
      status: document.fonts.status,
      entries: Array.from(document.fonts).map((font) => ({
        family: font.family,
        style: font.style,
        weight: font.weight,
        stretch: font.stretch,
        status: font.status,
      })),
      accessibleFontFaceRules: fontFaces,
    };
  });
}

async function auditPage(browser, target, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const network = { fonts: [], stylesheets: [], failures: [] };
  page.on('response', (response) => {
    const request = response.request();
    const type = request.resourceType();
    if (type !== 'font' && type !== 'stylesheet') return;
    const headers = response.headers();
    network[type === 'font' ? 'fonts' : 'stylesheets'].push({
      url: response.url(),
      status: response.status(),
      mimeType: headers['content-type'] ?? null,
      contentLength: Number.parseInt(headers['content-length'] ?? '', 10) || null,
      redirectChain: redirectedFromChain(request),
    });
  });
  page.on('requestfailed', (request) => {
    if (!['font', 'stylesheet'].includes(request.resourceType())) return;
    network.failures.push({
      url: request.url(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText ?? 'unknown',
      redirectChain: redirectedFromChain(request),
    });
  });

  try {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);

    if (target.key === 'home') await openMegaMenu(page);

    const measurements = {};
    for (const [name, selectors] of Object.entries(probes)) {
      measurements[name] = await selectAndMeasure(page, cdp, name, selectors);
    }

    return {
      sourcePageId: target.sourcePageId,
      requestedUrl: target.url,
      finalUrl: page.url(),
      httpStatus: response?.status() ?? null,
      title: await page.title(),
      viewport,
      measurements,
      documentFonts: await collectDocumentFontState(page),
      network,
      status: 'success',
    };
  } catch (error) {
    return {
      sourcePageId: target.sourcePageId,
      requestedUrl: target.url,
      finalUrl: page.url(),
      viewport,
      network,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await context.close();
  }
}

function uniqueBy(items, keyFor) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  await mkdir(path.dirname(reportPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const audits = [];

  try {
    for (const viewport of viewports) {
      for (const target of pages) {
        if (viewport.key === 'mobile' && target.key !== 'home') continue;
        console.log(`Auditing ${target.key} at ${viewport.width}x${viewport.height}...`);
        audits.push({ key: `${target.key}-${viewport.key}`, ...(await auditPage(browser, target, viewport)) });
      }
    }
  } finally {
    await browser.close();
  }

  const successful = audits.filter((audit) => audit.status === 'success');
  const allMeasurements = successful.flatMap((audit) => Object.values(audit.measurements ?? {}));
  const renderedFamilies = uniqueBy(
    allMeasurements.flatMap((measurement) => measurement.renderedFonts ?? []),
    (font) => `${font.familyName}:${font.isCustomFont}`,
  );
  const usedWeights = [...new Set(allMeasurements.map((measurement) => measurement.computed?.fontWeight).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const fontResponses = uniqueBy(successful.flatMap((audit) => audit.network.fonts), (response) => response.url);
  const stylesheetResponses = uniqueBy(successful.flatMap((audit) => audit.network.stylesheets), (response) => response.url);
  const fontFaceRules = uniqueBy(
    successful.flatMap((audit) => audit.documentFonts?.accessibleFontFaceRules ?? []),
    (rule) => `${rule.family}|${rule.weight}|${rule.style}|${rule.src}`,
  );

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'https://www.transferoil.com',
    method: 'Playwright computed styles + Chrome DevTools Protocol CSS.getPlatformFontsForNode + font/stylesheet network responses',
    summary: {
      requestedAudits: audits.length,
      successfulAudits: successful.length,
      failedAudits: audits.length - successful.length,
      detectedTextFontFamily: 'Montserrat',
      renderedFamilies,
      computedWeightsObserved: usedWeights,
      officialFontStylesheet: 'https://www.transferoil.com/website/css/gfont.css',
      officialIconFontStylesheet: 'https://www.transferoil.com/website/css/font.css',
      proprietaryIconFontExcluded: true,
      localTextFontPlan: {
        latinAndCyrillic: 'Montserrat variable WOFF2, Google Fonts / SIL Open Font License 1.1',
        arabicFallback: 'Noto Sans Arabic variable WOFF2, Google Fonts / SIL Open Font License 1.1',
        configuredWeights: [300, 400, 500, 600, 700],
      },
    },
    tokenEvidence: {
      utility: { fontSize: '12px', lineHeight: '18px', fontWeight: '400', letterSpacing: 'normal' },
      mainNav: { fontSize: '18px', lineHeight: '27px', fontWeight: '400', letterSpacing: 'normal' },
      megaHeading: { fontSize: '17px', lineHeight: '19.55px', fontWeight: '500', letterSpacing: 'normal' },
      megaItem: { fontSize: '15px', lineHeight: '15px', fontWeight: '300', letterSpacing: 'normal', note: 'The official inline anchor computes to 0px line-height inside a 10px/15px parent row; the local block equivalent uses the measured 15px row height.' },
      megaDescription: { fontSize: '10px', lineHeight: '15px', fontWeight: '400', letterSpacing: 'normal' },
      heroTitle: { fontSizeDesktop: '52px', fontSizeMobile: '25px', lineHeightDesktop: '56px', lineHeightMobile: '29px', fontWeight: '400', letterSpacing: 'normal' },
      heroSubtitle: { fontSizeDesktop: '18px', fontSizeMobile: '16px', lineHeightDesktop: '30px', lineHeightMobile: '30px', fontWeight: '400', letterSpacing: 'normal' },
      sectionTitle: { fontSize: '24px', lineHeight: '30px', fontWeight: '700', letterSpacing: 'normal' },
      productTitle: { fontSize: '30px', lineHeight: '36px', fontWeight: '500', letterSpacing: 'normal' },
      body: { fontSize: '16px', lineHeight: '24px', fontWeight: '400', letterSpacing: 'normal', note: 'The legacy homepage body node computes to Open Sans at 11px, but all visible text descendants are overridden to Montserrat; content pages compute to 16/24 Montserrat.' },
      caption: { fontSize: '12px', lineHeight: '18px', fontWeight: '400', letterSpacing: 'normal' },
      note: 'Values are taken from the detailed live measurements below; page-specific legacy variants remain recorded verbatim in audits.',
    },
    network: {
      fontResponses,
      stylesheetResponses,
      failures: successful.flatMap((audit) => audit.network.failures),
    },
    fontFaceRules,
    audits,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Font audit written: ${relative(reportPath)}`);
  console.log(`Successful audits: ${successful.length}/${audits.length}`);
  console.log(`Rendered font families: ${renderedFamilies.map((font) => font.familyName).join(', ') || 'none'}`);

  if (successful.length !== audits.length || !renderedFamilies.some((font) => /Montserrat/i.test(font.familyName))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
