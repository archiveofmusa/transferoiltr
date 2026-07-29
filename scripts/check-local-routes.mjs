import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const expectedSourceRows = 343;
const expectedLocales = ['tr', 'en', 'ru', 'ar'];
const expectedLocalizedRoutes = expectedSourceRows * expectedLocales.length;

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const mode = argument('mode', process.env.ROUTE_CHECK_MODE || 'auto').toLowerCase();
const baseUrl = argument('base-url', process.env.BASE_URL || process.env.SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const concurrency = Math.max(1, Number(argument('concurrency', process.env.ROUTE_CHECK_CONCURRENCY || '16')) || 16);
const timeoutMs = Math.max(1000, Number(argument('timeout-ms', process.env.ROUTE_CHECK_TIMEOUT_MS || '15000')) || 15000);
const reportPath = path.resolve(root, argument('report', 'docs/reference/local-route-check.json'));

if (!['auto', 'http', 'build'].includes(mode)) {
  throw new Error(`Geçersiz --mode değeri: ${mode}. auto, http veya build kullanın.`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.join(root, filePath), 'utf8'));
}

async function walk(directory) {
  if (!existsSync(directory)) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }))).flat();
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function normalizeRoute(routePath) {
  const pathOnly = String(routePath || '/').split(/[?#]/, 1)[0];
  const normalized = `/${pathOnly.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
}

function addError(report, code, message, details = {}) {
  report.errors.push({ code, message, ...details });
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function appPatternFromFile(filePath) {
  const appRoot = path.join(root, 'src', 'app');
  const directory = path.relative(appRoot, path.dirname(filePath)).replaceAll('\\', '/');
  const segments = directory.split('/').filter(Boolean);
  if (segments[0] === '[locale]') segments.shift();
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function patternMatches(pattern, routePath) {
  const patternSegments = normalizeRoute(pattern).split('/').filter(Boolean);
  const routeSegments = normalizeRoute(routePath).split('/').filter(Boolean);
  let patternIndex = 0;
  let routeIndex = 0;
  while (patternIndex < patternSegments.length) {
    const segment = patternSegments[patternIndex];
    if (/^\[\.\.\..+\]$/.test(segment)) return routeIndex < routeSegments.length;
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return true;
    if (routeIndex >= routeSegments.length) return false;
    if (!/^\[.+\]$/.test(segment) && segment !== routeSegments[routeIndex]) return false;
    patternIndex += 1;
    routeIndex += 1;
  }
  return routeIndex === routeSegments.length;
}

function parseNamedOwners(registrySource) {
  const match = registrySource.match(/transferOilNamedRouteOwners\s*=\s*\[([^\]]*)\]/s);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => normalizeRoute(item[1]));
}

async function canReachServer() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 5000));
  try {
    const response = await fetch(`${baseUrl}/tr`, { redirect: 'manual', signal: controller.signal });
    await response.body?.cancel();
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function checkHttpRoute(route) {
  const url = `${baseUrl}${route.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': 'TransferOil-LocalRoute-QA/1.0' },
      signal: controller.signal,
    });
    const redirect = [301, 302, 303, 307, 308].includes(response.status);
    const location = response.headers.get('location');
    const accepted = (response.status >= 200 && response.status < 300) || (redirect && Boolean(location));
    await response.body?.cancel();
    return {
      ...route,
      url,
      status: response.status,
      location,
      accepted,
      error: null,
    };
  } catch (error) {
    return {
      ...route,
      url,
      status: null,
      location: null,
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

const manifest = await readJson('transferoil_link_manifest.json');
const generatedRoutes = await readJson('src/data/transferoil/routes.generated.json');
const sourceMap = await readJson('src/data/transferoil/source-map.generated.json');
const contentPages = await readJson('src/content/transferoil/pages.generated.json');
const rows = Array.isArray(manifest.rows) ? manifest.rows : [];
const routes = Array.isArray(generatedRoutes.routes) ? generatedRoutes.routes : [];
const mappedRows = Array.isArray(sourceMap.rows) ? sourceMap.rows : [];
const pages = Array.isArray(contentPages.pages) ? contentPages.pages : [];

const report = {
  generatedAt: new Date().toISOString(),
  requestedMode: mode,
  validationMode: null,
  baseUrl,
  expected: {
    sourceRows: expectedSourceRows,
    locales: expectedLocales,
    localizedRoutes: expectedLocalizedRoutes,
  },
  summary: {},
  namedRouteOwnership: {},
  build: {},
  http: {},
  errors: [],
};

if (rows.length !== expectedSourceRows) addError(report, 'SOURCE_ROW_COUNT', 'Kaynak manifest satır sayısı 343 değil.', { actual: rows.length });
if (routes.length !== expectedSourceRows) addError(report, 'ROUTE_MAPPING_COUNT', 'Üretilmiş route mapping sayısı 343 değil.', { actual: routes.length });
if (mappedRows.length !== expectedSourceRows) addError(report, 'SOURCE_MAP_COUNT', 'Üretilmiş source map satır sayısı 343 değil.', { actual: mappedRows.length });
if (pages.length !== expectedSourceRows) addError(report, 'CONTENT_PAGE_COUNT', 'Üretilmiş içerik sayfa sayısı 343 değil.', { actual: pages.length });

for (const [label, values] of [
  ['source URL', rows.map((row) => row.sourceUrl)],
  ['manifest id', rows.map((row) => row.id)],
  ['route id', routes.map((route) => route.id)],
  ['registry key', routes.map((route) => route.registryKey)],
  ['route path', routes.map((route) => normalizeRoute(route.routePath))],
]) {
  const duplicates = duplicateValues(values);
  if (duplicates.length > 0) addError(report, 'DUPLICATE_MAPPING', `Tekrarlanan ${label} değerleri bulundu.`, { label, duplicates });
}

const manifestIds = new Set(rows.map((row) => row.id));
const routeById = new Map(routes.map((route) => [route.id, route]));
const sourceMapIds = new Set(mappedRows.map((row) => row.id));
const contentIds = new Set(pages.map((page) => page.id));
const localizedTargets = [];

for (const row of rows) {
  const route = routeById.get(row.id);
  if (!route) {
    addError(report, 'ROUTE_MAPPING_MISSING', 'Manifest kaydı için route mapping yok.', { id: row.id, sourceUrl: row.sourceUrl });
    continue;
  }
  if (!sourceMapIds.has(row.id)) addError(report, 'SOURCE_MAP_ROW_MISSING', 'Manifest kaydı source mapte yok.', { id: row.id });
  if (!contentIds.has(row.id)) addError(report, 'CONTENT_PAGE_MISSING', 'Manifest kaydı content registryde yok.', { id: row.id });
  if (route.sourceUrl !== row.sourceUrl) addError(report, 'SOURCE_URL_MAPPING_MISMATCH', 'Route ile manifest kaynak URL değeri uyuşmuyor.', { id: row.id });

  for (const locale of expectedLocales) {
    const localizedPath = route.localizedRoutes?.[locale];
    const expectedPath = String(row.routeHint || '').replace('{locale}', locale);
    if (!localizedPath) {
      addError(report, 'LOCALE_ROUTE_MISSING', 'Route mappingte locale hedefi eksik.', { id: row.id, locale });
      continue;
    }
    if (expectedPath && normalizeRoute(localizedPath) !== normalizeRoute(expectedPath)) {
      addError(report, 'LOCALE_ROUTE_HINT_MISMATCH', 'Yerelleştirilmiş rota manifest routeHint ile uyuşmuyor.', {
        id: row.id, locale, expected: expectedPath, actual: localizedPath,
      });
    }
    localizedTargets.push({ id: row.id, locale, path: localizedPath, routePath: route.routePath });
  }
}

for (const route of routes) {
  if (!manifestIds.has(route.id)) addError(report, 'ORPHAN_ROUTE', 'Manifest kaydı olmayan orphan route bulundu.', { id: route.id, routePath: route.routePath });
}

const duplicateLocalized = duplicateValues(localizedTargets.map((target) => normalizeRoute(target.path)));
if (duplicateLocalized.length > 0) addError(report, 'DUPLICATE_LOCALIZED_ROUTE', 'Yerelleştirilmiş route çakışmaları bulundu.', { duplicates: duplicateLocalized });
if (localizedTargets.length !== expectedLocalizedRoutes) addError(report, 'LOCALIZED_ROUTE_COUNT', 'Yerelleştirilmiş route sayısı 1372 değil.', { actual: localizedTargets.length });

const registryPath = path.join(root, 'src', 'data', 'transferoil', 'registry.ts');
const registrySource = await fs.readFile(registryPath, 'utf8');
const namedOwners = parseNamedOwners(registrySource);
const duplicateNamedOwners = duplicateValues(namedOwners);
if (duplicateNamedOwners.length > 0) addError(report, 'DUPLICATE_NAMED_OWNER', 'Named route owner listesinde tekrar var.', { duplicates: duplicateNamedOwners });

const pageFiles = (await walk(path.join(root, 'src', 'app', '[locale]'))).filter((filePath) => path.basename(filePath) === 'page.tsx');
const appPatterns = pageFiles.map((filePath) => ({ pattern: appPatternFromFile(filePath), file: relative(filePath) }));
const specializedPatterns = appPatterns.filter(({ pattern }) => pattern !== '/[...slug]');
const intersections = [];

for (const route of routes) {
  const matching = specializedPatterns.filter(({ pattern }) => patternMatches(pattern, route.routePath));
  if (matching.length > 0) intersections.push({ id: route.id, routePath: route.routePath, owners: matching });
  const isDeclaredNamedOwner = namedOwners.includes(normalizeRoute(route.routePath));
  if (matching.length > 0 && !isDeclaredNamedOwner) {
    addError(report, 'UNDECLARED_NAMED_OWNER_COLLISION', 'Manifest route özel bir App Router sayfasıyla çakışıyor ancak named owner olarak tanımlı değil.', {
      id: route.id, routePath: route.routePath, owners: matching,
    });
  }
  if (isDeclaredNamedOwner && matching.length !== 1) {
    addError(report, 'NAMED_OWNER_INVALID', 'Named owner için tam bir özel App Router sahibi bulunmalı.', {
      id: route.id, routePath: route.routePath, owners: matching,
    });
  }
}

for (const owner of namedOwners) {
  const mapped = routes.filter((route) => normalizeRoute(route.routePath) === owner);
  if (mapped.length !== 1) addError(report, 'NAMED_OWNER_MAPPING_COUNT', 'Named owner tek bir manifest kaydına sahip değil.', { owner, count: mapped.length });
}

report.namedRouteOwnership = {
  declaredOwners: namedOwners,
  appPagePatterns: appPatterns,
  manifestIntersections: intersections,
};

let selectedMode = mode;
if (mode === 'auto') selectedMode = await canReachServer() ? 'http' : 'build';
report.validationMode = selectedMode;

if (selectedMode === 'http') {
  const results = await mapConcurrent(localizedTargets, concurrency, checkHttpRoute);
  const failures = results.filter((result) => !result.accepted);
  if (failures.length > 0) {
    addError(report, 'HTTP_ROUTE_FAILURES', 'HTTP ile doğrulanamayan yerelleştirilmiş route hedefleri var.', {
      count: failures.length,
      failures: failures.slice(0, 100),
      truncated: failures.length > 100,
    });
  }
  report.http = {
    checked: results.length,
    accepted: results.length - failures.length,
    failed: failures.length,
    statusCounts: Object.fromEntries([...new Set(results.map((result) => result.status))].map((status) => [String(status), results.filter((result) => result.status === status).length])),
  };
} else {
  const appPathsFile = path.join(root, '.next', 'server', 'app-paths-manifest.json');
  const buildIdFile = path.join(root, '.next', 'BUILD_ID');
  if (!existsSync(appPathsFile) || !existsSync(buildIdFile)) {
    addError(report, 'BUILD_OUTPUT_MISSING', 'Built-output doğrulaması için production build çıktısı bulunamadı.', {
      appPathsManifest: relative(appPathsFile), buildId: relative(buildIdFile),
    });
  } else {
    const appPaths = JSON.parse(await fs.readFile(appPathsFile, 'utf8'));
    const catchAllKey = '/[locale]/[...slug]/page';
    if (!appPaths[catchAllKey]) addError(report, 'BUILD_CATCH_ALL_MISSING', 'Production build içinde manifest catch-all route modülü yok.', { key: catchAllKey });
    const missingOwners = [];
    for (const owner of namedOwners) {
      const key = owner === '/' ? '/[locale]/page' : `/[locale]${owner}/page`;
      if (!appPaths[key]) missingOwners.push({ owner, key });
    }
    if (missingOwners.length > 0) addError(report, 'BUILD_NAMED_OWNER_MISSING', 'Production build içinde named route owner modülü eksik.', { missingOwners });

    const moduleFiles = [...new Set(Object.values(appPaths).filter((value) => typeof value === 'string'))];
    const missingModules = moduleFiles.filter((moduleFile) => !existsSync(path.join(root, '.next', 'server', moduleFile)));
    if (missingModules.length > 0) addError(report, 'BUILD_ROUTE_MODULE_MISSING', 'App paths manifestte kayıtlı route modülü dosyada yok.', { missingModules });
    report.build = {
      buildId: (await fs.readFile(buildIdFile, 'utf8')).trim(),
      appPathCount: Object.keys(appPaths).length,
      catchAllKey,
      catchAllPresent: Boolean(appPaths[catchAllKey]),
      namedOwnerCount: namedOwners.length,
      missingNamedOwners: missingOwners,
      structurallyValidatedLocalizedRoutes: localizedTargets.length,
      note: 'Her mapping named owner veya üretim catch-all route modülü üzerinden doğrulandı.',
    };
  }
}

report.summary = {
  sourceRows: rows.length,
  uniqueSourceUrls: new Set(rows.map((row) => row.sourceUrl)).size,
  routeMappings: routes.length,
  sourceMapRows: mappedRows.length,
  contentPages: pages.length,
  locales: expectedLocales.length,
  localizedRoutes: localizedTargets.length,
  uniqueLocalizedRoutes: new Set(localizedTargets.map((target) => normalizeRoute(target.path))).size,
  namedOwnerCount: namedOwners.length,
  validationMode: report.validationMode,
  errorCount: report.errors.length,
  passed: report.errors.length === 0,
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Route QA raporu: ${relative(reportPath)}`);
if (report.errors.length > 0) process.exitCode = 1;
