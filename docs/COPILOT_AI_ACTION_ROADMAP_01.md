# COPILOT AI ACTION ROADMAP 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman Sefer Abi / Copilot için gelecekteki AI action phase modelini kilitler.
- Bu milestone runtime AI action açmaz; tool execution, write-action dispatcher, otomatik işlem ve kritik write yolları kapalı kalır.
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotAiActionRoadmap.js` ile taşınır; helper runtime executor değildir.
- Canonical check: `check:copilotairoadmap01`
- Komut: `node backend\scripts\copilot_ai_action_roadmap_01_check.js`

## Amaç
- `COPILOT-ROLE-TASK-MATRIX-01` sonrasında Sefer Abi için gelecekteki AI action yol haritasını statik olarak tanımlar.
- Kullanıcıya önce okuma, açıklama, öneri ve hazırlık sağlar; kritik işler için insan onayını korur.
- Public promise overclaim yapmaz.
- Bu roadmap demand-to-agreement hazırlık hattına zemin hazırlar; sonraki future-only halka `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`'dir.
- İnsan onayı / confirmation modeli ayrı docs/check katmanı `COPILOT-HUMAN-APPROVAL-01` ile kilitlenir.
- Bu roadmap Excel demand import readiness hattına da zemin hazırlar; sonraki future-only halkalar `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`, `COPILOT-HUMAN-APPROVAL-01` ve `COPILOT-EXCEL-DEMAND-IMPORT-01`'dir.
- Bu roadmap stop-route draft readiness hattına da zemin hazırlar; sonraki future-only halka `COPILOT-STOP-ROUTE-DRAFT-01`'dir.
- Bu doküman docs/check kilididir; runtime davranış, backend route, service, schema veya Prisma açmaz.

## PHASE modeli

### PHASE 0 — READ / EXPLAIN
- Copilot sadece okur, özetler ve açıklar.
- Bugünkü güvenli baseline budur.

### PHASE 1 — RECOMMEND
- Copilot seçenekleri kıyaslar ve öneri sunar.
- Karar kullanıcıdadır.

### PHASE 2 — PREPARE
- Copilot aksiyon taslağı, checklist, karar notu veya payload önizlemesi hazırlar.
- Runtime execution yoktur.

### PHASE 3 — HUMAN_APPROVAL_REQUIRED
- Kullanıcı açıkça onay vermeden hiçbir kritik işlem ilerlemez.
- Onay metni, risk özeti ve geri alma / etki notu gösterilir.

### PHASE 4 — GUARDED_EXECUTION, future only
- Bu milestone’da açılmaz.
- Gelecekte ayrı milestone ile guard, RBAC, idempotency, audit log ve rollback/undo notu gerekir.

### PHASE 5 — AUDIT_AND_MONITOR, future only
- Bu milestone’da açılmaz.
- Gelecekte her AI destekli kritik işlem audit log, actor, scope, before/after ve reason ile izlenmelidir.

## Action kategorileri

### Low-risk assistive actions
- Metin taslağı
- Kontrol checklist’i
- Risk özeti
- Ekran yönlendirmesi
- Kullanıcıya önerilen sonraki adım

### Medium-risk preparation actions
- Teklif karşılaştırma özeti
- Vardiya hazırlık notu
- Sözleşme hazırlık kontrol listesi
- GPS eşleştirme kontrol listesi
- Dispatch hazırlık payload preview
- Kalite / risk inceleme notu

### High-risk guarded actions, future only
- Offer accept / reject
- Agreement / contract execute
- Route apply
- Dispatch apply
- Driver / vehicle assignment
- Supplier verification decision
- Provider activation
- Payment / hakediş approval
- SMS / email / push send
- User / account / admin changes

### Never-autonomous actions
- Ödeme / hakediş kesinleştirme
- Sözleşme yürürlüğe alma
- Kullanıcı / rol / admin yetkisi değiştirme
- Provider credential / secret yönetimi
- KVKK / privacy policy değiştirme
- Tedarikçiyi otomatik eleme
- Sürücüye ceza / yaptırım oluşturma
- Başka kullanıcının gizli verisini açma

## Role roadmap

### SUPER_ADMIN
- Hazırlayabilir: onboarding review note, supplier verification checklist, provider review checklist, audit risk summary.
- Future guarded: supplier verification decision, provider catalog status change.
- Blocked now: user/account write, provider ACTIVE execute, payment/contract/security policy changes.

### ROOM
- Hazırlayabilir: dispatch checklist, vehicle/driver suitability note, GPS mapping checklist, offer response draft.
- Future guarded: dispatch apply, driver/vehicle assignment, GPS mapping save.
- Blocked now: route apply, stop complete / reached / skipped, provider credential changes, offer auto-submit.

### COMPANY
- Hazırlayabilir: demand summary, offer comparison summary, agreement prep checklist.
- Future guarded: offer accept, agreement preparation request.
- Blocked now: supplier auto-selection, contract execute, payment / hakediş.

### DRIVER
- Hazırlayabilir: route/task explanation, safe-drive reminder text, check-in evidence reminder.
- Future guarded: very limited; no autonomous driver action.
- Blocked now: reached / skipped / complete, route change, assignment changes.

### PERSONEL / PARENT
- Hazırlayabilir: support message draft, ride status explanation.
- Future guarded: very limited request updates only.
- Blocked now: assignment / route / payment / contract / provider / admin actions.

### SCHOOL / ORGANIZATION
- Hazırlayabilir: plan readiness summary, missing data checklist, risk review note.
- Future guarded: plan request submission, if role exists and scoped.
- Blocked now: cross-organization data access, route apply, payment / contract, provider credentials.

## Guard requirements
- Explicit human approval
- Role / RBAC scope check
- Entity ownership / IDOR guard
- Idempotency key
- Dry-run / preview payload
- Risk summary
- Irreversible-effect warning
- Rate limit
- Audit log
- Before/after snapshot
- Rollback / undo note, mümkünse
- Failure fallback
- No silent execution
- No hidden background action
- No secret / token exposure
- KVKK / privacy minimization

## Public promise / güven stratejisi
- Kullanıcıya "AI her şeyi yapar" denmez.
- Public promise sadece testle kanıtlanmış kabiliyeti söyler.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.

## Static helper
- `backend/src/ai/chat/copilotAiActionRoadmap.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Payment / billing / hakediş execute açılmaz.
- Contract / agreement execute açılmaz.
- Offer auto-accept açılmaz.
- Supplier auto-selection açılmaz.
- Route apply açılmaz.
- Driver / vehicle assignment execute açılmaz.
- Provider credential management açılmaz.
- User / account / admin write-action açılmaz.
- Prisma / schema / migration açılmaz.
- Backend route / service değişikliği bu milestone’un konusu değildir.
