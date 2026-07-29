# Transfer Oil animasyon parity denetimi

Bu denetim yalnızca kamuya açık sayfadaki hareket davranışlarını ölçer. Referans sitenin CSS veya JavaScript dosyaları projeye kopyalanmamıştır; davranışlar React ve yerel CSS ile yeniden oluşturulmuştur.

## Referans ve kanıt

- Referans: `https://www.transferoil.com/en/default.aspx`
- Arşivlenmiş kaynak: `.cache/transferoil/source-html/085.html`
- Ana video slaytı: `data-duration="32000"` (satır 577)
- Diğer slaytlar: `data-duration="5000"` (satırlar 592, 604, 615 ve 627)
- Resmi slider yapılandırmasının ölçülen davranışı: `fade`, 800 ms geçiş, hover sırasında duraklama.
- Referans slider minimum yüksekliği: masaüstünde 480 px, mobil portrede 436 px.
- Resmi giriş hareketlerinin ölçülen süreleri: genel öğe 1000 ms; başlık ve alt metin 1500 ms; bağlantı 1800 ms.
- Güncel masaüstü menü yüzeyi: `rgba(152,152,152,.97)`; gölge `0 1px 4px rgba(30,30,30,.7)`.

## Yerel uygulama

- Slider arka planları 800 ms, `ease`, yalnızca opacity fade geçişi kullanır.
- Slider görünür alanı masaüstünde 480 px, mobil portrede 436 px kullanır.
- Ana video slaytı 32 saniye, diğer mevcut slaytlar 5 saniye görünür.
- Hover ve klavye odağı bağımsız izlenir; ikisinden biri etkin olduğu sürece sayaç durur ve ardından kalan süreden devam eder.
- `prefers-reduced-motion: reduce` değişikliği canlı izlenir; otomatik ilerleme, hero videosu ve dekoratif hareketler durur.
- İlk slayt metni gecikmesiz girer. Sonraki slaytlarda başlık, alt metin ve CTA 800 ms fade tamamlandıktan sonra başlar.
- Çıkan başlık ve alt metin 1500 ms, CTA 1800 ms boyunca resmi yönde hareket eder; bütün metin grubuna ikinci bir opacity eğrisi uygulanmaz.
- Masaüstü mega menü, canlı computed-style ölçümündeki gibi animasyonsuz ve gecikmesiz açılır/kapanır; mobil menünün ayrı yumuşak açılışı korunur.
- CTA oku ve kategori kartları yalnızca küçük, profesyonel hover geri bildirimi verir.

Makine tarafından okunabilir sonuç `docs/reference/font-animation-parity-report.json` dosyasına `scripts/check-font-animation-parity.mjs` tarafından yazılır.
