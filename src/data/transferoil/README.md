# Transfer Oil kaynak registry

Bu klasördeki `*.generated.json` dosyaları elle düzenlenmez. Tek kaynak doğruluk dosyası proje
kökündeki `transferoil_link_manifest.json` dosyasıdır.

Üretim sırası:

1. Canonical/redirect denetimi `source-resolution.generated.json` dosyasını üretir (varsa).
2. `node scripts/build-transferoil-registry.mjs` kaynak, rota ve içerik iskeletini yeniden üretir.
3. Faz içi denetimde `node scripts/audit-source-map.mjs --allow-pending-resolution` çalıştırılabilir.
4. Nihai denetimde `node scripts/audit-source-map.mjs` çalıştırılır; canonical çözümü bekleyen kayıt varsa hata verir.

Üretilen ana dosyalar:

- `source-map.generated.json`: Manifest alanları, canonical çözüm alanları ve locale rota eşlemesi.
- `routes.generated.json`: 343 kaynak rota ve TR/EN/RU/AR için toplam 1372 rota.
- `../../content/transferoil/pages.generated.json`: Sayfa tipi, teknik veri, asset ve yerelleştirilmiş içerik registry'si.

Runtime erişimi için `registry.ts` kullanılmalıdır. Bu modül locale önekini normalize eder, ID/path
aramaları sunar ve catch-all route için statik parametreleri üretir.
