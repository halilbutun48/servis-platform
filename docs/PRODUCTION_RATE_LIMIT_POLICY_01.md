# PRODUCTION RATE LIMIT POLICY 01

Milestone: `PRODUCTION-RATE-LIMIT-POLICY-01`

Tarih: 2026-07-20
Repo: `servis-platform`

> Bu belge policy/check/doc kaydıdır. Stage/commit/tag/push açmaz; runtime enforcement açmaz; backend route/service/prisma değiştirmez.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- production ortamındaki rate-limit davranışını merkezi ve denetlenebilir sınıflarla tanımlamak
- request-storm ve smoke akışlarını bozmamak
- 429 üretimini kullanıcıya anlaşılır Türkçe mesajla döndürmek
- role isolation, auth/public split, read/write split ve human approval çizgisini korumak
- gelecekte runtime enforcement’a bağlanabilecek net bir policy/check/doc çerçevesi bırakmak

## 2) Problem Statement

Production ortamında rate-limit politikası dağınık kalırsa şu riskler büyür:

- auth login/register/password akışları flood alabilir
- public lead/demand akışları spam alabilir
- dashboard, panel ve live read endpointleri gereksiz 429 üretebilir
- GPS ingest veya diğer write-like akışlar yanlış bucket’a düşebilir
- admin/superadmin read ve write yüzeyleri birbirine karışabilir
- smoke ve request-storm oturumları false 429 ile kırılabilir
- kullanıcı 429 aldığında ne yapacağını anlamayan belirsiz mesajlar üretilebilir
- 429 ignore list açılırsa gerçek kapasite sinyali görünmez

## 3) Central Policy Model

Policy class count: `10`

Policy source files:
- `backend/src/bootstrap/rateLimits.js`
- `backend/src/env.js`
- `backend/src/errors/http.js`

Current runtime source stays unchanged in this milestone; this document only centralizes the policy narrative and guard.

## 4) Policy Classes

### AUTH_STRICT

- Login, register, password, invite ve verification entry point'leri burada sıkı tutulur.
- Identifier ve gerekiyorsa device bağlamı ayrı bucket'larda değerlendirilir.
- Public yüzeye sızan spam baskısı bu sınıfta erken kesilir.

### PUBLIC_INTAKE_STRICT

- Public lead, demand, signup capture ve KVKK capture benzeri public intake akışları burada tutulur.
- Spam, bulk capture ve tekrar deneme baskısı sıkı davranışla sınırlanır.
- Public intake yüzeyi görünür 429 aldığında gizlenmez.

### READ_HEAVY_SOFT

- Dashboard, panel, summary, live read ve smoke yüzeyleri burada tutulur.
- Ardışık read akışları false 429 üretmemelidir.
- Mobile ve desktop smoke sırasında kullanıcı akışı yumuşak kalır.

### LIVE_GPS_TOLERANT

- GPS, live map, driver, vehicle ve telematics ağırlıklı yüzeyler burada tutulur.
- Canlı takip akışları için toleranslı ama kontrollü davranır.
- Harita ve telematics okumaları read-heavy bucket ile karışmaz.

### ROUTE_PREVIEW_BOUNDED

- Route preview, readonly preview, compact summary-first ve bounded preview akışları burada tutulur.
- Önizleme kısa kalır; uzun detaylar ikinci katmanda açılır.
- Route preview paneli bir anda sınırsız büyümez.

### WRITE_ACTION_STRICT

- POST, PUT, PATCH, DELETE ve diğer mutation akışları bu sınıfta tutulur.
- Write-action yüzeyleri human approval ve step-up çizgisini korur.
- Mutation ile read-heavy akışları aynı bucket'a düşmez.

### PAYMENT_CONTRACT_STRICT

- Payment, contract, settlement, hakediş ve commission odaklı akışlar burada tutulur.
- Ödeme ve sözleşme yükü daha sıkı denetlenir.
- Financial write akışları read-only yüzeylerle karışmaz.

### ADMIN_AUDIT_STRICT

- Admin, superadmin, audit, log export ve review queue yüzeyleri burada tutulur.
- Denetim ve inceleme yüzeyleri görünür kalır.
- Admin/superadmin write işlemleri ayrı sınırda değerlendirilir.

### AI_ASSISTANT_READONLY

- Copilot ve Sefer Abi yüzeyleri read-only kalır.
- Tool execution ve write-action dispatcher açılmaz.
- AI tarafı yardım sağlar, otomatik yazma yapmaz.

### HEALTH_INTERNAL_SAFE

- Health, internal, observability ve monitoring akışları burada tutulur.
- debug.log ve benzeri iç sinyaller kullanıcı yüzeyine taşınmaz.
- Internal health kontrolü production yüzeyini bozmaz.

## 5) Endpoint Classification Matrix

| Endpoint family | Policy class | Notes |
| --- | --- | --- |
| `/api/auth/*`, login/register/password | AUTH_STRICT | identifier + user + device ayrımı korunur |
| `/api/public/*`, lead/demand/invite capture | PUBLIC_INTAKE_STRICT | spam ve KVKK capture baskısı sıkı tutulur |
| `/api/*` GET summary, list, dashboard, smoke | READ_HEAVY_SOFT | ardışık okuma false 429 üretmez |
| `/api/*` live map, driver, vehicle, telematics | LIVE_GPS_TOLERANT | GPS ağırlıklı canlı akışlar toleranslı kalır |
| route preview, readonly preview, compact summary-first | ROUTE_PREVIEW_BOUNDED | preview paneli bounded kalır |
| `/api/admin/*` mutations, approval, provider write | WRITE_ACTION_STRICT | human approval çizgisi korunur |
| `/api/admin/*` payment, contract, settlement, commission | PAYMENT_CONTRACT_STRICT | finansal yazma akışları sıkı tutulur |
| `/api/admin/*` audit, log export, review queue | ADMIN_AUDIT_STRICT | admin/superadmin denetimi görünür kalır |
| Copilot / Sefer Abi reply surfaces | AI_ASSISTANT_READONLY | no tool execution, no write-action dispatcher |
| internal health, observability, monitoring, debug.log | HEALTH_INTERNAL_SAFE | internal health kullanıcıya sızmaz |

## 6) User-Facing 429 Behavior

Kullanıcıya görünen temel 429 davranışı:

- `error=RATE_LIMITED`
- `code=RATE_LIMITED`
- mesaj: `Çok kısa sürede çok sayıda işlem gönderildi.`
- mümkünse `retryAfterSec` ile birlikte döner
- `resetTime` varsa kullanıcı `X sn sonra tekrar deneyin` yönlendirmesi alır
- fallback metin: `Çok kısa sürede çok sayıda işlem gönderildi. Lütfen biraz bekleyip tekrar deneyin.`

## 7) 429 Console Policy

- 429 console/page error ignore list açılmaz
- product-flow, premium, all-panels reality audit ve mobile all-roles smoke için `consoleErrorCount=0` beklenir
- `pageErrorCount=0` korunur
- smoke ve request-storm akışı 429’yi maskelemez
- false positive'u azaltmak için threshold gevşetilmez

## 8) What Changed

- deterministic check eklendi: `backend/scripts/production_rate_limit_policy_01_check.js`
- milestone doc eklendi: `docs/PRODUCTION_RATE_LIMIT_POLICY_01.md`
- package alias eklendi: `check:productionratelimitpolicy01`
- product-extensions chain'e yeni policy check eklendi
- verify chain, script harness map'leri, primer ve milestone guide yeni policy milestone'unu tanıyacak şekilde güncellenecek
- request-storm smoke uyumluluğu `sharedStorageState` reuse ile korunur; 429 ignore list açılmaz

Bu değişiklikler user-facing behavior değiştirmez; yalnızca policy/check/doc katmanını merkezi hale getirir.

## 9) What Was Explicitly Not Changed

- smoke threshold / skip / timing / PASS kriteri
- runtime enforcement
- backend/src/routes
- backend/src/services
- prisma / backend/prisma
- global allowlist
- 429 ignore list
- debug.log commit etme
- runtime-data stage alma
- browser-smoke stage alma
- write-action dispatcher
- tool execution
- fake success

## 10) Guard Cases

Guard cases:
- package alias wiring
- runner wiring
- verify chain wiring
- script harness check/doc wiring
- primer wiring
- milestone guide wiring
- policy doc section coverage
- policy class count
- user-facing 429 message
- runtime source files unchanged
- request-storm compatibility
- smoke threshold preservation
- route/service/prisma diff hygiene
- stage empty kontrolü
- debug.log absent kontrolü

## 11) Validation Results

Planned validation set:
- `npm run check:productionratelimitpolicy01`
- `npm run check:requeststormresilience01`
- `npm run check:airesponsesemanticqualitygate01`
- `npm run check:testqualityandflakeaudit01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run smoke:productflowbuttonaudit01`
- `npm run smoke:uxlivepanelpremium01`
- `npm run smoke:uxallpanelsrealityaudit01`
- `npm run smoke:uxmobileallrolespanelaudit01`

## 12) Remaining Risks

- future refactors can split rate-limit buckets again and weaken the centralized policy narrative
- broad read/write allowlist changes could blur auth/public boundaries
- 429 ignore lists would hide real production signals and should not be added
- `DASHBOARD-BULK-ENDPOINT-01` read-only bulk aggregation desteği, read-heavy dashboard fan-out'u azaltan upstream yardımcı katman olarak korunmalıdır
- `CACHE-COALESCING-AND-BACKOFF-01` dashboard bulk/read-heavy cache helper tarafındaki companion guard olarak okunur; policy layer'ı gevşetmez ve human approval sınırını açmaz
- browser-smoke artifacts must remain commit dışı
- runtime-data must remain commit dışı

## 13) Next Recommended Milestone

`AI-RESPONSE-SEMANTIC-QUALITY-GATE-01`

Bu milestone, production rate-limit policy katmanından sonra AI response semantic kalite kapısını takip eden güvenli adımdır.
