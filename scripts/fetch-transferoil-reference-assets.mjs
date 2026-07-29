import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const assetRoot = path.join(publicRoot, 'assets', 'transfer-oil');
const manifestPath = path.join(assetRoot, 'asset-manifest.json');
const assetsDataPath = path.join(root, 'src', 'data', 'transferOilAssets.ts');

const placeholder = '/assets/transfer-oil/placeholders/uhp-product-placeholder.svg';
const fallbackLogo = '/assets/transfer-oil/logo/transfer-oil-logo.svg';
const fallbackHome = '/assets/transfer-oil/placeholders/hero-industrial-red-hose.svg';
const fallbackHydraulic = '/assets/transfer-oil/placeholders/hero-hydraulic-hose.svg';
const fallbackIndustrial = '/assets/transfer-oil/placeholders/hero-industrial-red-hose.svg';
const fallbackUhp = '/assets/transfer-oil/placeholders/hero-uhp-hose.svg';

const references = [
  { key: 'home', url: 'https://www.transferoil.com/en/default.aspx' },
  { key: 'uhp', url: 'https://www.transferoil.com/en/to-uhp-products.aspx' },
  { key: 'industrial', url: 'https://www.transferoil.com/en/to-industrial-products.aspx' },
  { key: 'hydraulic', url: 'https://www.transferoil.com/en/to-hydraulic-products.aspx' },
  { key: 'contact', url: 'https://www.transferoil.com/website/contacts.aspx' },
];

const folders = [
  'logo',
  'hero',
  'menu',
  'hydraulic',
  'industrial',
  'uhp',
  'pages',
  'pages/hydraulic',
  'pages/industrial',
  'pages/uhp',
  'pages/contact',
  'videos',
  'placeholders',
];

const targets = [
  {
    key: 'logo',
    guessedUse: 'logo',
    pages: ['home', 'uhp', 'industrial', 'hydraulic', 'contact'],
    folder: 'logo',
    filename: 'transfer-oil-logo',
    fallback: fallbackLogo,
    terms: ['logo', 'transferoil', 'transfer-oil'],
    preferSvg: true,
  },
  {
    key: 'heroHome',
    guessedUse: 'homepage hero / slider',
    pages: ['home'],
    folder: 'hero',
    filename: 'home-hero',
    fallback: fallbackHome,
    terms: ['home', 'slide', 'slider', 'hero', 'banner', 'background', 'hose', 'fluid', 'pure'],
  },
  {
    key: 'heroHydraulic',
    guessedUse: 'hydraulic hero / category strip',
    pages: ['hydraulic', 'home'],
    folder: 'hydraulic',
    filename: 'hydraulic-hero',
    fallback: fallbackHydraulic,
    terms: ['hydraulic', 'idraulic', 'medium', 'pressure', 'hose', 'banner', 'slide'],
  },
  {
    key: 'heroIndustrial',
    guessedUse: 'industrial hero / category strip',
    pages: ['industrial', 'home'],
    folder: 'industrial',
    filename: 'industrial-hero',
    fallback: fallbackIndustrial,
    terms: ['industrial', 'industriale', 'red', 'hose', 'banner', 'slide'],
  },
  {
    key: 'heroUhp',
    guessedUse: 'UHP hero / category strip',
    pages: ['uhp', 'home'],
    folder: 'uhp',
    filename: 'uhp-hero',
    fallback: fallbackUhp,
    terms: ['uhp', 'helix', 'ultra', 'pressure', 'hose', 'banner', 'slide'],
  },
  {
    key: 'menuHydraulic',
    guessedUse: 'hydraulic mega menu visual',
    pages: ['hydraulic', 'home'],
    folder: 'menu',
    filename: 'hydraulic-menu',
    fallback: '/assets/transfer-oil/placeholders/hydraulic-menu-placeholder.svg',
    terms: ['hydraulic', 'idraulic', 'hose', 'product'],
  },
  {
    key: 'menuIndustrial',
    guessedUse: 'industrial mega menu visual',
    pages: ['industrial', 'home'],
    folder: 'menu',
    filename: 'industrial-menu',
    fallback: '/assets/transfer-oil/placeholders/industrial-menu-placeholder.svg',
    terms: ['industrial', 'industriale', 'red', 'hose', 'product'],
  },
  {
    key: 'menuUhp',
    guessedUse: 'UHP mega menu visual',
    pages: ['uhp', 'home'],
    folder: 'menu',
    filename: 'uhp-menu',
    fallback: '/assets/transfer-oil/placeholders/uhp-menu-placeholder.svg',
    terms: ['uhp', 'helix', 'ultra', 'pressure', 'product'],
  },
  {
    key: 'contact',
    guessedUse: 'contact page visual',
    pages: ['contact'],
    folder: 'pages/contact',
    filename: 'contact-visual',
    fallback: placeholder,
    terms: ['contact', 'contacts', 'building', 'office', 'sacca', 'map'],
  },
];

const videoTarget = {
  key: 'homeHeroVideo',
  guessedUse: 'homepage hero video / animation',
  pages: ['home'],
  folder: 'videos',
  filename: 'home-hero',
  fallback: '',
  terms: ['hero', 'home', 'slide', 'video', 'mp4', 'webm'],
};

function publicPath(filePath) {
  return `/${path.relative(publicRoot, filePath).replaceAll(path.sep, '/')}`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isWhitelistedUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && ['transferoil.com', 'www.transferoil.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function decodeEntities(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function isImageLike(url, contentType = '') {
  return /image/i.test(contentType) || /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url);
}

function isVideoLike(url, contentType = '') {
  return /video/i.test(contentType) || /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
}

function shouldSkipUrl(url) {
  return /(?:cookie|tracking|analytics|pixel|sprite|flag|favicon|ico|search|arrow|caret|loader|spinner|facebook|instagram|linkedin|youtube|social|whatsapp|user|login)/i.test(url);
}

function cleanUrlForScore(url) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(`${parsed.pathname} ${parsed.search}`).toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

function scoreCandidate(candidate, target, wantVideo = false) {
  const haystack = `${cleanUrlForScore(candidate.url)} ${candidate.alt} ${candidate.context}`.toLowerCase();
  let score = target.pages.includes(candidate.pageKey) ? 14 : 0;

  for (const term of target.terms) {
    if (haystack.includes(term.toLowerCase())) score += 6;
  }

  if (target.preferSvg && /\.svg(?:[?#]|$)/i.test(candidate.url)) score += 15;
  if (wantVideo && isVideoLike(candidate.url)) score += 20;
  if (!wantVideo && isImageLike(candidate.url)) score += 10;
  if (candidate.context.includes('background')) score += 5;
  if (candidate.context.includes('srcset')) score += 3;

  const width = Number(candidate.width) || 0;
  const height = Number(candidate.height) || 0;
  if (width >= 900 && height >= 260) score += 8;
  if (width >= 300 && height >= 120) score += 4;
  if (width && height && (width < 70 || height < 30) && !target.preferSvg) score -= 14;
  if (/thumb|thumbnail|mini|small/i.test(haystack)) score -= 3;

  return score;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 18_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'TransferOilTurkiye-ReferenceAssetFetcher/1.0',
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  }, 10_000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function attrsFromTag(tag) {
  const attrs = {};
  const attrPattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attrs;
}

function srcsetUrls(srcset) {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
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

function extractCandidates(html, reference) {
  const candidates = [];
  const add = (rawUrl, context, attrs = {}) => {
    const url = absoluteUrl(rawUrl, reference.url);
    if (!url || !isWhitelistedUrl(url) || shouldSkipUrl(url)) return;
    if (!isImageLike(url, attrs.type) && !isVideoLike(url, attrs.type)) return;
    candidates.push({
      url,
      pageKey: reference.key,
      sourcePage: reference.url,
      context,
      alt: attrs.alt || attrs.title || attrs['aria-label'] || '',
      width: attrs.width || '',
      height: attrs.height || '',
      mimeType: attrs.type || '',
    });
  };

  const tagPattern = /<(img|source|video)\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html))) {
    const attrs = attrsFromTag(tagMatch[0]);
    add(attrs.src, `${tagMatch[1]} src`, attrs);
    add(attrs['data-src'], `${tagMatch[1]} data-src`, attrs);
    add(attrs.poster, `${tagMatch[1]} poster`, attrs);
    for (const url of srcsetUrls(attrs.srcset)) add(url, `${tagMatch[1]} srcset`, attrs);
  }

  const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let cssMatch;
  while ((cssMatch = cssPattern.exec(html))) add(cssMatch[1], 'inline/css background-image');

  const dataBackgroundPattern = /\b(?:data-bg|data-background|data-image|data-img)\s*=\s*["']([^"']+)["']/gi;
  let dataMatch;
  while ((dataMatch = dataBackgroundPattern.exec(html))) add(dataMatch[1], 'data background');

  return candidates;
}

async function collectCandidates(manifest) {
  const all = [];
  for (const reference of references) {
    try {
      const html = await fetchText(reference.url);
      all.push(...extractCandidates(html, reference));
    } catch (error) {
      manifest.push({
        sourcePage: reference.url,
        originalUrl: '',
        localPath: '',
        guessedUse: 'reference page discovery',
        width: 'NEEDS_MANUAL_PICK',
        height: 'NEEDS_MANUAL_PICK',
        fileType: 'text/html',
        notes: `Sayfa okunamadı: ${error instanceof Error ? error.message : String(error)}`,
        isPlaceholder: false,
      });
    }
  }

  const byUrl = new Map();
  for (const candidate of all) {
    const key = candidate.url.replace(/#.*$/, '');
    if (!byUrl.has(key)) byUrl.set(key, candidate);
  }
  return [...byUrl.values()];
}

async function downloadAndSave(candidate, target, manifest, seenHashes, wantVideo = false) {
  const response = await fetchWithTimeout(candidate.url, {
    headers: {
      Accept: wantVideo ? 'video/*,*/*;q=0.8' : 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
    },
  }, 8_000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (wantVideo ? !isVideoLike(candidate.url, contentType) : !isImageLike(candidate.url, contentType)) {
    throw new Error(`Beklenen medya tipi bulunamadı: ${contentType || 'bilinmiyor'}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (wantVideo && (!contentLength || contentLength > 8_000_000)) {
    const sizeNote = contentLength ? `${contentLength} byte` : 'boyut bilgisi yok';
    throw new Error(`Video dosyası indirilmeye uygun değil (${sizeNote}); statik fallback kullanılacak.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 700) throw new Error('Çok küçük medya dosyası atlandı.');

  const hash = createHash('sha256').update(buffer).digest('hex');
  if (seenHashes.has(hash)) {
    const duplicateLocalPath = seenHashes.get(hash);
    manifest.push({
      sourcePage: candidate.sourcePage,
      originalUrl: candidate.url,
      localPath: duplicateLocalPath,
      guessedUse: target.guessedUse,
      width: candidate.width || 'NEEDS_MANUAL_PICK',
      height: candidate.height || 'NEEDS_MANUAL_PICK',
      fileType: contentType || 'NEEDS_MANUAL_PICK',
      notes: 'Aynı içerik daha önce indirildi; mevcut dosya yeniden kullanıldı.',
      isPlaceholder: false,
    });
    return duplicateLocalPath;
  }

  const destinationDir = path.join(assetRoot, target.folder);
  await mkdir(destinationDir, { recursive: true });

  const originalExtension = path.extname(new URL(candidate.url).pathname).toLowerCase();
  const isSvg = contentType.includes('svg') || originalExtension === '.svg';
  const isVideo = isVideoLike(candidate.url, contentType);
  let destination;
  let width = candidate.width || 'NEEDS_MANUAL_PICK';
  let height = candidate.height || 'NEEDS_MANUAL_PICK';
  let fileType = contentType || 'NEEDS_MANUAL_PICK';
  let notes;

  if (isVideo) {
    const extension = ['.mp4', '.webm', '.mov', '.m4v'].includes(originalExtension) ? originalExtension : '.mp4';
    destination = path.join(destinationDir, `${target.filename}${extension}`);
    await writeFile(destination, buffer);
    notes = 'Video/animasyon dosyası özgün biçimiyle korundu.';
  } else if (isSvg) {
    destination = path.join(destinationDir, `${target.filename}.svg`);
    await writeFile(destination, buffer);
    fileType = 'image/svg+xml';
    notes = 'SVG özgün biçimiyle korundu.';
  } else {
    const metadata = await sharp(buffer).metadata().catch(() => ({}));
    width = metadata.width || width;
    height = metadata.height || height;
    destination = path.join(destinationDir, `${target.filename}.webp`);
    await sharp(buffer).rotate().webp({ quality: 82, effort: 4 }).toFile(destination);
    fileType = 'image/webp';
    notes = 'Kaynak görsel optimize edilerek WebP formatına çevrildi; ölçek büyütme yapılmadı.';
  }

  const localPath = publicPath(destination);
  seenHashes.set(hash, localPath);
  manifest.push({
    sourcePage: candidate.sourcePage,
    originalUrl: candidate.url,
    localPath,
    guessedUse: target.guessedUse,
    width,
    height,
    fileType,
    notes,
    isPlaceholder: false,
  });
  return localPath;
}

async function resolveFallback(target) {
  if (!target.fallback) return '';
  const fallbackOnDisk = path.join(publicRoot, target.fallback.replace(/^\//, ''));
  if (await exists(fallbackOnDisk)) return target.fallback;
  return placeholder;
}

async function main() {
  await Promise.all(folders.map((folder) => mkdir(path.join(assetRoot, folder), { recursive: true })));

  const manifest = [];
  const seenHashes = new Map();
  const candidates = await collectCandidates(manifest);
  const mapping = {};

  for (const target of targets) {
    const ranked = candidates
      .filter((candidate) => target.pages.includes(candidate.pageKey) && isImageLike(candidate.url, candidate.mimeType))
      .sort((a, b) => scoreCandidate(b, target) - scoreCandidate(a, target));

    let selectedPath = '';
    for (const candidate of ranked.slice(0, 5)) {
      try {
        selectedPath = await downloadAndSave(candidate, target, manifest, seenHashes);
        break;
      } catch (error) {
        manifest.push({
          sourcePage: candidate.sourcePage,
          originalUrl: candidate.url,
          localPath: '',
          guessedUse: target.guessedUse,
          width: candidate.width || 'NEEDS_MANUAL_PICK',
          height: candidate.height || 'NEEDS_MANUAL_PICK',
          fileType: candidate.mimeType || 'NEEDS_MANUAL_PICK',
          notes: `Atlandı: ${error instanceof Error ? error.message : String(error)}`,
          isPlaceholder: false,
        });
      }
    }

    if (!selectedPath) {
      selectedPath = await resolveFallback(target);
      manifest.push({
        sourcePage: target.pages.map((key) => references.find((reference) => reference.key === key)?.url).filter(Boolean).join(', '),
        originalUrl: '',
        localPath: selectedPath,
        guessedUse: target.guessedUse,
        width: 'NEEDS_MANUAL_PICK',
        height: 'NEEDS_MANUAL_PICK',
        fileType: selectedPath.endsWith('.svg') ? 'image/svg+xml' : 'NEEDS_MANUAL_PICK',
        notes: 'Uygun Transfer Oil medya dosyası güvenli biçimde seçilemedi; mevcut yer tutucu kullanıldı.',
        isPlaceholder: true,
      });
    }

    mapping[target.key] = selectedPath;
  }

  mapping[videoTarget.key] = '';
  const videoCandidates = candidates
    .filter((candidate) => videoTarget.pages.includes(candidate.pageKey) && isVideoLike(candidate.url, candidate.mimeType))
    .sort((a, b) => scoreCandidate(b, videoTarget, true) - scoreCandidate(a, videoTarget, true));

  for (const candidate of videoCandidates.slice(0, 6)) {
    try {
      mapping[videoTarget.key] = await downloadAndSave(candidate, videoTarget, manifest, seenHashes, true);
      break;
    } catch (error) {
      manifest.push({
        sourcePage: candidate.sourcePage,
        originalUrl: candidate.url,
        localPath: '',
        guessedUse: videoTarget.guessedUse,
        width: candidate.width || 'NEEDS_MANUAL_PICK',
        height: candidate.height || 'NEEDS_MANUAL_PICK',
        fileType: candidate.mimeType || 'video',
        notes: `Video atlandı: ${error instanceof Error ? error.message : String(error)}`,
        isPlaceholder: false,
      });
    }
  }

  if (!mapping[videoTarget.key]) {
    manifest.push({
      sourcePage: references.find((reference) => reference.key === 'home')?.url ?? '',
      originalUrl: '',
      localPath: '',
      guessedUse: videoTarget.guessedUse,
      width: 'NEEDS_MANUAL_PICK',
      height: 'NEEDS_MANUAL_PICK',
      fileType: 'video',
      notes: 'Whitelisted ana sayfada doğrudan kullanılabilir hero video/animasyon dosyası seçilemedi; statik görsel fallback kullanılıyor.',
      isPlaceholder: true,
    });
  }

  mapping.placeholder = placeholder;

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(assetsDataPath, `export const transferOilAssets = ${JSON.stringify(mapping, null, 2)} as const;\n`, 'utf8');

  const downloaded = manifest.filter((entry) => entry.localPath && !entry.isPlaceholder).length;
  const placeholders = manifest.filter((entry) => entry.isPlaceholder).length;
  console.log(`Reference asset discovery completed. Downloaded: ${downloaded}; placeholders: ${placeholders}; candidates: ${candidates.length}`);
  console.log(`Manifest: ${path.relative(root, manifestPath)}`);
  console.log(`Mapping: ${path.relative(root, assetsDataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
