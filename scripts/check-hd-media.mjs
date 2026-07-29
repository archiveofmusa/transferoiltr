import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readMp4Metadata } from './lib/mp4-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const srcRoot = path.join(root, 'src');
const manifestPath = path.join(publicRoot, 'assets', 'transfer-oil', 'hd-media-manifest.json');
const registryPath = path.join(srcRoot, 'data', 'transferoil', 'hd-assets.generated.ts');
const reportPath = path.join(root, 'docs', 'reference', 'hd-media-check.json');
const EXPECTED_SOURCE_ROWS = 343;
const strictLive = !process.argv.includes('--allow-cache');

const errors = [];
const warnings = [];
const inspected = [];
const addError = (code, message, details = {}) => errors.push({ code, message, ...details });
const addWarning = (code, message, details = {}) => warnings.push({ code, message, ...details });

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  if (!await exists(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function localFile(value) {
  if (typeof value !== 'string' || !value.startsWith('/assets/transfer-oil/hd/')) return null;
  const resolved = path.resolve(publicRoot, `.${value.split(/[?#]/, 1)[0]}`);
  return resolved.startsWith(`${publicRoot}${path.sep}`) ? resolved : null;
}

function isRaster(value) {
  return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(value);
}

async function inspectFile(record, field, expectedHash = null) {
  const declared = record[field];
  const filePath = localFile(declared);
  if (!filePath) {
    addError('INVALID_HD_PATH', `${field} is not an HD public asset path.`, { id: record.id, path: declared });
    return null;
  }
  if (!await exists(filePath)) {
    addError('MISSING_HD_FILE', `${field} does not exist.`, { id: record.id, path: declared });
    return null;
  }
  const fileStats = await stat(filePath);
  if (!fileStats.isFile() || fileStats.size === 0) {
    addError('EMPTY_HD_FILE', `${field} is empty or not a file.`, { id: record.id, path: declared });
    return null;
  }
  const buffer = await readFile(filePath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (expectedHash && sha256 !== expectedHash) {
    addError('ORIGINAL_HASH_MISMATCH', 'Preserved original hash does not match the manifest.', { id: record.id, path: declared, expectedHash, actualHash: sha256 });
  }
  const result = { path: declared, bytes: fileStats.size, sha256, width: null, height: null, format: null };
  if (isRaster(filePath)) {
    try {
      const metadata = await sharp(filePath).metadata();
      result.width = metadata.autoOrient?.width ?? metadata.width ?? null;
      result.height = metadata.autoOrient?.height ?? metadata.height ?? null;
      result.format = metadata.format ?? null;
    } catch (error) {
      addError('UNREADABLE_RASTER', 'Sharp could not read raster metadata.', { id: record.id, path: declared, details: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

if (!await exists(manifestPath)) throw new Error('public/assets/transfer-oil/hd-media-manifest.json is missing. Run audit-transferoil-media.mjs first.');
if (!await exists(registryPath)) throw new Error('src/data/transferoil/hd-assets.generated.ts is missing. Run audit-transferoil-media.mjs first.');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const media = Array.isArray(manifest.media) ? manifest.media : [];
const pageReports = Array.isArray(manifest.pageReports) ? manifest.pageReports : [];
const requiredFields = [
  'id', 'sourcePage', 'sourcePageId', 'elementType', 'usage', 'originalUrl', 'resolvedUrl', 'selectedUrl',
  'localOriginalPath', 'localOptimizedPath', 'mimeType', 'originalWidth', 'originalHeight', 'optimizedWidth',
  'optimizedHeight', 'fileSize', 'sha256', 'srcsetCandidates', 'selectedCandidateReason', 'usedOnLocalRoutes',
  'isDuplicate', 'duplicateOf', 'isPlaceholder', 'failureReason',
];

if (pageReports.length !== EXPECTED_SOURCE_ROWS) addError('SOURCE_PAGE_COVERAGE', 'HD page report does not cover exactly 343 source pages.', { expected: EXPECTED_SOURCE_ROWS, actual: pageReports.length });
if (new Set(pageReports.map((page) => page.sourcePageId)).size !== EXPECTED_SOURCE_ROWS) addError('SOURCE_PAGE_ID_COVERAGE', 'HD page report sourcePageId values are not unique and complete.');
if (!media.length) addError('NO_MEDIA', 'No HD media records were generated.');

const mediaById = new Map(media.map((record) => [record.id, record]));
const pageIds = new Set(pageReports.map((page) => page.sourcePageId));
const checkedPaths = new Map();
let upscaledMedia = 0;
let brokenMedia = 0;
let placeholderCount = 0;
let srcsetSelectionErrors = 0;
let fourLocaleRouteMismatchCount = 0;
let videoMetadataErrorCount = 0;

for (const record of media) {
  for (const field of requiredFields) {
    if (!(field in record)) addError('MISSING_MANIFEST_FIELD', `Media record is missing ${field}.`, { id: record.id });
  }
  if (record.isPlaceholder || /placeholder/i.test(`${record.localOriginalPath} ${record.localOptimizedPath}`)) {
    placeholderCount += 1;
    addError('HD_PLACEHOLDER', 'HD registry contains a placeholder.', { id: record.id });
  }
  if (record.sourcePageId !== null && !pageIds.has(record.sourcePageId)) addError('INVALID_SOURCE_PAGE_ID', 'Media record sourcePageId is not in the 343-row page report.', { id: record.id, sourcePageId: record.sourcePageId });

  let original = checkedPaths.get(record.localOriginalPath);
  if (!original) {
    original = await inspectFile(record, 'localOriginalPath', record.sha256);
    if (original) checkedPaths.set(record.localOriginalPath, original);
  } else if (original.sha256 !== record.sha256) {
    addError('DUPLICATE_HASH_MISMATCH', 'A deduplicated original path is associated with a different SHA-256.', { id: record.id, duplicateOf: record.duplicateOf });
  }
  let optimized = checkedPaths.get(record.localOptimizedPath);
  if (!optimized) {
    optimized = await inspectFile(record, 'localOptimizedPath');
    if (optimized) checkedPaths.set(record.localOptimizedPath, optimized);
  }
  if (!original || !optimized) {
    brokenMedia += 1;
    continue;
  }

  const isVideoRecord = /^video\//i.test(record.mimeType ?? '') || /\.(?:mp4|webm|m4v|mov)$/i.test(record.localOptimizedPath ?? '');
  if (isVideoRecord) {
    const metadata = record.videoMetadata;
    const requiredPositiveFields = ['width', 'height', 'bitrateKbps', 'durationSeconds', 'frameRate'];
    const missingFields = requiredPositiveFields.filter((field) => !(Number(metadata?.[field]) > 0));
    if (!metadata || missingFields.length) {
      videoMetadataErrorCount += 1;
      addError('VIDEO_METADATA_INCOMPLETE', 'Video resolution, bitrate, duration and frame rate must all be recorded.', { id: record.id, path: record.localOptimizedPath, missingFields });
    } else if (/\.mp4$/i.test(record.localOptimizedPath)) {
      try {
        const parsed = await readMp4Metadata(localFile(record.localOptimizedPath));
        for (const field of ['width', 'height', 'durationSeconds', 'frameRate', 'bitrateKbps']) {
          const tolerance = field === 'durationSeconds' ? 0.01 : field === 'bitrateKbps' ? 1 : 0.01;
          if (Math.abs(Number(metadata[field]) - Number(parsed[field])) > tolerance) {
            videoMetadataErrorCount += 1;
            addError('VIDEO_METADATA_MISMATCH', 'Manifest video metadata does not match the local ISO BMFF/MP4 boxes.', { id: record.id, field, declared: metadata[field], parsed: parsed[field] });
          }
        }
      } catch (error) {
        videoMetadataErrorCount += 1;
        addError('VIDEO_METADATA_UNREADABLE', 'Local MP4 metadata could not be parsed.', { id: record.id, path: record.localOptimizedPath, details: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const sourceWidth = Number(record.originalWidth) || original.width;
  const sourceHeight = Number(record.originalHeight) || original.height;
  const outputWidth = Number(record.optimizedWidth) || optimized.width;
  const outputHeight = Number(record.optimizedHeight) || optimized.height;
  if (sourceWidth && outputWidth && outputWidth > sourceWidth) {
    upscaledMedia += 1;
    addError('UPSCALED_MEDIA', 'Optimized media width exceeds the official source width.', { id: record.id, sourceWidth, outputWidth });
  }
  if (sourceHeight && outputHeight && outputHeight > sourceHeight) {
    upscaledMedia += 1;
    addError('UPSCALED_MEDIA', 'Optimized media height exceeds the official source height.', { id: record.id, sourceHeight, outputHeight });
  }

  for (const variant of record.responsiveVariants ?? []) {
    const variantRecord = { ...record, localResponsivePath: variant.path };
    const filePath = localFile(variant.path);
    if (!filePath || !await exists(filePath) || (await stat(filePath)).size === 0) {
      brokenMedia += 1;
      addError('BROKEN_RESPONSIVE_VARIANT', 'Responsive variant is missing or empty.', { id: record.id, path: variant.path });
      continue;
    }
    const metadata = await sharp(filePath).metadata().catch(() => ({}));
    const actualWidth = metadata.width ?? null;
    if (sourceWidth && actualWidth && actualWidth > sourceWidth) {
      upscaledMedia += 1;
      addError('UPSCALED_RESPONSIVE_VARIANT', 'Responsive derivative exceeds its official source width.', { id: record.id, path: variant.path, sourceWidth, actualWidth });
    }
    if (actualWidth && variant.width !== actualWidth) addError('RESPONSIVE_WIDTH_MISMATCH', 'Responsive manifest width does not match the file.', { id: record.id, path: variant.path, declared: variant.width, actual: actualWidth });
    void variantRecord;
  }

  const failedCandidateUrls = new Set((record.candidateDownloadFailures ?? []).map((failure) => failure.url));
  const candidates = (record.srcsetCandidates ?? []).filter((candidate) => (candidate.width || candidate.density) && !failedCandidateUrls.has(candidate.url));
  if (candidates.length) {
    const selected = candidates.find((candidate) => candidate.url === record.selectedUrl);
    const score = (candidate) => candidate.width ?? ((candidate.density ?? 1) * 10_000);
    const maximum = Math.max(...candidates.map(score));
    if (!selected || score(selected) !== maximum) {
      srcsetSelectionErrors += 1;
      addError('LOWER_SRCSET_SELECTED', 'The selected source is not the largest srcset candidate.', { id: record.id, selectedUrl: record.selectedUrl, candidates });
    }
  }

  if (record.sourcePageId !== null) {
    const localePrefixes = new Set((record.usedOnLocalRoutes ?? []).map((route) => String(route).split('/')[1]).filter((locale) => ['tr', 'en', 'ru', 'ar'].includes(locale)));
    if (localePrefixes.size !== 4) {
      fourLocaleRouteMismatchCount += 1;
      addWarning('FOUR_LOCALE_ROUTE_MAPPING_INCOMPLETE', 'This shared HD record is not associated with all four localized routes. It may be a global or legacy asset.', { id: record.id, sourcePageId: record.sourcePageId, locales: [...localePrefixes] });
    }
  }

  if (record.isDuplicate && (!record.duplicateOf || !mediaById.has(record.duplicateOf))) addError('INVALID_DUPLICATE_REFERENCE', 'Duplicate media has no valid duplicateOf record.', { id: record.id, duplicateOf: record.duplicateOf });
  inspected.push({ id: record.id, original, optimized, responsiveVariantCount: record.responsiveVariants?.length ?? 0, sourceWidth, sourceHeight, outputWidth, outputHeight });
}

for (const page of pageReports) {
  if (page.missingMediaCount > 0) addError('PAGE_MISSING_MEDIA', 'A source page reports missing media.', { sourcePageId: page.sourcePageId, count: page.missingMediaCount });
}

const sourceFiles = (await walk(srcRoot)).filter((filePath) => /\.(?:css|js|jsx|ts|tsx)$/i.test(filePath));
const runtimeHotlinks = [];
let hdRegistryRuntimeReferenceCount = 0;
for (const filePath of sourceFiles) {
  const source = await readFile(filePath, 'utf8');
  if (filePath !== registryPath) hdRegistryRuntimeReferenceCount += (source.match(/hd-assets\.generated|transferOilHdAsset/g) ?? []).length;
  for (const pattern of [
    /(?:src|poster)\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
    /url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi,
  ]) {
    for (const match of source.matchAll(pattern)) runtimeHotlinks.push({ file: path.relative(root, filePath).replaceAll('\\', '/'), url: match[1] });
  }
}
if (runtimeHotlinks.length) addError('RUNTIME_MEDIA_HOTLINK', 'Runtime source contains external src/poster/background media.', { count: runtimeHotlinks.length, runtimeHotlinks });
if (hdRegistryRuntimeReferenceCount === 0) addWarning('HD_REGISTRY_NOT_RUNTIME_BOUND', 'The additive HD registry is generated but no runtime component imports it yet. Component binding was outside this isolated media-only phase.');

if (strictLive && manifest.summary?.livePageAuditedCount !== EXPECTED_SOURCE_ROWS) addError('STRICT_LIVE_COVERAGE', 'Default HD acceptance requires all 343 pages to be audited live with Playwright/CDP.', { actual: manifest.summary?.livePageAuditedCount ?? 0 });
else if (manifest.summary?.livePageAuditedCount !== EXPECTED_SOURCE_ROWS) addWarning('CACHE_BASED_VISIBILITY_EVIDENCE', 'Diagnostic cache mode is active. Run audit-transferoil-media.mjs --live, then run this checker without --allow-cache for acceptance.', { livePageAuditedCount: manifest.summary?.livePageAuditedCount ?? 0 });
if ((manifest.summary?.livePageFailedCount ?? 0) > 0) addError('LIVE_PAGE_FAILURES', 'One or more official pages failed the live Playwright/CDP audit.', { count: manifest.summary.livePageFailedCount });
if ((manifest.summary?.unmappedVisibleMedia ?? 0) > 0) addError('UNMAPPED_VISIBLE_MEDIA', 'Live DOM media was discovered but not mapped to a local HD asset.', { count: manifest.summary.unmappedVisibleMedia });
if ((manifest.summary?.missingMedia ?? 0) > 0) addError('MISSING_DISCOVERED_MEDIA', 'Discovered official media could not be downloaded or preserved.', { count: manifest.summary.missingMedia });
if ((manifest.summary?.placeholderUsedWhereSourceExists ?? 0) > 0) addError('PLACEHOLDER_WHERE_SOURCE_EXISTS', 'A placeholder is used where an official source media file exists.', { count: manifest.summary.placeholderUsedWhereSourceExists });

for (const record of media.filter((item) => item.failureReason)) {
  addWarning('ORIGINAL_BINARY_RECOVERY_LIMITATION', record.failureReason, { id: record.id, selectedUrl: record.selectedUrl, preservedPath: record.localOriginalPath });
}

const hdFiles = await walk(path.join(publicRoot, 'assets', 'transfer-oil', 'hd'));
for (const filePath of hdFiles) {
  if ((await stat(filePath)).size === 0) addError('ZERO_BYTE_HD_FILE', 'HD folder contains a zero-byte file.', { file: path.relative(root, filePath).replaceAll('\\', '/') });
}

const summary = {
  expectedSourceUrls: EXPECTED_SOURCE_ROWS,
  auditedSourceUrls: pageReports.length,
  visibleContentMediaDiscovered: media.length,
  uniqueMediaCount: new Set(media.map((record) => record.sha256)).size,
  inspectedMediaCount: inspected.length,
  responsiveDerivativeCount: media.reduce((total, record) => total + (record.responsiveVariants?.length ?? 0), 0),
  deduplicatedMediaCount: media.filter((record) => record.isDuplicate).length,
  placeholderCount,
  brokenMedia,
  upscaledMedia,
  srcsetSelectionErrors,
  runtimeHotlinkCount: runtimeHotlinks.length,
  fourLocaleRouteMismatchCount,
  originalRecoveryWarningCount: media.filter((record) => record.failureReason).length,
  videoRecordCount: media.filter((record) => /^video\//i.test(record.mimeType ?? '') || /\.(?:mp4|webm|m4v|mov)$/i.test(record.localOptimizedPath ?? '')).length,
  videoMetadataErrorCount,
  hdFileCount: hdFiles.length,
  hdRegistryRuntimeReferenceCount,
  errorCount: errors.length,
  warningCount: warnings.length,
  passed: errors.length === 0,
};

const report = {
  generatedAt: new Date().toISOString(),
  manifest: path.relative(root, manifestPath).replaceAll('\\', '/'),
  strictLive,
  rules: {
    sourcePageCoverage: EXPECTED_SOURCE_ROWS,
    filesExistAndAreNonZero: true,
    originalSha256Matches: true,
    noUpscaling: true,
    highestRecordedSrcsetCandidateSelected: true,
    noPlaceholderInHdRegistry: true,
    noRuntimeMediaHotlinks: true,
    fourLocaleRouteMappingChecked: true,
    productSourcePageIdentityChecked: true,
  },
  summary,
  errors,
  warnings,
  inspected,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
console.log(`HD media check report: ${path.relative(root, reportPath).replaceAll('\\', '/')}`);
if (errors.length) process.exitCode = 1;
