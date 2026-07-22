# REQUEST-STORM-RESILIENCE-01

Tarih: 2026-07-20
Repo: `servis-platform`

> Bu milestone, request-storm sırasında görülen duplicate request / 429 / console error kırılganlığını dar kapsamlı bir guard ile kapatır. Yeni kullanıcı özelliği açmaz; smoke threshold gevşetmez; route/service/prisma ve AI davranışını değiştirmez.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- request-storm sırasında smoke/check zincirindeki duplicate request riskini daraltmak
- desktop -> mobile geçişinde sharedStorageState reuse ile tekrar login / tekrar fetch flood'unu azaltmak
- console/page error eşiklerini gevşetmeden 429 regresyonunu görünür tutmak
- runtime-data, browser-smoke ve debug.log commit sınırını net bırakmak
- route/service/prisma ve insan onayı sınırını bozmadan guard eklemek

Bu çalışma:
- yeni UI davranışı eklemez
- backend route/service/prisma değiştirmez
- smoke PASS sayısını düşürmez
- threshold gevşetmez
- 429 ignore list açmaz
- write-action veya human approval sınırını gevşetmez

## 2) Problem statement

Önceki request-storm akışında aynı kullanıcı rolü için desktop oturumundan mobile aşamaya geçerken tekrar eden request yoğunluğu ve 429 sinyali görülme riski vardı.

Bu risk özellikle şu yüzeylerde önemlidir:
- premium smoke
- mobile all-roles audit
- product-flow button audit
- all-panels reality audit wrapper

Riskin özü:
- aynı akışta gereksiz tekrar login / storage reset request yaratılmamalı
- console/page error sayıları 0 kalmalı
- 429 veya Too Many Requests sinyali görünürse fail olmalı

## 3) Previous 429 finding

Önceki bulgu, desktop'tan mobile'e geçerken storage state reuse yoksa superadmin ve benzeri flow'larda duplicate request piki oluşabilmesiydi.

Bu milestone'da o bulguya karşı guard eklenir:
- duplicate request flood kabul edilmez
- 429 sinyali maskelemez
- console/page error policy gevşetilmez

## 4) StorageState/context reuse policy

Desktop viewport tamamlandıktan sonra ilgili smoke akışının storage state'i snapshot alınır ve mobile viewport aynı role ait context için yeniden kullanılır.

Bu policy:
- `sharedStorageState` ile taşınır
- desktop -> mobile geçişinde login tekrarını azaltır
- request flood riskini düşürür
- role isolation'ı bozmadan aynı role içinde tekrar kullanılabilir

Bu policy özellikle şu kaynaklarda tutulur:
- `backend/scripts/product_flow_button_audit_01.mjs`
- `backend/scripts/ux_live_panel_premium_smoke_01.mjs`
- `backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs`

## 5) Role isolation policy

Storage state reuse yalnızca aynı role ait desktop -> mobile geçişi için kullanılır.

Korumalar:
- public, superadmin, company, room, personel ve parent akışları birbirine karışmaz
- role-specific login tokenları paylaşılmaz
- farklı role'lar arasında state taşınmaz
- sharedStorageState, aynı role içindeki viewport geçişiyle sınırlıdır

## 6) Console/page error policy

Bu milestone için kabul edilen politika:
- product-flow ve premium smoke için `consoleErrorCount=0`
- all-panels reality audit ve mobile all-roles audit için `consoleErrorCount=0`
- `pageErrorCount=0`
- 429, Too Many Requests veya benzeri sinyal görünürse fail
- console/page error için ignore list açılmaz
- threshold gevşetilmez

## 7) What changed

Yapılan değişiklikler:
- request-storm resilience guard script'i eklendi: `backend/scripts/request_storm_resilience_01_check.js`
- milestone dokümanı eklendi: `docs/REQUEST_STORM_RESILIENCE_01.md`
- package alias eklendi: `check:requeststormresilience01`
- product-extensions chain'e yeni check eklendi
- verify chain ve script harness map'leri request-storm milestone'unu tanıyacak şekilde güncellendi
- primer ve milestone haritası yeni checkpoint'i gösteriyor
- `product_flow_button_audit_01.mjs` içinde desktop -> mobile `sharedStorageState` reuse eklendi

Bu değişiklikler user-facing davranışı değiştirmez; yalnızca smoke/check güvenilirliğini artırır.

## 8) What was explicitly not changed

- smoke threshold / skip / timing / PASS kriteri
- backend/src/routes
- backend/src/services
- backend route'ları
- backend service'leri
- prisma / backend/prisma şeması
- AI response semantic gate davranışı
- Turkish terminology veya user-facing language standardı
- human approval boundary
- write-action dispatch boundary
- global allowlist
- debug.log üretim politikası
- stage/commit sınırının dışına çıkma

## 9) Guard cases

Guard cases:
- package alias wiring
- product-extensions runner wiring
- verify chain wiring
- script harness check/doc wiring
- milestone guide wiring
- primer wiring
- doc section coverage
- sharedStorageState source coverage
- report.json count coverage
- 429 / Too Many Requests sinyali kontrolü
- runtime-data / browser-smoke / debug.log commit boundary
- route/service/prisma diff hygiene
- stage empty kontrolü

## 10) Validation results

Last validated baseline:
- `npm run smoke:productflowbuttonaudit01` -> `PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- `npm run smoke:uxlivepanelpremium01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- `npm run smoke:uxallpanelsrealityaudit01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- `npm run smoke:uxmobileallrolespanelaudit01` -> `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`

Validation policy:
- product-flow, premium, all-panels reality audit ve mobile all-roles audit için consoleErrorCount stays `0`
- pageErrorCount stays `0`
- stage empty stays true
- runtime-data stays commit-external
- browser-smoke stays commit-external
- debug.log stays absent

## 11) Remaining risks

- future route or smoke refactors can reintroduce duplicate request flood if sharedStorageState reuse is removed
- 429 regressions can return if mobile context bootstrap is split again
- `DASHBOARD-BULK-ENDPOINT-01` read-only bulk aggregation desteği devre dışı kalırsa dashboard fan-out tekrar büyüyebilir
- browser-smoke artifacts must stay out of the commit set
- stage empty policy must be preserved before commit
- `CACHE-COALESCING-AND-BACKOFF-01` dashboard bulk ve read-heavy cache helper tarafındaki companion guard olarak okunur; duplicate fetch fan-out'u azaltır ama request-storm check'ini tek başına ikame etmez.

`LOAD-TEST-2000-USERS-01` bu guard zincirinin devamındaki local/dev-safe 2000-user readiness adımıdır; production/public URL load ve write-action kapsamaz.

## 12) Next recommended milestone

`PRODUCTION-RATE-LIMIT-POLICY-01`

Bu milestone, request-storm resilience guard tamamlandıktan sonra production rate-limit policy kapısını takip eden sıradaki güvenli adımdır.
