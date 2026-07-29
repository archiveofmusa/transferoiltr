import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceDir = path.join(root, 'docs', 'reference');
const sourceUrl = 'https://www.transferoil.com/en/.aspx';

const files = {
  fullPage: path.join(referenceDir, 'transferoil-home-full.png'),
  headerDesktop: path.join(referenceDir, 'transferoil-header-desktop.png'),
  uhpMegamenu: path.join(referenceDir, 'transferoil-uhp-megamenu.png'),
  audit: path.join(referenceDir, 'transferoil-header-audit.json'),
};

function colorToHex(color) {
  const match = color?.match(/rgba?\(([^)]+)\)/);
  if (!match) return color || 'NEEDS_MANUAL_PICK';
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) return 'NEEDS_MANUAL_PICK';
  const [red, green, blue, alpha = 1] = parts;
  const hex = `#${[red, green, blue].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return alpha < 1 ? `${hex} @ ${Number(alpha.toFixed(3))}` : hex;
}

function normalizeColor(raw) {
  return {
    raw: raw || 'NEEDS_MANUAL_PICK',
    hex: colorToHex(raw),
  };
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

async function main() {
  await mkdir(referenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  try {
    await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 35_000 });
    await page.waitForTimeout(800);

    const blocked = await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? '';
      const hasCompany = Array.from(document.querySelectorAll('a, button, span')).some((element) => element.textContent?.trim() === 'Company');
      return /enable javascript and cookies|just a moment|attention required/i.test(bodyText) || !hasCompany;
    });

    if (blocked) {
      throw new Error('Live Transfer Oil header was not available for computed-style inspection.');
    }

    await page.screenshot({ path: files.fullPage, fullPage: true });

    const audit = await page.evaluate(() => {
      const visible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const rectOf = (element) => {
        if (!visible(element)) return 'NEEDS_MANUAL_PICK';
        const rect = element.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      const cssOf = (element, pseudo) => {
        if (!element) return {};
        const styles = getComputedStyle(element, pseudo);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderBottomColor: styles.borderBottomColor,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
        };
      };

      const exactText = (text) => Array.from(document.querySelectorAll('a, button, span')).find((element) => element.textContent?.trim() === text && visible(element)) ?? null;

      const coloredAncestor = (element) => {
        let current = element;
        while (current && current !== document.body) {
          const styles = getComputedStyle(current);
          const background = styles.backgroundColor;
          if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return current;
          current = current.parentElement;
        }
        return element?.parentElement ?? null;
      };

      const company = exactText('Company');
      const sustainability = exactText('Sustainability');
      const exhibitions = exactText('Exhibitions');
      const contacts = exactText('Contacts');
      const english = exactText('English');
      const logo = Array.from(document.images).find((image) => image.alt === 'Transfer Oil Logo' && visible(image))
        ?? Array.from(document.images).find((image) => /TransferOil|logo/i.test(image.currentSrc || image.src) && visible(image))
        ?? null;
      const userIcon = Array.from(document.images).find((image) => image.alt === 'User' && visible(image)) ?? null;
      const searchInput = Array.from(document.querySelectorAll('input[placeholder*="Search" i], input[type="search"]')).find(visible) ?? null;
      const upperBar = coloredAncestor(exhibitions ?? english ?? logo);
      const mainBar = coloredAncestor(company ?? sustainability ?? searchInput);
      const headerBottom = Math.ceil(Math.max(
        upperBar?.getBoundingClientRect().bottom ?? 0,
        mainBar?.getBoundingClientRect().bottom ?? 0,
        138,
      ));

      const navLabels = ['Company', 'Sustainability', 'Hydraulic', 'Industrial', 'UHP', 'Fittings'];
      const navElements = navLabels
        .map((label) => exactText(label))
        .filter(Boolean)
        .filter((element) => visible(element) && element.getBoundingClientRect().y >= 70 && element.getBoundingClientRect().y < 155);
      const navRects = navElements.map((element) => element.getBoundingClientRect());
      const menuItemSpacing = navRects.slice(1).map((rect, index) => Math.round(rect.left - navRects[index].right));

      return {
        title: document.title,
        headerHeights: {
          topBar: Math.round(upperBar?.getBoundingClientRect().height ?? 0),
          mainNav: Math.round(mainBar?.getBoundingClientRect().height ?? 0),
          total: headerBottom,
        },
        logo: {
          rect: rectOf(logo),
          source: logo?.currentSrc || logo?.src || 'NEEDS_MANUAL_PICK',
          naturalWidth: logo?.naturalWidth || 'NEEDS_MANUAL_PICK',
          naturalHeight: logo?.naturalHeight || 'NEEDS_MANUAL_PICK',
        },
        topBar: {
          rect: rectOf(upperBar),
          css: cssOf(upperBar),
        },
        mainNav: {
          rect: rectOf(mainBar),
          css: cssOf(mainBar),
        },
        mainNavItem: {
          rect: rectOf(company),
          css: cssOf(company),
          pseudoAfterCss: cssOf(company, '::after'),
        },
        searchButton: {
          rect: rectOf(searchInput),
          css: cssOf(searchInput),
        },
        userIcon: {
          rect: rectOf(userIcon),
          source: userIcon?.currentSrc || userIcon?.src || 'NEEDS_MANUAL_PICK',
        },
        languageSelector: {
          rect: rectOf(english),
          css: cssOf(english),
        },
        utilityLink: {
          rect: rectOf(exhibitions),
          css: cssOf(exhibitions),
        },
        contacts: {
          rect: rectOf(contacts),
          css: cssOf(contacts),
        },
        menuItemSpacing,
        foundMainNavLabels: navElements.map((element) => element.textContent?.trim()),
      };
    });

    await page.screenshot({
      path: files.headerDesktop,
      clip: { x: 0, y: 0, width: 1920, height: Math.min(Math.max(audit.headerHeights.total + 2, 140), 260) },
    });

    const companyBox = await page.evaluate(() => {
      const company = Array.from(document.querySelectorAll('a, button, span'))
        .find((element) => element.textContent?.trim() === 'Company' && element.getBoundingClientRect().y >= 70 && element.getBoundingClientRect().y < 155);
      if (!company) return null;
      const rect = company.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (companyBox) {
      await page.mouse.move(companyBox.x + companyBox.width / 2, companyBox.y + companyBox.height / 2, { steps: 8 });
      await page.waitForTimeout(250);
    }

    const hover = await page.evaluate(() => {
      const company = Array.from(document.querySelectorAll('a, button, span'))
        .find((element) => element.textContent?.trim() === 'Company' && element.getBoundingClientRect().y >= 70 && element.getBoundingClientRect().y < 155);
      if (!company) return null;
      const styles = getComputedStyle(company);
      const after = getComputedStyle(company, '::after');
      return {
        color: styles.color,
        borderBottomColor: styles.borderBottomColor,
        afterBackgroundColor: after.backgroundColor,
      };
    });

    const uhpBox = await page.evaluate(() => {
      const uhp = Array.from(document.querySelectorAll('a, button, span'))
        .find((element) => element.textContent?.trim() === 'UHP' && element.getBoundingClientRect().y >= 70 && element.getBoundingClientRect().y < 155);
      if (!uhp) return null;
      const rect = uhp.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (uhpBox) {
      await page.mouse.move(uhpBox.x + uhpBox.width / 2, uhpBox.y + uhpBox.height / 2, { steps: 12 });
    }
    await page.waitForTimeout(600);
    await page.screenshot({
      path: files.uhpMegamenu,
      clip: { x: 0, y: 0, width: 1920, height: 720 },
    });

    const colors = {
      topBarBackgroundColor: normalizeColor(audit.topBar.css.backgroundColor),
      mainNavBackgroundColor: normalizeColor(audit.mainNav.css.backgroundColor),
      textColor: normalizeColor(audit.mainNavItem.css.color),
      hoverColor: normalizeColor(hover?.color),
      hoverAccentColor: normalizeColor(hover?.afterBackgroundColor === 'rgba(0, 0, 0, 0)' ? audit.topBar.css.backgroundColor : hover?.afterBackgroundColor),
      redAccent: normalizeColor(audit.topBar.css.backgroundColor),
      borderSeparatorColor: normalizeColor(audit.mainNav.css.borderBottomColor),
      searchBackgroundColor: normalizeColor(audit.searchButton.css.backgroundColor),
    };

    const manualColorFields = Object.entries(colors)
      .filter(([, value]) => value.hex === 'NEEDS_MANUAL_PICK' || value.raw === 'NEEDS_MANUAL_PICK')
      .map(([key]) => key);

    const report = {
      sourceUrl,
      capturedAt: new Date().toISOString(),
      auditMode: 'playwright-computed-style',
      liveAuditStatus: 'success',
      screenshotPaths: {
        homeFull: rel(files.fullPage),
        headerDesktop: rel(files.headerDesktop),
        uhpMegamenu: rel(files.uhpMegamenu),
      },
      headerHeights: audit.headerHeights,
      logoSizeAndPlacement: audit.logo,
      colors,
      borderSeparatorColors: {
        mainNavBottom: colors.borderSeparatorColor,
      },
      font: {
        familyDetected: audit.mainNavItem.css.fontFamily || audit.topBar.css.fontFamily || 'NEEDS_MANUAL_PICK',
        projectFallback: 'Montserrat, Arial, Helvetica, sans-serif',
        note: 'Computed font family is recorded only; no Transfer Oil font files are copied into the project.',
      },
      fontSize: {
        mainNav: audit.mainNavItem.css.fontSize || 'NEEDS_MANUAL_PICK',
        utility: audit.utilityLink.css.fontSize || 'NEEDS_MANUAL_PICK',
        search: audit.searchButton.css.fontSize || 'NEEDS_MANUAL_PICK',
      },
      menuItemSpacing: audit.menuItemSpacing.length ? audit.menuItemSpacing : 'NEEDS_MANUAL_PICK',
      searchButtonPositionAndSize: audit.searchButton.rect,
      userIconPositionAndSize: audit.userIcon.rect,
      languageSelectorPositionAndSize: audit.languageSelector.rect,
      foundMainNavLabels: audit.foundMainNavLabels,
      assetSources: {
        logo: audit.logo.source,
        userIcon: audit.userIcon.source,
      },
      needsManualColorPick: manualColorFields.length > 0,
      manualColorFields,
    };

    await writeFile(files.audit, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Full page screenshot saved: ${rel(files.fullPage)}`);
    console.log(`Header screenshot saved: ${rel(files.headerDesktop)}`);
    console.log(`UHP mega menu screenshot saved: ${rel(files.uhpMegamenu)}`);
    console.log(`Header audit saved: ${rel(files.audit)}`);
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  await mkdir(referenceDir, { recursive: true });
  const report = {
    sourceUrl,
    capturedAt: new Date().toISOString(),
    auditMode: 'playwright-computed-style',
    liveAuditStatus: 'failed',
    error: error instanceof Error ? error.message : String(error),
    colors: {
      topBarBackgroundColor: 'NEEDS_MANUAL_PICK',
      mainNavBackgroundColor: 'NEEDS_MANUAL_PICK',
      textColor: 'NEEDS_MANUAL_PICK',
      hoverAccentColor: 'NEEDS_MANUAL_PICK',
      redAccent: 'NEEDS_MANUAL_PICK',
      borderSeparatorColor: 'NEEDS_MANUAL_PICK',
    },
    needsManualColorPick: true,
  };
  await writeFile(files.audit, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(error);
  process.exitCode = 1;
});
