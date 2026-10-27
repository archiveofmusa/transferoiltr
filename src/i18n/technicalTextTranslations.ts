import type { Locale } from './routing';
import { localizeProductName } from './productNameTranslations';

type Translation = readonly [tr: string, en: string, ru: string, ar: string];
const indexes = { tr: 0, en: 1, ru: 2, ar: 3 } as const;

// Exact source labels, not a word-by-word translator: codes, dimensions and
// standards in source tables are never interpreted or altered.
const labels: Record<string, Translation> = {
  descrizione: ['Açıklama', 'Description', 'Описание', 'الوصف'],
  inches: ['İnç', 'Inches', 'Дюймы', 'بوصة'],
  inch: ['İnç', 'Inch', 'Дюйм', 'بوصة'],
  'max. dimensions (mm)': ['Azami ölçüler (mm)', 'Maximum dimensions (mm)', 'Максимальные размеры (mm)', 'الأبعاد القصوى (mm)'],
  'weight including blade': ['Bıçak dahil ağırlık', 'Weight including blade', 'Масса с лезвием', 'الوزن شاملاً الشفرة'],
  compatibility: ['Uyumluluk', 'Compatibility', 'Совместимость', 'التوافق'],
  hose: ['Hortum', 'Hose', 'Рукав', 'الخرطوم'],
  dimension: ['Ölçü', 'Dimension', 'Размер', 'المقاس'],
  strength: ['Dayanım', 'Strength', 'Прочность', 'المتانة'],
  fittings: ['Bağlantı elemanları', 'Fittings', 'Фитинги', 'الوصلات'],
  go: ['Geçer', 'GO', 'Проход', 'يمر'],
  'no go': ['Geçmez', 'NO GO', 'Непроход', 'لا يمر'],
  'spare blade': ['Yedek bıçak', 'Spare blade', 'Запасное лезвие', 'شفرة احتياطية'],
  'telescopic skiving tool': ['Teleskopik hortum soyma aleti', 'Telescopic skiving tool', 'Телескопический инструмент для зачистки рукавов', 'أداة تلسكوبية لتقشير الخرطوم'],
  'hose installation guidelines': ['Hortum montaj kılavuzu', 'Hose installation guidelines', 'Руководство по монтажу рукавов', 'إرشادات تركيب الخرطوم'],
  'twin hose': ['İkiz hortum', 'Twin hose', 'Сдвоенный рукав', 'خرطوم مزدوج'],
  'data sheet - crimping diameters - single hose': ['Teknik föy – Presleme çapları – Tekli hortum', 'Data sheet – Crimping diameters – Single hose', 'Технический лист — Диаметры обжима — Одинарный рукав', 'ورقة بيانات – أقطار الكبس – خرطوم مفرد'],
  'data sheet - crimping diameters': ['Teknik föy – Presleme çapları', 'Data sheet – Crimping diameters', 'Технический лист — Диаметры обжима', 'ورقة بيانات – أقطار الكبس'],
  'abs - type approval': ['ABS – Tip onayı', 'ABS – Type approval', 'ABS — Одобрение типа', 'ABS – اعتماد النوع'],
  'dnv - gl type approval': ['DNV - GL – Tip onayı', 'DNV - GL – Type approval', 'DNV - GL — Одобрение типа', 'DNV - GL – اعتماد النوع'],
  'osm assembling instructions': ['OSM montaj talimatları', 'OSM assembly instructions', 'Инструкции по сборке OSM', 'تعليمات تجميع OSM'],
  'vhp hoses assembling instructions': ['VHP hortum montaj talimatları', 'VHP hose assembly instructions', 'Инструкции по сборке рукавов VHP', 'تعليمات تجميع خراطيم VHP'],
  'tp hose life factors': ['Termoplastik hortum ömrünü etkileyen faktörler', 'Thermoplastic hose service-life factors', 'Факторы срока службы термопластичных рукавов', 'عوامل عمر خدمة الخراطيم اللدنة حرارياً'],
  'tp schlauche faktoren zur lebensdauer': ['Termoplastik hortum ömrünü etkileyen faktörler (Almanca doküman)', 'Thermoplastic hose service-life factors (German document)', 'Факторы срока службы термопластичных рукавов (документ на немецком)', 'عوامل عمر خدمة الخراطيم اللدنة حرارياً (وثيقة بالألمانية)'],
  'bulletin dn38': ['DN38 teknik bülteni', 'DN38 technical bulletin', 'Технический бюллетень DN38', 'النشرة الفنية DN38'],
  'bulletin waterflow 250': ['Waterflow 250 teknik bülteni', 'Waterflow 250 technical bulletin', 'Технический бюллетень Waterflow 250', 'النشرة الفنية Waterflow 250'],
  'transfer oil resmî doküman sayfası': ['Transfer Oil resmî doküman sayfası', 'Transfer Oil official documentation page', 'Официальная страница документации Transfer Oil', 'صفحة الوثائق الرسمية لـ Transfer Oil'],
  'transfer oil resmî sertifika sayfası': ['Transfer Oil resmî sertifika sayfası', 'Transfer Oil official certificate page', 'Официальная страница сертификатов Transfer Oil', 'صفحة الشهادات الرسمية لـ Transfer Oil'],
  'download certificate': ['Sertifikayı indir', 'Download certificate', 'Скачать сертификат', 'تنزيل الشهادة'],
  'download our code of ethics': ['Etik kurallar belgesini indir', 'Download the code of ethics', 'Скачать кодекс этики', 'تنزيل مدونة الأخلاق'],
  'following the appropriate procedure': ['İlgili prosedürü incele', 'View the applicable procedure', 'Ознакомиться с применимой процедурой', 'الاطلاع على الإجراء المعمول به'],
  'download the document': ['Dokümanı indir', 'Download the document', 'Скачать документ', 'تنزيل الوثيقة'],
};

const dimensionedLabels: Array<{ pattern: RegExp; labels: Translation }> = [
  { pattern: /^Protection Jacket EXTRA (\d[\d., Xx-]*)$/i, labels: ['Koruyucu kılıf EXTRA', 'Protection jacket EXTRA', 'Защитный кожух EXTRA', 'غلاف حماية EXTRA'] },
  { pattern: /^Protection Jacket (\d[\d., Xx-]*)$/i, labels: ['Koruyucu kılıf', 'Protection jacket', 'Защитный кожух', 'غلاف حماية'] },
  { pattern: /^Bend Restrictor (ID[\d.,]+)$/i, labels: ['Bükülme sınırlayıcı', 'Bend restrictor', 'Ограничитель изгиба', 'محدد الانحناء'] },
  { pattern: /^Hose Arrestor (D\.[\d.,-]+)$/i, labels: ['Hortum emniyet tutucusu', 'Hose arrestor', 'Страховочный держатель рукава', 'مثبت أمان الخرطوم'] },
  { pattern: /^Stainless Ring (\d[\d., Xx-]*)$/i, labels: ['Paslanmaz halka', 'Stainless ring', 'Нержавеющее кольцо', 'حلقة مقاومة للصدأ'] },
  { pattern: /^COLLAR (60K M\d.*)$/i, labels: ['Bilezik', 'Collar', 'Муфта', 'طوق'] },
  { pattern: /^CONNECTOR (M\d.*)$/i, labels: ['Bağlantı elemanı', 'Connector', 'Соединитель', 'موصل'] },
];

export function localizeTechnicalText(value: string, locale: Locale): string {
  const name = localizeProductName(value, locale);
  if (name !== value) return name;
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[:.]$/, '');
  const label = labels[normalized];
  if (label) return label[indexes[locale]];
  for (const item of dimensionedLabels) {
    const match = value.match(item.pattern);
    if (match) return `${item.labels[indexes[locale]]} ${match[1]}`;
  }
  const mender = value.match(/^([\d+/]+") HOSE MENDER (C [\d+/]+")$/);
  if (mender) {
    const label: Translation = ['Hortum onarım bağlantısı', 'Hose mender', 'Ремонтный соединитель рукава', 'وصلة إصلاح الخرطوم'];
    return `${mender[1]} ${label[indexes[locale]]} ${mender[2]}`;
  }
  const colour = value.match(/^(SRM\d+ - )(NERO|BLU)$/);
  if (colour) {
    const label: Translation = colour[2] === 'NERO' ? ['Siyah', 'Black', 'Чёрный', 'أسود'] : ['Mavi', 'Blue', 'Синий', 'أزرق'];
    return `${colour[1]}${label[indexes[locale]]}`;
  }
  return value;
}
