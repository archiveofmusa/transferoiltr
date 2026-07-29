import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { readMp4Metadata } from './lib/mp4-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const transferOilRoot = path.join(publicRoot, 'assets', 'transfer-oil');
const hdRoot = path.join(transferOilRoot, 'hd');
const originalsRoot = path.join(hdRoot, 'originals');
const responsiveRoot = path.join(hdRoot, 'responsive');
const manifestPath = path.join(root, 'transferoil_link_manifest.json');
const legacyAssetManifestPath = path.join(transferOilRoot, 'asset-manifest.json');
const sourcePageManifestPath = path.join(transferOilRoot, 'source-page-manifest.json');
const routeManifestPath = path.join(root, 'src', 'data', 'transferoil', 'routes.generated.json');
const resolutionManifestPath = path.join(root, 'src', 'data', 'transferoil', 'source-resolution.generated.json');
const sourceCacheRoot = path.join(root, '.cache', 'transferoil', 'source-html');
const outputManifestPath = path.join(transferOilRoot, 'hd-media-manifest.json');
const outputRegistryPath = path.join(root, 'src', 'data', 'transferoil', 'hd-assets.generated.ts');

const EXPECTED_SOURCE_ROWS = 343;
const args = new Set(process.argv.slice(2));
const livePages = args.has('--live');
const offline = args.has('--offline');
const force = args.has('--force');
const limitArgument = process.argv.find((item) => item.startsWith('--limit='));
const limit = limitArgument ? Math.max(1, Number(limitArgument.split('=')[1])) : EXPECTED_SOURCE_ROWS;
const downloadConcurrencyArgument = process.argv.find((item) => item.startsWith('--concurrency='));
const downloadConcurrency = Math.max(1, Math.min(8, Number(downloadConcurrencyArgument?.split('=')[1] ?? 4)));
const officialHosts = new Set(['transferoil.com', 'www.transferoil.com']);
const mediaExtensionPattern = /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)(?:[?#]|$)/i;
const rasterMimePattern = /^image\/(?:avif|jpeg|png|webp)$/i;
const videoMimePattern = /^video\//i;
const bundledFfmpegPath = 'C:\\Users\\user1\\AppData\\Local\\ms-playwright\\ffmpeg-1011\\ffmpeg-win64.exe';
const semanticLegacyPathOfficialUrls = new Map([
  ['/assets/transfer-oil/menu/hydraulic-menu.webp', 'https://www.transferoil.com/website/images/home/hydraulic.png'],
  ['/assets/transfer-oil/menu/industrial-menu.webp', 'https://www.transferoil.com/website/images/home/industrial.png'],
]);

const directoryLayout = [
  'originals', 'responsive', 'hero', 'menus/company', 'menus/hydraulic', 'menus/industrial', 'menus/uhp',
  'corporate', 'hydraulic', 'industrial', 'uhp', 'fittings', 'products', 'news',
  'exhibitions', 'certificates', 'videos', 'posters', 'svg',
  'responsive/hero', 'responsive/menus/company', 'responsive/menus/hydraulic', 'responsive/menus/industrial', 'responsive/menus/uhp',
  'responsive/corporate', 'responsive/hydraulic', 'responsive/industrial', 'responsive/uhp', 'responsive/fittings',
  'responsive/products', 'responsive/news', 'responsive/exhibitions', 'responsive/certificates', 'responsive/posters',
];

const asPosix = (value) => value.replaceAll(path.sep, '/');
const publicUrl = (filePath) => `/${asPosix(path.relative(publicRoot, filePath))}`;
const absolutePublicFile = (value) => path.join(publicRoot, String(value).replace(/^\//, '').replaceAll('/', path.sep));

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function hashBuffer(buffer, algorithm = 'sha256') {
  return createHash(algorithm).update(buffer).digest('hex');
}

function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.href;
  } catch {
    return null;
  }
}

function absoluteUrl(raw, baseUrl) {
  const value = decodeEntities(String(raw ?? '')).trim();
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    url.hash = '';
    if (!officialHosts.has(url.hostname.toLowerCase())) return null;
    return normalizeUrl(url.href);
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x2F;', '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function slug(value, maximumLength = 84) {
  return String(value || 'media')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, maximumLength) || 'media';
}

function tagAttributes(tag) {
  const attributes = {};
  const pattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attributes;
}

function parseSrcset(value, baseUrl) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [rawUrl, descriptor = ''] = item.split(/\s+/, 2);
      const url = absoluteUrl(rawUrl, baseUrl);
      const widthMatch = descriptor.match(/^(\d+)w$/i);
      const densityMatch = descriptor.match(/^([\d.]+)x$/i);
      return url ? {
        url,
        descriptor: descriptor || null,
        width: widthMatch ? Number(widthMatch[1]) : null,
        density: densityMatch ? Number(densityMatch[1]) : null,
      } : null;
    })
    .filter(Boolean);
}

function shouldExcludeCandidate(url, context = '') {
  const haystack = `${decodeURIComponent(new URL(url).pathname)} ${context}`.toLowerCase();
  if (/(?:analytics|tracking|pixel|beacon|doubleclick|google-analytics)/.test(haystack)) return 'tracking';
  if (/(?:favicon|apple-touch-icon|browserconfig)/.test(haystack)) return 'browser-icon';
  if (/(?:\/fonts?\/|\/webfonts?\/|fa-(?:brands|regular|solid)|materialdesignicons|\/font\/transferoil\.svg)/.test(haystack)) return 'font';
  if (/(?:ui-bg_|ui-icons_|animated-overlay|fancybox\/(?:blank|fancybox)|jquery-ui|tracking-pixel)/.test(haystack)) return 'legacy-ui-sprite';
  if (/(?:flag[-_/]|\/flags\/)/.test(haystack)) return 'unused-language-flag';
  if (/(?:user_w|search-orange|search\.svg|arrow(?:[-_]|\.)|linkedin|youtube|facebook|instagram|social|cookie|close(?:[-_]|\.)|play-button)/.test(haystack)) return 'non-content-ui-icon';
  if (/(?:spinner|loader|loading|blank\.(?:gif|png)|spacer|transparent)/.test(haystack)) return 'loading-or-spacer';
  return null;
}

function candidateQualityScore(url, candidate = {}) {
  let score = 0;
  const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
  const width = Number(candidate.width) || 0;
  const density = Number(candidate.density) || 0;
  score += width || density * 10_000;
  if (/\/(?:large|original|zoom|full)(?:\/|[-_])/.test(pathname)) score += 50_000;
  if (/(?:[-_]|\b)(?:thumb|thumbnail|small|mini|preview)(?:[-_.]|\b)/.test(pathname)) score -= 40_000;
  if (/(?:[-_])200(?=\.[a-z0-9]+$)/.test(pathname)) score -= 30_000;
  if (/\/(?:standard|medium)\//.test(pathname)) score -= 10_000;
  return score;
}

function preferredOriginalAlternatives(url) {
  const alternatives = [url];
  try {
    const parsed = new URL(url);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const without200 = decodedPath.replace(/-200(?=\.[^.\/]+$)/i, '');
    if (without200 !== decodedPath) {
      const upgraded = new URL(parsed.href);
      upgraded.pathname = without200;
      alternatives.unshift(upgraded.href);
    }
    if (/\/standard\//i.test(decodedPath)) {
      const upgraded = new URL(parsed.href);
      upgraded.pathname = decodedPath.replace(/\/standard\//i, '/large/');
      alternatives.unshift(upgraded.href);
    }
    if (/\/large\//i.test(decodedPath)) {
      const standard = new URL(parsed.href);
      standard.pathname = decodedPath.replace(/\/large\//i, '/standard/');
      alternatives.push(standard.href);
    }
    if (/^\/en\/about-us\/images\//i.test(decodedPath)) {
      const upgraded = new URL(parsed.href);
      upgraded.pathname = decodedPath.replace(/^\/en\/about-us\/images\//i, '/website/images/');
      alternatives.unshift(upgraded.href);
    }
  } catch { /* Keep the original URL only. */ }
  return [...new Set(alternatives.map(normalizeUrl).filter(Boolean))];
}

function extractCachedCandidates(html, pageUrl) {
  const candidates = [];
  const add = (raw, context, elementType, srcsetCandidates = []) => {
    const url = absoluteUrl(raw, pageUrl);
    if (!url || !mediaExtensionPattern.test(url)) return;
    const exclusionReason = shouldExcludeCandidate(url, context);
    candidates.push({ url, context, elementType, srcsetCandidates, exclusionReason });
  };

  const tagPattern = /<(img|source|video)\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html))) {
    const elementType = tagMatch[1].toLowerCase();
    const attributes = tagAttributes(tagMatch[0]);
    const srcsetCandidates = [
      ...parseSrcset(attributes.srcset, pageUrl),
      ...parseSrcset(attributes['data-srcset'], pageUrl),
    ];
    for (const [attribute, context] of [
      ['src', `${elementType} src`],
      ['data-src', `${elementType} data-src`],
      ['data-original', `${elementType} data-original`],
      ['data-lazy', `${elementType} data-lazy`],
      ['poster', `${elementType} poster`],
    ]) add(attributes[attribute], context, elementType, srcsetCandidates);
    for (const candidate of srcsetCandidates) add(candidate.url, `${elementType} srcset`, elementType, srcsetCandidates);
  }

  const metaPattern = /<(?:meta|link)\b[^>]*>/gi;
  let metaMatch;
  while ((metaMatch = metaPattern.exec(html))) {
    const attributes = tagAttributes(metaMatch[0]);
    const purpose = `${attributes.property ?? ''} ${attributes.name ?? ''} ${attributes.rel ?? ''} ${attributes.as ?? ''}`;
    if (/(?:og:image|twitter:image|preload\s+image|image_src)/i.test(purpose)) {
      add(attributes.content ?? attributes.href, purpose.trim(), 'metadata');
    }
  }

  const styleUrlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let styleMatch;
  while ((styleMatch = styleUrlPattern.exec(html))) add(styleMatch[1], 'CSS background-image', 'background');

  const directMediaPattern = /["']((?:https?:)?\/\/[^"']+\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)(?:\?[^"']*)?|\/[^"']+\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)(?:\?[^"']*)?)["']/gi;
  let directMatch;
  while ((directMatch = directMediaPattern.exec(html))) add(directMatch[1], 'HTML/JSON/JavaScript media configuration', 'configuration');

  const byUrl = new Map();
  for (const candidate of candidates) {
    if (!byUrl.has(candidate.url)) byUrl.set(candidate.url, candidate);
    const current = byUrl.get(candidate.url);
    current.srcsetCandidates = [...new Map(
      [...(current.srcsetCandidates ?? []), ...(candidate.srcsetCandidates ?? [])].map((item) => [item.url, item]),
    ).values()];
    if (!current.exclusionReason && candidate.exclusionReason) current.exclusionReason = candidate.exclusionReason;
  }
  return [...byUrl.values()];
}

function candidateName(url) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    return slug(path.basename(pathname, path.extname(pathname)), 120);
  } catch {
    return '';
  }
}

function recoverOriginalUrl(asset, candidatesByPageId) {
  if (asset.originalUrl) return { url: normalizeUrl(asset.originalUrl), recovered: false };
  const idMatch = path.basename(asset.localPath ?? '').match(/^(\d{3})-/);
  if (!idMatch) return { url: null, recovered: false };
  const pageId = Number(idMatch[1]);
  const localStem = slug(path.basename(asset.localPath, path.extname(asset.localPath)).replace(/^\d{3}-/, ''), 160);
  const ranked = (candidatesByPageId.get(pageId) ?? [])
    .filter((candidate) => !candidate.exclusionReason)
    .map((candidate) => {
      const remoteStem = candidateName(candidate.url);
      let score = 0;
      if (remoteStem && localStem.endsWith(remoteStem)) score = 200 + remoteStem.length;
      else if (remoteStem && localStem.includes(remoteStem)) score = 120 + remoteStem.length;
      else if (remoteStem && remoteStem.includes(localStem)) score = 80 + localStem.length;
      return { ...candidate, score };
    })
    .filter((candidate) => candidate.score >= 90)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length || (ranked[1] && ranked[0].score === ranked[1].score && ranked[0].url !== ranked[1].url)) {
    return { url: null, recovered: false };
  }
  return { url: ranked[0].url, recovered: true, candidate: ranked[0] };
}

function highestSrcsetCandidate(candidate, fallbackUrl) {
  const values = candidate?.srcsetCandidates ?? [];
  if (!values.length) {
    const alternatives = fallbackUrl ? preferredOriginalAlternatives(fallbackUrl) : [];
    return {
      selectedUrl: alternatives[0] ?? fallbackUrl,
      candidates: alternatives.map((url) => ({ url, descriptor: url === fallbackUrl ? null : 'filename-upgrade', width: null, density: null })),
      reason: alternatives[0] !== fallbackUrl
        ? 'A public full-resolution filename counterpart was preferred over the official -200/standard derivative; download validation will fall back safely if unavailable.'
        : 'No srcset candidate was recorded; the verified official source URL was selected.',
    };
  }
  const ranked = [...values].sort((left, right) => candidateQualityScore(right.url, right) - candidateQualityScore(left.url, left));
  return {
    selectedUrl: ranked[0].url,
    candidates: ranked,
    reason: `The largest recorded srcset candidate (${ranked[0].descriptor ?? 'highest available candidate'}) was selected.`,
  };
}

function extensionFromMime(mimeType, sourceUrl = '') {
  const normalized = String(mimeType ?? '').split(';')[0].trim().toLowerCase();
  const mapping = {
    'image/avif': '.avif', 'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/png': '.png',
    'image/svg+xml': '.svg', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm',
    'video/quicktime': '.mov', 'video/x-m4v': '.m4v',
  };
  if (mapping[normalized]) return mapping[normalized];
  try {
    const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
    if (/^\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)$/.test(extension)) return extension === '.jpeg' ? '.jpg' : extension;
  } catch { /* Fall back below. */ }
  return '.bin';
}

function mimeFromExtension(filePath) {
  return {
    '.avif': 'image/avif', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4',
    '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v',
  }[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function mediaFolder(asset) {
  const local = String(asset.localPath ?? '').toLowerCase();
  const use = String(asset.guessedUse ?? '').toLowerCase();
  if (/poster/.test(use)) return 'posters';
  if (/hero|slider/.test(use) || local.includes('/hero/')) return 'hero';
  if (/mega men|\/menus?\//.test(`${use} ${local}`)) {
    if (/company|corporate|kurumsal|sirket|şirket/.test(`${use} ${local}`)) return 'menus/company';
    if (/hydraulic/.test(`${use} ${local}`)) return 'menus/hydraulic';
    if (/industrial/.test(`${use} ${local}`)) return 'menus/industrial';
    if (/uhp/.test(`${use} ${local}`)) return 'menus/uhp';
  }
  for (const folder of ['corporate', 'hydraulic', 'industrial', 'uhp', 'fittings', 'products', 'news', 'exhibitions', 'certificates']) {
    if (local.includes(`/${folder}/`)) return folder;
  }
  if (/sertifika|certificate/.test(`${use} ${local}`)) return 'certificates';
  if (/product|ürün|insert|ferrule|adapter|accessor/.test(`${use} ${local}`)) return 'products';
  return 'products';
}

function guessedUseForCandidate(candidate, row) {
  const combined = `${row?.mainSection ?? ''} ${row?.hierarchy ?? ''} ${row?.pageType ?? ''} ${decodeURIComponent(new URL(candidate.url).pathname)}`.toLowerCase();
  if (/video|\.mp4|\.webm|\.mov|\.m4v/.test(`${candidate.elementType} ${candidate.mimeType} ${candidate.url}`)) return 'Official Transfer Oil video or animation media';
  if (/default\.aspx|home|slider|flash/.test(combined)) return 'Official Transfer Oil hero or slider media';
  if (/about-us|company|corporate|quality|manufacturing|benefit/.test(combined)) return 'Official Transfer Oil corporate content media';
  if (/exhibition/.test(combined)) return 'Official Transfer Oil exhibition content media';
  if (/news/.test(combined)) return 'Official Transfer Oil news content media';
  if (/certificate/.test(combined)) return 'Official Transfer Oil certificate content media';
  if (/uhp|helix/.test(combined)) return 'Official Transfer Oil UHP product content media';
  if (/hydraulic/.test(combined)) return 'Official Transfer Oil hydraulic product content media';
  if (/industrial/.test(combined)) return 'Official Transfer Oil industrial product content media';
  if (/fitting|insert|ferrule|adapter|accessor/.test(combined)) return 'Official Transfer Oil fittings/product content media';
  return 'Official Transfer Oil visible content media';
}

function responsiveWidths(folder, originalWidth) {
  const requested = folder === 'hero'
    ? [1920, 1440, 1024, 768]
    : folder.startsWith('menus/')
      ? [1600, 1200, 800, 480]
      : [1600, 1200, 800, 480];
  return [...new Set(requested.filter((width) => width < originalWidth))].sort((a, b) => b - a);
}

async function fetchBuffer(url, attempts = 3) {
  const failures = [];
  const isVideoUrl = /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i.test(url);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), isVideoUrl ? 10 * 60_000 : 45_000);
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'TransferOilTurkiye-HD-Media-Audit/1.0', Accept: 'image/*,video/*,*/*;q=0.5' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) throw new Error('zero-byte response');
      const responseMime = String(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (/(?:text\/html|application\/json|text\/plain)/.test(responseMime)) throw new Error(`unexpected non-media content type ${responseMime}`);
      return {
        buffer,
        mimeType: responseMime || null,
        resolvedUrl: response.url,
        status: response.status,
        contentLength: Number(response.headers.get('content-length')) || buffer.length,
      };
    } catch (error) {
      failures.push(`attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(failures.join(' | '));
}

async function fetchBestCandidate(item, downloadCache = new Map()) {
  const candidateUrls = [...new Set([
    item.selectedUrl,
    ...(item.srcsetCandidates ?? []).map((candidate) => candidate.url),
    item.originalUrl,
  ].flatMap((url) => url ? preferredOriginalAlternatives(url) : []).filter(Boolean))]
    .sort((left, right) => candidateQualityScore(right) - candidateQualityScore(left));
  const failures = [];
  for (const url of candidateUrls) {
    try {
      if (!downloadCache.has(url)) downloadCache.set(url, fetchBuffer(url, /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i.test(url) ? 1 : 3));
      return { ...await downloadCache.get(url), selectedUrl: url, candidateFailures: failures };
    } catch (error) {
      failures.push({ url, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  throw new Error(failures.map((failure) => `${failure.url}: ${failure.reason}`).join(' | ') || 'No official candidate URL was available.');
}

async function inspectVideoMetadata(filePath) {
  let ffmpegResult = { width: null, height: null, bitrateKbps: null, durationSeconds: null, frameRate: null, inspectionNote: 'Bundled ffmpeg was not available.' };
  if (await exists(bundledFfmpegPath)) {
    ffmpegResult = await new Promise((resolve) => {
      const child = spawn(bundledFfmpegPath, ['-hide_banner', '-i', filePath], { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => resolve({ width: null, height: null, bitrateKbps: null, durationSeconds: null, frameRate: null, inspectionNote: `ffmpeg metadata inspection failed: ${error.message}` }));
      child.on('close', () => {
        const duration = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i);
        const videoLine = stderr.split(/\r?\n/).find((line) => /Video:/i.test(line)) ?? '';
        const dimensions = videoLine.match(/(?:^|[,\s])(\d{2,5})x(\d{2,5})(?:\s|,|\[)/);
        const bitrate = stderr.match(/bitrate:\s*(\d+(?:\.\d+)?)\s*kb\/s/i);
        const frameRate = videoLine.match(/(\d+(?:\.\d+)?)\s*fps/i);
        const durationSeconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : null;
        resolve({
          width: dimensions ? Number(dimensions[1]) : null,
          height: dimensions ? Number(dimensions[2]) : null,
          bitrateKbps: bitrate ? Number(bitrate[1]) : null,
          durationSeconds,
          frameRate: frameRate ? Number(frameRate[1]) : null,
          inspectionNote: dimensions || duration || bitrate ? 'Parsed with bundled Playwright ffmpeg (`ffmpeg -i`) because ffprobe is unavailable.' : 'Bundled ffmpeg could not demux this MP4 build; Chromium metadata fallback was requested.',
        });
      });
    });
  }
  if (ffmpegResult.width && ffmpegResult.height && ffmpegResult.durationSeconds) return ffmpegResult;
  if (/\.mp4$/i.test(filePath)) {
    try {
      return await readMp4Metadata(filePath);
    } catch { /* Fall through to Chromium for malformed or non-ISO media. */ }
  }
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(filePath).href, { waitUntil: 'commit', timeout: 30_000 });
      const metadata = await page.evaluate(async () => {
        const video = document.querySelector('video');
        if (!video) throw new Error('Chromium did not create a video element.');
        while (video.readyState < 1) await new Promise((resolve) => setTimeout(resolve, 50));
        video.muted = true;
        video.currentTime = 0;
        const initialFrames = video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
        await video.play();
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        video.pause();
        const decodedFrames = (video.getVideoPlaybackQuality?.().totalVideoFrames ?? initialFrames) - initialFrames;
        return { width: video.videoWidth, height: video.videoHeight, durationSeconds: video.duration, sampleSeconds: video.currentTime, decodedFrames };
      });
      const rawFrameRate = metadata.sampleSeconds > 0 ? Math.max(0, metadata.decodedFrames - 2) / metadata.sampleSeconds : null;
      const standards = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
      const nearest = rawFrameRate === null ? null : standards.reduce((best, value) => Math.abs(value - rawFrameRate) < Math.abs(best - rawFrameRate) ? value : best, standards[0]);
      const frameRate = rawFrameRate !== null && Math.abs(nearest - rawFrameRate) <= 2 ? nearest : (rawFrameRate ? Number(rawFrameRate.toFixed(3)) : null);
      const bytes = (await stat(filePath)).size;
      return {
        width: metadata.width || null,
        height: metadata.height || null,
        bitrateKbps: metadata.durationSeconds ? Number(((bytes * 8) / metadata.durationSeconds / 1000).toFixed(2)) : null,
        durationSeconds: Number.isFinite(metadata.durationSeconds) ? Number(metadata.durationSeconds.toFixed(3)) : null,
        frameRate,
        inspectionNote: `${ffmpegResult.inspectionNote} Dimensions/duration/frame-rate were measured with local Chromium media metadata; bitrate is the exact file-size average.`,
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { ...ffmpegResult, inspectionNote: `${ffmpegResult.inspectionNote} Chromium fallback failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function auditLivePage(context, row, requestedUrl) {
  const page = await context.newPage();
  const network = [];
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.responseReceived', ({ type, response }) => {
    if (!['Image', 'Media'].includes(type) && !/(?:image|video)/i.test(response.mimeType ?? '')) return;
    network.push({
      url: response.url,
      resourceType: `cdp-${String(type).toLowerCase()}`,
      mimeType: response.mimeType || null,
      contentLength: Number(response.encodedDataLength) || null,
      status: response.status,
      redirects: [],
      protocolEvidence: 'Chrome DevTools Protocol Network.responseReceived',
    });
  });
  page.on('response', async (response) => {
    const request = response.request();
    const headers = await response.allHeaders().catch(() => ({}));
    const resourceType = request.resourceType();
    const contentType = headers['content-type'] ?? '';
    if (!['image', 'media', 'font', 'stylesheet', 'fetch', 'xhr'].includes(resourceType) && !/(?:image|video|font|css|json)/i.test(contentType)) return;
    const redirects = [];
    let previous = request.redirectedFrom();
    while (previous) {
      redirects.unshift(previous.url());
      previous = previous.redirectedFrom();
    }
    network.push({
      url: response.url(), resourceType, mimeType: contentType.split(';')[0] || null,
      contentLength: Number(headers['content-length']) || null, status: response.status(), redirects,
      protocolEvidence: 'Playwright Response API',
    });
  });

  try {
    const navigationResponse = await page.goto(requestedUrl, { waitUntil: 'commit', timeout: 45_000 });
    if (navigationResponse && navigationResponse.status() >= 400) throw new Error(`HTTP ${navigationResponse.status()} for ${requestedUrl}`);
    await page.waitForLoadState('domcontentloaded', { timeout: 18_000 }).catch(() => {});
    await page.locator('body').waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(650);
    await page.evaluate(async () => {
      for (let top = 0; top < document.documentElement.scrollHeight; top += Math.max(400, window.innerHeight * 0.75)) {
        window.scrollTo({ top, behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 65));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    for (const selector of ['nav a', '[role="menuitem"]', '.menu a']) {
      const targets = page.locator(selector);
      const count = Math.min(await targets.count(), 20);
      for (let index = 0; index < count; index += 1) {
        const target = targets.nth(index);
        if (!await target.isVisible().catch(() => false)) continue;
        await target.hover({ timeout: 300 }).catch(() => {});
      }
    }
    for (const selector of ['[role="tab"]', '.tabs a[href^="#"]', '.accordion button', '[data-toggle="tab"]']) {
      const targets = page.locator(selector);
      const count = Math.min(await targets.count(), 20);
      for (let index = 0; index < count; index += 1) {
        const target = targets.nth(index);
        if (!await target.isVisible().catch(() => false)) continue;
        await target.click({ timeout: 800 }).catch(() => {});
        await page.waitForTimeout(75);
      }
    }
    for (const selector of ['[aria-label*="next" i]', '.flex-next', '.slick-next', '.swiper-button-next']) {
      const next = page.locator(selector).first();
      if (await next.count()) {
        for (let index = 0; index < 8; index += 1) {
          if (!await next.isVisible().catch(() => false)) break;
          await next.click({ timeout: 800 }).catch(() => {});
          await page.waitForTimeout(180);
        }
      }
    }
    const domCandidates = await page.evaluate(() => {
      const records = [];
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 1 && box.height > 1;
      };
      for (const element of document.querySelectorAll('img,source,video')) {
        const srcset = element.getAttribute('srcset') || element.getAttribute('data-srcset');
        const urls = [
          element.currentSrc, element.getAttribute('src'), element.getAttribute('data-src'),
          element.getAttribute('data-original'), element.getAttribute('data-lazy'), element.getAttribute('poster'),
        ].filter(Boolean);
        const ownVisible = visible(element);
        const pictureImage = element.tagName === 'SOURCE' ? element.parentElement?.querySelector('img') : null;
        records.push({
          elementType: element.tagName.toLowerCase(),
          visible: ownVisible || Boolean(pictureImage && visible(pictureImage)),
          urls,
          srcset,
          width: element instanceof HTMLImageElement ? element.naturalWidth : (element instanceof HTMLVideoElement ? element.videoWidth : null),
          height: element instanceof HTMLImageElement ? element.naturalHeight : (element instanceof HTMLVideoElement ? element.videoHeight : null),
        });
      }
      for (const element of document.querySelectorAll('body *')) {
        if (!visible(element)) continue;
        for (const pseudo of [null, '::before', '::after']) {
          const backgroundImage = getComputedStyle(element, pseudo).backgroundImage;
          if (backgroundImage && backgroundImage !== 'none' && backgroundImage.includes('url(')) {
            records.push({ elementType: pseudo ? `pseudo${pseudo}` : 'background', visible: true, urls: [backgroundImage], srcset: null, width: null, height: null });
          }
        }
      }
      return records;
    });
    return { status: 'live-audited', finalUrl: page.url(), network, domCandidates, failureReason: null };
  } catch (error) {
    return { status: 'live-failed', finalUrl: page.url(), network, domCandidates: [], failureReason: error instanceof Error ? error.message : String(error) };
  } finally {
    await page.close();
  }
}

async function auditLivePages(rows, resolutionById) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'TransferOilTurkiye-HD-Media-Audit/1.0 Playwright',
    ignoreHTTPSErrors: true,
  });
  let completed = 0;
  try {
    return await mapWithConcurrency(rows, Math.min(downloadConcurrency, 6), async (row) => {
      const requestedUrl = resolutionById.get(row.id)?.resolvedUrl ?? row.sourceUrl;
      let result = null;
      const failures = [];
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        result = await auditLivePage(context, row, requestedUrl);
        if (result.status === 'live-audited') break;
        failures.push(`attempt ${attempt}: ${result.failureReason}`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
      completed += 1;
      if (completed % 10 === 0 || completed === rows.length) console.error(`[media:live] audited ${completed}/${rows.length} official pages`);
      return {
        sourcePageId: row.id,
        sourcePage: row.sourceUrl,
        ...result,
        auditAttemptCount: failures.length + (result?.status === 'live-audited' ? 1 : 0),
        previousAttemptFailures: failures,
      };
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

function urlsFromCssValue(value) {
  const urls = [];
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;
  while ((match = pattern.exec(String(value ?? '')))) urls.push(match[1]);
  return urls;
}

function extractLiveCandidates(report) {
  const byUrl = new Map();
  const merge = (candidate) => {
    const existing = byUrl.get(candidate.url);
    if (!existing) {
      byUrl.set(candidate.url, candidate);
      return;
    }
    existing.visible = existing.visible || candidate.visible;
    existing.fromDom = existing.fromDom || candidate.fromDom;
    existing.fromNetwork = existing.fromNetwork || candidate.fromNetwork;
    existing.width = Math.max(Number(existing.width) || 0, Number(candidate.width) || 0) || null;
    existing.height = Math.max(Number(existing.height) || 0, Number(candidate.height) || 0) || null;
    existing.contentLength = Math.max(Number(existing.contentLength) || 0, Number(candidate.contentLength) || 0) || null;
    existing.mimeType ??= candidate.mimeType ?? null;
    existing.srcsetCandidates = [...new Map(
      [...(existing.srcsetCandidates ?? []), ...(candidate.srcsetCandidates ?? [])].map((item) => [item.url, item]),
    ).values()];
    existing.context = [...new Set(`${existing.context} | ${candidate.context}`.split(' | '))].join(' | ');
  };

  for (const entry of report.domCandidates ?? []) {
    const srcsetCandidates = parseSrcset(entry.srcset, report.finalUrl || report.sourcePage);
    const rawUrls = [...(entry.urls ?? []), ...srcsetCandidates.map((item) => item.url)];
    for (const raw of rawUrls) {
      const values = String(raw).includes('url(') ? urlsFromCssValue(raw) : [raw];
      for (const value of values) {
        const url = absoluteUrl(value, report.finalUrl || report.sourcePage);
        if (!url || !mediaExtensionPattern.test(url)) continue;
        const context = `live DOM ${entry.elementType}${entry.visible ? ' visible' : ' hidden'}`;
        merge({
          url,
          context,
          elementType: entry.elementType,
          srcsetCandidates,
          exclusionReason: shouldExcludeCandidate(url, context),
          visible: Boolean(entry.visible),
          fromDom: true,
          fromNetwork: false,
          width: entry.width ?? null,
          height: entry.height ?? null,
          mimeType: null,
          contentLength: null,
        });
      }
    }
  }

  for (const response of report.network ?? []) {
    const url = absoluteUrl(response.url, report.finalUrl || report.sourcePage);
    if (!url || !mediaExtensionPattern.test(url)) continue;
    const context = `CDP network ${response.resourceType}`;
    merge({
      url,
      context,
      elementType: response.resourceType === 'media' ? 'video' : 'network',
      srcsetCandidates: [],
      exclusionReason: shouldExcludeCandidate(url, context),
      visible: false,
      fromDom: false,
      fromNetwork: true,
      width: null,
      height: null,
      mimeType: response.mimeType ?? null,
      contentLength: response.contentLength ?? null,
    });
  }
  return [...byUrl.values()];
}

function mergePageCandidates(cached, live) {
  const byUrl = new Map();
  for (const candidate of [...cached, ...live]) {
    const existing = byUrl.get(candidate.url);
    if (!existing) {
      byUrl.set(candidate.url, candidate);
      continue;
    }
    existing.visible = existing.visible || candidate.visible;
    existing.fromDom = existing.fromDom || candidate.fromDom;
    existing.fromNetwork = existing.fromNetwork || candidate.fromNetwork;
    existing.width = Math.max(Number(existing.width) || 0, Number(candidate.width) || 0) || null;
    existing.height = Math.max(Number(existing.height) || 0, Number(candidate.height) || 0) || null;
    existing.mimeType ??= candidate.mimeType ?? null;
    existing.contentLength = Math.max(Number(existing.contentLength) || 0, Number(candidate.contentLength) || 0) || null;
    existing.srcsetCandidates = [...new Map(
      [...(existing.srcsetCandidates ?? []), ...(candidate.srcsetCandidates ?? [])].map((item) => [item.url, item]),
    ).values()];
    if (!existing.exclusionReason) existing.exclusionReason = candidate.exclusionReason;
  }
  return [...byUrl.values()];
}

async function loadInputs() {
  const [sourceManifest, legacyAssetManifest, sourcePageManifest, routesManifest, resolutionsManifest] = await Promise.all([
    readJson(manifestPath), readJson(legacyAssetManifestPath), readJson(sourcePageManifestPath),
    readJson(routeManifestPath), readJson(resolutionManifestPath),
  ]);
  const rows = sourceManifest.rows ?? sourceManifest;
  if (!Array.isArray(rows) || rows.length !== EXPECTED_SOURCE_ROWS || new Set(rows.map((row) => row.sourceUrl)).size !== EXPECTED_SOURCE_ROWS) {
    throw new Error(`Source manifest must contain exactly ${EXPECTED_SOURCE_ROWS} unique URLs.`);
  }
  if (!Array.isArray(legacyAssetManifest.assets)) throw new Error('Existing Transfer Oil asset manifest has no assets array.');
  return { sourceManifest, rows, legacyAssetManifest, sourcePageManifest, routesManifest, resolutionsManifest };
}

async function main() {
  const inputs = await loadInputs();
  await Promise.all(directoryLayout.map((directory) => mkdir(path.join(hdRoot, directory), { recursive: true })));
  await mkdir(path.dirname(outputRegistryPath), { recursive: true });

  const rows = inputs.rows.slice(0, limit);
  const rowBySourceUrl = new Map(inputs.rows.map((row) => [normalizeUrl(row.sourceUrl), row]));
  const routeById = new Map((inputs.routesManifest.routes ?? []).map((route) => [route.id, route]));
  const resolutionById = new Map((inputs.resolutionsManifest.records ?? []).map((record) => [record.id, record]));
  const candidatesByPageId = new Map();
  const cacheFailures = [];
  for (const row of rows) {
    const cachePath = path.join(sourceCacheRoot, `${String(row.id).padStart(3, '0')}.html`);
    if (!await exists(cachePath)) {
      candidatesByPageId.set(row.id, []);
      cacheFailures.push({ sourcePageId: row.id, sourcePage: row.sourceUrl, reason: 'Cached official HTML is missing.' });
      continue;
    }
    candidatesByPageId.set(row.id, extractCachedCandidates(await readFile(cachePath, 'utf8'), row.sourceUrl));
  }

  const liveReports = livePages ? await auditLivePages(rows, resolutionById) : [];
  const liveById = new Map(liveReports.map((report) => [report.sourcePageId, report]));
  for (const row of rows) {
    const live = liveById.get(row.id);
    if (!live) continue;
    const liveCandidates = extractLiveCandidates(live);
    candidatesByPageId.set(row.id, mergePageCandidates(candidatesByPageId.get(row.id) ?? [], liveCandidates));
  }

  const legacyAssets = inputs.legacyAssetManifest.assets.filter((asset) => !asset.isPlaceholder);
  const legacyOriginalUrlByHash = new Map();
  for (const asset of legacyAssets) {
    if (asset.sha256 && asset.originalUrl && !legacyOriginalUrlByHash.has(asset.sha256)) legacyOriginalUrlByHash.set(asset.sha256, normalizeUrl(asset.originalUrl));
  }
  const sourcePageUrlToId = new Map(inputs.rows.map((row) => [normalizeUrl(row.sourceUrl), row.id]));
  const selected = legacyAssets.map((asset, index) => {
    const semanticOfficialUrl = semanticLegacyPathOfficialUrls.get(asset.localPath);
    const hashRecoveredUrl = asset.sha256 ? legacyOriginalUrlByHash.get(asset.sha256) : null;
    const recovered = semanticOfficialUrl
      ? { url: normalizeUrl(semanticOfficialUrl), recovered: true, candidate: null }
      : hashRecoveredUrl
      ? { url: hashRecoveredUrl, recovered: true, candidate: null }
      : recoverOriginalUrl(asset, candidatesByPageId);
    const originalUrl = recovered.url;
    const pageIds = new Set(
      [...(asset.sourcePages ?? []), asset.sourcePage]
        .map((value) => sourcePageUrlToId.get(normalizeUrl(value)))
        .filter(Boolean),
    );
    const prefixId = Number(path.basename(asset.localPath ?? '').match(/^(\d{3})-/)?.[1]);
    if (Number.isInteger(prefixId) && prefixId >= 1 && prefixId <= EXPECTED_SOURCE_ROWS) pageIds.add(prefixId);
    const primaryPageId = [...pageIds][0] ?? null;
    const exactCandidate = (primaryPageId ? candidatesByPageId.get(primaryPageId) : [])?.find((candidate) => candidate.url === originalUrl) ?? recovered.candidate ?? null;
    const choice = highestSrcsetCandidate(exactCandidate, originalUrl);
    return {
      asset,
      ordinal: index + 1,
      originalUrl,
      recoveredOriginalUrl: recovered.recovered,
      selectedUrl: choice.selectedUrl,
      srcsetCandidates: choice.candidates,
      selectedCandidateReason: choice.reason,
      sourcePageIds: [...pageIds].sort((a, b) => a - b),
      primaryPageId,
      discoverySource: 'legacy-manifest-plus-page-candidate-evidence',
    };
  });

  const coveredCandidateUrls = new Set();
  for (const item of selected) {
    for (const url of [item.originalUrl, item.selectedUrl, ...(item.srcsetCandidates ?? []).map((candidate) => candidate.url)]) {
      if (url) coveredCandidateUrls.add(normalizeUrl(url));
    }
  }
  const newCandidatesBySelectedUrl = new Map();
  for (const row of rows) {
    for (const candidate of candidatesByPageId.get(row.id) ?? []) {
      if (candidate.exclusionReason || !candidate.url || coveredCandidateUrls.has(normalizeUrl(candidate.url))) continue;
      const isVideo = candidate.elementType === 'video' || videoMimePattern.test(candidate.mimeType ?? '') || /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i.test(candidate.url);
      if (!candidate.fromDom && !isVideo) continue;
      const choice = highestSrcsetCandidate(candidate, candidate.url);
      if (!choice.selectedUrl) continue;
      const key = normalizeUrl(choice.selectedUrl);
      const existing = newCandidatesBySelectedUrl.get(key);
      if (existing) {
        existing.sourcePageIds.add(row.id);
        existing.asset.width = Math.max(Number(existing.asset.width) || 0, Number(candidate.width) || 0) || null;
        existing.asset.height = Math.max(Number(existing.asset.height) || 0, Number(candidate.height) || 0) || null;
        continue;
      }
      if (coveredCandidateUrls.has(key)) continue;
      newCandidatesBySelectedUrl.set(key, {
        asset: {
          localPath: null,
          guessedUse: guessedUseForCandidate(candidate, row),
          sourceContext: candidate.context,
          width: candidate.width ?? null,
          height: candidate.height ?? null,
          sourceMimeType: candidate.mimeType ?? null,
          outputMimeType: null,
          sourcePage: row.sourceUrl,
          sourcePages: [row.sourceUrl],
          isPlaceholder: false,
        },
        ordinal: 0,
        originalUrl: candidate.url,
        recoveredOriginalUrl: false,
        selectedUrl: choice.selectedUrl,
        srcsetCandidates: choice.candidates,
        selectedCandidateReason: `${choice.reason} Discovered by live DOM/CDP audit.`,
        sourcePageIds: new Set([row.id]),
        primaryPageId: row.id,
        discoverySource: candidate.fromNetwork ? 'live-dom-and-cdp-network' : 'live-dom',
      });
    }
  }
  for (const candidate of newCandidatesBySelectedUrl.values()) {
    candidate.ordinal = selected.length + 1;
    candidate.sourcePageIds = [...candidate.sourcePageIds].sort((a, b) => a - b);
    selected.push(candidate);
  }

  const officialDownloadCache = new Map();
  let processedDownloadRecords = 0;
  const reportDownloadProgress = () => {
    processedDownloadRecords += 1;
    if (processedDownloadRecords % 50 === 0 || processedDownloadRecords === selected.length) console.error(`[media:download] resolved ${processedDownloadRecords}/${selected.length} media records`);
  };
  const downloadedOriginals = await mapWithConcurrency(selected, downloadConcurrency, async (item) => {
    const existingFile = item.asset.localPath ? absolutePublicFile(item.asset.localPath) : null;
    let downloaded = null;
    let fetchFailure = null;
    if (!offline && item.selectedUrl) {
      try {
        downloaded = await fetchBestCandidate(item, officialDownloadCache);
      } catch (error) {
        fetchFailure = error instanceof Error ? error.message : String(error);
      }
    }
    if (!downloaded) {
      if (!existingFile || !await exists(existingFile)) {
        reportDownloadProgress();
        return { ...item, skipReason: fetchFailure ?? 'No downloadable official binary or existing official derivative was available.' };
      }
      const buffer = await readFile(existingFile);
      downloaded = {
        buffer,
        mimeType: item.asset.outputMimeType ?? mimeFromExtension(existingFile),
        resolvedUrl: item.selectedUrl,
        status: null,
        contentLength: buffer.length,
      };
      fetchFailure ??= item.selectedUrl
        ? (offline ? 'Network download was disabled; best available locally fetched official derivative was preserved.' : 'Official original download failed; best available locally fetched official derivative was preserved.')
        : 'Original source URL could not be recovered; best available locally fetched official derivative was preserved.';
    }
    reportDownloadProgress();
    return { ...item, ...downloaded, fetchFailure, downloadedFromOfficialSource: !fetchFailure };
  });
  const discoveryFailures = downloadedOriginals.filter((item) => item.skipReason).map((item) => ({
    sourcePageIds: item.sourcePageIds,
    originalUrl: item.originalUrl,
    selectedUrl: item.selectedUrl,
    discoverySource: item.discoverySource,
    reason: item.skipReason,
  }));

  const canonicalByHash = new Map();
  const media = [];
  let responsiveDerivativeCount = 0;
  let originalFileWrites = 0;
  let optimizedFileWrites = 0;

  for (const item of downloadedOriginals.filter((record) => !record.skipReason)) {
    const id = `hd-${String(item.ordinal).padStart(4, '0')}`;
    const sha256 = hashBuffer(item.buffer);
    const duplicate = canonicalByHash.get(sha256) ?? null;
    const mimeType = item.mimeType || mimeFromExtension(item.asset.localPath ?? item.selectedUrl);
    const sourceNameInput = item.asset.localPath
      ? path.basename(item.asset.localPath, path.extname(item.asset.localPath))
      : path.basename(decodeURIComponent(new URL(item.selectedUrl).pathname), path.extname(new URL(item.selectedUrl).pathname));
    const sourceName = slug(sourceNameInput, 86);
    let originalPath;
    let optimizedPath;
    let originalWidth = Number.isFinite(Number(item.asset.width)) && Number(item.asset.width) > 0 ? Number(item.asset.width) : null;
    let originalHeight = Number.isFinite(Number(item.asset.height)) && Number(item.asset.height) > 0 ? Number(item.asset.height) : null;
    let optimizedWidth = originalWidth;
    let optimizedHeight = originalHeight;
    let responsiveVariants = [];
    let videoMetadata = null;
    let failureReason = item.fetchFailure;

    if (duplicate) {
      originalPath = duplicate.localOriginalPath;
      optimizedPath = duplicate.localOptimizedPath;
      originalWidth = duplicate.originalWidth;
      originalHeight = duplicate.originalHeight;
      optimizedWidth = duplicate.optimizedWidth;
      optimizedHeight = duplicate.optimizedHeight;
      responsiveVariants = duplicate.responsiveVariants;
      videoMetadata = duplicate.videoMetadata;
    } else {
      const extension = extensionFromMime(mimeType, item.selectedUrl ?? item.asset.localPath);
      const originalFile = path.join(originalsRoot, `${id}-${sourceName}${extension}`);
      const existingOriginalHash = await exists(originalFile) ? hashBuffer(await readFile(originalFile)) : null;
      const sourceChanged = existingOriginalHash !== sha256;
      if (force || sourceChanged) {
        await writeFile(originalFile, item.buffer);
        originalFileWrites += 1;
      }
      originalPath = publicUrl(originalFile);

      const folder = mediaFolder(item.asset);
      if (mimeType === 'image/svg+xml' || extension === '.svg') {
        const outputFile = path.join(hdRoot, 'svg', `${id}-${sourceName}.svg`);
        if (force || sourceChanged || !await exists(outputFile)) await copyFile(originalFile, outputFile);
        optimizedPath = publicUrl(outputFile);
        optimizedFileWrites += 1;
      } else if (videoMimePattern.test(mimeType) || /\.(?:mp4|webm|m4v|mov)$/i.test(extension)) {
        const outputFile = path.join(hdRoot, 'videos', `${id}-${sourceName}${extension}`);
        if (force || sourceChanged || !await exists(outputFile)) await copyFile(originalFile, outputFile);
        optimizedPath = publicUrl(outputFile);
        videoMetadata = await inspectVideoMetadata(outputFile);
        originalWidth = videoMetadata.width ?? originalWidth;
        originalHeight = videoMetadata.height ?? originalHeight;
        optimizedWidth = originalWidth;
        optimizedHeight = originalHeight;
        optimizedFileWrites += 1;
      } else if (mimeType === 'image/gif' || extension === '.gif') {
        const outputFile = path.join(hdRoot, folder, `${id}-${sourceName}.gif`);
        await mkdir(path.dirname(outputFile), { recursive: true });
        if (force || sourceChanged || !await exists(outputFile)) await copyFile(originalFile, outputFile);
        optimizedPath = publicUrl(outputFile);
        optimizedFileWrites += 1;
      } else if (rasterMimePattern.test(mimeType) || /\.(?:avif|jpe?g|png|webp)$/i.test(extension)) {
        const metadata = await sharp(item.buffer).metadata();
        originalWidth = metadata.autoOrient?.width ?? metadata.width ?? originalWidth;
        originalHeight = metadata.autoOrient?.height ?? metadata.height ?? originalHeight;
        const outputFile = path.join(hdRoot, folder, `${id}-${sourceName}.webp`);
        await mkdir(path.dirname(outputFile), { recursive: true });
        if (force || sourceChanged || !await exists(outputFile)) {
          await sharp(item.buffer).rotate().keepMetadata().webp({ quality: 92, alphaQuality: 100, smartSubsample: true }).toFile(outputFile);
        }
        const outputMetadata = await sharp(outputFile).metadata();
        optimizedWidth = outputMetadata.width ?? originalWidth;
        optimizedHeight = outputMetadata.height ?? originalHeight;
        optimizedPath = publicUrl(outputFile);
        optimizedFileWrites += 1;
        for (const width of responsiveWidths(folder, Number(originalWidth) || 0)) {
          const variantFile = path.join(responsiveRoot, folder, `${id}-${sourceName}-${width}w.webp`);
          if (force || sourceChanged || !await exists(variantFile)) {
            await sharp(item.buffer).rotate().resize({ width, withoutEnlargement: true }).keepMetadata().webp({ quality: 92, alphaQuality: 100, smartSubsample: true }).toFile(variantFile);
          }
          const variantMetadata = await sharp(variantFile).metadata();
          responsiveVariants.push({
            width: variantMetadata.width ?? width,
            height: variantMetadata.height ?? null,
            path: publicUrl(variantFile),
            sizesHint: folder === 'hero' ? '100vw' : '(max-width: 768px) 100vw, 50vw',
          });
          responsiveDerivativeCount += 1;
        }
      } else {
        optimizedPath = originalPath;
        failureReason = [failureReason, `Unsupported optimization MIME type: ${mimeType}`].filter(Boolean).join(' ');
      }
    }

    const routeSet = new Set();
    for (const sourcePageId of item.sourcePageIds) {
      const route = routeById.get(sourcePageId);
      for (const localizedRoute of Object.values(route?.localizedRoutes ?? {})) routeSet.add(localizedRoute);
    }
    const sourcePageId = item.primaryPageId;
    const sourcePage = sourcePageId ? inputs.rows.find((row) => row.id === sourcePageId)?.sourceUrl ?? null : item.asset.sourcePage ?? null;
    const record = {
      id,
      previousLocalPath: item.asset.localPath,
      sourcePage,
      sourcePageId,
      sourcePageIds: item.sourcePageIds,
      elementType: item.asset.sourceContext?.split(/\s+/)[0] ?? (videoMimePattern.test(mimeType) ? 'video' : 'image'),
      usage: item.asset.guessedUse ?? 'official Transfer Oil content media',
      originalUrl: item.originalUrl,
      resolvedUrl: item.resolvedUrl ?? item.selectedUrl,
      selectedUrl: item.selectedUrl,
      localOriginalPath: originalPath,
      localOptimizedPath: optimizedPath,
      mimeType,
      originalWidth,
      originalHeight,
      optimizedWidth,
      optimizedHeight,
      fileSize: item.buffer.length,
      sha256,
      srcsetCandidates: item.srcsetCandidates,
      selectedCandidateReason: item.selectedCandidateReason,
      discoverySource: item.discoverySource,
      candidateDownloadFailures: item.candidateFailures ?? [],
      responsiveVariants,
      videoMetadata,
      usedOnLocalRoutes: [...routeSet].sort(),
      isDuplicate: Boolean(duplicate),
      duplicateOf: duplicate?.id ?? null,
      isPlaceholder: false,
      failureReason: failureReason || null,
      provenanceStatus: item.downloadedFromOfficialSource
        ? (item.recoveredOriginalUrl ? 'official-original-url-recovered-and-downloaded' : 'official-original-downloaded')
        : 'best-available-local-official-derivative-preserved',
    };
    media.push(record);
    if (!duplicate) canonicalByHash.set(sha256, record);
  }

  const mediaByPageId = new Map(inputs.rows.map((row) => [row.id, []]));
  for (const record of media) for (const sourcePageId of record.sourcePageIds) mediaByPageId.get(sourcePageId)?.push(record);
  const pageReports = inputs.rows.map((row) => {
    const records = mediaByPageId.get(row.id) ?? [];
    const live = liveById.get(row.id) ?? null;
    const cachedCandidates = candidatesByPageId.get(row.id) ?? [];
    const pageDiscoveryFailures = discoveryFailures.filter((failure) => failure.sourcePageIds.includes(row.id));
    return {
      sourcePageId: row.id,
      sourcePage: row.sourceUrl,
      requestedUrl: resolutionById.get(row.id)?.resolvedUrl ?? row.sourceUrl,
      auditEvidence: live ? live.status : (cacheFailures.some((failure) => failure.sourcePageId === row.id) ? 'cache-missing' : 'cached-official-html-and-existing-provenance'),
      discoveredVisibleMediaCount: records.length,
      downloadedMediaCount: records.filter((record) => record.provenanceStatus.includes('downloaded')).length,
      reusedOrDeduplicatedMediaCount: records.filter((record) => record.isDuplicate || record.provenanceStatus.includes('preserved')).length,
      missingMediaCount: records.filter((record) => !record.localOriginalPath || !record.localOptimizedPath).length + pageDiscoveryFailures.length,
      cachedCandidateCount: cachedCandidates.filter((candidate) => !candidate.exclusionReason).length,
      liveDiscoveredCandidateCount: cachedCandidates.filter((candidate) => candidate.fromDom || candidate.fromNetwork).length,
      liveVisibleDomCandidateCount: cachedCandidates.filter((candidate) => candidate.fromDom && candidate.visible && !candidate.exclusionReason).length,
      liveNetworkMediaCandidateCount: cachedCandidates.filter((candidate) => candidate.fromNetwork && !candidate.exclusionReason).length,
      excludedNonContentCandidateCount: cachedCandidates.filter((candidate) => candidate.exclusionReason).length,
      liveNetworkResponseCount: live?.network?.length ?? 0,
      liveFailureReason: live?.failureReason ?? null,
    };
  });

  const brokenMedia = media.filter((record) => !record.localOriginalPath || !record.localOptimizedPath).length;
  const upscaledMedia = media.filter((record) => record.originalWidth && record.optimizedWidth && record.optimizedWidth > record.originalWidth).length;
  const failureRecords = media.filter((record) => record.failureReason);
  const mappedOfficialUrls = new Set(media.flatMap((record) => [
    record.originalUrl,
    record.selectedUrl,
    record.resolvedUrl,
    ...(record.srcsetCandidates ?? []).map((candidate) => candidate.url),
  ]).filter(Boolean).flatMap((url) => preferredOriginalAlternatives(url)).map(normalizeUrl).filter(Boolean));
  const unmappedVisibleMedia = [];
  for (const row of rows) {
    for (const candidate of candidatesByPageId.get(row.id) ?? []) {
      const candidateIsMapped = preferredOriginalAlternatives(candidate.url).some((url) => mappedOfficialUrls.has(normalizeUrl(url)));
      if (!candidate.fromDom || !candidate.visible || candidate.exclusionReason || candidateIsMapped) continue;
      unmappedVisibleMedia.push({ sourcePageId: row.id, sourcePage: row.sourceUrl, url: candidate.url, elementType: candidate.elementType, context: candidate.context });
    }
  }
  const summary = {
    expectedSourceUrls: EXPECTED_SOURCE_ROWS,
    auditedSourceUrls: rows.length,
    livePageAuditedCount: liveReports.filter((report) => report.status === 'live-audited').length,
    livePageFailedCount: liveReports.filter((report) => report.status !== 'live-audited').length,
    cachedPageAuditedCount: rows.filter((row) => candidatesByPageId.has(row.id)).length,
    cachePageFailures: cacheFailures.length,
    visibleContentMediaDiscovered: media.length,
    legacyMediaRecordCount: media.filter((record) => record.discoverySource === 'legacy-manifest-plus-page-candidate-evidence').length,
    liveDiscoveredNewMediaRecordCount: media.filter((record) => record.discoverySource !== 'legacy-manifest-plus-page-candidate-evidence').length,
    liveDomCandidateReferenceCount: [...candidatesByPageId.values()].flat().filter((candidate) => candidate.fromDom).length,
    liveNetworkCandidateReferenceCount: [...candidatesByPageId.values()].flat().filter((candidate) => candidate.fromNetwork).length,
    uniqueMediaCount: canonicalByHash.size,
    downloadedOriginalMediaCount: media.filter((record) => record.provenanceStatus.includes('downloaded')).length,
    preservedLocalDerivativeCount: media.filter((record) => record.provenanceStatus.includes('preserved')).length,
    responsiveDerivativeCount,
    deduplicatedMediaCount: media.filter((record) => record.isDuplicate).length,
    downloadedVideoCount: media.filter((record) => videoMimePattern.test(record.mimeType) && record.provenanceStatus.includes('downloaded')).length,
    downloadedSvgCount: media.filter((record) => record.mimeType === 'image/svg+xml' && record.provenanceStatus.includes('downloaded')).length,
    originalFileWrites,
    optimizedFileWrites,
    originalFetchFailureCount: failureRecords.length,
    unmappedVisibleMedia: unmappedVisibleMedia.length,
    missingMedia: brokenMedia + discoveryFailures.length,
    brokenMedia,
    upscaledMedia,
    placeholderCount: 0,
    excludedExistingPlaceholderCount: inputs.legacyAssetManifest.assets.filter((asset) => asset.isPlaceholder).length,
    placeholderUsedWhereSourceExists: 0,
    discoveryFailureCount: discoveryFailures.length,
  };

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceOfTruth: 'transferoil_link_manifest.json',
    auditMode: livePages ? 'playwright-live-plus-cache-and-provenance' : 'cached-official-html-plus-existing-official-media-provenance',
    policy: {
      officialHosts: [...officialHosts],
      sourceUrlCount: EXPECTED_SOURCE_ROWS,
      originalsPreservedSeparately: true,
      rasterOptimization: 'WebP quality 92; responsive derivatives use withoutEnlargement; no upscale.',
      svgPolicy: 'SVG is preserved as SVG.',
      videoPolicy: 'Video is preserved without re-encoding.',
      placeholdersCreated: false,
      screenshotsUsedAsMedia: false,
    },
    limitations: [
      ...(livePages ? [] : ['Live Playwright visibility/CDP audit was not executed in this run; all 343 cached official HTML snapshots and the previously verified official asset provenance were audited. Re-run with --live for current DOM/CDP evidence.']),
      ...(failureRecords.length ? [`${failureRecords.length} record(s) could not recover/download an original source binary; the best available locally fetched official derivative was preserved without enlargement and each record has failureReason.`] : []),
      'The generated HD registry is additive. Runtime components were intentionally not edited during this isolated media-only phase.',
    ],
    summary,
    pageReports,
    liveNetworkAudit: liveReports,
    cacheFailures,
    discoveryFailures,
    unmappedVisibleMedia,
    media,
  };
  await writeFile(outputManifestPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const registryRecords = Object.fromEntries(media.map((record) => [record.id, {
    id: record.id,
    previousLocalPath: record.previousLocalPath,
    sourcePageId: record.sourcePageId,
    sourcePageIds: record.sourcePageIds,
    sourcePage: record.sourcePage,
    originalUrl: record.originalUrl,
    selectedUrl: record.selectedUrl,
    usage: record.usage,
    original: record.localOriginalPath,
    optimized: record.localOptimizedPath,
    width: record.optimizedWidth,
    height: record.optimizedHeight,
    mimeType: record.mimeType,
    sha256: record.sha256,
    responsive: record.responsiveVariants,
    videoMetadata: record.videoMetadata,
    isDuplicate: record.isDuplicate,
    duplicateOf: record.duplicateOf,
  }]));
  const bySourcePageId = Object.fromEntries(inputs.rows.map((row) => [String(row.id), mediaByPageId.get(row.id)?.map((record) => record.id) ?? []]));
  const legacyPathToHdPath = Object.fromEntries(media.filter((record) => record.previousLocalPath).map((record) => [record.previousLocalPath, record.localOptimizedPath]));
  const runtimeAssetSourceFiles = [
    path.join(root, 'src', 'data', 'transferOilAssets.ts'),
    path.join(root, 'src', 'data', 'finalTransferOilAssets.ts'),
    path.join(root, 'src', 'i18n', 'metadata.ts'),
  ];
  const runtimeLegacyPaths = new Set();
  for (const sourceFile of runtimeAssetSourceFiles) {
    if (!await exists(sourceFile)) continue;
    const source = await readFile(sourceFile, 'utf8');
    for (const match of source.matchAll(/["'](\/assets\/transfer-oil\/[^"']+)["']/g)) runtimeLegacyPaths.add(match[1]);
  }
  const runtimeAssetPathMap = Object.fromEntries([...runtimeLegacyPaths]
    .filter((legacyPath) => legacyPathToHdPath[legacyPath])
    .map((legacyPath) => [legacyPath, legacyPathToHdPath[legacyPath]]));
  const officialUrlToHdPath = {};
  const canonicalReferenceToAssetId = {};
  for (const record of media) {
    for (const url of [record.originalUrl, record.selectedUrl, record.resolvedUrl]) if (url) officialUrlToHdPath[normalizeUrl(url)] = record.localOptimizedPath;
    for (const sourcePageId of record.sourcePageIds) {
      canonicalReferenceToAssetId[`${sourcePageId}:${record.selectedUrl ?? record.originalUrl ?? record.previousLocalPath}`] = record.id;
    }
  }
  const semanticAsset = (needle) => {
    const match = media.find((record) => [record.originalUrl, record.selectedUrl, record.resolvedUrl]
      .filter(Boolean)
      .some((url) => decodeURIComponent(url).toLowerCase().includes(needle.toLowerCase())));
    return match?.localOptimizedPath ?? null;
  };
  const semanticAssets = {
    heroHomePoster: semanticAsset('/slider-1/_MG_8650.jpg'),
    heroUhp: semanticAsset('/slider-2024/R62_8171-rid.jpg'),
    heroHydraulic: semanticAsset('/slider-2024/Laser marking 3-rid.jpg'),
    heroIndustrial: semanticAsset('/slider-2024/R62_1552.jpg'),
    homeVideo: semanticAsset('/website/videos/video_TO_Home.mp4'),
    menuHydraulic: semanticAsset('/home/hydraulic.png'),
    menuIndustrial: semanticAsset('/home/industrial.png'),
    menuUhp: semanticAsset('/home/uhp.png'),
    menuCorporate: semanticAsset('/website/images/company2.png'),
    corporateOverview: semanticAsset('/storia/new/thermoplastic-hose-UHP.jpg'),
  };
  const registry = [
    '/* This file is generated by scripts/audit-transferoil-media.mjs. Do not edit by hand. */',
    '',
    'export type TransferOilHdResponsiveAsset = {',
    '  width: number',
    '  height: number | null',
    '  path: string',
    '  sizesHint: string',
    '}',
    '',
    'export type TransferOilHdAsset = {',
    '  id: string',
    '  previousLocalPath: string | null',
    '  sourcePageId: number | null',
    '  sourcePageIds: readonly number[]',
    '  sourcePage: string | null',
    '  originalUrl: string | null',
    '  selectedUrl: string | null',
    '  usage: string',
    '  original: string',
    '  optimized: string',
    '  width: number | null',
    '  height: number | null',
    '  mimeType: string',
    '  sha256: string',
    '  responsive: readonly TransferOilHdResponsiveAsset[]',
    '  videoMetadata: { width: number | null; height: number | null; bitrateKbps: number | null; durationSeconds: number | null; frameRate: number | null; inspectionNote: string } | null',
    '  isDuplicate: boolean',
    '  duplicateOf: string | null',
    '}',
    '',
    `export const transferOilHdAssets = ${JSON.stringify(registryRecords, null, 2)} as const satisfies Record<string, TransferOilHdAsset>`,
    '',
    `export const transferOilHdAssetsBySourcePageId = ${JSON.stringify(bySourcePageId, null, 2)} as const`,
    '',
    `export const transferOilHdAssetPathMap = ${JSON.stringify(legacyPathToHdPath, null, 2)} as const satisfies Record<string, string>`,
    '',
    `export const transferOilHdRuntimeAssetPathMap = ${JSON.stringify(runtimeAssetPathMap, null, 2)} as const satisfies Record<string, string>`,
    '',
    `export const transferOilHdOfficialUrlMap = ${JSON.stringify(officialUrlToHdPath, null, 2)} as const satisfies Record<string, string>`,
    '',
    `export const transferOilHdCanonicalReferenceMap = ${JSON.stringify(canonicalReferenceToAssetId, null, 2)} as const satisfies Record<string, string>`,
    '',
    `export const transferOilHdSemanticAssets = ${JSON.stringify(semanticAssets, null, 2)} as const`,
    '',
    'export const transferOilHdAssetList = Object.values(transferOilHdAssets)',
    '',
    'export function getTransferOilHdAssetsForSourcePage(sourcePageId: number): TransferOilHdAsset[] {',
    '  const ids = (transferOilHdAssetsBySourcePageId as Record<string, readonly string[]>)[String(sourcePageId)] ?? []',
    '  const assets = transferOilHdAssets as unknown as Record<string, TransferOilHdAsset>',
    '  return ids.map((id) => assets[id]).filter((asset): asset is TransferOilHdAsset => Boolean(asset))',
    '}',
    '',
    'export function resolveTransferOilHdAssetPath(currentPath: string): string {',
    '  return (transferOilHdAssetPathMap as Record<string, string>)[currentPath] ?? (transferOilHdOfficialUrlMap as Record<string, string>)[currentPath] ?? currentPath',
    '}',
    '',
  ].join('\n');
  await writeFile(outputRegistryPath, registry, 'utf8');

  console.log(JSON.stringify({ summary, outputManifest: asPosix(path.relative(root, outputManifestPath)), outputRegistry: asPosix(path.relative(root, outputRegistryPath)), limitations: output.limitations }, null, 2));
  if (brokenMedia || upscaledMedia || summary.placeholderUsedWhereSourceExists || summary.missingMedia || summary.unmappedVisibleMedia) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
