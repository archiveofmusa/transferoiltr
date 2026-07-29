import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const finalRoot = path.join(publicRoot, 'assets', 'transfer-oil', 'final');
const manifestPath = path.join(finalRoot, 'asset-manifest.json');
const dataPath = path.join(root, 'src', 'data', 'finalTransferOilAssets.ts');

const placeholder = '/assets/transfer-oil/final/placeholders/transfer-oil-placeholder.svg';

const uhpReferences = [
  ['helix-2-spiral', 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/2-spiral.aspx'],
  ['helix-4-spiral', 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/4-spiral.aspx'],
  ['helix-6-spiral', 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/6-spiral.aspx'],
  ['helix-8-spiral', 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/8-spiral/208---8sw-helix.aspx'],
  ['bspp', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-british-standard-pipe-parallel-(bspp).aspx'],
  ['metric-24-60', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-metric-24---60/hc---female-metric-24---60.aspx'],
  ['nptf', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-national-pipe-tapered-fuel-(nptf).aspx'],
  ['hp-mp', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/hp--mp.aspx'],
  ['metric', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/metric/hk--m-met.aspx'],
  ['usit', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/usit/hr---m-usit.aspx'],
  ['din-3852', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/din-3852/ht---male-din3852.aspx'],
  ['dkos', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-din-2353--3865-24/hd---female-dkos.aspx'],
  ['jic', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-sae-j514-370-(jic)/he---female-jic.aspx'],
  ['type-m', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/type-m/hf---female-type-m.aspx'],
  ['gas', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/gas.aspx'],
  ['gas100-external-cone', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/gas100-external-cone/hq---m-gas100-ec.aspx'],
  ['flat-seal', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/flat-seal.aspx'],
  ['flat-seal-metric', 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/flat-seal-metric.aspx'],
  ['adapter-male-male', 'https://www.transferoil.com/en/to-uhp-products/adapters/male-%7C-male.aspx'],
  ['adapter-male-female', 'https://www.transferoil.com/en/to-uhp-products/adapters/male-%7C-female.aspx'],
  ['adapter-female-female', 'https://www.transferoil.com/en/to-uhp-products/adapters/female-%7C-female.aspx'],
  ['adapter-proof-test', 'https://www.transferoil.com/en/to-uhp-products/adapters/proof-test.aspx'],
  ['ferrules', 'https://www.transferoil.com/en/to-uhp-products/uhp-ferrules.aspx'],
  ['accessories', 'https://www.transferoil.com/en/to-uhp-products/uhp-accessories.aspx'],
  ['certificates', 'https://www.transferoil.com/en/about-us/rd-quality-certificates.aspx#certificates'],
];

const corporateReferences = [
  ['about', 'https://www.transferoil.com/en/about-us.aspx'],
  ['divisions', 'https://www.transferoil.com/en/about-us/divisions.aspx'],
  ['manufacturing-model', 'https://www.transferoil.com/en/about-us/manufacturing-model.aspx'],
  ['rd-quality-certificates', 'https://www.transferoil.com/en/about-us/rd-quality-certificates.aspx'],
  ['thermoplastic-hose-benefits', 'https://www.transferoil.com/en/about-us/benefits-of-the-thermoplastic-hose.aspx'],
  ['code-of-ethics', 'https://www.transferoil.com/en/about-us/code-of-ethics.aspx'],
];

const miscReferences = [
  ['exhibitions', 'https://www.transferoil.com/en/exhibitions.aspx'],
  ['news', 'https://www.transferoil.com/en/news.aspx'],
  ['certificates-page', 'https://www.transferoil.com/en/about-us/rd-quality-certificates.aspx#certificates'],
  ['contact', 'https://www.transferoil.com/website/contacts.aspx'],
];

const references = [
  ...uhpReferences.map(([key, url]) => ({ key, url, group: 'uhp' })),
  ...corporateReferences.map(([key, url]) => ({ key, url, group: 'corporate' })),
  ...miscReferences.map(([key, url]) => ({ key, url, group: key })),
];

const requiredFolders = [
  'logo',
  'header',
  'hero',
  'uhp',
  'corporate',
  'exhibitions',
  'news',
  'certificates',
  'contact',
  'videos',
  'placeholders',
];

function publicPath(filePath) {
  return `/${path.relative(publicRoot, filePath).replaceAll(path.sep, '/')}`;
}

function isTransferOilUrl(raw) {
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) && ['transferoil.com', 'www.transferoil.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function decodeEntities(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x2F;', '/');
}

function absoluteUrl(raw, baseUrl) {
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
  if (/_imgurl|\s\+|\+\s|^['"]|['"]$/.test(raw)) return null;
  try {
    return new URL(decodeEntities(raw), baseUrl).href;
  } catch {
    return null;
  }
}

function isImage(url, mime = '') {
  return /image/i.test(mime) || /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url);
}

function isVideo(url, mime = '') {
  return /video/i.test(mime) || /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i.test(url);
}

function shouldSkip(url) {
  return /(?:cookie|tracking|analytics|pixel|sprite|flag|favicon|ico|search|arrow|caret|loader|spinner|facebook|instagram|whatsapp|user|login)/i.test(url);
}

function attrsFromTag(tag) {
  const attrs = {};
  const pattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) attrs[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  return attrs;
}

function srcsetUrls(srcset) {
  if (!srcset) return [];
  return srcset.split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'TransferOilTurkiye-FinalAssetFetcher/1.0',
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url) {
  const response = await fetchWithTimeout(url.split('#')[0], { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function extractCandidates(html, reference) {
  const candidates = [];
  const add = (raw, context, attrs = {}) => {
    const url = absoluteUrl(raw, reference.url);
    if (!url || !isTransferOilUrl(url) || shouldSkip(url)) return;
    if (!isImage(url, attrs.type) && !isVideo(url, attrs.type)) return;
    candidates.push({
      url,
      sourcePage: reference.url,
      sourceKey: reference.key,
      sourceGroup: reference.group,
      context,
      alt: attrs.alt || attrs.title || attrs['aria-label'] || '',
      width: attrs.width || '',
      height: attrs.height || '',
      mimeType: attrs.type || '',
    });
  };

  const tagPattern = /<(img|source|video)\b[^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const attrs = attrsFromTag(match[0]);
    add(attrs.src, `${match[1]} src`, attrs);
    add(attrs['data-src'], `${match[1]} data-src`, attrs);
    add(attrs.poster, `${match[1]} poster`, attrs);
    for (const url of srcsetUrls(attrs.srcset)) add(url, `${match[1]} srcset`, attrs);
  }

  const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let cssMatch;
  while ((cssMatch = cssPattern.exec(html))) add(cssMatch[1], 'css background-image');

  const dataPattern = /\b(?:data-bg|data-background|data-image|data-img)\s*=\s*["']([^"']+)["']/gi;
  let dataMatch;
  while ((dataMatch = dataPattern.exec(html))) add(dataMatch[1], 'data background');

  return candidates;
}

function score(candidate, purposeTerms = [], preferSvg = false) {
  let value = 0;
  const haystack = `${decodeURIComponent(new URL(candidate.url).pathname)} ${candidate.alt} ${candidate.context}`.toLowerCase();
  for (const term of purposeTerms) if (haystack.includes(term.toLowerCase())) value += 8;
  if (preferSvg && /\.svg(?:[?#]|$)/i.test(candidate.url)) value += 30;
  if (candidate.context.includes('background')) value += 5;
  if (candidate.context.includes('srcset')) value += 3;
  const width = Number(candidate.width) || 0;
  const height = Number(candidate.height) || 0;
  if (width >= 900 && height >= 260) value += 8;
  if (width >= 180 && height >= 90) value += 4;
  if (width && height && (width < 50 || height < 25)) value -= 20;
  if (/thumb|thumbnail|mini|small/i.test(haystack)) value -= 2;
  return value;
}

async function createPlaceholder() {
  const destination = path.join(finalRoot, 'placeholders', 'transfer-oil-placeholder.svg');
  if (await exists(destination)) return publicPath(destination);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-labelledby="title"><title id="title">Transfer Oil Türkiye görsel yer tutucu</title><rect width="960" height="540" fill="#3f464d"/><path d="M0 408h960v132H0z" fill="#ff7300"/><path d="M112 132h736v188H112z" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2"/><text x="112" y="246" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">Transfer Oil Türkiye</text><text x="112" y="292" fill="#fff" fill-opacity=".72" font-family="Arial, Helvetica, sans-serif" font-size="20">UHP ürün görseli eklenecek</text></svg>`;
  await writeFile(destination, svg, 'utf8');
  return publicPath(destination);
}

async function saveCandidate(candidate, folder, filename, guessedUse, manifest, seenHashes, preferSvg = false) {
  const response = await fetchWithTimeout(candidate.url, {
    headers: { Accept: isVideo(candidate.url, candidate.mimeType) ? 'video/*,*/*;q=0.8' : 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const image = isImage(candidate.url, contentType);
  const video = isVideo(candidate.url, contentType);
  if (!image && !video) throw new Error(`Beklenen medya tipi değil: ${contentType || 'bilinmiyor'}`);

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (video && (!contentLength || contentLength > 8_000_000)) throw new Error(`Video boyutu uygun değil (${contentLength || 'bilinmiyor'} byte).`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 700) throw new Error('Çok küçük dosya atlandı.');

  const hash = createHash('sha256').update(buffer).digest('hex');
  if (seenHashes.has(hash)) {
    const localPath = seenHashes.get(hash);
    manifest.push({
      sourcePage: candidate.sourcePage,
      originalUrl: candidate.url,
      localPath,
      guessedUse,
      width: candidate.width || 'NEEDS_MANUAL_PICK',
      height: candidate.height || 'NEEDS_MANUAL_PICK',
      fileType: contentType || 'NEEDS_MANUAL_PICK',
      notes: 'Aynı içerik daha önce indirildi; mevcut dosya yeniden kullanıldı.',
      isPlaceholder: false,
    });
    return localPath;
  }

  const dir = path.join(finalRoot, folder);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(new URL(candidate.url).pathname).toLowerCase();
  const svg = image && (contentType.includes('svg') || ext === '.svg' || preferSvg);
  let destination;
  let width = candidate.width || 'NEEDS_MANUAL_PICK';
  let height = candidate.height || 'NEEDS_MANUAL_PICK';
  let fileType = contentType || 'NEEDS_MANUAL_PICK';
  let notes = '';

  if (video) {
    const videoExt = ['.mp4', '.webm', '.m4v', '.mov'].includes(ext) ? ext : '.mp4';
    destination = path.join(dir, `${filename}${videoExt}`);
    await writeFile(destination, buffer);
    notes = 'Video/animasyon dosyası özgün biçimiyle korundu.';
  } else if (svg) {
    destination = path.join(dir, `${filename}.svg`);
    await writeFile(destination, buffer);
    fileType = 'image/svg+xml';
    notes = 'SVG özgün biçimiyle korundu.';
  } else {
    const metadata = await sharp(buffer).metadata().catch(() => ({}));
    width = metadata.width || width;
    height = metadata.height || height;
    destination = path.join(dir, `${filename}.webp`);
    await sharp(buffer).rotate().webp({ quality: 82, effort: 4 }).toFile(destination);
    fileType = 'image/webp';
    notes = 'JPG/PNG görsel WebP formatına optimize edildi; ölçek büyütme yapılmadı.';
  }

  const localPath = publicPath(destination);
  seenHashes.set(hash, localPath);
  manifest.push({
    sourcePage: candidate.sourcePage,
    originalUrl: candidate.url,
    localPath,
    guessedUse,
    width,
    height,
    fileType,
    notes,
    isPlaceholder: false,
  });
  return localPath;
}

async function pickAndSave(candidates, filter, folder, filename, guessedUse, manifest, seenHashes, terms = [], preferSvg = false) {
  const picked = candidates.filter(filter).sort((a, b) => score(b, terms, preferSvg) - score(a, terms, preferSvg));
  for (const candidate of picked.slice(0, 6)) {
    try {
      return await saveCandidate(candidate, folder, filename, guessedUse, manifest, seenHashes, preferSvg);
    } catch (error) {
      manifest.push({
        sourcePage: candidate.sourcePage,
        originalUrl: candidate.url,
        localPath: '',
        guessedUse,
        width: candidate.width || 'NEEDS_MANUAL_PICK',
        height: candidate.height || 'NEEDS_MANUAL_PICK',
        fileType: candidate.mimeType || 'NEEDS_MANUAL_PICK',
        notes: `Atlandı: ${error instanceof Error ? error.message : String(error)}`,
        isPlaceholder: false,
      });
    }
  }

  const fallback = await createPlaceholder();
  manifest.push({
    sourcePage: ' '.concat([...new Set(candidates.filter(filter).map((candidate) => candidate.sourcePage))].join(', ')).trim(),
    originalUrl: '',
    localPath: fallback,
    guessedUse,
    width: '960',
    height: '540',
    fileType: 'image/svg+xml',
    notes: 'Uygun medya güvenli şekilde seçilemedi; tutarlı SVG yer tutucu kullanıldı.',
    isPlaceholder: true,
  });
  return fallback;
}

async function main() {
  await Promise.all(requiredFolders.map((folder) => mkdir(path.join(finalRoot, folder), { recursive: true })));
  await createPlaceholder();

  const manifest = [];
  const allCandidates = [];
  for (const reference of references) {
    try {
      const html = await fetchHtml(reference.url);
      allCandidates.push(...extractCandidates(html, reference));
    } catch (error) {
      manifest.push({
        sourcePage: reference.url,
        originalUrl: '',
        localPath: '',
        guessedUse: `${reference.key} sayfa keşfi`,
        width: 'NEEDS_MANUAL_PICK',
        height: 'NEEDS_MANUAL_PICK',
        fileType: 'text/html',
        notes: `Sayfa okunamadı: ${error instanceof Error ? error.message : String(error)}`,
        isPlaceholder: false,
      });
    }
  }

  const uniqueCandidates = [...new Map(allCandidates.map((candidate) => [candidate.url.replace(/#.*$/, ''), candidate])).values()];
  const seenHashes = new Map();

  const assets = {
    logoWhite: await pickAndSave(uniqueCandidates, (candidate) => /TransferOil_w\.svg|logo-white|white/i.test(candidate.url), 'logo', 'transfer-oil-logo-white', 'white logo', manifest, seenHashes, ['TransferOil_w', 'logo-white', 'white'], true),
    logoOriginal: await pickAndSave(uniqueCandidates, (candidate) => /TransferOil\.svg|TransferOil_w\.svg|logo/i.test(candidate.url), 'logo', 'transfer-oil-logo', 'original logo', manifest, seenHashes, ['TransferOil', 'logo'], true),
    hero: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'uhp' || candidate.sourceGroup === 'corporate', 'hero', 'reference-hero', 'hero/category visual', manifest, seenHashes, ['uhp', 'helix', 'hose', 'banner', 'product']),
    corporate: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'corporate', 'corporate', 'corporate-reference', 'corporate visual', manifest, seenHashes, ['company', 'quality', 'model', 'benefit']),
    exhibitions: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'exhibitions', 'exhibitions', 'exhibitions-reference', 'exhibitions visual', manifest, seenHashes, ['exhibition', 'fair', 'event']),
    news: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'news', 'news', 'news-reference', 'news visual', manifest, seenHashes, ['news', 'miniatura', 'thumbnail']),
    certificates: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'certificates-page' || candidate.sourceKey === 'certificates', 'certificates', 'certificates-reference', 'certificates visual', manifest, seenHashes, ['certificate', 'certificates', 'quality']),
    contact: await pickAndSave(uniqueCandidates, (candidate) => candidate.sourceGroup === 'contact', 'contact', 'contact-reference', 'contact visual', manifest, seenHashes, ['contact', 'support', 'office']),
    products: {},
    placeholder,
  };

  for (const [slug] of uhpReferences) {
    assets.products[slug] = await pickAndSave(
      uniqueCandidates,
      (candidate) => candidate.sourceKey === slug,
      'uhp',
      slug,
      `UHP product visual: ${slug}`,
      manifest,
      seenHashes,
      slug.split('-').concat(['uhp', 'helix', 'product', 'hose', 'adapter', 'insert', 'ferrule']),
    );
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(dataPath, `export const finalTransferOilAssets = ${JSON.stringify(assets, null, 2)} as const;\n`, 'utf8');

  const downloaded = manifest.filter((item) => item.localPath && !item.isPlaceholder).length;
  const placeholders = manifest.filter((item) => item.isPlaceholder).length;
  console.log(`Final asset discovery completed. Downloaded: ${downloaded}; placeholders: ${placeholders}; candidates: ${uniqueCandidates.length}`);
  console.log(`Manifest: ${path.relative(root, manifestPath)}`);
  console.log(`Data: ${path.relative(root, dataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
