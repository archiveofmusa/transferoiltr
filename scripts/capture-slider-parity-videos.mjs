import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputDirectory = join(root, 'docs/reference');
mkdirSync(outputDirectory, { recursive: true });

const targets = [
  {
    name: 'reference-slider.webm',
    url: 'https://www.transferoil.com/en/default.aspx',
    advance: async (page) => {
      const next = page.locator('.flex-next').first();
      if (await next.isVisible().catch(() => false)) await next.click();
    },
  },
  {
    name: 'local-slider-after.webm',
    url: process.env.LOCAL_SLIDER_URL ?? 'http://127.0.0.1:3000/tr',
    advance: async (page) => {
      await page.locator('[data-hero-slide-index="1"]').click();
    },
  },
];
const requestedTarget = process.env.CAPTURE_TARGET ?? 'all';
const selectedTargets = requestedTarget === 'all'
  ? targets
  : targets.filter((target) => target.name.startsWith(requestedTarget));

if (selectedTargets.length === 0) {
  throw new Error(`Unknown CAPTURE_TARGET=${requestedTarget}; use reference, local, or all.`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const target of selectedTargets) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: outputDirectory, size: { width: 1280, height: 720 } },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(3_000);
    await target.advance(page).catch(() => undefined);
    await page.waitForTimeout(6_000);
    const video = page.video();
    await context.close();
    if (!video) throw new Error(`Playwright did not create video for ${target.url}`);
    const temporaryPath = await video.path();
    const finalPath = join(outputDirectory, target.name);
    rmSync(finalPath, { force: true });
    renameSync(temporaryPath, finalPath);
    console.log(`Captured ${target.name}`);
  }
} finally {
  await browser.close();
}
