import { createHash } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const sourceRoot = path.join(root, 'src');

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const reportPath = path.resolve(root, argument('report', 'docs/reference/asset-check.json'));
const allowUntracked = process.argv.includes('--allow-untracked');
const aspectTolerance = Number(argument('aspect-tolerance', '0.02'));

async function walk(directory) {
  if (!existsSync(directory)) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return files.flat();
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function publicFileFromUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  const clean = value.split(/[?#]/, 1)[0];
  let decoded = clean;
  try { decoded = decodeURIComponent(clean); } catch { /* Keep the original path. */ }
  const target = path.resolve(publicRoot, `.${decoded}`);
  return target.startsWith(`${publicRoot}${path.sep}`) ? target : null;
}

function manifestEntries(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['assets', 'entries', 'files', 'records']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function localPathFromEntry(entry) {
  return entry?.localPath || entry?.targetPath || entry?.targetFile || entry?.localFile || entry?.path || null;
}

function numericDimension(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function isRasterOrSvg(filePath) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(filePath);
}

function addIssue(collection, code, message, details = {}) {
  collection.push({ code, message, ...details });
}

const report = {
  generatedAt: new Date().toISOString(),
  root,
  rules: {
    zeroByteFiles: true,
    manifestTargetsExist: true,
    referencedPublicAssetsExist: true,
    noRuntimeMediaHotlinks: true,
    transferOilAssetsTracked: !allowUntracked,
    hdAssetRootGovernedByStrictHdManifest: true,
    aspectRatioTolerance: aspectTolerance,
  },
  summary: {},
  errors: [],
  warnings: [],
  manifests: [],
  inspectedAssets: [],
  runtimeHotlinks: [],
  untrackedTransferOilAssets: [],
};

const publicFiles = await walk(publicRoot);
for (const filePath of publicFiles) {
  const stats = await fs.stat(filePath);
  if (stats.size === 0) {
    addIssue(report.errors, 'ZERO_BYTE_FILE', 'Public altında sıfır byte dosya bulundu.', { file: relative(filePath) });
  }
}

const manifestFiles = publicFiles.filter((filePath) => ['asset-manifest.json', 'hd-media-manifest.json'].includes(path.basename(filePath)));
const trackedAssets = new Set();
let manifestEntryCount = 0;
let hdManifestLoaded = false;

for (const manifestFile of manifestFiles) {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  } catch (error) {
    addIssue(report.errors, 'INVALID_ASSET_MANIFEST', 'Asset manifest JSON olarak okunamadı.', {
      file: relative(manifestFile),
      details: error instanceof Error ? error.message : String(error),
    });
    continue;
  }

  if (path.basename(manifestFile) === 'hd-media-manifest.json') {
    const entries = Array.isArray(parsed?.media) ? parsed.media : [];
    report.manifests.push({ file: relative(manifestFile), entryCount: entries.length, type: 'strict-hd-media' });
    manifestEntryCount += entries.length;
    hdManifestLoaded = true;

    for (const [index, entry] of entries.entries()) {
      const declaredPaths = [
        entry?.localOriginalPath,
        entry?.localOptimizedPath,
        ...(Array.isArray(entry?.responsiveVariants) ? entry.responsiveVariants.map((variant) => variant?.path) : []),
      ].filter(Boolean);
      if (declaredPaths.length < 2) {
        addIssue(report.errors, 'HD_MANIFEST_LOCAL_PATH_MISSING', 'HD manifest kaydinda orijinal veya optimize yerel yol eksik.', {
          manifest: relative(manifestFile), index, id: entry?.id ?? null,
        });
      }
      for (const declaredPath of declaredPaths) {
        const assetFile = publicFileFromUrl(declaredPath);
        if (!assetFile) {
          addIssue(report.errors, 'HD_MANIFEST_PATH_OUTSIDE_PUBLIC', 'HD manifest yolu public klasoru disina cikiyor veya gecersiz.', {
            manifest: relative(manifestFile), index, id: entry?.id ?? null, localPath: declaredPath,
          });
          continue;
        }
        trackedAssets.add(relative(assetFile).replace(/^public\//, ''));
        if (!existsSync(assetFile) || (await fs.stat(assetFile)).size === 0) {
          addIssue(report.errors, 'HD_MANIFEST_FILE_MISSING_OR_EMPTY', 'HD manifestteki yerel medya bulunamadi veya bos.', {
            manifest: relative(manifestFile), index, id: entry?.id ?? null, localPath: declaredPath,
          });
        }
      }
    }
    continue;
  }

  const entries = manifestEntries(parsed);
  report.manifests.push({ file: relative(manifestFile), entryCount: entries.length });
  manifestEntryCount += entries.length;

  for (const [index, entry] of entries.entries()) {
    const declaredPath = localPathFromEntry(entry);
    if (!declaredPath) {
      addIssue(report.errors, 'MANIFEST_LOCAL_PATH_MISSING', 'Manifest kaydında yerel dosya yolu yok.', {
        manifest: relative(manifestFile), index,
      });
      continue;
    }
    if (/^https?:\/\//i.test(declaredPath)) {
      addIssue(report.errors, 'MANIFEST_HOTLINK_TARGET', 'Manifest yerel hedef yerine uzak URL kullanıyor.', {
        manifest: relative(manifestFile), index, localPath: declaredPath,
      });
      continue;
    }

    const assetFile = publicFileFromUrl(declaredPath);
    if (!assetFile) {
      addIssue(report.errors, 'MANIFEST_PATH_OUTSIDE_PUBLIC', 'Manifest yolu public klasörü dışına çıkıyor veya geçersiz.', {
        manifest: relative(manifestFile), index, localPath: declaredPath,
      });
      continue;
    }

    trackedAssets.add(relative(assetFile).replace(/^public\//, ''));
    if (!existsSync(assetFile)) {
      addIssue(report.errors, 'MANIFEST_FILE_MISSING', 'Manifestteki yerel asset dosyası bulunamadı.', {
        manifest: relative(manifestFile), index, localPath: declaredPath,
      });
      continue;
    }

    const stats = await fs.stat(assetFile);
    if (!stats.isFile() || stats.size === 0) {
      addIssue(report.errors, 'MANIFEST_FILE_EMPTY', 'Manifestteki asset geçerli ve dolu bir dosya değil.', {
        manifest: relative(manifestFile), index, localPath: declaredPath,
      });
      continue;
    }

    const inspected = {
      manifest: relative(manifestFile),
      localPath: declaredPath,
      bytes: stats.size,
      sha256: createHash('sha256').update(await fs.readFile(assetFile)).digest('hex'),
    };

    if (isRasterOrSvg(assetFile)) {
      try {
        const metadata = await sharp(assetFile).metadata();
        inspected.width = metadata.width ?? null;
        inspected.height = metadata.height ?? null;
        inspected.format = metadata.format ?? null;
        const declaredWidth = numericDimension(entry.width);
        const declaredHeight = numericDimension(entry.height);
        if (declaredWidth && declaredHeight && metadata.width && metadata.height) {
          const declaredRatio = declaredWidth / declaredHeight;
          const actualRatio = metadata.width / metadata.height;
          const ratioDelta = Math.abs(declaredRatio - actualRatio) / declaredRatio;
          inspected.declaredWidth = declaredWidth;
          inspected.declaredHeight = declaredHeight;
          inspected.aspectRatioDelta = Number(ratioDelta.toFixed(6));
          if (ratioDelta > aspectTolerance) {
            addIssue(report.errors, 'ASPECT_RATIO_METADATA_MISMATCH', 'Manifest ölçü oranı gerçek asset oranıyla uyuşmuyor.', {
              manifest: relative(manifestFile), localPath: declaredPath,
              declaredWidth, declaredHeight,
              actualWidth: metadata.width, actualHeight: metadata.height,
              ratioDelta: Number(ratioDelta.toFixed(6)),
            });
          }
        }
      } catch (error) {
        addIssue(report.errors, 'IMAGE_METADATA_UNREADABLE', 'Görsel metadata bilgisi okunamadı.', {
          localPath: declaredPath,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
    report.inspectedAssets.push(inspected);
  }
}

const transferOilRoot = path.join(publicRoot, 'assets', 'transfer-oil');
const hdAssetRoot = path.join(transferOilRoot, 'hd');
const managedHdFiles = hdManifestLoaded
  ? publicFiles.filter((filePath) => filePath.startsWith(`${hdAssetRoot}${path.sep}`))
  : [];
for (const filePath of managedHdFiles) trackedAssets.add(relative(filePath).replace(/^public\//, ''));
const transferOilFiles = (await walk(transferOilRoot)).filter((filePath) => {
  return isRasterOrSvg(filePath) || /\.(?:mp4|webm|pdf)$/i.test(filePath);
});
for (const filePath of transferOilFiles) {
  const key = relative(filePath).replace(/^public\//, '');
  if (!trackedAssets.has(key)) report.untrackedTransferOilAssets.push(relative(filePath));
}
if (report.untrackedTransferOilAssets.length > 0) {
  addIssue(allowUntracked ? report.warnings : report.errors, 'UNTRACKED_TRANSFER_OIL_ASSETS', 'Transfer Oil asset manifestlerinde kayıtlı olmayan dosyalar bulundu.', {
    count: report.untrackedTransferOilAssets.length,
    files: report.untrackedTransferOilAssets,
  });
}

const sourceFiles = (await walk(sourceRoot)).filter((filePath) => /\.(?:css|js|jsx|json|ts|tsx)$/i.test(filePath));
const referencedPaths = new Map();
for (const sourceFile of sourceFiles) {
  const source = await fs.readFile(sourceFile, 'utf8');
  const sourceName = relative(sourceFile);

  const localReferencePattern = /["'`](\/(?:assets|catalogues|images|videos)\/[^"'`?#]+)(?:[?#][^"'`]*)?["'`]/g;
  for (const match of source.matchAll(localReferencePattern)) {
    const locations = referencedPaths.get(match[1]) || [];
    locations.push(sourceName);
    referencedPaths.set(match[1], locations);
  }

  const hotlinkPatterns = [
    /(?:src|poster)\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
    /url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi,
  ];
  // Official URLs in the generated HD registry are provenance keys, not
  // runtime src/poster values. Keep the broad literal scan for hand-written
  // source while the two usage-specific scans above still cover this file.
  if (sourceName !== 'src/data/transferoil/hd-assets.generated.ts') {
    hotlinkPatterns.push(/["'`](https?:\/\/[^"'`\s]+\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm)(?:\?[^"'`\s]*)?)["'`]/gi);
  }
  for (const pattern of hotlinkPatterns) {
    for (const match of source.matchAll(pattern)) {
      report.runtimeHotlinks.push({ file: sourceName, url: match[1] });
    }
  }

  for (const imageTag of source.matchAll(/<Image\b[\s\S]*?\/>/g)) {
    if (/\bfill\b/.test(imageTag[0]) && !/object-(?:contain|cover)/.test(imageTag[0])) {
      addIssue(report.errors, 'IMAGE_FILL_WITHOUT_ASPECT_FIT', 'fill kullanan Image bileşeninde object-cover veya object-contain bulunamadı.', {
        file: sourceName,
        snippet: imageTag[0].replace(/\s+/g, ' ').slice(0, 240),
      });
    }
    if (/object-fill/.test(imageTag[0])) {
      addIssue(report.errors, 'IMAGE_OBJECT_FILL', 'object-fill görseli esnetebilir.', {
        file: sourceName,
        snippet: imageTag[0].replace(/\s+/g, ' ').slice(0, 240),
      });
    }
  }
}

for (const [urlPath, locations] of referencedPaths) {
  const assetFile = publicFileFromUrl(urlPath);
  if (!assetFile || !existsSync(assetFile)) {
    addIssue(report.errors, 'REFERENCED_PUBLIC_ASSET_MISSING', 'Kaynak kodda kullanılan public asset bulunamadı.', {
      localPath: urlPath, files: [...new Set(locations)],
    });
  } else if ((await fs.stat(assetFile)).size === 0) {
    addIssue(report.errors, 'REFERENCED_PUBLIC_ASSET_EMPTY', 'Kaynak kodda kullanılan public asset sıfır byte.', {
      localPath: urlPath, files: [...new Set(locations)],
    });
  }
}

report.runtimeHotlinks = [...new Map(report.runtimeHotlinks.map((item) => [`${item.file}|${item.url}`, item])).values()];
if (report.runtimeHotlinks.length > 0) {
  addIssue(report.errors, 'RUNTIME_MEDIA_HOTLINKS', 'Runtime kaynak kodunda uzak medya hotlink kullanımı bulundu.', {
    count: report.runtimeHotlinks.length,
    links: report.runtimeHotlinks,
  });
}

report.summary = {
  publicFileCount: publicFiles.length,
  manifestCount: manifestFiles.length,
  manifestEntryCount,
  trackedAssetCount: trackedAssets.size,
  managedHdFileCount: managedHdFiles.length,
  inspectedAssetCount: report.inspectedAssets.length,
  referencedPublicAssetCount: referencedPaths.size,
  runtimeHotlinkCount: report.runtimeHotlinks.length,
  untrackedTransferOilAssetCount: report.untrackedTransferOilAssets.length,
  errorCount: report.errors.length,
  warningCount: report.warnings.length,
  passed: report.errors.length === 0,
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Asset QA raporu: ${relative(reportPath)}`);
if (report.errors.length > 0) process.exitCode = 1;
