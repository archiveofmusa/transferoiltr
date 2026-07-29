import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['tr', 'en', 'ru', 'ar'];
const expectedRouteCount = 343;
const reportPath = path.join(projectRoot, 'docs/reference/navigation-i18n-audit.json');

const [routeRegistry, pageRegistry, sourceMap, navigationSource] = await Promise.all([
  readFile(path.join(projectRoot, 'src/data/transferoil/routes.generated.json'), 'utf8').then(JSON.parse),
  readFile(path.join(projectRoot, 'src/content/transferoil/pages.generated.json'), 'utf8').then(JSON.parse),
  readFile(path.join(projectRoot, 'src/data/transferoil/source-map.generated.json'), 'utf8').then(JSON.parse),
  readFile(path.join(projectRoot, 'src/data/navigation.ts'), 'utf8'),
]);

const errors = [];
const routes = routeRegistry.routes ?? [];
const pages = pageRegistry.pages ?? [];
const sourceRows = sourceMap.rows ?? [];
const pageById = new Map(pages.map((page) => [Number(page.id), page]));
const sourceById = new Map(sourceRows.map((row) => [Number(row.id), row]));
let localizedTitleChecks = 0;
let technicalNameChecks = 0;

if (routes.length !== expectedRouteCount) errors.push(`Route registry ${routes.length}; beklenen ${expectedRouteCount}.`);
if (pages.length !== expectedRouteCount) errors.push(`Page registry ${pages.length}; beklenen ${expectedRouteCount}.`);
if (sourceRows.length !== expectedRouteCount) errors.push(`Source map ${sourceRows.length}; beklenen ${expectedRouteCount}.`);

if (!/pages\.generated\.json/.test(navigationSource) || !/pageById\.get\(route\.id\)/.test(navigationSource)) {
  errors.push('navigation.ts etiketleri pages.generated.json page.id kaydından üretmiyor.');
}
if (/const\s+localizedLabels\s*:/.test(navigationSource)) {
  errors.push('navigation.ts eski sınırlı localizedLabels sözlüğünü hâlâ kullanıyor.');
}

for (const route of routes) {
  const id = Number(route.id);
  const page = pageById.get(id);
  const source = sourceById.get(id);

  if (!page) {
    errors.push(`ID ${id}: çevrilmiş page kaydı eksik.`);
    continue;
  }
  if (!source) {
    errors.push(`ID ${id}: source-map kaydı eksik.`);
    continue;
  }
  if (page.route !== route.routePath || source.routePath !== route.routePath) {
    errors.push(`ID ${id}: route eşleşmesi bozuk (${route.routePath}, ${page.route}, ${source.routePath}).`);
  }

  for (const locale of locales) {
    const title = String(page.translations?.[locale]?.title ?? '').trim();
    localizedTitleChecks += 1;
    if (!title) errors.push(`ID ${id}: ${locale} navigation başlığı eksik.`);

    if (source.isProductOrPart) {
      technicalNameChecks += 1;
      const sourceTitle = String(source.title ?? '').trim();
      if (title !== sourceTitle) {
        errors.push(`ID ${id}: ${locale} teknik ürün adı/kodu değişmiş (${sourceTitle} -> ${title}).`);
      }
    }
  }
}

for (const page of pages) {
  if (!routes.some((route) => Number(route.id) === Number(page.id))) {
    errors.push(`ID ${page.id}: route registry dışında page kaydı.`);
  }
}

const summary = {
  expectedRoutes: expectedRouteCount,
  routes: routes.length,
  pages: pages.length,
  sourceRows: sourceRows.length,
  locales,
  localizedTitleChecks,
  productOrPartRows: sourceRows.filter((row) => row.isProductOrPart).length,
  technicalNameChecks,
  navigationUsesGeneratedTranslations: /pages\.generated\.json/.test(navigationSource)
    && /pageById\.get\(route\.id\)/.test(navigationSource),
  errors: errors.length,
  passed: errors.length === 0,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, errors }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error(errors.slice(0, 40).join('\n'));
  process.exitCode = 1;
}
