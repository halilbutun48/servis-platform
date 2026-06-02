# UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01

Tarih: 2026-06-02
Repo: `servis-platform`

## 1) Amaç
- Company, Organization ve School agreements yüzeylerinde kalan kritik detail CTA / readability satırlarını küçük ve kontrollü bir dalgada kapatmak.
- Detay görünürlüğünü, preview okunabilirliğini ve mobile navDock güvenliğini netleştirmek.
- Yeni business flow, backend route/write-path, schema/migration, runtime-data veya runner policy açmamak.

## 2) Kalan kritik aileler
- Company / Sözleşmeler
  - `Detayı aç` CTA görünür ve tıklanabilir olmalı
  - Operasyon bağlantısı detail alanı okunabilir kalmalı
- Organization / Sözleşmeler
  - `Detayı aç` CTA görünür ve tıklanabilir olmalı
  - Mobile'da navDock detail click'i intercept etmemeli
- School / Sözleşmeler
  - `Önizlemeyi aç` / `Detayı aç` CTA görünür ve tıklanabilir olmalı
  - Mobile'da navDock detail click'i intercept etmemeli

## 3) Kullanılan görünürlük standardı
- `companyActionClarityScope` ile mobile-safe primary CTA hizası korunur.
- `AgreementOpsBridgeCard` detay alanı varsayılan açık kalır.
- `Detay ve önizleme` kartı, ana listede bridge view'e görünür giriş sağlar.
- `NavDock`, floating assistant ve alt sabit alanlar için safe-area + z-index hizası korunur.

## 4) Güvenli metinler
- `Detayı aç`
- `Taslağı incele`
- `Önizlemeyi aç`
- `Bu alan önizlemedir; işlem başlatmaz.`
- `Readonly preview`
- `Operasyon bağlantısı`
- `Okunabilir detay`
- Üst listede `Önizlemeyi aç`, bridge kartında `Detayı aç`

## 5) Kabul sınırları
- Bu milestone yeni business flow eklemez.
- Backend route/write-path değişmez.
- Backend auth/business route değişmez.
- Schema/migration yoktur.
- Runtime-data commit dışı kalır.
- Browser-smoke artifact commit dışı kalır.
- Playwright runner policy değişmez.
- Coverage matrix fail policy değişmez.
- Payment / settlement / invite / user create / supplier verification / contract execute / route apply / SMS / push / notification / AI capability eklenmez.

## 6) Not
- Bu dalga sadece agreements detail okunabilirliği ve CTA görünürlüğünü hedefler.
- Teknik/debug/raw/null/undefined kullanıcı-facing ana metinlerde görünmemelidir.
