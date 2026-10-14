# AGENTS.md

## Repo
- Repo adı: `servis-platform`
- Ürün adı: `SeferPakt`
- Domain: okul/öğrenci/veli ve personel/şirket/organizasyon alanlarını birlikte taşıyan servis/taşıma platformu

## Project Execution Contract
- Read [PRIMER_SSOT.md](PRIMER_SSOT.md#project_execution_contract_v1) before bounded execution.
- `docs/NEXT_BACKLOG_V1.md` is the sole `EXECUTING_ACTIVE_FRONTIER` owner.
- `docs/MILESTONE_REGISTRY_V1.md` owns Milestone Contract and Freeze provenance.
- Locked-invariant status is owned by `docs/LOCKED_INVARIANT_REGISTRY_V1.json` and its violation ledger.
- Resume in this order: latest concrete result, active frontier, blocker, next-if-green, smallest next action. Do not broaden scope or create a second state owner.

## Permanent cross-platform milestone governance

This section is a standing engineering and acceptance standard for M18, M19, M20 and every later milestone. It does not change the active frontier, milestone status, product contract, freeze history or closure ownership.

### One coordinated product across four platform layers

- Evaluate every bounded change for its effect on `backend/API/worker`, `web`, `Android` and `iOS`.
- Treat backend, web and mobile clients as coordinated layers of one product, while testing each platform only against its supported role and capability contract.
- Reuse the canonical role, tenant, entity, surface, task, authorization, state-recovery, evidence and business-write boundaries; do not create parallel semantic, authorization or acceptance owners.
- Consider mobile-specific impact where relevant, especially `DRIVER`, `PERSONEL` and `PARENT` tasks; `COMPANY`, `SCHOOL` and `ROOM` mobile summaries; role/tenant boundaries; GPS/telemetry; connectivity loss and recovery; device binding; and authorization.
- Web feature parity is not automatically required on mobile. Unsupported or out-of-scope platform behavior is reported explicitly rather than treated as GREEN.

### Mandatory source-to-runtime synchronization after bounded code changes

For every bounded code change, follow this order:

`CHANGE DETECT → IMPACT ANALYSIS → TARGETED TESTS → RUNTIME FRESHNESS → SAFE ACTIVATION → CROSS-LAYER VALIDATION → REAL USER ACCEPTANCE`

- Web: verify Vite HMR or the approved rebuild path and confirm that the real browser loaded the current modules.
- Backend: verify the running Node process loaded the changed behavior code. Bind mounts or narrow source hashes alone do not prove runtime freshness.
- Activation: evaluate restart/reload only after scheduler, worker, queue, startup and business-write safety checks. Apply only an explicit authorization; a one-time restart authorization never becomes standing permission.
- Android: identify the actual native/JS development path and verify the emulator/device binary version before acceptance. An old binary cannot prove the current source.
- iOS: identify the actual project build/test path and host/device capability. Do not assume an iOS simulator on Windows; EAS, macOS or a physical device are valid only when the project and access are proven. Build success is not device acceptance.
- Any unrun platform check remains `NOT_EXECUTED` or `BLOCKED`; it must not be upgraded to GREEN by inference.

### Standing conditional local backend restart policy

`HUMAN_AUTHORIZATION=STANDING_CONDITIONAL_LOCAL_PERSONEL_API_RESTART_APPROVED` applies to the local development `personel_api` service only. It is a bounded conditional permission, not a production permission, a Docker Desktop permission, or standing permission to restart any other service.

After each bounded corrective:

1. Detect backend changes and identify the affected behavior files.
2. Verify whether the running Node process already loaded the new code; do not restart when freshness is proven.
3. Before any restart, recheck scheduler, worker, queue, cron, startup side effects, migrations, seed, publish/replay paths and active business jobs.
4. Require security preflight GREEN, no active critical operation and no excluded business-write risk.
5. If restart is required and all gates are GREEN, restart only the existing local `personel_api` service, at most once in that bounded package.
6. Never restart PostgreSQL, Redis, OSRM, solver, Docker Desktop or production under this policy; never start a second backend.
7. Do not retry automatically after a failed restart.
8. Verify the new Node process identity/start time and prove that the changed behavior code is loaded.
9. Recheck health, source/runtime parity and absence of business-database mutation.
10. Run the affected real-browser or mobile non-holdout regressions only after freshness is proven.

If any precondition is missing, risky or unverifiable, return `RESTART_BLOCKED_SAFE_STOP`. Host, Codex sandbox and operating-system permissions remain higher boundaries; access restrictions must not be bypassed.

### Coordinated holdout, D-Level and mobile acceptance

- Non-holdout real-user diagnostics may begin early, but independent holdout secrecy and freeze boundaries remain mandatory.
- Backend, web, Android and iOS results are not independent product successes. For the same user task, compare intent, active role/tenant/context, canonical backend decision, authorization, API contract, client state and visible result.
- Development and diagnostics may proceed in parallel only when their artifacts, fixtures, runtime identities and evidence remain independently attributable.
- Final acceptance binds all claimed layers to the same verified source/API/runtime epoch. Do not use a stale backend, stale frontend, old mobile binary or mock transport as current acceptance evidence.
- Milestones do not receive an automatic equal holdout count. Apply only the holdout and D-Level scope actually required by the milestone contract.

### Root-cause and regression rule

For every proven defect:

1. Find the first incorrect decision point.
2. Classify it as product, contract, harness, stale-runtime, environment or unknown using evidence.
3. Fix it at the smallest canonical owner without weakening security or authorization.
4. Add a durable RED→GREEN regression covering the root and its relevant negative boundary.
5. Verify every affected platform and evaluate real-user success, not only checker output.

Previously closed areas remain closed unless concrete newer regression evidence reopens them. A checker GREEN alone is never sufficient for semantic or cross-layer acceptance.

### Permanent product quality and real-user acceptance standard

#### İçeride güçlü — dışarıda basit

- Kullanıcı teknik mimariyi, iç enum'ları veya evidence/semantic altyapısını öğrenmek zorunda değildir.
- Ekran amacı, mevcut durum ve ilk mantıklı kullanıcı eylemi yaklaşık beş saniye içinde anlaşılabilir olmalıdır.
- Bir sonraki güvenli adım gerektiğinde görünür biçimde gösterilir; gereksiz seçenek, jargon, iç sistem etiketi ve geliştirici açıklaması kullanıcı yüzeyine sızmaz.
- Desktop, mobile ve erişilebilirlik davranışı yalnız statik kodla değil, gerçek etkileşim ve temsilî acemi kullanıcı görevleriyle doğrulanır.

#### Gerçek kullanıcı kabulü

Her ilgili milestone ve rol kapsamı, uygulanabilir olduğu ölçüde şu kanıt zincirini taşır:

1. Current repository/source ve gerçek runtime kimliği.
2. Gerçek backend/frontend bağlantısı ve aynı kaynak/runtime provenance.
3. Temsilî doğal dil ve gerçek kullanıcı görevi.
4. Gerçek Chromium veya ilgili cihaz davranışı.
5. Menü, sekme, form, modal, drawer, kayıt ve hedefin gerçekten görünür/kullanılabilir olması.
6. Rol, tenant, yetkilendirme, stale/missing-record ve diğer negatif güvenlik senaryoları.
7. Responsive, mobil kullanılabilirlik ve beş saniyede anlaşılabilirlik.
8. Sözleşme gerektiriyorsa aynı-build public-runtime doğrulaması.
9. Kullanıcıya görünen semantic sonuç, cevap ve yönlendirme incelemesi.
10. Kanıtlanan kusurun kalıcı RED→GREEN regresyona dönüştürülmesi.

Backend PASS, HTTP 200, statik checker veya semantic intent etiketi tek başına kullanıcı görevi başarısı değildir. Eksik kanıt PASS sayılamaz; kanıtlanmış kapanan alanlar da yeni kanıt olmadan gereksiz yere yeniden açılmaz.

#### Genellenebilir SeferPakt ürün sözleşmeleri

- Yanıt, geçerli ve yetkili aktif kayıt/tenant/rol bağlamına dayanır; yanlış veya stale kayıt bağlamına göre cevap üretilmez.
- Kullanıcı önceki yetkili kayda dönebilir; uzun konuşmalarda seçili kayıt, görev ve güvenli devam/geri/kurtarma durumu korunur. Bağlam yoksa sistem açıklama ister.
- Farklı finansal metriklerin kimliği, kaynağı ve kapsamı ayrıdır; benzer görünen tutarlar birleştirilmez.
- Gerçek seçili kayıt yokken kayıt-özel görev veya akıllı öneri varmış gibi gösterilmez.
- Görünür buton, menü, sekme ve hedef yalnız DOM'da bulunmakla kalmaz; ilgili görevi gerçekten ilerletir, mobil drawer hedefi örtmez ve görünür/kullanılabilir olur.
- Kullanıcı cevapları tekrarlı, çelişkili veya teknik iç işaretleyiciler içermeyecek şekilde sadeleştirilir; iç hata/enum/provenance metni dışarı sızmaz.
- Sefer Abi kabulü uygulanabilir her senaryoda `ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR` zinciriyle değerlendirilir.
- Yetkisiz işlem yapılmaz; onay gerektiren eylemler kullanıcı onayı olmadan sessizce yürütülmez.

Bu standart yalnız ROOM/M18 için değil, sonraki roller ve milestone'lar, #39 Full 8-Role E2E ve #40 Field Acceptance için de geçerlidir. Yol haritası numaraları, milestone sahiplikleri ve kapsamları bu ekle değişmez.

### Milestone closure boundary

Close a milestone only when its actual scope is complete and its applicable evidence covers client/backend compatibility, real browser or device evidence, role/tenant/KVKK boundaries, responsive/mobile scope, public runtime where required, permanent regressions and source/runtime provenance. Future features outside the milestone scope remain outside it; do not pull later roadmap work forward merely to satisfy closure.

## Çalışma tarzı
- Önce plan çıkar, sonra patch uygula.
- Tek görevde tek problem çöz.
- Gereksiz refactor yapma.
- İhtiyaç dışı dosya taşıma yapma.
- Büyük archive / history / overlay hareketleri yapma.
- Hot file / line count agresif temizlik bu aşamada öncelik değildir.
- Ürün davranışını bozabilecek geniş çaplı yeniden düzenleme yapma.
- En küçük güvenli değişiklik setini tercih et.
- Şüpheli durumda önce analiz ver, sonra patch öner.

## Kanonik komutlar
- Günlük resmi giriş: `npm run verify:repo`
- Resmi kapanış: `npm run verify:final`
- CI girişi: `npm run verify:ci`
- Compatibility / geniş prova: `tools\pack_living.ps1`

## Global locked invariant gate
- Before starting or closing any bounded product package, read and use
  `docs/LOCKED_INVARIANT_REGISTRY_V1.json`.
- Before declaring any package GREEN, run
  `npm run check:globallockedinvariantsuite01`.
- If an applicable invariant is `FAIL`, `UNPROVEN`, contradicted, has an
  unknown owner, or lacks permanent regression coverage, STOP and report its
  stable `INVARIANT_ID`. Do not defer, suppress, or mark it N/A without
  canonical justification.
- The machine-readable and human-readable violation ledger is owned by
  `docs/LOCKED_INVARIANT_VIOLATION_LEDGER_V1.json` and
  `docs/LOCKED_INVARIANT_VIOLATION_LEDGER_V1.md`.

## Repo doğrulama omurgası
- `M91` ve `M92` repo-native verification spine korunmalıdır.
- Repo check chain ana çatıdır.
- State / manifest / check / runbook / script hizası bozulmamalıdır.
- Değişiklik sonrası mümkünse ilgili check’ler çalıştırılmalıdır.

## Ürün / domain kuralları
- “Sözleşme” terimi kullanılır.
- “Sürücünün telefon GPS'i” ifadesi kullanılır.
- Tek Guided Mode / Stepper mantığı korunur.
- Eski “durakları üret sonra durakları çek” davranışı geri getirilmez.
- Sade Türkçe, düşük bilişsel yük, az jargon korunur.

## Kritik ürün akışı
- Agreement direct create yaklaşımı korunmaz.
- Doğru akış: önce shift/vardiya, sonra “Sözleşmeye Dönüştür”.
- `sourceShiftId` mantığı korunmalıdır.
- Company direct agreement create kapalı kalmalıdır.
- Shift → sözleşme dönüşüm akışı bozulmamalıdır.

## Dokunma sınırları
Bu dosyalara dokunmadan önce ekstra dikkat gerekir:
- `backend/src/routes/agreements.js`
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/shifts/company.js`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `backend/src/ai/chat/helpComposer.js`
- `backend/prisma/schema.prisma` and `backend/prisma/schema/*.prisma`

## Justified exception / hot file politikası
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- `backend/prisma/schema.prisma` artık yalnız canonical Prisma entrypoint'tir;
  domain modülleri `backend/prisma/schema/` altında yaşar.
- `backend/prisma/schema/` değişiklikleri #11 parity/generation kontrolleriyle
  birlikte değerlendirilir; line-count için yeni parçalama yapılmaz.
- `helpComposer.js` dışında hot-file line-count exception'ı otomatik olarak
  genişletilmez.
- Hot file küçültme işi ancak açıkça istenirse ve güvenli aday dosyalarda yapılır.

## Güvenli aday yaklaşımı
Hot file küçültme gerekirse önce şu tip işler tercih edilir:
- helper extraction
- section extraction
- render/state ayrımı
- local util extraction

Agresif işler yapılmaz:
- büyük çaplı yeniden mimari kurma
- business logic taşıma
- kabul akışını riske atan parçalama

## Öncelik sırası
1. Repo yeşilini koru
2. İhtiyaç-temelli ürün düzeltmeleri
3. Docs / primer / state hizası
4. Kapanış / hijyen / verify tutarlılığı
5. En son hot file küçültme

## Hijyen kuralları
- Shareable export mantığı korunmalı
- Runtime json / env / dist / artifacts yüzeyi konusunda gereksiz genişleme yapılmamalı
- Yeni local çıktı dosyaları repo içine bilinçsiz eklenmemeli
- Export ve closure politikaları zayıflatılmamalı

## Codex’ten beklenen çıktı formatı
Her görevde şu sırayı izle:
1. Kısa plan
2. Kök neden
3. En küçük güvenli değişiklik seti
4. Riskler
5. Patch özeti
6. Çalıştırılacak doğrulama komutları

## Görev istemi standardı
Kullanıcı bir görev verdiğinde:
- önce problemin sınırını netleştir
- bu görevde hangi dosyalara neden dokunacağını belirt
- görev kapsamı dışına çıkma
- “bonus refactor” yapma
- kabul kriterine göre çalış

## Kabul kriteri mantığı
Bir görev tamam sayılmadan önce:
- ilgili davranış korunmalı
- ilgili check’ler geçmeli
- state/docs/manifest hizası bozulmamalı
- gereksiz yan etki oluşmamalı
- diff mümkün olduğunca küçük kalmalı
