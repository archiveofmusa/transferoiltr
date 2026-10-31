import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const expectedSocialLinks = {
  linkedin: 'https://it.linkedin.com/company/transfer-oil-s-p-a-',
  youtube: 'https://www.youtube.com/user/TransferOil',
};
// Current owner-approved contact policy: email only; do not reintroduce phone/WhatsApp.
const expectedEmail = 'info@uhphortum.com';

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const reportPath = path.resolve(root, argument('report', 'docs/reference/link-check.json'));

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

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function normalizeRoute(routePath) {
  let pathOnly = String(routePath || '/').split(/[?#]/, 1)[0];
  pathOnly = pathOnly.replace(/^\/(?:tr|en|ru|ar)(?=\/|$)/i, '');
  const normalized = `/${pathOnly.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
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

function literalAttribute(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 's'));
  return match?.[2] ?? null;
}

function hasRelSecurity(tag) {
  const rel = literalAttribute(tag, 'rel');
  if (!rel) return false;
  const tokens = new Set(rel.toLowerCase().split(/\s+/));
  return tokens.has('noopener') && tokens.has('noreferrer');
}

function addError(report, code, message, details = {}) {
  report.errors.push({ code, message, ...details });
}

const routesRegistry = JSON.parse(await fs.readFile(path.join(root, 'src/data/transferoil/routes.generated.json'), 'utf8'));
const contentRegistry = JSON.parse(await fs.readFile(path.join(root, 'src/content/transferoil/pages.generated.json'), 'utf8'));
const routePaths = new Set((routesRegistry.routes || []).map((route) => normalizeRoute(route.routePath)));
const contentPages = Array.isArray(contentRegistry.pages) ? contentRegistry.pages : [];

const appPageFiles = (await walk(path.join(root, 'src', 'app'))).filter((filePath) => path.basename(filePath) === 'page.tsx');
const appPatterns = appPageFiles.map(appPatternFromFile).filter((pattern) => pattern !== '/[...slug]');
const staticPatterns = appPatterns.filter((pattern) => !pattern.includes('['));
const dynamicPatterns = appPatterns.filter((pattern) => pattern.includes('['));

const report = {
  generatedAt: new Date().toISOString(),
  expected: { socialLinks: expectedSocialLinks, email: expectedEmail, phoneAndWhatsApp: false },
  summary: {},
  internalLinks: [],
  externalLinks: [],
  documentLinks: [],
  errors: [],
  warnings: [],
};

const sourceFiles = (await walk(sourceRoot)).filter((filePath) => /\.(?:js|jsx|ts|tsx)$/i.test(filePath));
const allSource = new Map();
for (const sourceFile of sourceFiles) allSource.set(sourceFile, await fs.readFile(sourceFile, 'utf8'));

for (const [sourceFile, source] of allSource) {
  const file = relative(sourceFile);
  const tags = [...source.matchAll(/<(?:a|Link|Button)\b[\s\S]*?>/g)];
  for (const match of tags) {
    const tag = match[0];
    const href = literalAttribute(tag, 'href');
    const location = { file, line: lineAt(source, match.index), snippet: tag.replace(/\s+/g, ' ').slice(0, 300) };

    if (/\bdownload(?:\s|=|>)/i.test(tag)) {
      addError(report, 'FORCED_DOWNLOAD_ATTRIBUTE', 'Bağlantıda download attribute kullanılmış; dokümanlar yeni sekmede açılmalı.', location);
    }
    if (!href) {
      if (/target\s*=\s*["']_blank["']/.test(tag) && !hasRelSecurity(tag)) {
        addError(report, 'DYNAMIC_EXTERNAL_LINK_REL_MISSING', 'Yeni sekmede açılan dinamik bağlantıda noopener noreferrer eksik.', location);
      }
      continue;
    }

    if (/^https?:\/\//i.test(href)) {
      const item = { href, ...location };
      report.externalLinks.push(item);
      if (literalAttribute(tag, 'target') !== '_blank') {
        addError(report, 'EXTERNAL_LINK_TARGET', 'Harici bağlantı target="_blank" kullanmıyor.', item);
      }
      if (!hasRelSecurity(tag)) {
        addError(report, 'EXTERNAL_LINK_REL', 'Harici bağlantıda rel="noopener noreferrer" eksik.', item);
      }
      continue;
    }

    if (/^(?:mailto:|tel:|sms:|#)/i.test(href)) continue;
    if (!href.startsWith('/')) {
      report.warnings.push({ code: 'RELATIVE_LINK_NOT_CHECKED', message: 'Göreli bağlantı statik route denetimine alınmadı.', href, ...location });
      continue;
    }

    const normalized = normalizeRoute(href);
    const registryOwner = routePaths.has(normalized);
    const staticOwner = staticPatterns.includes(normalized);
    const dynamicOwner = dynamicPatterns.some((pattern) => patternMatches(pattern, normalized));
    const valid = registryOwner || staticOwner || dynamicOwner;
    const item = { href, normalized, valid, registryOwner, staticOwner, dynamicOwner, ...location };
    report.internalLinks.push(item);
    if (!valid) addError(report, 'INTERNAL_LINK_UNMAPPED', 'İç bağlantı App Router veya 343 kayıtlı route içinde çözümlenemedi.', item);
  }

  for (const match of source.matchAll(/\bhref\s*:\s*(["'])(\/[^"']*)\1/g)) {
    const href = match[2];
    const normalized = normalizeRoute(href);
    const valid = routePaths.has(normalized)
      || staticPatterns.includes(normalized)
      || dynamicPatterns.some((pattern) => patternMatches(pattern, normalized));
    const item = { href, normalized, valid, file, line: lineAt(source, match.index), sourceKind: 'object-property' };
    report.internalLinks.push(item);
    if (!valid) addError(report, 'INTERNAL_DATA_LINK_UNMAPPED', 'Veri dosyasındaki iç bağlantı çözümlenemedi.', item);
  }
}

const topBarFile = path.join(root, 'src/components/layout/TransferOilTopBar.tsx');
const topBarSource = allSource.get(topBarFile) || '';

for (const [name, href] of Object.entries(expectedSocialLinks)) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagMatch = topBarSource.match(new RegExp(`<a\\b(?=[^>]*href=["']${escaped}["'])[^>]*>`, 's'));
  if (!tagMatch) {
    addError(report, 'SOCIAL_LINK_MISSING', `Beklenen ${name} bağlantısı top barda bulunamadı.`, { name, href, file: relative(topBarFile) });
  } else {
    if (literalAttribute(tagMatch[0], 'target') !== '_blank' || !hasRelSecurity(tagMatch[0])) {
      addError(report, 'SOCIAL_LINK_SECURITY', `${name} bağlantısında target/rel güvenlik özellikleri eksik.`, { name, href, file: relative(topBarFile) });
    }
  }
}

const contactFile = path.join(root, 'src/config/contact.ts');
if (!(allSource.get(contactFile) || '').includes(`email: '${expectedEmail}'`)) {
  addError(report, 'CONTACT_EMAIL_MISMATCH', 'Güncel iletişim e-postası korunmamış.', { file: relative(contactFile) });
}
for (const [sourceFile, source] of allSource) {
  if (/https?:\/\/(?:wa\.me|api\.whatsapp\.com)|["'`]tel:/.test(source)) {
    addError(report, 'REMOVED_CONTACT_CHANNEL_REINTRODUCED', 'Kaldırılan telefon veya WhatsApp kanalı yeniden eklenmiş.', { file: relative(sourceFile) });
  }
}

const manifestPageFile = path.join(root, 'src/components/transferoil/TransferOilManifestPage.tsx');
const manifestPageSource = allSource.get(manifestPageFile) || '';
const dynamicDocumentAnchor = [...manifestPageSource.matchAll(/<a\b[\s\S]*?href=\{document\.href\}[\s\S]*?>/g)][0]?.[0] || '';
if (!dynamicDocumentAnchor
  || !/target=\{document\.external\s*\?\s*['_"]_blank/.test(dynamicDocumentAnchor)
  || !/noopener noreferrer/.test(dynamicDocumentAnchor)
  || /\bdownload\b/.test(dynamicDocumentAnchor)) {
  addError(report, 'DOCUMENT_LINK_RENDERER_UNSAFE', 'Manifest doküman bağlantı rendererı target blank, rel ve no-download kurallarını sağlamıyor.', {
    file: relative(manifestPageFile),
  });
}

for (const page of contentPages) {
  for (const [index, document] of (page.documentLinks || []).entries()) {
    const href = typeof document === 'string' ? document : document?.href || document?.url || null;
    if (!href) {
      addError(report, 'DOCUMENT_LINK_HREF_MISSING', 'Content registry doküman kaydında href yok.', { pageId: page.id, index });
      continue;
    }
    const external = /^https?:\/\//i.test(href);
    report.documentLinks.push({ pageId: page.id, index, href, external });
    if (external) {
      let parsed;
      try { parsed = new URL(href); } catch {
        addError(report, 'DOCUMENT_LINK_INVALID_URL', 'Doküman bağlantısı geçerli bir URL değil.', { pageId: page.id, index, href });
        continue;
      }
      if (!/(^|\.)transferoil\.com$/i.test(parsed.hostname)) {
        report.warnings.push({
          code: 'DOCUMENT_LINK_NON_OFFICIAL_HOST',
          message: 'Doküman bağlantısı Transfer Oil resmî alan adında değil.',
          pageId: page.id, index, href,
        });
      }
    } else if (href.startsWith('/') && !existsSync(path.join(root, 'public', href.split(/[?#]/, 1)[0]))) {
      addError(report, 'LOCAL_DOCUMENT_MISSING', 'Yerel doküman bağlantısının dosyası public altında yok.', { pageId: page.id, index, href });
    }
  }
}

const uniqueInternalLinks = [...new Map(report.internalLinks.map((item) => [`${item.file}|${item.line}|${item.href}`, item])).values()];
const uniqueExternalLinks = [...new Map(report.externalLinks.map((item) => [`${item.file}|${item.line}|${item.href}`, item])).values()];
report.internalLinks = uniqueInternalLinks;
report.externalLinks = uniqueExternalLinks;
report.summary = {
  sourceFilesScanned: sourceFiles.length,
  appPagePatterns: appPatterns.length,
  registryRouteCount: routePaths.size,
  internalLinksChecked: uniqueInternalLinks.length,
  externalLinksChecked: uniqueExternalLinks.length,
  documentLinksChecked: report.documentLinks.length,
  errorCount: report.errors.length,
  warningCount: report.warnings.length,
  passed: report.errors.length === 0,
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Link QA raporu: ${relative(reportPath)}`);
if (report.errors.length > 0) process.exitCode = 1;
