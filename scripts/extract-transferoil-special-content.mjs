import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlDirectory = path.join(root, '.cache', 'transferoil', 'source-html');
const detailDirectory = path.join(root, '.cache', 'transferoil', 'special-details');
const outputPath = path.join(root, 'src', 'data', 'transferoil', 'special-content.generated.json');
const manifestPath = path.join(root, 'transferoil_link_manifest.json');
const refreshDetails = process.argv.includes('--refresh-details');

const manifestDocument = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestRows = Array.isArray(manifestDocument)
  ? manifestDocument
  : manifestDocument.rows || manifestDocument.records || manifestDocument.links || [];
const sourceById = new Map(manifestRows.map((row) => [row.id, row]));

function sourceUrl(id) {
  const value = sourceById.get(id)?.sourceUrl;
  if (!value) throw new Error(`Manifest kaydı bulunamadı: ${id}`);
  return value;
}

function decodeHtml(value = '') {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&reg;|&#174;/gi, '®')
    .replace(/&deg;|&#176;/gi, '°')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteOfficialUrl(value, sourcePage) {
  if (!value || /^(?:data:|javascript:|#)/i.test(value)) return null;
  try {
    const result = new URL(decodeHtml(value), sourcePage);
    if (result.hostname !== 'www.transferoil.com' && result.hostname !== 'transferoil.com') return null;
    result.hostname = 'www.transferoil.com';
    return result.toString();
  } catch {
    return null;
  }
}

function localAssetLookup() {
  const candidates = [
    path.join(root, 'public', 'assets', 'transfer-oil', 'asset-manifest.json'),
    path.join(root, 'public', 'assets', 'transfer-oil', 'final', 'asset-manifest.json'),
    path.join(root, 'public', 'assets', 'transfer-oil', 'source-asset-manifest.json'),
  ];
  const entries = candidates.flatMap((candidate) => {
    if (!existsSync(candidate)) return [];
    try {
      const document = JSON.parse(readFileSync(candidate, 'utf8'));
      if (Array.isArray(document)) return document;
      return document.assets || document.entries || document.items || document.records || [];
    } catch {
      return [];
    }
  });
  return new Map(
    entries
      .filter((entry) => entry.originalUrl && entry.localPath && entry.isPlaceholder !== true)
      .map((entry) => [absoluteOfficialUrl(entry.originalUrl, 'https://www.transferoil.com/') || entry.originalUrl, entry.localPath]),
  );
}

const assetsByOriginalUrl = localAssetLookup();

function localAssetFor(originalUrl) {
  if (!originalUrl) return null;
  const localPath = assetsByOriginalUrl.get(originalUrl) || null;
  if (!localPath) return null;
  return existsSync(path.join(root, 'public', localPath.replace(/^\/+/, ''))) ? localPath : null;
}

function parseEnglishDate(value) {
  const match = decodeHtml(value).match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (!match) return null;
  const months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  const month = months[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
}

function parseDateRange(value) {
  const text = decodeHtml(value);
  const match = text.match(/([A-Za-z]{3,9})\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{4})/);
  if (!match) return { startDate: null, endDate: null, dateText: text || null };
  return {
    startDate: parseEnglishDate(`${match[2]} ${match[1]} ${match[4]}`),
    endDate: parseEnglishDate(`${match[3]} ${match[1]} ${match[4]}`),
    dateText: text,
  };
}

async function readSourceHtml(id) {
  return readFile(path.join(htmlDirectory, `${String(id).padStart(3, '0')}.html`), 'utf8');
}

function parseNews(html, pageUrl) {
  const cards = [];
  for (let index = 0; index < 5; index += 1) {
    const title = decodeHtml((html.match(new RegExp(`id=["']rep_bignews_bignews_t1_${index}["'][^>]*>([\\s\\S]*?)<\\/h3>`, 'i')) || [])[1]);
    const summary = decodeHtml((html.match(new RegExp(`id=["']rep_bignews_bignews_t2_${index}["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i')) || [])[1]);
    const dateText = decodeHtml((html.match(new RegExp(`id=["']rep_bignews_lb_bignews_lastupdated_${index}["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i')) || [])[1]);
    const linkMatch = html.match(new RegExp(`<a\\b[^>]*href=["']([^"']+)["'][^>]*id=["']rep_bignews_a_bignews_img_${index}["'][^>]*>[\\s\\S]*?<img\\b[^>]*src=["']([^"']+)["']`, 'i'));
    const detailUrl = absoluteOfficialUrl(linkMatch?.[1], pageUrl);
    const imageUrl = absoluteOfficialUrl(linkMatch?.[2], pageUrl);
    if (!title || !detailUrl || !/^https:\/\/www\.transferoil\.com\/en\/news\//i.test(detailUrl)) continue;
    cards.push({
      id: `news-${index + 1}`,
      title,
      summary: summary || null,
      publishedDate: parseEnglishDate(dateText),
      dateText: dateText || null,
      detailUrl,
      imageUrl,
      localImage: localAssetFor(imageUrl),
    });
  }
  return cards;
}

function parseExhibitions(html, pageUrl) {
  const cards = [];
  const titlePattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*id=["']rep_productchildren_a_innerchild_(\d+)["'][^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(titlePattern)) {
    const detailUrl = absoluteOfficialUrl(match[1], pageUrl);
    if (!detailUrl || !/^https:\/\/www\.transferoil\.com\/en\/exhibitions\//i.test(detailUrl)) continue;
    const index = Number(match[2]);
    const image = (html.match(new RegExp(`id=["']rep_productchildren_img_inner_${index}["'][^>]*src=["']([^"']+)["']`, 'i')) || [])[1]
      || (html.match(new RegExp(`<img\\b[^>]*src=["']([^"']+)["'][^>]*id=["']rep_productchildren_img_inner_${index}["']`, 'i')) || [])[1];
    const subtitle = decodeHtml((html.match(new RegExp(`id=["']rep_productchildren_innerchild_t2_${index}["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i')) || [])[1]);
    const imageUrl = absoluteOfficialUrl(image, pageUrl);
    cards.push({
      id: `exhibition-${index + 1}`,
      title: decodeHtml(match[3]),
      ...parseDateRange(subtitle),
      summary: subtitle || null,
      location: null,
      stand: null,
      detailUrl,
      imageUrl,
      localImage: localAssetFor(imageUrl),
    });
  }
  return cards;
}

function detailCachePath(detailUrl) {
  const slug = new URL(detailUrl).pathname.split('/').pop()?.replace(/\.aspx$/i, '') || 'detail';
  return path.join(detailDirectory, `${slug}.html`);
}

async function enrichExhibition(card) {
  const cachePath = detailCachePath(card.detailUrl);
  let html = null;
  if (refreshDetails) {
    try {
      const response = await fetch(card.detailUrl, { headers: { 'user-agent': 'TransferOil-Turkiye-reference-audit/1.0' }, redirect: 'follow' });
      if (response.ok && new URL(response.url).hostname.endsWith('transferoil.com')) {
        html = await response.text();
        await mkdir(detailDirectory, { recursive: true });
        await writeFile(cachePath, html, 'utf8');
      }
    } catch {
      // A cached detail is used below when the official source is temporarily unavailable.
    }
  }
  if (!html && existsSync(cachePath)) html = await readFile(cachePath, 'utf8');
  if (!html) return card;
  const metadata = [...html.matchAll(/<div\b[^>]*class=["'][^"']*eventmetas[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .flatMap((block) => [...block[1].matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>/gi)].map((entry) => decodeHtml(entry[1])));
  const detailImage = absoluteOfficialUrl((html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1], card.detailUrl);
  return {
    ...card,
    ...parseDateRange(metadata[0] || card.dateText || ''),
    location: metadata[1] || null,
    stand: metadata[2] || null,
    imageUrl: detailImage || card.imageUrl,
    localImage: localAssetFor(detailImage || card.imageUrl) || card.localImage,
  };
}

function parseCertificates(html, pageUrl) {
  const certificates = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']*get_download\.aspx\?ctrb_id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const [index, match] of [...html.matchAll(anchorPattern)].entries()) {
    const before = html.slice(Math.max(0, match.index - 5000), match.index);
    const headings = [...before.matchAll(/<h[56][^>]*>([\s\S]*?)<\/h[56]>/gi)];
    const title = decodeHtml(headings.at(-1)?.[1]);
    const documentUrl = absoluteOfficialUrl(match[1], pageUrl);
    if (!title || !documentUrl) continue;
    certificates.push({ id: `certificate-${index + 1}`, title, documentUrl });
  }
  return certificates;
}

const newsSource = sourceUrl(334);
const exhibitionsSource = sourceUrl(333);
const certificatesSource = sourceUrl(338);
const [newsHtml, exhibitionsHtml, certificatesHtml] = await Promise.all([
  readSourceHtml(334),
  readSourceHtml(333),
  readSourceHtml(338),
]);
const exhibitions = await Promise.all(parseExhibitions(exhibitionsHtml, exhibitionsSource).map(enrichExhibition));
const sourceStat = await stat(path.join(htmlDirectory, '334.html'));

function withoutRemoteImageMetadata(item) {
  const copy = { ...item };
  delete copy.imageUrl;
  return copy;
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date(sourceStat.mtimeMs).toISOString(),
  rules: {
    listSourcesRestrictedToManifestIds: [333, 334, 338],
    detailDepth: 1,
    longFormBodyCopied: false,
    unverifiedClaimsAdded: false,
  },
  sources: {
    downloads: sourceUrl(332),
    exhibitions: exhibitionsSource,
    news: newsSource,
    certificates: certificatesSource,
  },
  news: parseNews(newsHtml, newsSource).map(withoutRemoteImageMetadata),
  exhibitions: exhibitions.map(withoutRemoteImageMetadata),
  certificates: parseCertificates(certificatesHtml, certificatesSource),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  news: output.news.length,
  exhibitions: output.exhibitions.length,
  certificates: output.certificates.length,
  localImages: [...output.news, ...output.exhibitions].filter((item) => item.localImage).length,
}, null, 2));
