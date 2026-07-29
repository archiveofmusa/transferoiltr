import type { TransferOilLocale } from '@/data/transferoil/registry';

export type ManifestPageCopy = {
  breadcrumb: string;
  overview: string;
  officialSource: string;
  sourceButton: string;
  sourceNote: string;
  technicalHeading: string;
  technicalEmpty: string;
  productReference: string;
  verifiedMeasurement: string;
  tableHeading: string;
  documents: string;
  document: string;
  viewDocument: string;
  childPages: string;
  relatedPages: string;
  benefits: string;
  applications: string;
  requestSupport: string;
  requestQuote: string;
  recordLabel: string;
  yes: string;
  no: string;
  tableLabel: string;
  externalNotice: string;
};

export const manifestPageCopy: Record<TransferOilLocale, ManifestPageCopy> = {
  tr: {
    breadcrumb: 'Sayfa yolu',
    overview: 'Genel Bakış',
    officialSource: 'Resmî Üretici Kaynağı',
    sourceButton: 'Teknik Dokümanı Görüntüle',
    sourceNote: 'Teknik değerler ve ürün uygunluğu için üretici dokümanı ile uygulama koşulları esas alınmalıdır.',
    technicalHeading: 'Teknik Veriler',
    technicalEmpty: 'Bu kayıt için doğrulanmış teknik değerler henüz yerel veri setinde bulunmuyor.',
    productReference: 'Ürün / kaynak başlığı',
    verifiedMeasurement: 'Doğrulanmış teknik değer',
    tableHeading: 'Teknik Tablolar',
    documents: 'Dokümanlar',
    document: 'Teknik doküman',
    viewDocument: 'Belgeyi Görüntüle',
    childPages: 'Alt Kategoriler ve Ürünler',
    relatedPages: 'İlgili Sayfalar',
    benefits: 'Öne Çıkan Noktalar',
    applications: 'Uygulamalar',
    requestSupport: 'Teknik Destek İste',
    requestQuote: 'Teklif Al',
    recordLabel: 'Kaynak Kayıt',
    yes: 'Evet',
    no: 'Hayır',
    tableLabel: 'Tablo',
    externalNotice: 'Bağlantı resmî Transfer Oil kaynağını yeni sekmede açar.',
  },
  en: {
    breadcrumb: 'Breadcrumb',
    overview: 'Overview',
    officialSource: 'Official Manufacturer Source',
    sourceButton: 'View Technical Document',
    sourceNote: 'Manufacturer documentation and application conditions must be used to verify technical values and product suitability.',
    technicalHeading: 'Technical Data',
    technicalEmpty: 'Verified technical values for this record are not yet available in the local data set.',
    productReference: 'Product / source heading',
    verifiedMeasurement: 'Verified technical value',
    tableHeading: 'Technical Tables',
    documents: 'Documents',
    document: 'Technical document',
    viewDocument: 'View Document',
    childPages: 'Subcategories and Products',
    relatedPages: 'Related Pages',
    benefits: 'Key Points',
    applications: 'Applications',
    requestSupport: 'Request Technical Support',
    requestQuote: 'Request a Quote',
    recordLabel: 'Source Record',
    yes: 'Yes',
    no: 'No',
    tableLabel: 'Table',
    externalNotice: 'The link opens the official Transfer Oil source in a new tab.',
  },
  ru: {
    breadcrumb: 'Навигационная цепочка',
    overview: 'Обзор',
    officialSource: 'Официальный источник производителя',
    sourceButton: 'Открыть технический документ',
    sourceNote: 'Технические параметры и применимость изделия следует проверять по документации производителя и условиям эксплуатации.',
    technicalHeading: 'Технические данные',
    technicalEmpty: 'Проверенные технические параметры этой записи пока отсутствуют в локальном наборе данных.',
    productReference: 'Название изделия / источника',
    verifiedMeasurement: 'Проверенное техническое значение',
    tableHeading: 'Технические таблицы',
    documents: 'Документы',
    document: 'Технический документ',
    viewDocument: 'Открыть документ',
    childPages: 'Подкатегории и продукция',
    relatedPages: 'Связанные страницы',
    benefits: 'Ключевые особенности',
    applications: 'Применения',
    requestSupport: 'Запросить техническую поддержку',
    requestQuote: 'Запросить предложение',
    recordLabel: 'Исходная запись',
    yes: 'Да',
    no: 'Нет',
    tableLabel: 'Таблица',
    externalNotice: 'Ссылка откроет официальный источник Transfer Oil в новой вкладке.',
  },
  ar: {
    breadcrumb: 'مسار التنقل',
    overview: 'نظرة عامة',
    officialSource: 'المصدر الرسمي للشركة المصنّعة',
    sourceButton: 'عرض المستند الفني',
    sourceNote: 'يجب الرجوع إلى وثائق الشركة المصنّعة وظروف التطبيق للتحقق من القيم الفنية ومدى ملاءمة المنتج.',
    technicalHeading: 'البيانات الفنية',
    technicalEmpty: 'لا تتوفر بعد قيم فنية موثقة لهذا السجل ضمن مجموعة البيانات المحلية.',
    productReference: 'اسم المنتج / المصدر',
    verifiedMeasurement: 'قيمة فنية موثقة',
    tableHeading: 'الجداول الفنية',
    documents: 'المستندات',
    document: 'مستند فني',
    viewDocument: 'عرض المستند',
    childPages: 'الفئات الفرعية والمنتجات',
    relatedPages: 'صفحات ذات صلة',
    benefits: 'النقاط الرئيسية',
    applications: 'التطبيقات',
    requestSupport: 'طلب دعم فني',
    requestQuote: 'طلب عرض سعر',
    recordLabel: 'سجل المصدر',
    yes: 'نعم',
    no: 'لا',
    tableLabel: 'جدول',
    externalNotice: 'يفتح الرابط مصدر Transfer Oil الرسمي في علامة تبويب جديدة.',
  },
};

const sectionLabels: Record<TransferOilLocale, Record<string, string>> = {
  tr: {
    Fittings: 'Bağlantı Elemanları',
    Hydraulic: 'Hidrolik',
    Industrial: 'Endüstriyel',
    UHP: 'UHP',
    Genel: 'Genel',
    Şirket: 'Kurumsal',
    Sürdürülebilirlik: 'Sürdürülebilirlik',
    Yasal: 'Yasal',
    İletişim: 'İletişim',
    İçerik: 'İçerik',
  },
  en: {
    Fittings: 'Fittings',
    Hydraulic: 'Hydraulic',
    Industrial: 'Industrial',
    UHP: 'UHP',
    Genel: 'General',
    Şirket: 'Company',
    Sürdürülebilirlik: 'Sustainability',
    Yasal: 'Legal',
    İletişim: 'Contact',
    İçerik: 'Content',
  },
  ru: {
    Fittings: 'Соединительная арматура',
    Hydraulic: 'Гидравлика',
    Industrial: 'Промышленное применение',
    UHP: 'UHP',
    Genel: 'Общее',
    Şirket: 'О компании',
    Sürdürülebilirlik: 'Устойчивое развитие',
    Yasal: 'Правовая информация',
    İletişim: 'Контакты',
    İçerik: 'Материалы',
  },
  ar: {
    Fittings: 'عناصر التوصيل',
    Hydraulic: 'الهيدروليك',
    Industrial: 'التطبيقات الصناعية',
    UHP: 'UHP',
    Genel: 'عام',
    Şirket: 'الشركة',
    Sürdürülebilirlik: 'الاستدامة',
    Yasal: 'المعلومات القانونية',
    İletişim: 'الاتصال',
    İçerik: 'المحتوى',
  },
};

const pageTypeLabels: Record<TransferOilLocale, Record<string, string>> = {
  tr: {
    'Kategori / seri': 'Kategori / Seri',
    Aksesuar: 'Aksesuar',
    'Bağlantı kategorisi': 'Bağlantı Kategorisi',
    Insert: 'Insert',
    Ferrule: 'Ferrule',
    'Ana sayfa': 'Ana Sayfa',
    Ürün: 'Ürün',
    'Kurumsal sayfa': 'Kurumsal Sayfa',
    'Adaptör kategorisi': 'Adaptör Kategorisi',
    Adaptör: 'Adaptör',
    'UHP fitting': 'UHP Bağlantı Elemanı',
    'Yasal sayfa': 'Yasal Sayfa',
    'İletişim sayfası': 'İletişim Sayfası',
    'Doküman sayfası': 'Doküman Sayfası',
    'Liste sayfası': 'Liste Sayfası',
  },
  en: {
    'Kategori / seri': 'Category / Series',
    Aksesuar: 'Accessory',
    'Bağlantı kategorisi': 'Connection Category',
    Insert: 'Insert',
    Ferrule: 'Ferrule',
    'Ana sayfa': 'Home Page',
    Ürün: 'Product',
    'Kurumsal sayfa': 'Company Page',
    'Adaptör kategorisi': 'Adapter Category',
    Adaptör: 'Adapter',
    'UHP fitting': 'UHP Fitting',
    'Yasal sayfa': 'Legal Page',
    'İletişim sayfası': 'Contact Page',
    'Doküman sayfası': 'Document Page',
    'Liste sayfası': 'List Page',
  },
  ru: {
    'Kategori / seri': 'Категория / серия',
    Aksesuar: 'Аксессуар',
    'Bağlantı kategorisi': 'Категория соединений',
    Insert: 'Вставка',
    Ferrule: 'Обжимная муфта',
    'Ana sayfa': 'Главная страница',
    Ürün: 'Продукт',
    'Kurumsal sayfa': 'Страница компании',
    'Adaptör kategorisi': 'Категория адаптеров',
    Adaptör: 'Адаптер',
    'UHP fitting': 'Фитинг UHP',
    'Yasal sayfa': 'Правовая страница',
    'İletişim sayfası': 'Страница контактов',
    'Doküman sayfası': 'Страница документов',
    'Liste sayfası': 'Страница списка',
  },
  ar: {
    'Kategori / seri': 'الفئة / السلسلة',
    Aksesuar: 'ملحق',
    'Bağlantı kategorisi': 'فئة التوصيلات',
    Insert: 'وصلة داخلية',
    Ferrule: 'حلقة كبس',
    'Ana sayfa': 'الصفحة الرئيسية',
    Ürün: 'منتج',
    'Kurumsal sayfa': 'صفحة الشركة',
    'Adaptör kategorisi': 'فئة المحولات',
    Adaptör: 'محول',
    'UHP fitting': 'وصلة UHP',
    'Yasal sayfa': 'صفحة قانونية',
    'İletişim sayfası': 'صفحة الاتصال',
    'Doküman sayfası': 'صفحة المستندات',
    'Liste sayfası': 'صفحة قائمة',
  },
};

export function getManifestSectionLabel(locale: TransferOilLocale, section: string): string {
  return sectionLabels[locale][section] ?? section;
}

export function getManifestPageTypeLabel(locale: TransferOilLocale, pageType: string): string {
  return pageTypeLabels[locale][pageType] ?? pageType;
}
