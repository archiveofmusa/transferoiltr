import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const locales = ['tr', 'en', 'ru', 'ar'];
const specialManifestIds = [232, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343];
const namedRoutes = ['kurumsal', 'haberler', 'fuarlar', 'sertifikalar', 'kataloglar-sertifikalar', 'iletisim'];
const errors = [];

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function fail(code, message, details = {}) {
  errors.push({ code, message, ...details });
}

function assertOfficialUrl(value, code) {
  try {
    const url = new URL(value);
    if (!['transferoil.com', 'www.transferoil.com'].includes(url.hostname)) fail(code, 'Bağlantı resmî Transfer Oil alan adında değil.', { value });
  } catch {
    fail(code, 'Geçersiz URL.', { value });
  }
}

const [manifest, routesDocument, special] = await Promise.all([
  json('transferoil_link_manifest.json'),
  json('src/data/transferoil/routes.generated.json'),
  json('src/data/transferoil/special-content.generated.json'),
]);
const manifestRows = manifest.rows || manifest.records || manifest.links || manifest;
const routes = routesDocument.routes || routesDocument;

for (const id of specialManifestIds) {
  const source = manifestRows.find((row) => row.id === id);
  const route = routes.find((row) => row.id === id);
  if (!source) fail('MANIFEST_ID_MISSING', 'Özel sayfa manifest kaydı bulunamadı.', { id });
  if (!route) {
    fail('ROUTE_ID_MISSING', 'Özel sayfa rota kaydı bulunamadı.', { id });
    continue;
  }
  for (const locale of locales) {
    const expected = `/${locale}${route.routePath === '/' ? '' : route.routePath}`;
    if (route.localizedRoutes?.[locale] !== expected) fail('LOCALE_ROUTE_MISMATCH', 'Özel sayfa locale rotası uyuşmuyor.', { id, locale, expected, actual: route.localizedRoutes?.[locale] });
  }
}

for (const route of namedRoutes) {
  const relativePath = `src/app/[locale]/${route}/page.tsx`;
  if (!existsSync(path.join(root, relativePath))) fail('NAMED_ROUTE_MISSING', 'Named özel sayfa bulunamadı.', { relativePath });
}

if (special.rules?.detailDepth !== 1) fail('DETAIL_DEPTH', 'Özel içerik detay derinliği bir seviye değil.', { actual: special.rules?.detailDepth });
if (special.rules?.longFormBodyCopied !== false) fail('LONG_COPY_RULE', 'Uzun kaynak metni kopyalamama kuralı işaretlenmemiş.');
if (special.news?.length !== 5) fail('NEWS_COUNT', 'Görünür güncel haber kartı sayısı beklenen 5 değil.', { actual: special.news?.length });
if (special.exhibitions?.length !== 1) fail('EXHIBITION_COUNT', 'Görünür güncel fuar kartı sayısı beklenen 1 değil.', { actual: special.exhibitions?.length });
if (special.certificates?.length !== 11) fail('CERTIFICATE_COUNT', 'Resmî sertifika dokümanı sayısı beklenen 11 değil.', { actual: special.certificates?.length });

for (const [kind, entries] of [['news', special.news || []], ['exhibitions', special.exhibitions || []]]) {
  for (const entry of entries) {
    assertOfficialUrl(entry.detailUrl, `${kind.toUpperCase()}_DETAIL_URL`);
    if (entry.imageUrl) assertOfficialUrl(entry.imageUrl, `${kind.toUpperCase()}_IMAGE_URL`);
    if (entry.localImage && !existsSync(path.join(root, 'public', entry.localImage.replace(/^\/+/, '')))) {
      fail('LOCAL_IMAGE_MISSING', 'Özel içerik yerel görseli bulunamadı.', { id: entry.id, localImage: entry.localImage });
    }
  }
}

for (const certificate of special.certificates || []) assertOfficialUrl(certificate.documentUrl, 'CERTIFICATE_DOCUMENT_URL');
for (const source of Object.values(special.sources || {})) assertOfficialUrl(source, 'SPECIAL_SOURCE_URL');

for (const [label, values] of [
  ['haber detay URL', (special.news || []).map((item) => item.detailUrl)],
  ['fuar detay URL', (special.exhibitions || []).map((item) => item.detailUrl)],
  ['sertifika doküman URL', (special.certificates || []).map((item) => item.documentUrl)],
]) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) fail('SPECIAL_DUPLICATE_URL', `Tekrarlanan ${label} bulundu.`, { duplicates: [...new Set(duplicates)] });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'fail' : 'pass',
  summary: {
    manifestRoutes: specialManifestIds.length,
    localizedManifestRoutes: specialManifestIds.length * locales.length,
    namedRoutes: namedRoutes.length,
    news: special.news?.length || 0,
    exhibitions: special.exhibitions?.length || 0,
    certificates: special.certificates?.length || 0,
    localListImages: [...(special.news || []), ...(special.exhibitions || [])].filter((item) => item.localImage).length,
  },
  errors,
};

const reportPath = path.join(root, 'docs', 'reference', 'special-pages-audit.json');
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
