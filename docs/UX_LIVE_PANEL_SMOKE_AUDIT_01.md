# UX-LIVE-PANEL-COVERAGE-MATRIX-01

Tarih: 2026-05-31
Repo: `servis-platform`
Branch snapshot: `m90d1_web_lint_inventory`

> Bu dosya adı `UX_LIVE_PANEL_SMOKE_AUDIT_01.md` olarak korunur; ancak içerik olarak `UX-LIVE-PANEL-COVERAGE-MATRIX-01` milestone'unun Coverage matrix snapshot'ıdır.

## 1) Amaç

Bu milestone ürün/business flow değiştirmez. UI/panel/route/endpoint davranışı değiştirmez.

Amaç, Playwright premium smoke altyapısının hangi:
- route,
- panel,
- tab,
- drawer,
- CTA,
- mobile/desktop yüzeylerini
gezdiğini görünür hale getirmektir.

Bu belge:
- coverage görünürlüğü sağlar,
- smoke report yapısını açıklar,
- coverage gap'lerini sınıflandırır,
- final premium kabul öncesi manuel incelemeyi kolaylaştırır.

## 2) Current smoke snapshot

Bu snapshot `backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.json` ve `report.md` üzerinden okunur.

| Metric | Value |
| --- | ---: |
| Route checks | `82` |
| Screenshot sayısı | `164` |
| Desktop route checks | `41` |
| Mobile route checks | `41` |
| Console errors | `8` |
| Page errors | `0` |
| PASS | `9` |
| PASS- | `35` |
| UX-FIX | `38` |
| BLOCKER | `0` |
| AUTH-BLOCKED | `0` |
| NOT-FOUND | `0` |

Current snapshot'ta `BLOCKER / NOT-FOUND` kapatıcıdır.
`AUTH-BLOCKED` report-only auth/session notudur.
`UX-FIX` coverage gap olabilir; final premium kabul öncesi ele alınmalıdır.

## 3) Route coverage

Smoke report iki viewport'u da dengeli gezer:
- desktop: `41`
- mobile: `41`

### Route family matrix

| Route family | Unique routes | Route checks | Viewports | Routes in smoke | Coverage notu | Gap class |
| --- | ---: | ---: | --- | --- | --- | --- |
| Public / Landing / Login | `3` | `6` | desktop + mobile | `/#/landing`<br>`/#/public/landing`<br>`/#/` | Public vitrin, alias ve login root birlikte görünür. | `route-covered`, `cta-covered`, `panel-visible` |
| Super Admin | `6` | `12` | desktop + mobile | `/#/superadmin`<br>`/#/superadmin/onboarding-review`<br>`/#/superadmin/operations`<br>`/#/superadmin/audit`<br>`/#/superadmin/trust-quality`<br>`/#/superadmin/commercial-core` | Özet, review, ops, audit, quality ve ticari çekirdek gezilir. | `route-covered`, `tab-covered`, `needs-manual-review`, `UX-FIX` |
| Room | `8` | `16` | desktop + mobile | `/#/room/shifts`<br>`/#/room/agreements`<br>`/#/room/commercial-flow`<br>`/#/room/operation-health`<br>`/#/room/live`<br>`/#/room/map`<br>`/#/room/vehicles`<br>`/#/room/drivers` | Dispatch, agreement preview, compact route preview, live map ve density alanları gezer. | `route-covered`, `cta-not-covered`, `accordion-covered`, `drawer-not-covered`, `UX-FIX` |
| Company | `6` | `12` | desktop + mobile | `/#/company`<br>`/#/company/shifts`<br>`/#/company/agreements`<br>`/#/company/commercial-flow`<br>`/#/company/operations`<br>`/#/company/map` | Vardiya -> sözleşme dönüşümü, agreement draft ve map yüzeyleri görünür. | `route-covered`, `cta-covered`, `UX-FIX` |
| School | `5` | `10` | desktop + mobile | `/#/school`<br>`/#/school/operations`<br>`/#/school/commercial-flow`<br>`/#/school/shifts`<br>`/#/school/agreements` | Rol bazlı yüzeyler açılıyor; ticari ve agreement blokları daha sade olmalı. | `route-covered`, `needs-manual-review`, `UX-FIX` |
| Organization | `5` | `10` | desktop + mobile | `/#/organization`<br>`/#/organization/operations`<br>`/#/organization/commercial-flow`<br>`/#/organization/shifts`<br>`/#/organization/agreements` | School benzeri yüzeyler açılıyor; ticari ve agreement kalabalığı izlenmeli. | `route-covered`, `needs-manual-review`, `UX-FIX` |
| Driver | `4` | `8` | desktop + mobile | `/#/driver/today`<br>`/#/driver/route`<br>`/#/driver/map`<br>`/#/driver/checkin` | Bugün / rota / map / check-in yüzeyleri görünür. | `route-covered`, `mobile-covered`, `UX-FIX` |
| Personel | `2` | `4` | desktop + mobile | `/#/personel/live`<br>`/#/personel/my` | Canlı takip ve benim servisim yüzeyleri sade. | `route-covered`, `panel-visible` |
| Parent | `2` | `4` | desktop + mobile | `/#/parent/live`<br>`/#/parent` | Canlı takip ve overview görünür; current snapshot'ta 403 console gürültüsü var. | `route-covered`, `needs-manual-review`, `auth-blocked` |

## 4) Panel coverage

### Covered panels

- Public / Landing / public başvuru
- Super Admin / Genel Bakış
- Super Admin / Lead review
- Super Admin / Ticari Akış
- Super Admin / Güven ve Kalite
- Super Admin / Denetim / Saha Kabul
- Room / Operasyon Sağlığı
- Room / Vardiyalar / Bekleyen Talepler
- Room / Ticari Akış
- Room / Sözleşmeler
- Room / Canlı takip / harita
- Room / Araçlar
- Room / Sürücüler
- Company / Özet / Operations
- Company / Vardiyalar
- Company / Ticari Akış
- Company / Sözleşmeler
- Company / Harita
- Sefer Abi / Copilot drawer
- School / Organization ana panelleri
- Driver / Bugün ve Rota
- Personel / Canlı Takip + Benim Servisim
- Parent / Canlı Takip

### Interaction coverage

| Interaction | Smoke coverage | Gap class | Not |
| --- | --- | --- | --- |
| Public CTA / demo modal | Demo CTA açıldı ve modal doğrulandı. | `cta-covered` | Lead toplama akışı görünür; write flow açılmaz. |
| Review queue action strip | Aksiyon bandı görünür ama current snapshot'ta `0/3` eksik. | `cta-not-covered`, `UX-FIX` | İnceleme kuyruk sinyali var, ama action yoğunluğu eksik. |
| Company shift -> agreement CTA | `Sözleşmeye Dönüştür` akışı draft ekrana gidiyor. | `cta-covered` | Bu akış liste ekranında bırakmaz. |
| Room dispatch / apply CTA | Seçili örnekte `Önizlemeyi Uygula: Böl & Onayla` görünmedi. | `cta-not-covered`, `needs-manual-review` | Dispatch yüzeyi okunur, fakat coverage gap var. |
| Room agreement detail accordion | `Detayı aç` görünmedi. | `drawer-not-covered`, `UX-FIX` | Agreement preview daha kompakt olmalı. |
| Room route preview compact card | Kısa karar kartı görünür. | `accordion-covered` | Route preview kompakttır. |
| Super Admin tabs | Audit / quality / commercial core default tab yapısı ile görülür. | `tab-covered`, `tab-not-covered` | Tab switch coverage tam değil. |
| Sefer Abi launcher / drawer | Authenticated yüzeylerde launcher görünür. | `drawer-not-covered` | Drawer açılışı smoke tarafından yapılmaz. |
| Mobile primary actions | Public, company, room, driver ve parent yüzeyleri mobile'da da gezilir. | `mobile-covered` | Company shift conversion mobile'da force-click fallback ile doğrulandı. |

## 5) Gap classes

| Gap class | Anlamı |
| --- | --- |
| `route-covered` | Route smoke tarafından açıldı. |
| `panel-visible` | Panel shell veya ana içerik göründü. |
| `desktop-covered` | Desktop viewport doğrulandı. |
| `mobile-covered` | Mobile viewport doğrulandı. |
| `cta-not-covered` | CTA görünmedi, eksik kaldı veya action coverage tamamlanmadı. |
| `tab-not-covered` | Tab switching coverage eksik. |
| `drawer-not-covered` | Drawer/lifted helper açılışı doğrulanmadı. |
| `auth-blocked` | Session/auth erişimi sınırladı; report-only nottur. |
| `not-found` | Route bulunamadı; kapatıcıdır. |
| `blocker` | Yanlış bucket / yanlış aksiyon / kırık akış; kapatıcıdır. |
| `needs-manual-review` | UX-FIX veya belirsiz coverage gap; final premium kabul öncesi bakılmalı. |

## 6) Smoke policy

- `BLOCKER` ve `NOT-FOUND` kapatıcıdır.
- `AUTH-BLOCKED` report-only auth/session notudur.
- `UX-FIX` coverage gap olabilir; final premium kabul öncesi ele alınmalıdır.
- runtime-data commit dışı kalır.
- Browser-smoke artifacts commit dışı kalır.
- Runtime-data commit dışı kalır.
- Bu belge ve check ürünü değiştirmez; yalnızca coverage görünürlüğü sağlar.

## 7) Current hotspots

Current snapshot'ta UX-FIX yoğunluğu özellikle şu yüzeylerde toplanıyor:
- Super Admin / Ticari Akış
- Room / Ticari Akış
- Room / Sözleşmeler
- Room / Araçlar
- Room / Sürücüler
- Company / Ticari Akış
- Company / Sözleşmeler
- Driver / Rota ve Check-in
- Parent / Canlı Takip / Overview

Parent yüzeylerinde console gürültüsü var; bu, coverage matrix içinde `needs-manual-review` olarak raporlanır.
- Mobil dar görünüm coverage'ı public, company, room, driver ve parent yüzeylerinde doğrulanır.

## 8) Manual smoke checklist

Bu coverage matrix, browser-smoke çıktısının manuel premium doğrulama akışıyla aynı dilde okunmasını sağlar:
- `npm run smoke:uxlivepanelpremium01`
- `npm run check:uxlivepanelsmokeaudit01`
- `npm run verify:final`

Öncelikli doğrulama yüzeyleri:
- `CommercialCorePanel.jsx`
- `CommercialFlowPanel.jsx`
- `AgreementsPanel.jsx`
- `VehiclesPanel.jsx`
- `DriversPanel.jsx`

## 9) Forbidden flows

Bu coverage matrix yalnızca görünürlük ve sınıflandırma sağlar; şu aksiyonları açmaz:
- payment execute
- billing execute
- collection execute
- contract execute
- invite send
- user create
- supplier verification auto
- settlement execute

## 10) Next refresh

Smoke veya panel içerikleri değiştiğinde:
1. `npm run smoke:uxlivepanelpremium01`
2. `npm run check:uxlivepanelsmokeaudit01`
3. `npm run verify:final`

Bu dosya, mevcut `UX-LIVE-PANEL-SMOKE-AUDIT_01` isimli artifact'in coverage matrix karşılığı olarak güncel tutulmalıdır.
