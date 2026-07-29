import specialContentJson from './special-content.generated.json';
import type { Locale } from '@/i18n/routing';

export type SpecialNewsItem = {
  id: string;
  title: string;
  summary: string | null;
  publishedDate: string | null;
  dateText: string | null;
  detailUrl: string;
  localImage: string | null;
};

export type SpecialExhibitionItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  dateText: string | null;
  summary: string | null;
  location: string | null;
  stand: string | null;
  detailUrl: string;
  localImage: string | null;
};

export type SpecialCertificateItem = {
  id: string;
  title: string;
  documentUrl: string;
};

export type SpecialContent = {
  schemaVersion: number;
  generatedAt: string;
  rules: {
    listSourcesRestrictedToManifestIds: number[];
    detailDepth: number;
    longFormBodyCopied: boolean;
    unverifiedClaimsAdded: boolean;
  };
  sources: {
    downloads: string;
    exhibitions: string;
    news: string;
    certificates: string;
  };
  news: SpecialNewsItem[];
  exhibitions: SpecialExhibitionItem[];
  certificates: SpecialCertificateItem[];
};

export const specialContent = specialContentJson as SpecialContent;

type NewsTranslation = { title: string; summary: string };

type SpecialPageCopy = {
  officialSource: string;
  officialDetail: string;
  published: string;
  noImage: string;
  news: Record<string, NewsTranslation>;
  exhibition: {
    date: string;
    location: string;
    stand: string;
    current: string;
  };
  certificates: {
    listTitle: string;
    listDescription: string;
    document: string;
    verification: string;
    downloadsTitle: string;
    downloadsText: string;
    downloadsButton: string;
    sourceButton: string;
  };
};

export const specialPageCopy: Record<Locale, SpecialPageCopy> = {
  tr: {
    officialSource: 'Resmî kaynak',
    officialDetail: 'Resmî sayfada incele',
    published: 'Yayın tarihi',
    noImage: 'Bu kayıt için yerel görsel bulunmuyor.',
    news: {
      'news-1': { title: '2025 Sürdürülebilirlik Raporu', summary: 'Transfer Oil, 2025 sonuçlarını ve çevresel, sosyal ve yönetişim önceliklerini ele alan ikinci sürdürülebilirlik raporunu yayımladı.' },
      'news-2': { title: 'IFAT 2026 fuar değerlendirmesi', summary: 'IFAT Münih 2026 sonrasında kanal temizleme ve su jeti uygulamalarına yönelik termoplastik hortum teknolojilerine gösterilen ilgi değerlendiriliyor.' },
      'news-3': { title: 'Transfer Oil, Astrolyne iş birimini satın aldı', summary: 'Duyuru, yağlama ekipmanı pazarındaki hortum montaj kabiliyetlerini geliştirmeye yönelik kurumsal işlemi aktarıyor.' },
      'news-4': { title: 'Transfer Oil, EcoVadis Gümüş Madalya aldı', summary: 'Resmî duyuru, Transfer Oil’in EcoVadis değerlendirmesinde elde ettiği sonucu paylaşıyor.' },
      'news-5': { title: 'HELIX® ürün ailesinin içinde', summary: 'Transfer Oil uzmanları HELIX® ultra yüksek basınç hortumlarının teknolojisi, uygulamaları ve emniyet yaklaşımını anlatıyor.' },
    },
    exhibition: { date: 'Tarih', location: 'Konum', stand: 'Stand', current: 'Güncel fuar kaydı' },
    certificates: {
      listTitle: 'Resmî sertifika dokümanları',
      listDescription: 'Aşağıdaki doküman adları ve bağlantılar, Transfer Oil’in resmî sertifika sayfasındaki görünür kayıtlardan alınmıştır.',
      document: 'Dokümanı aç',
      verification: 'Kapsam, ürün uygunluğu ve güncel geçerlilik için açılan resmî doküman esas alınmalıdır.',
      downloadsTitle: 'Teknik kataloglar ve indirmeler',
      downloadsText: 'Güncel katalog ve teknik yayınlar için Transfer Oil’in resmî indirme sayfasını kullanabilirsiniz.',
      downloadsButton: 'Resmî indirme sayfası',
      sourceButton: 'Sertifika kaynağı',
    },
  },
  en: {
    officialSource: 'Official source',
    officialDetail: 'View on the official website',
    published: 'Published',
    noImage: 'No matching local image is available for this entry.',
    news: {
      'news-1': { title: '2025 Sustainability Report', summary: 'Transfer Oil has published its second sustainability report covering 2025 results and its environmental, social and governance priorities.' },
      'news-2': { title: 'IFAT 2026 exhibition review', summary: 'The official update reviews interest in thermoplastic hose technology for sewer cleaning and water blasting after IFAT Munich 2026.' },
      'news-3': { title: 'Transfer Oil acquires the Astrolyne business unit', summary: 'The announcement describes a corporate transaction intended to expand hose assembly capabilities for the lubrication equipment market.' },
      'news-4': { title: 'Transfer Oil achieves EcoVadis Silver Medal', summary: 'The official announcement reports Transfer Oil’s result in the EcoVadis assessment.' },
      'news-5': { title: 'Inside the HELIX® range', summary: 'Transfer Oil specialists discuss the technology, applications and safety approach of HELIX® ultra-high-pressure hoses.' },
    },
    exhibition: { date: 'Date', location: 'Location', stand: 'Stand', current: 'Current exhibition entry' },
    certificates: {
      listTitle: 'Official certificate documents',
      listDescription: 'The document names and links below are taken from visible entries on Transfer Oil’s official certificate page.',
      document: 'Open document',
      verification: 'Use the official document opened from the link to verify scope, product suitability and current validity.',
      downloadsTitle: 'Technical catalogues and downloads',
      downloadsText: 'Use Transfer Oil’s official download page for current catalogues and technical publications.',
      downloadsButton: 'Official download page',
      sourceButton: 'Certificate source',
    },
  },
  ru: {
    officialSource: 'Официальный источник',
    officialDetail: 'Открыть на официальном сайте',
    published: 'Дата публикации',
    noImage: 'Для этой записи нет соответствующего локального изображения.',
    news: {
      'news-1': { title: 'Отчёт об устойчивом развитии за 2025 год', summary: 'Transfer Oil опубликовала второй отчёт об устойчивом развитии с результатами 2025 года и приоритетами в области экологии, социальной политики и управления.' },
      'news-2': { title: 'Итоги выставки IFAT 2026', summary: 'Официальная новость оценивает интерес к термопластиковым рукавам для очистки канализации и водоструйных работ после IFAT Munich 2026.' },
      'news-3': { title: 'Transfer Oil приобретает подразделение Astrolyne', summary: 'В сообщении описана корпоративная сделка по развитию сборки рукавов для рынка смазочного оборудования.' },
      'news-4': { title: 'Transfer Oil получила серебряную медаль EcoVadis', summary: 'Официальное сообщение представляет результат Transfer Oil в оценке EcoVadis.' },
      'news-5': { title: 'Внутри линейки HELIX®', summary: 'Специалисты Transfer Oil рассказывают о технологии, применении и подходе к безопасности рукавов HELIX® сверхвысокого давления.' },
    },
    exhibition: { date: 'Дата', location: 'Место', stand: 'Стенд', current: 'Актуальная выставка' },
    certificates: {
      listTitle: 'Официальные документы сертификатов',
      listDescription: 'Названия и ссылки ниже извлечены из видимых записей на официальной странице сертификатов Transfer Oil.',
      document: 'Открыть документ',
      verification: 'Область действия, пригодность продукта и актуальность следует проверять по открытому официальному документу.',
      downloadsTitle: 'Технические каталоги и загрузки',
      downloadsText: 'Актуальные каталоги и технические материалы доступны на официальной странице загрузок Transfer Oil.',
      downloadsButton: 'Официальная страница загрузок',
      sourceButton: 'Источник сертификатов',
    },
  },
  ar: {
    officialSource: 'المصدر الرسمي',
    officialDetail: 'عرض على الموقع الرسمي',
    published: 'تاريخ النشر',
    noImage: 'لا تتوفر صورة محلية مطابقة لهذا السجل.',
    news: {
      'news-1': { title: 'تقرير الاستدامة لعام 2025', summary: 'نشرت Transfer Oil تقريرها الثاني للاستدامة متناولاً نتائج عام 2025 وأولويات البيئة والمجتمع والحوكمة.' },
      'news-2': { title: 'مراجعة معرض IFAT 2026', summary: 'يستعرض الخبر الرسمي الاهتمام بتقنيات الخراطيم البلاستيكية الحرارية لتنظيف شبكات الصرف والنفث المائي بعد IFAT Munich 2026.' },
      'news-3': { title: 'Transfer Oil تستحوذ على وحدة أعمال Astrolyne', summary: 'يشرح الإعلان صفقة مؤسسية تهدف إلى تطوير قدرات تجميع الخراطيم لسوق معدات التشحيم.' },
      'news-4': { title: 'Transfer Oil تحصل على الميدالية الفضية من EcoVadis', summary: 'يعرض الإعلان الرسمي نتيجة Transfer Oil في تقييم EcoVadis.' },
      'news-5': { title: 'داخل مجموعة HELIX®', summary: 'يناقش خبراء Transfer Oil تقنية خراطيم HELIX® فائقة الضغط وتطبيقاتها ونهج السلامة فيها.' },
    },
    exhibition: { date: 'التاريخ', location: 'الموقع', stand: 'الجناح', current: 'سجل المعرض الحالي' },
    certificates: {
      listTitle: 'وثائق الشهادات الرسمية',
      listDescription: 'أسماء الوثائق وروابطها أدناه مأخوذة من السجلات الظاهرة في صفحة شهادات Transfer Oil الرسمية.',
      document: 'فتح الوثيقة',
      verification: 'يجب الرجوع إلى الوثيقة الرسمية المفتوحة للتحقق من النطاق وملاءمة المنتج وسريانها الحالي.',
      downloadsTitle: 'الكتالوجات الفنية والتنزيلات',
      downloadsText: 'استخدم صفحة التنزيل الرسمية لـ Transfer Oil للحصول على أحدث الكتالوجات والمنشورات الفنية.',
      downloadsButton: 'صفحة التنزيل الرسمية',
      sourceButton: 'مصدر الشهادات',
    },
  },
};

export const corporateLandingCards: Array<{
  id: number;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
}> = [
  { id: 335, title: { tr: 'Hakkımızda', en: 'About Us', ru: 'О компании', ar: 'من نحن' }, description: { tr: 'Transfer Oil’in kurumsal profili ve üretim yaklaşımına genel bakış.', en: 'An overview of Transfer Oil’s corporate profile and manufacturing approach.', ru: 'Обзор профиля компании и производственного подхода Transfer Oil.', ar: 'نظرة عامة على ملف Transfer Oil المؤسسي ونهج التصنيع.' } },
  { id: 336, title: { tr: 'Şubeler', en: 'Branches', ru: 'Филиалы', ar: 'الفروع' }, description: { tr: 'Transfer Oil’in resmî sayfasındaki uluslararası organizasyon bilgileri.', en: 'International organisation information from Transfer Oil’s official page.', ru: 'Информация о международной структуре с официальной страницы Transfer Oil.', ar: 'معلومات الهيكل الدولي من صفحة Transfer Oil الرسمية.' } },
  { id: 337, title: { tr: 'Kariyer', en: 'Careers', ru: 'Карьера', ar: 'الوظائف' }, description: { tr: 'Transfer Oil’in resmî kariyer kaynağına yönlendiren kurumsal sayfa.', en: 'Corporate page linking to Transfer Oil’s official careers resource.', ru: 'Корпоративная страница со ссылкой на официальный раздел вакансий.', ar: 'صفحة مؤسسية تربط بمصدر الوظائف الرسمي لدى Transfer Oil.' } },
  { id: 338, title: { tr: 'Ar-Ge, Kalite ve Sertifikalar', en: 'R&D, Quality and Certificates', ru: 'НИОКР, качество и сертификаты', ar: 'البحث والتطوير والجودة والشهادات' }, description: { tr: 'Ar-Ge, kalite yaklaşımı ve resmî sertifika dokümanlarına erişim.', en: 'Access to R&D, quality information and official certificate documents.', ru: 'Информация о НИОКР, качестве и официальных документах сертификатов.', ar: 'الوصول إلى معلومات البحث والتطوير والجودة ووثائق الشهادات الرسمية.' } },
  { id: 339, title: { tr: 'Etik Kurallar', en: 'Code of Ethics', ru: 'Кодекс этики', ar: 'مدونة الأخلاقيات' }, description: { tr: 'Etik ilkeler ve sorumlu iş yapma çerçevesi hakkında resmî kaynak.', en: 'Official source for ethical principles and responsible business conduct.', ru: 'Официальный источник об этических принципах и ответственном ведении бизнеса.', ar: 'مصدر رسمي للمبادئ الأخلاقية وممارسات الأعمال المسؤولة.' } },
  { id: 340, title: { tr: 'Bölümler', en: 'Divisions', ru: 'Подразделения', ar: 'الأقسام' }, description: { tr: 'Transfer Oil ürün ve faaliyet bölümlerinin kurumsal görünümü.', en: 'Corporate view of Transfer Oil product and business divisions.', ru: 'Корпоративный обзор продуктовых и бизнес-подразделений Transfer Oil.', ar: 'عرض مؤسسي لأقسام المنتجات والأعمال لدى Transfer Oil.' } },
  { id: 341, title: { tr: 'Üretim Modeli ve Lojistik', en: 'Manufacturing Model & Logistics', ru: 'Производственная модель и логистика', ar: 'نموذج التصنيع والخدمات اللوجستية' }, description: { tr: 'Üretim organizasyonu ve lojistik yaklaşımına genel bakış.', en: 'An overview of the manufacturing organisation and logistics approach.', ru: 'Обзор организации производства и логистического подхода.', ar: 'نظرة عامة على تنظيم التصنيع والنهج اللوجستي.' } },
  { id: 342, title: { tr: 'Kalite ve Ar-Ge', en: 'Quality & R&D', ru: 'Качество и НИОКР', ar: 'الجودة والبحث والتطوير' }, description: { tr: 'Kalite kontrolü, araştırma ve teknik geliştirme yaklaşımı.', en: 'Quality control, research and technical development approach.', ru: 'Подход к контролю качества, исследованиям и техническому развитию.', ar: 'نهج مراقبة الجودة والبحث والتطوير التقني.' } },
  { id: 343, title: { tr: 'Termoplastik Hortum Avantajları', en: 'Thermoplastic Hose Benefits', ru: 'Преимущества термопластиковых рукавов', ar: 'مزايا الخراطيم البلاستيكية الحرارية' }, description: { tr: 'Termoplastik hortum yapısının uygulamaya bağlı avantajlarına genel bakış.', en: 'An overview of application-dependent benefits of thermoplastic hose construction.', ru: 'Обзор преимуществ конструкции термопластиковых рукавов в разных применениях.', ar: 'نظرة عامة على مزايا بنية الخراطيم البلاستيكية الحرارية حسب التطبيق.' } },
];

export function formatSpecialDate(locale: Locale, value: string | null): string | null {
  if (!value) return null;
  const localeTag = { tr: 'tr-TR', en: 'en-US', ru: 'ru-RU', ar: 'ar-SA' }[locale];
  return new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function formatSpecialDateRange(locale: Locale, start: string | null, end: string | null): string | null {
  const startText = formatSpecialDate(locale, start);
  const endText = formatSpecialDate(locale, end);
  if (!startText) return endText;
  return endText && end !== start ? `${startText} – ${endText}` : startText;
}

export function formatExhibitionStand(locale: Locale, value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/Booth\s+([^,]+),\s*Hall\s+(.+)/i);
  if (!match) return value;
  const labels = { tr: ['Stand', 'Salon'], en: ['Booth', 'Hall'], ru: ['Стенд', 'Павильон'], ar: ['الجناح', 'القاعة'] }[locale];
  return `${labels[0]} ${match[1]}, ${labels[1]} ${match[2]}`;
}
