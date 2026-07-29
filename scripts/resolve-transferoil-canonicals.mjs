import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICIAL_HOST_PATTERN = /(^|\.)transferoil\.com$/i;
const USER_AGENT = 'TransferOilTurkiyeSourceAudit/1.0 (+local production build)';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_REDIRECTS = 8;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const manifestPath = path.join(projectRoot, 'transferoil_link_manifest.json');
const outputPath = path.join(
  projectRoot,
  'src',
  'data',
  'transferoil',
  'source-resolution.generated.json',
);
const reportPath = path.join(projectRoot, 'docs', 'reference', 'canonical-resolution-report.json');
const snapshotDirectory = path.join(projectRoot, '.cache', 'transferoil', 'source-html');

function isOfficialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && OFFICIAL_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

function isGenericLanding(value) {
  try {
    const pathname = new URL(value).pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return (
      pathname === '/' ||
      pathname === '/website' ||
      pathname === '/website/default.aspx' ||
      pathname === '/website/default2024.aspx' ||
      pathname === '/en/default.aspx'
    );
  } catch {
    return true;
  }
}

function normalizeRouteHint(routeHint) {
  const pathWithoutLocale = routeHint.replace(/^\/\{locale\}/, '');
  const normalized = `/${pathWithoutLocale.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : normalized.toLowerCase();
}

function titleFor(row) {
  return (
    row.pageOrProduct ??
    row.seriesOrGroup ??
    row.subCategory ??
    row.category ??
    row.hierarchy.split(' →').at(-1) ??
    `Transfer Oil ${row.id}`
  );
}

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&deg;/gi, '°')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedSearchText(value) {
  return stripHtml(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractCanonical(html, responseUrl) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    if (!/\brel\s*=\s*["'][^"']*canonical[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const candidate = new URL(href.replace(/&amp;/gi, '&'), responseUrl).href;
    if (isOfficialUrl(candidate) && !isGenericLanding(candidate)) return candidate;
  }
  return null;
}

function extractOfficialLinks(html, baseUrl) {
  const links = [];
  const expression = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = expression.exec(html))) {
    try {
      const href = match[1].replace(/&amp;/gi, '&').trim();
      const url = new URL(href, baseUrl);
      if (!isOfficialUrl(url.href)) continue;
      if (!url.pathname.toLowerCase().startsWith('/en/')) continue;
      if (!url.pathname.toLowerCase().endsWith('.aspx')) continue;
      if (/\/search\.aspx$/i.test(url.pathname)) continue;
      links.push({ url: url.href, text: stripHtml(match[2]) });
    } catch {
      // Ignore malformed hrefs from the upstream page.
    }
  }
  return [...new Map(links.map((link) => [link.url, link])).values()];
}

function normalizedVariant(sourceUrl) {
  const url = new URL(sourceUrl);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }
  pathname = pathname
    .replace(/-{3,}/g, '--')
    .replace(/-\|-+/g, '-')
    .replace(/-%7c-+/gi, '-')
    .replace(/\|/g, '')
    .replace(/\s+/g, '-');
  url.pathname = pathname;
  return url.href;
}

function scoreCandidate(link, row, parentUrl) {
  const candidateUrl = new URL(link.url);
  const lastSegment = decodeURIComponent(candidateUrl.pathname.split('/').at(-1) ?? '').toLowerCase();
  const title = normalizedSearchText(titleFor(row));
  const words = title.split(' ').filter((word) => word.length > 1);
  const code = words[0] ?? '';
  const anchorText = normalizedSearchText(link.text);
  const parentPath = new URL(parentUrl).pathname.replace(/\.aspx$/i, '/').toLowerCase();
  let score = 0;

  if (code && new RegExp(`^${code}(?:-|\\.)`, 'i').test(lastSegment)) score += 120;
  else if (code && lastSegment.includes(code)) score += 50;
  if (candidateUrl.pathname.toLowerCase().startsWith(parentPath)) score += 60;
  if (code && anchorText.split(' ').includes(code)) score += 35;
  for (const word of words.slice(1)) {
    if (lastSegment.includes(word)) score += 6;
    if (anchorText.includes(word)) score += 3;
  }
  if (link.url === row.sourceUrl) score -= 250;
  if (isGenericLanding(link.url)) score -= 500;
  return score;
}

function resolutionUrl(result) {
  const canonical = extractCanonical(result.html, result.finalUrl);
  return canonical ?? result.finalUrl;
}

function usableTarget(result) {
  return (
    result.status >= 200 &&
    result.status < 300 &&
    result.html.length > 500 &&
    isOfficialUrl(result.finalUrl) &&
    !isGenericLanding(result.finalUrl)
  );
}

const responseCache = new Map();

async function fetchWithRedirectTrace(requestedUrl, { bypassCache = false } = {}) {
  const cached = bypassCache ? null : responseCache.get(requestedUrl);
  if (cached) return { ...cached, cached: true };

  const redirects = [];
  let currentUrl = requestedUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isOfficialUrl(currentUrl)) {
      const rejected = {
        requestedUrl,
        finalUrl: currentUrl,
        status: 0,
        html: '',
        redirects,
        error: 'Redirect left the official transferoil.com allowlist.',
        cached: false,
      };
      responseCache.set(requestedUrl, rejected);
      return rejected;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': USER_AGENT,
        },
      });
    } catch (error) {
      clearTimeout(timeout);
      const failed = {
        requestedUrl,
        finalUrl: currentUrl,
        status: 0,
        html: '',
        redirects,
        error: error.name === 'AbortError' ? 'Request timed out.' : error.message,
        cached: false,
      };
      responseCache.set(requestedUrl, failed);
      return failed;
    }
    clearTimeout(timeout);

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      const nextUrl = new URL(location, currentUrl).href;
      redirects.push({ status: response.status, from: currentUrl, to: nextUrl });
      currentUrl = nextUrl;
      continue;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const html = /html|xhtml/i.test(contentType) ? await response.text() : '';
    const complete = {
      requestedUrl,
      finalUrl: currentUrl,
      status: response.status,
      html,
      redirects,
      error: null,
      cached: false,
    };
    responseCache.set(requestedUrl, complete);
    return complete;
  }

  const exceeded = {
    requestedUrl,
    finalUrl: currentUrl,
    status: 0,
    html: '',
    redirects,
    error: `Redirect limit (${MAX_REDIRECTS}) exceeded.`,
    cached: false,
  };
  responseCache.set(requestedUrl, exceeded);
  return exceeded;
}

function attemptRecord(sequence, strategy, result, outcome, details = null) {
  return {
    sequence,
    strategy,
    requestedUrl: result.requestedUrl,
    status: result.status,
    finalUrl: result.finalUrl,
    redirects: result.redirects,
    cachedResponse: result.cached,
    outcome,
    details: details ?? result.error,
  };
}

async function saveSnapshot(id, html) {
  if (!html) return null;
  await mkdir(snapshotDirectory, { recursive: true });
  const filename = `${String(id).padStart(3, '0')}.html`;
  await writeFile(path.join(snapshotDirectory, filename), html);
  return `.cache/transferoil/source-html/${filename}`;
}

function makeResolution(row, result, status, note, attempts) {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    resolvedUrl: resolutionUrl(result),
    finalStatus: status,
    resolutionNote: note,
    resolutionAttempts: attempts,
    snapshotPath: null,
  };
}

async function resolveRow(row, rowById) {
  const attempts = [];
  let sequence = 1;

  const direct = await fetchWithRedirectTrace(row.sourceUrl);
  if (usableTarget(direct)) {
    attempts.push(attemptRecord(sequence, 'source-url', direct, 'resolved'));
    const resolution = makeResolution(
      row,
      direct,
      'resolved_source',
      'The manifest source URL returned a valid official product page.',
      attempts,
    );
    resolution.snapshotPath = await saveSnapshot(row.id, direct.html);
    return resolution;
  }
  attempts.push(
    attemptRecord(
      sequence++,
      'source-url',
      direct,
      'rejected',
      isGenericLanding(direct.finalUrl)
        ? 'The source URL redirected to a generic Transfer Oil landing page.'
        : direct.error ?? `The source URL returned HTTP ${direct.status}.`,
    ),
  );

  const variantUrl = normalizedVariant(row.sourceUrl);
  const normalized = await fetchWithRedirectTrace(variantUrl);
  if (usableTarget(normalized)) {
    attempts.push(attemptRecord(sequence++, 'normalized-url', normalized, 'candidate-resolved'));
    const normalizedTarget = resolutionUrl(normalized);
    const verification = await fetchWithRedirectTrace(normalizedTarget, { bypassCache: true });
    if (usableTarget(verification)) {
      attempts.push(
        attemptRecord(
          sequence,
          'normalized-url-verification',
          verification,
          'resolved',
          'The normalized official target was verified with a separate request.',
        ),
      );
      const resolution = makeResolution(
        row,
        verification,
        'resolved_normalized_url',
        'A controlled encoding and legacy-hyphen normalization resolved and verified the official page.',
        attempts,
      );
      resolution.snapshotPath = await saveSnapshot(row.id, verification.html);
      return resolution;
    }
    attempts.push(
      attemptRecord(
        sequence++,
        'normalized-url-verification',
        verification,
        'rejected',
        verification.error ?? `Verification returned HTTP ${verification.status}.`,
      ),
    );
  } else {
    attempts.push(
      attemptRecord(
        sequence++,
        'normalized-url',
        normalized,
        'rejected',
        isGenericLanding(normalized.finalUrl)
          ? 'The normalized variant redirected to a generic Transfer Oil landing page.'
          : normalized.error ?? `The normalized variant returned HTTP ${normalized.status}.`,
      ),
    );
  }

  let parentId = row.parentId;
  const visitedParentIds = new Set();
  while (parentId !== null && !visitedParentIds.has(parentId)) {
    visitedParentIds.add(parentId);
    const parent = rowById.get(parentId);
    if (!parent) break;
    const parentResult = await fetchWithRedirectTrace(parent.sourceUrl);
    const parentStrategy = `parent-page:${parent.id}`;

    if (!usableTarget(parentResult)) {
      attempts.push(
        attemptRecord(
          sequence++,
          parentStrategy,
          parentResult,
          'rejected',
          parentResult.error ?? `Parent page returned HTTP ${parentResult.status}.`,
        ),
      );
      parentId = parent.parentId;
      continue;
    }

    const candidates = extractOfficialLinks(parentResult.html, parentResult.finalUrl)
      .map((link) => ({ ...link, score: scoreCandidate(link, row, parentResult.finalUrl) }))
      .filter((candidate) => candidate.score >= 100)
      .sort((left, right) => right.score - left.score || left.url.localeCompare(right.url));

    attempts.push(
      attemptRecord(
        sequence++,
        parentStrategy,
        parentResult,
        candidates.length ? 'candidates-found' : 'no-candidate',
        candidates.length
          ? `${candidates.length} allowlisted candidate link(s) matched the product code/hierarchy.`
          : 'No allowlisted link matched the product code/hierarchy on this parent page.',
      ),
    );

    for (const candidate of candidates.slice(0, 5)) {
      const candidateResult = await fetchWithRedirectTrace(candidate.url);
      if (usableTarget(candidateResult)) {
        attempts.push(
          attemptRecord(
            sequence,
            `parent-candidate:${parent.id}`,
            candidateResult,
            'resolved',
            `Candidate score ${candidate.score}.`,
          ),
        );
        const resolution = makeResolution(
          row,
          candidateResult,
          'resolved_parent_discovery',
          `Resolved from manifest parent id ${parent.id} using the official product-code link.`,
          attempts,
        );
        resolution.snapshotPath = await saveSnapshot(row.id, candidateResult.html);
        return resolution;
      }
      attempts.push(
        attemptRecord(
          sequence++,
          `parent-candidate:${parent.id}`,
          candidateResult,
          'rejected',
          candidateResult.error ?? `Candidate returned HTTP ${candidateResult.status}.`,
        ),
      );
    }

    parentId = parent.parentId;
  }

  while (attempts.length < 3) {
    attempts.push({
      sequence: sequence++,
      strategy: 'controlled-fallback',
      requestedUrl: row.sourceUrl,
      status: 0,
      finalUrl: null,
      redirects: [],
      cachedResponse: false,
      outcome: 'not-applicable',
      details: 'No additional manifest parent URL was available for controlled discovery.',
    });
  }

  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    resolvedUrl: null,
    finalStatus: 'unresolved',
    resolutionNote: 'Three controlled strategies did not locate a valid official target; see resolutionAttempts.',
    resolutionAttempts: attempts,
    snapshotPath: null,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.rows) || manifest.rows.length !== 343) {
  throw new Error('The root transferoil_link_manifest.json must contain exactly 343 rows.');
}

const routeRows = manifest.rows.map((row) => ({
  ...row,
  title: titleFor(row),
  routePath: normalizeRouteHint(row.routeHint),
}));
const rowByPath = new Map(routeRows.map((row) => [row.routePath, row]));
const rowById = new Map(routeRows.map((row) => [row.id, row]));

for (const row of routeRows) {
  if (row.routePath === '/') {
    row.parentId = null;
    continue;
  }
  const segments = row.routePath.slice(1).split('/');
  row.parentId = null;
  while (segments.length) {
    segments.pop();
    const parentPath = segments.length ? `/${segments.join('/')}` : '/';
    const parent = rowByPath.get(parentPath);
    if (parent) {
      row.parentId = parent.id;
      break;
    }
  }
}

const canonicalRows = routeRows.filter((row) => row.canonicalResolutionRequired);
const records = [];
for (const row of canonicalRows) {
  const record = await resolveRow(row, rowById);
  records.push(record);
  console.log(
    `[${records.length}/${canonicalRows.length}] id=${row.id} ${record.finalStatus} -> ${record.resolvedUrl ?? 'UNRESOLVED'}`,
  );
}

const resolvedRecords = records.filter((record) => record.resolvedUrl && record.finalStatus !== 'unresolved');
const unresolvedRecords = records.filter((record) => !record.resolvedUrl || record.finalStatus === 'unresolved');
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceManifest: 'transferoil_link_manifest.json',
  summary: {
    canonicalResolutionRequired: canonicalRows.length,
    resolved: resolvedRecords.length,
    unresolved: unresolvedRecords.length,
    unresolvedIds: unresolvedRecords.map((record) => record.id),
    snapshotCount: records.filter((record) => record.snapshotPath).length,
  },
  records,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`),
  writeFile(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: output.generatedAt,
        ...output.summary,
        unresolved: unresolvedRecords.map((record) => ({
          id: record.id,
          sourceUrl: record.sourceUrl,
          reason: record.resolutionNote,
          attempts: record.resolutionAttempts.length,
        })),
      },
      null,
      2,
    )}\n`,
  ),
]);

console.log(JSON.stringify(output.summary, null, 2));
if (unresolvedRecords.length) process.exitCode = 1;
