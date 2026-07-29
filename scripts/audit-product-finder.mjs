import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const finderPath = path.join(projectRoot, 'src/data/transferoil/product-finder.generated.json');
const sourceMapPath = path.join(projectRoot, 'src/data/transferoil/source-map.generated.json');
const reportPath = path.join(projectRoot, 'docs/reference/product-finder-audit.json');
const catalogSections = new Set(['Fittings', 'Hydraulic', 'Industrial', 'UHP']);
const [finder, sourceMap] = await Promise.all([
  readFile(finderPath, 'utf8').then(JSON.parse),
  readFile(sourceMapPath, 'utf8').then(JSON.parse),
]);

const errors = [];
const ids = new Set();
const routes = new Set();
const expectedRows = sourceMap.rows.filter((row) => catalogSections.has(row.mainSection));
const expectedIds = new Set(expectedRows.map((row) => row.id));

if (finder.sourceCount !== expectedRows.length || finder.items.length !== expectedRows.length) {
  errors.push(`Katalog kayıt sayısı ${expectedRows.length} olmalı; sourceCount=${finder.sourceCount}, items=${finder.items.length}`);
}

for (const item of finder.items) {
  if (ids.has(item.i)) errors.push(`Tekrarlanan id: ${item.i}`);
  if (routes.has(item.r)) errors.push(`Tekrarlanan rota: ${item.r}`);
  ids.add(item.i);
  routes.add(item.r);

  if (!expectedIds.has(item.i)) errors.push(`Katalog dışı kayıt: ${item.i} (${item.s})`);
  if (!catalogSections.has(item.s)) errors.push(`Katalog dışı bölüm: ${item.i} (${item.s})`);
  if (!Array.isArray(item.t) || item.t.length !== 4 || item.t.some((title) => !title)) {
    errors.push(`Eksik dört dil başlığı: ${item.i}`);
  }
  if (!Array.isArray(item.f) || item.f.length !== 4 || item.f.some((title) => !title)) {
    errors.push(`Eksik dört dil aile başlığı: ${item.i}`);
  }
  if (!item.r?.startsWith('/') || !item.s) errors.push(`Geçersiz rota/bölüm: ${item.i}`);
}

for (const row of expectedRows) {
  if (!ids.has(row.id)) errors.push(`Product Finder katalog kaydı eksik: ${row.id}`);
}

const sectionCounts = Object.fromEntries(
  [...catalogSections].map((section) => [section, finder.items.filter((item) => item.s === section).length]),
);

const summary = {
  manifestRecords: sourceMap.rows.length,
  excludedNonCatalogRecords: sourceMap.rows.length - expectedRows.length,
  expectedCatalogRecords: expectedRows.length,
  records: finder.items.length,
  uniqueIds: ids.size,
  uniqueRoutes: routes.size,
  sectionCounts,
  withPressureData: finder.items.filter((item) => item.p.length > 0).length,
  withConnectionData: finder.items.filter((item) => item.c.length > 0).length,
  errors: errors.length,
  passed: errors.length === 0,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, errors }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error(errors.slice(0, 30).join('\n'));
  process.exitCode = 1;
}
