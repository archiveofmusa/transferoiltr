import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SOURCE_ROWS = 343;
const LOCALES = ['tr', 'en', 'ru', 'ar'];
const REQUIRED_ROW_FIELDS = [
  'id',
  'mainSection',
  'category',
  'subCategory',
  'seriesOrGroup',
  'pageOrProduct',
  'pageType',
  'hierarchy',
  'sourceUrl',
  'sourcePath',
  'controlStatus',
  'note',
  'canonicalResolutionRequired',
  'routeHint',
];
const PRODUCT_OR_PART_PAGE_TYPES = new Set([
  'Aksesuar',
  'Adaptör',
  'Ferrule',
  'Insert',
  'UHP fitting',
  'Ürün',
]);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const manifestPath = path.join(projectRoot, 'transferoil_link_manifest.json');
const outputDirectory = path.join(projectRoot, 'src', 'data', 'transferoil');
const contentDirectory = path.join(projectRoot, 'src', 'content', 'transferoil');
const resolutionPath = path.join(outputDirectory, 'source-resolution.generated.json');

function fail(message) {
  throw new Error(`[transferoil-registry] ${message}`);
}

async function readJson(filePath, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (optional && error && error.code === 'ENOENT') return null;
    if (error && error.code === 'ENOENT') {
      fail(`Required file is missing: ${path.relative(projectRoot, filePath)}`);
    }
    fail(`Cannot parse ${path.relative(projectRoot, filePath)}: ${error.message}`);
  }
}

function assertManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.rows)) {
    fail('The root manifest must contain a rows array.');
  }
  if (manifest.rows.length !== EXPECTED_SOURCE_ROWS) {
    fail(`Expected ${EXPECTED_SOURCE_ROWS} rows, found ${manifest.rows.length}.`);
  }

  const ids = new Set();
  const sourceUrls = new Set();
  const routeHints = new Set();

  for (const [index, row] of manifest.rows.entries()) {
    for (const field of REQUIRED_ROW_FIELDS) {
      if (!Object.hasOwn(row, field)) {
        fail(`Row ${index + 1} is missing required field ${field}.`);
      }
    }
    if (!Number.isInteger(row.id) || row.id < 1) {
      fail(`Row ${index + 1} has an invalid id.`);
    }
    if (ids.has(row.id)) fail(`Duplicate id: ${row.id}.`);
    ids.add(row.id);

    let sourceUrl;
    try {
      sourceUrl = new URL(row.sourceUrl);
    } catch {
      fail(`Row ${row.id} has an invalid sourceUrl.`);
    }
    if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'www.transferoil.com') {
      fail(`Row ${row.id} is outside the official Transfer Oil allowlist.`);
    }
    if (sourceUrls.has(row.sourceUrl)) fail(`Duplicate sourceUrl: ${row.sourceUrl}.`);
    sourceUrls.add(row.sourceUrl);

    if (!/^\/\{locale\}(?:\/[^?#]*)?$/.test(row.routeHint)) {
      fail(`Row ${row.id} has an invalid routeHint: ${row.routeHint}.`);
    }
    const normalizedRoute = normalizeRouteHint(row.routeHint);
    if (routeHints.has(normalizedRoute)) fail(`Duplicate normalized routeHint: ${normalizedRoute}.`);
    routeHints.add(normalizedRoute);
  }

  const expectedIds = Array.from({ length: EXPECTED_SOURCE_ROWS }, (_, index) => index + 1);
  const missingIds = expectedIds.filter((id) => !ids.has(id));
  if (missingIds.length) fail(`Manifest ids are not contiguous. Missing: ${missingIds.join(', ')}.`);

  if (manifest.summary?.uniqueSourceUrls !== EXPECTED_SOURCE_ROWS) {
    fail('Manifest summary.uniqueSourceUrls does not match the required 343 records.');
  }
  if (manifest.summary?.localizedRouteTargetCount !== EXPECTED_SOURCE_ROWS * LOCALES.length) {
    fail('Manifest summary.localizedRouteTargetCount does not match 343 x 4.');
  }
}

function normalizeRouteHint(routeHint) {
  const withoutLocale = routeHint.replace(/^\/\{locale\}/, '');
  const normalized = `/${withoutLocale.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
}

function localizedRoutes(routePath) {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, routePath === '/' ? `/${locale}` : `/${locale}${routePath}`]),
  );
}

function pageTitle(row) {
  return (
    row.pageOrProduct ??
    row.seriesOrGroup ??
    row.subCategory ??
    row.category ??
    row.hierarchy.split(' →').at(-1) ??
    `Transfer Oil ${row.id}`
  );
}

function normalizeResolutionRecords(resolutionFile) {
  if (!resolutionFile) return new Map();
  const records = Array.isArray(resolutionFile) ? resolutionFile : resolutionFile.records;
  if (!Array.isArray(records)) fail('source-resolution.generated.json must contain a records array.');

  const byId = new Map();
  for (const record of records) {
    if (!Number.isInteger(record.id)) fail('A resolution record has no valid numeric id.');
    if (byId.has(record.id)) fail(`Duplicate resolution record for id ${record.id}.`);
    byId.set(record.id, record);
  }
  return byId;
}

function resolutionFor(row, resolutionById) {
  const resolved = resolutionById.get(row.id);
  if (!resolved) {
    return row.canonicalResolutionRequired
      ? {
          resolvedUrl: null,
          finalStatus: 'resolution_pending',
          resolutionNote: 'Canonical resolution is required by the source manifest.',
          resolutionAttempts: [],
          snapshotPath: null,
        }
      : {
          resolvedUrl: row.sourceUrl,
          finalStatus: 'manifest_source',
          resolutionNote: 'The source URL is retained; canonical resolution was not required by the manifest.',
          resolutionAttempts: [],
          snapshotPath: null,
        };
  }

  if (resolved.sourceUrl && resolved.sourceUrl !== row.sourceUrl) {
    fail(`Resolution cache sourceUrl mismatch for id ${row.id}.`);
  }

  return {
    resolvedUrl: resolved.resolvedUrl ?? null,
    finalStatus: resolved.finalStatus ?? 'resolution_pending',
    resolutionNote: resolved.resolutionNote ?? null,
    resolutionAttempts: Array.isArray(resolved.resolutionAttempts) ? resolved.resolutionAttempts : [],
    snapshotPath: resolved.snapshotPath ?? null,
  };
}

function makeTranslationStub(title) {
  return {
    title,
    eyebrow: null,
    summary: null,
    description: null,
    benefits: [],
    applications: [],
    metadataTitle: null,
    metadataDescription: null,
    altText: null,
    extractionStatus: 'pending',
  };
}

const manifestBytes = await readFile(manifestPath);
const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
const manifest = JSON.parse(manifestBytes.toString('utf8'));
assertManifest(manifest);
const resolutionById = normalizeResolutionRecords(await readJson(resolutionPath, { optional: true }));
const manifestIds = new Set(manifest.rows.map((row) => row.id));
const orphanResolutionIds = [...resolutionById.keys()].filter((id) => !manifestIds.has(id));
if (orphanResolutionIds.length) {
  fail(`Canonical resolution cache contains orphan ids: ${orphanResolutionIds.join(', ')}.`);
}
const generatedAt = new Date().toISOString();

const preliminarySourceRows = manifest.rows.map((row) => {
  const routePath = normalizeRouteHint(row.routeHint);
  const title = pageTitle(row);
  return {
    ...row,
    registryKey: `transferoil-${String(row.id).padStart(3, '0')}`,
    title,
    routePath,
    pathSegments: routePath === '/' ? [] : routePath.slice(1).split('/'),
    localizedRoutes: localizedRoutes(routePath),
    isProductOrPart: PRODUCT_OR_PART_PAGE_TYPES.has(row.pageType),
    ...resolutionFor(row, resolutionById),
  };
});

const preliminaryByPath = new Map(preliminarySourceRows.map((row) => [row.routePath, row]));

function findParentId(row) {
  if (row.routePath === '/') return null;
  const segments = [...row.pathSegments];
  while (segments.length > 0) {
    segments.pop();
    const candidatePath = segments.length ? `/${segments.join('/')}` : '/';
    const candidate = preliminaryByPath.get(candidatePath);
    if (candidate) return candidate.id;
  }
  return null;
}

const parentIdById = new Map(preliminarySourceRows.map((row) => [row.id, findParentId(row)]));
const preliminaryById = new Map(preliminarySourceRows.map((row) => [row.id, row]));

function ancestorIdsFor(id) {
  const ancestorIds = [];
  const visited = new Set([id]);
  let parentId = parentIdById.get(id) ?? null;
  while (parentId !== null) {
    if (visited.has(parentId)) fail(`Circular route hierarchy detected at id ${id}.`);
    visited.add(parentId);
    ancestorIds.unshift(parentId);
    parentId = parentIdById.get(parentId) ?? null;
  }
  return ancestorIds;
}

const childIdsById = new Map(preliminarySourceRows.map((row) => [row.id, []]));
for (const [id, parentId] of parentIdById.entries()) {
  if (parentId !== null) childIdsById.get(parentId)?.push(id);
}

const sourceRows = preliminarySourceRows.map((row) => {
  const ancestorIds = ancestorIdsFor(row.id);
  return {
    ...row,
    parentId: parentIdById.get(row.id) ?? null,
    ancestorIds,
    childIds: childIdsById.get(row.id) ?? [],
    breadcrumbs: [...ancestorIds, row.id].map((id) => {
      const breadcrumbRow = preliminaryById.get(id);
      return {
        id,
        label: breadcrumbRow?.title ?? `Transfer Oil ${id}`,
        routePath: breadcrumbRow?.routePath ?? '/',
      };
    }),
  };
});

const sourceById = new Map(sourceRows.map((row) => [row.id, row]));

const localizedRouteCount = sourceRows.reduce(
  (count, row) => count + Object.keys(row.localizedRoutes).length,
  0,
);

const sourceMap = {
  schemaVersion: 1,
  generatedAt,
  sourceManifest: 'transferoil_link_manifest.json',
  sourceManifestSha256: manifestSha256,
  sourceWorkbookSha256: manifest.sourceWorkbookSha256 ?? null,
  summary: {
    expectedSourceRows: EXPECTED_SOURCE_ROWS,
    mappedSourceRows: sourceRows.length,
    missingSourceRows: 0,
    duplicateSourceUrls: 0,
    productOrPartRows: sourceRows.filter((row) => row.isProductOrPart).length,
    categorySeriesCorporateRows: sourceRows.filter((row) => !row.isProductOrPart).length,
    canonicalResolutionRequiredRows: sourceRows.filter((row) => row.canonicalResolutionRequired).length,
    canonicalResolutionPendingRows: sourceRows.filter(
      (row) => row.canonicalResolutionRequired && row.finalStatus === 'resolution_pending',
    ).length,
    localizedRouteCount,
    locales: LOCALES,
  },
  rows: sourceRows,
};

const routes = {
  schemaVersion: 1,
  generatedAt,
  sourceManifest: 'transferoil_link_manifest.json',
  summary: {
    sourceRouteCount: sourceRows.length,
    localeCount: LOCALES.length,
    localizedRouteCount,
    expectedLocalizedRouteCount: EXPECTED_SOURCE_ROWS * LOCALES.length,
  },
  locales: LOCALES,
  routes: sourceRows.map((row) => ({
    id: row.id,
    registryKey: row.registryKey,
    routePath: row.routePath,
    pathSegments: row.pathSegments,
    localizedRoutes: row.localizedRoutes,
    parentId: row.parentId,
    ancestorIds: row.ancestorIds,
    childIds: row.childIds,
    breadcrumbs: row.breadcrumbs,
    mainSection: row.mainSection,
    pageType: row.pageType,
    sourceUrl: row.sourceUrl,
  })),
};

const pages = {
  schemaVersion: 1,
  generatedAt,
  sourceManifest: 'transferoil_link_manifest.json',
  summary: {
    pageCount: sourceRows.length,
    translationLocaleCount: LOCALES.length,
    translationRecordCount: sourceRows.length * LOCALES.length,
    extractionCompleteCount: 0,
  },
  pages: sourceRows.map((row) => ({
    id: row.id,
    registryKey: row.registryKey,
    sourceUrl: row.sourceUrl,
    resolvedUrl: row.resolvedUrl,
    route: row.routePath,
    pageType: row.pageType,
    mainSection: row.mainSection,
    hierarchy: row.hierarchy,
    technicalData: {},
    tables: [],
    assets: [],
    documentLinks: [],
    relatedPageIds: row.childIds.length
      ? row.childIds.slice(0, 12)
      : row.parentId
        ? (sourceById.get(row.parentId)?.childIds ?? []).filter((id) => id !== row.id).slice(0, 6)
        : [],
    translations: Object.fromEntries(LOCALES.map((locale) => [locale, makeTranslationStub(row.title)])),
    lastExtractionTimestamp: null,
  })),
};

await mkdir(outputDirectory, { recursive: true });
await mkdir(contentDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, 'source-map.generated.json'), `${JSON.stringify(sourceMap, null, 2)}\n`),
  writeFile(path.join(outputDirectory, 'routes.generated.json'), `${JSON.stringify(routes, null, 2)}\n`),
  writeFile(path.join(contentDirectory, 'pages.generated.json'), `${JSON.stringify(pages, null, 2)}\n`),
]);

console.log(
  JSON.stringify(
    {
      expectedSourceRows: EXPECTED_SOURCE_ROWS,
      mappedSourceRows: sourceRows.length,
      uniqueSourceUrls: new Set(sourceRows.map((row) => row.sourceUrl)).size,
      sourceRoutes: routes.routes.length,
      localizedRoutes: routes.summary.localizedRouteCount,
      productOrPartRows: sourceMap.summary.productOrPartRows,
      categorySeriesCorporateRows: sourceMap.summary.categorySeriesCorporateRows,
      canonicalResolutionRequiredRows: sourceMap.summary.canonicalResolutionRequiredRows,
      canonicalResolutionPendingRows: sourceMap.summary.canonicalResolutionPendingRows,
      outputs: [
        'src/data/transferoil/source-map.generated.json',
        'src/data/transferoil/routes.generated.json',
        'src/content/transferoil/pages.generated.json',
      ],
    },
    null,
    2,
  ),
);
