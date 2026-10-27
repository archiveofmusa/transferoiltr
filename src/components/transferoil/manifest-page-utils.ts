import type {
  TransferOilContentPage,
  TransferOilLocale,
  TransferOilTranslation,
} from '@/data/transferoil/registry';
import { resolveTransferOilHdAssetPath } from '@/data/transferoil/hd-assets.generated';
import { rebrandSiteText } from '@/data/brand';

export type ManifestDocumentLink = {
  title: string | null;
  href: string;
  external: boolean;
};

export type ManifestTechnicalEntry = {
  label: string;
  value: string | number | boolean;
};

export type ManifestTable = {
  caption: string | null;
  headers: string[];
  rows: string[][];
};

const technicalLabels: Record<TransferOilLocale, Record<string, string>> = {
  tr: {
    pressure: 'Basınç',
    'working pressure': 'Çalışma basıncı',
    'burst pressure': 'Patlama basıncı',
    'temperature range': 'Sıcaklık aralığı',
    temperature: 'Sıcaklık',
    diameter: 'Çap',
    size: 'Ölçü',
    length: 'Uzunluk',
    weight: 'Ağırlık',
    material: 'Malzeme',
    reinforcement: 'Takviye',
    cover: 'Dış kaplama',
    tube: 'İç katman',
    core: 'İç katman',
    application: 'Uygulama',
    description: 'Açıklama',
    standard: 'Standart',
    thread: 'Diş',
    'part no': 'Parça no.',
    'part number': 'Parça numarası',
    code: 'Kod',
    colour: 'Renk',
    color: 'Renk',
  },
  en: {},
  ru: {
    pressure: 'Давление',
    'working pressure': 'Рабочее давление',
    'burst pressure': 'Давление разрыва',
    'temperature range': 'Диапазон температур',
    temperature: 'Температура',
    diameter: 'Диаметр',
    size: 'Размер',
    length: 'Длина',
    weight: 'Масса',
    material: 'Материал',
    reinforcement: 'Армирование',
    cover: 'Внешнее покрытие',
    tube: 'Внутренний слой',
    core: 'Внутренний слой',
    application: 'Применение',
    description: 'Описание',
    standard: 'Стандарт',
    thread: 'Резьба',
    'part no': 'Номер детали',
    'part number': 'Номер детали',
    code: 'Код',
    colour: 'Цвет',
    color: 'Цвет',
  },
  ar: {
    pressure: 'الضغط',
    'working pressure': 'ضغط التشغيل',
    'burst pressure': 'ضغط الانفجار',
    'temperature range': 'نطاق درجة الحرارة',
    temperature: 'درجة الحرارة',
    diameter: 'القطر',
    size: 'المقاس',
    length: 'الطول',
    weight: 'الوزن',
    material: 'المادة',
    reinforcement: 'التقوية',
    cover: 'الغطاء الخارجي',
    tube: 'الطبقة الداخلية',
    core: 'الطبقة الداخلية',
    application: 'التطبيق',
    description: 'الوصف',
    standard: 'المعيار',
    thread: 'القلوظ',
    'part no': 'رقم الجزء',
    'part number': 'رقم الجزء',
    code: 'الرمز',
    colour: 'اللون',
    color: 'اللون',
  },
};

export function localizeTechnicalLabel(value: string, locale: TransferOilLocale): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[:.]$/, '');
  return technicalLabels[locale][normalized] ?? value;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function recordValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function getManifestTranslation(page: TransferOilContentPage, locale: TransferOilLocale): TransferOilTranslation {
  const translation = page.translations[locale] ?? page.translations.tr;
  const brandedText = (value: string | null) => value === null ? null : rebrandSiteText(value);

  // Keep source translations intact while presenting the current distributor identity.
  return {
    ...translation,
    title: rebrandSiteText(translation.title),
    eyebrow: brandedText(translation.eyebrow),
    summary: brandedText(translation.summary),
    description: brandedText(translation.description),
    metadataTitle: brandedText(translation.metadataTitle),
    metadataDescription: brandedText(translation.metadataDescription),
    altText: brandedText(translation.altText),
  };
}

export function getManifestTitle(page: TransferOilContentPage, locale: TransferOilLocale): string {
  const translation = getManifestTranslation(page, locale);
  return nonEmptyText(translation.title) ?? page.hierarchy.split('→').at(-1)?.trim() ?? page.hierarchy;
}

export function getManifestDescription(page: TransferOilContentPage, locale: TransferOilLocale): string | null {
  const translation = getManifestTranslation(page, locale);
  return nonEmptyText(translation.description) ?? nonEmptyText(translation.summary);
}

function normalizeLocalPath(value: string): string | null {
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || /^https?:\/\//i.test(normalized)) return null;
  const publicIndex = normalized.toLowerCase().indexOf('/public/');
  const withoutPublic = publicIndex >= 0
    ? normalized.slice(publicIndex + '/public'.length)
    : normalized.replace(/^public\//i, '/');
  const publicPath = withoutPublic.startsWith('/') ? withoutPublic : `/${withoutPublic}`;
  if (!/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(publicPath)) return null;
  return publicPath;
}

export function getManifestImage(page: TransferOilContentPage): string | null {
  for (const item of page.assets) {
    if (typeof item === 'string') {
      const normalized = normalizeLocalPath(item);
      if (normalized) return resolveTransferOilHdAssetPath(normalized);
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const candidate = recordValue(record, ['localPath', 'publicPath', 'localUrl', 'src', 'path']);
    if (typeof candidate !== 'string') continue;
    const normalized = normalizeLocalPath(candidate);
    if (normalized) return resolveTransferOilHdAssetPath(normalized);
  }
  return null;
}

function isSafeDocumentHref(value: string): boolean {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'transferoil.com' || url.hostname.endsWith('.transferoil.com'));
  } catch {
    return false;
  }
}

export function getManifestDocuments(page: TransferOilContentPage): ManifestDocumentLink[] {
  const links: ManifestDocumentLink[] = [];
  for (const item of page.documentLinks) {
    if (typeof item === 'string') {
      if (isSafeDocumentHref(item)) links.push({ title: null, href: item, external: item.startsWith('https://') });
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const href = recordValue(record, ['url', 'href', 'fileUrl', 'originalUrl', 'sourceUrl']);
    if (typeof href !== 'string' || !isSafeDocumentHref(href)) continue;
    const title = nonEmptyText(recordValue(record, ['title', 'label', 'name', 'fileName']));
    links.push({ title, href, external: href.startsWith('https://') });
  }
  return links.filter((link, index, all) => all.findIndex((item) => item.href === link.href) === index);
}

export function getManifestTechnicalEntries(
  page: TransferOilContentPage,
  locale: TransferOilLocale,
  labels: { productReference: string; verifiedMeasurement: string },
): ManifestTechnicalEntry[] {
  const record = asRecord(page.technicalData);
  if (!record) return [];
  const result: ManifestTechnicalEntry[] = [];
  const heading = nonEmptyText(record.sourceHeading);
  if (heading) result.push({ label: labels.productReference, value: heading });
  const measurements = Array.isArray(record.measurements)
    ? record.measurements.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    : [];
  measurements.slice(0, 16).forEach((value, index) => {
    result.push({
      label: `${labels.verifiedMeasurement} ${index + 1}`,
      value,
    });
  });
  return result.map((entry) => ({ ...entry, label: localizeTechnicalLabel(entry.label, locale) }));
}

function plainCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(plainCell).filter(Boolean).join(' · ');
  const record = asRecord(value);
  if (!record) return '';
  const direct = recordValue(record, ['value', 'text', 'label', 'name']);
  if (direct !== null && direct !== value) return plainCell(direct);
  return Object.values(record).map(plainCell).filter(Boolean).join(' · ');
}

function columnDescriptor(value: unknown, index: number): { label: string; key: string } {
  if (typeof value === 'string') return { label: value, key: value };
  const record = asRecord(value);
  if (!record) return { label: String(index + 1), key: String(index) };
  const key = nonEmptyText(recordValue(record, ['key', 'field', 'id', 'name'])) ?? String(index);
  const label = nonEmptyText(recordValue(record, ['label', 'title', 'name', 'key'])) ?? key;
  return { label, key };
}

function normalizeTable(value: unknown): ManifestTable | null {
  const record = asRecord(value);
  const rawRows = Array.isArray(value) ? value : recordValue(record ?? {}, ['rows', 'data', 'items']);
  if (!Array.isArray(rawRows) || rawRows.length === 0) return null;

  const rawColumns = recordValue(record ?? {}, ['headers', 'columns', 'headings']);
  let columns = Array.isArray(rawColumns) ? rawColumns.map(columnDescriptor) : [];
  if (columns.length === 0) {
    const firstRecord = asRecord(rawRows[0]);
    if (firstRecord) columns = Object.keys(firstRecord).map((key) => ({ label: key, key }));
    else if (Array.isArray(rawRows[0])) columns = rawRows[0].map((_, index) => ({ label: '', key: String(index) }));
  }
  if (columns.length === 0) return null;

  const rows = rawRows.map((row) => {
    if (Array.isArray(row)) return columns.map((_, index) => plainCell(row[index]));
    const rowRecord = asRecord(row);
    if (!rowRecord) return [plainCell(row)];
    return columns.map((column) => plainCell(rowRecord[column.key]));
  });

  return {
    caption: nonEmptyText(recordValue(record ?? {}, ['caption', 'title', 'name'])),
    headers: columns.map((column) => column.label),
    rows,
  };
}

export function getManifestTables(page: TransferOilContentPage): ManifestTable[] {
  return page.tables.map(normalizeTable).filter((table): table is ManifestTable => Boolean(table));
}
