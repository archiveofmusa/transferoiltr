import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const locales = ['tr', 'en', 'ru', 'ar'];
const defaultLocale = 'tr';
const expectedManifestRows = 343;
const expectedLocalizedRoutes = expectedManifestRows * locales.length;
const expectedNamedOwners = new Map([
  [85, '/'],
  [331, '/iletisim'],
]);

const errors = [];
const warnings = [];

function readJson(relativePath, { required = true } = {}) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    if (required) errors.push(`Eksik dosya: ${relativePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    errors.push(`JSON okunamadi (${relativePath}): ${error.message}`);
    return null;
  }
}

function rowsFrom(value, preferredKeys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  for (const key of [...preferredKeys, 'rows', 'routes', 'pages', 'records', 'items']) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') return Object.values(candidate);
  }

  const values = Object.values(value);
  return values.every((item) => item && typeof item === 'object') ? values : [];
}

function normalizeRouteHint(routeHint) {
  if (typeof routeHint !== 'string') return null;
  if (!routeHint.startsWith('/{locale}')) return null;
  const withoutLocale = routeHint.slice('/{locale}'.length) || '/';
  if (withoutLocale === '/') return '/';
  return `/${withoutLocale.split('/').filter(Boolean).join('/')}`;
}

function idOf(record) {
  const value = record?.sourceId ?? record?.manifestId ?? record?.id;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

function routeOf(record) {
  const value = record?.routeHint ?? record?.routePath ?? record?.route ?? record?.localRoute ?? record?.path;
  if (typeof value !== 'string') return null;
  return value.includes('{locale}') ? normalizeRouteHint(value) : `/${value.split('/').filter(Boolean).join('/')}` || '/';
}

function sourceUrlOf(record) {
  return record?.sourceUrl ?? record?.sourceURL ?? record?.originalUrl ?? null;
}

function walkPageRoutes(directory, segments = [], result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkPageRoutes(absolute, [...segments, entry.name], result);
      continue;
    }
    if (entry.name !== 'page.tsx' && entry.name !== 'page.jsx' && entry.name !== 'page.js') continue;
    const route = segments.length ? `/${segments.join('/')}` : '/';
    result.push({ route, file: path.relative(root, absolute).replaceAll('\\', '/') });
  }
  return result;
}

function splitRoute(route) {
  return route === '/' ? [] : route.split('/').filter(Boolean);
}

function patternMatches(pattern, route) {
  const patternSegments = splitRoute(pattern);
  const routeSegments = splitRoute(route);
  let routeIndex = 0;

  for (const segment of patternSegments) {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return true;
    if (/^\[\.\.\..+\]$/.test(segment)) return routeIndex < routeSegments.length;
    if (routeIndex >= routeSegments.length) return false;
    if (/^\[.+\]$/.test(segment)) {
      routeIndex += 1;
      continue;
    }
    if (segment !== routeSegments[routeIndex]) return false;
    routeIndex += 1;
  }

  return routeIndex === routeSegments.length;
}

function flatten(value, prefix = '', result = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, result));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      flatten(item, prefix ? `${prefix}.${key}` : key, result);
    }
  } else {
    result.set(prefix, value);
  }
  return result;
}

function placeholders(value) {
  if (typeof value !== 'string') return '';
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join(',');
}

function translationOf(record, locale) {
  return record?.translations?.[locale]
    ?? record?.localizedContent?.[locale]
    ?? record?.content?.[locale]
    ?? null;
}

function hasMeaningfulLeaf(value) {
  return [...flatten(value).values()].some((item) => typeof item === 'string' && item.trim().length > 0);
}

function translationStatusOf(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.extractionStatus ?? value.translationStatus ?? value.status ?? '').trim();
}

const manifest = readJson('transferoil_link_manifest.json');
const manifestRows = rowsFrom(manifest, ['rows']);
const routeRegistry = readJson('src/data/transferoil/routes.generated.json');
const routeRows = rowsFrom(routeRegistry, ['routes']);
const pageRegistry = readJson('src/content/transferoil/pages.generated.json');
const pageRows = rowsFrom(pageRegistry, ['pages']);

if (manifestRows.length !== expectedManifestRows) {
  errors.push(`Manifest satir sayisi ${manifestRows.length}; beklenen ${expectedManifestRows}.`);
}

const sourceUrls = manifestRows.map(sourceUrlOf).filter(Boolean);
const duplicateSourceUrls = [...new Set(sourceUrls.filter((url, index) => sourceUrls.indexOf(url) !== index))];
if (sourceUrls.length !== expectedManifestRows) errors.push(`Source URL sayisi ${sourceUrls.length}; beklenen ${expectedManifestRows}.`);
if (duplicateSourceUrls.length) errors.push(`Tekrarlanan source URL: ${duplicateSourceUrls.join(', ')}`);

const normalizedManifestRows = manifestRows.map((row) => ({
  ...row,
  normalizedRoute: normalizeRouteHint(row.routeHint),
}));

for (const row of normalizedManifestRows) {
  if (!row.normalizedRoute) errors.push(`ID ${row.id}: routeHint /{locale} ile baslamiyor (${row.routeHint ?? 'yok'}).`);
}

const validManifestRoutes = normalizedManifestRows.map((row) => row.normalizedRoute).filter(Boolean);
const duplicateRoutes = [...new Set(validManifestRoutes.filter((route, index) => validManifestRoutes.indexOf(route) !== index))];
if (validManifestRoutes.length !== expectedManifestRows) errors.push(`Gecerli routeHint sayisi ${validManifestRoutes.length}; beklenen ${expectedManifestRows}.`);
if (duplicateRoutes.length) errors.push(`Tekrarlanan yerel route: ${duplicateRoutes.join(', ')}`);

const appRoutePatterns = walkPageRoutes(path.join(root, 'src', 'app', '[locale]'));
const namedPatterns = appRoutePatterns.filter(({ route }) => !route.includes('[...') && !route.includes('[[...'));
const namedOwners = normalizedManifestRows
  .filter((row) => row.normalizedRoute)
  .map((row) => ({
    id: Number(row.id),
    route: row.normalizedRoute,
    owner: namedPatterns.find((pattern) => patternMatches(pattern.route, row.normalizedRoute)),
  }))
  .filter((row) => row.owner);

for (const [id, expectedRoute] of expectedNamedOwners) {
  const owner = namedOwners.find((item) => item.id === id && item.route === expectedRoute);
  if (!owner) errors.push(`ID ${id} named-route exclusion bulunamadi: ${expectedRoute}.`);
}
for (const owner of namedOwners) {
  if (!expectedNamedOwners.has(owner.id)) {
    errors.push(`Beklenmeyen named-route cakismasi: ID ${owner.id} ${owner.route} -> ${owner.owner.file}`);
  }
}

const catchAllRows = normalizedManifestRows.filter((row) => !expectedNamedOwners.has(Number(row.id)));
if (catchAllRows.length !== 341) errors.push(`Catch-all aday sayisi ${catchAllRows.length}; beklenen 341.`);

const localizedRoutes = normalizedManifestRows.flatMap((row) => locales.map((locale) => ({
  id: Number(row.id),
  locale,
  route: row.normalizedRoute === '/' ? `/${locale}` : `/${locale}${row.normalizedRoute}`,
})));
const duplicateLocalizedRoutes = [...new Set(localizedRoutes.map((item) => item.route).filter((route, index, list) => list.indexOf(route) !== index))];
if (localizedRoutes.length !== expectedLocalizedRoutes) errors.push(`Yerellestirilmis route sayisi ${localizedRoutes.length}; beklenen ${expectedLocalizedRoutes}.`);
if (duplicateLocalizedRoutes.length) errors.push(`Tekrarlanan locale route: ${duplicateLocalizedRoutes.join(', ')}`);

const manifestById = new Map(normalizedManifestRows.map((row) => [Number(row.id), row]));
const manifestBySource = new Map(normalizedManifestRows.map((row) => [sourceUrlOf(row), row]));
const mappedRouteIds = new Set();

for (const routeRecord of routeRows) {
  const id = idOf(routeRecord) ?? Number(manifestBySource.get(sourceUrlOf(routeRecord))?.id);
  const source = manifestById.get(id);
  if (!source) {
    errors.push(`Route registry orphan kaydi: ${sourceUrlOf(routeRecord) ?? JSON.stringify(routeRecord).slice(0, 100)}`);
    continue;
  }
  const actualRoute = routeOf(routeRecord);
  if (actualRoute !== source.normalizedRoute) {
    errors.push(`ID ${id}: route registry uyusmazligi (${actualRoute ?? 'yok'} != ${source.normalizedRoute}).`);
  }
  if (mappedRouteIds.has(id)) errors.push(`ID ${id}: route registry duplicate mapping.`);
  mappedRouteIds.add(id);

  for (const locale of locales) {
    const expectedLocalizedRoute = source.normalizedRoute === '/' ? `/${locale}` : `/${locale}${source.normalizedRoute}`;
    const actualLocalizedRoute = routeRecord?.localizedRoutes?.[locale] ?? routeRecord?.locales?.[locale] ?? null;
    if (actualLocalizedRoute !== expectedLocalizedRoute) {
      errors.push(`ID ${id}: ${locale} localized route uyusmazligi (${actualLocalizedRoute ?? 'yok'} != ${expectedLocalizedRoute}).`);
    }
  }
}
if (routeRows.length !== expectedManifestRows) errors.push(`Route registry kaydi ${routeRows.length}; beklenen ${expectedManifestRows}.`);
for (const id of manifestById.keys()) if (!mappedRouteIds.has(id)) errors.push(`ID ${id}: route registry mapping eksik.`);

const mappedPageIds = new Set();
for (const pageRecord of pageRows) {
  const id = idOf(pageRecord) ?? Number(manifestBySource.get(sourceUrlOf(pageRecord))?.id);
  const source = manifestById.get(id);
  if (!source) {
    errors.push(`Content registry orphan kaydi: ${sourceUrlOf(pageRecord) ?? JSON.stringify(pageRecord).slice(0, 100)}`);
    continue;
  }
  if (mappedPageIds.has(id)) errors.push(`ID ${id}: content registry duplicate mapping.`);
  mappedPageIds.add(id);

  const pageRoute = routeOf(pageRecord);
  if (pageRoute !== source.normalizedRoute) {
    errors.push(`ID ${id}: content registry route uyusmazligi (${pageRoute ?? 'yok'} != ${source.normalizedRoute}).`);
  }
  if (!pageRecord?.lastExtractionTimestamp) errors.push(`ID ${id}: lastExtractionTimestamp eksik.`);

  const trTranslation = translationOf(pageRecord, defaultLocale);
  const trLeaves = trTranslation ? flatten(trTranslation) : new Map();

  for (const locale of locales) {
    const translation = translationOf(pageRecord, locale);
    if (!translation || !hasMeaningfulLeaf(translation)) {
      errors.push(`ID ${id}: ${locale} content translation eksik/bos.`);
      continue;
    }

    const status = translationStatusOf(translation);
    if (/pending|placeholder|missing|fallback|untranslated|skeleton|partial|draft|bekliyor|eksik|taslak/i.test(status)) {
      errors.push(`ID ${id}: ${locale} content translation tamamlanmamis durum (${status}).`);
    }

    if (typeof translation.title !== 'string' || !translation.title.trim()) {
      errors.push(`ID ${id}: ${locale} title eksik.`);
    }
    if (![translation.summary, translation.description].some((value) => typeof value === 'string' && value.trim())) {
      errors.push(`ID ${id}: ${locale} summary/description eksik.`);
    }
    if (typeof translation.metadataTitle !== 'string' || !translation.metadataTitle.trim()) {
      errors.push(`ID ${id}: ${locale} metadataTitle eksik.`);
    }
    if (typeof translation.metadataDescription !== 'string' || !translation.metadataDescription.trim()) {
      errors.push(`ID ${id}: ${locale} metadataDescription eksik.`);
    }
    if (typeof translation.altText !== 'string' || !translation.altText.trim()) {
      errors.push(`ID ${id}: ${locale} altText eksik.`);
    }

    if (locale !== defaultLocale && trTranslation) {
      const localizedLeaves = flatten(translation);
      for (const [key, trValue] of trLeaves) {
        if (!localizedLeaves.has(key)) {
          errors.push(`ID ${id}: ${locale} content anahtari eksik (${key}).`);
          continue;
        }
        const localizedValue = localizedLeaves.get(key);
        if (typeof trValue === 'string' && trValue.trim() && (typeof localizedValue !== 'string' || !localizedValue.trim())) {
          errors.push(`ID ${id}: ${locale} content degeri bos (${key}).`);
        }
        if (placeholders(trValue) !== placeholders(localizedValue)) {
          errors.push(`ID ${id}: ${locale} content placeholder uyusmazligi (${key}).`);
        }
      }
    }
  }
}
if (pageRows.length !== expectedManifestRows) errors.push(`Content registry kaydi ${pageRows.length}; beklenen ${expectedManifestRows}.`);
for (const id of manifestById.keys()) if (!mappedPageIds.has(id)) errors.push(`ID ${id}: content registry mapping eksik.`);

const messageTrees = Object.fromEntries(locales.map((locale) => [locale, readJson(`messages/${locale}.json`)]));
if (messageTrees[defaultLocale]) {
  const reference = flatten(messageTrees[defaultLocale]);
  for (const locale of locales.filter((item) => item !== defaultLocale)) {
    if (!messageTrees[locale]) continue;
    const current = flatten(messageTrees[locale]);
    for (const [key, value] of reference) {
      if (!current.has(key)) errors.push(`${locale}: eksik UI message anahtari ${key}.`);
      else if (typeof current.get(key) === 'string' && !current.get(key).trim()) errors.push(`${locale}: bos UI message ${key}.`);
      else if (placeholders(value) !== placeholders(current.get(key))) errors.push(`${locale}: placeholder uyusmazligi ${key}.`);
    }
    for (const key of current.keys()) if (!reference.has(key)) errors.push(`${locale}: fazla UI message anahtari ${key}.`);
  }
}

const routingSourcePath = path.join(root, 'src', 'i18n', 'routing.ts');
const layoutSourcePath = path.join(root, 'src', 'app', '[locale]', 'layout.tsx');
const sitemapSourcePath = path.join(root, 'src', 'app', 'sitemap.ts');
const catchAllSourcePath = path.join(root, 'src', 'app', '[locale]', '[...slug]', 'page.tsx');
const languageSelectorPath = path.join(root, 'src', 'components', 'LanguageSelector.tsx');
const proxySourcePath = path.join(root, 'src', 'proxy.ts');
const routingSource = fs.existsSync(routingSourcePath) ? fs.readFileSync(routingSourcePath, 'utf8') : '';
const layoutSource = fs.existsSync(layoutSourcePath) ? fs.readFileSync(layoutSourcePath, 'utf8') : '';
const sitemapSource = fs.existsSync(sitemapSourcePath) ? fs.readFileSync(sitemapSourcePath, 'utf8') : '';
const catchAllSource = fs.existsSync(catchAllSourcePath) ? fs.readFileSync(catchAllSourcePath, 'utf8') : '';
const languageSelectorSource = fs.existsSync(languageSelectorPath) ? fs.readFileSync(languageSelectorPath, 'utf8') : '';
const proxySource = fs.existsSync(proxySourcePath) ? fs.readFileSync(proxySourcePath, 'utf8') : '';

if (!/locales\s*=\s*\[['"]tr['"],\s*['"]en['"],\s*['"]ru['"],\s*['"]ar['"]\]/.test(routingSource)) {
  errors.push('routing.ts locale sirasi tr/en/ru/ar olarak dogrulanamadi.');
}
if (!/defaultLocale:\s*['"]tr['"]/.test(routingSource)) errors.push('Varsayilan locale tr degil.');
if (!/ar:[\s\S]*?dir:\s*['"]rtl['"]/.test(routingSource)) errors.push('Arapca locale dir=rtl degil.');
if (!/dir=\{localeDetails\[locale\]\.dir\}/.test(layoutSource)) errors.push('Locale layout dinamik dir degerini html elemanina uygulamiyor.');

if (!catchAllSource) errors.push('Manifest sayfalari icin [locale]/[...slug]/page.tsx catch-all route eksik.');
else {
  if (!/generateStaticParams/.test(catchAllSource)) errors.push('Catch-all route generateStaticParams tanimlamiyor.');
  if (!/getTransferOilCatchAllStaticParams/.test(catchAllSource)) warnings.push('Catch-all route registry exclusion yardimcisini dogrudan kullanmiyor.');
  if (!/generateMetadata/.test(catchAllSource)) errors.push('Catch-all route locale metadata uretmiyor.');
}

if (!/window\.location\.search/.test(languageSelectorSource) || !/window\.location\.hash/.test(languageSelectorSource)) {
  errors.push('Dil secici query ve hash korumasini birlikte dogrulamiyor.');
}
if (!/router\.replace\([\s\S]*?locale:\s*nextLocale/.test(languageSelectorSource)) {
  errors.push('Dil secici ayni pathname icin locale replace uygulamiyor.');
}
if (!/NEXT_LOCALE/.test(proxySource) || !/routing\.defaultLocale/.test(proxySource)) {
  errors.push('Proxy NEXT_LOCALE cookie / default locale yonlendirmesini dogrulamiyor.');
}

for (const locale of locales) {
  const flag = locale === 'en' ? 'us' : locale === 'ar' ? 'sa' : locale;
  const flagPath = path.join(root, 'public', 'assets', 'flags', `${flag}.svg`);
  if (!fs.existsSync(flagPath) || fs.statSync(flagPath).size === 0) errors.push(`${locale}: yerel bayrak SVG eksik/bos.`);
}

if (!/routes\.generated|pages\.generated|transferoil/i.test(sitemapSource)) {
  errors.push('sitemap.ts generated 343-route registry ile baglantili gorunmuyor.');
}
if (!/alternates/i.test(sitemapSource) || !/x-default/.test(sitemapSource)) {
  errors.push('sitemap.ts hreflang/x-default uretimini dogrulamiyor.');
}

const report = {
  generatedAt: new Date().toISOString(),
  expectedManifestRows,
  manifestRows: manifestRows.length,
  uniqueSourceUrls: new Set(sourceUrls).size,
  uniqueRouteHints: new Set(validManifestRoutes).size,
  supportedLocales: locales,
  expectedLocalizedRoutes,
  localizedRoutes: localizedRoutes.length,
  namedRouteOwners: namedOwners.map(({ id, route, owner }) => ({ id, route, file: owner.file })),
  catchAllCandidateRows: catchAllRows.length,
  expectedCatchAllCandidateRows: 341,
  routeRegistryRows: routeRows.length,
  contentRegistryRows: pageRows.length,
  messageLeafCounts: Object.fromEntries(locales.map((locale) => [locale, messageTrees[locale] ? flatten(messageTrees[locale]).size : 0])),
  rtl: { locale: 'ar', expected: 'rtl', configured: /ar:[\s\S]*?dir:\s*['"]rtl['"]/.test(routingSource) },
  errors,
  warnings,
};

const reportPath = path.join(root, 'docs', 'reference', 'i18n-route-audit.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`I18N route audit: ${manifestRows.length}/${expectedManifestRows} source, ${localizedRoutes.length}/${expectedLocalizedRoutes} locale route.`);
console.log(`Named owners: ${namedOwners.length}; catch-all candidates: ${catchAllRows.length}.`);
console.log(`Route registry: ${routeRows.length}; content registry: ${pageRows.length}.`);
warnings.forEach((warning) => console.warn(`UYARI: ${warning}`));
if (errors.length) {
  errors.slice(0, 50).forEach((error) => console.error(`HATA: ${error}`));
  if (errors.length > 50) console.error(`HATA: ${errors.length - 50} ek hata yalnizca JSON raporunda listelendi.`);
  console.error(`Rapor: ${path.relative(root, reportPath)}`);
  process.exit(1);
}
console.log(`Basarili. 0 hata, ${warnings.length} uyari. Rapor: ${path.relative(root, reportPath)}`);
