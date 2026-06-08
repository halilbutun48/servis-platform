# UX-BRAND-LOGIN-PREMIUM-01

Tarih: 2026-06-07
Repo: `servis-platform`
Branch snapshot: `m90d1_web_lint_inventory`

Bu not, SeferPakt giriş ekranını ve uygulama marka katmanını kullanıcı tarafından seçilen logo yönüne göre premium hale getiren patch hazırlığını özetler. Amaç yeni bir logo uydurmak değil; gönderilen referans panodaki SP + kalkan + iş birliği + sağ yukarı ok hissini, o görselden kırpılmış gerçek asset’lerle ürün içine taşımaktır.

## 1) Marka Sistemi

- Yeni brand component / bileşeni: `web/src/components/brand/SeferPaktLogo.jsx`
- Wrapper: `web/src/components/BrandMark.jsx`
- Varyantlar: `mark`, `compact`, `full`, `login`
- Referans yönü: `SP + kalkan + iş birliği + sağ yukarı ok`
- Renk yönü: lacivert, altın, krem
- Kırpılmış logo assetleri:
  - `web/public/seferpakt-lockup.png`
  - `web/public/seferpakt-app-icon.png`
  - `web/public/seferpakt-favicon.png`
- Public favicon wrapper: `web/public/vardis-favicon.svg`
- Public lockup wrapper: `web/public/vardis-logo.svg`

## 2) Login Deneyimi

- Login ekranı artık iki bölgeli premium layout kullanır.
- Sol tarafta hero alanı vardır.
- Sağ tarafta giriş kartı vardır.
- `authHeroCard` ve `authPanelCard` yapıları kullanılır.
- `authShell` desktop’ta iki kolon, mobile’da tek kolon çalışır.
- Demo erişim bilgileri `authDemoDetails` içinde collapsible olarak tutulur.
- Demo bilgileri ana giriş aksiyonunun önüne geçmez.

## 3) Görsel Yapı

- Hero alanı `login hero` olarak tasarlanır.
- Brand lockup, kullanıcı görselinden kırpılmış `SeferPaktLogo` ile gösterilir.
- `authHighlightsGrid` kısa değer önerileri verir.
- `authSubmit` gold vurgulu primary action’dır.
- `authError` hata durumunu görünür ama sade tutar.
- `authHeroPills` ve `authKickerPill` sistemi görsel ritim kurar.

## 4) Shell ve Menü

- App shell marka alanı `BrandMark compact` üzerinden yeni standardı kullanır.
- Nav dock marka alanı `BrandMark compact` üzerinden yeni standardı kullanır.
- Header compact logo, layout genişliğini bozmaz.
- Mobile davranışı ve drawer akışı değiştirilmez.

## 5) Kapsam ve Sınırlar

- Backend route/service davranışı değiştirilmez.
- Prisma/schema/migration açılmaz.
- runtime-data commit’e alınmaz.
- browser-smoke artifact commit’e alınmaz.
- Referans pano/screenshot doğrudan public asset olarak commit edilmez; yalnızca kırpılmış logo assetleri kullanılır.
- Auth flow, token/session ve role redirect mantığı korunur.
- Mobile login standardı korunur.

## 6) Kabul Kontrolü

- Desktop login premium görünür.
- Mobile login tek kolon ve rahat kullanım sağlar.
- Demo erişim bilgileri ikincil öncelikte kalır.
- Favicon ve app logo aynı brand diline bağlanır.
- Brand component reusable ve ölçeklenebilir kalır.
- Sefer Abi launcher ve shell navigasyonu etkilenmez.
