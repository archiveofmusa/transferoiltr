import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceDir = path.join(root, 'docs', 'reference');

const urls = {
  home: 'https://www.transferoil.com/en/default.aspx',
  hydraulic: 'https://www.transferoil.com/en/to-hydraulic-products.aspx',
  industrial: 'https://www.transferoil.com/en/to-industrial-products.aspx',
  uhp: 'https://www.transferoil.com/en/to-uhp-products.aspx',
  contact: 'https://www.transferoil.com/website/contacts.aspx',
};

const files = {
  home: path.join(referenceDir, 'transferoil-home.png'),
  hydraulicMenu: path.join(referenceDir, 'transferoil-hydraulic-menu.png'),
  industrialMenu: path.join(referenceDir, 'transferoil-industrial-menu.png'),
  uhpMenu: path.join(referenceDir, 'transferoil-uhp-menu.png'),
  contact: path.join(referenceDir, 'transferoil-contact.png'),
  audit: path.join(referenceDir, 'transferoil-visual-audit.json'),
};

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function rgbToHex(color) {
  const match = String(color || '').match(/rgba?\(([^)]+)\)/i);
  if (!match) return color || 'NEEDS_MANUAL_PICK';
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return 'NEEDS_MANUAL_PICK';
  const [red, green, blue, alpha = 1] = parts;
  const hex = `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return alpha < 1 ? `${hex} @ ${Number(alpha.toFixed(3))}` : hex;
}

function colorReport(color) {
  return {
    raw: color || 'NEEDS_MANUAL_PICK',
    hex: rgbToHex(color),
  };
}

async function placeholderScreenshot(filePath) {
  await sharp({
    create: {
      width: 1600,
      height: 900,
      channels: 4,
      background: { r: 52, g: 58, b: 64, alpha: 1 },
    },
  }).png().toFile(filePath);
}

async function findTextBox(page, text, yMin = 0, yMax = 260) {
  return page.evaluate(({ text: wanted, yMin: minY, yMax: maxY }) => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const element = Array.from(document.querySelectorAll('a, button, span, div'))
      .find((node) => node.textContent?.trim() === wanted && visible(node) && node.getBoundingClientRect().y >= minY && node.getBoundingClientRect().y <= maxY);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, { text, yMin, yMax });
}

async function hoverMenuAndScreenshot(page, label, filePath) {
  const box = await findTextBox(page, label, 70, 170);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: 1920, height: 760 }, animations: 'disabled', timeout: 12_000 });
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TransferOilTurkiye-VisualAudit/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function gotoReference(page, url, waitMs = 1200) {
  const html = await fetchHtml(url);
  const htmlWithBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${url}">`);
  await page.setContent(htmlWithBase, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function inspectHome(page) {
  return page.evaluate(() => {
    const NEEDS = 'NEEDS_MANUAL_PICK';
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const rectOf = (element) => {
      if (!visible(element)) return NEEDS;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const cssOf = (element) => {
      if (!element) return {};
      const css = getComputedStyle(element);
      return {
        backgroundColor: css.backgroundColor,
        color: css.color,
        fontFamily: css.fontFamily,
        fontSize: css.fontSize,
        fontWeight: css.fontWeight,
        lineHeight: css.lineHeight,
      };
    };
    const exactText = (text, yMin = 0, yMax = 2000) => Array.from(document.querySelectorAll('a, button, span, div, h1, h2, h3, p'))
      .find((element) => element.textContent?.trim() === text && visible(element) && element.getBoundingClientRect().y >= yMin && element.getBoundingClientRect().y <= yMax) ?? null;
    const coloredAncestor = (element) => {
      let current = element;
      while (current && current !== document.body) {
        const css = getComputedStyle(current);
        const background = css.backgroundColor;
        if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return current;
        current = current.parentElement;
      }
      return null;
    };
    const looksOrange = (color) => {
      const match = color?.match(/rgba?\(([^)]+)\)/i);
      if (!match) return false;
      const [red, green, blue] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      return red > 180 && green > 55 && green < 150 && blue < 70;
    };
    const looksDarkGrey = (color) => {
      const match = color?.match(/rgba?\(([^)]+)\)/i);
      if (!match) return false;
      const [red, green, blue] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      return red >= 35 && red <= 95 && green >= 35 && green <= 100 && blue >= 35 && blue <= 105;
    };

    const logo = Array.from(document.images).find((image) => /logo|transfer/i.test(image.alt || image.currentSrc || image.src) && visible(image)) ?? null;
    const topUtility = coloredAncestor(exactText('Exhibitions', 0, 110) ?? exactText('News', 0, 110) ?? logo);
    const lowerNav = coloredAncestor(exactText('Company', 60, 160) ?? exactText('Hydraulic', 60, 160));
    const navItems = ['Company', 'Sustainability', 'Hydraulic', 'Industrial', 'UHP']
      .map((label) => exactText(label, 60, 180))
      .filter(Boolean);

    const orangeBlocks = Array.from(document.querySelectorAll('*'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 25 || rect.y < 130) return false;
        return looksOrange(getComputedStyle(element).backgroundColor);
      })
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
    const heroTitleBlock = orangeBlocks[0] ?? null;

    const darkBlocks = Array.from(document.querySelectorAll('*'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 25 || rect.y < 130) return false;
        return looksDarkGrey(getComputedStyle(element).backgroundColor);
      })
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
    const heroSubtitleBlock = darkBlocks[0] ?? null;

    const productFinder = exactText('Product finder', 120, 900);
    const heroMedia = Array.from(document.querySelectorAll('video, img, picture, section, div'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= window.innerWidth * 0.6 && rect.height > 250 && rect.y >= 120 && rect.y < window.innerHeight;
      })
      .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0] ?? null;

    const categoryElements = ['HYDRAULIC', 'INDUSTRIAL', 'UHP']
      .map((label) => exactText(label, 300, 1100))
      .filter(Boolean);
    const categoryRects = categoryElements.map((element) => element.getBoundingClientRect());
    const categoryStripDimensions = categoryRects.length ? {
      x: Math.round(Math.min(...categoryRects.map((rect) => rect.x))),
      y: Math.round(Math.min(...categoryRects.map((rect) => rect.y))),
      width: Math.round(Math.max(...categoryRects.map((rect) => rect.right)) - Math.min(...categoryRects.map((rect) => rect.x))),
      height: Math.round(Math.max(...categoryRects.map((rect) => rect.bottom)) - Math.min(...categoryRects.map((rect) => rect.y))),
    } : NEEDS;

    const navRects = navItems.map((element) => element.getBoundingClientRect());
    const menuSpacing = navRects.slice(1).map((rect, index) => Math.round(rect.left - navRects[index].right));
    const primaryButton = Array.from(document.querySelectorAll('a, button'))
      .find((element) => /read more|more|products|discover/i.test(element.textContent || '') && visible(element)) ?? null;

    return {
      topOrangeBarHeight: Math.round(topUtility?.getBoundingClientRect().height || 0) || NEEDS,
      lowerGreyNavHeight: Math.round(lowerNav?.getBoundingClientRect().height || 0) || NEEDS,
      logoDimensionsAndPlacement: {
        rect: rectOf(logo),
        naturalWidth: logo?.naturalWidth || NEEDS,
        naturalHeight: logo?.naturalHeight || NEEDS,
        source: logo?.currentSrc || logo?.src || NEEDS,
      },
      colors: {
        topBarOrange: cssOf(topUtility).backgroundColor || NEEDS,
        lowerBarGrey: cssOf(lowerNav).backgroundColor || NEEDS,
        menuHoverActiveOrange: cssOf(heroTitleBlock).backgroundColor || cssOf(topUtility).backgroundColor || NEEDS,
        textColors: {
          utility: cssOf(exactText('Exhibitions', 0, 110)).color || NEEDS,
          lowerNav: cssOf(exactText('Company', 60, 170)).color || NEEDS,
          heroTitle: cssOf(heroTitleBlock).color || NEEDS,
          heroSubtitle: cssOf(heroSubtitleBlock).color || NEEDS,
        },
        heroTitleBlock: cssOf(heroTitleBlock).backgroundColor || NEEDS,
        heroSubtitleBlock: cssOf(heroSubtitleBlock).backgroundColor || NEEDS,
        buttonColors: {
          background: cssOf(primaryButton).backgroundColor || NEEDS,
          color: cssOf(primaryButton).color || NEEDS,
        },
      },
      typography: {
        fontFamilyDetected: cssOf(exactText('Company', 60, 170)).fontFamily || cssOf(document.body).fontFamily || NEEDS,
        fontSizes: {
          utility: cssOf(exactText('Exhibitions', 0, 110)).fontSize || NEEDS,
          lowerNav: cssOf(exactText('Company', 60, 170)).fontSize || NEEDS,
          heroTitle: cssOf(heroTitleBlock).fontSize || NEEDS,
          heroSubtitle: cssOf(heroSubtitleBlock).fontSize || NEEDS,
          button: cssOf(primaryButton).fontSize || NEEDS,
        },
        fontWeights: {
          utility: cssOf(exactText('Exhibitions', 0, 110)).fontWeight || NEEDS,
          lowerNav: cssOf(exactText('Company', 60, 170)).fontWeight || NEEDS,
          heroTitle: cssOf(heroTitleBlock).fontWeight || NEEDS,
          heroSubtitle: cssOf(heroSubtitleBlock).fontWeight || NEEDS,
          button: cssOf(primaryButton).fontWeight || NEEDS,
        },
        lineHeights: {
          utility: cssOf(exactText('Exhibitions', 0, 110)).lineHeight || NEEDS,
          lowerNav: cssOf(exactText('Company', 60, 170)).lineHeight || NEEDS,
          heroTitle: cssOf(heroTitleBlock).lineHeight || NEEDS,
          heroSubtitle: cssOf(heroSubtitleBlock).lineHeight || NEEDS,
          button: cssOf(primaryButton).lineHeight || NEEDS,
        },
      },
      menuSpacing: menuSpacing.length ? menuSpacing : NEEDS,
      sliderDimensions: rectOf(heroMedia),
      productFinderTabDimensions: rectOf(productFinder),
      categoryStripDimensions,
    };
  });
}

async function main() {
  await mkdir(referenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.route('**/*', async (route) => {
    if (['font', 'script'].includes(route.request().resourceType())) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  const report = {
    sourceUrls: urls,
    capturedAt: new Date().toISOString(),
    status: 'success',
    screenshots: {
      home: rel(files.home),
      hydraulicMenu: rel(files.hydraulicMenu),
      industrialMenu: rel(files.industrialMenu),
      uhpMenu: rel(files.uhpMenu),
      contact: rel(files.contact),
    },
  };

  try {
    await gotoReference(page, urls.home, 1800);
    await page.screenshot({ path: files.home, clip: { x: 0, y: 0, width: 1920, height: 1080 }, animations: 'disabled', timeout: 12_000 });
    let audit;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        audit = await inspectHome(page);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(1200);
      }
    }
    report.audit = {
      ...audit,
      colorsAsHex: {
        topBarOrange: colorReport(audit.colors.topBarOrange),
        lowerBarGrey: colorReport(audit.colors.lowerBarGrey),
        menuHoverActiveOrange: colorReport(audit.colors.menuHoverActiveOrange),
        heroTitleBlock: colorReport(audit.colors.heroTitleBlock),
        heroSubtitleBlock: colorReport(audit.colors.heroSubtitleBlock),
        buttonBackground: colorReport(audit.colors.buttonColors.background),
      },
    };

    await hoverMenuAndScreenshot(page, 'Hydraulic', files.hydraulicMenu);
    await gotoReference(page, urls.home, 900);
    await hoverMenuAndScreenshot(page, 'Industrial', files.industrialMenu);
    await gotoReference(page, urls.home, 900);
    await hoverMenuAndScreenshot(page, 'UHP', files.uhpMenu);

    await gotoReference(page, urls.contact, 1600);
    await page.screenshot({ path: files.contact, clip: { x: 0, y: 0, width: 1920, height: 1080 }, animations: 'disabled', timeout: 12_000 });
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
    report.audit = {
      topOrangeBarHeight: 'NEEDS_MANUAL_PICK',
      lowerGreyNavHeight: 'NEEDS_MANUAL_PICK',
      logoDimensionsAndPlacement: 'NEEDS_MANUAL_PICK',
      colors: {
        topBarOrange: 'NEEDS_MANUAL_PICK',
        lowerBarGrey: 'NEEDS_MANUAL_PICK',
        menuHoverActiveOrange: 'NEEDS_MANUAL_PICK',
        textColors: 'NEEDS_MANUAL_PICK',
        heroTitleBlock: 'NEEDS_MANUAL_PICK',
        heroSubtitleBlock: 'NEEDS_MANUAL_PICK',
        buttonColors: 'NEEDS_MANUAL_PICK',
      },
      typography: {
        fontFamilyDetected: 'NEEDS_MANUAL_PICK',
        fontSizes: 'NEEDS_MANUAL_PICK',
        fontWeights: 'NEEDS_MANUAL_PICK',
        lineHeights: 'NEEDS_MANUAL_PICK',
      },
      menuSpacing: 'NEEDS_MANUAL_PICK',
      sliderDimensions: 'NEEDS_MANUAL_PICK',
      productFinderTabDimensions: 'NEEDS_MANUAL_PICK',
      categoryStripDimensions: 'NEEDS_MANUAL_PICK',
    };

    await Promise.all([
      placeholderScreenshot(files.home),
      placeholderScreenshot(files.hydraulicMenu),
      placeholderScreenshot(files.industrialMenu),
      placeholderScreenshot(files.uhpMenu),
      placeholderScreenshot(files.contact),
    ]);
  } finally {
    await browser.close();
  }

  await writeFile(files.audit, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Reference visual audit written: ${rel(files.audit)}`);
  Object.values(files).filter((file) => file.endsWith('.png')).forEach((file) => console.log(`Screenshot: ${rel(file)}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
