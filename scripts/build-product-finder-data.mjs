import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceMapPath = path.join(projectRoot, 'src/data/transferoil/source-map.generated.json');
const contentPath = path.join(projectRoot, 'src/content/transferoil/pages.generated.json');
const outputPath = path.join(projectRoot, 'src/data/transferoil/product-finder.generated.json');
const locales = ['tr', 'en', 'ru', 'ar'];
const catalogSections = new Set(['Fittings', 'Hydraulic', 'Industrial', 'UHP']);

const CONNECTION_PATTERNS = [
  ['GAS100', /\bgas\s*100\b/i],
  ['BSPP', /\bbspp\b/i],
  ['BSPT', /\bbspt\b/i],
  ['NPTF', /\bnptf\b/i],
  ['NPT', /\bnpt\b/i],
  ['JIC', /\bjic\b/i],
  ['DKOS', /\b(?:dkos|din\s*2353\s*heavy)\b/i],
  ['DKOL', /\b(?:dkol|din\s*2353\s*light)\b/i],
  ['ORFS', /\borfs\b/i],
  ['USIT', /\busit\b/i],
  ['TYPE-M', /\btype[\s-]*m\b/i],
  ['HP/MP', /\bhp\s*[/|-]\s*mp\b/i],
  ['DIN', /\bdin\s*\d*/i],
  ['SAE', /\bsae\s*[a-z]?\d*/i],
  ['Metric', /\bmetric\b/i],
  ['Flat Seal', /\bflat\s*seal\b/i],
  ['Standpipe', /\bstandpipe\b/i],
  ['Push-On', /\bpush[\s-]*on\b/i],
  ['GAS', /\bgas\b/i],
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function localizedTitles(page, fallback) {
  return locales.map((locale) => clean(page?.translations?.[locale]?.title) || fallback);
}

function technicalText(row, page) {
  const facts = Array.isArray(page?.technicalData?.facts) ? page.technicalData.facts : [];
  return unique([
    row.title,
    row.hierarchy,
    row.category,
    row.subCategory,
    row.seriesOrGroup,
    row.pageOrProduct,
    page?.technicalData?.sourceTitle,
    page?.technicalData?.sourceHeading,
    ...facts,
  ]).join(' | ');
}

function extractPressures(page) {
  const values = Array.isArray(page?.technicalData?.measurements) ? page.technicalData.measurements : [];
  const facts = Array.isArray(page?.technicalData?.facts) ? page.technicalData.facts : [];
  const matches = [...values, ...facts].flatMap((value) =>
    String(value).match(/\b\d+(?:[.,]\d+)?\s*(?:bar|psi)\b/gi) ?? [],
  );

  return unique(matches).filter((value) => {
    const numericValue = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(numericValue) && numericValue > 0;
  });
}

const [sourceMap, content] = await Promise.all([
  readFile(sourceMapPath, 'utf8').then(JSON.parse),
  readFile(contentPath, 'utf8').then(JSON.parse),
]);

const pageById = new Map(content.pages.map((page) => [page.id, page]));
const rowById = new Map(sourceMap.rows.map((row) => [row.id, row]));

const catalogRows = sourceMap.rows.filter((row) => catalogSections.has(clean(row.mainSection)));

const items = catalogRows.map((row) => {
  const page = pageById.get(row.id);
  const parent = row.parentId ? rowById.get(row.parentId) : undefined;
  const parentPage = parent ? pageById.get(parent.id) : undefined;
  const text = technicalText(row, page);

  return {
    i: row.id,
    t: localizedTitles(page, clean(row.title)),
    r: row.routePath,
    s: clean(row.mainSection),
    f: localizedTitles(parentPage, clean(parent?.title || row.category || row.mainSection)),
    g: unique([row.category, row.subCategory, row.seriesOrGroup, row.pageOrProduct]),
    p: extractPressures(page),
    c: CONNECTION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label),
    x: Boolean(row.isProductOrPart),
  };
});

const payload = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  sourceCount: catalogRows.length,
  items,
};

if (items.length !== catalogRows.length) {
  throw new Error(`Product Finder katalog dizini eksik; beklenen: ${catalogRows.length}, bulunan: ${items.length}`);
}

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`Product Finder dizini oluşturuldu: ${items.length} kayıt -> ${path.relative(projectRoot, outputPath)}`);
