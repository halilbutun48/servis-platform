# COPILOT ROLE TASK MATRIX 01

Tarih: 2026-06-11
Repo: `servis-platform`

## docs/check milestone
- Bu doküman bir docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotroletaskmatrix01`
- Komut: `node backend\scripts\copilot_role_task_matrix_01_check.js`

## Amaç
- Sefer Abi / Copilot için rol bazlı görev matrisini kilitler.
- Her rol için hangi ekran ve veri sinyallerinin okunabildiğini, hangi özetlerin sunulabildiğini, hangi önerilerin verilebildiğini, hangi taslakların hazırlanabildiğini ve hangi aksiyonların asla başlatılamayacağını repo içinde sabitler.
- Bu milestone runtime AI action açmaz; tool execution, otomatik işlem, ödeme, sözleşme, teklif kabulü, rota apply, SMS / e-posta / push, provider credential, driver / vehicle assignment veya user / account write-action açmaz.
- `COPILOT-AI-ACTION-ROADMAP-01` bu rol/task baseline üzerine kurulan future-only phase roadmap'tir; burada açılmayan execution alanları orada da açılmaz.
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` bu baseline üzerine kurulan future-only talep -> teklif -> sözleşme hazırlık roadmap'idir; runtime AI action açmaz ve `Kullanıcı onaylarsa` bile yalnız hazırlık / öneri sınırında kalır.

## Canonical action model
Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard'lı uygula -> Audit log yaz

- `Guard'lı uygula` ve `Audit log yaz` bu milestone içinde runtime olarak açılmaz; ileride ayrı milestone olarak ele alınır.
- Copilot içeride daha fazla analiz yapabilir; kullanıcıya yalnız testle kanıtlanmış kabiliyetler vaat edilir.
- Underpromise / overdeliver güven stratejisi korunur.
- Public copy aşırı otomasyon vaadi kurmaz.
- "Karar kullanıcıdadır" ve "insan onayı gerekir" dili korunur.

## Task categories
- `READ`: sadece okur / özetler.
- `EXPLAIN`: ekrandaki sinyali açıklar.
- `RECOMMEND`: öneri sunar.
- `PREPARE`: taslak / checklist / karar öncesi metin hazırlar.
- `REQUIRES_HUMAN_APPROVAL`: insan onayı olmadan ilerlemez.
- `BLOCKED_RUNTIME_ACTION`: bu milestone'da ve current runtime'da yapılamaz.
- `NEVER_AUTOMATE`: güvenlik / KVKK / ödeme / sözleşme / kimlik / mesajlaşma gibi asla otomatik yapılmayacak işler.

## Role/task matrix

### SUPER_ADMIN
- READ: system status, onboarding / başvuru incelemesi, provider catalog / telematics readiness, marketplace readiness, verified supplier readiness, quality / trust / offer quality ranking, audit / observability signals, panel health / smoke quality signals.
- EXPLAIN: hangi başvurunun neden beklediğini, hangi provider veya supplier riskinin önemli olduğunu, hangi panelin aksiyon beklediğini, hangi doc / check'in eksik olduğunu açıklar.
- RECOMMEND: önce hangi başvurunun inceleneceğini, hangi provider / supplier riskinin kontrol edileceğini, hangi panelin açılacağını, hangi check veya dokümanın eksik olduğunu önerir.
- PREPARE: inceleme notu, risk özeti, kontrol checklisti, karar öncesi onay metni hazırlar.
- REQUIRES_HUMAN_APPROVAL: inceleme kararı, onay / ret kararı, kritik güvenlik veya kalite değişikliği için insan onayı gerekir.
- BLOCKED_RUNTIME_ACTION: user/account oluşturma, supplier doğrulama execute, provider ACTIVE yapma, contract/agreement execute, payment/hakediş execute, SMS/email/push gönderme, runtime admin action, security policy değiştirme.
- NEVER_AUTOMATE: kullanıcı hesabı üretmek, yetki / rol yazmak, kritik güvenlik kararını otomatik vermek.
- SCREENS: `/superadmin`, `/superadmin/operations`, `/superadmin/onboarding-review`, `/superadmin/public-leads`, `/superadmin/telematics`, `/superadmin/trust-quality`, `/superadmin/acceptance`, `/superadmin/operation-verification`, `/superadmin/observability`, `/superadmin/commercial-core`, `/superadmin/audit`, `/shared/logs`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

### ROOM
- READ: araçlar, sürücüler, vardiyalar, dispatch hazırlığı, teklif yanıtı, GPS / telematics eşleşmesi, safe-drive risk özeti, kanıt / check-in eksikleri, route progress / LIVE / STALE / OFFLINE.
- EXPLAIN: hangi araç uygun görünüyor, hangi sürücü / araç riski var, hangi eşleşme eksik, hangi teklif kalite / risk açısından incelenmeli, hangi vardiyada dispatch hazırlığı eksik.
- RECOMMEND: hangi araç uygun olabilir, hangi sürücü / araç riski kontrol edilmeli, hangi eşleşme eksik diye bakılmalı, hangi teklif kalite / risk açısından önce açılmalı.
- PREPARE: teklif açıklaması, dispatch kontrol notu, GPS eşleştirme kontrol checklisti, sürücü güvenli sürüş uyarı taslağı.
- REQUIRES_HUMAN_APPROVAL: dispatch / eşleşme kararı, rota değişikliği öncesi insan onayı.
- BLOCKED_RUNTIME_ACTION: driver/vehicle assignment execute, dispatch apply, route apply, stop reached / skipped / complete execute, GPS provider credential yönetimi, SMS/email/push gönderme, ceza / yaptırım oluşturma, offer auto-submit / auto-accept, payment / contract execute.
- NEVER_AUTOMATE: otomatik atama, otomatik kabul, otomatik cezalandırma.
- SCREENS: `/room/map`, `/room/offers`, `/room/shifts`, `/room/vehicles`, `/room/drivers`, `/room/agreements`, `/room/operation-health`, `/room/commercial-flow`, `/shared/logs`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

### COMPANY
- READ: vardiya talepleri, teklif karşılaştırmaları, offer quality ranking, agreement preview, canlı takip, route progress, safe-drive / kalite / evidence sinyalleri, tasarruf / risk önizlemeleri.
- EXPLAIN: hangi teklifin önce incelenmesi gerektiğini, hangi eksik verinin karar öncesi kontrol edilmesi gerektiğini, hangi rota / kanıt / kalite riskinin bulunduğunu, sözleşmeye dönüştürmeden önce hangi kontrolün yapılması gerektiğini açıklar.
- RECOMMEND: önce hangi teklifin açılacağını, hangi eksik verinin kontrol edileceğini, hangi riskli rota / kanıt satırının inceleneceğini, hangi karar öncesi kontrolün yapılacağını önerir.
- PREPARE: talep özeti, teklif karşılaştırma özeti, karar öncesi checklist, sözleşme hazırlık notu.
- REQUIRES_HUMAN_APPROVAL: teklif kabulü, sözleşme onayı, karar öncesi nihai kabul için insan onayı gerekir.
- BLOCKED_RUNTIME_ACTION: offer accept / approve execute, agreement / contract execute, payment / hakediş execute, supplier auto-selection, route apply, user / role changes, SMS/email/push gönderme.
- NEVER_AUTOMATE: insan onayı olmadan karar, otomatik kabul, otomatik sözleşme.
- SCREENS: `/company`, `/company/shifts`, `/company/agreements`, `/company/commercial-flow`, `/company/map`, `/company/operations`, `/company/service-evaluation`, `/shared/logs`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

### DRIVER
- READ: aktif rota, sıradaki durak, check-in / kanıt durumu, GPS sinyali, safe-drive uyarıları, görev açıklaması.
- EXPLAIN: güvenli sürüş kontrolü, GPS sinyali zayıfsa ne kontrol edilmesi gerektiği, sıradaki doğru adım, kanıt eksikse hatırlatma.
- RECOMMEND: güvenli sürüş kontrolü, GPS zayıfsa hangi kontrolün yapılacağı, sıradaki doğru adım, kanıt eksikse hangi hatırlatmanın yapılacağı.
- PREPARE: kısa görev özeti, sürücüye gösterilecek açıklama, güvenli sürüş uyarı metni.
- REQUIRES_HUMAN_APPROVAL: rota değişikliği öncesi onay, görev devri öncesi onay.
- BLOCKED_RUNTIME_ACTION: kendi adına reached / skipped / complete execute, rota değiştirme, yeni durak ekleme, araç / sürücü ataması değiştirme, provider credential görme / yönetme, payment / contract / offer aksiyonu, SMS/email/push gönderme.
- NEVER_AUTOMATE: kendi adına durum kapatma, kendi adına rota değiştirme, kendi adına atama yazma.
- SCREENS: `/driver/today`, `/driver/route`, `/driver/map`, `/driver/checkin`, `/shared/logs`, `/shared/notifications`.

### PERSONEL
- READ: my ride / live tracking, servis durumu, buluşma / toplanma konumu, safe-drive readonly sinyali, gecikme / rota ilerleme açıklaması, fallback / error açıklaması.
- EXPLAIN: ne zaman beklenmesi gerektiğini, hangi durumlarda destek ile iletişime geçileceğini, konum / servis bilgisi eksikse kontrol adımını açıklar.
- RECOMMEND: ne zaman beklenmesi gerektiğini, hangi durumda destek çağrılacağını, eksik konum veya servis bilgisi için ilk kontrolü önerir.
- PREPARE: destek mesajı taslağı, servis durum özeti.
- REQUIRES_HUMAN_APPROVAL: başkası adına aksiyon isteme, gizli görünürlük talebi için insan onayı gerekir.
- BLOCKED_RUNTIME_ACTION: route / vehicle / driver assignment, ödeme / sözleşme / offer işlemi, başka kişinin canlı takibini görme, provider credential, SMS/email/push gönderme, admin action.
- NEVER_AUTOMATE: başkası adına erişim, başkası adına yazma.
- SCREENS: `/personel/live`, `/personel/my`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

### PARENT
- READ: my ride / live tracking, servis durumu, buluşma / toplanma konumu, safe-drive readonly sinyali, gecikme / rota ilerleme açıklaması, fallback / error açıklaması.
- EXPLAIN: ne zaman beklenmesi gerektiğini, hangi durumlarda destek ile iletişime geçileceğini, konum / servis bilgisi eksikse kontrol adımını açıklar.
- RECOMMEND: ne zaman beklenmesi gerektiğini, hangi durumda destek çağrılacağını, eksik konum veya servis bilgisi için ilk kontrolü önerir.
- PREPARE: destek mesajı taslağı, servis durum özeti.
- REQUIRES_HUMAN_APPROVAL: başkası adına aksiyon isteme, gizli görünürlük talebi için insan onayı gerekir.
- BLOCKED_RUNTIME_ACTION: route / vehicle / driver assignment, ödeme / sözleşme / offer işlemi, başka kişinin canlı takibini görme, provider credential, SMS/email/push gönderme, admin action.
- NEVER_AUTOMATE: başkası adına erişim, başkası adına yazma.
- SCREENS: `/parent/live`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

### SCHOOL / ORGANIZATION
- READ: organization / school servis planları, route plan readiness, personel / öğrenci taşıma kalite sinyalleri, live tracking özetleri, eksik veri / güvenlik kontrol sinyali.
- EXPLAIN: plan kontrol adımını, eksik veri tamamlama ihtiyacını, risk / kalite inceleme sırasını açıklar.
- RECOMMEND: önce hangi planın kontrol edileceğini, hangi eksik verinin tamamlanacağını, hangi risk / kalite satırının inceleneceğini önerir.
- PREPARE: plan kontrol notu, eksik veri listesi, risk özet checklisti.
- REQUIRES_HUMAN_APPROVAL: başka kurum verisi görme, public / shared dışı karar için insan onayı gerekir.
- BLOCKED_RUNTIME_ACTION: provider credential yönetme, route apply / assignment execute, payment / contract execute, SMS/email/push gönderme, AI runtime action.
- NEVER_AUTOMATE: başka kurum verisi açma, gizli öğrenci / personel verisini otomatik görünür kılma.
- SCREENS: `/school`, `/school/shifts`, `/school/agreements`, `/school/operations`, `/school/map`, `/school/service-evaluation`, `/organization`, `/organization/shifts`, `/organization/agreements`, `/organization/operations`, `/organization/map`, `/organization/service-evaluation`, `/shared/logs`, `/shared/notifications`, `/shared/feedback`, `/shared/kvkk`.

## Existing Copilot / screen catalog bridge
- Mevcut bağ katmanı `backend/src/ai/chat/helpComposer.js`, `backend/src/ai/chat/intentRouter.js`, `backend/src/ai/chat/answerQualityPolicy.js`, `backend/src/ai/chat/goldenQuestionPack.js`, `backend/src/ai/jobGuide/screenCatalog.js` ve `web/src/copilot/screenRegistry.js` üzerinde yaşar.
- Bu milestone bu katmanı genişletmek yerine rol/task sınırını statik olarak kilitler.
- Yeni statik source of truth `backend/src/ai/chat/copilotRoleTaskMatrix.js` yalnızca bu rol/task sözlüğünü taşır; runtime dispatcher değildir.

## Public promise / güven stratejisi
- Vaat edilen kabiliyet testle kanıtlanmış olmalıdır.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha fazla analiz yapabilir ama kullanıcıya yalnızca kanıtlanmış kabiliyet vaat edilir.
- Abartılı tam otomasyon iddiaları public copy'de kullanılmaz.
- "Karar kullanıcıdadır" ve "insan onayı gerekir" dili korunur.

## Kapsam dışı
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Payment / billing / hakediş execute açılmaz.
- Contract / agreement execute açılmaz.
- Offer auto-accept açılmaz.
- Supplier auto-selection açılmaz.
- Route apply açılmaz.
- Driver / vehicle assignment execute açılmaz.
- Provider credential management açılmaz.
- User / account / admin write-action açılmaz.
- GPS / device / provider runtime action açılmaz.
- Backend route / service / schema değişikliği ve Prisma / schema / migration bu milestone’un konusu değildir.

## Not
- Bu milestone docs/check odaklıdır; sonraki AI action veya audit log milestone’larını açmaz.
