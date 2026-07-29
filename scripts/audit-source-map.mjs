import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SOURCE_ROWS = 343;
const LOCALES = ['tr', 'en', 'ru', 'ar'];
const REQUIRED_PRESERVED_FIELDS = [
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

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const reportDirectory = path.join(projectRoot, 'docs', 'reference');
const strictResolution = !process.argv.includes('--allow-pending-resolution');

const filePaths = {
  manifest: path.join(projectRoot, 'transferoil_link_manifest.json'),
  sourceMap: path.join(projectRoot, 'src', 'data', 'transferoil', 'source-map.generated.json'),
  routes: path.join(projectRoot, 'src', 'data', 'transferoil', 'routes.generated.json'),
  pages: path.join(projectRoot, 'src', 'content', 'transferoil', 'pages.generated.json'),
  report: path.join(reportDirectory, 'source-map-audit.json'),
};

async function readJson(label, filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} could not be read at ${path.relative(projectRoot, filePath)}: ${error.message}`);
  }
}

function normalizeRouteHint(routeHint) {
  const withoutLocale = routeHint.replace(/^\/\{locale\}/, '');
  const routePath = `/${withoutLocale.replace(/^\/+|\/+$/g, '')}`;
  return routePath === '/' ? '/' : routePath.toLowerCase();
}

function equalValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function countDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

const failures = [];
const warnings = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

let manifest;
let sourceMap;
let routes;
let pages;

try {
  [manifest, sourceMap, routes, pages] = await Promise.all([
    readJson('Root manifest', filePaths.manifest),
    readJson('Generated source map', filePaths.sourceMap),
    readJson('Generated route registry', filePaths.routes),
    readJson('Generated page registry', filePaths.pages),
  ]);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const manifestRows = Array.isArray(manifest.rows) ? manifest.rows : [];
const sourceRows = Array.isArray(sourceMap.rows) ? sourceMap.rows : [];
const routeRows = Array.isArray(routes.routes) ? routes.routes : [];
const pageRows = Array.isArray(pages.pages) ? pages.pages : [];
const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
const routeById = new Map(routeRows.map((row) => [row.id, row]));
const pageById = new Map(pageRows.map((row) => [row.id, row]));

const uniqueManifestUrls = new Set(manifestRows.map((row) => row.sourceUrl));
const duplicateManifestUrls = countDuplicates(manifestRows.map((row) => row.sourceUrl));
const duplicateManifestIds = countDuplicates(manifestRows.map((row) => row.id));
const duplicateManifestRoutes = countDuplicates(manifestRows.map((row) => normalizeRouteHint(row.routeHint)));

check(manifestRows.length === EXPECTED_SOURCE_ROWS, `Manifest row count is ${manifestRows.length}; expected 343.`);
check(uniqueManifestUrls.size === EXPECTED_SOURCE_ROWS, `Unique source URL count is ${uniqueManifestUrls.size}; expected 343.`);
check(duplicateManifestUrls.size === 0, `Duplicate source URLs: ${[...duplicateManifestUrls].join(', ')}`);
check(duplicateManifestIds.size === 0, `Duplicate manifest ids: ${[...duplicateManifestIds].join(', ')}`);
check(duplicateManifestRoutes.size === 0, `Duplicate normalized route hints: ${[...duplicateManifestRoutes].join(', ')}`);
check(sourceRows.length === EXPECTED_SOURCE_ROWS, `Source-map row count is ${sourceRows.length}; expected 343.`);
check(routeRows.length === EXPECTED_SOURCE_ROWS, `Route mapping count is ${routeRows.length}; expected 343.`);
check(pageRows.length === EXPECTED_SOURCE_ROWS, `Page registry count is ${pageRows.length}; expected 343.`);
check(sourceById.size === sourceRows.length, 'Generated source map contains duplicate ids.');
check(routeById.size === routeRows.length, 'Generated route registry contains duplicate ids.');
check(pageById.size === pageRows.length, 'Generated page registry contains duplicate ids.');

const missingSourceIds = [];
const missingRouteIds = [];
const missingPageIds = [];
const preservationErrors = [];
const routeMappingErrors = [];
const pageMappingErrors = [];
const hierarchyErrors = [];

for (const manifestRow of manifestRows) {
  const sourceRow = sourceById.get(manifestRow.id);
  const routeRow = routeById.get(manifestRow.id);
  const pageRow = pageById.get(manifestRow.id);
  if (!sourceRow) missingSourceIds.push(manifestRow.id);
  if (!routeRow) missingRouteIds.push(manifestRow.id);
  if (!pageRow) missingPageIds.push(manifestRow.id);
  if (!sourceRow || !routeRow || !pageRow) continue;

  for (const field of REQUIRED_PRESERVED_FIELDS) {
    if (!Object.hasOwn(sourceRow, field) || !equalValue(sourceRow[field], manifestRow[field])) {
      preservationErrors.push(`${manifestRow.id}:${field}`);
    }
  }

  const expectedRoutePath = normalizeRouteHint(manifestRow.routeHint);
  if (sourceRow.routePath !== expectedRoutePath || routeRow.routePath !== expectedRoutePath) {
    routeMappingErrors.push(`${manifestRow.id}:routePath`);
  }
  if (routeRow.sourceUrl !== manifestRow.sourceUrl || pageRow.sourceUrl !== manifestRow.sourceUrl) {
    routeMappingErrors.push(`${manifestRow.id}:sourceUrl`);
  }
  if (pageRow.route !== expectedRoutePath || pageRow.pageType !== manifestRow.pageType) {
    pageMappingErrors.push(`${manifestRow.id}:page`);
  }
  if (
    routeRow.parentId !== sourceRow.parentId ||
    !equalValue(routeRow.ancestorIds, sourceRow.ancestorIds) ||
    !equalValue(routeRow.childIds, sourceRow.childIds) ||
    !equalValue(routeRow.breadcrumbs, sourceRow.breadcrumbs)
  ) {
    hierarchyErrors.push(`${manifestRow.id}:registry-sync`);
  }

  for (const locale of LOCALES) {
    const expectedLocalizedPath = expectedRoutePath === '/' ? `/${locale}` : `/${locale}${expectedRoutePath}`;
    if (
      sourceRow.localizedRoutes?.[locale] !== expectedLocalizedPath ||
      routeRow.localizedRoutes?.[locale] !== expectedLocalizedPath
    ) {
      routeMappingErrors.push(`${manifestRow.id}:${locale}`);
    }
    if (!pageRow.translations || !Object.hasOwn(pageRow.translations, locale)) {
      pageMappingErrors.push(`${manifestRow.id}:translation:${locale}`);
    }
  }
}

const manifestIds = new Set(manifestRows.map((row) => row.id));
const orphanSourceIds = sourceRows.filter((row) => !manifestIds.has(row.id)).map((row) => row.id);
const orphanRouteIds = routeRows.filter((row) => !manifestIds.has(row.id)).map((row) => row.id);
const orphanPageIds = pageRows.filter((row) => !manifestIds.has(row.id)).map((row) => row.id);

check(missingSourceIds.length === 0, `Missing source-map ids: ${missingSourceIds.join(', ')}`);
check(missingRouteIds.length === 0, `Missing route ids: ${missingRouteIds.join(', ')}`);
check(missingPageIds.length === 0, `Missing page ids: ${missingPageIds.join(', ')}`);
check(orphanSourceIds.length === 0, `Orphan source-map ids: ${orphanSourceIds.join(', ')}`);
check(orphanRouteIds.length === 0, `Orphan route ids: ${orphanRouteIds.join(', ')}`);
check(orphanPageIds.length === 0, `Orphan page ids: ${orphanPageIds.join(', ')}`);
check(preservationErrors.length === 0, `Manifest fields were not preserved: ${preservationErrors.join(', ')}`);
check(routeMappingErrors.length === 0, `Route mapping mismatches: ${routeMappingErrors.join(', ')}`);
check(pageMappingErrors.length === 0, `Page mapping mismatches: ${pageMappingErrors.join(', ')}`);

for (const routeRow of routeRows) {
  if (routeRow.parentId !== null) {
    const parent = routeById.get(routeRow.parentId);
    if (!parent) {
      hierarchyErrors.push(`${routeRow.id}:missing-parent-${routeRow.parentId}`);
    } else {
      if (!parent.childIds?.includes(routeRow.id)) hierarchyErrors.push(`${routeRow.id}:parent-child-asymmetry`);
      if (!routeRow.ancestorIds?.includes(routeRow.parentId)) hierarchyErrors.push(`${routeRow.id}:missing-parent-ancestor`);
      if (parent.routePath !== '/' && !routeRow.routePath.startsWith(`${parent.routePath}/`)) {
        hierarchyErrors.push(`${routeRow.id}:parent-path`);
      }
    }
  }
  for (const childId of routeRow.childIds ?? []) {
    if (routeById.get(childId)?.parentId !== routeRow.id) hierarchyErrors.push(`${routeRow.id}:child-parent-asymmetry`);
  }
  const finalBreadcrumb = routeRow.breadcrumbs?.at(-1);
  if (
    !finalBreadcrumb ||
    finalBreadcrumb.id !== routeRow.id ||
    finalBreadcrumb.routePath !== routeRow.routePath ||
    routeRow.breadcrumbs.length !== (routeRow.ancestorIds?.length ?? 0) + 1
  ) {
    hierarchyErrors.push(`${routeRow.id}:breadcrumbs`);
  }
}
check(hierarchyErrors.length === 0, `Route hierarchy mismatches: ${hierarchyErrors.join(', ')}`);

const localizedPaths = routeRows.flatMap((row) => LOCALES.map((locale) => row.localizedRoutes?.[locale]));
const duplicateLocalizedPaths = countDuplicates(localizedPaths);
check(localizedPaths.length === EXPECTED_SOURCE_ROWS * LOCALES.length, `Localized route count is ${localizedPaths.length}; expected 1372.`);
check(new Set(localizedPaths).size === EXPECTED_SOURCE_ROWS * LOCALES.length, `Unique localized route count is ${new Set(localizedPaths).size}; expected 1372.`);
check(duplicateLocalizedPaths.size === 0, `Duplicate localized routes: ${[...duplicateLocalizedPaths].join(', ')}`);

const canonicalRows = sourceRows.filter((row) => row.canonicalResolutionRequired);
const unresolvedCanonicalRows = canonicalRows.filter(
  (row) =>
    !row.resolvedUrl ||
    !row.resolutionNote ||
    !row.finalStatus ||
    row.finalStatus === 'resolution_pending' ||
    row.finalStatus === 'unresolved',
);
const malformedResolvedUrls = canonicalRows
  .filter((row) => row.resolvedUrl)
  .filter((row) => {
    try {
      const resolved = new URL(row.resolvedUrl);
      return resolved.protocol !== 'https:' || !/(^|\.)transferoil\.com$/i.test(resolved.hostname);
    } catch {
      return true;
    }
  })
  .map((row) => row.id);
const insufficientAttemptRows = canonicalRows
  .filter((row) => row.resolutionAttempts?.[0]?.outcome !== 'resolved')
  .filter((row) => !Array.isArray(row.resolutionAttempts) || row.resolutionAttempts.length < 3)
  .map((row) => row.id);

if (unresolvedCanonicalRows.length) {
  const message = `Canonical resolution is pending/unresolved for ids: ${unresolvedCanonicalRows.map((row) => row.id).join(', ')}`;
  if (strictResolution) failures.push(message);
  else warnings.push(message);
}
check(malformedResolvedUrls.length === 0, `Resolved URLs outside the official domain or malformed: ${malformedResolvedUrls.join(', ')}`);
check(
  insufficientAttemptRows.length === 0,
  `Canonical rows with a failed first request must record at least three controlled attempts: ${insufficientAttemptRows.join(', ')}`,
);

const noteCount = manifestRows.filter((row) => row.note !== null && row.note !== '').length;
check(noteCount === manifest.summary?.rowsWithNotes, `Rows-with-notes count is ${noteCount}; manifest summary says ${manifest.summary?.rowsWithNotes}.`);

for (const [section, expectedCount] of Object.entries(manifest.summary?.sectionCounts ?? {})) {
  const actualCount = manifestRows.filter((row) => row.mainSection === section).length;
  check(actualCount === expectedCount, `Section ${section} has ${actualCount} rows; expected ${expectedCount}.`);
}
for (const [pageType, expectedCount] of Object.entries(manifest.summary?.pageTypeCounts ?? {})) {
  const actualCount = manifestRows.filter((row) => row.pageType === pageType).length;
  check(actualCount === expectedCount, `Page type ${pageType} has ${actualCount} rows; expected ${expectedCount}.`);
}

const audit = {
  generatedAt: new Date().toISOString(),
  strictResolution,
  passed: failures.length === 0,
  expectedSourceRows: EXPECTED_SOURCE_ROWS,
  mappedSourceRows: sourceRows.length,
  missingSourceRows: missingSourceIds.length,
  uniqueSourceUrls: uniqueManifestUrls.size,
  duplicateSourceUrls: duplicateManifestUrls.size,
  routeMappings: routeRows.length,
  orphanRouteMappings: orphanRouteIds.length,
  hierarchyMappingErrors: hierarchyErrors.length,
  localeRouteCounts: Object.fromEntries(
    LOCALES.map((locale) => [locale, routeRows.filter((row) => Boolean(row.localizedRoutes?.[locale])).length]),
  ),
  localizedRouteCount: localizedPaths.length,
  uniqueLocalizedRouteCount: new Set(localizedPaths).size,
  canonicalResolutionRequired: canonicalRows.length,
  canonicalResolutionResolved: canonicalRows.length - unresolvedCanonicalRows.length,
  canonicalResolutionUnresolved: unresolvedCanonicalRows.length,
  unresolvedCanonicalIds: unresolvedCanonicalRows.map((row) => row.id),
  insufficientCanonicalAttemptIds: insufficientAttemptRows,
  preservedStatusAndNotes: preservationErrors.length === 0,
  rowsWithNotes: noteCount,
  failures,
  warnings,
};

await mkdir(reportDirectory, { recursive: true });
await writeFile(filePaths.report, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));

if (failures.length) process.exitCode = 1;
