# Transfer Oil Türkiye

Transfer Oil Türkiye için hazırlanmış Next.js App Router tabanlı, dört dilli kurumsal ve teknik ürün kataloğu. Proje; `transferoil_link_manifest.json` içindeki 343 benzersiz resmî kaydı tek kaynak doğruluk dosyası olarak kullanır ve her kaydı Türkçe, İngilizce, Rusça ve Arapça rotalarda sunar.

## Yerel çalıştırma

Node.js 20 kullanın:

```powershell
npm install
npm run dev
```

Ardından [http://127.0.0.1:3000/tr](http://127.0.0.1:3000/tr) adresini açın.

## Veri ve denetim komutları

```powershell
npm run source:audit
npm run assets:check
npm run product-finder:audit
npm run i18n:audit
npm run routes:check
npm run links:check
npm run lint
npm run build
```

Ana üretilen veri dosyaları:

- Kaynak registry: `src/data/transferoil/source-map.generated.json`
- Yerelleştirilmiş rotalar: `src/data/transferoil/routes.generated.json`
- Sayfa içerikleri: `src/content/transferoil/pages.generated.json`
- Ürün Bulucu dizini: `src/data/transferoil/product-finder.generated.json`
- Asset manifesti: `public/assets/transfer-oil/asset-manifest.json`

Kaynak HTML snapshotları yalnızca geliştirme cache'i olarak `.cache/transferoil/` altında tutulur; kullanıcıya sunulan görseller `public/assets/transfer-oil/` altındaki yerel dosyalardır.

## Netlify'a GitHub olmadan yayınlama

Netlify CLI ile proje klasöründen:

```powershell
npm install
npm run build
npx netlify login
npx netlify init
npx netlify deploy
npx netlify deploy --prod
```

`netlify.toml`, build komutunu `npm run build`, publish dizinini `.next` ve Node sürümünü 20 olarak tanımlar. Projenin şu an zorunlu bir ortam sırrı yoktur. Production metadata için Netlify'ın sağladığı `URL` değeri kullanılır; istenirse `NEXT_PUBLIC_SITE_URL` ile açıkça ayarlanabilir.

Ayrıntılı yayınlama ve kontrol listesi için `docs/netlify-deploy.md` dosyasına bakın.
