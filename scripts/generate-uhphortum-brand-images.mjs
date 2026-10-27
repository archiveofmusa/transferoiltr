import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// The source wordmark is custom SVG path geometry, not a substituted font.
// Retain the original sharing-card colors independently of the page UI palette.
// Emblem-only favicon and apple icon are deliberately not regenerated.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'public/assets/brand');
await mkdir(directory, { recursive: true });
const logo = await readFile(path.join(directory, 'uhphortum-logo-white.svg'));
const rasterLogo = await sharp(logo).resize({ width: 1100 }).png().toBuffer();
const { width, height } = await sharp(rasterLogo).metadata();

await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#102033' } })
  .composite([
    { input: rasterLogo, left: Math.round((1200 - width) / 2), top: Math.round((630 - height) / 2) },
    { input: { create: { width: 1200, height: 12, channels: 4, background: '#C95016' } }, left: 0, top: 618 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(directory, 'uhphortum-og.png'));

console.log('Generated UHPHORTUM OpenGraph (1200×630); original emblem icons preserved.');
