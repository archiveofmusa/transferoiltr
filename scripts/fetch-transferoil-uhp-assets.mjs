import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = path.join(root, 'public', 'assets', 'transfer-oil');
const placeholder = '/assets/transfer-oil/placeholders/uhp-product-placeholder.svg';
const manifestPath = path.join(assetRoot, 'asset-manifest.json');
const assetsDataPath = path.join(root, 'src', 'data', 'uhpAssets.ts');

// This script intentionally visits only these exact public UHP reference pages.
const references = [
  { key: 'uhp', url: 'https://www.transferoil.com/en/to-uhp-products.aspx' },
  { key: 'helix', url: 'https://www.transferoil.com/en/to-uhp-products/helix%28r%29-hoses.aspx' },
  { key: 'helix2', url: 'https://www.transferoil.com/en/to-uhp-products/helix%28r%29-hoses/2-spiral.aspx' },
  { key: 'helix4', url: 'https://www.transferoil.com/en/to-uhp-products/helix%28r%29-hoses/4-spiral.aspx' },
  { key: 'fittings', url: 'https://www.transferoil.com/en/to-uhp-products/uhp-fittings.aspx' },
  { key: 'adapters', url: 'https://www.transferoil.com/en/to-uhp-products/adapters.aspx' },
  { key: 'ferrules', url: 'https://www.transferoil.com/en/to-uhp-products/ferrules.aspx' },
  { key: 'accessories', url: 'https://www.transferoil.com/en/to-uhp-products/accessories.aspx' },
  { key: 'certificates', url: 'https://www.transferoil.com/en/to-uhp-products/certificates.aspx' },
];

const targets = [
  { key: 'logo', pages: ['uhp', 'helix'], filename: 'transfer-oil-logo', directory: 'logo', terms: ['logo', 'transfer-oil'] },
  { key: 'hero', pages: ['uhp'], filename: 'uhp-hero', directory: 'uhp/hero', terms: ['uhp', 'helix', 'hero', 'banner'] },
  { key: 'helix2Spiral', pages: ['helix2'], filename: 'helix-2-spiral', directory: 'uhp/hoses', terms: ['2-spiral', '2spiral', 'helix'] },
  { key: 'helix4Spiral', pages: ['helix4'], filename: 'helix-4-spiral', directory: 'uhp/hoses', terms: ['4-spiral', '4spiral', 'helix'] },
  { key: 'fittings', pages: ['fittings'], filename: 'uhp-fittings', directory: 'uhp/fittings', terms: ['fitting', 'uhp'] },
  { key: 'adapters', pages: ['adapters'], filename: 'uhp-adapters', directory: 'uhp/adapters', terms: ['adapter', 'uhp'] },
  { key: 'ferrules', pages: ['ferrules'], filename: 'uhp-ferrules', directory: 'uhp/ferrules', terms: ['ferrule', 'uhp'] },
  { key: 'accessories', pages: ['accessories'], filename: 'uhp-accessories', directory: 'uhp/accessories', terms: ['accessor', 'uhp'] },
  { key: 'certificates', pages: ['certificates'], filename: 'uhp-certificates', directory: 'uhp/certificates', terms: ['certificate', 'certif', 'uhp'] },
];

const stripEntities = (value) => value.replaceAll('&amp;', '&').replaceAll('&#x2F;', '/').trim();
const isAllowedAssetUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && ['transferoil.com', 'www.transferoil.com'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const isLikelyImage = (url) => /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url);
const shouldSkip = (url) => /(?:icon|sprite|flag|social|facebook|linkedin|youtube|instagram|twitter|favicon|pixel|tracking|cookie|search|arrow|menu|loader)/i.test(url);

function extractCandidates(html, pageUrl) {
  const rawValues = [];
  const attributePattern = /<(?:img|source)\b[^>]*(?:src|data-src|data-lazy-src|srcset)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const cssPattern = /background(?:-image)?\s*:\s*[^;]*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;

  while ((match = attributePattern.exec(html))) {
    const value = stripEntities(match[1]).split(',')[0].trim().split(/\s+/)[0];
    rawValues.push(value);
  }
  while ((match = cssPattern.exec(html))) rawValues.push(stripEntities(match[1]));

  return [...new Set(rawValues.map((value) => {
    try { return new URL(value, pageUrl).href; } catch { return null; }
  }).filter(Boolean))]
    .filter((url) => isAllowedAssetUrl(url) && isLikelyImage(url) && !shouldSkip(url));
}

function scoreCandidate(url, target) {
  const name = url.toLowerCase();
  const matchedTerms = target.terms.reduce((score, term) => score + (name.includes(term) ? 5 : 0), 0);
  const photoBonus = /(?:product|uhp|helix|hose|fitting|adapter|ferrule|certificate|banner|slide)/i.test(name) ? 3 : 0;
  return matchedTerms + photoBonus - (name.includes('thumb') ? 2 : 0);
}

async function getSharp() {
  try {
    const importedSharp = await import('sharp');
    return importedSharp.default;
  } catch {
    return null;
  }
}

async function downloadCandidate(candidate, target, sharp, seenHashes) {
  const response = await fetch(candidate.url, { headers: { 'User-Agent': 'TransferOilTurkey-UHP-AssetFetcher/1.0 (distributor website build)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) throw new Error('Asset küçük olduğu için atlandı');

  const hash = createHash('sha256').update(buffer).digest('hex');
  if (seenHashes.has(hash)) return { duplicateOf: seenHashes.get(hash), hash };

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const inputExtension = path.extname(new URL(candidate.url).pathname).toLowerCase();
  const isSvg = contentType.includes('svg') || inputExtension === '.svg';
  const destinationDirectory = path.join(assetRoot, target.directory);
  await mkdir(destinationDirectory, { recursive: true });

  let destination;
  let metadata = {};
  if (isSvg) {
    destination = path.join(destinationDirectory, `${target.filename}.svg`);
    await writeFile(destination, buffer);
  } else if (sharp) {
    destination = path.join(destinationDirectory, `${target.filename}.webp`);
    metadata = await sharp(buffer).metadata();
    await sharp(buffer).rotate().webp({ quality: 82, effort: 4 }).toFile(destination);
  } else {
    const extension = ['.jpg', '.jpeg', '.png', '.webp'].includes(inputExtension) ? inputExtension : '.jpg';
    destination = path.join(destinationDirectory, `${target.filename}${extension}`);
    await writeFile(destination, buffer);
  }

  const localPath = `/${path.relative(path.join(root, 'public'), destination).replaceAll(path.sep, '/')}`;
  seenHashes.set(hash, localPath);
  return { localPath, hash, width: metadata.width, height: metadata.height, format: metadata.format };
}

async function main() {
  await mkdir(assetRoot, { recursive: true });
  const pages = new Map();
  const manifest = [];
  const seenHashes = new Map();
  const sharp = await getSharp();
  const mappings = Object.fromEntries(targets.map((target) => [target.key, placeholder]));

  for (const reference of references) {
    try {
      const response = await fetch(reference.url, { headers: { 'User-Agent': 'TransferOilTurkey-UHP-AssetFetcher/1.0 (distributor website build)' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      pages.set(reference.key, extractCandidates(html, reference.url));
    } catch (error) {
      pages.set(reference.key, []);
      manifest.push({ sourcePage: reference.url, guessedType: `${reference.key}-page`, notes: `Sayfa okunamadı: ${error.message}` });
    }
  }

  for (const target of targets) {
    const candidateList = target.pages.flatMap((key) => (pages.get(key) ?? []).map((url) => ({ url, sourcePage: references.find((page) => page.key === key)?.url ?? '' })))
      .sort((a, b) => scoreCandidate(b.url, target) - scoreCandidate(a.url, target));
    let saved = false;

    for (const candidate of candidateList.slice(0, 12)) {
      try {
        const result = await downloadCandidate(candidate, target, sharp, seenHashes);
        if (result.duplicateOf) {
          mappings[target.key] = result.duplicateOf;
          manifest.push({ originalUrl: candidate.url, localPath: result.duplicateOf, sourcePage: candidate.sourcePage, guessedType: target.key, notes: 'Aynı içerik hash’iyle daha önce indirilen varlık kullanıldı.' });
        } else {
          mappings[target.key] = result.localPath;
          manifest.push({ originalUrl: candidate.url, localPath: result.localPath, sourcePage: candidate.sourcePage, guessedType: target.key, width: result.width, height: result.height, notes: sharp ? 'WebP dönüştürmesi uygulandı; SVG korunur.' : 'sharp bulunamadı; özgün dosya biçimi korundu.' });
        }
        saved = true;
        break;
      } catch (error) {
        manifest.push({ originalUrl: candidate.url, sourcePage: candidate.sourcePage, guessedType: target.key, notes: `Atlandı: ${error.message}` });
      }
    }

    if (!saved) manifest.push({ localPath: placeholder, guessedType: target.key, notes: 'Uygun görsel bulunamadı; yer tutucu kullanılıyor.' });
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const mappingSource = `export const uhpAssets = ${JSON.stringify({ ...mappings, placeholder }, null, 2)} as const;\n`;
  await writeFile(assetsDataPath, mappingSource);
  console.log(`Asset keşfi tamamlandı: ${manifest.filter((item) => item.localPath && item.localPath !== placeholder).length} varlık indirildi.`);
  console.log(`Manifest: ${path.relative(root, manifestPath)}`);
}

main().catch((error) => {
  console.error(`Asset keşfi başarısız: ${error.message}`);
  process.exitCode = 1;
});
