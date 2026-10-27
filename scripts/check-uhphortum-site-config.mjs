import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/config/site.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveSiteUrl, productionSiteUrl } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const target = 'https://uhphortum.com';
assert.equal(productionSiteUrl, target);
const cases = [
  [{}, target],
  [{ NODE_ENV: 'production', URL: 'https://transferoil-turkiye.netlify.app' }, target],
  [{ CONTEXT: 'production', DEPLOY_PRIME_URL: 'https://transferoil-turkiye.netlify.app' }, target],
  [{ NEXT_PUBLIC_SITE_URL: 'https://uhphortum.com/' }, target],
  [{ NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100/tr' }, 'http://127.0.0.1:3100'],
  [{ CONTEXT: 'deploy-preview', DEPLOY_PRIME_URL: 'https://deploy-preview-7--example.netlify.app' }, 'https://deploy-preview-7--example.netlify.app'],
  [{ CONTEXT: 'branch-deploy', DEPLOY_URL: 'https://example-branch.netlify.app/' }, 'https://example-branch.netlify.app'],
  [{ CONTEXT: 'deploy-preview', NEXT_PUBLIC_SITE_URL: target, DEPLOY_PRIME_URL: 'https://deploy-preview-7--example.netlify.app' }, target],
  [{ CONTEXT: 'deploy-preview' }, target],
];
for (const [environment, expected] of cases) assert.equal(resolveSiteUrl(environment), expected);
assert.throws(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' }));
assert.throws(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'invalid-url' }));
await mkdir('docs/reference/uhphortum', { recursive: true });
await writeFile('docs/reference/uhphortum/site-config-check.json', `${JSON.stringify({ passed: true, originCases: cases.length, invalidCases: 2, productionSiteUrl, dnsOrHostingChanged: false }, null, 2)}\n`);
console.log('Site origin: 9 configuration cases + 2 invalid-origin cases passed; no DNS/hosting writes.');
