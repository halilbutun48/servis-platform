# AGENTS.md

## Repository governance entrypoint

Before any bounded work in this repository, read [`docs/AGENTS.md`](docs/AGENTS.md). It is the detailed, canonical execution-governance instruction for all milestones and platforms.

The canonical state owners remain unchanged:

- `docs/NEXT_BACKLOG_V1.md` owns the executing active frontier.
- `docs/MILESTONE_REGISTRY_V1.md` owns milestone contracts and freeze provenance.
- `docs/PRIMER_SSOT.md` is the canonical living product/execution primer.
- `docs/LOCKED_INVARIANT_REGISTRY_V1.json` and its violation ledger own locked-invariant status.

Do not create a competing governance registry, state owner or platform-specific interpretation of these rules. Preserve the current repository/source precedence, locked product and security decisions, immutable evidence, and the existing 40-step closure chain.

The default standing conditional local `personel_api` restart policy, and the narrower current-task project-owner authorization for verified local DEMO/TEST changes, are defined in `docs/AGENTS.md`. Neither permits production/customer changes, repository reset/clean/stash, database reset/restore/reseed, unrelated service restarts, or starting a second canonical backend.

## Permanent acceptance boundaries

- A checker or code GREEN result alone is not product acceptance; claims require current backend/frontend, real Chromium/mobile, role/tenant and semantic user-visible evidence.
- Product acceptance is conjunctive: the authorized user task must work, the result must be semantically and financially correct, and the experience must be understandable and usable on the supported surface. A technical PASS cannot substitute for any one of these three dimensions.
- Where the environment allows, Codex is responsible for collecting current real-Chromium screenshots, DOM/trace or video evidence for the claimed user flow; the user is not required to record every screen. If the required evidence cannot be collected, keep the claim `NOT_PROVEN` or classify the concrete environment block.
- For material closure decisions, obtain a product review independent of the implementation path where feasible (a separate reviewer or a separately attributable evidence pass). If independence is not feasible, record that limitation rather than treating self-review as independent confirmation.
- Additional review and regression work must be risk-proportional and bounded to the changed behavior and its directly affected roles/security boundaries; do not repeat an unchanged test indefinitely or reopen closed work without concrete new evidence.
- Product work follows `user need → working product behavior → real user/browser acceptance → durable regression → security and milestone closure`; checker expectations validate that behavior and never replace the product requirement.
- Package acceptance, ROOM D-Level acceptance, M18 closure and final product acceptance remain separate decisions.
- Do not reopen proven-closed work without concrete regression evidence; resolve proven defects at the smallest structural canonical owner.
- No external LLM/API/SDK or unauthorized action is allowed. Product/runtime business writes remain bounded by role, tenant, approval and milestone contracts. Verified demo/test data preparation is permitted only after the target database is proven non-production/demo/test and the operation is authorized, minimum, idempotent, traceable and performed through canonical seed/fixture/domain mechanisms; it must not touch real customer/production data, reset/drop/reseed the database, bypass authorization/KVKK, or perform uncontrolled edits. Operations requiring user approval must not be applied silently.
- One-time exception `SEFERPAKT_LOCAL_DEMO_REBUILD_2026_V1` is permitted only for the explicitly approved local Docker `personel_db` / `servisdb` 2026 canonical demo rebuild. It requires a verified canonical backup plus isolated restore proof, preserves `_prisma_migrations`, rejects any production/unknown target, preserves the dirty repository, uses the marker-scoped canonical seed, and records target identity/source HEAD/backup/checksum/manifest evidence. It does not authorize repository reset/clean, schema migration, payment/accounting writes, auth/KVKK changes, real-customer data, or any later reset/reseed.
- Preserve the user's dirty worktree: tracked, untracked and relevant ignored worktree files belong to the user unless explicit scope says otherwise. Do not use destructive reset, clean, checkout, restore or overwrite operations without explicit authorization; do not delete another active task's changes, and do not commit, tag or push without user instruction.
- Keep the existing 40-step roadmap and its state owners; stable rules belong here and changing progress belongs in `docs/NEXT_BACKLOG_V1.md`.
- Keep total monthly infrastructure cost within 15,000 TL.

## Permanent pre-launch DEMO/TEST data policy (user-approved 2026-10-30)

SeferPakt bu çalışma alanında henüz yayına çıkmamış geliştirme ürünüdür. Kullanıcının açık ürün kararı gereği, doğrulanmış tek `personel_db`/`servisdb` çalışma veritabanı DEMO/TEST ortamıdır; gerçek müşteri veya üretim kaydı beklenmez. Bu karar, her yazma işleminden önce hedef kimliğinin yeniden doğrulanması ve mevcut güvenlik kapılarının korunması şartıyla geçerlidir.

- Bütün roller aynı DEMO/TEST veritabanında, ayrı ve yetkili oturumlarla test edilebilir. ROOM, COMPANY, SCHOOL, ORGANIZATION ve diğer roller kendi tenant/RBAC kapsamından çıkamaz.
- Ürün kabulü için gerekli gerçekçi DEMO firma, ROOM, teklif, pazarlık, sözleşme, vardiya, rota, gider, hakediş ve ilişkili kayıtlar oluşturulabilir. Kayıtlar açık DEMO işareti, amaç, kaynak, aktör, audit ve kanıt kimliğiyle izlenebilir tutulur.
- DEMO kayıtları mevcut canonical UI/API, domain/fixture veya seed akışlarıyla; minimum, idempotent ve yetkili biçimde oluşturulur. Doğrudan SQL business-write, güvenlik/KVKK bypass'ı, ikinci veri kaynağı, kontrolsüz düzenleme ve sıfırlama/reseed yapılamaz.
- Gerçek müşteri verisinin bulunmaması pozitif ürün testini engelleyen bir gerekçe değildir. Gerekli DEMO kayıtları oluşturularak pozitif, boş, belirsiz, yetkisiz ve veri bütünlüğü negatifleri gerçek kullanıcı akışıyla kanıtlanır.
- Geçmiş tarih, audit olayı, tamamlanmış iş durumu, ödeme veya ekonomik kanıt uydurulamaz. Geçmiş kabulü gereken senaryo yalnız canonical yaşam döngüsü gerçekten üretilmişse kabul edilir; aksi halde `NOT_PROVEN` korunur.
- Tenant, RBAC, KVKK, finansal kaynak/lineage, onay, idempotency, çift sayım ve fail-closed fiyat referansı kuralları gevşetilmez. DEMO kabulü onaysız gerçek platform ortalaması veya gerçek ticari referans yayımlama yetkisi vermez.
- Mevcut DEMO veritabanı şimdi sıfırlanmaz. Tüm DEMO verilerinin temizlenmesi veya yayına geçişe hazırlık işlemleri ancak ayrıca kullanıcı kararıyla yapılabilir; kabul kanıtları ve audit geçmişi korunur.
- Kanıtlanmış ürün işi aynı veri eksikliği gerekçesiyle tekrar açılmaz. Yeni DEMO kayıtlarının amacı yalnız açık kullanıcı kabul kapısını kapatmak ve sonraki gerçek regresyonu izlenebilir kılmaktır.

## Current canonical DEMO consolidation decision (CONT-215+)

For current M18 acceptance, the user's canonical target is `seferpakt_clean_demo` on the verified `seferpakt-clean-demo` API/frontend/DB runtime. The historical `personel_db`/`servisdb` rebuild wording above remains provenance for the earlier local rebuild only; it does not replace the current canonical target and does not authorize legacy-data migration.

- Normal milestone acceptance, real Chromium/public same-build checks and the eight-role DEMO/E2E journeys use only `seferpakt_clean_demo`. Record selection is based on verified tenant, role, relationship, status and logical scenario keys, never on a numeric ID alone.
- Normal canonical runtime must declare `SEFERPAKT_DATABASE_MODE=canonical_demo`; the backend rejects a wrong database/schema and verifies the live database identity plus migration count before listening. Missing database URLs never fall back to `servisdb`.
- `seferpakt_cont04`, `seferpakt_cont211`, P9 HGS/restore databases and CI `prisma_ci` are isolated proof targets only for destructive, migration, restore, concurrency or idempotency work. Their results are never canonical/public product PASS evidence.
- Legacy `servisdb` and its historical volumes/dumps are preserved as excluded provenance. They are not automatically started, merged, copied or remapped into `seferpakt_clean_demo`.
- Any durable DEMO scenario must be minimum, idempotent and traceable through the existing canonical seed/fixture/domain path, with tenant/foreign-key/source/audit links and a reusable logical marker. Cross-role acceptance must select the same verified record through those relationships rather than copied IDs.
- Canonical consolidation is manifest-first: record source, owner, purpose, last-use evidence, runtime identity, backup hash and rollback path before any transfer. No overwrite, bulk merge, volume cleanup, reset, drop, uncontrolled restore or destructive archive action is permitted under this policy.
- The inventory and consolidation plan are evidence artifacts, not a second acceptance owner. The current ledger and existing evidence remain the only acceptance source of truth.

## Permanent product simplicity and bounded-task scope

The standing product principle for every SeferPakt role and every future Codex task is: **İÇERİDE GÜÇLÜ, DIŞARIDA BASİT.** SeferPakt is a transport-operations platform, not an accounting system or a software-developer tool. Preserve strong internal calculation, audit, security and data-integrity controls while keeping the user-facing task simple and understandable.

- Before starting a task, state one user problem, the in-scope files and behavior, the success criterion in terms of a real user action, and the explicitly locked out-of-scope areas. Findings unrelated to that problem are recorded separately and are not automatically added to the task.
- A confirmed critical security, tenant/KVKK, authorization or data-integrity defect is the only automatic scope exception. Keep it narrowly bounded, report it as a blocker or targeted corrective, and preserve all existing safety gates.
- Do not ask users for technical information that the system can calculate, safely derive or find from authorized existing records. Do not add technical form fields, accounting steps, document references, approval codes or other mandatory inputs merely to satisfy internal implementation needs.
- Every user-visible mandatory field must have an explainable real user purpose. Financial audit, calculation, provenance and authorization controls remain enforced behind the simple user flow.
- Product success requires that a real user can understand the task, find the correct record, complete the authorized operation without unnecessary technical knowledge, recover from an error, and clearly see the result. Tests, checkers, HTTP responses or backend output alone never justify `PRODUCT_PASS`; current real-browser evidence is required.
- Preserve accepted work unless concrete regression evidence exists. Do not redesign working components, create a second calculation engine, or create a parallel data flow for the same job.
- Test proportionally: exercise the changed behavior and its directly affected role, tenant, KVKK, financial-accuracy, data-integrity and real-user boundaries. Do not rescan the whole platform for a small change, but do not omit a required security or acceptance boundary.
- At the end of every task, report what changed, what the user can now do, what evidence was proven, what remains open, and whether scope was exceeded. Unproven results remain `NOT_PROVEN`; do not start new work automatically.
- When a prompt unnecessarily broadens the single-user-problem boundary, preserve the direct purpose, list unrelated work as separate open items, and do not begin a broad refactor, new module or unrelated fix without explicit scope. Do not arbitrarily narrow an explicitly requested scope; call out genuine ambiguity or conflict.

This section is additive. It does not alter security, KVKK, RBAC, tenant isolation, real Chromium acceptance, milestone ownership, business-write limits, locked invariants or the existing governance/source precedence.

For repository inventory, cleanup, duplicate-owner review or temporary-output triage, load [`.agents/skills/seferpakt-repo-hygiene/SKILL.md`](.agents/skills/seferpakt-repo-hygiene/SKILL.md) before editing. It operationalizes this section's preservation and evidence gates; it does not create a competing owner or cleanup policy.

## Permanent code-lifecycle hygiene and canonical ownership

Her geliştirme kendi kod yaşam döngüsünden sorumludur. Bu disiplin tüm SeferPakt rolleri, backend, frontend, mobil ve Sefer Abi için geçerlidir:

- Önce mevcut işlevi ve canonical kod yollarını araştır; aynı işi yapan ikinci motor, servis veya alternatif akış oluşturma.
- Değiştirilen dosyalarda yeni, eski, yinelenen ve erişilemeyen kodu sınıflandır.
- Backup/dump/recovery, browser trace/profile/log, kabul kanıtı, runbook, harness, checker ve test-script ailelerini otomatik koruma veya silme kararıyla etiketleme; her alt aile için üretici, tüketici, benzersiz kanıt, geri yükleme ihtiyacı, doğrulanmış alternatif, saklama gerekçesi ve sahibi kanıtla.
- Dosya ailesi mutabakatını kaynak içindeki kullanılmayan fonksiyon, erişilemeyen dal, yinelenen hesaplama, eski alternatif yol ve gereksiz bağımlılık denetimi yerine kullanma; backend, web, mobil ve Sefer Abi sembol düzeyini ayrıca gerçek runtime/dinamik tüketicilerle doğrula.
- Eski kodun artık kullanılmadığını bağımlılık ve gerçek runtime kanıtıyla doğrulamadan silme.
- Sırf satır sayısı için dosya bölme; yalnız gerekli olduğunda sorumluluğa göre ayrıştır.
- Her işte kendi ürettiğin geçici kodu ve teknik borcu temizle.
- Değişikliklerin gerçek DEMO regresyonlarını ve gerekiyorsa performans etkisini doğrula.
- Repo genelini her seferinde yeniden temizlemeye kalkma; büyük ve kirli worktree'yi körlemesine resetleme veya başkasının değişikliklerini ezme.
- Kaynak kod kapsamı istendiğinde yalnız lint veya dirty diff ile sınırlanma: backend/API/Prisma/migration/script/test, web, mobil, infra/solver/GPS/Socket.IO, güvenlik ve Sefer Abi kaynak ailelerinin tamamını otomatik envantere al; üçüncü taraf ve generated/runtime dosyalarını ayrı sınıflandır.
- Kaynak envanterinde dosya ve anlamlı sembol düzeyini (fonksiyon, sınıf, export, route, registry kaydı ve önemli kod bloğu) import/call graph, dinamik yükleyici, route/package registry, package script, Docker/runtime tüketicisi, Git geçmişi ve gerçek regresyon kanıtıyla sınıflandır. Aile sayımı sembol denetiminin yerine geçmez.
- Tam kapsamlı kaynak kabulü; kapsam sayıları, incelenen adayların sonucu, fiziksel silme diff'i ve etkilenen DEMO/API/frontend/mobil/Sefer Abi/güvenlik regresyonları olmadan PASS değildir. Dinamik tüketimi kanıtlanamayan sembolü koru ve somut belirsizliği kaydet.

Bu kural yeni bir state owner, milestone, refactor veya paralel iş akışı oluşturmaz; mevcut canonical sahiplik, güvenlik, KVKK, tenant ve business-write sınırları aynen korunur.

## Permanent Sefer Abi product-source protection

Sefer Abi'nin premium karakteri ve ona bağlı kullanıcı yüzeyi kalıcı ürün kapsamıdır. Bu koruma; orijinal avatar varlığını, çerçevesiz/sprite avatar tüketicilerini, IDLE ve diğer ifade durumlarını, sohbet drawer'ını ve bağlama duyarlı konuşma baloncuklarını, bunların test/regresyon/harness kaynaklarını ve gelecekte sesli konuşmaya bağlanacak arayüzleri birlikte kapsar.

- `web/src/assets/sefer-abi-premium-avatar.png`, sprite/ifade kaynakları, `web/src/components/copilot/SeferAbiAvatar.jsx`, `FloatingCopilotDrawer.jsx`, Sefer Abi state/motion/context yardımcıları ve bunların testleri canonical ürün kaynağı veya aktif `PROTECTED WIP` olarak sınıflandırılır. Untracked olmaları tek başına silme gerekçesi değildir.
- `web/src/utils/copilotFacts.js`, drawer'ın mevcut browser speech-readout arayüzü, `mobile/src/lib/voice.js` ve `docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md` gelecekteki ses altyapısı için korunur. Ses motoru şu anda sınırlı ya da mevcut değil diye bu arayüzler, durum sözleşmeleri veya ses hazırlığı kaldırılmaz.
- Ürün kaynağı ile screenshot/video/trace/profile/log ve acceptance çıktısı ayrıdır. Kanıt çıktıları `EVIDENCE/PROTECTED` veya somut sahiplik kanıtı yoksa `UNRESOLVED/PRESERVE` olarak tutulur; bunlar otomatik olarak product source veya PASS sayılmaz.
- Başka Codex oturumunun aktif değişiklikleri korunur. Bu ailede silme, toplu yeniden yazım, toplu taşıma veya kapsamlı refactor ancak ilgili dosya için açık kullanıcı onayı, producer/consumer/runtime kanıtı ve geri alma planı birlikte varsa yapılabilir.
- Güvenli Git takibi dosya ailesi yerine mantıksal grup ve sahiplik kanıtıyla değerlendirilir: Sefer Abi kaynakları ve kalıcı testleri ayrı grup, generated/runtime/evidence çıktıları ayrı grup, belirsiz dirty dosyalar ayrı grup olarak kalır. Bu karar staging, commit, tag veya push yetkisi vermez.

Bu koruma #18 repository-exit kanıtına versioned evidence olarak işlenir; `FULL_D_LEVEL_CLOSED` veya `#19` durumunu değiştirmez ve yeni bir state owner oluşturmaz.

## Permanent SeferPakt operating-cost and quotation model

SeferPakt is a transport and service-operations platform, not an accounting program. The product may calculate operational cost, margin and quotation guidance, but it must not turn internal accounting references or unresolved policy decisions into routine user work.

- Every role sees only the smallest understandable set of mandatory fields for its own work. Information already present in an authorized canonical record is reused; it is not requested again.
- A real missing value is completed only on the correct record and in the correct field. Internal accounting references, audit codes, allocation ratios, VAT evidence and technical calculation terms remain behind the user flow unless a genuine user decision is required.
- Vehicle and driver expenses are recorded once per month or period through the existing canonical cost engine. Vehicle, driver, trip, distance, duration, empty-kilometre and COMPANY relationships are evaluated from authorized canonical records.
- A specially assigned vehicle carries the full applicable period vehicle cost into that work's ROOM internal cost. Shared costs use proven real-usage proportions; a shared or general cost is never forced onto a service without evidence.
- Driver cost follows the driver's proven working time. Actual fuel cost comes from recorded actual expenses; quotation fuel cost comes from route kilometres, consumption and sourced price assumptions. Maintenance and tyres use ordinary long-term cost assumptions for quotations when supported by the canonical model.
- Actual, forecast and budget values remain separate. Distributed cost plus pending/unallocated cost may not exceed the source economic amount, and the same economic expense is never counted again through ledger, allocation, vehicle, service or quotation views.
- ROOM internal cost and margin remain private to the ROOM tenant. COMPANY receives only authorized commercial outputs such as approved quotation, contract, budget, security, capacity and verified-quality results; ROOM internal expense detail and margin do not cross the tenant boundary.
- SCHOOL and ORGANIZATION apply the same simple-user-flow principle to their own authorized needs without inheriting ROOM internal cost data or creating a parallel calculation owner.

### Permanent bounded-task contract

Every Codex task must:

1. Start from one concrete user problem.
2. Make the smallest correct change at the canonical owner.
3. Preserve accepted behavior and prior evidence unless concrete regression evidence reopens it.
4. Keep unrelated features, roles, milestones and refactors out of scope.
5. Prove the real user behavior plus the directly affected security, tenant, KVKK and data-integrity boundaries.
6. Report `PASS`, `FAIL` and `NOT_PROVEN` honestly; a checker result alone is never product acceptance.
7. Leave a durable checkpoint containing the changed behavior, evidence and remaining frontier.
8. Stop after the bounded task; do not start the next stage automatically.

The only automatic scope exception is a confirmed critical security, authorization, tenant/KVKK or data-integrity defect, handled as a narrow safe corrective without weakening any existing gate.

## Permanent ROOM Finance–COMPANY Budget–Dispatch–Pricing acceptance lock

This is a narrow acceptance lock for the existing product owners. It does not create a milestone, state owner, checker owner, parallel engine or business-write permission; detailed execution remains in `docs/AGENTS.md` and the linked skill.

- ROOM keeps exactly four canonical tabs: `Genel Durum`, `Giderlerim`, `Servis Maliyeti`, and `Teklif Değerlendir`. `Giderlerim` is the active ROOM's canonical expense source; `Genel Durum` reconciles its monthly expense/income summary from that source; `Servis Maliyeti` shows the selected service's proven share; vehicle comparison and quote profitability are inside `Teklif Değerlendir`. No view may double-count one economic expense.
- Vehicle comparison and quote profitability inside `Teklif Değerlendir` share the same canonical `scenarioId` and plan-cost basis. The 25-person case remains two minibuses/two separate routes/two drivers versus one capacity-suitable midibus; the 35-person multi-vehicle/capacity case is independently proven with its economic rationale and never inferred from 25 people.
- COMPANY receives only an authorized request-specific anonymous comparable range from different ROOM agreements, plus distinct budget/commitment/spend/invoice/payment states. ROOM internal expense, salary, margin, raw route/geocode, identity and personal data remain outside COMPANY.
- Dispatch evaluates OSRM per vehicle and preserves separate routes, stops, capacity, duration, driver and complete-cost basis. Minimum-km, minimum-duration and lowest-complete-cost alternatives remain distinguishable; navigation-vs-OSRM differences are traceable by source, route and date.
- Fuel and passage inputs require current/verified EPDK and KGM/operator evidence with source/as-of and the required region, direction, entry/exit and HGS vehicle-class context. Missing, stale or unmatched data is `NOT_PROVEN`/safe partial state, never fabricated zero.
- PERSONEL KVKK and every applicable role/tenant negative remain fail-closed. Sefer Abi preserves tenant, role, entity, selected record, surface, tab, task and authorized-action context; already-entered authorized information is reused and not asked again. The first safe action must be understandable in about five seconds.
- Acceptance uses current normal Chromium same-build evidence at 1440/1024/390/320 and public same-build when reachable. Checker/API/old screenshot evidence is supporting only; absent or provenance-mismatched evidence stays `NOT_PROVEN`, and a real leak remains a security block.

For the repeatable E2E matrix, evidence fields and red flags, load [`.agents/skills/seferpakt-finance-dispatch-pricing-e2e/SKILL.md`](.agents/skills/seferpakt-finance-dispatch-pricing-e2e/SKILL.md). It supplements the existing canonical owners and does not duplicate or replace them.

### Permanent buyer-role shared finance surface

- `COMPANY`, `SCHOOL` and `ORGANIZATION` use one canonical buyer-finance data/calculation path and each exposes exactly two user-facing sections: `Bütçe ve Servis Giderleri` and `Teklif ve Fiyat Rehberi`. Role-specific wording and service context may differ; the accounting owner does not.
- The first commercial priority is contract-free planning: an authorized request feeds Dispatch/OSRM, vehicle alternatives, period planning cost and an optional anonymous comparable reference before a contract or shift exists. Planned, forecast and actual financial evidence remain separate.
- `COMPANY` uses employee/workday context, `SCHOOL` uses student/education-calendar context, and `ORGANIZATION` uses participant/event-period context. Unrelated service types and historical references are not mixed across roles.
- Buyer views keep budget, commitment, service expense, earned income, invoice and payment states distinct; they never expose ROOM internal expense, salary, margin, private floor, raw route/geocode or personal data. Missing or incomparable evidence stays fail-closed and user-visible in Turkish.
- A role/tenant-specific label is presentation-only: it must not create a parallel finance engine, API, authorization path or data store. Shared selections, Sefer Abi context, role/tenant negatives and current normal Chromium evidence remain required at the existing acceptance boundary.

  ### Permanent Turkey-wide paid-road coverage rule

  - Ücretli otoyol, köprü ve tünel kapsamı İstanbul örnekleriyle sınırlı değildir; KGM resmi ücret kataloğu ile ilgili resmi işletmecilerin Türkiye geneli kapsam matrisi canonical dış referans sağlayıcısında tutulur.
  - Her geçişte canonical rota/route snapshot, işletmeci ve ücretli kesim, giriş-çıkış gişesi, yön, açık HGS sınıfı, hizmet tarihi, tarife geçerlilik tarihi ve resmi kaynak kimliği birlikte doğrulanır. Araç tipinden HGS sınıfı sessizce çıkarılmaz.
  - `VERIFIED` veya `VERIFIED_*` tarife durumu yalnız resmi güncel HTML/PDF bağlantısı ilgili kesimle eşleşip istenen tarife tarihiyle doğrulandığında verilebilir; belge kataloğu tek başına rota-geçiş eşleşmesi değildir.
  - Dispatch/OSRM çoklu araç planında her araç kendi rota ve passage kanıtını taşır. Bir aracın ücretini başka araca kopyalamak, tek toplamı araç sayısına bölmek veya aynı canonical passage'ı iki kez toplamak yasaktır.
  - Çoklu araç preview'ında `routePassageRequests.vehicleByCount` kullanılıyorsa her araç için açık `vehicleRoutes` ve `requestsByVehicle` bağlamı taşınır; bütün seçili araçlar `PROVEN` olmadan toplam yayımlanmaz. Zaten araç bazında toplanmış ücret canonical maliyet motorunda ikinci kez araç sayısıyla çarpılmaz.
  - Resmi adapter veya geçerli tarife/eşleşme kanıtı yoksa sonuç `NOT_PROVEN` kalır; sıfır ücret, sahte tarife, kesin toplam maliyet veya kesin en ekonomik rota gösterilmez. Actual HGS olayı planlanan tarife kanıtından ayrı tutulur.
  - Kapsam matrisi `SUPPORTED`, `CATALOG_ONLY`, `NOT_OPEN_OR_NO_TARIFF` ve `NOT_PROVEN` durumlarını ayrı raporlar. Bütün Türkiye kapsamı gerçek rota → tarife → canonical maliyet → teklif ve normal Chromium kanıtı olmadan `FULL_COVERAGE PASS` değildir.

## Permanent role, tenant and business-ownership boundary

- SeferPakt'ın sekiz rolü (`ROOM`, `COMPANY`, `SCHOOL`, `ORGANIZATION`, `DRIVER`, `PERSONEL`, `PARENT`, `SUPER_ADMIN`) kendi görev alanını, kendi yetkili tenant'ını ve kendi kayıtlarını yönetir. `SUPER_ADMIN` yalnız platformun sistemsel, teknik, güvenlik ve yönetişim sorumluluğudur; başka rollerin günlük ticari işlerinin sahibi veya rutin yetki dağıtıcısı değildir.
- `ROOM_FINANCE_SALARY` alan/kategori adı olarak korunur; rutin ROOM finans işlemlerinde ayrı bir maaş grant'i değildir. ROOM rolündeki kullanıcı yalnız kendi oturumundaki `roomId` tenant'ı içindeki sürücü maaşı, işveren maliyeti ve diğer maliyet kayıtlarını okuyabilir, taslaklayabilir, güncelleyebilir ve açık onayla doğrulayabilir.
- Maaş ve maliyet erişiminin canonical sahibi `ROOM` rolü + sunucu tarafından doğrulanan aynı `roomId` kapsamıdır. Self-grant, başka tenant'a erişim, `SUPER_ADMIN` üzerinden rutin maaş okuma/yazma ve kullanıcıdan teknik capability/tenant ID isteme yasaktır.
- ROOM maliyet yaşam döngüsü için `ROOM_FINANCE_SALARY` grant araması, TOTP step-up veya SUPER_ADMIN onayı eklenmez. Açık kullanıcı onayı, dönem/tutar/ilişki doğrulaması, idempotency, audit ve çift sayım korumaları devam eder. Yüksek riskli ve bu yüzeyin dışındaki sistem yazma işlemlerinin mevcut TOTP politikası değişmez.
- `SUPER_ADMIN`, `COMPANY`, `SCHOOL`, `DRIVER`, `PERSONEL`, `PARENT` ve başka ROOM tenant'ları maaş ayrıntılarında fail-closed kalır. Rol/tenant kontrolü finans servisinin ve route'un canonical sahibi olmalı; grant, ownerUserId veya paralel authorization sistemiyle aşılmaz.
- Önceki owner/grant-admin/TOTP maaş tasarımı bu ürün kararıyla superseded'dir. Bu karar için migration, grant tablosu değişikliği, kullanıcı sahibi ataması veya doğrudan veritabanı yetki yazımı yapılmaz.

### M18 doğrudan ROOM finans defteri yazma sınırı

- `M18_NO_BUSINESS_WRITE`, Sefer Abi/copilot/assistant yollarının finansal business-write yapmasını engellemeye devam eder.
- Doğrulanmış demo ortamında, aynı sunucu tarafından doğrulanan `ROOM` rolü ve `roomId` kapsamındaki kullanıcı; yalnız canonical Finansal Operasyonlar → Gider Yönetimi UI/API'si üzerinden gider taslağı oluşturabilir, düzenleyebilir, açık onaylayabilir, audit'li düzeltebilir ve yetkili dağıtım kanıtı ekleyebilir.
- Bu dar istisna ödeme, tahsilat, bordro dışı maaş yetkisi, fatura/muhasebe kaydı veya hakediş icrası vermez. Bu bounded ROOM Finans çalışmasının açık kullanıcı onaylı gelir zinciri route'u ayrı ve tenant-scope'lu olarak çalışır; Sefer Abi bu işlemleri kullanıcı adına sessizce uygulayamaz.
- Her yazma aynı tenant/rol kontrolü, açık kullanıcı onayı, idempotency/çift sayım koruması ve audit kaydıyla yürür; KDV bilinmiyor, maaş gizliliği, KVKK ve mevcut M18 sınırları korunur. Bu istisna M18'i kapatmaz.

## Permanent product-first anti-checker-loop lock

The existing Permanent acceptance boundaries and K anti-loop rule are binding: checker results support regression protection and do not replace real Turkish user/browser acceptance.

The D-Level order is locked: ROOM → COMPANY → SCHOOL → ORGANIZATION → DRIVER → PERSONEL → PARENT → SUPER_ADMIN → integrated eight-role real-user acceptance. General checker/harness reliability review, calibration, consolidation or retirement assessment belongs to the #18 final stage after those role acceptances, not before them. An unrelated checker failure must not block bounded real-user D-Level work; concrete security, tenant, KVKK, data-integrity or directly related product regressions remain immediate exceptions.

Bounded D-Level work follows: **bulk detection → root-cause grouping → bounded corrective → targeted regression → combined real Chromium/public acceptance → baseline**. Long work is split into 3–5 durable checkpoints with exact scenario IDs. Every new task must name the open user task or mandatory security gate it closes; otherwise it does not displace the active role acceptance. Existing checkers and proven PASS evidence remain intact, while unrelated failures stay visible for the #18 final calibration backlog without triggering a new general audit loop.

## ROOM M18 functional-scope and immutable-baseline boundary

`ROLE FUNCTIONAL 10/10` is based on complete real-function coverage, not a historical fixed test count. For ROOM, every mandatory reachable function must have a unique traceable acceptance ID, explicit acceptance criteria, canonical owner, real user purpose, expected visible result and valid current public Chromium/mobile evidence. Every function must be classified as `PRODUCT_PASS`, `MERGED_ALREADY_PROVEN`, `OWNER_APPROVED_DE-SCOPE`, `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN` or `SECURITY_BLOCK`; `ROOM FUNCTIONAL 10/10` must not be declared while any mandatory function remains `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN`, `SECURITY_BLOCK` or has an open regression. Checker GREEN cannot replace real Chromium acceptance. All reachable authorized surfaces and unauthorized negative boundaries remain in scope; a historical count may not be used to omit a real function.

The historical ROOM 132-cell formula and 69 `NOT_PROVEN` records remain immutable audit history. They must not be deleted, silently converted to PASS, or bulk-merged without a traceable canonical function decision. Historical aliases, duplicate cells and owner-approved de-scope decisions remain separately recorded and do not create synthetic PASS rows.

After ROOM FUNCTIONAL 10/10 is proven, and before COMPANY acceptance begins, bind the ROOM closure baseline to the canonical source/runtime identity, the unique functional acceptance manifest, public Chromium and mobile PASS evidence, demo-data and tenant-security references, durable regressions and integrity hashes for the evidence files. Do not mutate closed historical acceptance evidence; append later results as versioned evidence. When COMPANY or a later role changes shared sources, preserve the directly affected ROOM behaviors and reaccept them before that later role closes if a concrete regression is found.

For every bounded change, inspect the relevant worktree state before editing and preserve unrelated active-task changes. No destructive reset, clean, checkout, restore or overwrite is permitted without explicit scope and authorization.

## SEFERPAKT — MANDATORY 8-ROLE FUNCTIONAL ACCEPTANCE STANDARD

This standard applies to ROOM, COMPANY, SCHOOL, ORGANIZATION, DRIVER, PERSONEL, PARENT, and SUPER_ADMIN.

A role is not FUNCTIONAL 10/10 merely because its API tests or checkers are GREEN.

### A. Complete surface coverage

For each role, enumerate the complete interface tree reachable from the current source and real browser:

- main and submenus;
- pages, tabs and subtabs;
- accordions, disclosures, drawers, modals and popovers;
- tables, lists, filters, search and record details;
- selected-record context and authorized action controls;
- dynamic content and suggested-question chips;
- empty, populated, loading, error, stale and unauthorized states;
- responsive and mobile behavior.

Map every reachable surface to acceptance evidence. If the predefined manifest is narrower than the actual UI tree, complete the coverage. An authorized surface may not be omitted; an unauthorized surface must be covered by a negative test.

### B. 100% of suggested questions

Every suggested-question chip displayed for each tested role, screen and record context must be checked. Each chip must be contextually appropriate, answer the actual question in understandable Turkish, use authorized current data, reveal or open the real DOM target when needed, preserve role and tenant boundaries, update when the screen or selected record changes, fail safely on stale context, and provide a useful user result.

Report displayed chips and tested context combinations numerically. One incorrect or unsafe chip blocks the applicable acceptance.

### C. Turkish natural-language acceptance

Important user tasks must be tested with realistic Turkish variants, including short, long, incomplete, contextual, synonymous, conversational and follow-up requests. Cover, as applicable:

- Bunu göster.
- Bunun ayrıntısını aç.
- Buradan hangileri oluşmuş?
- Adım adım anlat.
- Devam.
- Geri.
- Önceki adıma dön.
- Bulamadım.
- O menü yok.
- Neden böyle?
- Nasıl yapacağım?

Ambiguous requests must not invent a record or target; use safe clarification or recovery.

### D. Required end-to-end function chain

Every important user task must be validated as one chain:

`ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR → YETKİLİ UYGULA`

- **ANLA:** resolve intent, operation, object and scope correctly.
- **BAĞLAMI KORU:** preserve active tenant, role, screen, selected record and task step.
- **ANLAT:** provide an accurate, clear Turkish answer grounded in authorized evidence.
- **GÖSTER:** find and visibly identify the real UI target when required.
- **YÖNLENDİR:** open the correct menu, tab and record; Devam, Geri and Bulamadım must use real task state.
- **YETKİLİ UYGULA:** perform only the operation allowed by the milestone. Critical or unauthorized commercial actions must not happen silently.

Within M18, application is limited to permitted guidance and UI actions; later #19 and #20 operations are not forced into M18. Intent labels, HTTP 200, answer text or a highlight alone are not acceptance; the user-visible task result is required.

### E. Demo-data readiness

For each critical function, cover the meaningful available cases: a populated positive case, empty result, multiple records or relations, missing or ambiguous data, selected-record changes, role and tenant negatives, and domain-specific statuses.

Missing data cannot be reported as PASS. Reuse existing demo fixtures first. If data is genuinely missing, prepare only a minimum, idempotent, isolated fixture plan. Any new database write requires the existing authorization and approval boundary; no destructive reset, reseed or uncontrolled edit is allowed, and real customer data is not used.

### F. Real browser and device evidence

On the same-source canonical runtime, verify real Chromium, desktop, 1024px, 390px mobile, 320px mobile, real DOM/target transitions, drawer/modal/accordion interactions, horizontal overflow and blocked touch targets, and a representative same-build public/tunnel environment.

Do not treat a result as PASS for a new source until loaded runtime identity matches the source identity.

### G. Security

For every role, test with real negatives: role and tenant isolation; unauthorized screen and record access; financial and personal-data leakage; selected-record confusion; stale-target behavior; unauthorized write actions; and critical-operation approval boundaries.

A real security defect cannot be deferred.

### H. Durable regression protection

Add every real product defect to the applicable existing regression scope. Preserve the exact source, runtime and evidence baseline for an accepted role. When a later role changes shared sources, rerun the affected prior-role regressions. A PASS from an older source is not automatically valid for a new source.

### I. Two-stage acceptance

**ROLE FUNCTIONAL 10/10:** all required role functions, natural-language tasks, suggested questions, real browser/DOM behavior, mobile behavior, demo-data readiness, real security and regression protections PASS; each mandatory function has a unique traceable ID, explicit criteria, canonical owner and current evidence, with no open `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN`, `SECURITY_BLOCK` or regression.

**M18 FORMAL CLOSED:** after all eight roles are complete, strict global KVKK, SHA/identity, ownership, provenance, repository hygiene and all mandatory final governance gates PASS.

Historical identity and hygiene reconciliation may remain for the final stage, but real security and authorization defects may never be deferred. FUNCTIONAL 10/10 does not mean FORMAL CLOSED.

### J. Acceptance reporting

Every role's final report must include at least: total/reached/missing surfaces; suggested-question total/PASS/FAIL; Turkish natural-language tasks; ANLA–UYGULA end-to-end results; demo-fixture readiness; public Chromium and mobile evidence; role/tenant security negatives; durable regression status; ROLE FUNCTIONAL 10/10 result; and M18 FORMAL governance status.

Missing evidence remains NOT_PROVEN; PASS must not be invented.

### K. Anti-loop rule

Resolve real product defects at their structural canonical owner. Do not change correct product behavior to satisfy a wrong checker. Do not silently remove mandatory security or governance gates. Do not create repeated general audit loops for the same evidence and root cause. The same acceptance discipline applies to every role.

This standard does not invalidate acceptance results already proven in the active ROOM work. ROOM must not be declared 10/10 until its missing evidence is complete, and the same standard applies automatically to the other roles.

## Sağlam Merdiven — kalıcı kabul standardı

Uygulanabilir kabul matrisi ve paralel Codex güvenlik kuralları [Sağlam Merdiven standardında](docs/governance/saglam-merdiven-acceptance-standard.md) tutulur. Bu belge mevcut `docs/AGENTS.md`, state owner'ları, locked invariant'ları ve milestone sözleşmelerini değiştirmez.

- Sekiz deneyim (`SUPER_ADMIN`, `ROOM`, `COMPANY`, `SCHOOL`, `ORGANIZATION`, `DRIVER`, `PERSONEL`, `PARENT`) ayrı gerçek kullanıcı bağlamlarıyla değerlendirilir; `SCHOOL` ve `ORGANIZATION`, `COMPANY + Company.kind` temsili olarak korunur.
- Frontend, backend, gerçek veri, güvenlik ve Sefer Abi aynı görevin kullanıcı sonucu üzerinden birlikte kanıtlanır. Toplam 11 Finans sekmesinde kabul edilmiş fiyat, hakediş, fatura/tahsilat, bakiye, maliyet ve kârlılık aynı canonical ekonomik kaynaktan değerlendirilir; çift sayım ve kanıtsız kesin sonuç kabul edilmez.
- Sefer Abi #18 için erişilebilir menü/alt menü/sekme/kayıt yüzeyleri, eksik önerilen sorular ve `ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR` çok turlu Türkçe zinciri kanıtlanır.
- Gerçek operasyon zinciri, tenant/RBAC/KVKK, source/runtime/artifact provenance, canonical/public same-build, deployment/rollback ve responsive kanıtı birlikte aranır.
- `PRODUCT_DEFECT`, `FIXTURE_GAP`, `HARNESS_DEFECT`, `SECURITY_BLOCKER`, `STALE_RUNTIME` ve `NOT_PROVEN` ayrılır; `PASS_BOUNDED` veya proven work somut regresyon olmadan CLOSED'a çevrilmez veya yeniden açılmaz.
- Paralel Codex işleri ayrı worktree/fixture/artifact/checkpoint kullanır; Part D ve diğer aktif işlerin dosyaları kopyalanmaz, overwrite edilmez veya otomatik birleştirilmez. Ayrıntılı standarda yönlendirme yeni milestone, ikinci kabul motoru veya ürün geliştirme yetkisi vermez.

## Permanent #18 D-Level progress and closure measurement

Bu bölüm, mevcut #18 D-Level kabulünün ölçüm ve raporlama sözleşmesidir; yeni
milestone, yeni state owner, ikinci kabul motoru veya ürün kapsamı oluşturmaz.
İlerleme tek bir append-only D-Level checkpoint/evidence zincirinde tutulur.
`docs/NEXT_BACKLOG_V1.md`, `docs/MILESTONE_REGISTRY_V1.md` ve locked-invariant
dosyaları kendi sahipliklerini korur; bu sayaçlar onların yerine geçmez.

### Tek kanonik envanter ve kimliklendirme

Her kabul kalemi bir kez ve sabit bir kimlikle kaydedilir. Kimlik biçimi
kalemin türünü açıkça taşır:

- `ROLE/<ROLE>/<SURFACE>`: rol, route, ekran, sekme, modal, form veya kontrol;
- `CHIP/<ROLE>/<SURFACE>/<CHIP>`: Sefer Abi öneri çipi veya bağlamı;
- `NL/<ROLE>/<SCENARIO>`: gerçek Türkçe doğal dil görevi;
- `E2E/<CHAIN>`: ticari, operasyonel, finansal veya roller arası zincir;
- `SEC/<ROLE>/<BOUNDARY>`: KVKK, RBAC, tenant veya yetkisiz işlem negatifi;
- `RESP/<SURFACE>/<VIEWPORT>`: 1440/1024/390/320 responsive kabulü;
- `REPO/<ITEM>`: repository-exit kalemi.

Route/ekran sayısı, alt yüzey sayısı, çip/bağlam sayısı, doğal dil görevi,
uçtan uca zincir, güvenlik negatifi, responsive kabulü, açık ürün kusuru ve
repository-exit kalemi ayrı ölçülür. Aynı işlev farklı yüzeylerde tekrar
sayılmaz; shared route bir kez sayılır. Tarihsel `95 route` ve `27 çip
bağlamı` değerleri yalnız kaynaklarıyla birlikte baz ölçüm olarak korunur ve
bütün mevcut işlevleri kapsıyor varsayılmaz. Yeni bulunan kalemler görünür
biçimde aynı envantere eklenir; ikinci bir envanter dosyası açılmaz.

### İzin verilen statüler

Her kalem yalnız güncel source/runtime ve kullanıcı kanıtıyla şu statülerden
birini alabilir: `PASS`, `PASS_WITH_SCOPE`, `FAIL`, `NOT_PROVEN`, `BLOCKED`,
`N/A`. `N/A` gerekçesiz kullanılamaz. Checker/test altyapısı kusuru ürün
PASS'ı değildir ve ayrıca `HARNESS_DEFECT` olarak sınıflandırılır. Ürün,
güvenlik, runtime, veri ve sahiplik engelleri birbirine dönüştürülmez.

`PASS_WITH_SCOPE`, tam kapanış sayacına dahil edilmez. `FAIL`, `BLOCKED`,
`NOT_PROVEN`, açık ürün kusuru veya eksik kalıcı regresyon varken ilgili rol,
işlev veya D-Level kapanış kapısı kapanmış ilan edilmez. Kanıtlanmış P9 HGS,
PARENT public güvenlik ve frontend cutover işleri yeni somut regresyon olmadan
otomatik olarak yeniden `BLOCKED` yapılamaz.

### Her bounded turun zorunlu ölçüm raporu

Her D-Level checkpoint'i şu başlıkları aynı zincirde taşımalıdır:

1. **Rol ve ekranlar:** toplam erişilebilir route/yüzey, ziyaret edilen,
   tam `PASS`, `PASS_WITH_SCOPE`, `FAIL`, `NOT_PROVEN`, `BLOCKED`, gerekçeli
   `N/A` ve rol başına açık kalemler.
2. **Sefer Abi:** toplam envanterli çip/bağlam, semantik `PASS`, kısmi kabul,
   `FAIL`, `NOT_PROVEN`, açık proaktif olay/eylem ve yetki/güvenlik senaryosu.
3. **Uçtan uca senkronizasyon:** envanterli gerçek kullanıcı zincirleri,
   tam/kısmi/açık sonuçlar ve ROOM ile karşı roller arasındaki kanıtlanmış
   kayıt eşleşmeleri.
4. **Teknik ve güvenlik:** branch/HEAD, API image, frontend bundle ve SHA,
   public aynı-build sonucu, migration sayısı, 1440/1024/390/320 kanıtı,
   tenant/RBAC/KVKK negatifleri ve açık hata/regresyon sayısı.
5. **Bu turun etkisi:** önceki toplam, bu turda kapananlar, yeni keşifler,
   güncel toplam/açıklar ve kanıt yolları. Yalnız ölçüm kuralı değiştiyse
   `measurementOnly=true` yazılır; ürün kabul sayıları değiştirilmez.
6. **Repository:** açıklanması gereken, uzlaştırılan ve açık kayıtlar;
   fiziksel temizliğin başlayıp başlamadığı ve No-Surprise Repository Exit
   durumu.
7. **Kesin sonraki iş:** en yüksek öncelikli açık, rol/yüzey, beklenen
   kullanıcı sonucu ve gerekli gerçek kabul kanıtı.

Toplamlar güvenilir değilse sayı uydurulmaz; ilgili alan `NOT_PROVEN` ve
   somut nedeni ile yazılır. Rol, route, çip ve senaryo paydaları tek bir
   yanıltıcı ilerleme yüzdesinde birleştirilmez. Yüzde yalnız doğrulanmış,
   sabit ve aynı kimlikli kapsam üzerinden hesaplanabilir.

### İki ayrı kapanış kapısı

`FUNCTIONAL_D_LEVEL_CLOSED` yalnızca sekiz rolün kapsam içi işlevleri,
Sefer Abi'nin mevcut çip/konuşma/yetkili eylemleri, uçtan uca senkronizasyon,
KVKK/RBAC/tenant negatifleri, aynı-build public ve responsive kabulü, kalıcı
regresyonlar ve tüm zorunlu kanıtlar tamamlandığında `true` olabilir. Açık
`FAIL`, `BLOCKED`, `NOT_PROVEN`, ürün boşluğu veya eksik regresyon varsa kapı
kapalı değildir.

`REPOSITORY_EXIT_CLOSED` ancak işlevsel kapıdan sonra; repository-owned
kayıtların sahiplik/provenance/tüketici/lifecycle/retention kanıtları,
harness/checker uzlaştırması, No-Surprise Repository Exit ve son regresyonlar
tamamlandığında değerlendirilebilir. Fiziksel temizlik, ownership
uzlaştırması, commit/tag/push bu kapıdan önce başlatılmaz.

Bu iki kapıdan biri açık kaldığı sürece şu kararlar korunur:
`FULL_D_LEVEL_CLOSED=false` ve `#19=NOT_STARTED`. Her checkpoint, önceki
kanıtları koruyarak yalnız yeni kanıtlanan değişimi ekler; aynı audit döngüsü
ürün ilerlemesinin yerine geçirilemez.

### Kanıtlı PASS için CLOSED ve yeniden açmama kuralı

`docs/evidence/m18-dlevel-acceptance-ledger-v1.json` #18 için tek kanonik
acceptance ledger'dır. Yeni ledger, paralel sayaç veya yeni genel checker
oluşturulmaz. Her tam `PASS` kalemi sabit kabul kimliği, doğrulanan
source/runtime/build kimliği, gerçek kullanıcı sonucu ve kanıt yolu ile
`closureState: "CLOSED"` olarak işaretlenir. `CLOSED`, `PASS` statüsünün
yerine geçen yeni bir kabul statüsü değildir; tam kabulün yaşam döngüsü
işaretidir.

- `CLOSED` bir kalem sonraki CONTINUATION çalışmasında yeniden test edilmez,
  yeniden geliştirilmez ve genel runtime sürüm değişikliği gerekçesiyle
  otomatik olarak açılmaz.
- `PASS_WITH_SCOPE` yalnızca kayıtlı eksik alt koşulları hedefler. Önceden
  geçen alt koşullar korunur ve tekrar kabul testi gibi sayılmaz; kapsam sessiz
  biçimde tam `PASS` veya `CLOSED`'a yükseltilmez.
- `CLOSED` kalem ancak somut regresyon, ilgili kod/şema/konfigürasyon
  değişikliğinin o davranışı etkilediğine dair kanıt veya önceki kabul
  kanıtının geçersiz olduğunu gösteren doğrulanabilir bulgu ile yeniden
  açılabilir. Yeniden açma kaydı aynı ledger'da etkilenen sabit ID'leri,
  gerekçeyi, yeni runtime/build kimliğini ve gerekli hedefli regresyonu
  belirtir.
- Yeni deployment sonrasında yalnız değişen davranış, doğrudan etkilenen
  roller/güvenlik sınırları ve zorunlu kritik smoke/regresyonlar çalıştırılır;
  değişmemiş CLOSED kalemler tekrar sayılmaz.
- 644 kaynak-türetilmiş işlev birimi 644 ayrı E2E testi değildir. Tek bir
  gerçek kullanıcı senaryosu birden fazla bağımsız davranışı gerçekten
  kanıtlıyorsa kanıt her ilgili sabit ID'ye bağlanır; kanıtlanmayan negatif,
  tenant, KVKK, responsive veya senkronizasyon alt koşulları PASS yapılmaz.
- Her bounded çalışma en az bir gerçek açık kabul ID'sini kapatmayı veya
  somut engeli aynı ledger'da daraltmayı hedefler. Kapanan ve kalan sayılar
  önceki ledger durumuyla karşılaştırmalı yazılır; yalnız ölçüm üretmek,
  aynı audit raporunu yinelemek veya eski PASS'ları sıfırlamak ilerleme
  sayılmaz.
- İşlevsel #18 kapısı gerçekten kapandığında repository cleanup ve son
  hedefli regresyon aşamasına geçilir. Repository çıkışı tamamlanmadan
  `FULL_D_LEVEL_CLOSED=true` veya `#19` başlangıcı ilan edilmez.

### Kalıcı #18 Sefer Abi bütünleşik kabul kilidi

Her #18 D-Level CONTINUATION çalışmasında rol ekranı kabulü ile aynı ekranda
erişilebilir Sefer Abi çipleri, doğal dil görevleri ve bağlama bağlı işlevler
aynı gerçek kullanıcı yolculuğunda değerlendirilir. Ekran işlevi ile Sefer Abi
işlevi ayrı sabit ID'lerde tutulur; birinin PASS/CLOSED olması diğerini
otomatik olarak kapatmaz.

- Sekiz rolün (`SUPER_ADMIN`, `ROOM`, `COMPANY`, `SCHOOL`, `ORGANIZATION`,
  `DRIVER`, `PERSONEL`, `PARENT`) erişilebilir mevcut Sefer Abi yüzeyleri
  kapsanır; tarihsel bağlam sayıları nihai payda kabul edilmez.
- Uygulanabilir kapsamda gerçek Türkçe soru, seçili kayıt ve çok turlu bağlam
  korunması, doğru backend verisi, ANLA → BAĞLAMI KORU → ANLAT → GÖSTER →
  YÖNLENDİR → YETKİLİ UYGULA → SONUÇ zinciri, public Chromium davranışı ve
  gerekli rol/tenant/KVKK negatifleri kanıtlanır.
- Doğru metin tek başına yeterli değildir: gerçek kayıt, doğru yönlendirme,
  yetkili işlem ve görünür sonuç gerektiğinde ayrıca kanıtlanır. Önceden
  PASS/CLOSED olan çipler somut regresyon olmadan yeniden test edilmez.
- Sefer Abi avatarı, sprite'ları, animasyonları, drawer'ı ve mevcut yerel
  semantik mimarisi korunur; harici LLM/API/SDK eklenmez.
- `CHIP/ALL_ROLES/CONTEXT_MATRIX` ve zorunlu Sefer Abi koşulları açıkken
  `FUNCTIONAL_D_LEVEL_CLOSED=true` yasaktır. Ekranlar veya Sefer Abi tek
  başına tamamlanmış görünse bile diğer zorunlu kabul kapıları açık kalır;
  `FULL_D_LEVEL_CLOSED=true` için `REPOSITORY_EXIT_CLOSED=true` de gerekir.
- Her checkpoint raporu rol bazında tam/kısmi/hatalı/test edilmemiş Sefer Abi
  bağlamlarını, kesin eksiklerini ve sonraki sabit kabul ID'lerini belirtir.

### Kalıcı #18 Sefer Abi ortak UX sözleşmesi

- Mobilde öneri çipleri sohbet geçmişinin üstüne taşınmaz. Çipler, mesaj
  çubuğunun hemen üstündeki varsayılan kapalı `Önerilen sorular` accordion'unda
  bulunur; dokunarak açılır/kapanır, yukarı doğru genişler ve seçilen öneri
  mevcut yetkili soru akışını çalıştırıp accordion'u kapatır. Dışarı dokunma,
  route/ekran değişimi veya klavyenin açılması accordion'u kapatır; okuma
  sırasında zamana bağlı otomatik kapanma uygulanmaz ve composer/gönder düğmesi
  erişilebilir kalır.
- Öneriler rol, ekran, seçili kayıt ve gerçek backend yetkilerine göre üretilir;
  seçim konuşma geçmişini ve kayıt bağlamını korur. Mobil hover gerektirmez;
  masaüstü pointer/hover davranışı korunur. 320/390/1024/1440 genişlikleri ve
  sekiz rol, gerçek Chromium kabulinde gerektiği kapsamda doğrulanır.
- Yanıtlar varsayılan olarak tam metin gösterilir; `Yanıtı Genişlet` ve
  `Yanıtı Daralt` kontrolleri ile bunlara ait otomatik kesme/state mantığı
  kullanılmaz. Uzun yanıtlar normal sohbet kaydırmasıyla okunur.
- Yüzen pencere başlığında yalnız dört standart simge bulunur: `−` Küçült,
  `□` Büyüt/Geri yükle, `↗` Ayrıntılı aç ve `×` Kapat. Simge açıklamaları
  hover, klavye ve ekran okuyucu adlarıyla eksiksiz sağlanır; simgeler görsel
  olarak kompakt kalırken dokunma hedefleri erişilebilir ölçüyü korur.
- Bu UX davranışları ortak Sefer Abi drawer bileşeninde korunur; role özel
  kopya sürükleme/accordion/chat sistemi kurulmaz. Avatar, sprite, animasyon,
  seçili kayıt, konuşma ve güvenlik bağlamı boyutlandırma, taşıma, küçültme,
  kapatma veya yeniden açmada kaybolmaz.

### Kalıcı #18 hibrit kabul yöntemi

#18 D-Level bounded çalışmaları yalnız rol ekranı veya yalnız uçtan uca test
olarak yürütülmez. İlgili kapsamda kabul sırası:
`ROL İŞLEVİ → İLGİLİ ROL SENKRONİZASYONU → SEFER ABİ → GÜVENLİK → KANITLI KAPANIŞ`.

- Bir işlem başka bir rolü etkiliyorsa aynı gerçek kullanıcı yolculuğunda
  karşı rolün yetkili görünürlüğü, API/DB ilişki ve durum senkronizasyonu,
  gerekli Socket.IO/canlı güncelleme, AuditLog/idempotency ve yanlış
  tenant/rol reddi kontrol edilir. Yerel ekran işlevi kendi sabit ID'sinde
  kapanabilir; karşı-rol senkronizasyonu ayrı kabul ID'si olarak açık kalır.
- Öncelikli zincirler PERSONEL taşımacılığında
  `COMPANY → ROOM → DRIVER → PERSONEL`, okul taşımacılığında
  `SCHOOL → ROOM → DRIVER → PARENT`, organizasyonda
  `ORGANIZATION → ROOM → DRIVER`, finans için hizmet alan yetkili rol ile
  `ROOM`, yönetimde `SUPER_ADMIN → ilgili tenant/rol` şeklindedir.
- Aynı yolculukta ekranın erişilebilir Sefer Abi çipleri ve bağlamları da
  rol yetkisine göre değerlendirilir: gerçek Türkçe soru, seçili kayıt,
  çok turlu bağlam, doğru backend verisi, gerektiğinde yönlendirme ve
  desteklenen yetkili eylemin görünür sonucu ile
  `ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR → YETKİLİ UYGULA →
  SONUÇ` zincirinin gerçekten gerekli aşamaları kanıtlanır.
- Ekran, senkronizasyon ve Sefer Abi kabul ID'leri ayrı kalır; tek bir
  PASS diğerlerini otomatik kapatmaz. Aynı gerçek kanıt birden fazla sabit
  ID'nin koşulunu karşılıyorsa her biri ayrı ayrı ledger'a bağlanır.
- Yazma/durum değişikliği için API/DB/audit/idempotency; finans için tutar,
  ilişki, mükerrer işlem ve yetki; tenant/KVKK için pozitif ve gerekli
  negatif; public/responsive için güncel build ile gerçek Chromium kanıtı
  zorunludur. Kapsamı aşan veya geleceğe ait özellikler #18'e taşınmaz.
- `CHIP/ALL_ROLES/CONTEXT_MATRIX` ve #18 zorunlu senkronizasyon koşulları
  açıkken `FUNCTIONAL_D_LEVEL_CLOSED=true` yapılamaz. İşlevsel kapıdan önce
  repository fiziksel temizliği yapılmaz; `REPOSITORY_EXIT_CLOSED` ve
  `FULL_D_LEVEL_CLOSED` ayrı kapılar olarak korunur ve `#19=NOT_STARTED`
  kalır.

### Kalıcı ana frontend kabul kuralı

SeferPakt kullanıcı fonksiyonlarının #18 ve sonraki DEMO/E2E kabulü, tek
canonical `seferpakt_clean_demo.public` verisiyle çalışan ana frontend
(`http://localhost:5273`) ve aynı build'e bağlı public frontend üzerinde,
normal kullanıcı oturumu ve gerçek Chromium etkileşimiyle kanıtlanır. İzole
teknik test veya fixture kanıtı ana frontend ürün kabulinin yerine geçmez;
izole çalışma yalnız kod/entegrasyon desteği olarak ayrıca etiketlenir.

Kontrollü DEMO kayıtları `TEST_SIMULATED` kaynağıyla izlenebilir olmalı,
kullanıcı ekranında gerçek saha hizmeti, GPS, banka veya ödeme kanıtı gibi
sunulmamalıdır. Ana frontend'de görünür pozitif kullanıcı sonucu olmadan
fonksiyon `PASS` veya ekran `CLOSED` yapılamaz; gerçek saha koşulları ayrıca
`FIELD_VALIDATION_OPEN` olarak korunur.
