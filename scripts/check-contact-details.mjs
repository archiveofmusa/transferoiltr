import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const email = 'info@uhphortum.com';
const output = path.resolve(process.env.CHECK_OUTPUT_DIR || 'docs/reference/contact-email-only');
const report = { baseUrl, email, checkedAt: new Date().toISOString(), checks: [], errors: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.on('pageerror', (error) => report.errors.push({ route: page.url(), error: error.message }));

async function verifyContactLinks(route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response.status(), 200);
  const body = await page.locator('body').innerText();
  assert(!body.includes('info.trk@transferoil.com'), 'Old company email is visible');
  assert(!/544\s*636\s*91\s*22/.test(body), 'Old company phone is visible');
  assert.equal(await page.locator('a[href^="tel:"], a[href*="wa.me"], a[href*="api.whatsapp.com"]').count(), 0);
  assert.equal(await page.locator(`footer a[href="mailto:${email}"]`).count(), 1);
  assert.equal(await page.locator(`footer a[href="mailto:${email}"]`).innerText(), email);
  if (route.endsWith('/iletisim')) {
    assert.equal(await page.locator(`aside a[href="mailto:${email}"]`).count(), 1);
    assert((await page.locator('aside').innerText()).includes('Umut Gündoğdu'));
    assert.equal(await page.locator('#contact-phone').count(), 1, 'Customer phone input must stay unchanged');
    const map = await page.locator('iframe').getAttribute('src');
    assert(map.includes('40.848771688250984') && map.includes('29.295564869254044'));
  }
  if (route.endsWith('/teknik-destek')) {
    assert.equal(await page.locator(`main a[href="mailto:${email}"]`).count(), 1);
    assert.equal(await page.locator('#support-phone').count(), 1, 'Customer phone input must stay unchanged');
    assert(!body.includes('WhatsApp'), 'Support copy must no longer advertise WhatsApp');
  }
}

try {
  for (const locale of ['tr', 'en', 'ru', 'ar']) {
    for (const pathname of ['', '/iletisim', '/teknik-destek', '/urunler/helix-2-spiral', '/kurumsal']) {
      const route = `/${locale}${pathname}`;
      try {
        await verifyContactLinks(route);
        report.checks.push({ route, passed: true });
        if (route === '/tr/iletisim') await page.screenshot({ path: path.join(output, 'contact-tr.png'), fullPage: true, animations: 'disabled' });
      } catch (error) { report.errors.push({ route, error: error.message }); }
    }
  }
  for (const locale of ['tr', 'ar']) {
    try {
      await page.setViewportSize({ width: 320, height: 844 });
      await verifyContactLinks(`/${locale}/iletisim`);
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflows, false);
      await page.locator('aside').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `contact-mobile-${locale}.png`), animations: 'disabled' });
      report.checks.push({ route: `/${locale}/iletisim`, viewport: 320, passed: true });
    } catch (error) { report.errors.push({ route: `/${locale}/iletisim`, viewport: 320, error: error.message }); }
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, 'check.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ passed: report.checks.length, errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
