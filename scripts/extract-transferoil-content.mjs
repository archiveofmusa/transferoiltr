import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'transferoil_link_manifest.json');
const sourceMapPath = path.join(root, 'src', 'data', 'transferoil', 'source-map.generated.json');
const resolutionPath = path.join(root, 'src', 'data', 'transferoil', 'source-resolution.generated.json');
const assetManifestPath = path.join(root, 'public', 'assets', 'transfer-oil', 'asset-manifest.json');
const sourcePageManifestPath = path.join(root, 'public', 'assets', 'transfer-oil', 'source-page-manifest.json');
const sourceCacheRoot = path.join(root, '.cache', 'transferoil', 'source-html');
const outputPath = path.join(root, 'src', 'content', 'transferoil', 'pages.generated.json');
const reportPath = path.join(root, 'docs', 'reference', 'content-extraction-report.json');
const EXPECTED_ROWS = 343;
const locales = ['tr', 'en', 'ru', 'ar'];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback) {
  if (!(await exists(filePath))) return fallback;
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function decodeEntities(value) {
  const named = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    deg: '°', plusmn: '±', ndash: '–', mdash: '—', middot: '·',
  };
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, entity) => named[entity.toLowerCase()] ?? match);
}

function cleanText(value) {
  return decodeEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/[\u00a0\t\r ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function visibleLines(html) {
  const prepared = String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(?:p|div|li|tr|td|th|h[1-6]|section|article)>|<br\s*\/?>/gi, '\n');
  return cleanText(prepared).split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function firstMatch(html, pattern) {
  const match = pattern.exec(html);
  return match ? cleanText(match[1]) : null;
}

function extractSourceMetadata(html) {
  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const description = firstMatch(html, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    ?? firstMatch(html, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return { title, h1, description };
}

function extractTables(html) {
  const tables = [];
  for (const tableMatch of String(html ?? '').matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)) {
    const rows = [];
    for (const rowMatch of tableMatch[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
        .map((cell) => cleanText(cell[2]))
        .filter(Boolean);
      if (cells.length >= 2) rows.push(cells);
    }
    if (!rows.length) continue;
    const signature = rows.flat().join(' ').replace(/\s+/g, ' ').trim().toUpperCase();
    if (['PRESSURE BAR PSI', 'DIAMETER DASH INCH DN'].includes(signature)) continue;
    const firstRowHasHeaders = /<th\b/i.test(tableMatch[2].match(/<tr\b[^>]*>[\s\S]*?<\/tr>/i)?.[0] ?? '');
    tables.push({
      index: tables.length + 1,
      caption: firstMatch(tableMatch[0], /<caption\b[^>]*>([\s\S]*?)<\/caption>/i),
      headers: firstRowHasHeaders ? rows[0] : [],
      rows: firstRowHasHeaders ? rows.slice(1) : rows,
    });
  }
  return tables;
}

function extractTechnicalFacts(html) {
  const facts = [];
  const seen = new Set();
  const technical = /(?:\b(?:bar|psi|mpa|kpa|pa|dn|dash|sae|din|iso|en\s?\d|astm|bspp|nptf?|jic|ptfe|cng|lpg|h2)\b|°\s*c|\bmm\b|\binch(?:es)?\b|\bworking pressure\b|\bburst pressure\b|\btemperature\b)/i;
  for (const line of visibleLines(html)) {
    if (line.length < 3 || line.length > 240 || !technical.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(line);
    if (facts.length >= 64) break;
  }
  const measurementSet = new Set();
  const measurements = [];
  for (const fact of facts) {
    for (const match of fact.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:bar|psi|MPa|kPa|Pa|mm|cm|m|inch(?:es)?|°\s*C)\b/gi)) {
      const value = match[0].replace(/\s+/g, ' ').trim();
      const key = value.toLowerCase();
      if (!measurementSet.has(key)) {
        measurementSet.add(key);
        measurements.push(value);
      }
    }
  }
  return { facts, measurements };
}

function technicalContentRegion(html) {
  const source = String(html ?? '');
  const markers = [
    /<h1\b[^>]*(?:product_title|page-title|title)/i,
    /<section\b[^>]*id=["'](?:techtable|features|description)["']/i,
    /<h1\b/i,
    /<section\b[^>]*id=["']content-container["']/i,
    /<main\b/i,
  ];
  const starts = markers.map((pattern) => source.search(pattern)).filter((index) => index >= 0);
  if (!starts.length) return source;
  const start = Math.min(...starts);
  const footer = source.search(/<footer\b/i);
  return source.slice(start, footer > start ? footer : undefined);
}

function absoluteOfficialUrl(raw, baseUrl) {
  try {
    const url = new URL(decodeEntities(raw), baseUrl);
    if (!['transferoil.com', 'www.transferoil.com'].includes(url.hostname.toLowerCase())) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function extractDocuments(html, sourceUrl) {
  const documents = [];
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = absoluteOfficialUrl(match[2], sourceUrl);
    if (!url || !(/\.(?:pdf|docx?|xlsx?|zip)(?:[?#]|$)/i.test(url) || /\/get_download\.aspx(?:\?|$)/i.test(url))) continue;
    const extension = path.extname(new URL(url).pathname).replace('.', '').toUpperCase();
    documents.push({
      url,
      label: cleanText(match[4]) || 'Transfer Oil teknik dokümanı',
      fileType: extension && extension !== 'ASPX' ? extension : 'Resmî doküman',
      sourcePage: sourceUrl,
      opensInNewTab: true,
      forceDownload: false,
    });
  }
  return documents;
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

const exactTitleTranslations = {
  'Ana Sayfa': { tr: 'Ana Sayfa', en: 'Home', ru: 'Главная', ar: 'الرئيسية' },
  'About Us': { tr: 'Hakkımızda', en: 'About Us', ru: 'О компании', ar: 'من نحن' },
  Divisions: { tr: 'Bölümler', en: 'Divisions', ru: 'Подразделения', ar: 'الأقسام' },
  Branches: { tr: 'Şubeler', en: 'Branches', ru: 'Филиалы', ar: 'الفروع' },
  'Manufacturing Model': { tr: 'Üretim Modeli', en: 'Manufacturing Model', ru: 'Модель производства', ar: 'نموذج التصنيع' },
  'Logistics & Packaging': { tr: 'Lojistik ve Ambalaj', en: 'Logistics & Packaging', ru: 'Логистика и упаковка', ar: 'الخدمات اللوجستية والتعبئة' },
  Certificates: { tr: 'Sertifikalar', en: 'Certificates', ru: 'Сертификаты', ar: 'الشهادات' },
  'Code of Ethics': { tr: 'Etik Kurallar', en: 'Code of Ethics', ru: 'Кодекс этики', ar: 'مدونة الأخلاقيات' },
  'TP Hose Benefit': { tr: 'Termoplastik Hortum Avantajları', en: 'Thermoplastic Hose Benefits', ru: 'Преимущества термопластиковых рукавов', ar: 'مزايا الخراطيم اللدنة حرارياً' },
  'Quality R&D': { tr: 'Ar-Ge ve Kalite', en: 'Quality R&D', ru: 'Качество и НИОКР', ar: 'الجودة والبحث والتطوير' },
  'Manufacturing Model & Logistics': { tr: 'Üretim Modeli ve Lojistik', en: 'Manufacturing Model & Logistics', ru: 'Модель производства и логистика', ar: 'نموذج التصنيع والخدمات اللوجستية' },
  Careers: { tr: 'Kariyer', en: 'Careers', ru: 'Карьера', ar: 'الوظائف' },
  Sustainability: { tr: 'Sürdürülebilirlik', en: 'Sustainability', ru: 'Устойчивое развитие', ar: 'الاستدامة' },
  Downloads: { tr: 'Dokümanlar', en: 'Documents', ru: 'Документы', ar: 'الوثائق' },
  'Cookie Policy': { tr: 'Çerez Politikası', en: 'Cookie Policy', ru: 'Политика файлов cookie', ar: 'سياسة ملفات تعريف الارتباط' },
  'Copyright / Legal': { tr: 'Telif ve Yasal Bilgiler', en: 'Copyright / Legal', ru: 'Авторские права и правовая информация', ar: 'حقوق النشر والمعلومات القانونية' },
  Privacy: { tr: 'Gizlilik', en: 'Privacy', ru: 'Конфиденциальность', ar: 'الخصوصية' },
  'Sales Conditions': { tr: 'Satış Koşulları', en: 'Sales Conditions', ru: 'Условия продажи', ar: 'شروط البيع' },
  Contacts: { tr: 'İletişim', en: 'Contact', ru: 'Контакты', ar: 'اتصل بنا' },
  News: { tr: 'Haberler', en: 'News', ru: 'Новости', ar: 'الأخبار' },
  Exhibitions: { tr: 'Fuarlar', en: 'Exhibitions', ru: 'Выставки', ar: 'المعارض' },
  Fittings: { tr: 'Bağlantı Elemanları', en: 'Fittings', ru: 'Фитинги', ar: 'الوصلات' },
  Hydraulic: { tr: 'Hidrolik', en: 'Hydraulic', ru: 'Гидравлика', ar: 'الهيدروليكا' },
  Industrial: { tr: 'Endüstriyel', en: 'Industrial', ru: 'Промышленные решения', ar: 'الحلول الصناعية' },
  Accessories: { tr: 'Aksesuarlar', en: 'Accessories', ru: 'Принадлежности', ar: 'الملحقات' },
  Adapters: { tr: 'Adaptörler', en: 'Adapters', ru: 'Адаптеры', ar: 'المهايئات' },
  Ferrules: { tr: 'Ferruller', en: 'Ferrules', ru: 'Обжимные муфты', ar: 'حلقات الكبس' },
  'Medium Pressure': { tr: 'Orta Basınç', en: 'Medium Pressure', ru: 'Среднее давление', ar: 'الضغط المتوسط' },
  'High Pressure': { tr: 'Yüksek Basınç', en: 'High Pressure', ru: 'Высокое давление', ar: 'الضغط العالي' },
  'Very High Pressure': { tr: 'Çok Yüksek Basınç', en: 'Very High Pressure', ru: 'Сверхвысокое давление', ar: 'الضغط العالي جداً' },
  'Constant Pressure': { tr: 'Sabit Basınç', en: 'Constant Pressure', ru: 'Постоянное давление', ar: 'الضغط الثابت' },
  Specialities: { tr: 'Özel Çözümler', en: 'Specialities', ru: 'Специальные решения', ar: 'الحلول الخاصة' },
  Chemicals: { tr: 'Kimyasallar', en: 'Chemicals', ru: 'Химические среды', ar: 'المواد الكيميائية' },
  'Aggressive Chemicals': { tr: 'Agresif Kimyasallar', en: 'Aggressive Chemicals', ru: 'Агрессивные химические среды', ar: 'المواد الكيميائية العدوانية' },
  'Paint Spray & Solvents': { tr: 'Boya Püskürtme ve Solventler', en: 'Paint Spray & Solvents', ru: 'Распыление краски и растворители', ar: 'رش الطلاء والمذيبات' },
  Fuel: { tr: 'Yakıt', en: 'Fuel', ru: 'Топливо', ar: 'الوقود' },
  Gas: { tr: 'Gaz', en: 'Gas', ru: 'Газ', ar: 'الغاز' },
  Water: { tr: 'Su', en: 'Water', ru: 'Вода', ar: 'المياه' },
  'Air Cylinder Filling': { tr: 'Hava Tüpü Dolumu', en: 'Air Cylinder Filling', ru: 'Заправка воздушных баллонов', ar: 'تعبئة أسطوانات الهواء' },
  'Industrial Automation': { tr: 'Endüstriyel Otomasyon', en: 'Industrial Automation', ru: 'Промышленная автоматизация', ar: 'الأتمتة الصناعية' },
  'Ecology Sewer Cleaning': { tr: 'Kanal Temizliği', en: 'Ecology Sewer Cleaning', ru: 'Очистка канализации', ar: 'تنظيف شبكات الصرف' },
  'Power Wash': { tr: 'Basınçlı Yıkama', en: 'Power Wash', ru: 'Мойка под давлением', ar: 'الغسيل بالضغط' },
  'Female | Female': { tr: 'Dişi | Dişi', en: 'Female | Female', ru: 'Внутренняя | Внутренняя', ar: 'أنثى | أنثى' },
  'Male | Female': { tr: 'Erkek | Dişi', en: 'Male | Female', ru: 'Наружная | Внутренняя', ar: 'ذكر | أنثى' },
  'Male | Male': { tr: 'Erkek | Erkek', en: 'Male | Male', ru: 'Наружная | Наружная', ar: 'ذكر | ذكر' },
  'Proof Test': { tr: 'Basınç Testi', en: 'Proof Test', ru: 'Испытание давлением', ar: 'اختبار الضغط' },
  'HELIX Hoses': { tr: 'HELIX Hortumlar', en: 'HELIX Hoses', ru: 'Рукава HELIX', ar: 'خراطيم HELIX' },
};

const titleTerms = {
  tr: [['Ferrules', 'Ferruller'], ['Inserts', 'Insertler'], ['Hoses', 'Hortumlar'], ['Adapters', 'Adaptörler'], ['Accessories', 'Aksesuarlar'], ['Metric', 'Metrik'], ['Standard', 'Standart']],
  en: [],
  ru: [['Ferrules', 'Обжимные муфты'], ['Inserts', 'Вставки'], ['Hoses', 'Рукава'], ['Adapters', 'Адаптеры'], ['Accessories', 'Принадлежности'], ['Metric', 'Метрические'], ['Standard', 'Стандартные']],
  ar: [['Ferrules', 'حلقات الكبس'], ['Inserts', 'إدخالات'], ['Hoses', 'خراطيم'], ['Adapters', 'مهايئات'], ['Accessories', 'ملحقات'], ['Metric', 'متري'], ['Standard', 'قياسي']],
};

const sectionNames = {
  tr: { Fittings: 'bağlantı elemanları', Genel: 'genel', Hydraulic: 'hidrolik', Industrial: 'endüstriyel', UHP: 'ultra yüksek basınç', Şirket: 'kurumsal', İçerik: 'bilgilendirme', İletişim: 'iletişim', Yasal: 'yasal', Sürdürülebilirlik: 'sürdürülebilirlik' },
  en: { Fittings: 'fittings', Genel: 'general', Hydraulic: 'hydraulic', Industrial: 'industrial', UHP: 'ultra-high pressure', Şirket: 'corporate', İçerik: 'information', İletişim: 'contact', Yasal: 'legal', Sürdürülebilirlik: 'sustainability' },
  ru: { Fittings: 'фитингов', Genel: 'общих решений', Hydraulic: 'гидравлических решений', Industrial: 'промышленных решений', UHP: 'решений сверхвысокого давления', Şirket: 'корпоративной информации', İçerik: 'информации', İletişim: 'контактной информации', Yasal: 'правовой информации', Sürdürülebilirlik: 'устойчивого развития' },
  ar: { Fittings: 'الوصلات', Genel: 'الحلول العامة', Hydraulic: 'الحلول الهيدروليكية', Industrial: 'الحلول الصناعية', UHP: 'حلول الضغط الفائق', Şirket: 'المعلومات المؤسسية', İçerik: 'المعلومات', İletişim: 'معلومات الاتصال', Yasal: 'المعلومات القانونية', Sürdürülebilirlik: 'الاستدامة' },
};

function localizedTitle(sourceTitle, row, locale) {
  const exact = exactTitleTranslations[sourceTitle]?.[locale];
  if (exact) return exact;
  if (row.isProductOrPart || ['Ürün', 'Insert', 'Ferrule', 'Adaptör', 'UHP fitting'].includes(row.pageType)) return sourceTitle;
  return (titleTerms[locale] ?? []).reduce((title, [from, to]) => title.replace(new RegExp(`\\b${from}\\b`, 'g'), to), sourceTitle);
}

function isCorporate(row) {
  return ['Şirket', 'Yasal', 'Sürdürülebilirlik', 'İletişim', 'İçerik', 'Genel'].includes(row.mainSection);
}

function localizedCopy(locale, title, row, sourceAvailable) {
  const section = sectionNames[locale]?.[row.mainSection] ?? row.mainSection;
  const categoryLike = ['Kategori / seri', 'Bağlantı kategorisi', 'Adaptör kategorisi', 'Liste sayfası'].includes(row.pageType);
  const corporate = isCorporate(row);
  const statusTail = sourceAvailable
    ? {
      tr: 'Teknik ayrıntılar, resmî üretici kaynağından çıkarılan verilerle birlikte sunulur.',
      en: 'Technical details are presented together with data extracted from the official manufacturer source.',
      ru: 'Технические сведения приведены вместе с данными, извлечёнными из официального источника производителя.',
      ar: 'تُعرض التفاصيل الفنية مع البيانات المستخرجة من المصدر الرسمي للشركة المصنّعة.',
    }[locale]
    : {
      tr: 'Kaynak sayfa bu çalıştırmada okunamadığı için kesin teknik değerler için üretici dokümanı esas alınmalıdır.',
      en: 'The source page was unavailable in this run; the manufacturer documentation must therefore govern exact technical values.',
      ru: 'Исходная страница была недоступна при этом запуске; точные технические значения следует сверять с документацией производителя.',
      ar: 'تعذر الوصول إلى صفحة المصدر في هذا التشغيل؛ لذلك يجب اعتماد وثائق الشركة المصنّعة للقيم الفنية الدقيقة.',
    }[locale];

  if (locale === 'tr') {
    const summary = corporate
      ? `${title}, Transfer Oil Türkiye kapsamında ${section} hakkında doğrulanabilir ve güncel yönlendirme sunar.`
      : categoryLike
        ? `${title}, Transfer Oil ${section} portföyündeki ürün ve bağlantı seçeneklerini teknik yapıya göre gruplandırır.`
        : `${title}, Transfer Oil ${section} ürün ailesi içinde uygulamaya uygun bileşen seçimine yönelik teknik bir çözümdür.`;
    return {
      eyebrow: corporate ? 'TRANSFER OIL TÜRKİYE' : `${row.mainSection.toUpperCase()} · TEKNİK ÜRÜN BİLGİSİ`,
      summary,
      description: `${summary} ${statusTail} Nihai seçim; basınç, sıcaklık, akışkan, bağlantı standardı ve çalışma ortamı birlikte değerlendirilerek yapılmalıdır.`,
      benefits: corporate ? ['Resmî kaynakla ilişkilendirilmiş bilgi', 'Türkiye distribütör iletişimi', 'Teknik doküman yönlendirmesi'] : ['Ürün ailesine göre açık sınıflandırma', 'Uygulama koşullarına göre teknik seçim desteği', 'Uyumlu bağlantı ve doküman yönlendirmesi'],
      applications: corporate ? ['Kurumsal değerlendirme', 'Satın alma ve tedarik iletişimi', 'Teknik doküman talebi'] : ['Endüstriyel akışkan sistemleri', 'Teknik koşulları doğrulanmış hortum montajları', 'Bakım ve makine uygulamaları'],
    };
  }
  if (locale === 'en') {
    const summary = corporate
      ? `${title} provides verifiable guidance on ${section} within the scope of Transfer Oil Türkiye.`
      : categoryLike
        ? `${title} organises the product and connection options in the Transfer Oil ${section} portfolio by technical structure.`
        : `${title} is a technical solution within the Transfer Oil ${section} family for application-specific component selection.`;
    return {
      eyebrow: corporate ? 'TRANSFER OIL TÜRKİYE' : `${row.mainSection.toUpperCase()} · TECHNICAL PRODUCT INFORMATION`,
      summary,
      description: `${summary} ${statusTail} Final selection must consider pressure, temperature, fluid, connection standard and operating environment together.`,
      benefits: corporate ? ['Information linked to the official source', 'Türkiye distributor contact', 'Technical document guidance'] : ['Clear product-family classification', 'Technical selection support for operating conditions', 'Compatible connection and document guidance'],
      applications: corporate ? ['Corporate assessment', 'Purchasing and supply enquiries', 'Technical document requests'] : ['Industrial fluid systems', 'Hose assemblies with verified operating conditions', 'Maintenance and machinery applications'],
    };
  }
  if (locale === 'ru') {
    const summary = corporate
      ? `${title} содержит проверяемую информацию по теме ${section} в рамках деятельности Transfer Oil Türkiye.`
      : categoryLike
        ? `${title} систематизирует изделия и соединения в портфеле Transfer Oil для ${section} по их технической структуре.`
        : `${title} — техническое решение семейства Transfer Oil для ${section}, предназначенное для выбора компонентов под конкретное применение.`;
    return {
      eyebrow: corporate ? 'TRANSFER OIL TÜRKİYE' : `${row.mainSection.toUpperCase()} · ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ`,
      summary,
      description: `${summary} ${statusTail} При окончательном выборе необходимо совместно учитывать давление, температуру, рабочую среду, стандарт соединения и условия эксплуатации.`,
      benefits: corporate ? ['Связь с официальным источником', 'Контакт дистрибьютора в Турции', 'Помощь с техническими документами'] : ['Понятная классификация по семействам', 'Техническая поддержка выбора по условиям работы', 'Подбор совместимых соединений и документации'],
      applications: corporate ? ['Корпоративная оценка', 'Закупки и снабжение', 'Запрос технических документов'] : ['Промышленные системы транспортировки сред', 'Рукавные сборки с подтверждёнными условиями работы', 'Техническое обслуживание и машиностроение'],
    };
  }
  const summary = corporate
    ? `تقدم صفحة ${title} معلومات قابلة للتحقق حول ${section} ضمن نطاق Transfer Oil Türkiye.`
    : categoryLike
      ? `تنظم صفحة ${title} خيارات المنتجات والتوصيلات في مجموعة Transfer Oil الخاصة بـ${section} وفق بنيتها الفنية.`
      : `يمثل ${title} حلاً فنياً ضمن عائلة Transfer Oil الخاصة بـ${section} لاختيار المكوّن المناسب للتطبيق.`;
  return {
    eyebrow: corporate ? 'TRANSFER OIL TÜRKİYE' : `${row.mainSection.toUpperCase()} · معلومات المنتج الفنية`,
    summary,
    description: `${summary} ${statusTail} يجب أن يراعي الاختيار النهائي الضغط ودرجة الحرارة ونوع المائع ومعيار التوصيل وبيئة التشغيل معاً.`,
    benefits: corporate ? ['معلومات مرتبطة بالمصدر الرسمي', 'التواصل مع الموزع في تركيا', 'الإرشاد إلى الوثائق الفنية'] : ['تصنيف واضح حسب عائلة المنتج', 'دعم فني للاختيار وفق ظروف التشغيل', 'إرشاد إلى التوصيلات والوثائق المتوافقة'],
    applications: corporate ? ['التقييم المؤسسي', 'استفسارات الشراء والتوريد', 'طلبات الوثائق الفنية'] : ['أنظمة الموائع الصناعية', 'تجميعات خراطيم بظروف تشغيل متحقق منها', 'تطبيقات الصيانة وتصنيع الآلات'],
  };
}

function fitMeta(value, max = 158) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function normalizeAssetManifest(manifest) {
  if (Array.isArray(manifest)) return manifest;
  return Array.isArray(manifest?.assets) ? manifest.assets : [];
}

function pageAssetBlocked(asset) {
  const haystack = `${asset.localPath ?? ''} ${asset.originalUrl ?? ''} ${asset.guessedUse ?? ''}`.toLowerCase();
  if (asset.isPlaceholder) return true;
  return /(?:\/(?:web)?fonts?\/|fa-(?:brands|regular|solid)|materialdesignicons|transferoil\.svg|logo|user[_-]|search|(?:^|[/_-])arrow|linkedin|youtube|facebook|instagram|twitter|pintrest|skype|rss|flickr|dribbble|googleplus|favicon|sprite|spinner|loading|back-top|bg-direction|box-icons|list-icons|icon-footer|author-icon|comment-icon|view-icon|tag-icon|jquery-ui|ui-bg|ui-icons|fancybox|next-small|prev-small|blank\.gif)/i.test(haystack);
}

function pageAssetScore(asset, row) {
  const haystack = `${asset.localPath ?? ''} ${asset.originalUrl ?? ''} ${asset.guessedUse ?? ''}`.toLowerCase();
  const sourcePages = asset.sourcePages ?? (asset.sourcePage ? [asset.sourcePage] : []);
  const titleTokens = String(row.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((token) => token.length >= 3);
  let score = 0;
  if (sourcePages.length === 1 && sourcePages[0] === row.sourceUrl) score += 100;
  else if (sourcePages.includes(row.sourceUrl)) score += Math.max(10, 60 - sourcePages.length * 3);
  if (/product|ürün|teknik görsel|technical|hose|hortum|insert|ferrule|adapter|fitting/.test(haystack)) score += 45;
  if (/hero|slider|video|category|kategori|corporate|kurumsal|certificate|news|exhibition/.test(haystack)) score += 20;
  if (titleTokens.some((token) => haystack.includes(token))) score += 35;
  if (haystack.includes(`/${String(row.id).padStart(3, '0')}-`)) score += 60;
  if ((asset.width ?? 0) >= 280 || (asset.height ?? 0) >= 220) score += 10;
  if (/decorative|legacy-ui|sayfa medyası/.test(haystack)) score -= 25;
  return score;
}

function bindPageAssets(assetRecords, relatedSourcePages, row) {
  const directAssetPaths = new Set(relatedSourcePages.flatMap((sourcePage) => sourcePage?.localAssets ?? []));
  const relatedSourceUrls = new Set(relatedSourcePages.map((sourcePage) => sourcePage?.sourceUrl).filter(Boolean));
  const productLike = ['Ürün', 'Insert', 'Ferrule', 'Adaptör', 'UHP fitting', 'Aksesuar'].includes(row.pageType);
  const productCode = String(row.title ?? '').split(/\s+(?:-|\|)\s+/)[0].trim().toLowerCase();
  return uniqueBy(assetRecords.filter((asset) => {
    if (!asset.localPath || pageAssetBlocked(asset)) return false;
    const sourcePages = asset.sourcePages ?? (asset.sourcePage ? [asset.sourcePage] : []);
    if (sourcePages.length > 16) return false;
    const related = sourcePages.some((sourceUrl) => relatedSourceUrls.has(sourceUrl)) || directAssetPaths.has(asset.localPath);
    if (!related) return false;
    if (!productLike || sourcePages.includes(row.sourceUrl)) return true;
    const haystack = `${asset.localPath ?? ''} ${asset.originalUrl ?? ''}`.toLowerCase();
    return productCode.length >= 2 && haystack.includes(productCode.replace(/[^a-z0-9]+/g, '-'))
      || productCode.length >= 2 && haystack.includes(productCode.replace(/[^a-z0-9]+/g, ''));
  }), (asset) => asset.localPath)
    .sort((left, right) => pageAssetScore(right, row) - pageAssetScore(left, row))
    .filter((asset) => pageAssetScore(asset, row) > 10)
    .slice(0, 12)
    .map((asset) => ({
      assetId: asset.id ?? null,
      localPath: asset.localPath,
      guessedUse: asset.guessedUse ?? 'sayfa medyası',
      width: asset.width ?? null,
      height: asset.height ?? null,
      mimeType: asset.outputMimeType ?? asset.fileType ?? null,
      isPlaceholder: false,
    }));
}

function sourceTitle(row) {
  return row.title || row.pageOrProduct || row.seriesOrGroup || row.subCategory || row.category || row.mainSection || `Transfer Oil ${row.id}`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const manifest = await readJson(manifestPath, null);
  const manifestRows = Array.isArray(manifest) ? manifest : manifest?.rows;
  if (!Array.isArray(manifestRows) || manifestRows.length !== EXPECTED_ROWS) throw new Error(`Manifest satır sayısı 343 değil: ${manifestRows?.length ?? 0}`);

  const sourceMap = await readJson(sourceMapPath, null);
  if (!Array.isArray(sourceMap?.rows) || sourceMap.rows.length !== EXPECTED_ROWS) throw new Error('343 kayıtlı source-map bulunamadı.');
  const resolutions = await readJson(resolutionPath, { records: [] });
  const resolutionById = new Map((resolutions.records ?? []).map((record) => [record.id, record]));
  const assetManifest = await readJson(assetManifestPath, { assets: [] });
  const sourcePageManifest = await readJson(sourcePageManifestPath, { pages: [] });
  const assets = normalizeAssetManifest(assetManifest);
  const sourcePageById = new Map((sourcePageManifest.pages ?? []).map((page) => [page.id, page]));
  const sourceRowsById = new Map(sourceMap.rows.map((row) => [row.id, row]));
  const pages = [];
  const unavailableIds = [];
  let tableCount = 0;
  let technicalFactCount = 0;
  let documentLinkCount = 0;
  let pageAssetBindingCount = 0;

  for (const manifestRow of manifestRows) {
    const row = sourceRowsById.get(manifestRow.id);
    if (!row) throw new Error(`Source-map kaydı eksik: ${manifestRow.id}`);
    const cachePath = path.join(sourceCacheRoot, `${String(row.id).padStart(3, '0')}.html`);
    const sourceAvailable = await exists(cachePath);
    const html = sourceAvailable ? await readFile(cachePath, 'utf8') : '';
    if (!sourceAvailable) unavailableIds.push(row.id);
    const sourcePage = sourcePageById.get(row.id) ?? null;
    const resolution = resolutionById.get(row.id) ?? null;
    const resolvedUrl = resolution?.resolvedUrl || sourcePage?.finalUrl || row.resolvedUrl || row.sourceUrl;
    const metadata = extractSourceMetadata(html);
    const tables = sourceAvailable ? extractTables(html) : [];
    const technical = sourceAvailable ? extractTechnicalFacts(technicalContentRegion(html)) : { facts: [], measurements: [] };
    const directDocuments = sourceAvailable ? extractDocuments(html, resolvedUrl) : [];
    const manifestDocuments = (sourcePage?.externalDocuments ?? []).map((url) => ({
      url,
      label: 'Transfer Oil teknik dokümanı',
      fileType: path.extname(new URL(url).pathname).replace('.', '').toUpperCase() || 'Doküman',
      sourcePage: row.sourceUrl,
      opensInNewTab: true,
      forceDownload: false,
    }));
    const officialDocumentPage = row.pageType === 'Doküman sayfası' || /Certificates/i.test(row.hierarchy)
      ? [{
        url: resolvedUrl,
        label: row.pageType === 'Doküman sayfası' ? 'Transfer Oil resmî doküman sayfası' : 'Transfer Oil resmî sertifika sayfası',
        fileType: 'Web',
        sourcePage: row.sourceUrl,
        opensInNewTab: true,
        forceDownload: false,
      }]
      : [];
    const documentLinks = uniqueBy([...directDocuments, ...manifestDocuments, ...officialDocumentPage], (document) => document.url);
    if (sourcePage) sourcePage.externalDocuments = uniqueBy(documentLinks, (document) => document.url).map((document) => document.url);
    const relatedSourcePages = [sourcePage, ...(row.ancestorIds ?? []).map((id) => sourcePageById.get(id)).filter(Boolean)];
    const boundAssets = bindPageAssets(assets, relatedSourcePages, row);
    const titleBase = sourceTitle(row);
    const extractionStatus = sourceAvailable ? 'complete' : 'source-unavailable';
    const translations = {};
    for (const locale of locales) {
      const title = localizedTitle(titleBase, row, locale);
      const copy = localizedCopy(locale, title, row, sourceAvailable);
      translations[locale] = {
        title,
        eyebrow: copy.eyebrow,
        summary: copy.summary,
        description: copy.description,
        benefits: copy.benefits,
        applications: copy.applications,
        metadataTitle: `${title} | Transfer Oil Türkiye`,
        metadataDescription: fitMeta(copy.summary),
        altText: locale === 'tr' ? `${title} teknik ürün görseli` : locale === 'en' ? `${title} technical product visual` : locale === 'ru' ? `Техническое изображение ${title}` : `صورة فنية لمنتج ${title}`,
        extractionStatus,
      };
    }

    tableCount += tables.length;
    technicalFactCount += technical.facts.length;
    documentLinkCount += documentLinks.length;
    pageAssetBindingCount += boundAssets.length;
    pages.push({
      id: row.id,
      registryKey: row.registryKey,
      sourceUrl: row.sourceUrl,
      resolvedUrl,
      route: row.routePath,
      pageType: row.pageType,
      mainSection: row.mainSection,
      hierarchy: row.hierarchy,
      technicalData: {
        facts: technical.facts,
        measurements: technical.measurements,
      },
      sourceExtraction: {
        status: extractionStatus,
        sourceTitle: metadata.title,
        sourceHeading: metadata.h1,
        sourceMetaDescription: metadata.description,
        httpStatus: sourcePage?.httpStatus ?? null,
        resolutionStatus: resolution?.finalStatus ?? row.finalStatus ?? 'direct-source',
        note: sourceAvailable
          ? 'Teknik gerçekler ve tablolar resmî kaynak HTML snapshotundan otomatik olarak çıkarıldı; açıklama metinleri özgün olarak yeniden yazıldı.'
          : 'Kaynak HTML bu çalıştırmada kullanılamadı; hiçbir teknik değer uydurulmadı.',
      },
      tables,
      assets: boundAssets,
      documentLinks,
      relatedPageIds: row.childIds?.length ? row.childIds : (row.parentId ? [row.parentId] : []),
      translations,
      lastExtractionTimestamp: generatedAt,
    });
  }

  const requiredFields = ['title', 'eyebrow', 'summary', 'description', 'metadataTitle', 'metadataDescription', 'altText', 'extractionStatus'];
  const translationErrors = [];
  for (const page of pages) {
    for (const locale of locales) {
      const translation = page.translations[locale];
      for (const field of requiredFields) if (!String(translation[field] ?? '').trim()) translationErrors.push(`${page.id}:${locale}:${field}`);
      if (!translation.benefits.length) translationErrors.push(`${page.id}:${locale}:benefits`);
      if (!translation.applications.length) translationErrors.push(`${page.id}:${locale}:applications`);
    }
  }

  const summary = {
    expectedPageCount: EXPECTED_ROWS,
    pageCount: pages.length,
    translationLocaleCount: locales.length,
    translationRecordCount: pages.length * locales.length,
    requiredTranslationFieldsComplete: translationErrors.length === 0,
    extractionCompleteCount: pages.length - unavailableIds.length,
    sourceUnavailableCount: unavailableIds.length,
    sourceUnavailableIds: unavailableIds,
    tableCount,
    technicalFactCount,
    documentLinkCount,
    pageAssetBindingCount,
    uniqueLocalAssetCount: new Set(pages.flatMap((page) => page.assets.map((asset) => asset.localPath))).size,
    placeholderBindingCount: pages.reduce((total, page) => total + page.assets.filter((asset) => asset.isPlaceholder).length, 0),
    pagesWithLocalAssets: pages.filter((page) => page.assets.length > 0).length,
    productOrPartPages: sourceMap.rows.filter((row) => row.isProductOrPart).length,
    productOrPartPagesWithLocalAssets: pages.filter((page) => sourceRowsById.get(page.id)?.isProductOrPart && page.assets.length > 0).length,
    productOrPartPagesWithoutDiscoverableSpecificAssetIds: pages.filter((page) => sourceRowsById.get(page.id)?.isProductOrPart && page.assets.length === 0).map((page) => page.id),
    runtimeAssetBindingsAreLocalOnly: pages.every((page) => page.assets.every((asset) => /^\/assets\/transfer-oil\//.test(asset.localPath))),
    runtimeAssetBindingsContainRemoteMetadata: pages.some((page) => page.assets.some((asset) => Object.hasOwn(asset, 'originalUrl'))),
  };
  const output = { schemaVersion: 2, generatedAt, sourceManifest: 'transferoil_link_manifest.json', summary, pages };
  const report = {
    generatedAt,
    policy: {
      sourceOfTruth: 'transferoil_link_manifest.json',
      sourceCache: '.cache/transferoil/source-html (public dışı)',
      copiedLongSourceCopy: false,
      inventedTechnicalValues: false,
      locales,
    },
    summary,
    translationErrors,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  if (sourcePageManifest.pages) {
    sourcePageManifest.summary = { ...sourcePageManifest.summary, externalDocumentLinks: documentLinkCount };
    await writeFile(sourcePageManifestPath, `${JSON.stringify(sourcePageManifest, null, 2)}\n`, 'utf8');
  }
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output: path.relative(root, outputPath), report: path.relative(root, reportPath), ...summary }, null, 2));
  if (pages.length !== EXPECTED_ROWS || translationErrors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
