# UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01

Tarih: 2026-06-08
Repo: `servis-platform`

`Company / Sözleşmeler` yüzeyinde mobil pariteyi, `Room / Sözleşmeler` görünümünü referans alarak ama onu değiştirmeden kapatan milestone notu.

## Amaç

- `Company / Sözleşmeler` ekranı küçük ekranda tablo baskısı yerine kart tabanlı akış kullanır.
- `desktopShiftTable` masaüstünde korunur.
- `mobileShiftCards` mobil breakpoint'te aktif olur.
- `Room / Sözleşmeler` yalnızca kıyas referansıdır; bu dalga room ekranını değiştirmez.
- `Sefer Abi launcher` safe-area ve bottom clearance korunur.

## Görsel Hedef

- Kart başında durum, uzatma ve kısa bağlam pill'leri görünür kalır.
- Teklif özeti, vardiya durumu ve ödeme / hakediş okumaları kart içinde kaybolmaz.
- Karar ve operasyon / uzatma aksiyonları mobilde yatay kaydırma zorlamadan erişilebilir kalır.
- Desktop'taki tablo görünümü aynı kalır; mobilde yeni kart yüzeyi okunur olur.

## Sınırlar

- Backend route/write-path değişmedi.
- Schema/migration yok.
- Runtime-data commit dışı kaldı.
- Browser-smoke commit dışı kaldı.
- Bu milestone yeni business flow eklemez.
- Room ekranı bu dalgada değiştirilmez.

## Doğrulama

- `npm run smoke:uxmobileallrolespanelaudit01`
- `npm run smoke:uxlivepanelpremium01`
- `npm run smoke:productflowbuttonaudit01`
- Kabul notları: `UX-FIX 0`, `BLOCKER 0`, `NOT-FOUND 0`
- `PASS-` artmamalı

## Referans

- `check:uxcompanyagreementsmobileparity01`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
