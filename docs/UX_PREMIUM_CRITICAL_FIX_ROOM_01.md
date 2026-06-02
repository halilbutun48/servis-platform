# UX-PREMIUM-CRITICAL-FIX-ROOM-01

Tarih: 2026-06-02
Repo: `servis-platform`

## 1) Amaç
- Room kritik smoke satırlarını küçük, kontrollü bir dalgada kapatmak.
- Yeni business flow açmadan, sadece görünürlük ve okunabilirlik iyileştirmesi yapmak.
- Backend route/write-path, schema/migration, runtime-data ve browser-smoke artifact sınırlarını korumak.

## 2) Kalan kritik aileler
- Room / Vardiyalar
  - `Dispatch apply button not visible`
  - Mobilde CTA NavDock veya floating assistant tarafından kapanmamalı
- Room / Sözleşmeler
  - `Detayı aç` butonu görünür ve tıklanabilir olmalı
  - Detail okunabilir kalmalı
- Room / Sürücüler
  - Kullanıcı-facing `hash copy` / `id` copy görünmemeli
  - `Sürücü kaydı`, `Düşük canlılık`, `Çevrim dışı` ve `Sonraki vardiya` gibi güvenli metinler görünmeli

## 3) Uygulanan görünürlük standardı
- `roomCriticalFixScope` ile mobile-safe alt boşluk ve CTA hizası korunur.
- `roomActionCTA` ile dispatch ve detail CTA'ları z-index / scroll-margin güvenliğine alınır.
- `NavDock` ve floating assistant overlay çakışmaları safe-area padding ile azaltılır.

## 4) Güvenli metinler
- `Sürücü kaydı`
- `Düşük canlılık`
- `Çevrim dışı`
- `Mevcut vardiya`
- `Sonraki vardiya`
- `Ad / kod`

## 5) Kabul sınırları
- Bu milestone yeni business flow eklemez.
- Backend route/write-path değişmez.
- Backend auth/business route değişmez.
- Schema/migration yok.
- Runtime-data commit dışı kalır.
- Browser-smoke artifact commit dışı kalır.
- Playwright runner policy değişmez.
- Coverage matrix fail policy değişmez.
- Payment / settlement / invite / user create / supplier verification / contract execute / route apply / SMS / push / notification / AI capability eklenmez.

## 6) Son not
- Bu dalga yalnız Room kritik satırları hedefler.
- Company / Parent / Personel / Super Admin / Driver route ve check-in flow'ları bu dalganın kapsamı değildir.
