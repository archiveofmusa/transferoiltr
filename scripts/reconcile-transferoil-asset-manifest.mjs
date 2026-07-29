import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const assetRoot = path.join(publicRoot, 'assets', 'transfer-oil');
const manifestPath = path.join(assetRoot, 'asset-manifest.json');
const sourcePageManifestPath = path.join(assetRoot, 'source-page-manifest.json');
const fetchLogPath = path.join(root, '.cache', 'transferoil', 'assets-fetch.stdout.log');
const provenanceManifestPaths = [path.join(assetRoot, 'final', 'asset-manifest.json')];
const mediaPattern = /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)$/i;

const asPosix = (value) => value.replaceAll(path.sep, '/');
const localPath = (value) => `/${asPosix(path.relative(publicRoot, value))}`;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function allFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.mov': 'video/quicktime',
  }[extension] ?? 'application/octet-stream';
}

function isExpectedSkip(failure) {
  const url = String(failure.originalUrl ?? '');
  const error = String(failure.error ?? '');
  return /^(?:Dosya çok küçük|Çok küçük UI görseli|Video 80 MB sınırını aşıyor)/.test(error)
    || (failure.context === 'external CSS background-image' && /^HTTP \d+/.test(error))
    || /(?:user_w\.svg|search-orange\.svg|\/images\/icons?\/|(?:^|\/)arrow(?:[-_.]|\.svg)|ie-warning|jquery-ui|ui-bg_|ui-icons_|animated-overlay|fancybox|icon_footer_|next-small|prev-small|blank\.gif|search-submit|author-icon|view-icon|comment-icon|tag-icon)/i.test(url);
}

function isForbiddenFontAsset(asset) {
  const source = String(asset.originalUrl ?? '');
  return /\/(?:web)?fonts?\//i.test(source)
    || /(?:fa-(?:brands|regular|solid)|materialdesignicons-webfont|\/font\/TransferOil\.svg)/i.test(source);
}

function aggregate(items, urlField, detailField) {
  const byKey = new Map();
  for (const item of items) {
    const url = item[urlField] ?? item.url ?? null;
    const detail = item[detailField] ?? item.reason ?? null;
    const key = `${url}|${detail}`;
    if (!byKey.has(key)) byKey.set(key, { ...item, sourcePages: [] });
    const record = byKey.get(key);
    for (const sourcePage of [item.sourcePage, ...(item.sourcePages ?? [])].filter(Boolean)) {
      if (!record.sourcePages.includes(sourcePage)) record.sourcePages.push(sourcePage);
    }
    delete record.sourcePage;
  }
  return [...byKey.values()];
}

async function main() {
  if (!(await exists(manifestPath))) throw new Error('Asset manifest bulunamadı. Önce fetch-transferoil-assets.mjs çalıştırılmalıdır.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.assets)) throw new Error('Yeni asset manifest şeması bulunamadı.');
  const previousReconciliation = manifest.reconciliation ?? {};
  const forbiddenFontAssets = manifest.assets.filter(isForbiddenFontAsset);
  const forbiddenFontPaths = new Set(forbiddenFontAssets.map((asset) => asset.localPath).filter(Boolean));
  const forbiddenPathCollisionAssets = manifest.assets.filter((asset) => forbiddenFontPaths.has(asset.localPath));
  manifest.assets = manifest.assets.filter((asset) => !isForbiddenFontAsset(asset) && !forbiddenFontPaths.has(asset.localPath));
  const sourcePageManifest = await exists(sourcePageManifestPath)
    ? JSON.parse(await readFile(sourcePageManifestPath, 'utf8'))
    : null;
  const fetchLog = await exists(fetchLogPath)
    ? JSON.parse(await readFile(fetchLogPath, 'utf8'))
    : null;
  const provenance = [];
  for (const filePath of provenanceManifestPaths) {
    if (!(await exists(filePath))) continue;
    const value = JSON.parse(await readFile(filePath, 'utf8'));
    provenance.push(...(Array.isArray(value) ? value : value.assets ?? []));
  }
  const provenanceByPath = new Map(provenance.filter((item) => item.localPath).map((item) => [item.localPath, item]));
  const trackedByPath = new Map(manifest.assets.filter((item) => item.localPath).map((item) => [item.localPath, item]));
  const trackedByHash = new Map(manifest.assets.filter((item) => item.sha256).map((item) => [item.sha256, item]));
  const mediaFiles = (await allFiles(assetRoot)).filter((filePath) => mediaPattern.test(filePath));
  const added = [];

  for (const filePath of mediaFiles) {
    const publicPath = localPath(filePath);
    if (trackedByPath.has(publicPath)) continue;
    const buffer = await readFile(filePath);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const matchingHash = trackedByHash.get(sha256) ?? null;
    const known = provenanceByPath.get(publicPath) ?? matchingHash ?? null;
    const mimeType = mimeFor(filePath);
    const metadata = mimeType.startsWith('image/') && mimeType !== 'image/svg+xml'
      ? await sharp(buffer).metadata().catch(() => ({}))
      : {};
    const record = {
      id: `local-${String(added.length + 1).padStart(4, '0')}`,
      sourcePage: known?.sourcePage ?? known?.sourcePages?.[0] ?? null,
      sourcePages: known?.sourcePages ?? (known?.sourcePage ? [known.sourcePage] : []),
      originalUrl: known?.originalUrl ?? null,
      localPath: publicPath,
      guessedUse: known?.guessedUse ?? (publicPath.includes('/placeholders/') ? 'yerel placeholder' : 'önceden var olan yerel medya'),
      width: metadata.width ?? known?.width ?? null,
      height: metadata.height ?? known?.height ?? null,
      outputMimeType: mimeType,
      byteLength: (await stat(filePath)).size,
      sha256,
      optimization: known?.notes ?? 'Mevcut yerel dosya asset envanterine alındı; dosya yeniden boyutlandırılmadı.',
      isPlaceholder: Boolean(known?.isPlaceholder || publicPath.includes('/placeholders/')),
      provenanceStatus: known?.originalUrl ? 'recovered' : 'legacy-local-source-url-unavailable',
    };
    manifest.assets.push(record);
    trackedByPath.set(publicPath, record);
    if (!trackedByHash.has(sha256)) trackedByHash.set(sha256, record);
    added.push(record);
  }

  const recordsByPath = new Map();
  for (const asset of manifest.assets) {
    if (!recordsByPath.has(asset.localPath)) recordsByPath.set(asset.localPath, []);
    recordsByPath.get(asset.localPath).push(asset);
  }
  const deduplicatedAssets = [];
  let duplicateLocalPathRecordsRemoved = 0;
  for (const [publicPath, records] of recordsByPath) {
    if (records.length === 1) {
      deduplicatedAssets.push(records[0]);
      continue;
    }
    const absolutePath = path.join(publicRoot, publicPath.replace(/^\//, '').replaceAll('/', path.sep));
    const actualHash = await exists(absolutePath)
      ? createHash('sha256').update(await readFile(absolutePath)).digest('hex')
      : null;
    const chosen = records.find((record) => record.sha256 === actualHash) ?? records.at(-1);
    chosen.sourcePages = [...new Set(records.flatMap((record) => record.sourcePages ?? (record.sourcePage ? [record.sourcePage] : [])))];
    chosen.originalUrlAliases = [...new Set(records.map((record) => record.originalUrl).filter((url) => url && url !== chosen.originalUrl))];
    chosen.duplicateLocalPathRecordsMerged = records.length - 1;
    deduplicatedAssets.push(chosen);
    duplicateLocalPathRecordsRemoved += records.length - 1;
  }
  manifest.assets = deduplicatedAssets;

  const missingLocalPaths = [];
  for (const asset of manifest.assets) {
    if (!asset.localPath || !(await exists(path.join(publicRoot, asset.localPath.replace(/^\//, '').replaceAll('/', path.sep))))) {
      missingLocalPaths.push(asset.id ?? asset.originalUrl ?? '(kimliksiz kayıt)');
    }
  }
  if (missingLocalPaths.length) throw new Error(`Manifestte eksik/kırık localPath: ${missingLocalPaths.join(', ')}`);

  const safeFailures = (manifest.failures ?? []).filter(isExpectedSkip).map((failure) => ({
    url: failure.originalUrl,
    sourcePage: failure.sourcePage,
    reason: failure.error.startsWith('Video') ? 'oversized-video-reported' : 'decorative-ui-or-unusable-small-media',
    details: failure.error,
  }));
  const realFailures = (manifest.failures ?? []).filter((failure) => !isExpectedSkip(failure));
  manifest.skipped = aggregate([...(manifest.skipped ?? []), ...safeFailures], 'url', 'details');
  manifest.failures = aggregate(realFailures, 'originalUrl', 'error');
  manifest.summary.failedAssetDownloads = manifest.failures.length;
  manifest.summary.skippedCandidates = manifest.skipped.length;
  manifest.summary.trackedLocalAssets = manifest.assets.length;
  manifest.summary.rawDownloadedUniqueAssets = fetchLog?.downloadedUniqueAssets ?? manifest.summary.rawDownloadedUniqueAssets ?? manifest.summary.downloadedUniqueAssets;
  manifest.summary.downloadedUniqueAssets = manifest.assets.filter((asset) => String(asset.id).startsWith('asset-')).length;
  manifest.summary.reconciledLegacyAssets = manifest.assets.filter((asset) => String(asset.id).startsWith('local-')).length;
  manifest.summary.localMediaFiles = (await allFiles(assetRoot)).filter((filePath) => mediaPattern.test(filePath)).length;
  manifest.summary.untrackedLocalMediaFiles = 0;
  manifest.summary.placeholderAssetsCreated = manifest.assets.filter((asset) => asset.isPlaceholder).length;
  manifest.reconciliation = {
    reconciledAt: new Date().toISOString(),
    localMediaFiles: mediaFiles.length,
    newlyTrackedLegacyFiles: added.length,
    forbiddenFontAssetRecordsRemoved: (previousReconciliation.forbiddenFontAssetRecordsRemoved ?? 0) + forbiddenPathCollisionAssets.length,
    duplicateLocalPathRecordsRemoved: (previousReconciliation.duplicateLocalPathRecordsRemoved ?? 0) + duplicateLocalPathRecordsRemoved,
    recoveredSourceProvenance: manifest.assets.filter((asset) => String(asset.id).startsWith('local-') && asset.originalUrl).length,
    legacyFilesWithoutRecoverableSourceUrl: manifest.assets.filter((asset) => String(asset.id).startsWith('local-') && !asset.originalUrl).length,
    missingLocalPaths: [],
    note: 'Kaynak URL’si önceki doğrulanmış manifestten veya SHA-256 eşleşmesinden geri kazanılamayan eski yerel dosyalar açıkça legacy olarak işaretlendi.',
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (sourcePageManifest) {
    sourcePageManifest.summary = { ...sourcePageManifest.summary, ...manifest.summary };
    const pageBySource = new Map((sourcePageManifest.pages ?? []).map((page) => [page.sourceUrl, page]));
    for (const asset of added) {
      for (const sourcePage of asset.sourcePages ?? []) {
        const page = pageBySource.get(sourcePage);
        if (page && !page.localAssets.includes(asset.localPath)) page.localAssets.push(asset.localPath);
      }
    }
    const validLocalPaths = new Set(manifest.assets.map((asset) => asset.localPath));
    for (const page of sourcePageManifest.pages ?? []) {
      page.localAssets = [...new Set((page.localAssets ?? []).filter((assetPath) => validLocalPaths.has(assetPath)))];
    }
    sourcePageManifest.summary.sourceRowsWithoutLocalAssets = (sourcePageManifest.pages ?? []).filter((page) => page.localAssets.length === 0).length;
    await writeFile(sourcePageManifestPath, `${JSON.stringify(sourcePageManifest, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ ...manifest.summary, remainingFailureSamples: manifest.failures.slice(0, 10), reconciliation: manifest.reconciliation }, null, 2));
  if (manifest.failures.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
