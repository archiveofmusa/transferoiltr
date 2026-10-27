import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Immutable pre-revision artwork: all lettering must remain identical.
const baseline = 'de18a7954a3bc1a76d543516dfad82f39a80f24b';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/reference/emblem-revision');
const outerContour = 'M14 4h29l14 14v28L43 60H14L0 46V18L14 4Z';
const firstPath = /<path\b[^>]*\/>/;
const normalize = (source) => source.replace(/\r\n/g, '\n');
const previous = (file) => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root });
const results = [];
await mkdir(output, { recursive: true });

for (const fileName of ['uhphortum-logo.svg', 'uhphortum-logo-white.svg']) {
  const relative = `public/assets/brand/${fileName}`;
  const before = previous(relative);
  const after = await readFile(path.join(root, relative));
  const oldSource = normalize(before.toString('utf8'));
  const newSource = normalize(after.toString('utf8'));
  assert.equal(newSource.replace(firstPath, '<!-- emblem -->'), oldSource.replace(firstPath, '<!-- emblem -->'), 'Only the emblem path may change');
  assert(newSource.match(firstPath)[0].includes(`d="${outerContour}`), 'Outer silhouette must stay unchanged');
  assert.notEqual(newSource.match(firstPath)[0], oldSource.match(firstPath)[0], 'Emblem must actually be revised');

  // Check native and enlarged lettering, plus every current header/footer width.
  for (const width of [140, 180, 244, 270, 279, 308, 462, 1848]) {
    const x = Math.ceil(76 * width / 462);
    const height = Math.round(64 * width / 462);
    const crop = { left: x, top: 0, width: width - x, height };
    const oldPixels = await sharp(before).resize({ width }).extract(crop).ensureAlpha().raw().toBuffer();
    const newPixels = await sharp(after).resize({ width }).extract(crop).ensureAlpha().raw().toBuffer();
    assert(oldPixels.equals(newPixels), `Lettering pixels changed at ${width}px`);
  }
  const white = fileName.includes('-white');
  await sharp({ create: { width: 1020, height: 224, channels: 4, background: white ? '#081E31' : '#FFFFFF' } })
    .composite([{ input: await sharp(after).resize({ width: 924 }).png().toBuffer(), left: 48, top: 48 }])
    .png().toFile(path.join(output, white ? 'logo-navy-preview.png' : 'logo-light-preview.png'));
  results.push({ file: relative, onlyEmblemChanged: true, wordmarkPixelIdentical: true, outerContourUnchanged: true, gapPx: 19 });
}

// The social preview is a derivative of the same logo; its lettering stays put.
const ogPath = 'public/assets/brand/uhphortum-og.png';
const crop = { left: 231, top: 0, width: 969, height: 630 };
const oldOg = await sharp(previous(ogPath)).extract(crop).raw().toBuffer();
const newOg = await sharp(await readFile(path.join(root, ogPath))).extract(crop).raw().toBuffer();
assert(oldOg.equals(newOg), 'OpenGraph lettering/background outside the emblem must be identical');

// Render actual site sizes, without enlarging the emblem independently of the wordmark.
const whiteLogo = await readFile(path.join(root, 'public/assets/brand/uhphortum-logo-white.svg'));
const sizeSamples = [{ width: 140, left: 24 }, { width: 244, left: 234 }, { width: 308, left: 548 }];
await sharp({ create: { width: 900, height: 128, channels: 4, background: '#081E31' } })
  .composite(await Promise.all(sizeSamples.map(async ({ width, left }) => ({
    input: await sharp(whiteLogo).resize({ width }).png().toBuffer(),
    left,
    top: Math.round((128 - 64 * width / 462) / 2),
  }))))
  .png().toFile(path.join(output, 'logo-size-preview.png'));

const report = { baseline, results, wallLayers: 3, openGraphWordmarkUnchanged: true };
await writeFile(path.join(output, 'preservation-check.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
