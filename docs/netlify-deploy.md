# Netlify Yayına Alma Notları

Bu proje Next.js App Router kullanır. Netlify, modern Next.js projelerinde gerekli OpenNext entegrasyonunu build sırasında uygular. Proje Git deposu bağlamadan da Netlify CLI ile yayınlanabilir.

## Proje ayarları

- Build komutu: `npm run build`
- Publish dizini: `.next`
- Node sürümü: `20`
- Base directory: proje kökü
- Zorunlu ortam sırrı: yok

Bu değerler `netlify.toml`, `.nvmrc` ve `package.json` ile uyumludur.

## GitHub olmadan CLI ile deploy

Proje kökünde sırasıyla:

```powershell
npm install
npm run build
npx netlify login
npx netlify init
npx netlify deploy
npx netlify deploy --prod
```

`netlify init` sırasında yeni bir site oluşturabilir veya mevcut Netlify sitesini bağlayabilirsiniz. İlk `netlify deploy` taslak adresi üretir; kontrol sonrası `--prod` komutu production yayınını yapar.

## İsteğe bağlı Git tabanlı deploy

GitHub, GitLab veya Bitbucket kullanılıyorsa Netlify panelindeki **Add new project → Import from Git** akışı da kullanılabilir. Build ayarları yine `netlify.toml` dosyasından okunur.

## Yayın sonrası kontrol listesi

- `/` kayıtlı dil yoksa `/tr` rotasına yönlenir.
- `/tr`, `/en`, `/ru`, `/ar` doğrudan yenilendiğinde açılır.
- Manifestteki 343 kaydın dört dilde 1.372 rotası HTTP 200 döner.
- `/tr/kurumsal`, `/tr/haberler`, `/tr/fuarlar`, `/tr/sertifikalar` ve `/tr/iletisim` açılır.
- `/assets/transfer-oil/` altındaki görsel ve videolar yüklenir.
- OpenStreetMap, WhatsApp, LinkedIn, YouTube ve resmî doküman bağlantıları çalışır.
- Arapça sayfalar `dir="rtl"` ile açılır.

Alan adı bağlandığında `NEXT_PUBLIC_SITE_URL` değerini tam HTTPS adresiyle tanımlamak canonical ve OpenGraph URL'lerini açık hale getirir.
