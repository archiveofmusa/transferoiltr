import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { readMp4Metadata } from './lib/mp4-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const manifestPath = path.join(publicRoot, 'assets', 'transfer-oil', 'hd-media-manifest.json');
const registryPath = path.join(root, 'src', 'data', 'transferoil', 'hd-assets.generated.ts');
const routesPath = path.join(root, 'src', 'data', 'transferoil', 'routes.generated.json');
const reportPath = path.join(root, 'docs', 'reference', 'hd-media-reconciliation.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const routes = JSON.parse(await readFile(routesPath, 'utf8'));
const routeById = new Map((routes.routes ?? []).map((route) => [route.id, route]));

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.href;
  } catch {
    return null;
  }
}

function urlAliases(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return [];
  const aliases = [normalized];
  const url = new URL(normalized);
  const decoded = decodeURIComponent(url.pathname);
  if (/\/large\//i.test(decoded)) {
    const standard = new URL(url.href);
    standard.pathname = decoded.replace(/\/large\//i, '/standard/');
    aliases.push(standard.href);
  }
  if (/\/standard\//i.test(decoded)) {
    const large = new URL(url.href);
    large.pathname = decoded.replace(/\/standard\//i, '/large/');
    aliases.push(large.href);
  }
  return [...new Set(aliases.map(normalizeUrl).filter(Boolean))];
}

async function inspectVideo(localPath) {
  const filePath = path.join(publicRoot, localPath.replace(/^\//, '').replaceAll('/', path.sep));
  if (/\.mp4$/i.test(filePath)) {
    try {
      return await readMp4Metadata(filePath);
    } catch { /* Use Chromium for non-standard MP4 files. */ }
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'commit', timeout: 30_000 });
    const measured = await page.evaluate(async () => {
      const video = document.querySelector('video');
      if (!video) throw new Error('No video element was created.');
      while (video.readyState < 1) await new Promise((resolve) => setTimeout(resolve, 50));
      video.muted = true;
      video.currentTime = 0;
      const firstFrame = video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      video.pause();
      return {
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: video.duration,
        sampleSeconds: video.currentTime,
        decodedFrames: (video.getVideoPlaybackQuality?.().totalVideoFrames ?? firstFrame) - firstFrame,
      };
    });
    const rawFrameRate = measured.sampleSeconds > 0 ? Math.max(0, measured.decodedFrames - 2) / measured.sampleSeconds : null;
    const standards = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
    const nearest = rawFrameRate === null ? null : standards.reduce((best, current) => Math.abs(current - rawFrameRate) < Math.abs(best - rawFrameRate) ? current : best, standards[0]);
    const frameRate = rawFrameRate !== null && Math.abs(nearest - rawFrameRate) <= 2 ? nearest : (rawFrameRate ? Number(rawFrameRate.toFixed(3)) : null);
    const bytes = (await stat(filePath)).size;
    return {
      width: measured.width || null,
      height: measured.height || null,
      bitrateKbps: measured.durationSeconds ? Number(((bytes * 8) / measured.durationSeconds / 1000).toFixed(2)) : null,
      durationSeconds: Number.isFinite(measured.durationSeconds) ? Number(measured.durationSeconds.toFixed(3)) : null,
      frameRate,
      inspectionNote: 'Bundled Playwright ffmpeg could not demux local MP4 inputs. Dimensions and duration were read from local Chromium media metadata; frame rate was measured from decoded frames and normalized to the nearest broadcast standard; bitrate is the exact file-size average.',
    };
  } finally {
    await browser.close();
  }
}

const videoMetadataByPath = new Map();
for (const record of manifest.media.filter((item) => /^video\//i.test(item.mimeType) || /\.(?:mp4|webm|m4v|mov)$/i.test(item.localOptimizedPath))) {
  if (!videoMetadataByPath.has(record.localOptimizedPath)) videoMetadataByPath.set(record.localOptimizedPath, await inspectVideo(record.localOptimizedPath));
  record.videoMetadata = videoMetadataByPath.get(record.localOptimizedPath);
  record.originalWidth = record.videoMetadata.width ?? record.originalWidth;
  record.originalHeight = record.videoMetadata.height ?? record.originalHeight;
  record.optimizedWidth = record.videoMetadata.width ?? record.optimizedWidth;
  record.optimizedHeight = record.videoMetadata.height ?? record.optimizedHeight;
}

const aliasAssociations = [
  { sourcePageId: 34, largeNeedle: '/large/BOCCOLE_SA1.png' },
  { sourcePageId: 198, largeNeedle: '/large/SOQ%20-%20F-Type%20M%20VHP.png' },
  { sourcePageId: 198, largeNeedle: '/large/SOH%20-%20F%20VHP%20JIC%20C.png' },
];
for (const association of aliasAssociations) {
  const record = manifest.media.find((item) => [item.originalUrl, item.selectedUrl, item.resolvedUrl].filter(Boolean).some((url) => url.includes(association.largeNeedle)));
  if (!record) throw new Error(`Could not find HD record for ${association.largeNeedle}`);
  record.sourcePageIds = [...new Set([...(record.sourcePageIds ?? []), association.sourcePageId])].sort((a, b) => a - b);
  const route = routeById.get(association.sourcePageId);
  record.usedOnLocalRoutes = [...new Set([...(record.usedOnLocalRoutes ?? []), ...Object.values(route?.localizedRoutes ?? {})])].sort();
}

const localHashByPath = new Map();
for (const record of manifest.media) {
  if (!localHashByPath.has(record.localOriginalPath)) {
    const filePath = path.join(publicRoot, record.localOriginalPath.replace(/^\//, '').replaceAll('/', path.sep));
    const buffer = await readFile(filePath);
    localHashByPath.set(record.localOriginalPath, { sha256: createHash('sha256').update(buffer).digest('hex'), fileSize: buffer.length });
  }
  const local = localHashByPath.get(record.localOriginalPath);
  record.sha256 = local.sha256;
  record.fileSize = local.fileSize;
}
manifest.summary.uniqueMediaCount = new Set(manifest.media.map((record) => record.sha256)).size;

const mappedAliases = new Set(manifest.media.flatMap((record) => [record.originalUrl, record.selectedUrl, record.resolvedUrl, ...(record.srcsetCandidates ?? []).map((candidate) => candidate.url)]).flatMap(urlAliases));
for (const record of manifest.media) {
  for (const field of ['originalWidth', 'originalHeight', 'optimizedWidth', 'optimizedHeight']) {
    record[field] = Number.isFinite(Number(record[field])) && Number(record[field]) > 0 ? Number(record[field]) : null;
  }
}
manifest.unmappedVisibleMedia = (manifest.unmappedVisibleMedia ?? []).filter((record) => !mappedAliases.has(normalizeUrl(record.url)));
manifest.summary.unmappedVisibleMedia = manifest.unmappedVisibleMedia.length;
manifest.summary.missingMedia = Number(manifest.summary.brokenMedia ?? 0) + Number(manifest.summary.discoveryFailureCount ?? 0);
manifest.reconciledAt = new Date().toISOString();
manifest.reconciliation = {
  standardLargeAliasAssociations: aliasAssociations,
  videoMetadataMethod: 'Local Chromium media metadata fallback after bundled ffmpeg demux limitation.',
  videoMetadataRecordCount: videoMetadataByPath.size,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const mediaByPageId = new Map(Array.from({ length: 343 }, (_, index) => [index + 1, []]));
for (const record of manifest.media) for (const sourcePageId of record.sourcePageIds ?? []) mediaByPageId.get(sourcePageId)?.push(record);
const registryRecords = Object.fromEntries(manifest.media.map((record) => [record.id, {
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
const bySourcePageId = Object.fromEntries([...mediaByPageId].map(([id, records]) => [String(id), records.map((record) => record.id)]));
const legacyPathToHdPath = Object.fromEntries(manifest.media.filter((record) => record.previousLocalPath).map((record) => [record.previousLocalPath, record.localOptimizedPath]));
const runtimeFiles = [path.join(root, 'src', 'data', 'transferOilAssets.ts'), path.join(root, 'src', 'data', 'finalTransferOilAssets.ts'), path.join(root, 'src', 'i18n', 'metadata.ts')];
const runtimePaths = new Set();
for (const file of runtimeFiles) for (const match of (await readFile(file, 'utf8')).matchAll(/["'](\/assets\/transfer-oil\/[^"']+)["']/g)) runtimePaths.add(match[1]);
const runtimeMap = Object.fromEntries([...runtimePaths].filter((value) => legacyPathToHdPath[value]).map((value) => [value, legacyPathToHdPath[value]]));
const officialUrlMap = {};
const canonicalMap = {};
for (const record of manifest.media) {
  for (const url of [record.originalUrl, record.selectedUrl, record.resolvedUrl]) for (const alias of urlAliases(url)) officialUrlMap[alias] = record.localOptimizedPath;
  for (const sourcePageId of record.sourcePageIds ?? []) canonicalMap[`${sourcePageId}:${record.selectedUrl ?? record.originalUrl ?? record.previousLocalPath}`] = record.id;
}
const semantic = (needle) => manifest.media.find((record) => [record.originalUrl, record.selectedUrl, record.resolvedUrl].filter(Boolean).some((url) => decodeURIComponent(url).toLowerCase().includes(needle.toLowerCase())))?.localOptimizedPath ?? null;
const semanticAssets = {
  heroHomePoster: semantic('/slider-1/_MG_8650.jpg'),
  heroUhp: semantic('/slider-2024/R62_8171-rid.jpg'),
  heroHydraulic: semantic('/slider-2024/Laser marking 3-rid.jpg'),
  heroIndustrial: semantic('/slider-2024/R62_1552.jpg'),
  homeVideo: semantic('/website/videos/video_TO_Home.mp4'),
  menuHydraulic: semantic('/home/hydraulic.png'),
  menuIndustrial: semantic('/home/industrial.png'),
  menuUhp: semantic('/home/uhp.png'),
  menuCorporate: semantic('/website/images/company2.png'),
  corporateOverview: semantic('/storia/new/thermoplastic-hose-UHP.jpg'),
};
const registry = [
  '/* This file is generated by scripts/audit-transferoil-media.mjs. Do not edit by hand. */',
  '',
  'export type TransferOilHdResponsiveAsset = { width: number; height: number | null; path: string; sizesHint: string }',
  'export type TransferOilHdVideoMetadata = { width: number | null; height: number | null; bitrateKbps: number | null; durationSeconds: number | null; frameRate: number | null; inspectionNote: string }',
  'export type TransferOilHdAsset = { id: string; previousLocalPath: string | null; sourcePageId: number | null; sourcePageIds: readonly number[]; sourcePage: string | null; originalUrl: string | null; selectedUrl: string | null; usage: string; original: string; optimized: string; width: number | null; height: number | null; mimeType: string; sha256: string; responsive: readonly TransferOilHdResponsiveAsset[]; videoMetadata: TransferOilHdVideoMetadata | null; isDuplicate: boolean; duplicateOf: string | null }',
  '',
  `export const transferOilHdAssets = ${JSON.stringify(registryRecords, null, 2)} as const satisfies Record<string, TransferOilHdAsset>`,
  `export const transferOilHdAssetsBySourcePageId = ${JSON.stringify(bySourcePageId, null, 2)} as const`,
  `export const transferOilHdAssetPathMap = ${JSON.stringify(legacyPathToHdPath, null, 2)} as const satisfies Record<string, string>`,
  `export const transferOilHdRuntimeAssetPathMap = ${JSON.stringify(runtimeMap, null, 2)} as const satisfies Record<string, string>`,
  `export const transferOilHdOfficialUrlMap = ${JSON.stringify(officialUrlMap, null, 2)} as const satisfies Record<string, string>`,
  `export const transferOilHdCanonicalReferenceMap = ${JSON.stringify(canonicalMap, null, 2)} as const satisfies Record<string, string>`,
  `export const transferOilHdSemanticAssets = ${JSON.stringify(semanticAssets, null, 2)} as const`,
  'export const transferOilHdAssetList = Object.values(transferOilHdAssets)',
  'export function getTransferOilHdAssetsForSourcePage(sourcePageId: number): TransferOilHdAsset[] { const ids = (transferOilHdAssetsBySourcePageId as Record<string, readonly string[]>)[String(sourcePageId)] ?? []; const assets = transferOilHdAssets as unknown as Record<string, TransferOilHdAsset>; return ids.map((id) => assets[id]).filter((asset): asset is TransferOilHdAsset => Boolean(asset)) }',
  'export function resolveTransferOilHdAssetPath(currentPath: string): string { return (transferOilHdAssetPathMap as Record<string, string>)[currentPath] ?? (transferOilHdOfficialUrlMap as Record<string, string>)[currentPath] ?? currentPath }',
  '',
].join('\n');
await writeFile(registryPath, registry, 'utf8');

const report = {
  generatedAt: new Date().toISOString(),
  mappedStandardLargeAliases: aliasAssociations.length,
  remainingUnmappedVisibleMedia: manifest.summary.unmappedVisibleMedia,
  missingMedia: manifest.summary.missingMedia,
  videoMetadata: Object.fromEntries(videoMetadataByPath),
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
