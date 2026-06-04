# UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01

Tarih: 2026-06-04
Repo: `servis-platform`
Branch snapshot: `m90d1_web_lint_inventory`

> Bu belge, `UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01` milestone'unun mobile-first panel audit snapshot'ıdır. Route ve panel listesini `web/src/App.jsx`, `web/src/layout/NavDock.jsx`, `web/src/copilot/screenRegistry.js` ve mevcut premium smoke route seti birlikte belirler.

## 1) Amaç

Bu milestone ürün/business flow değiştirmez. UI/panel/route/endpoint davranışı değiştirmez.

Amaç, mobil shell düzeltmesi sonrası tüm ana rol panellerinin:
- ilk viewport görünürlüğünü,
- first viewport'ta içerik görünürlüğünü,
- sidebar / NavDock kapalı varsayılan durumunu,
- backdrop ile açılıp kapanmasını,
- Sefer Abi launcher ile ana CTA örtüşmesini,
- ana aksiyon butonlarının tıklanabilirliğini,
- yatay taşma / overflow davranışını,
- sticky header / tab yoğunluğunu,
- empty / loading / error okunabilirliğini
panel bazında görünür hale getirmektir.

Bu belge:
- mobile-first audit görünürlüğü sağlar,
- browser-smoke report yapısını açıklar,
- panel bazlı PASS / PASS- / UX-FIX / BLOCKER / AUTH-BLOCKED / NOT-FOUND sınıflarını belirtir,
- final mobil kabul öncesi manuel incelemeyi kolaylaştırır.

## 2.0 Viewports ve kod kaynakları

Bu audit ilk sürümde iki viewport ile koşar:
- desktop `1440x900`
- mobile `390x844`

Sonraki refresh adayları:
- mobile `414x896`
- mobile `360x800`

Route ve panel seçimi şu kaynaklarla çapraz doğrulanır:
- `web/src/App.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/copilot/screenRegistry.js`
- `backend/src/ai/jobGuide/screenCatalog.js`
- `backend/src/ai/jobGuide/screenCatalog.roomCompany.js`
- `backend/scripts/ux_live_panel_premium_smoke_01.mjs`

## 2) Current audit snapshot

Bu snapshot `backend/artifacts/browser-smoke/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01/report.json` ve `report.md` üzerinden okunur.

| Metric | Value |
| --- | ---: |
| Route checks | `82` |
| Screenshot sayısı | `164` |
| Desktop route checks | `41` |
| Mobile route checks | `41` |
| Console errors | `8` |
| Page errors | `0` |
| PASS | `45` |
| PASS- | `37` |
| UX-FIX | `0` |
| BLOCKER | `0` |
| AUTH-BLOCKED | `0` |
| NOT-FOUND | `0` |

Current snapshot'ta `BLOCKER / NOT-FOUND` kapatıcıdır.
`AUTH-BLOCKED` report-only auth/session notudur.
`UX-FIX` 0 korunmalıdır.
Beklenen dağılım: `PASS 45 / PASS- 37 / UX-FIX 0 / BLOCKER 0 / NOT-FOUND 0`.

### Premium smoke comparison

Bu snapshot, `backend/scripts/ux_live_panel_premium_smoke_01.mjs` ile birebir aynı değildir. Premium smoke ile ortak route+viewport kesişimi `80` satırdır; geri kalan fark `/#/room/live` ile `/#/room/reports` swap'inden gelir. Bu nedenle `PASS- 37`, eski premium smoke'taki `PASS- 19` ile tek başına birebir kıyaslanmamalıdır.

| Metric | Premium smoke | All-roles audit | Not |
| --- | ---: | ---: | --- |
| Route checks | `82` | `82` | Route sayısı aynı, route seti birebir aynı değil. |
| PASS | `63` | `45` | Audit daha sıkı mobil etkileşim kontrolleri uyguluyor. |
| PASS- | `19` | `37` | `10` satır ortak PASS-, `26` satır premium PASS -> audit PASS-, `9` satır premium PASS- -> audit PASS. |
| Shared route+viewport pairs | `80` | `80` | Ortak kesişim sabit; `/#/room/live` premium'da, `/#/room/reports` audit'te var. |

Bu snapshot shell etkileşimlerini daha agresif ölçtüğü için sadece "kapsam genişlemesi" diye okunmamalıdır. `PASS-` artışının ana parçası mobile drawer / overflow / density sinyallerinden gelir; bu da takip edilmesi gereken gerçek bir panel kalitesi işaretidir.

## 3) Route coverage

Audit report iki viewport'u da dengeli gezer:
- desktop: `41`
- mobile: `41`

### Route family matrix

| Route family | Unique routes | Route checks | Viewports | Routes in audit | Coverage notu | Gap class |
| --- | ---: | ---: | --- | --- | --- | --- |
| Public / Landing / Login | `3` | `6` | desktop + mobile | `/#/landing`<br>`/#/public/landing`<br>`/#/` | Public vitrin, alias ve login root birlikte görünür. | `route-covered`, `cta-covered`, `panel-visible` |
| Super Admin | `6` | `12` | desktop + mobile | `/#/superadmin`<br>`/#/superadmin/onboarding-review`<br>`/#/superadmin/operations`<br>`/#/superadmin/audit`<br>`/#/superadmin/trust-quality`<br>`/#/superadmin/commercial-core` | Özet, review, ops, audit, quality ve ticari çekirdek gezilir. | `route-covered`, `tab-covered`, `needs-manual-review` |
| Room | `8` | `16` | desktop + mobile | `/#/room/shifts`<br>`/#/room/agreements`<br>`/#/room/commercial-flow`<br>`/#/room/operation-health`<br>`/#/room/reports`<br>`/#/room/map`<br>`/#/room/vehicles`<br>`/#/room/drivers` | Dispatch, agreement preview, compact route preview, reports, map ve density alanları gezer. | `route-covered`, `cta-not-covered`, `accordion-covered`, `drawer-not-covered` |
| Company | `6` | `12` | desktop + mobile | `/#/company`<br>`/#/company/shifts`<br>`/#/company/agreements`<br>`/#/company/commercial-flow`<br>`/#/company/operations`<br>`/#/company/map` | Vardiya -> sözleşme dönüşümü, agreement draft ve map yüzeyleri görünür. | `route-covered`, `cta-covered` |
| School | `5` | `10` | desktop + mobile | `/#/school`<br>`/#/school/operations`<br>`/#/school/commercial-flow`<br>`/#/school/shifts`<br>`/#/school/agreements` | Rol bazlı yüzeyler açılıyor; ticari ve agreement blokları daha sade olmalı. | `route-covered`, `needs-manual-review` |
| Organization | `5` | `10` | desktop + mobile | `/#/organization`<br>`/#/organization/operations`<br>`/#/organization/commercial-flow`<br>`/#/organization/shifts`<br>`/#/organization/agreements` | School benzeri yüzeyler açılıyor; ticari ve agreement kalabalığı izlenmeli. | `route-covered`, `needs-manual-review` |
| Driver | `4` | `8` | desktop + mobile | `/#/driver/today`<br>`/#/driver/route`<br>`/#/driver/map`<br>`/#/driver/checkin` | Bugün / rota / map / check-in yüzeyleri görünür. | `route-covered`, `mobile-covered` |
| Personel | `2` | `4` | desktop + mobile | `/#/personel/live`<br>`/#/personel/my` | Canlı takip ve benim servisim yüzeyleri sade. | `route-covered`, `panel-visible` |
| Parent | `2` | `4` | desktop + mobile | `/#/parent/live`<br>`/#/parent` | Canlı takip ve overview görünür; current snapshot'ta minimal okunabilirlik notları vardır. | `route-covered`, `needs-manual-review` |

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
- Room / Raporlar + Canlı takip / harita
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

| Interaction | Audit coverage | Gap class | Not |
| --- | --- | --- | --- |
| Public CTA / demo modal | Demo CTA açıldı ve modal doğrulandı. | `cta-covered` | Lead toplama akışı görünür; write flow açılmaz. |
| Review queue action strip | Aksiyon bandı görünür ve sayaç doğrulanır. | `cta-covered` | İnceleme kuyruk sinyali görünür kalır. |
| Company shift -> agreement CTA | `Sözleşmeye Dönüştür` akışı draft ekrana gider. | `cta-covered` | Bu akış liste ekranında bırakmaz. |
| Room dispatch / apply CTA | Seçili örnekte apply/preview yüzeyi görünür. | `cta-covered` | Dispatch yüzeyi okunur. |
| Room agreement detail accordion | Detay / fallback yüzeyi okunur. | `drawer-covered` | Agreement preview daha kompakt kalmalıdır. |
| Room route preview compact card | Kısa karar kartı görünür. | `accordion-covered` | Route preview kompakttır. |
| Super Admin tabs | Audit / quality / commercial core default tab yapısı ile görülür. | `tab-covered` | Tab switch coverage korunur. |
| Sefer Abi launcher / drawer | Authenticated yüzeylerde launcher görünür. | `drawer-not-covered` | Drawer açılışı audit tarafından kontrol edilir. |
| Mobile primary actions | Public, company, room, driver ve parent yüzeyleri mobile'da da gezilir. | `mobile-covered` | İlk viewport, CTA ve overflow sinyalleri ayrı notlarda tutulur. |

## 5) Gap classes

| Gap class | Anlamı |
| --- | --- |
| `route-covered` | Route audit tarafından açıldı. |
| `panel-visible` | Panel shell veya ana içerik göründü. |
| `desktop-covered` | Desktop viewport doğrulandı. |
| `mobile-covered` | Mobile viewport doğrulandı. |
| `cta-not-covered` | CTA görünmedi, eksik kaldı veya action coverage tamamlanmadı. |
| `tab-not-covered` | Tab switching coverage eksik. |
| `drawer-not-covered` | Drawer/lifted helper açılışı doğrulanmadı. |
| `auth-blocked` | Session/auth erişimi sınırladı; report-only nottur. |
| `not-found` | Route bulunamadı; kapatıcıdır. |
| `blocker` | Yanlış bucket / yanlış aksiyon / kırık akış; kapatıcıdır. |
| `needs-manual-review` | PASS- veya belirsiz coverage gap; final premium kabul öncesi bakılmalı. |

## 6) Mobile shell policy

- `BLOCKER` ve `NOT-FOUND` kapatıcıdır.
- `AUTH-BLOCKED` report-only auth/session notudur.
- `UX-FIX` 0 korunmalıdır.
- runtime-data commit dışı kalır.
- Browser-smoke artifacts commit dışı kalır.
- Bu belge ve check ürünü değiştirmez; yalnızca mobile-first coverage görünürlüğü sağlar.

## 7) PASS- evidence buckets

PASS- satırları birbirine göre örtüşebilir; yani bir panel birden fazla bucket'a aynı anda düşebilir. Bu yüzden bucket sayıları toplam PASS- sayısıyla birebir toplanmaz.

| Bucket | Panel sayısı | Not |
| --- | ---: | --- |
| Mobile drawer toggle / overlay / scroll-lock | `25` | `mobileDrawerToggleWorks`, `mobileDrawerBackdropVisible` ve `mobileBodyScrollLocked` sinyalleri. |
| Horizontal overflow | `13` | `horizontalOverflowControlled=false` görülen paneller. |
| Sticky header / tab yoğunluğu | `9` | `stickyHeaderTabsReadable=false` görülen paneller. |
| Launcher / primary action overlap | `3` | Sefer Abi launcher ana aksiyonu kapatıyor veya primary action click edilemiyor. |
| Primary action bulunamadı | `1` | Ana aksiyon görünmedi. |
| Console noise | `4` | Parent live / overview desktop+mobile satırlarında 403 console noise var; bunların `2` tanesi PASS-. |

Öncelikli mobil hotspot'lar:
- Room / Vardiyalar
- Room / Sözleşmeler
- Room / Operasyon Sağlığı
- Room / Raporlar
- Company / Sözleşmeler
- Company / Ticari Akış
- Organization / Ticari Akış
- Driver / Bugün, Rota, Harita, Check-in
- Personel / Benim Servisim
- Parent / Canlı Takip ve Overview

Mobil dar görünüm coverage'ı public, company, room, driver, personel ve parent yüzeylerinde doğrulanır.

## 8) Manual smoke checklist

Bu audit, browser-smoke çıktısının mobil shell düzeltmesi sonrası aynı dilde okunmasını sağlar:
- `npm run smoke:uxmobileallrolespanelaudit01`
- `npm run check:uxmobileallrolespanelaudit01`
- `npm run verify:final`

Öncelikli doğrulama yüzeyleri:
- `CommercialCorePanel.jsx`
- `CommercialFlowPanel.jsx`
- `AgreementsPanel.jsx`
- `VehiclesPanel.jsx`
- `DriversPanel.jsx`

## 9) Forbidden flows

Bu audit yalnızca görünürlük ve sınıflandırma sağlar; şu aksiyonları açmaz:
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
1. `npm run smoke:uxmobileallrolespanelaudit01`
2. `npm run check:uxmobileallrolespanelaudit01`
3. `npm run verify:final`

Bu dosya, `UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01` artifact'inin mobile-first panel audit karşılığı olarak güncel tutulmalıdır.

Sonraki fix milestone önerisi: `UX-MOBILE-ALL-ROLES-PANEL-FIX-01`.
