# UX-LIVE-PANEL-PREMIUM-SMOKE-01

## Amaç
Canlı web arayüzünde public, room, company, super admin, driver, personel ve parent panellerini gerçek tarayıcıyla açıp premium UX sinyallerini, screenshot çıktısını, console/page error durumunu ve kritik akış görünürlüğünü toplamak.

Bu milestone'un hedefi büyük refactor değil; canlı panel davranışını sistematik olarak görmek, sınıflandırmak ve küçük UX düzeltmelerine bağlamaktır.

## Çalıştırma

- `npm run smoke:uxlivepanelpremium01`
- `npm run check:uxlivepanelpremiumsmoke01`

## Varsayılan Ortam

- `WEB_BASE_URL=http://127.0.0.1:5173`
- `API_BASE_URL=http://127.0.0.1:3000`
- `HEADLESS=true`
- `SLOW_MO=0`

## Playwright / Chromium Notu

Playwright yerel değilse önce dev dependency olarak eklenir:

- `npm i -D @playwright/test`

Chromium browser binary kurulumu:

- `npx playwright install chromium`

## Browser Smoke Çıktıları

Smoke runner aşağıdaki artefact'leri üretir:

- `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.json`
- `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.md`
- `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/screenshots/**`

Bu artefact'ler commit'e alınmaz.

## Test Edilen Alanlar

- `/#/landing`
- `/#/public/landing`
- `/#/`
- `/#/superadmin`
- `/#/superadmin/onboarding-review`
- `/#/superadmin/operations`
- `/#/superadmin/audit`
- `/#/superadmin/trust-quality`
- `/#/superadmin/commercial-core`
- `/#/room/shifts`
- `/#/room/agreements`
- `/#/room/commercial-flow`
- `/#/room/operation-health`
- `/#/room/live`
- `/#/room/map`
- `/#/room/vehicles`
- `/#/room/drivers`
- `/#/company`
- `/#/company/shifts`
- `/#/company/agreements`
- `/#/company/commercial-flow`
- `/#/company/operations`
- `/#/company/map`
- `/#/school`
- `/#/school/operations`
- `/#/school/commercial-flow`
- `/#/school/shifts`
- `/#/school/agreements`
- `/#/organization`
- `/#/organization/operations`
- `/#/organization/commercial-flow`
- `/#/organization/shifts`
- `/#/organization/agreements`
- `/#/driver/today`
- `/#/driver/route`
- `/#/driver/map`
- `/#/driver/checkin`
- `/#/personel/live`
- `/#/personel/my`
- `/#/parent/live`
- `/#/parent`

## Durum Sınıfları

- `PASS`
- `PASS-`
- `UX-FIX`
- `BLOCKER`
- `AUTH-BLOCKED`
- `NOT-FOUND`

AUTH-BLOCKED raporlanır; erişim/session/auth notudur; tek başına smoke komutunu fail ettirmez. BLOCKER veya NOT-FOUND varsa smoke komutu fail olur.

## Değerlendirme Kriterleri

1. İlk 5 saniyede ekranın amacı anlaşılıyor mu?
2. En önemli bilgi üstte mi?
3. Kullanıcı sıradaki işlemi hemen görüyor mu?
4. Ana aksiyon net mi?
5. İkincil aksiyonlar ana aksiyonu boğuyor mu?
6. Panel gereksiz uzun mu?
7. Detaylar varsayılan açık gelip ekranı kalabalıklaştırıyor mu?
8. Harita / teknik detay / raw bilgi fazla baskın mı?
9. Önizleme kartları çok büyük mü?
10. Aynı bilgi tekrar ediyor mu?
11. Yanlış status / bucket var mı?
12. Mobilde taşma, sıkışma veya okunmazlık var mı?
13. Sefer Abi ana akışı gölgeliyor mu?
14. Public sayfa platform-first mi, yoksa AI reklamı gibi mi?
15. Kullanıcı "şimdi ne yapacağım?" cevabını alıyor mu?

## Kapsam Dışı

Bu milestone aşağıdaki flow'ları açmaz:

- payment execute
- billing execute
- collection execute
- contract execute/sign
- invite send
- user create
- supplier verification auto
- settlement execute

## Kamu Yüzeyi Sınırı

Public landing SeferPakt'ı kurumsal servis operasyon ve tedarik platformu olarak anlatır. Sefer Abi yalnızca secondary copilot sınırında kalır; genel amaçlı AI platformu gibi sunulmaz.

## Kullanım Notu

Run tamamlandıktan sonra `report.json` ve `report.md` üzerinden route bazlı durumlar, screenshot listesi ve error sinyalleri okunur.
