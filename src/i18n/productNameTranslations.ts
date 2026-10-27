/**
 * Presentation-only catalogue terminology. Source records, routes and part codes
 * stay untouched. Only reviewed whole names/descriptors are translated; there
 * is intentionally no general word-by-word replacement of manufacturer codes.
 */
export type ProductNameLocale = 'tr' | 'en' | 'ru' | 'ar';
export type LocalizedProductName = Record<ProductNameLocale, string>;
type NameRow = readonly [source: string, tr: string, en: string, ru: string, ar: string];

const rows: NameRow[] = [
  ['Fittings', 'Bağlantı Elemanları', 'Fittings', 'Соединительные элементы', 'عناصر التوصيل'],
  ['Accessories', 'Aksesuarlar', 'Accessories', 'Принадлежности', 'الملحقات'],
  ['Adapters', 'Adaptörler', 'Adapters', 'Переходники', 'المحوّلات'],
  ['Ferrules', 'Yüksükler', 'Ferrules', 'Обжимные муфты', 'جلب الكبس'],
  ['Standard Ferrules', 'Standart Yüksükler', 'Standard Ferrules', 'Стандартные обжимные муфты', 'جلب كبس قياسية'],
  ['Standard Inserts', 'Standart Bağlantı Uçları', 'Standard Inserts', 'Стандартные штуцеры', 'وصلات طرفية قياسية'],
  ['Micro Bore Ferrules', 'Micro Bore Yüksükler', 'Micro Bore Ferrules', 'Обжимные муфты Micro Bore', 'جلب كبس Micro Bore'],
  ['Micro Bore Inserts', 'Micro Bore Bağlantı Uçları', 'Micro Bore Inserts', 'Штуцеры Micro Bore', 'وصلات طرفية Micro Bore'],
  ['Micro Bore Other Inserts', 'Diğer Micro Bore Bağlantı Uçları', 'Other Micro Bore Inserts', 'Другие штуцеры Micro Bore', 'وصلات طرفية أخرى من Micro Bore'],
  ['VHP Ferrules', 'VHP Yüksükler', 'VHP Ferrules', 'Обжимные муфты VHP', 'جلب كبس VHP'],
  ['VHP Inserts', 'VHP Bağlantı Uçları', 'VHP Inserts', 'Штуцеры VHP', 'وصلات طرفية VHP'],
  ['VHP Hoses', 'VHP Hortumlar', 'VHP Hoses', 'Рукава VHP', 'خراطيم VHP'],
  ['H2 Ferrule', 'H2 Yüksükler', 'H2 Ferrules', 'Обжимные муфты H2', 'جلب كبس H2'],
  ['H2 Hoses', 'H2 Hortumlar', 'H2 Hoses', 'Рукава H2', 'خراطيم H2'],
  ['H2 Inserts', 'H2 Bağlantı Uçları', 'H2 Inserts', 'Штуцеры H2', 'وصلات طرفية H2'],
  ['Hydraulic', 'Hidrolik', 'Hydraulic', 'Гидравлика', 'الهيدروليك'],
  ['Industrial', 'Endüstriyel', 'Industrial', 'Промышленность', 'التطبيقات الصناعية'],
  ['Constant Pressure', 'Sabit Basınç', 'Constant Pressure', 'Постоянное давление', 'ضغط ثابت'],
  ['High Pressure', 'Yüksek Basınç', 'High Pressure', 'Высокое давление', 'ضغط عالٍ'],
  ['Medium Pressure', 'Orta Basınç', 'Medium Pressure', 'Среднее давление', 'ضغط متوسط'],
  ['Very High Pressure', 'Çok Yüksek Basınç', 'Very High Pressure', 'Очень высокое давление', 'ضغط عالٍ جداً'],
  ['Specialities', 'Özel Uygulamalar', 'Specialities', 'Специальные применения', 'تطبيقات خاصة'],
  ['Twin Hose', 'İkiz Hortum', 'Twin Hose', 'Сдвоенный рукав', 'خرطوم مزدوج'],
  ['Chemicals', 'Kimyasal Transfer', 'Chemicals', 'Перекачка химикатов', 'نقل المواد الكيميائية'],
  ['Aggressive Chemicals', 'Agresif Kimyasallar', 'Aggressive Chemicals', 'Агрессивные химикаты', 'مواد كيميائية عدوانية'],
  ['Paint Spray & Solvents', 'Boya Püskürtme ve Solventler', 'Paint Spray & Solvents', 'Распыление красок и растворители', 'رش الطلاء والمذيبات'],
  ['Fuel', 'Yakıt', 'Fuel', 'Топливо', 'الوقود'],
  ['Gas', 'Gaz', 'Gas', 'Газ', 'الغاز'],
  ['Air Cylinder Filling', 'Hava Tüpü Dolumu', 'Air Cylinder Filling', 'Заправка воздушных баллонов', 'تعبئة أسطوانات الهواء'],
  ['Industrial Automation', 'Endüstriyel Otomasyon', 'Industrial Automation', 'Промышленная автоматизация', 'الأتمتة الصناعية'],
  ['Water', 'Su', 'Water', 'Вода', 'المياه'],
  ['Ecology Sewer Cleaning', 'Ecology Kanalizasyon Temizliği', 'Ecology Sewer Cleaning', 'Очистка канализации Ecology', 'تنظيف المجاري Ecology'],
  ['Power Wash', 'Power Wash Basınçlı Yıkama', 'Power Wash', 'Мойка под давлением Power Wash', 'الغسيل بالضغط Power Wash'],
  ['HELIX Hoses', 'HELIX Hortumlar', 'HELIX Hoses', 'Рукава HELIX', 'خراطيم HELIX'],
  ['Metric', 'Metrik', 'Metric', 'Метрическая резьба', 'متري'],
  ['METRIC', 'Metrik', 'Metric', 'Метрическая резьба', 'متري'],
  ['Metric 24° - 60', 'Metrik 24° - 60', 'Metric 24° - 60', 'Метрическое соединение 24° - 60', 'وصلة مترية 24° - 60'],
  ['Metric Standpipe', 'Metrik Boru Ucu', 'Metric Standpipe', 'Метрический трубный наконечник', 'طرف أنبوب متري'],
  ['Standpipe', 'Boru Ucu', 'Standpipe', 'Трубный наконечник', 'طرف أنبوب'],
  ['GAS100 External Cone', 'GAS100 Dış Konik', 'GAS100 External Cone', 'GAS100 с наружным конусом', 'GAS100 بمخروط خارجي'],
  ['FLAT SEAL', 'Düz Sızdırmazlık Yüzeyi', 'Flat Seal', 'Плоское уплотнение', 'إحكام مسطح'],
  ['FLAT SEAL METRIC', 'Metrik Düz Sızdırmazlık Yüzeyi', 'Flat Seal Metric', 'Метрическое плоское уплотнение', 'إحكام مسطح متري'],
  ['Female | Female', 'Dişi | Dişi', 'Female | Female', 'Внутренняя резьба | Внутренняя резьба', 'أنثى | أنثى'],
  ['Male | Female', 'Erkek | Dişi', 'Male | Female', 'Наружная резьба | Внутренняя резьба', 'ذكر | أنثى'],
  ['Male | Male', 'Erkek | Erkek', 'Male | Male', 'Наружная резьба | Наружная резьба', 'ذكر | ذكر'],
  ['Proof Test', 'Doğrulama Basıncı Testi', 'Proof Test', 'Испытание проверочным давлением', 'اختبار ضغط التحقق'],
  ['Tube Stub for CNG', 'CNG için Boru Ucu', 'Tube Stub for CNG', 'Трубный наконечник для CNG', 'طرف أنبوب لتطبيقات CNG'],
  ['UHP Ferrules', 'UHP Yüksükler', 'UHP Ferrules', 'Обжимные муфты UHP', 'جلب كبس UHP'],
  ['UHP Accessories', 'UHP Aksesuarları', 'UHP Accessories', 'Принадлежности UHP', 'ملحقات UHP'],
  ['UHP Certificates', 'UHP Sertifikaları', 'UHP Certificates', 'Сертификаты UHP', 'شهادات UHP'],
  ['UHP Fittings', 'UHP Bağlantı Elemanları', 'UHP Fittings', 'Соединительные элементы UHP', 'عناصر توصيل UHP'],
];

// Descriptors exclude the catalogue part code before " - ". Matching is exact,
// so e.g. SXD is never mistaken for English text or modified in any locale.
const descriptorRows: NameRow[] = [
  ['HOSE MENDER', 'Hortum Onarım Bağlantısı', 'Hose Mender', 'Ремонтное соединение рукава', 'وصلة إصلاح الخرطوم'],
  ['KINK PROTECTOR', 'Hortum Katlanma Koruyucusu', 'Kink Protector', 'Защита от перегиба рукава', 'واقي انثناء الخرطوم'],
  ['MULTILINE HOSE SPLITTER', 'Çoklu Hortum Ayırma Aleti', 'Multiline Hose Splitter', 'Разделитель многолинейных рукавов', 'أداة فصل الخراطيم المتعددة'],
  ['SPARE BLADE FOR HOSE SPLITTER', 'Hortum Ayırma Aleti Yedek Bıçağı', 'Spare Blade for Hose Splitter', 'Запасное лезвие разделителя рукавов', 'شفرة بديلة لأداة فصل الخراطيم'],
  ['GO NO GO GAUGE', 'Geçer / Geçmez Kontrol Mastarı', 'Go / No-Go Gauge', 'Предельный калибр «проход / непроход»', 'مقياس قبول ورفض'],
  ['OR DIN 24° FEMALE HEAVY', 'OR DIN 24° Dişi Ağır Seri', 'OR DIN 24° Female Heavy Series', 'OR DIN 24° с внутренней резьбой, тяжёлая серия', 'OR DIN 24° أنثى للسلسلة الثقيلة'],
  ['OR DIN 24° FEMALE LIGHT', 'OR DIN 24° Dişi Hafif Seri', 'OR DIN 24° Female Light Series', 'OR DIN 24° с внутренней резьбой, лёгкая серия', 'OR DIN 24° أنثى للسلسلة الخفيفة'],
  ['F90-DKOL C LIGHT', 'F90-DKOL C Hafif Seri', 'F90-DKOL C Light Series', 'F90-DKOL C, лёгкая серия', 'F90-DKOL C للسلسلة الخفيفة'],
  ['F90-DKOS C HEAVY', 'F90-DKOS C Ağır Seri', 'F90-DKOS C Heavy Series', 'F90-DKOS C, тяжёлая серия', 'F90-DKOS C للسلسلة الثقيلة'],
  ['STANDPIPE C', 'Boru Ucu C', 'Standpipe C', 'Трубный наконечник C', 'طرف أنبوب C'],
  ['STANDPIPE 90°C', '90° Boru Ucu C', '90° Standpipe C', 'Трубный наконечник 90° C', 'طرف أنبوب 90° C'],
  ['STANDPIPE 90 C', '90° Boru Ucu C', '90° Standpipe C', 'Трубный наконечник 90° C', 'طرف أنبوب 90° C'],
  ['STANDPIPE 45 C', '45° Boru Ucu C', '45° Standpipe C', 'Трубный наконечник 45° C', 'طرف أنبوب 45° C'],
  ['JIC FEMALE 7/16', 'JIC Dişi 7/16', 'JIC Female 7/16', 'JIC с внутренней резьбой 7/16', 'JIC أنثى 7/16'],
  ['MALE BSPP PUSH-ON', 'Erkek BSPP PUSH-ON', 'Male BSPP PUSH-ON', 'PUSH-ON BSPP с наружной резьбой', 'PUSH-ON BSPP ذكر'],
  ['STANDPIPE PUSH-ON', 'PUSH-ON Boru Ucu', 'PUSH-ON Standpipe', 'Трубный наконечник PUSH-ON', 'طرف أنبوب PUSH-ON'],
  ['Steel Braid', 'Çelik Örgü', 'Steel Braid', 'Стальная оплётка', 'جديلة فولاذية'],
  ['Two Steel Braids', 'İki Kat Çelik Örgü', 'Two Steel Braids', 'Две стальные оплётки', 'طبقتان من الجدائل الفولاذية'],
  ['HDH HEAVY DUTY HYDRAULIC', 'HDH Ağır Hizmet Tipi Hidrolik Hortum', 'HDH Heavy Duty Hydraulic', 'HDH для тяжёлых условий гидравлики', 'HDH للتطبيقات الهيدروليكية الشاقة'],
  ['HR8 HYBRID REINFORCEMENT', 'HR8 Hibrit Takviye', 'HR8 Hybrid Reinforcement', 'HR8 с гибридным армированием', 'HR8 بتقوية هجينة'],
  ['2SB TWO STEEL BRAIDS ANTIABRASION TWIN', '2SB İki Kat Çelik Örgülü, Aşınmaya Dayanıklı İkiz Hortum', '2SB Two Steel Braids, Abrasion-Resistant Twin Hose', '2SB, две стальные оплётки, износостойкий сдвоенный рукав', '2SB بجديلتين فولاذيتين، خرطوم مزدوج مقاوم للتآكل'],
  ['1SB STEEL BRAID ANTIABRASION TWIN', '1SB Çelik Örgülü, Aşınmaya Dayanıklı İkiz Hortum', '1SB Steel Braid, Abrasion-Resistant Twin Hose', '1SB, стальная оплётка, износостойкий сдвоенный рукав', '1SB بجديلة فولاذية، خرطوم مزدوج مقاوم للتآكل'],
  ['JACK HOSE', 'Kriko Hortumu', 'Jack Hose', 'Рукав для домкрата', 'خرطوم الرافعة'],
  ['Male O-Ring Boss', 'Erkek O-Ring Boss', 'Male O-Ring Boss', 'O-Ring Boss с наружной резьбой', 'O-Ring Boss ذكر'],
  ['Tube Stub for CNG', 'CNG için Boru Ucu', 'Tube Stub for CNG', 'Трубный наконечник для CNG', 'طرف أنبوب لتطبيقات CNG'],
  ['VHP DKOL FEMALE', 'VHP DKOL Dişi', 'VHP DKOL Female', 'VHP DKOL с внутренней резьбой', 'VHP DKOL أنثى'],
  ['VHP CEL MALE', 'VHP CEL Erkek', 'VHP CEL Male', 'VHP CEL с наружной резьбой', 'VHP CEL ذكر'],
  ['VHP CES MALE', 'VHP CES Erkek', 'VHP CES Male', 'VHP CES с наружной резьбой', 'VHP CES ذكر'],
  ['VHP DKOS FEMALE', 'VHP DKOS Dişi', 'VHP DKOS Female', 'VHP DKOS с внутренней резьбой', 'VHP DKOS أنثى'],
  ['Female ORFS', 'Dişi ORFS', 'Female ORFS', 'ORFS с внутренней резьбой', 'ORFS أنثى'],
  ['Male ORFS', 'Erkek ORFS', 'Male ORFS', 'ORFS с наружной резьбой', 'ORFS ذكر'],
  ['PTFE 1SSB CONVOLUTED', 'PTFE 1SSB Oluklu Hortum', 'PTFE 1SSB Convoluted Hose', 'Гофрированный рукав PTFE 1SSB', 'خرطوم PTFE 1SSB مموج'],
  ['CNG 5000 HOSE', 'CNG 5000 Hortumu', 'CNG 5000 Hose', 'Рукав CNG 5000', 'خرطوم CNG 5000'],
  ['CNG 5000 COMPRESSED NATURAL GAS', 'CNG 5000 Sıkıştırılmış Doğal Gaz', 'CNG 5000 Compressed Natural Gas', 'CNG 5000 для сжатого природного газа', 'CNG 5000 للغاز الطبيعي المضغوط'],
  ['AUTOMOTIVE LPG', 'Otomotiv LPG Hortumu', 'Automotive LPG', 'LPG для автомобильных систем', 'LPG لتطبيقات السيارات'],
  ['AIR CYLINDER FILLING 6000', 'Hava Tüpü Dolumu 6000', 'Air Cylinder Filling 6000', 'Заправка воздушных баллонов 6000', 'تعبئة أسطوانات الهواء 6000'],
  ['AIR CYLINDER FILLING ANTISTATIC', 'Antistatik Hava Tüpü Dolum Hortumu', 'Antistatic Air Cylinder Filling', 'Антистатический рукав для заправки воздушных баллонов', 'خرطوم مضاد للكهرباء الساكنة لتعبئة أسطوانات الهواء'],
  ['BEVERAGE DISPENSING', 'İçecek Dağıtımı', 'Beverage Dispensing', 'Розлив напитков', 'توزيع المشروبات'],
  ['STEEL BRAID CO2 FIRE EXTINGUISHING', 'Çelik Örgülü CO2 Yangın Söndürme Hortumu', 'Steel Braid CO2 Fire Extinguishing', 'CO2 для пожаротушения, стальная оплётка', 'خرطوم CO2 لإطفاء الحريق بجديلة فولاذية'],
  ['GREASING', 'Gresleme', 'Greasing', 'Подача смазки', 'التشحيم'],
  ['POWER WASH STEEL BLUE', 'POWER WASH Çelik Takviyeli Mavi Hortum', 'POWER WASH Steel Blue', 'POWER WASH со стальным армированием, синий', 'POWER WASH بتقوية فولاذية، أزرق'],
  ['2SB POWER WASH STEEL', '2SB POWER WASH Çelik Takviyeli Hortum', '2SB POWER WASH Steel', '2SB POWER WASH со стальным армированием', '2SB POWER WASH بتقوية فولاذية'],
  ['WATER DELIVERY HOSE', 'Su İletim Hortumu', 'Water Delivery Hose', 'Рукав для подачи воды', 'خرطوم نقل المياه'],
  ['WATERFLOW 250 FISHNET CLEANING', 'WATERFLOW 250 Balık Ağı Temizliği', 'WATERFLOW 250 Fishnet Cleaning', 'WATERFLOW 250 для очистки рыболовных сетей', 'WATERFLOW 250 لتنظيف شباك الصيد'],
  ['COLLAR', 'Bilezik', 'Collar', 'Кольцо', 'طوق'],
  ['GLAND NUT', 'Sıkma Somunu', 'Gland Nut', 'Прижимная гайка', 'صامولة إحكام'],
  ['TELESCOPIC SKIVING TOOL', 'Teleskopik Hortum Soyma Aleti', 'Telescopic Skiving Tool', 'Телескопический инструмент для снятия наружного слоя рукава', 'أداة تلسكوبية لتقشير الخرطوم'],
  ['WARNING LABEL', 'Uyarı Etiketi', 'Warning Label', 'Предупреждающая этикетка', 'ملصق تحذيري'],
  ['BEND RESTRICTOR', 'Bükülme Sınırlayıcı', 'Bend Restrictor', 'Ограничитель изгиба', 'محدد الانحناء'],
  ['EXTRA TOUGH COVER WITH INTERNAL SPIRAL', 'İç Spiral Takviyeli Ekstra Dayanıklı Dış Kaplama', 'Extra Tough Cover with Internal Spiral', 'Внутренняя спираль и особо прочное наружное покрытие', 'غطاء خارجي شديد التحمل مع لولب داخلي'],
  ['PVC CLEAR PROTECTION JACKET', 'Şeffaf PVC Koruyucu Kılıf', 'Clear PVC Protection Jacket', 'Прозрачный защитный кожух из PVC', 'غلاف حماية شفاف من PVC'],
  ['HOSE ARRESTOR', 'Hortum Emniyet Tutucusu', 'Hose Arrestor', 'Страховочный фиксатор рукава', 'مثبّت أمان الخرطوم'],
  ['HOSE ARRESTOR LL', 'Hortum Emniyet Tutucusu LL', 'Hose Arrestor LL', 'Страховочный фиксатор рукава LL', 'مثبّت أمان الخرطوم LL'],
  ['STAINLESS STEEL RING', 'Paslanmaz Çelik Halka', 'Stainless Steel Ring', 'Кольцо из нержавеющей стали', 'حلقة من الفولاذ المقاوم للصدأ'],
  ['STAINLESS STEEL CATCH RING', 'Paslanmaz Çelik Tutucu Halka', 'Stainless Steel Catch Ring', 'Удерживающее кольцо из нержавеющей стали', 'حلقة تثبيت من الفولاذ المقاوم للصدأ'],
  ['CONNECTOR', 'Bağlantı Parçası', 'Connector', 'Соединитель', 'موصّل'],
  ['BSPP FEMALE', 'BSPP Dişi', 'BSPP Female', 'BSPP с внутренней резьбой', 'BSPP أنثى'],
  ['BSPP MALE', 'BSPP Erkek', 'BSPP Male', 'BSPP с наружной резьбой', 'BSPP ذكر'],
  ['MALE DIN3852', 'Erkek DIN3852', 'Male DIN3852', 'DIN3852 с наружной резьбой', 'DIN3852 ذكر'],
  ['M-GAS COMPACT ONE PIECE', 'M-GAS Kompakt Tek Parça', 'M-GAS Compact One Piece', 'M-GAS, компактное цельное исполнение', 'M-GAS مدمج من قطعة واحدة'],
  ['FEMALE JIC', 'Dişi JIC', 'Female JIC', 'JIC с внутренней резьбой', 'JIC أنثى'],
  ['FEMALE NPT', 'Dişi NPT', 'Female NPT', 'NPT с внутренней резьбой', 'NPT أنثى'],
  ['MALE NPT', 'Erkek NPT', 'Male NPT', 'NPT с наружной резьбой', 'NPT ذكر'],
  ['MALE NPT NO HEXAGON', 'Altıgen Anahtar Yüzeyi Olmayan Erkek NPT', 'Male NPT without Hexagon', 'NPT с наружной резьбой, без шестигранника', 'NPT ذكر دون سطح سداسي للمفتاح'],
  ['MALE NPT COMPACT ONE PIECE', 'Erkek NPT Kompakt Tek Parça', 'Male NPT Compact One Piece', 'NPT с наружной резьбой, компактное цельное исполнение', 'NPT ذكر مدمج من قطعة واحدة'],
  ['FEMALE TYPE-M', 'Dişi TYPE-M', 'Female TYPE-M', 'TYPE-M с внутренней резьбой', 'TYPE-M أنثى'],
  ['6SWHDC HELIX DOUBLE COVER', '6SWHDC HELIX Çift Dış Kaplama', '6SWHDC HELIX Double Cover', '6SWHDC HELIX с двойным наружным покрытием', '6SWHDC HELIX بغطاء خارجي مزدوج'],
];

const names = new Map<string, LocalizedProductName>();
const descriptors = new Map<string, LocalizedProductName>();
const localized = ([, tr, en, ru, ar]: NameRow): LocalizedProductName => ({ tr, en, ru, ar });
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
for (const row of rows) names.set(normalize(row[0]), localized(row));
for (const row of descriptorRows) descriptors.set(normalize(row[0]).toUpperCase(), localized(row));
for (const source of ['Hydraulic', 'Industrial', 'Fittings']) names.set(source.toUpperCase(), names.get(source)!);

// Explicit allowed series plus a reviewed descriptive suffix. Series names such
// as R18 CPLFC 3000, A92.2, H2, HELIX and PUSH-ON are not translated.
const suffixes: Array<{ series: string[]; source: string; words: LocalizedProductName }> = [
  { series: ['R18 CP 3000 NEO', 'CP 3600 NEO', 'R18 CPLT 3000 NEO', 'CPLT 3600 NEO', 'R8 ANTIABRASION', 'R7 ANTIABRASION', 'VHP 10000'], source: 'TWIN', words: { tr: 'İkiz Hortum', en: 'Twin Hose', ru: 'сдвоенный рукав', ar: 'خرطوم مزدوج' } },
  { series: ['R18 CPLFC 3000', 'CPLFC 3600 NEO', 'R8', 'A92.2', 'R7', 'VHP', 'PUSH-ON'], source: 'NON CONDUCTIVE', words: { tr: 'Elektriksel Olarak İletken Olmayan Hortum', en: 'Non-Conductive Hose', ru: 'электронепроводящий рукав', ar: 'خرطوم غير موصل للكهرباء' } },
  { series: ['R8', 'A92.2', 'R7 LFC', 'R7'], source: 'ANTIABRASION', words: { tr: 'Aşınmaya Dayanıklı Hortum', en: 'Abrasion-Resistant Hose', ru: 'износостойкий рукав', ar: 'خرطوم مقاوم للتآكل' } },
  { series: ['R8', 'R7'], source: 'EXTRA TOUGH', words: { tr: 'Ekstra Dayanıklı Hortum', en: 'Extra Tough Hose', ru: 'особо прочный рукав', ar: 'خرطوم شديد التحمل' } },
  { series: ['HP', 'VHP'], source: 'AGGRESSIVE CHEMICALS', words: { tr: 'Agresif Kimyasallar', en: 'Aggressive Chemicals', ru: 'для агрессивных химикатов', ar: 'للمواد الكيميائية العدوانية' } },
];
for (const { series, source, words } of suffixes) {
  for (const prefix of series) {
    const key = `${prefix} ${source}`;
    if (prefix.includes('ANTIABRASION')) {
      const base = prefix.replace(' ANTIABRASION', '');
      descriptors.set(key, {
        tr: `${base} Aşınmaya Dayanıklı İkiz Hortum`, en: `${base} Abrasion-Resistant Twin Hose`,
        ru: `${base}, износостойкий сдвоенный рукав`, ar: `${base} خرطوم مزدوج مقاوم للتآكل`,
      });
    } else {
      descriptors.set(key, { tr: `${prefix} ${words.tr}`, en: `${prefix} ${words.en}`, ru: `${prefix} ${words.ru}`, ar: `${prefix} ${words.ar}` });
    }
  }
}

for (const series of ['7K', '10K', '15K']) {
  descriptors.set(`H2 REFUEL ${series}`, {
    tr: `H2 Dolum Hortumu ${series}`, en: `H2 Refuelling ${series}`, ru: `H2 для заправки ${series}`, ar: `H2 للتزويد بالوقود ${series}`,
  });
}
for (const series of ['TP-1', 'TP-5', 'TP-B', 'TP-C', 'TP-G', 'VHP TP-F', 'VHP TP-L', 'H35/H50 316L', 'H70 316L']) {
  descriptors.set(`FERRULE ${series}`, { tr: `${series} Yüksük`, en: `Ferrule ${series}`, ru: `Обжимная муфта ${series}`, ar: `جلبة كبس ${series}` });
}
for (const series of ['2SW', '2+2SW', '4SW', '4SWH', '6SW', '6SWH', '4+2SW', '6SWHX', '8SWH', '2SWH']) {
  descriptors.set(`FERRULES FOR ${series} HOSES`, {
    tr: `${series} Hortumlar için Yüksükler`, en: `Ferrules for ${series} Hoses`,
    ru: `Обжимные муфты для рукавов ${series}`, ar: `جلب كبس لخراطيم ${series}`,
  });
}

for (const count of [2, 4, 6, 8]) {
  const value = { tr: `${count} Spiral`, en: `${count} Spiral`, ru: `${count} спиральных ${count < 5 ? 'слоя' : 'слоёв'}`, ar: `${count} طبقات لولبية` };
  names.set(`${count} Spiral`, value);
  names.set(`HELIX ${count} Spiral`, { tr: `HELIX ${value.tr}`, en: `HELIX ${value.en}`, ru: `HELIX — ${value.ru}`, ar: `HELIX — ${value.ar}` });
}

const standards = ['BSPP', 'BSPT', 'DIN 2353 / 3865 24°', 'JIS 30°', 'NPSM', 'NPTF', 'SAE J1453 ORFS', 'SAE J514 37° JIC'];
for (const standard of standards) {
  names.set(`Standard ${standard}`, { tr: `Standart ${standard}`, en: `Standard ${standard}`, ru: `Стандартные ${standard}`, ar: `${standard} قياسي` });
}
names.set('Standard Metric DIN 3863 60°', { tr: 'Standart Metrik DIN 3863 60°', en: 'Standard Metric DIN 3863 60°', ru: 'Стандартные метрические DIN 3863 60°', ar: 'متري قياسي DIN 3863 60°' });
for (const prefix of ['Micro Bore', 'Push On']) {
  names.set(`${prefix} Metric Standpipe`, { tr: `${prefix} Metrik Boru Ucu`, en: `${prefix} Metric Standpipe`, ru: `${prefix} — метрический трубный наконечник`, ar: `${prefix} — طرف أنبوب متري` });
}

for (const [left, right] of [['GAS', 'UN'], ['Metric', 'UN'], ['NPT', 'NPSM'], ['NPT', 'UN']]) {
  names.set(`Proof Test Female ${left} | Female ${right}`, {
    tr: `Doğrulama Basıncı Testi: Dişi ${left === 'Metric' ? 'Metrik' : left} | Dişi ${right}`,
    en: `Proof Test Female ${left} | Female ${right}`,
    ru: `Испытание проверочным давлением: ${left === 'Metric' ? 'метрическая внутренняя резьба' : `${left} с внутренней резьбой`} | ${right} с внутренней резьбой`,
    ar: `اختبار ضغط التحقق: ${left === 'Metric' ? 'متري' : left} أنثى | ${right} أنثى`,
  });
}
const torpedoEnds: NameRow[] = [
  ['BSPP 24/60', 'Dişi BSPP 24/60', 'Female BSPP 24/60', 'BSPP 24/60 с внутренней резьбой', 'BSPP 24/60 أنثى'],
  ['GAS 120', 'Dişi GAS 120', 'Female GAS 120', 'GAS 120 с внутренней резьбой', 'GAS 120 أنثى'],
  ['GAS Flat Seal', 'Dişi GAS Düz Sızdırmazlık Yüzeyi', 'Female GAS Flat Seal', 'GAS с внутренней резьбой и плоским уплотнением', 'GAS أنثى بإحكام مسطح'],
  ['HP', 'Dişi HP', 'Female HP', 'HP с внутренней резьбой', 'HP أنثى'],
  ['HP (No Gland)', 'Dişi HP (Sıkma Somunu Olmadan)', 'Female HP (No Gland)', 'HP с внутренней резьбой (без прижимной гайки)', 'HP أنثى (دون صامولة إحكام)'],
  ['MP (No Gland)', 'Dişi MP (Sıkma Somunu Olmadan)', 'Female MP (No Gland)', 'MP с внутренней резьбой (без прижимной гайки)', 'MP أنثى (دون صامولة إحكام)'],
  ['Metric', 'Dişi Metrik', 'Female Metric', 'Метрическая внутренняя резьба', 'متري أنثى'],
  ['Metric Flat Seal', 'Dişi Metrik Düz Sızdırmazlık Yüzeyi', 'Female Metric Flat Seal', 'Метрическая внутренняя резьба с плоским уплотнением', 'متري أنثى بإحكام مسطح'],
];
for (const [source, tr, en, ru, ar] of torpedoEnds) names.set(`Torpedo HP | Female ${source}`, { tr: `Torpedo HP | ${tr}`, en: `Torpedo HP | ${en}`, ru: `Torpedo HP | ${ru}`, ar: `Torpedo HP | ${ar}` });

// Reuse exact term translations for descriptor-only captions and capitalisation
// variants, but keep the category "Gas" distinct from the connector standard GAS.
for (const source of ['FLAT SEAL', 'FLAT SEAL METRIC']) {
  const entry = names.get(source)!;
  descriptors.set(source, entry);
  names.set(source === 'FLAT SEAL' ? 'Flat Seal' : 'Flat Seal Metric', entry);
}

export const productNameTranslationEntries = Array.from(names, ([source, translations]) => ({ source, ...translations }));
export const productDescriptorTranslationEntries = Array.from(descriptors, ([source, translations]) => ({ source, ...translations }));

export function localizeProductName(value: string, locale: ProductNameLocale): string {
  const source = normalize(value);
  const wholeName = names.get(source);
  if (wholeName) return wholeName[locale];
  const directDescriptor = descriptors.get(source.toUpperCase());
  if (directDescriptor) return directDescriptor[locale];
  const parts = /^([A-Za-z0-9]+) - (.+)$/.exec(source);
  if (!parts) return value;
  const [, code, descriptor] = parts;
  const translated = descriptors.get(descriptor.toUpperCase());
  return translated ? `${code} - ${translated[locale]}` : value;
}
