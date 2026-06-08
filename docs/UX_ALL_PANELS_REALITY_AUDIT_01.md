# UX-ALL-PANELS-REALITY-AUDIT-01

Tarih: 2026-06-08
Repo: `servis-platform`
Çalışma notu: bu audit canlı browser snapshot'ına dayanır; browser-smoke artifacts ve runtime-data commit dışı kalır.

> Bu belge, tüm ana panellerin ve rollerin gerçek browser davranışını tek sweep içinde okumak için hazırlanmış reality audit özetidir. Amaç ürün akışını değiştirmek değil, görünürlük ve kalite sinyallerini netleştirmektir.

## Amaç

Bu milestone şu soruları cevaplar:
- Yatay overflow kontrol altında mı?
- Ana aksiyonlar görünür ve tıklanabilir mi?
- Sefer Abi launcher ana aksiyonu kapatıyor mu?
- Mobil kart / tablo / tab yoğunluğu okunabilir mi?
- Empty / loading / error durumları okunur mu?
- Console, page ve network hata sinyali var mı?

Bu audit, route/service/schema/auth/payment execution mantığına dokunmaz.

## Canlı snapshot

| Metric | Value |
| --- | ---: |
| Route checks | `82` |
| Screenshot sayısı | `164` |
| Desktop route checks | `41` |
| Mobile route checks | `41` |
| PASS | `82` |
| PASS- | `0` |
| UX-FIX | `0` |
| BLOCKER | `0` |
| AUTH-BLOCKED | `0` |
| NOT-FOUND | `0` |
| Console errors | `0` |
| Page errors | `0` |
| Network errors | `0` |
| Horizontal overflow issues | `0` |
| Launcher overlap issues | `0` |
| Empty/loading/error unreadable surfaces | `0` |

## İyi haberler

- Horizontal overflow tüm sweep boyunca kontrollü kaldı.
- Sefer Abi launcher authenticated yüzeylerde görünür kaldı ama primary action üstünü kapatmadı.
- Primary action olan yüzeylerde click doğrulaması temiz geçti.
- Console, page, and network error signals were clean.
- Console, page ve network hata sinyalleri temiz kaldı.
- Empty / loading / error okunabilirliğinde kırık bir yüzey görülmedi.
- browser-smoke artifacts stay outside the commit set.

## P1 Findings

Bu sweep'te kalan P1 yok.

Önceki mobile drawer ve sticky header / tab bulguları iki küçük frontend-only düzeltme ile kapandı:
- KVKK gate artık shell header'ın üstüne binmiyor; driver menüsü tekrar tıklanabilir.
- `shellTop` semantik olarak `header` olarak işaretlendiği için smoke, görünür sticky header alanını doğru görüyor.

## Primary action notu

`8` yüzeyde primary action candidate görünmedi. Bunlar by-design CTA-light yüzeyler olarak okundu:
- public landing / login yüzeyleri
- `/#/organization/commercial-flow`

Yani primary action visibility tarafında gerçek bir P0/P1 regresyon görülmedi.

## P0 Check

- P0 blocker yok.
- Yatay taşma yok.
- Launcher overlap yok.
- Console/page/network hata sinyali yok.

## Kullanılan kaynaklar

- `web/src/App.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/copilot/screenRegistry.js`
- `backend/src/ai/jobGuide/screenCatalog.js`
- `backend/src/ai/jobGuide/screenCatalog.roomCompany.js`
- `backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs`
- `backend/scripts/ux_all_panels_reality_audit_01.mjs`

## Komutlar

- `npm run smoke:uxallpanelsrealityaudit01`
- `npm run check:uxallpanelsrealityaudit01`

## Sonuç

Bu sweep'te P0 yok, kalan P1 de yok.

Sonraki adım, aynı iki küçük frontend-only düzeltme kalıbını yeni bir regresyon gelirse yeniden kullanmaktır. Route, service veya auth katmanına dokunmak gerekmez.
