import type { Locale } from '@/i18n/routing';
import type { SectorSlug } from './sectors';

type PageMeta = { title: string; description: string };
type Question = { question: string; answer: string };

export type SectorContent = {
  title: string;
  cardDescription: string;
  h1: string;
  intro: string;
  meta: PageMeta;
  needs: Array<{ title: string; text: string }>;
  information: string[];
  faq: Question[];
  relatedLabels: Record<string, string>;
  emailSubject: string;
  emailBody: string;
};

export type SectorServiceCopy = {
  index: { eyebrow: string; title: string; description: string; meta: PageMeta };
  common: {
    explore: string;
    supportCta: string;
    backToSectors: string;
    needsTitle: string;
    relatedTitle: string;
    relatedNote: string;
    informationTitle: string;
    faqTitle: string;
    contactTitle: string;
    emailAction: string;
    emailNote: string;
    sectorsLabel: string;
    testCenterLabel: string;
    applicationsLabel: string;
  };
  sectors: Record<SectorSlug, SectorContent>;
  test: {
    title: string;
    intro: string;
    teaserDescription: string;
    teaserCta: string;
    meta: PageMeta;
    aboutTitle: string;
    aboutText: string;
    evaluationTitle: string;
    evaluationText: string;
    capacityNote: string;
    technicalNote: string;
    informationTitle: string;
    information: string[];
    faq: Question[];
    contactTitle: string;
    contactCta: string;
    emailSubject: string;
    emailBody: string;
  };
};

/** Locale-specific editorial content; product data and manufacturer records stay unchanged. */
export const sectorServiceCopy: Record<Locale, SectorServiceCopy> = {
  tr: {
    index: {
      eyebrow: 'HİZMET VERDİĞİMİZ SEKTÖRLER',
      title: 'Sektörünüze uygun hortum ve bağlantı çözümleri',
      description: 'Offshore, savunma sanayi, endüstriyel tesis ve rafineri projelerinin gereksinimlerini birlikte değerlendirelim. Ürün seçimini çalışma koşulları ve teknik dokümanlarla netleştirelim.',
      meta: { title: 'Hizmet Verdiğimiz Sektörler', description: 'Offshore, savunma sanayi, endüstriyel tesisler ve rafineriler için hortum ve bağlantı çözümleri. Projeniz için teknik değerlendirme desteği alın.' },
    },
    common: {
      explore: 'Sektörü İncele',
      supportCta: 'Projeniz İçin Teknik Destek Alın',
      backToSectors: 'Tüm sektörlere dön',
      needsTitle: 'İhtiyaçlar ve teknik değerlendirme',
      relatedTitle: 'İlgili çözüm aileleri',
      relatedNote: 'Bu bağlantılar mevcut katalog ailelerine yönlendirir; her ürünün bu sektör için uygun olduğu anlamına gelmez. Nihai seçim, üretici dokümanları ve uygulama koşullarına göre doğrulanmalıdır.',
      informationTitle: 'Teknik değerlendirme için paylaşılacak bilgiler',
      faqTitle: 'Sık sorulan sorular',
      contactTitle: 'Projenizin teknik gereksinimlerini paylaşın',
      emailAction: 'E-posta Taslağı Hazırla',
      emailNote: 'Bağlantı, e-posta uygulamanızda konu ve mesajı hazırlanmış bir taslak açar; otomatik gönderim yapmaz. Bilgileri kontrol edip mesajı kendi e-posta uygulamanızdan gönderin.',
      sectorsLabel: 'Sektörler',
      testCenterLabel: 'Test Merkezi',
      applicationsLabel: 'Uygulamalar',
    },
    sectors: {
      offshore: {
        title: 'Offshore',
        cardDescription: 'Açık deniz uygulamalarının zorlu çalışma koşullarına yönelik hortum ve bağlantı çözümleri.',
        h1: 'Offshore Hortum ve Bağlantı Çözümleri',
        intro: 'Açık deniz uygulamalarının zorlu çalışma koşullarına yönelik hortum ve bağlantı çözümleri sunuyoruz. Uygulamanızın teknik gereksinimlerini paylaşarak uygun ürün seçenekleri için ekibimizle iletişime geçebilirsiniz.',
        meta: { title: 'Offshore Hortum ve Bağlantı Çözümleri', description: 'Offshore projelerinde hidrolik ve yüksek basınç hatları için hortum, bağlantı ve doküman değerlendirmesi. Çalışma koşullarınızı UHPHORTUM ile paylaşın.' },
        needs: [
          { title: 'Uygulama ve hat gereksinimleri', text: 'Hidrolik hat, bakım ekipmanı veya yüksek basınç uygulamasının görevini tanımlayın. Hareket, hat güzergâhı ve montaj alanı bilgileri ürün değerlendirmesine dahil edilir.' },
          { title: 'Akışkan ve çalışma koşulları', text: 'Çalışma basıncı, akışkan, sıcaklık ve çevresel koşulları birlikte paylaşın. Deniz ortamına ilişkin özel gereksinimler ürün dokümanı üzerinden ayrıca kontrol edilmelidir.' },
          { title: 'Bağlantı ve dokümantasyon', text: 'Bağlantı standardı, ölçü ve sızdırmazlık bilgileri hortumla birlikte değerlendirilir. Projenin talep ettiği onay veya belge varsa ilk bilgi talebinde belirtin.' },
        ],
        information: ['Uygulamanın görevi, çalışma basıncı, akışkan ve sıcaklık', 'Hortum çapı, uzunluğu, hareket ve montaj koşulları', 'Her iki uçtaki bağlantı tipi ve ölçüler', 'Proje şartnamesi, mevcut ürün kodu ve talep edilen dokümanlar'],
        faq: [
          { question: 'Katalogdaki tüm hortumlar offshore kullanımına uygun mu?', answer: 'Hayır. Ortam koşulları ve proje gereksinimleri her ürün için ayrı değerlendirilmelidir. Deniz ortamına dayanım veya özel onay, yalnız ilgili ürün dokümanında doğrulanıyorsa dikkate alınır.' },
          { question: 'Mevcut hortumun kodu ürün seçimi için yeterli mi?', answer: 'Ürün kodu başlangıç bilgisi sağlar. Çalışma koşulları, hortum ölçüleri ve bağlantı detayları da paylaşılmalıdır; yalnız koda bakılarak eşdeğerlik veya uygunluk onayı verilmez.' },
        ],
        relatedLabels: { '/hidrolik': 'Hidrolik hortum aileleri', '/uhp/helix-hoses': 'HELIX yüksek basınç hortumları', '/uhp/fittings': 'UHP bağlantı elemanları' },
        emailSubject: 'Offshore projesi için teknik destek talebi',
        emailBody: 'Merhaba, UHPHORTUM web sitesi üzerinden offshore projem için teknik değerlendirme talep ediyorum.\n\nUygulama: \nÇalışma basıncı: \nAkışkan ve sıcaklık: \nHortum çapı ve uzunluğu: \nBağlantı tipi ve ölçüler: \nÇevresel koşullar ve şartname: \nÜrün kodu / doküman ihtiyacı: \nFirma ve iletişim bilgileri: ',
      },
      'savunma-sanayi': {
        title: 'Savunma Sanayi',
        cardDescription: 'Savunma sanayi projelerinin teknik gereksinimlerine uygun hidrolik ve yüksek basınç hortum çözümleri.',
        h1: 'Savunma Sanayine Yönelik Hortum ve Bağlantı Çözümleri',
        intro: 'Savunma sanayi projelerinin teknik gereksinimlerine yönelik hidrolik ve yüksek basınç hortum çözümleri sunuyoruz. Ürün seçenekleri, proje şartnamesi ve çalışma koşulları esas alınarak değerlendirilir.',
        meta: { title: 'Savunma Sanayi Hortum Çözümleri', description: 'Savunma sanayi projelerinde şartnameye dayalı hidrolik hortum ve bağlantı değerlendirmesi. Ürün dokümantasyonu ve projeye özel teklif için iletişime geçin.' },
        needs: [
          { title: 'Şartnameye göre değerlendirme', text: 'Paylaşılabilir teknik şartnameyi ve geçerli revizyonunu belirtin. İstenen çalışma koşulları ve doküman gereksinimleri, katalogdaki ürün bilgileriyle karşılaştırılır.' },
          { title: 'Hortum ve bağlantı arayüzleri', text: 'Hortum çapı, uzunluk, uç bağlantıları ve montaj sınırları sistemin birlikte değerlendirilmesi gereken parçalarıdır. Proje çizimi veya mevcut ürün kodu bu incelemeyi destekler.' },
          { title: 'Projeye özel bilgi ve teklif', text: 'Adet, ürün tanımı ve istenen teknik belgeleri talebinizle birlikte iletin. Teklif kapsamı, netleşen gereksinimler üzerinden ele alınır; genel bir onay veya tedarikçi statüsü varsayılmaz.' },
        ],
        information: ['Paylaşılabilir şartname, revizyon ve teknik gereksinimler', 'Çalışma basıncı, akışkan ve sıcaklık aralığı', 'Hortum ölçüleri, bağlantı arayüzleri ve montaj sınırları', 'Adet, mevcut ürün kodu ve talep edilen dokümantasyon'],
        faq: [
          { question: 'Ürün seçimi hangi şartnameye göre yapılır?', answer: 'Projede belirtilen teknik gereksinimler esas alınır. İlgili şartname ve revizyon paylaşılmadan belirli bir onay veya uygunluk varsayılmaz.' },
          { question: 'Teklif talebinde hangi dokümanları paylaşmalıyım?', answer: 'Paylaşımına izin verilen teknik şartname, bağlantı çizimi veya ürün koduyla birlikte çalışma koşulları ve adet bilgisini iletebilirsiniz. Belge ihtiyacını ayrıca belirtin.' },
        ],
        relatedLabels: { '/hidrolik/high-pressure': 'Yüksek basınç hidrolik hortumları', '/baglanti-elemanlari/standard-inserts': 'Standart bağlantı uçları', '/uhp/helix-hoses': 'HELIX hortum ailesi' },
        emailSubject: 'Savunma sanayi projesi için teknik destek talebi',
        emailBody: 'Merhaba, UHPHORTUM web sitesi üzerinden savunma sanayi projem için teknik değerlendirme talep ediyorum.\n\nPaylaşılabilir proje gereksinimleri ve şartname revizyonu: \nÇalışma basıncı: \nAkışkan ve sıcaklık: \nHortum ölçüleri ve bağlantılar: \nÜrün kodu ve adet: \nTalep edilen dokümantasyon: \nFirma ve iletişim bilgileri: ',
      },
      'endustriyel-tesisler': {
        title: 'Endüstriyel Tesisler',
        cardDescription: 'Üretim, bakım ve endüstriyel temizlik uygulamaları için hortum ve sistem bileşenleri.',
        h1: 'Endüstriyel Tesisler İçin Hortum ve Sistem Bileşenleri',
        intro: 'Üretim, bakım ve endüstriyel temizlik uygulamaları için hortum ve sistem bileşenleri sunuyoruz. Çalışma koşullarınıza uygun ürün seçeneklerinin değerlendirilmesi için teknik destek sağlıyoruz.',
        meta: { title: 'Endüstriyel Tesisler İçin Hortum Çözümleri', description: 'Üretim, bakım ve endüstriyel temizlik için hortum ve sistem bileşenleri. Akışkan, basınç ve bağlantı bilgileriyle teknik ürün değerlendirmesi alın.' },
        needs: [
          { title: 'Üretim ve bakım hatları', text: 'Hortumun üretim hattındaki görevini veya bakım ihtiyacını belirtin. Mevcut ekipman, hat uzunluğu ve hareket koşulları değişim ya da yeni ürün talebinin kapsamını belirlemeye yardımcı olur.' },
          { title: 'Endüstriyel temizlik', text: 'Temizlik ekipmanının basıncı, kullanılan akışkan ve bağlantı detayları ayrı ele alınmalıdır. Üretim hattı ile temizlik hattının aynı çalışma koşullarına sahip olduğu varsayılmaz.' },
          { title: 'Mevcut sistemle bağlantı', text: 'Ürün kodu, uç bağlantıları ve montaj ölçülerini paylaşın. Hortum ve bağlantı bileşenleri, üretici bilgileriyle birlikte değerlendirilerek katalog seçenekleri daraltılır.' },
        ],
        information: ['Üretim, bakım veya temizlik görevi ve kullanılan akışkan', 'Çalışma basıncı, sıcaklık ve kullanım koşulları', 'Hortum çapı, uzunluğu ve uç bağlantıları', 'Mevcut ürün kodu, ihtiyaç adedi ve planlanan bakım tarihi'],
        faq: [
          { question: 'Üretim ve temizlik için aynı hortum kullanılabilir mi?', answer: 'Bu karar uygulama verileri olmadan verilemez. İki kullanımın akışkanı, basıncı, sıcaklığı ve bağlantıları ilgili ürün dokümanlarıyla ayrı ayrı değerlendirilmelidir.' },
          { question: 'Planlı bakım talebine hangi bilgileri eklemeliyim?', answer: 'Mevcut ürün kodunu, ölçüleri, adetleri ve planlanan bakım tarihini ekleyin. Tarih bilgisi talebin planlanmasına yardımcı olur; stok veya teslim süresi taahhüdü oluşturmaz.' },
        ],
        relatedLabels: { '/endustriyel/industrial-automation': 'Endüstriyel otomasyon hortumları', '/endustriyel/water': 'Su uygulamaları için ürün aileleri', '/uhp/helix-hoses': 'HELIX yüksek basınç hortumları' },
        emailSubject: 'Endüstriyel tesis için teknik destek talebi',
        emailBody: 'Merhaba, UHPHORTUM web sitesi üzerinden endüstriyel tesisimiz için teknik değerlendirme talep ediyorum.\n\nÜretim / bakım / temizlik uygulaması: \nAkışkan: \nÇalışma basıncı ve sıcaklık: \nHortum çapı ve uzunluğu: \nBağlantı tipi ve ölçüler: \nMevcut ürün kodu ve adet: \nPlanlanan bakım tarihi: \nFirma ve iletişim bilgileri: ',
      },
      rafineriler: {
        title: 'Rafineriler',
        cardDescription: 'Rafineri bakım, temizlik ve akışkan transferi uygulamalarına yönelik hortum ve bağlantı çözümleri.',
        h1: 'Rafineriler İçin Hortum ve Bağlantı Çözümleri',
        intro: 'Rafineri bakım, temizlik ve akışkan transferi uygulamalarına yönelik hortum ve bağlantı çözümleri sunuyoruz. Uygun ürün seçimi, proses koşulları ve ilgili teknik gereksinimler doğrultusunda değerlendirilir.',
        meta: { title: 'Rafineri Hortum ve Bağlantı Çözümleri', description: 'Rafineri bakım, temizlik ve akışkan transferi için hortum değerlendirmesi. Kimyasal uyumluluk, proses koşulları ve bağlantı gereksinimlerinizi paylaşın.' },
        needs: [
          { title: 'Akışkan ve proses koşulları', text: 'Akışkanın tam tanımı, varsa konsantrasyonu ve çalışma sıcaklığı ürün değerlendirmesinin başlangıç bilgileridir. Kimyasal uyumluluk, ilgili ürünün üretici verileri üzerinden kontrol edilmelidir.' },
          { title: 'Bakım ve temizlik gereksinimleri', text: 'Temizlik akışkanı ve ekipmanın çalışma koşullarını, normal proses koşullarından ayrı belirtin. Bakım sırasında kullanılan hattın bağlantı ve ölçü bilgilerini de paylaşın.' },
          { title: 'Saha şartnamesi ve bağlantılar', text: 'Bağlantı tipi, malzeme gereksinimi ve sahaya özel doküman talepleri birlikte ele alınır. Ürün ailesi adı, tek başına özel saha onayı veya tüm akışkanlarla uyumluluk anlamına gelmez.' },
        ],
        information: ['Akışkanın adı, varsa konsantrasyonu ve sıcaklığı', 'Çalışma basıncı ile bakım ve temizlik koşulları', 'Hortum çapı, uzunluğu, bağlantı tipi ve ölçüler', 'Saha şartnamesi, malzeme gereksinimleri, adet ve doküman talebi'],
        faq: [
          { question: 'Bir kimyasal hortum ailesi bütün akışkanlara uygun mudur?', answer: 'Hayır. Akışkanın bileşimi, konsantrasyonu, sıcaklığı ve basıncı birlikte değerlendirilir. Uygunluk, ilgili ürünün üretici bilgileriyle doğrulanmalıdır.' },
          { question: 'Sahaya özel gereksinimleri nasıl iletebilirim?', answer: 'Teklif talebinize geçerli şartnameyi ve istenen belgeleri ekleyin. Özel uygunluk veya sertifika gereksinimleri ürün bazında incelenir; genel bir rafineri onayı varsayılmaz.' },
        ],
        relatedLabels: { '/endustriyel/chemicals': 'Kimyasal transfer ürün aileleri', '/endustriyel/water': 'Su ve temizlik uygulamaları', '/uhp/adapters': 'UHP adaptörleri' },
        emailSubject: 'Rafineri uygulaması için teknik destek talebi',
        emailBody: 'Merhaba, UHPHORTUM web sitesi üzerinden rafineri uygulamamız için teknik değerlendirme talep ediyorum.\n\nBakım / temizlik / transfer uygulaması: \nAkışkan ve konsantrasyonu: \nÇalışma basıncı ve sıcaklık: \nHortum ölçüleri ve bağlantılar: \nSaha şartnamesi ve malzeme gereksinimleri: \nAdet ve doküman ihtiyacı: \nFirma ve iletişim bilgileri: ',
      },
    },
    test: {
      title: '4.500 Bar Yüksek Basınç Test Merkezi',
      intro: 'UHPHORTUM bünyesindeki 4.500 bar test merkezimizle yüksek basınç test ihtiyaçlarınıza Türkiye’de yanıt veriyoruz.',
      teaserDescription: 'Test kapsamı ve teknik gereksinimleriniz için ekibimizle iletişime geçin.',
      teaserCta: 'Test Hizmeti Hakkında Bilgi Alın',
      meta: { title: '4.500 Bar Yüksek Basınç Test Merkezi', description: 'UHPHORTUM 4.500 bar test merkezi için teknik değerlendirme ve bilgi talebi. Ürün özellikleri, üretici sınırları ve test gereksinimlerinizi paylaşın.' },
      aboutTitle: 'Test hizmeti hakkında',
      aboutText: 'Ürün veya ekipmanınıza ilişkin yüksek basınç test talebini teknik ekibimizle değerlendirebilirsiniz. Hizmet kapsamı, ürün bilgileri ve talep edilen koşullar netleştirildikten sonra ele alınır.',
      evaluationTitle: 'Talep öncesi teknik değerlendirme',
      evaluationText: 'Üreticinin belirttiği çalışma basıncı ile talep ettiğiniz test basıncını ayrı ayrı iletin. Ürün dokümanları, bağlantı ölçüleri ve varsa şartname incelenerek uygulanabilirlik değerlendirilir. Bilgi paylaşımı, test için otomatik uygunluk onayı değildir.',
      capacityNote: '4.500 bar, test merkezinin bildirilen kapasitesidir; sitedeki bütün hortumların çalışma basıncı değildir. Her ürünün 4.500 barda test edilebileceği anlamına gelmez.',
      technicalNote: 'Test uygulanabilirliği ve koşulları; ürün özellikleri, üretici sınırları ve ilgili teknik gereksinimler değerlendirilerek belirlenir.',
      informationTitle: 'Bilgi talebi için paylaşılacak bilgiler',
      information: ['Test edilmesi istenen ürün veya ekipman', 'Ürün kodu veya teknik doküman', 'Üreticinin belirttiği çalışma basıncı', 'Talep edilen test basıncı', 'Bağlantı tipi ve ölçüler', 'Adet', 'Talep edilen standart veya şartname, varsa', 'İstenen tarih', 'Varsa raporlama veya dokümantasyon ihtiyacı'],
      faq: [
        { question: 'Her hortum 4.500 barda test edilebilir mi?', answer: 'Hayır. Merkezin kapasitesi, ürünün izin verilen sınırlarını değiştirmez. Test uygulanabilirliği ve koşulları ürün dokümanları ve teknik gereksinimlere göre belirlenir.' },
        { question: 'Belirli bir standart veya şartname talep edebilir miyim?', answer: 'Varsa standardı veya şartnameyi talebinizle birlikte paylaşın. Kapsam teknik ekip tarafından değerlendirilmeden belirli bir standarda uygunluk taahhüdü verilmez.' },
        { question: 'Raporlama veya doküman ihtiyacını nasıl belirtmeliyim?', answer: 'İhtiyaç duyduğunuz bilgi ve belge kapsamını ilk talebinizde açıklayın. Raporlama ve dokümantasyon koşulları, test kapsamıyla birlikte önceden netleştirilmelidir.' },
      ],
      contactTitle: 'Test hizmeti iletişim alanı',
      contactCta: 'Test Hizmeti İçin İletişime Geçin',
      emailSubject: '4.500 bar test merkezi için bilgi talebi',
      emailBody: 'Merhaba, UHPHORTUM web sitesi üzerinden 4.500 bar test merkezi hizmeti hakkında bilgi talep ediyorum.\n\nÜrün / ekipman: \nÜrün kodu veya teknik doküman: \nÜreticinin belirttiği çalışma basıncı: \nTalep edilen test basıncı: \nBağlantı tipi ve ölçüler: \nAdet: \nStandart / şartname (varsa): \nİstenen tarih: \nRaporlama / dokümantasyon ihtiyacı: \nFirma ve iletişim bilgileri: ',
    },
  },
  en: {
    index: {
      eyebrow: 'SECTORS WE SERVE',
      title: 'Hose and connection solutions for your sector',
      description: 'Discuss the requirements of your offshore, defence, industrial plant or refinery project with us. Define product selection through operating conditions and technical documentation.',
      meta: { title: 'Sectors We Serve', description: 'Hose and connection solutions for offshore projects, defence, industrial plants and refineries. Request technical assessment for your project.' },
    },
    common: {
      explore: 'Explore the Sector',
      supportCta: 'Get Technical Support for Your Project',
      backToSectors: 'Back to all sectors',
      needsTitle: 'Requirements and technical assessment',
      relatedTitle: 'Related solution families',
      relatedNote: 'These links lead to existing catalogue families; they do not establish that every product is suitable for this sector. Final selection must be verified against manufacturer documentation and application conditions.',
      informationTitle: 'Information for technical assessment',
      faqTitle: 'Frequently asked questions',
      contactTitle: 'Share your project’s technical requirements',
      emailAction: 'Prepare an Email Draft',
      emailNote: 'The link opens a draft with a prepared subject and message in your email application; it does not send automatically. Review the information and send the message from your email application.',
      sectorsLabel: 'Sectors',
      testCenterLabel: 'Test Centre',
      applicationsLabel: 'Applications',
    },
    sectors: {
      offshore: {
        title: 'Offshore',
        cardDescription: 'Hose and connection solutions for the demanding operating conditions of offshore applications.',
        h1: 'Offshore Hose and Connection Solutions',
        intro: 'We provide hose and connection solutions for the demanding operating conditions of offshore applications. Share your technical requirements with our team to discuss suitable product options.',
        meta: { title: 'Offshore Hose and Connection Solutions', description: 'Hose, connection and documentation assessment for hydraulic and high-pressure offshore lines. Share your operating requirements with UHPHORTUM.' },
        needs: [
          { title: 'Application and line requirements', text: 'Define the purpose of the hydraulic line, maintenance equipment or high-pressure application. Movement, routing and installation space are considered in the product assessment.' },
          { title: 'Fluid and operating conditions', text: 'Provide working pressure, fluid, temperature and environmental conditions together. Specific marine-environment requirements must be checked separately against the product documentation.' },
          { title: 'Connections and documentation', text: 'Connection standards, dimensions and sealing details are assessed together with the hose. Specify any project approval or documentation requirements in your initial enquiry.' },
        ],
        information: ['Application purpose, working pressure, fluid and temperature', 'Hose diameter, length, movement and installation conditions', 'Connection type and dimensions at both ends', 'Project specification, existing product code and required documents'],
        faq: [
          { question: 'Is every hose in the catalogue suitable for offshore use?', answer: 'No. Environmental conditions and project requirements must be assessed for each product. Marine resistance or special approvals are considered only when confirmed in the relevant product documentation.' },
          { question: 'Is the existing hose code sufficient for selection?', answer: 'The product code provides a starting point. Operating conditions, hose dimensions and connection details are also needed; a code alone does not confirm equivalence or suitability.' },
        ],
        relatedLabels: { '/hidrolik': 'Hydraulic hose families', '/uhp/helix-hoses': 'HELIX high-pressure hoses', '/uhp/fittings': 'UHP fittings' },
        emailSubject: 'Technical support enquiry for an offshore project',
        emailBody: 'Hello, I am requesting technical assessment for an offshore project through the UHPHORTUM website.\n\nApplication: \nWorking pressure: \nFluid and temperature: \nHose diameter and length: \nConnection type and dimensions: \nEnvironmental conditions and specification: \nProduct code / required documents: \nCompany and contact details: ',
      },
      'savunma-sanayi': {
        title: 'Defence Industry',
        cardDescription: 'Hydraulic and high-pressure hose solutions for the technical requirements of defence projects.',
        h1: 'Hose and Connection Solutions for the Defence Industry',
        intro: 'We provide hydraulic and high-pressure hose solutions for the technical requirements of defence projects. Product options are assessed against project specifications and operating conditions.',
        meta: { title: 'Hose Solutions for the Defence Industry', description: 'Specification-based hydraulic hose and connection assessment for defence projects. Contact us for product documentation and a project-specific quotation.' },
        needs: [
          { title: 'Specification-based assessment', text: 'Identify the technical specification you are authorised to share and its current revision. Requested operating conditions and documentation requirements are compared with catalogue product information.' },
          { title: 'Hose and connection interfaces', text: 'Hose diameter, length, end connections and installation limits must be considered together. A project drawing or existing product code can support this review.' },
          { title: 'Project-specific enquiry and quotation', text: 'Include quantity, product description and required technical documents. The quotation scope is addressed once requirements are clear; no general approval or supplier status is assumed.' },
        ],
        information: ['Shareable specification, revision and technical requirements', 'Working pressure, fluid and temperature range', 'Hose dimensions, connection interfaces and installation limits', 'Quantity, existing product code and required documentation'],
        faq: [
          { question: 'Which specification is used for product selection?', answer: 'The project’s stated technical requirements form the basis of the assessment. No particular approval or compliance is assumed before the relevant specification and revision are provided.' },
          { question: 'Which documents should accompany a quotation enquiry?', answer: 'Provide the technical specification, connection drawing or product code you are authorised to share, together with operating conditions and quantity. Identify documentation needs separately.' },
        ],
        relatedLabels: { '/hidrolik/high-pressure': 'High-pressure hydraulic hoses', '/baglanti-elemanlari/standard-inserts': 'Standard inserts', '/uhp/helix-hoses': 'HELIX hose family' },
        emailSubject: 'Technical support enquiry for a defence project',
        emailBody: 'Hello, I am requesting technical assessment for a defence project through the UHPHORTUM website.\n\nShareable project requirements and specification revision: \nWorking pressure: \nFluid and temperature: \nHose dimensions and connections: \nProduct code and quantity: \nRequired documentation: \nCompany and contact details: ',
      },
      'endustriyel-tesisler': {
        title: 'Industrial Plants',
        cardDescription: 'Hoses and system components for production, maintenance and industrial cleaning applications.',
        h1: 'Hoses and System Components for Industrial Plants',
        intro: 'We provide hoses and system components for production, maintenance and industrial cleaning applications. Our technical support helps assess product options against your operating conditions.',
        meta: { title: 'Hose Solutions for Industrial Plants', description: 'Hoses and system components for production, maintenance and industrial cleaning. Request a product assessment using fluid, pressure and connection data.' },
        needs: [
          { title: 'Production and maintenance lines', text: 'Explain the hose’s role in the production line or the maintenance requirement. Existing equipment, line length and movement help define a replacement or new-product enquiry.' },
          { title: 'Industrial cleaning', text: 'Cleaning-equipment pressure, fluid and connection details require separate assessment. Production and cleaning lines should not be assumed to operate under the same conditions.' },
          { title: 'Integration with existing equipment', text: 'Share the product code, end connections and installation dimensions. Hose and connection components are reviewed alongside manufacturer information to narrow down catalogue options.' },
        ],
        information: ['Production, maintenance or cleaning task and fluid used', 'Working pressure, temperature and operating conditions', 'Hose diameter, length and end connections', 'Existing product code, quantity and planned maintenance date'],
        faq: [
          { question: 'Can the same hose be used for production and cleaning?', answer: 'This cannot be decided without application data. The fluid, pressure, temperature and connections of both uses must be checked separately against the relevant product documentation.' },
          { question: 'What should I include in a planned-maintenance enquiry?', answer: 'Include existing product codes, dimensions, quantities and the planned maintenance date. The date helps with enquiry planning; it does not establish stock availability or a delivery commitment.' },
        ],
        relatedLabels: { '/endustriyel/industrial-automation': 'Industrial automation hoses', '/endustriyel/water': 'Water application product families', '/uhp/helix-hoses': 'HELIX high-pressure hoses' },
        emailSubject: 'Technical support enquiry for an industrial plant',
        emailBody: 'Hello, I am requesting technical assessment for our industrial plant through the UHPHORTUM website.\n\nProduction / maintenance / cleaning application: \nFluid: \nWorking pressure and temperature: \nHose diameter and length: \nConnection type and dimensions: \nExisting product code and quantity: \nPlanned maintenance date: \nCompany and contact details: ',
      },
      rafineriler: {
        title: 'Refineries',
        cardDescription: 'Hose and connection solutions for refinery maintenance, cleaning and fluid transfer applications.',
        h1: 'Hose and Connection Solutions for Refineries',
        intro: 'We provide hose and connection solutions for refinery maintenance, cleaning and fluid transfer applications. Product selection is assessed in line with process conditions and relevant technical requirements.',
        meta: { title: 'Refinery Hose and Connection Solutions', description: 'Hose assessment for refinery maintenance, cleaning and fluid transfer. Share chemical compatibility, process and connection requirements with UHPHORTUM.' },
        needs: [
          { title: 'Fluid and process conditions', text: 'The exact fluid description, concentration where applicable and operating temperature are starting points for assessment. Chemical compatibility must be checked against the relevant manufacturer product data.' },
          { title: 'Maintenance and cleaning requirements', text: 'Identify cleaning fluids and equipment operating conditions separately from normal process conditions. Include the connection and dimensional details of the line used during maintenance.' },
          { title: 'Site specification and connections', text: 'Connection type, material requirements and site-specific documentation needs are considered together. A product family name alone does not establish special site approval or compatibility with every fluid.' },
        ],
        information: ['Fluid name, concentration where applicable and temperature', 'Working pressure and maintenance or cleaning conditions', 'Hose diameter, length, connection type and dimensions', 'Site specification, material requirements, quantity and document needs'],
        faq: [
          { question: 'Is a chemical hose family suitable for every fluid?', answer: 'No. Fluid composition, concentration, temperature and pressure must be considered together. Suitability must be verified against the relevant manufacturer product information.' },
          { question: 'How should I communicate site-specific requirements?', answer: 'Include the current specification and required documents with your enquiry. Special compliance or certification requirements are reviewed product by product; no general refinery approval is assumed.' },
        ],
        relatedLabels: { '/endustriyel/chemicals': 'Chemical transfer product families', '/endustriyel/water': 'Water and cleaning applications', '/uhp/adapters': 'UHP adapters' },
        emailSubject: 'Technical support enquiry for a refinery application',
        emailBody: 'Hello, I am requesting technical assessment for our refinery application through the UHPHORTUM website.\n\nMaintenance / cleaning / transfer application: \nFluid and concentration: \nWorking pressure and temperature: \nHose dimensions and connections: \nSite specification and material requirements: \nQuantity and document needs: \nCompany and contact details: ',
      },
    },
    test: {
      title: '4,500 Bar High-Pressure Test Centre',
      intro: 'At UHPHORTUM, our 4,500 bar test centre supports high-pressure testing enquiries in Türkiye.',
      teaserDescription: 'Contact our team to discuss the test scope and your technical requirements.',
      teaserCta: 'Learn About the Test Service',
      meta: { title: '4,500 Bar High-Pressure Test Centre', description: 'Technical assessment and enquiries for the UHPHORTUM 4,500 bar test centre. Share product details, manufacturer limits and testing requirements.' },
      aboutTitle: 'About the test service',
      aboutText: 'Discuss a high-pressure test request for your product or equipment with our technical team. The service scope is considered once product information and requested conditions have been clarified.',
      evaluationTitle: 'Technical assessment before an enquiry proceeds',
      evaluationText: 'Provide the manufacturer’s stated working pressure separately from your requested test pressure. Product documentation, connection dimensions and any specification are reviewed to assess feasibility. Sharing information is not automatic approval for testing.',
      capacityNote: '4,500 bar is the stated capacity of the test centre, not the working pressure of every hose on this website. It does not mean that every product can be tested at 4,500 bar.',
      technicalNote: 'Test feasibility and conditions are determined by assessing product characteristics, manufacturer limits and the relevant technical requirements.',
      informationTitle: 'Information to include in your enquiry',
      information: ['Product or equipment to be tested', 'Product code or technical documentation', 'Manufacturer’s stated working pressure', 'Requested test pressure', 'Connection type and dimensions', 'Quantity', 'Requested standard or specification, if applicable', 'Preferred date', 'Reporting or documentation needs, if any'],
      faq: [
        { question: 'Can every hose be tested at 4,500 bar?', answer: 'No. The centre’s capacity does not change a product’s permitted limits. Test feasibility and conditions are determined from product documentation and technical requirements.' },
        { question: 'Can I request a particular standard or specification?', answer: 'Include the standard or specification with your enquiry, if applicable. Compliance with a particular standard is not promised before the scope has been assessed by the technical team.' },
        { question: 'How should I specify reporting or documentation needs?', answer: 'Describe the information and documents you require in your initial enquiry. Reporting and documentation conditions should be clarified in advance together with the test scope.' },
      ],
      contactTitle: 'Contact the test service team',
      contactCta: 'Contact Us About the Test Service',
      emailSubject: 'Enquiry about the 4,500 bar test centre',
      emailBody: 'Hello, I am enquiring about the 4,500 bar test centre service through the UHPHORTUM website.\n\nProduct / equipment: \nProduct code or technical documentation: \nManufacturer’s stated working pressure: \nRequested test pressure: \nConnection type and dimensions: \nQuantity: \nStandard / specification (if any): \nPreferred date: \nReporting / documentation needs: \nCompany and contact details: ',
    },
  },
  ru: {
    index: {
      eyebrow: 'ОТРАСЛИ, С КОТОРЫМИ МЫ РАБОТАЕМ',
      title: 'Рукава и соединения для задач вашей отрасли',
      description: 'Обсудим требования морских и оборонных проектов, промышленных предприятий и нефтеперерабатывающих заводов. Подбор продукции уточняется по условиям эксплуатации и технической документации.',
      meta: { title: 'Отрасли, с которыми мы работаем', description: 'Рукава и соединения для морских проектов, оборонной промышленности, предприятий и НПЗ. Запросите техническую оценку требований вашего проекта.' },
    },
    common: {
      explore: 'Подробнее об отрасли',
      supportCta: 'Получить техническую поддержку по проекту',
      backToSectors: 'Вернуться ко всем отраслям',
      needsTitle: 'Потребности и техническая оценка',
      relatedTitle: 'Связанные группы продукции',
      relatedNote: 'Ссылки ведут к существующим группам каталога и не означают, что каждое изделие подходит для этой отрасли. Окончательный выбор необходимо проверить по документации производителя и условиям применения.',
      informationTitle: 'Данные для технической оценки',
      faqTitle: 'Часто задаваемые вопросы',
      contactTitle: 'Сообщите технические требования проекта',
      emailAction: 'Подготовить черновик письма',
      emailNote: 'Ссылка открывает черновик с темой и текстом в вашей почтовой программе; автоматическая отправка не выполняется. Проверьте данные и отправьте письмо из своей почтовой программы.',
      sectorsLabel: 'Отрасли',
      testCenterLabel: 'Испытательный центр',
      applicationsLabel: 'Применения',
    },
    sectors: {
      offshore: {
        title: 'Морские проекты',
        cardDescription: 'Рукава и соединения для сложных условий эксплуатации в открытом море.',
        h1: 'Рукава и соединения для морских проектов',
        intro: 'Мы предлагаем рукава и соединения для сложных условий эксплуатации в открытом море. Передайте технические требования вашей задачи нашей команде, чтобы обсудить варианты продукции.',
        meta: { title: 'Рукава и соединения для морских проектов', description: 'Оценка рукавов, соединений и документации для гидравлических линий и линий высокого давления в морских проектах. Передайте условия работы UHPHORTUM.' },
        needs: [
          { title: 'Назначение и требования к линии', text: 'Опишите назначение гидравлической линии, оборудования для обслуживания или системы высокого давления. При оценке учитываются перемещения, трасса и доступное место для монтажа.' },
          { title: 'Среда и условия эксплуатации', text: 'Укажите рабочее давление, среду, температуру и внешние условия. Специальные требования к работе в морской среде необходимо отдельно проверить по документации изделия.' },
          { title: 'Соединения и документация', text: 'Стандарты соединений, размеры и сведения об уплотнениях рассматриваются вместе с рукавом. Требования проекта к допускам и документам укажите в первоначальном запросе.' },
        ],
        information: ['Назначение, рабочее давление, рабочая среда и температура', 'Диаметр, длина рукава, перемещения и условия монтажа', 'Тип и размеры соединений на обоих концах', 'Спецификация проекта, код существующего изделия и требуемые документы'],
        faq: [
          { question: 'Все ли рукава каталога подходят для работы в открытом море?', answer: 'Нет. Внешние условия и требования проекта оцениваются отдельно для каждого изделия. Стойкость к морской среде или специальные допуски учитываются только при подтверждении в документации соответствующего изделия.' },
          { question: 'Достаточно ли кода существующего рукава для подбора?', answer: 'Код изделия служит исходной информацией. Также нужны условия эксплуатации, размеры рукава и данные соединений. Один код не подтверждает эквивалентность или пригодность.' },
        ],
        relatedLabels: { '/hidrolik': 'Группы гидравлических рукавов', '/uhp/helix-hoses': 'Рукава высокого давления HELIX', '/uhp/fittings': 'Фитинги UHP' },
        emailSubject: 'Запрос технической поддержки для морского проекта',
        emailBody: 'Здравствуйте! Через сайт UHPHORTUM запрашиваю техническую оценку для морского проекта.\n\nПрименение: \nРабочее давление: \nРабочая среда и температура: \nДиаметр и длина рукава: \nТип и размеры соединений: \nВнешние условия и спецификация: \nКод изделия / требуемые документы: \nКомпания и контактные данные: ',
      },
      'savunma-sanayi': {
        title: 'Оборонная промышленность',
        cardDescription: 'Гидравлические рукава и рукава высокого давления для технических требований оборонных проектов.',
        h1: 'Рукава и соединения для оборонной промышленности',
        intro: 'Мы предлагаем гидравлические рукава и рукава высокого давления для технических задач оборонных проектов. Варианты продукции оцениваются по спецификации проекта и условиям эксплуатации.',
        meta: { title: 'Рукава для оборонной промышленности', description: 'Оценка гидравлических рукавов и соединений по спецификации оборонного проекта. Обратитесь за документацией и индивидуальным коммерческим предложением.' },
        needs: [
          { title: 'Оценка по спецификации', text: 'Укажите техническую спецификацию, которую разрешено передавать, и её актуальную редакцию. Требуемые условия работы и документы сопоставляются с данными продукции в каталоге.' },
          { title: 'Рукава и присоединительные интерфейсы', text: 'Диаметр, длина, концевые соединения и ограничения монтажа рассматриваются совместно. Чертёж проекта или код существующего изделия помогает выполнить эту оценку.' },
          { title: 'Запрос и предложение по проекту', text: 'Передайте количество, описание изделий и перечень требуемых документов. Объём предложения определяется после уточнения требований; общий допуск или статус поставщика не предполагается.' },
        ],
        information: ['Разрешённая к передаче спецификация, её редакция и технические требования', 'Рабочее давление, среда и диапазон температур', 'Размеры рукава, интерфейсы соединений и ограничения монтажа', 'Количество, код существующего изделия и требуемая документация'],
        faq: [
          { question: 'По какой спецификации подбирается продукция?', answer: 'Основанием служат технические требования проекта. До получения соответствующей спецификации и её редакции наличие определённого допуска или соответствия не предполагается.' },
          { question: 'Какие документы приложить к запросу предложения?', answer: 'Передайте разрешённые к распространению спецификацию, чертёж соединений или код изделия, а также условия работы и количество. Отдельно укажите потребность в документации.' },
        ],
        relatedLabels: { '/hidrolik/high-pressure': 'Гидравлические рукава высокого давления', '/baglanti-elemanlari/standard-inserts': 'Стандартные ниппели', '/uhp/helix-hoses': 'Семейство рукавов HELIX' },
        emailSubject: 'Запрос технической поддержки для оборонного проекта',
        emailBody: 'Здравствуйте! Через сайт UHPHORTUM запрашиваю техническую оценку для оборонного проекта.\n\nРазрешённые к передаче требования и редакция спецификации: \nРабочее давление: \nРабочая среда и температура: \nРазмеры рукава и соединения: \nКод изделия и количество: \nТребуемая документация: \nКомпания и контактные данные: ',
      },
      'endustriyel-tesisler': {
        title: 'Промышленные предприятия',
        cardDescription: 'Рукава и компоненты систем для производства, обслуживания и промышленной очистки.',
        h1: 'Рукава и компоненты систем для промышленных предприятий',
        intro: 'Мы предлагаем рукава и компоненты систем для производства, обслуживания и промышленной очистки. Техническая поддержка помогает оценить варианты продукции с учётом ваших условий эксплуатации.',
        meta: { title: 'Рукава для промышленных предприятий', description: 'Рукава и компоненты для производства, обслуживания и промышленной очистки. Запросите оценку по данным рабочей среды, давления и соединений.' },
        needs: [
          { title: 'Производственные линии и обслуживание', text: 'Опишите роль рукава в производственной линии или задачу обслуживания. Оборудование, длина линии и перемещения помогают уточнить запрос на замену или новое изделие.' },
          { title: 'Промышленная очистка', text: 'Давление оборудования для очистки, рабочая среда и соединения требуют отдельной оценки. Нельзя предполагать, что производственная линия и линия очистки работают в одинаковых условиях.' },
          { title: 'Подключение к существующей системе', text: 'Передайте код изделия, концевые соединения и монтажные размеры. Рукав и соединительные компоненты рассматриваются по данным производителя для отбора вариантов из каталога.' },
        ],
        information: ['Задача производства, обслуживания или очистки и используемая среда', 'Рабочее давление, температура и условия эксплуатации', 'Диаметр, длина рукава и концевые соединения', 'Код существующего изделия, количество и плановая дата обслуживания'],
        faq: [
          { question: 'Можно ли использовать один рукав для производства и очистки?', answer: 'Без данных применения это определить нельзя. Среду, давление, температуру и соединения для обеих задач необходимо отдельно проверить по документации изделия.' },
          { question: 'Что указать в запросе для планового обслуживания?', answer: 'Укажите коды существующих изделий, размеры, количество и плановую дату обслуживания. Дата помогает спланировать рассмотрение запроса, но не является подтверждением наличия или срока поставки.' },
        ],
        relatedLabels: { '/endustriyel/industrial-automation': 'Рукава для промышленной автоматизации', '/endustriyel/water': 'Группы продукции для работы с водой', '/uhp/helix-hoses': 'Рукава высокого давления HELIX' },
        emailSubject: 'Запрос технической поддержки для промышленного предприятия',
        emailBody: 'Здравствуйте! Через сайт UHPHORTUM запрашиваю техническую оценку для нашего промышленного предприятия.\n\nПроизводство / обслуживание / очистка: \nРабочая среда: \nРабочее давление и температура: \nДиаметр и длина рукава: \nТип и размеры соединений: \nКод существующего изделия и количество: \nПлановая дата обслуживания: \nКомпания и контактные данные: ',
      },
      rafineriler: {
        title: 'Нефтеперерабатывающие заводы',
        cardDescription: 'Рукава и соединения для обслуживания, очистки и передачи жидкостей на НПЗ.',
        h1: 'Рукава и соединения для нефтеперерабатывающих заводов',
        intro: 'Мы предлагаем рукава и соединения для обслуживания, очистки и передачи жидкостей на нефтеперерабатывающих заводах. Подбор оценивается с учётом условий процесса и соответствующих технических требований.',
        meta: { title: 'Рукава и соединения для НПЗ', description: 'Оценка рукавов для обслуживания, очистки и передачи жидкостей на НПЗ. Сообщите требования к химической совместимости, процессу и соединениям.' },
        needs: [
          { title: 'Рабочая среда и условия процесса', text: 'Точное наименование среды, её концентрация при необходимости и рабочая температура — исходные данные для оценки. Химическая совместимость проверяется по данным производителя конкретного изделия.' },
          { title: 'Обслуживание и очистка', text: 'Укажите средства очистки и условия работы оборудования отдельно от обычного процесса. Также передайте размеры и параметры соединений линии, используемой при обслуживании.' },
          { title: 'Требования площадки и соединения', text: 'Тип соединений, требования к материалам и документации площадки рассматриваются совместно. Название группы продукции само по себе не означает специального допуска или совместимости со всеми средами.' },
        ],
        information: ['Название среды, концентрация при необходимости и температура', 'Рабочее давление и условия обслуживания или очистки', 'Диаметр, длина рукава, тип и размеры соединений', 'Спецификация площадки, требования к материалам, количество и документы'],
        faq: [
          { question: 'Подходит ли группа химических рукавов для любых сред?', answer: 'Нет. Состав среды, концентрация, температура и давление оцениваются совместно. Пригодность необходимо подтвердить по данным производителя конкретного изделия.' },
          { question: 'Как передать особые требования площадки?', answer: 'Приложите актуальную спецификацию и перечень необходимых документов к запросу. Специальные требования к соответствию и сертификатам проверяются по каждому изделию; общий допуск для НПЗ не предполагается.' },
        ],
        relatedLabels: { '/endustriyel/chemicals': 'Группы продукции для химических сред', '/endustriyel/water': 'Работа с водой и очистка', '/uhp/adapters': 'Адаптеры UHP' },
        emailSubject: 'Запрос технической поддержки для применения на НПЗ',
        emailBody: 'Здравствуйте! Через сайт UHPHORTUM запрашиваю техническую оценку для применения на НПЗ.\n\nОбслуживание / очистка / передача жидкости: \nРабочая среда и концентрация: \nРабочее давление и температура: \nРазмеры рукава и соединения: \nСпецификация площадки и требования к материалам: \nКоличество и необходимые документы: \nКомпания и контактные данные: ',
      },
    },
    test: {
      title: 'Центр испытаний высоким давлением до 4500 бар',
      intro: 'В испытательном центре UHPHORTUM с заявленным максимальным давлением 4500 бар мы принимаем запросы на испытания высоким давлением в Турции.',
      teaserDescription: 'Обратитесь к нашей команде для обсуждения объёма испытаний и технических требований.',
      teaserCta: 'Узнать об услуге испытаний',
      meta: { title: 'Центр испытаний высоким давлением до 4500 бар', description: 'Техническая оценка и запросы в испытательный центр UHPHORTUM до 4500 бар. Передайте данные изделия, ограничения производителя и требования к испытаниям.' },
      aboutTitle: 'Об услуге испытаний',
      aboutText: 'Обсудите с технической командой запрос на испытание вашего изделия или оборудования высоким давлением. Объём услуги рассматривается после уточнения данных изделия и требуемых условий.',
      evaluationTitle: 'Предварительная техническая оценка',
      evaluationText: 'Укажите заявленное производителем рабочее давление отдельно от требуемого испытательного давления. Для оценки возможности испытания рассматриваются документация, размеры соединений и спецификация, если она есть. Передача данных не является автоматическим разрешением на испытание.',
      capacityNote: '4500 бар — заявленная характеристика испытательного центра, а не рабочее давление всех рукавов на сайте. Она не означает, что любое изделие можно испытывать при 4500 бар.',
      technicalNote: 'Возможность и условия испытания определяются после оценки характеристик изделия, ограничений производителя и соответствующих технических требований.',
      informationTitle: 'Данные для информационного запроса',
      information: ['Изделие или оборудование для испытания', 'Код изделия или техническая документация', 'Рабочее давление, указанное производителем', 'Требуемое испытательное давление', 'Тип и размеры соединений', 'Количество', 'Требуемый стандарт или спецификация, если есть', 'Желаемая дата', 'Потребность в отчётности или документации, если есть'],
      faq: [
        { question: 'Можно ли испытывать любой рукав при 4500 бар?', answer: 'Нет. Возможности центра не изменяют допустимые пределы изделия. Возможность и условия испытания определяются по документации изделия и техническим требованиям.' },
        { question: 'Можно ли указать определённый стандарт или спецификацию?', answer: 'Если такие требования есть, приложите их к запросу. До оценки объёма работ технической командой соответствие определённому стандарту не обещается.' },
        { question: 'Как указать потребность в отчёте или документации?', answer: 'Опишите необходимую информацию и документы в первоначальном запросе. Условия отчётности и документации следует заранее уточнить вместе с объёмом испытаний.' },
      ],
      contactTitle: 'Связь по вопросам испытаний',
      contactCta: 'Связаться по вопросам испытаний',
      emailSubject: 'Запрос об испытательном центре до 4500 бар',
      emailBody: 'Здравствуйте! Через сайт UHPHORTUM запрашиваю информацию об услугах испытательного центра до 4500 бар.\n\nИзделие / оборудование: \nКод изделия или техническая документация: \nРабочее давление, указанное производителем: \nТребуемое испытательное давление: \nТип и размеры соединений: \nКоличество: \nСтандарт / спецификация (если есть): \nЖелаемая дата: \nПотребность в отчётности / документации: \nКомпания и контактные данные: ',
    },
  },
  ar: {
    index: {
      eyebrow: 'القطاعات التي نخدمها',
      title: 'حلول الخراطيم والوصلات لاحتياجات قطاعك',
      description: 'نناقش معك متطلبات المشروعات البحرية والصناعات الدفاعية والمنشآت الصناعية والمصافي. يُحدَّد اختيار المنتجات بالرجوع إلى ظروف التشغيل والوثائق الفنية.',
      meta: { title: 'القطاعات التي نخدمها', description: 'حلول الخراطيم والوصلات للمشروعات البحرية والصناعات الدفاعية والمنشآت الصناعية والمصافي. اطلب تقييمًا فنيًا لمتطلبات مشروعك.' },
    },
    common: {
      explore: 'استعرض القطاع',
      supportCta: 'احصل على دعم فني لمشروعك',
      backToSectors: 'العودة إلى جميع القطاعات',
      needsTitle: 'الاحتياجات والتقييم الفني',
      relatedTitle: 'عائلات المنتجات ذات الصلة',
      relatedNote: 'تؤدي هذه الروابط إلى عائلات المنتجات الموجودة في الكتالوج، ولا تعني أن كل منتج مناسب لهذا القطاع. يجب التحقق من الاختيار النهائي وفق وثائق الشركة المصنّعة وظروف التطبيق.',
      informationTitle: 'المعلومات المطلوبة للتقييم الفني',
      faqTitle: 'الأسئلة الشائعة',
      contactTitle: 'شاركنا المتطلبات الفنية لمشروعك',
      emailAction: 'إعداد مسودة بريد إلكتروني',
      emailNote: 'يفتح الرابط مسودة بموضوع ونص جاهزين في تطبيق البريد لديك، ولا يرسل الرسالة تلقائيًا. راجع المعلومات ثم أرسل الرسالة من تطبيق البريد الخاص بك.',
      sectorsLabel: 'القطاعات',
      testCenterLabel: 'مركز الاختبار',
      applicationsLabel: 'التطبيقات',
    },
    sectors: {
      offshore: {
        title: 'المشروعات البحرية',
        cardDescription: 'حلول الخراطيم والوصلات لظروف التشغيل الصعبة في تطبيقات البحر المفتوح.',
        h1: 'حلول الخراطيم والوصلات للمشروعات البحرية',
        intro: 'نقدم حلول الخراطيم والوصلات لظروف التشغيل الصعبة في تطبيقات البحر المفتوح. شارك فريقنا المتطلبات الفنية لتطبيقك لمناقشة خيارات المنتجات المناسبة.',
        meta: { title: 'حلول الخراطيم والوصلات للمشروعات البحرية', description: 'تقييم الخراطيم والوصلات والوثائق للخطوط الهيدروليكية وخطوط الضغط العالي في المشروعات البحرية. شارك ظروف التشغيل مع UHPHORTUM.' },
        needs: [
          { title: 'وظيفة التطبيق ومتطلبات الخط', text: 'حدّد وظيفة الخط الهيدروليكي أو معدات الصيانة أو تطبيق الضغط العالي. تُؤخذ الحركة ومسار الخط ومساحة التركيب في الاعتبار عند تقييم المنتج.' },
          { title: 'المائع وظروف التشغيل', text: 'قدّم ضغط التشغيل ونوع المائع ودرجة الحرارة والظروف البيئية معًا. يجب التحقق بشكل منفصل من المتطلبات الخاصة بالبيئة البحرية وفق وثائق المنتج.' },
          { title: 'الوصلات والوثائق', text: 'تُقيَّم معايير الوصلات وأبعادها وتفاصيل الإحكام مع الخرطوم. اذكر أي متطلبات لموافقات أو وثائق خاصة بالمشروع في الاستفسار الأول.' },
        ],
        information: ['وظيفة التطبيق وضغط التشغيل ونوع المائع ودرجة الحرارة', 'قطر الخرطوم وطوله وحركته وظروف تركيبه', 'نوع الوصلات وأبعادها عند الطرفين', 'مواصفات المشروع ورمز المنتج الحالي والوثائق المطلوبة'],
        faq: [
          { question: 'هل جميع خراطيم الكتالوج مناسبة للاستخدام البحري؟', answer: 'لا. يجب تقييم الظروف البيئية ومتطلبات المشروع لكل منتج على حدة. لا تُفترض مقاومة البيئة البحرية أو الموافقات الخاصة إلا إذا أكّدتها وثائق المنتج المعني.' },
          { question: 'هل يكفي رمز الخرطوم الحالي لاختيار البديل؟', answer: 'يوفر رمز المنتج نقطة بداية. يلزم أيضًا تقديم ظروف التشغيل وأبعاد الخرطوم وتفاصيل الوصلات؛ فالرمز وحده لا يؤكد التكافؤ أو الملاءمة.' },
        ],
        relatedLabels: { '/hidrolik': 'عائلات الخراطيم الهيدروليكية', '/uhp/helix-hoses': 'خراطيم HELIX للضغط العالي', '/uhp/fittings': 'وصلات UHP' },
        emailSubject: 'طلب دعم فني لمشروع بحري',
        emailBody: 'مرحبًا، أطلب تقييمًا فنيًا لمشروع بحري عبر موقع UHPHORTUM.\n\nالتطبيق: \nضغط التشغيل: \nالمائع ودرجة الحرارة: \nقطر الخرطوم وطوله: \nنوع الوصلات وأبعادها: \nالظروف البيئية والمواصفات: \nرمز المنتج / الوثائق المطلوبة: \nالشركة وبيانات التواصل: ',
      },
      'savunma-sanayi': {
        title: 'الصناعات الدفاعية',
        cardDescription: 'حلول الخراطيم الهيدروليكية وخراطيم الضغط العالي للمتطلبات الفنية للمشروعات الدفاعية.',
        h1: 'حلول الخراطيم والوصلات للصناعات الدفاعية',
        intro: 'نقدم حلول الخراطيم الهيدروليكية وخراطيم الضغط العالي للمتطلبات الفنية للمشروعات الدفاعية. تُقيَّم خيارات المنتجات وفق مواصفات المشروع وظروف التشغيل.',
        meta: { title: 'حلول الخراطيم للصناعات الدفاعية', description: 'تقييم الخراطيم الهيدروليكية والوصلات وفق مواصفات المشروعات الدفاعية. تواصل معنا بشأن وثائق المنتجات وعرض السعر الخاص بمشروعك.' },
        needs: [
          { title: 'التقييم وفق المواصفات', text: 'حدّد المواصفات الفنية المسموح بمشاركتها وإصدارها المعتمد. تُقارَن ظروف التشغيل والوثائق المطلوبة ببيانات المنتجات الواردة في الكتالوج.' },
          { title: 'الخراطيم وواجهات التوصيل', text: 'يجب النظر إلى قطر الخرطوم وطوله ووصلات الأطراف وحدود التركيب معًا. يمكن أن يساعد رسم المشروع أو رمز المنتج الحالي في هذا التقييم.' },
          { title: 'استفسار وعرض سعر خاص بالمشروع', text: 'أرفق الكمية ووصف المنتجات والوثائق الفنية المطلوبة. يُناقَش نطاق العرض بعد توضيح المتطلبات، دون افتراض موافقة عامة أو صفة مورّد معتمد.' },
        ],
        information: ['المواصفات المسموح بمشاركتها وإصدارها والمتطلبات الفنية', 'ضغط التشغيل ونوع المائع ونطاق درجات الحرارة', 'أبعاد الخرطوم وواجهات التوصيل وحدود التركيب', 'الكمية ورمز المنتج الحالي والوثائق المطلوبة'],
        faq: [
          { question: 'ما المواصفات المعتمدة لاختيار المنتج؟', answer: 'يستند التقييم إلى المتطلبات الفنية المحددة للمشروع. لا تُفترض موافقة أو مطابقة محددة قبل تقديم المواصفات المعنية وإصدارها.' },
          { question: 'ما الوثائق التي ينبغي إرفاقها بطلب عرض السعر؟', answer: 'قدّم المواصفات أو رسم الوصلات أو رمز المنتج المسموح بمشاركته، مع ظروف التشغيل والكمية. اذكر احتياجات الوثائق بشكل منفصل.' },
        ],
        relatedLabels: { '/hidrolik/high-pressure': 'خراطيم هيدروليكية للضغط العالي', '/baglanti-elemanlari/standard-inserts': 'أطراف توصيل قياسية', '/uhp/helix-hoses': 'عائلة خراطيم HELIX' },
        emailSubject: 'طلب دعم فني لمشروع في الصناعات الدفاعية',
        emailBody: 'مرحبًا، أطلب تقييمًا فنيًا لمشروع في الصناعات الدفاعية عبر موقع UHPHORTUM.\n\nمتطلبات المشروع المسموح بمشاركتها وإصدار المواصفات: \nضغط التشغيل: \nالمائع ودرجة الحرارة: \nأبعاد الخرطوم والوصلات: \nرمز المنتج والكمية: \nالوثائق المطلوبة: \nالشركة وبيانات التواصل: ',
      },
      'endustriyel-tesisler': {
        title: 'المنشآت الصناعية',
        cardDescription: 'خراطيم ومكونات أنظمة لتطبيقات الإنتاج والصيانة والتنظيف الصناعي.',
        h1: 'خراطيم ومكونات أنظمة للمنشآت الصناعية',
        intro: 'نقدم خراطيم ومكونات أنظمة لتطبيقات الإنتاج والصيانة والتنظيف الصناعي. يساعد دعمنا الفني في تقييم خيارات المنتجات وفق ظروف التشغيل لديكم.',
        meta: { title: 'حلول الخراطيم للمنشآت الصناعية', description: 'خراطيم ومكونات للإنتاج والصيانة والتنظيف الصناعي. اطلب تقييمًا للمنتجات استنادًا إلى بيانات المائع والضغط والوصلات.' },
        needs: [
          { title: 'خطوط الإنتاج والصيانة', text: 'اشرح وظيفة الخرطوم في خط الإنتاج أو احتياج الصيانة. تساعد بيانات المعدات الحالية وطول الخط والحركة في تحديد نطاق طلب الاستبدال أو المنتج الجديد.' },
          { title: 'التنظيف الصناعي', text: 'يتطلب ضغط معدات التنظيف والمائع المستخدم وتفاصيل الوصلات تقييمًا منفصلًا. لا يُفترض أن خطوط الإنتاج والتنظيف تعمل في الظروف نفسها.' },
          { title: 'الربط بالنظام الحالي', text: 'شارك رمز المنتج ووصلات الأطراف وأبعاد التركيب. تُراجَع مكونات الخرطوم والتوصيل وفق بيانات الشركة المصنّعة لتحديد الخيارات المتاحة في الكتالوج.' },
        ],
        information: ['مهمة الإنتاج أو الصيانة أو التنظيف والمائع المستخدم', 'ضغط التشغيل ودرجة الحرارة وظروف الاستخدام', 'قطر الخرطوم وطوله ووصلات الأطراف', 'رمز المنتج الحالي والكمية وموعد الصيانة المخطط'],
        faq: [
          { question: 'هل يمكن استخدام الخرطوم نفسه للإنتاج والتنظيف؟', answer: 'لا يمكن تحديد ذلك دون بيانات التطبيق. يجب تقييم المائع والضغط والحرارة والوصلات لكل استخدام بصورة منفصلة وفق وثائق المنتج.' },
          { question: 'ما المعلومات المطلوبة لطلب الصيانة المخططة؟', answer: 'اذكر رموز المنتجات الحالية والأبعاد والكميات وموعد الصيانة المخطط. يساعد الموعد في تنظيم الطلب، لكنه لا يمثل تأكيدًا لتوفر المخزون أو التزامًا بموعد التسليم.' },
        ],
        relatedLabels: { '/endustriyel/industrial-automation': 'خراطيم الأتمتة الصناعية', '/endustriyel/water': 'عائلات المنتجات لتطبيقات المياه', '/uhp/helix-hoses': 'خراطيم HELIX للضغط العالي' },
        emailSubject: 'طلب دعم فني لمنشأة صناعية',
        emailBody: 'مرحبًا، أطلب تقييمًا فنيًا لمنشأتنا الصناعية عبر موقع UHPHORTUM.\n\nتطبيق الإنتاج / الصيانة / التنظيف: \nالمائع: \nضغط التشغيل ودرجة الحرارة: \nقطر الخرطوم وطوله: \nنوع الوصلات وأبعادها: \nرمز المنتج الحالي والكمية: \nموعد الصيانة المخطط: \nالشركة وبيانات التواصل: ',
      },
      rafineriler: {
        title: 'المصافي',
        cardDescription: 'حلول الخراطيم والوصلات لتطبيقات صيانة المصافي وتنظيفها ونقل الموائع.',
        h1: 'حلول الخراطيم والوصلات للمصافي',
        intro: 'نقدم حلول الخراطيم والوصلات لتطبيقات صيانة المصافي وتنظيفها ونقل الموائع. يُقيَّم اختيار المنتج وفق ظروف العملية والمتطلبات الفنية ذات الصلة.',
        meta: { title: 'حلول الخراطيم والوصلات للمصافي', description: 'تقييم الخراطيم لصيانة المصافي والتنظيف ونقل الموائع. شارك متطلبات التوافق الكيميائي وظروف العملية والوصلات مع UHPHORTUM.' },
        needs: [
          { title: 'المائع وظروف العملية', text: 'الوصف الدقيق للمائع وتركيزه عند الحاجة ودرجة حرارة التشغيل هي بيانات أولية للتقييم. يجب التحقق من التوافق الكيميائي وفق بيانات الشركة المصنّعة للمنتج المعني.' },
          { title: 'متطلبات الصيانة والتنظيف', text: 'حدّد موائع التنظيف وظروف تشغيل المعدات بصورة منفصلة عن ظروف العملية المعتادة. أرفق أيضًا أبعاد الخط المستخدم أثناء الصيانة وتفاصيل وصلاته.' },
          { title: 'مواصفات الموقع والوصلات', text: 'يُنظر إلى نوع الوصلات ومتطلبات المواد والوثائق الخاصة بالموقع معًا. لا يعني اسم عائلة المنتج وحده موافقة خاصة للموقع أو توافقًا مع جميع الموائع.' },
        ],
        information: ['اسم المائع وتركيزه عند الحاجة ودرجة حرارته', 'ضغط التشغيل وظروف الصيانة والتنظيف', 'قطر الخرطوم وطوله ونوع الوصلات وأبعادها', 'مواصفات الموقع ومتطلبات المواد والكمية والوثائق المطلوبة'],
        faq: [
          { question: 'هل تناسب عائلة خراطيم كيميائية جميع الموائع؟', answer: 'لا. يجب تقييم تركيب المائع وتركيزه ودرجة حرارته وضغطه معًا. تُؤكَّد الملاءمة بالرجوع إلى بيانات الشركة المصنّعة للمنتج المعني.' },
          { question: 'كيف أنقل المتطلبات الخاصة بالموقع؟', answer: 'أرفق المواصفات الحالية والوثائق المطلوبة بالاستفسار. تُراجَع متطلبات المطابقة أو الشهادات الخاصة لكل منتج على حدة، دون افتراض موافقة عامة للمصافي.' },
        ],
        relatedLabels: { '/endustriyel/chemicals': 'عائلات المنتجات لنقل المواد الكيميائية', '/endustriyel/water': 'تطبيقات المياه والتنظيف', '/uhp/adapters': 'محوّلات UHP' },
        emailSubject: 'طلب دعم فني لتطبيق في المصفاة',
        emailBody: 'مرحبًا، أطلب تقييمًا فنيًا لتطبيق في المصفاة عبر موقع UHPHORTUM.\n\nتطبيق الصيانة / التنظيف / نقل الموائع: \nالمائع وتركيزه: \nضغط التشغيل ودرجة الحرارة: \nأبعاد الخرطوم والوصلات: \nمواصفات الموقع ومتطلبات المواد: \nالكمية والوثائق المطلوبة: \nالشركة وبيانات التواصل: ',
      },
    },
    test: {
      title: 'مركز اختبار الضغط العالي بقدرة 4500 بار',
      intro: 'يلبي مركز اختبار UHPHORTUM بقدرة 4500 بار احتياجاتكم لاختبارات الضغط العالي في تركيا.',
      teaserDescription: 'تواصل مع فريقنا لمناقشة نطاق الاختبار ومتطلباتك الفنية.',
      teaserCta: 'تعرّف على خدمة الاختبار',
      meta: { title: 'مركز اختبار الضغط العالي بقدرة 4500 بار', description: 'التقييم الفني والاستفسارات لمركز اختبار UHPHORTUM بقدرة 4500 بار. شارك خصائص المنتج وحدود الشركة المصنّعة ومتطلبات الاختبار.' },
      aboutTitle: 'عن خدمة الاختبار',
      aboutText: 'يمكنك مناقشة طلب اختبار الضغط العالي لمنتجك أو معداتك مع فريقنا الفني. يُبحث نطاق الخدمة بعد توضيح بيانات المنتج والظروف المطلوبة.',
      evaluationTitle: 'التقييم الفني قبل متابعة الطلب',
      evaluationText: 'قدّم ضغط التشغيل المحدد من الشركة المصنّعة بصورة منفصلة عن ضغط الاختبار المطلوب. تُراجَع وثائق المنتج وأبعاد الوصلات والمواصفات إن وجدت لتقييم إمكانية إجراء الاختبار. مشاركة المعلومات ليست موافقة تلقائية على الاختبار.',
      capacityNote: '4500 بار هي القدرة المعلنة لمركز الاختبار، وليست ضغط تشغيل جميع الخراطيم المعروضة في الموقع. ولا تعني إمكانية اختبار كل منتج عند ضغط 4500 بار.',
      technicalNote: 'تُحدَّد إمكانية إجراء الاختبار وظروفه بعد تقييم خصائص المنتج وحدود الشركة المصنّعة والمتطلبات الفنية ذات الصلة.',
      informationTitle: 'المعلومات المطلوبة للاستفسار',
      information: ['المنتج أو المعدات المطلوب اختبارها', 'رمز المنتج أو الوثائق الفنية', 'ضغط التشغيل المحدد من الشركة المصنّعة', 'ضغط الاختبار المطلوب', 'نوع الوصلات وأبعادها', 'الكمية', 'المعيار أو المواصفات المطلوبة إن وجدت', 'التاريخ المطلوب', 'احتياجات التقارير أو الوثائق إن وجدت'],
      faq: [
        { question: 'هل يمكن اختبار كل خرطوم عند ضغط 4500 بار؟', answer: 'لا. قدرة المركز لا تغيّر الحدود المسموح بها للمنتج. تُحدَّد إمكانية الاختبار وظروفه وفق وثائق المنتج والمتطلبات الفنية.' },
        { question: 'هل يمكن طلب معيار أو مواصفات محددة؟', answer: 'أرفق المعيار أو المواصفات بالاستفسار إن وجدت. لا يُقدَّم التزام بالمطابقة لمعيار محدد قبل تقييم النطاق من الفريق الفني.' },
        { question: 'كيف أحدّد احتياجات التقارير أو الوثائق؟', answer: 'وضّح المعلومات والوثائق المطلوبة في الاستفسار الأول. يجب الاتفاق مسبقًا على متطلبات التقارير والوثائق مع تحديد نطاق الاختبار.' },
      ],
      contactTitle: 'التواصل بشأن خدمة الاختبار',
      contactCta: 'تواصل معنا بشأن خدمة الاختبار',
      emailSubject: 'استفسار عن مركز الاختبار بقدرة 4500 بار',
      emailBody: 'مرحبًا، أستفسر عن خدمة مركز الاختبار بقدرة 4500 بار عبر موقع UHPHORTUM.\n\nالمنتج / المعدات: \nرمز المنتج أو الوثائق الفنية: \nضغط التشغيل المحدد من الشركة المصنّعة: \nضغط الاختبار المطلوب: \nنوع الوصلات وأبعادها: \nالكمية: \nالمعيار / المواصفات إن وجدت: \nالتاريخ المطلوب: \nاحتياجات التقارير / الوثائق: \nالشركة وبيانات التواصل: ',
    },
  },
};
