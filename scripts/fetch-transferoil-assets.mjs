import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'transferoil_link_manifest.json');
const resolutionPath = path.join(root, 'src', 'data', 'transferoil', 'source-resolution.generated.json');
const publicRoot = path.join(root, 'public');
const assetRoot = path.join(publicRoot, 'assets', 'transfer-oil');
const sourceCacheRoot = path.join(root, '.cache', 'transferoil', 'source-html');
const assetManifestPath = path.join(assetRoot, 'asset-manifest.json');
const sourcePageManifestPath = path.join(assetRoot, 'source-page-manifest.json');
const EXPECTED_SOURCE_ROWS = 343;
const USER_AGENT = 'TransferOilTurkiye-ManifestAssetAudit/1.0 (+local distributor website build)';
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const limitArg = process.argv.find((value) => value.startsWith('--limit='));
const rowLimit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY;
const concurrencyArg = process.argv.find((value) => value.startsWith('--concurrency='));
const concurrency = Math.max(1, Math.min(8, Number(concurrencyArg?.split('=')[1] ?? 4)));

const officialHosts = new Set(['transferoil.com', 'www.transferoil.com']);
const externalDocumentExtensions = /\.(?:pdf|docx?|xlsx?|zip)(?:[?#]|$)/i;
const mediaExtensions = /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|m4v|mov)(?:[?#]|$)/i;
const rasterExtensions = /\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/i;
const videoExtensions = /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i;

const asPosix = (value) => value.replaceAll(path.sep, '/');
const publicPath = (value) => `/${asPosix(path.relative(publicRoot, value))}`;
const relativeToRoot = (value) => asPosix(path.relative(root, value));

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function decodeEntities(value) {
  return String(value ?? '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x2F;', '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function absoluteUrl(raw, baseUrl) {
  const value = decodeEntities(raw).trim();
  if (!value || /^(?:data|blob|javascript|mailto|tel):/i.test(value) || /\{\{|<%|\+\s*['"]/.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function normalizeUrl(raw) {
  const url = new URL(raw);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  return url.href;
}

function isOfficialUrl(raw) {
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) && officialHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function slug(value) {
  return String(value || 'asset')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 72) || 'asset';
}

function attrsFromTag(tag) {
  const attrs = {};
  const pattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) attrs[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  return attrs;
}

function srcsetUrls(value) {
  return String(value ?? '').split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
}

function shouldSkipAsset(url, context, attrs = {}) {
  const parsed = new URL(url);
  const haystack = `${decodeURIComponent(parsed.pathname)} ${context} ${attrs.alt ?? ''} ${attrs.title ?? ''}`.toLowerCase();
  if (/(?:analytics|tracking|pixel|beacon|doubleclick|google-analytics)/i.test(haystack)) return 'tracking';
  if (/(?:favicon|apple-touch-icon|browserconfig|manifest\.json)/i.test(haystack)) return 'favicon';
  if (/(?:sprite|spinner|loader|preload|cookie|flag[-_/]|\/flags\/)/i.test(haystack)) return 'ui-sprite';
  if (/(?:facebook|instagram|linkedin|youtube|twitter|search-icon|user-icon|login-icon)/i.test(haystack)) return 'social-or-ui';
  if (/(?:\/(?:web)?fonts?\/|fa-(?:brands|regular|solid)|materialdesignicons-webfont|\/font\/transferoil\.svg)/i.test(haystack)) return 'font-file-not-copied';
  if (/(?:user_w\.svg|search-orange\.svg|\/images\/icons?\/|(?:^|\/)arrow(?:[-_.]|\.svg)|ie-warning|jquery-ui|ui-bg_|ui-icons_|animated-overlay|fancybox|icon_footer_|next-small|prev-small|blank\.gif|search-submit|author-icon|view-icon|comment-icon|tag-icon)/i.test(haystack)) return 'decorative-or-legacy-ui';
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'unsupported-protocol';
  return null;
}

function guessedUseFor(row, context, url) {
  const haystack = `${context} ${url}`.toLowerCase();
  if (/transferoil(?:_w)?\.svg|logo/.test(haystack)) return 'logo';
  if (/slider|slide|hero|banner/.test(haystack)) return 'hero / slider';
  if (/menu|home\/(?:hydraulic|industrial|uhp)/.test(haystack)) return `${row.mainSection} mega menü / kategori görseli`;
  if (videoExtensions.test(url) || /video|poster/.test(context)) return 'video / animasyon';
  if (/certificate|certificat|quality/.test(haystack)) return 'sertifika / kalite görseli';
  if (row.pageType === 'Ürün') return 'ürün görseli';
  if (['Insert', 'UHP fitting', 'Ferrule', 'Adaptör', 'Aksesuar'].includes(row.pageType)) return `${row.pageType} teknik görseli`;
  if (row.pageType === 'Kurumsal sayfa') return 'kurumsal sayfa görseli';
  return `${row.mainSection} / ${row.pageType} sayfa medyası`;
}

function folderFor(row, use) {
  if (use === 'logo') return 'logo';
  if (use.includes('hero')) return 'hero';
  if (use.includes('mega menü')) {
    const menu = row.mainSection === 'Şirket' ? 'company' : slug(row.mainSection);
    return `menus/${menu}`;
  }
  if (use.includes('video')) return 'videos';
  const map = {
    Hydraulic: 'hydraulic',
    Industrial: 'industrial',
    UHP: 'uhp',
    Fittings: 'fittings',
    Şirket: 'corporate',
    İçerik: row.category?.toLowerCase().includes('news') ? 'news' : row.category?.toLowerCase().includes('exhibition') ? 'exhibitions' : 'content',
    Yasal: 'legal',
    Sürdürülebilirlik: 'corporate',
    İletişim: 'contact',
    Genel: 'hero',
  };
  return map[row.mainSection] ?? 'misc';
}

function extractHtmlCandidates(html, pageUrl, row) {
  const media = [];
  const stylesheets = [];
  const documents = [];
  const detailPages = [];
  const addMedia = (raw, context, attrs = {}) => {
    const url = absoluteUrl(raw, pageUrl);
    if (!url || !isOfficialUrl(url) || !mediaExtensions.test(url)) return;
    const skipReason = shouldSkipAsset(url, context, attrs);
    media.push({ url: normalizeUrl(url), context, attrs, skipReason });
  };

  const tagPattern = /<(img|source|video)\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html))) {
    const attrs = attrsFromTag(tagMatch[0]);
    for (const [attribute, context] of [
      ['src', `${tagMatch[1]} src`],
      ['data-src', `${tagMatch[1]} data-src`],
      ['data-original', `${tagMatch[1]} data-original`],
      ['poster', `${tagMatch[1]} poster`],
    ]) addMedia(attrs[attribute], context, attrs);
    for (const url of srcsetUrls(attrs.srcset)) addMedia(url, `${tagMatch[1]} srcset`, attrs);
    for (const url of srcsetUrls(attrs['data-srcset'])) addMedia(url, `${tagMatch[1]} data-srcset`, attrs);
  }

  const styleUrlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let styleMatch;
  while ((styleMatch = styleUrlPattern.exec(html))) addMedia(styleMatch[1], 'inline CSS background-image');

  const stylesheetPattern = /<link\b[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = stylesheetPattern.exec(html))) {
    const attrs = attrsFromTag(linkMatch[0]);
    if (!/stylesheet/i.test(attrs.rel ?? '')) continue;
    const url = absoluteUrl(attrs.href, pageUrl);
    if (url && isOfficialUrl(url)) stylesheets.push(normalizeUrl(url));
  }

  const anchorPattern = /<a\b[^>]*>/gi;
  let anchorMatch;
  while ((anchorMatch = anchorPattern.exec(html))) {
    const attrs = attrsFromTag(anchorMatch[0]);
    const url = absoluteUrl(attrs.href, pageUrl);
    if (!url || !isOfficialUrl(url)) continue;
    if (externalDocumentExtensions.test(url) || /\/get_download\.aspx(?:\?|$)/i.test(url)) documents.push(normalizeUrl(url));
    if (isAllowedOneLevelDetail(row, url)) detailPages.push(normalizeUrl(url));
  }

  return {
    media,
    stylesheets: [...new Set(stylesheets)],
    documents: [...new Set(documents)],
    detailPages: [...new Set(detailPages)].slice(0, 30),
  };
}

function isAllowedOneLevelDetail(row, candidateUrl) {
  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  const sourcePath = String(row.sourcePath ?? '').toLowerCase();
  if (sourcePath.endsWith('/news.aspx')) return pathname.includes('/news/') && pathname.endsWith('.aspx');
  if (sourcePath.endsWith('/exhibitions.aspx')) return (pathname.includes('/exhibitions/') || pathname.includes('/news/')) && pathname.endsWith('.aspx');
  return false;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, options = {}, timeoutMs = 30_000, maxAttempts = 3) {
  const failures = [];
  let lastResponse = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      lastResponse = response;
      if (response.ok) {
        Object.defineProperty(response, 'transferOilAttemptCount', { value: attempt });
        return response;
      }
      failures.push(`deneme ${attempt}: HTTP ${response.status}`);
    } catch (error) {
      failures.push(`deneme ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
  }
  if (lastResponse) {
    Object.defineProperty(lastResponse, 'transferOilAttemptCount', { value: maxAttempts });
    return lastResponse;
  }
  const failure = new Error(`${maxAttempts} kontrollü deneme başarısız: ${failures.join(' | ')}`);
  failure.attempts = maxAttempts;
  throw failure;
}

async function loadManifest() {
  if (!(await exists(manifestPath))) throw new Error('transferoil_link_manifest.json proje kökünde bulunamadı. Asset scripti yalnız kökteki tek kaynak doğruluk dosyasını kullanır.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const rows = Array.isArray(manifest) ? manifest : manifest.rows;
  if (!Array.isArray(rows)) throw new Error('Manifest rows dizisi bulunamadı.');
  const uniqueUrls = new Set(rows.map((row) => normalizeUrl(row.sourceUrl)));
  const uniqueIds = new Set(rows.map((row) => row.id));
  if (rows.length !== EXPECTED_SOURCE_ROWS || uniqueUrls.size !== EXPECTED_SOURCE_ROWS || uniqueIds.size !== EXPECTED_SOURCE_ROWS) {
    throw new Error(`Manifest sayımı geçersiz: satır=${rows.length}, URL=${uniqueUrls.size}, id=${uniqueIds.size}.`);
  }
  const resolution = await exists(resolutionPath)
    ? JSON.parse(await readFile(resolutionPath, 'utf8'))
    : { records: [] };
  const resolutionById = new Map((resolution.records ?? []).map((record) => [record.id, record]));
  const unresolvedRequired = rows.filter((row) => row.canonicalResolutionRequired && !resolutionById.get(row.id)?.resolvedUrl);
  if (unresolvedRequired.length) {
    throw new Error(`Canonical çözümü eksik manifest kayıtları: ${unresolvedRequired.map((row) => row.id).join(', ')}`);
  }
  return { manifest, rows: rows.slice(0, rowLimit), allowlist: uniqueUrls, resolutionById };
}

async function readOrFetchPage(row, resolutionById) {
  const cachePath = path.join(sourceCacheRoot, `${String(row.id).padStart(3, '0')}.html`);
  const resolution = resolutionById.get(row.id) ?? null;
  const requestedUrl = resolution?.resolvedUrl || row.sourceUrl;
  if (!force && await exists(cachePath)) {
    return { html: await readFile(cachePath, 'utf8'), fromCache: true, requestedUrl, finalUrl: requestedUrl, status: 200, cachePath, attempts: 0 };
  }

  const response = await fetchWithRetry(requestedUrl, { headers: { Accept: 'text/html,application/xhtml+xml' } }, 40_000, 3);
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!/html|xhtml/i.test(contentType)) throw new Error(`HTML beklenirken ${contentType || 'bilinmeyen içerik'} alındı.`);
  const html = await response.text();
  await mkdir(sourceCacheRoot, { recursive: true });
  await writeFile(cachePath, html, 'utf8');
  return { html, fromCache: false, requestedUrl, finalUrl: response.url, status: response.status, cachePath, attempts: response.transferOilAttemptCount ?? 1 };
}

async function extractCssCandidates(stylesheetUrl, sourcePage, row) {
  try {
    const response = await fetchWithRetry(stylesheetUrl, { headers: { Accept: 'text/css,*/*;q=0.5' } }, 20_000, 3);
    if (!response.ok) return [];
    const css = await response.text();
    const candidates = [];
    const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let match;
    while ((match = pattern.exec(css))) {
      const url = absoluteUrl(match[1], stylesheetUrl);
      if (!url || !isOfficialUrl(url) || !mediaExtensions.test(url)) continue;
      const skipReason = shouldSkipAsset(url, 'external CSS background-image');
      candidates.push({
        url: normalizeUrl(url),
        context: 'external CSS background-image',
        attrs: {},
        skipReason,
        sourcePage,
        row,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function mapWithConcurrency(items, worker, size) {
  const results = new Array(items.length);
  let index = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

async function discoverAll(rows, resolutionById) {
  const pages = [];
  const media = [];
  const cssCache = new Map();

  await mapWithConcurrency(rows, async (row) => {
    const pageRecord = {
      id: row.id,
      sourceUrl: row.sourceUrl,
      requestedUrl: null,
      hierarchy: row.hierarchy,
      pageType: row.pageType,
      status: 'pending',
      httpStatus: null,
      finalUrl: null,
      cachePath: null,
      fromCache: false,
      fetchAttempts: 0,
      discoveredMediaUrls: [],
      localAssets: [],
      externalDocuments: [],
      oneLevelDetailPages: [],
      errors: [],
    };
    pages.push(pageRecord);

    try {
      const loaded = await readOrFetchPage(row, resolutionById);
      pageRecord.status = 'fetched';
      pageRecord.httpStatus = loaded.status;
      pageRecord.finalUrl = loaded.finalUrl;
      pageRecord.requestedUrl = loaded.requestedUrl;
      pageRecord.cachePath = relativeToRoot(loaded.cachePath);
      pageRecord.fromCache = loaded.fromCache;
      pageRecord.fetchAttempts = loaded.attempts;
      const extracted = extractHtmlCandidates(loaded.html, loaded.finalUrl || row.sourceUrl, row);
      pageRecord.externalDocuments.push(...extracted.documents);
      pageRecord.oneLevelDetailPages.push(...extracted.detailPages);
      for (const candidate of extracted.media) media.push({ ...candidate, sourcePage: row.sourceUrl, row });

      for (const stylesheet of extracted.stylesheets) {
        if (!cssCache.has(stylesheet)) cssCache.set(stylesheet, extractCssCandidates(stylesheet, row.sourceUrl, row));
        const cssCandidates = await cssCache.get(stylesheet);
        for (const candidate of cssCandidates) media.push(candidate);
      }

      for (const detailUrl of extracted.detailPages) {
        try {
          const detailResponse = await fetchWithRetry(detailUrl, { headers: { Accept: 'text/html,application/xhtml+xml' } }, 30_000, 3);
          if (!detailResponse.ok) throw new Error(`HTTP ${detailResponse.status}`);
          const detailHtml = await detailResponse.text();
          const detailExtracted = extractHtmlCandidates(detailHtml, detailResponse.url, row);
          pageRecord.externalDocuments.push(...detailExtracted.documents);
          for (const candidate of detailExtracted.media) media.push({ ...candidate, sourcePage: row.sourceUrl, exceptionSourcePage: detailUrl, row });
        } catch (error) {
          pageRecord.errors.push(`Tek seviye detay okunamadı (${detailUrl}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      pageRecord.status = 'failed';
      pageRecord.errors.push(error instanceof Error ? error.message : String(error));
    }
  }, concurrency);

  pages.sort((a, b) => a.id - b.id);
  return { pages, media };
}

async function downloadAsset(candidate, state) {
  const normalized = normalizeUrl(candidate.url);
  if (candidate.skipReason) {
    state.skipped.push({ url: normalized, reason: candidate.skipReason, sourcePage: candidate.sourcePage });
    return null;
  }

  if (state.byUrl.has(normalized)) {
    state.dedupeUrl += 1;
    return state.byUrl.get(normalized);
  }

  if (dryRun) {
    const dry = { id: `dry-${state.byUrl.size + 1}`, originalUrl: normalized, localPath: null, dryRun: true };
    state.byUrl.set(normalized, dry);
    return dry;
  }

  try {
    const response = await fetchWithRetry(normalized, { headers: { Accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,video/*,*/*;q=0.5' } }, 45_000, 3);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    const isVideo = contentType.startsWith('video/') || videoExtensions.test(normalized);
    const isImage = contentType.startsWith('image/') || mediaExtensions.test(normalized) && !isVideo;
    if (!isVideo && !isImage) throw new Error(`Desteklenmeyen medya tipi: ${contentType || 'bilinmiyor'}`);
    if (isVideo && contentLength > 80_000_000) throw new Error(`Video 80 MB sınırını aşıyor (${contentLength} byte).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 700) throw new Error(`Dosya çok küçük (${buffer.byteLength} byte).`);
    if (isVideo && buffer.byteLength > 80_000_000) throw new Error(`Video 80 MB sınırını aşıyor (${buffer.byteLength} byte).`);

    const hash = createHash('sha256').update(buffer).digest('hex');
    if (state.byHash.has(hash)) {
      const reused = state.byHash.get(hash);
      state.byUrl.set(normalized, reused);
      state.dedupeHash += 1;
      return reused;
    }

    const use = guessedUseFor(candidate.row, candidate.context, normalized);
    const folder = folderFor(candidate.row, use);
    const baseName = slug(path.basename(new URL(normalized).pathname, path.extname(new URL(normalized).pathname)));
    const semanticName = `${String(candidate.row.id).padStart(3, '0')}-${slug(candidate.row.pageOrProduct || candidate.row.seriesOrGroup || candidate.row.category || candidate.row.mainSection)}-${baseName}-${hash.slice(0, 10)}`;
    const destinationDir = path.join(assetRoot, folder);
    await mkdir(destinationDir, { recursive: true });

    const sourceExt = path.extname(new URL(normalized).pathname).toLowerCase();
    let destination;
    let width = null;
    let height = null;
    let outputMime = contentType || null;
    let optimization = 'Özgün dosya biçimi korundu.';

    if (contentType.includes('svg') || sourceExt === '.svg') {
      destination = path.join(destinationDir, `${semanticName}.svg`);
      await writeFile(destination, buffer);
      outputMime = 'image/svg+xml';
    } else if (isVideo) {
      const ext = ['.mp4', '.webm', '.m4v', '.mov'].includes(sourceExt) ? sourceExt : '.mp4';
      destination = path.join(destinationDir, `${semanticName}${ext}`);
      await writeFile(destination, buffer);
    } else if (rasterExtensions.test(normalized) || /^image\/(?:jpeg|png|webp|avif)/.test(contentType)) {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
      if (width && height && width < 24 && height < 24 && use !== 'logo') throw new Error(`Çok küçük UI görseli (${width}x${height}).`);
      destination = path.join(destinationDir, `${semanticName}.webp`);
      await sharp(buffer).rotate().webp({ quality: 84, effort: 4 }).toFile(destination);
      outputMime = 'image/webp';
      optimization = 'Raster medya WebP biçimine dönüştürüldü; yeniden boyutlandırma veya upscale yapılmadı.';
    } else {
      const ext = sourceExt || '.bin';
      destination = path.join(destinationDir, `${semanticName}${ext}`);
      await writeFile(destination, buffer);
      const metadata = await sharp(buffer).metadata().catch(() => ({}));
      width = metadata.width ?? null;
      height = metadata.height ?? null;
    }

    const record = {
      id: `asset-${String(state.assets.length + 1).padStart(4, '0')}`,
      sourcePage: candidate.sourcePage,
      sourcePages: [candidate.sourcePage],
      exceptionSourcePages: candidate.exceptionSourcePage ? [candidate.exceptionSourcePage] : [],
      originalUrl: normalized,
      localPath: publicPath(destination),
      guessedUse: use,
      sourceContext: candidate.context,
      width,
      height,
      sourceMimeType: contentType || null,
      outputMimeType: outputMime,
      byteLength: buffer.byteLength,
      sha256: hash,
      optimization,
      isPlaceholder: false,
    };
    state.assets.push(record);
    state.byUrl.set(normalized, record);
    state.byHash.set(hash, record);
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/^(?:Dosya çok küçük|Çok küçük UI görseli|Video 80 MB sınırını aşıyor)/.test(message)) {
      state.skipped.push({
        url: normalized,
        sourcePage: candidate.sourcePage,
        reason: message.startsWith('Video') ? 'oversized-video-reported' : 'small-ui-media',
        details: message,
      });
      return null;
    }
    state.failed.push({
      originalUrl: normalized,
      sourcePage: candidate.sourcePage,
      context: candidate.context,
      error: message,
    });
    return null;
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const { manifest, rows, allowlist, resolutionById } = await loadManifest();
  await mkdir(assetRoot, { recursive: true });
  await mkdir(sourceCacheRoot, { recursive: true });

  const discovered = await discoverAll(rows, resolutionById);
  const state = {
    assets: [],
    byUrl: new Map(),
    byHash: new Map(),
    dedupeUrl: 0,
    dedupeHash: 0,
    skipped: [],
    failed: [],
  };

  const uniqueCandidates = [];
  const seenCandidateKeys = new Set();
  for (const candidate of discovered.media) {
    const key = `${normalizeUrl(candidate.url)}|${candidate.sourcePage}`;
    if (seenCandidateKeys.has(key)) continue;
    seenCandidateKeys.add(key);
    uniqueCandidates.push(candidate);
  }

  await mapWithConcurrency(uniqueCandidates, async (candidate) => {
    const record = await downloadAsset(candidate, state);
    const page = discovered.pages.find((item) => item.id === candidate.row.id);
    if (!page) return;
    page.discoveredMediaUrls.push(candidate.url);
    if (record?.localPath) page.localAssets.push(record.localPath);
  }, concurrency);

  for (const page of discovered.pages) {
    page.discoveredMediaUrls = [...new Set(page.discoveredMediaUrls)];
    page.localAssets = [...new Set(page.localAssets)];
    page.externalDocuments = [...new Set(page.externalDocuments)];
  }

  for (const asset of state.assets) {
    const related = uniqueCandidates.filter((candidate) => normalizeUrl(candidate.url) === asset.originalUrl);
    asset.sourcePages = [...new Set(related.map((candidate) => candidate.sourcePage))];
    asset.exceptionSourcePages = [...new Set(related.map((candidate) => candidate.exceptionSourcePage).filter(Boolean))];
  }

  const summary = {
    expectedSourceRows: EXPECTED_SOURCE_ROWS,
    processedSourceRows: rows.length,
    allowlistedSourceUrls: allowlist.size,
    fetchedSourceRows: discovered.pages.filter((page) => page.status === 'fetched').length,
    failedSourceRows: discovered.pages.filter((page) => page.status === 'failed').length,
    discoveredCandidateReferences: discovered.media.length,
    uniqueCandidateReferences: uniqueCandidates.length,
    downloadedUniqueAssets: state.assets.length,
    urlDuplicatesReused: state.dedupeUrl,
    contentHashDuplicatesReused: state.dedupeHash,
    skippedCandidates: state.skipped.length,
    failedAssetDownloads: state.failed.length,
    placeholderAssetsCreated: 0,
    sourceRowsWithoutLocalAssets: discovered.pages.filter((page) => page.localAssets.length === 0).length,
    dryRun,
  };

  const assetManifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    startedAt,
    sourceOfTruth: 'transferoil_link_manifest.json',
    policy: {
      pageAllowlist: '343 manifest URLs; only documented news/exhibitions one-level detail exceptions',
      officialHosts: [...officialHosts],
      copiedCssOrJs: false,
      runtimeHotlinks: false,
      rasterOptimization: 'WebP without resize/upscale',
      svg: 'Preserved',
      documents: 'Official URLs recorded; not force-downloaded',
    },
    summary,
    assets: state.assets,
    skipped: state.skipped,
    failures: state.failed,
  };

  const sourcePageManifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    sourceOfTruth: 'transferoil_link_manifest.json',
    summary,
    pages: discovered.pages,
  };

  await writeFile(assetManifestPath, `${JSON.stringify(assetManifest, null, 2)}\n`, 'utf8');
  await writeFile(sourcePageManifestPath, `${JSON.stringify(sourcePageManifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    assetManifest: relativeToRoot(assetManifestPath),
    sourcePageManifest: relativeToRoot(sourcePageManifestPath),
    ...summary,
  }, null, 2));

  if (summary.failedSourceRows > 0 || summary.failedAssetDownloads > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
