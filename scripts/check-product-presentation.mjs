import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const output = path.join(root, 'docs/reference/industries-panel/product-order-check.json');
const helperSource = await readFile(path.join(root, 'src/lib/productPresentation.ts'), 'utf8');
const compiled = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleState = { exports: {} };
runInNewContext(compiled, { module: moduleState, exports: moduleState.exports }, { timeout: 1000 });
const { portfolioOrder, productKindOrder, registryPresentation, sortPortfolio, sortRegistryPresentation, sortUhpFamilies, sortUhpProducts, unmappedRegistryIds, portfolioForSection } = moduleState.exports;
const sources = JSON.parse(await readFile(path.join(root, 'src/data/transferoil/source-map.generated.json'), 'utf8')).rows;
const routes = JSON.parse(await readFile(path.join(root, 'src/data/transferoil/routes.generated.json'), 'utf8')).routes;
const finder = JSON.parse(await readFile(path.join(root, 'src/data/transferoil/product-finder.generated.json'), 'utf8')).items;
const beforeSources = JSON.stringify(sources);
const beforeRoutes = JSON.stringify(routes);
const beforeFinder = JSON.stringify(finder);
const report = { checkedAt: new Date().toISOString(), checks: [], unmappedIds: [], knownOtherIds: [], errors: [] };
const equal = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));
const check = (name, fn) => {
  try { report.checks.push({ name, passed: true, ...fn() }); }
  catch (error) { report.errors.push({ name, error: error.message }); }
};

check('All 343 source IDs have explicit presentation mappings', () => {
  assert.equal(sources.length, 343);
  report.unmappedIds = Array.from(unmappedRegistryIds(sources.map(({ id }) => id)));
  equal(report.unmappedIds, []);
  report.knownOtherIds = sources.filter(({ id }) => registryPresentation(id).kind === 'other').map(({ id }) => id);
  return { sourceCount: sources.length, nonCatalogueOtherCount: report.knownOtherIds.length };
});

check('Mapped kinds match fixed source parent IDs, never translated names', () => {
  for (const source of sources) {
    const family = portfolioForSection(source.mainSection);
    const meta = registryPresentation(source.id);
    assert.equal(meta.portfolio, family);
    const ids = [...source.ancestorIds, source.id];
    if (family === 'hydraulic') assert.equal(meta.kind, ids.includes(143) ? 'ferrule' : ids.includes(153) ? 'fitting' : 'hose');
    if (family === 'industrial') assert.equal(meta.kind, ids.includes(191) ? 'ferrule' : ids.includes(198) ? 'fitting' : 'hose');
    if (family === 'uhp') assert.equal(meta.kind, ids.includes(234) ? 'accessory' : ids.includes(247) ? 'adapter' : ids.includes(264) ? 'ferrule' : ids.includes(275) ? 'fitting' : 'hose');
    if (family === 'fittings') assert.equal(meta.kind, ids.includes(2) ? 'accessory' : ids.some((id) => [8, 34, 83].includes(id)) ? 'ferrule' : 'fitting');
  }
});

check('Portfolio order is UHP, hydraulic, industrial, fittings; unknown families remain last', () => {
  equal(sortPortfolio(['fittings', 'industrial', 'other-new', 'hydraulic', 'uhp'], (key) => key), ['uhp', 'hydraulic', 'industrial', 'fittings', 'other-new']);
});

check('Every hose precedes fittings in mixed finder results, before the 48-item limit', () => {
  const sorted = sortRegistryPresentation(finder, (item) => item.i);
  const firstNonHose = sorted.findIndex((item) => registryPresentation(item.i).kind !== 'hose');
  assert(firstNonHose > 48);
  assert(sorted.slice(0, 48).every((item) => registryPresentation(item.i).kind === 'hose'));
  assert(sorted.slice(firstNonHose).every((item) => registryPresentation(item.i).kind !== 'hose'));
  const hosePortfolios = [...new Set(sorted.slice(0, firstNonHose).map((item) => registryPresentation(item.i).portfolio))];
  equal(hosePortfolios, ['uhp', 'hydraulic', 'industrial']);
  equal(sorted.map((item) => item.i).slice().sort((a, b) => a - b), finder.map((item) => item.i).slice().sort((a, b) => a - b));
  return { resultCount: sorted.length, hoseBranchAndProductCount: firstNonHose, firstPageSize: 48 };
});

check('UHP/Hydraulic VHP/Industrial H2 children are sorted without flattening hierarchy', () => {
  for (const [id, expected] of [[233, [308, 275, 247, 264, 234]], [142, [146, 153, 143]], [190, [194, 198, 191]]]) {
    const source = sources.find((item) => item.id === id);
    equal(sortRegistryPresentation(source.childIds, (childId) => childId), expected);
  }
  for (const route of routes) {
    const sorted = sortRegistryPresentation(route.childIds, (id) => id);
    equal([...sorted].sort((a, b) => a - b), [...route.childIds].sort((a, b) => a - b));
    assert.equal(sorted.length, new Set(sorted).size);
  }
});

check('Default ordering preserves source technical/series order within each kind and portfolio', () => {
  const sorted = sortRegistryPresentation(finder, (item) => item.i);
  for (const portfolio of portfolioOrder) {
    for (const kind of productKindOrder) {
      const inGroup = (item) => {
        const meta = registryPresentation(item.i);
        return meta.portfolio === portfolio && meta.kind === kind;
      };
      equal(sorted.filter(inGroup).map((item) => item.i), finder.filter(inGroup).map((item) => item.i));
    }
  }
});

check('Filters cannot introduce hoses into adapter or fitting-only results', () => {
  for (const kind of ['adapter', 'fitting']) {
    const matching = finder.filter((item) => registryPresentation(item.i).kind === kind);
    const sorted = sortRegistryPresentation(matching, (item) => item.i);
    assert(sorted.length > 0);
    assert(sorted.every((item) => registryPresentation(item.i).kind === kind));
    equal(sorted.map(({ i }) => i).slice().sort((a, b) => a - b), matching.map(({ i }) => i).slice().sort((a, b) => a - b));
  }
});

check('User name/pressure sort applies only within kind/portfolio in all four languages', () => {
  for (const [localeIndex, locale] of ['tr', 'en', 'ru', 'ar'].entries()) {
    const sorted = sortRegistryPresentation(finder, (item) => item.i, (a, b) => a.t[localeIndex].localeCompare(b.t[localeIndex], locale));
    for (let i = 1; i < sorted.length; i++) {
      const a = registryPresentation(sorted[i - 1].i);
      const b = registryPresentation(sorted[i].i);
      assert(productKindOrder.indexOf(a.kind) <= productKindOrder.indexOf(b.kind));
      if (a.kind === b.kind) assert(portfolioOrder.indexOf(a.portfolio) <= portfolioOrder.indexOf(b.portfolio));
      if (a.kind === b.kind && a.portfolio === b.portfolio) assert(sorted[i - 1].t[localeIndex].localeCompare(sorted[i].t[localeIndex], locale) <= 0);
    }
  }
  const products = [{ family: 'inserts', name: 'A', pressureBar: 9000 }, { family: 'helix', name: 'Z', pressureBar: 1500 }, { family: 'helix', name: 'Y', pressureBar: 2200 }, { family: 'adapters', name: 'B', pressureBar: 9900 }];
  equal(sortUhpProducts(products, (a, b) => b.pressureBar - a.pressureBar).map((p) => p.family), ['helix', 'helix', 'inserts', 'adapters']);
  equal(sortUhpProducts(products, (a, b) => a.name.localeCompare(b.name)).map((p) => p.name), ['Y', 'Z', 'A', 'B']);
  equal(sortUhpProducts(products.filter((p) => p.family === 'adapters')).map((p) => p.family), ['adapters']);
});

check('UHP family controls follow the same shared kind order', () => {
  equal(sortUhpFamilies(['certificates', 'adapters', 'inserts', 'helix', 'accessories', 'ferrules']), ['helix', 'inserts', 'adapters', 'ferrules', 'accessories', 'certificates']);
});

check('Unknown IDs/families remain present, stable and explicitly reportable', () => {
  equal(sortRegistryPresentation([9999, 275, 9998, 308], (id) => id), [308, 275, 9999, 9998]);
  equal(unmappedRegistryIds([308, 9999, 9998, 9999]), [9999, 9998]);
  equal(sortUhpFamilies(['new-family', 'helix', 'another-new-family']), ['helix', 'new-family', 'another-new-family']);
});

check('Source arrays, IDs, URLs and hierarchy are not mutated', () => {
  assert.equal(JSON.stringify(sources), beforeSources);
  assert.equal(JSON.stringify(routes), beforeRoutes);
  assert.equal(JSON.stringify(finder), beforeFinder);
});

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.checks.length, failed: report.errors.length, unmappedIds: report.unmappedIds, knownOtherIds: report.knownOtherIds, output, errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
