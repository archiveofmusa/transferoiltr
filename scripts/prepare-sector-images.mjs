import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Four individually reviewed, freely licensed photographs. This is not a crawler.
// Review each source/license again before replacing a photograph or changing its use.
const sources = [
  {
    slug: 'offshore',
    sourceUrl: 'https://www.pexels.com/photo/aerial-view-of-oil-rig-out-at-sea-9336586/',
    originalUrl: 'https://images.pexels.com/photos/9336586/pexels-photo-9336586.jpeg',
    photographer: 'Aron Razif', provider: 'Pexels', license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/', sourceWidth: 5472, sourceHeight: 3648,
    imagePosition: '50% 50%',
    localizedAlt: {
      tr: 'Açık denizde birbirine bağlı platformlar; temsili offshore sektör fotoğrafı',
      en: 'Connected platforms at sea; representative offshore industry photograph',
      ru: 'Соединённые платформы в открытом море; иллюстративная фотография морской отрасли',
      ar: 'منصات متصلة في عرض البحر؛ صورة توضيحية لقطاع المنشآت البحرية',
    },
  },
  {
    slug: 'savunma-sanayi',
    sourceUrl: 'https://www.pexels.com/photo/military-aircraft-in-hangar-18403815/',
    originalUrl: 'https://images.pexels.com/photos/18403815/pexels-photo-18403815.jpeg',
    photographer: 'Miguel Cuenca', provider: 'Pexels', license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/', sourceWidth: 8256, sourceHeight: 5504,
    imagePosition: '50% 55%',
    localizedAlt: {
      tr: 'Hangar içinde bir askeri uçak; temsili savunma sanayi fotoğrafı',
      en: 'A military aircraft inside a hangar; representative defence industry photograph',
      ru: 'Военный самолёт в ангаре; иллюстративная фотография оборонной промышленности',
      ar: 'طائرة عسكرية داخل حظيرة؛ صورة توضيحية للصناعات الدفاعية',
    },
  },
  {
    slug: 'endustriyel-tesisler',
    sourceUrl: 'https://unsplash.com/photos/industrial-textile-factory-with-machinery-and-pipes-HpPmiduLDC0',
    originalUrl: 'https://images.unsplash.com/photo-1610891015188-5369212db097',
    photographer: 'Lalit Kumar', provider: 'Unsplash', license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license', sourceWidth: 6720, sourceHeight: 3173,
    imagePosition: '55% 50%',
    localizedAlt: {
      tr: 'Üretim tesisinde makineler ve metal boru hatları; temsili endüstriyel tesis fotoğrafı',
      en: 'Machinery and metal pipework in a production facility; representative industrial photograph',
      ru: 'Оборудование и металлические трубопроводы на производстве; иллюстративная промышленная фотография',
      ar: 'آلات وأنابيب معدنية في منشأة إنتاج؛ صورة توضيحية للمنشآت الصناعية',
    },
  },
  {
    slug: 'rafineriler',
    sourceUrl: 'https://www.pexels.com/photo/oil-refinery-plant-15970032/',
    originalUrl: 'https://images.pexels.com/photos/15970032/pexels-photo-15970032.jpeg',
    photographer: 'Jakub Pabis', provider: 'Pexels', license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/', sourceWidth: 6000, sourceHeight: 4000,
    imagePosition: '50% 50%',
    localizedAlt: {
      tr: 'Rafineri kolonları ve proses boruları; temsili rafineri sektör fotoğrafı',
      en: 'Refinery columns and process pipework; representative refinery industry photograph',
      ru: 'Колонны и технологические трубопроводы НПЗ; иллюстративная фотография нефтепереработки',
      ar: 'أبراج تكرير وأنابيب عمليات؛ صورة توضيحية لقطاع المصافي',
    },
  },
];

const output = path.resolve('public/assets/sectors');
await fs.mkdir(output, { recursive: true });
const assets = {};
for (const source of sources) {
  const downloadUrl = new URL(source.originalUrl);
  downloadUrl.searchParams.set('w', '2400');
  downloadUrl.searchParams.set('fit', 'max');
  downloadUrl.searchParams.set('q', '90');
  if (source.provider === 'Unsplash') downloadUrl.searchParams.set('fm', 'jpg');
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${source.slug}: download failed (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 1600) {
    throw new Error(`${source.slug}: the source is not sufficiently large; do not upscale`);
  }
  const variants = [];
  for (const width of [480, 800, 1600]) {
    const fileName = `${source.slug}-${width}w.webp`;
    const info = await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(path.join(output, fileName));
    const bytes = await fs.readFile(path.join(output, fileName));
    variants.push({ src: `/assets/sectors/${fileName}`, width: info.width, height: info.height, bytes: info.size, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  const largest = variants.at(-1);
  assets[source.slug] = {
    ...source,
    imageSrc: largest.src, imageWidth: largest.width, imageHeight: largest.height,
    variants, downloadUrl: downloadUrl.href, downloadedWidth: metadata.width, downloadedHeight: metadata.height,
    attributionRequired: false, commercialUseAllowed: true, licenseReviewedAt: '2026-10-31',
    notes: 'Representative sector image only. Not a UHPHORTUM facility, customer, endorsement or test centre. Locally resized without enlargement; aspect ratio preserved. Source and license verified individually. No watermark or paid preview used.',
  };
  console.log(`${source.slug}: ${metadata.width} × ${metadata.height} source; ${variants.length} local WebP sizes`);
}
await fs.writeFile(path.join(output, 'asset-manifest.json'), JSON.stringify({ version: 1, assets }, null, 2) + '\n');
