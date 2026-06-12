# COPILOT DEMAND TO AGREEMENT ROADMAP 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotdemandagreement01`
- Komut: `node backend\scripts\copilot_demand_to_agreement_roadmap_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotDemandToAgreementRoadmap.js` ile taşınır; helper runtime executor değildir.

## Amaç
- `COPILOT-ROLE-TASK-MATRIX-01` ve `COPILOT-AI-ACTION-ROADMAP-01` sonrasında Sefer Abi için talep -> teklif -> sözleşme -> operasyon hazırlığı yol haritasını kilitler.
- Bu milestone runtime AI action açmaz.
- Public promise overclaim yazmaz.
- Backend route/service/schema ve Prisma açmaz.
- Kritik onay modeli ayrı docs/check katmanı `COPILOT-HUMAN-APPROVAL-01` ile kilitlenir.

## Demand-to-agreement lifecycle

### STAGE 1 - Demand Intake
- Kullanıcı talebini anlar.
- Servis tipi, tarih/saat, kişi sayısı, konum, vardiya yönü, kapasite ihtiyacı, özel not ve KVKK / izin sinyalini çıkarır.
- Eksik bilgileri listeler.
- Runtime talep oluşturma yok.

### STAGE 2 - Data Readiness
- Adres / durak / kişi / kapasite / zaman penceresi / şirket konumu eksiklerini kontrol eder.
- Excel/CSV hazırlığı için ileride checklist oluşturur.
- Runtime import veya kayıt yok.

### STAGE 3 - Stop / Route Draft Readiness
- Stop / route taslak hazırlığına yönlendirir.
- OSRM / rota sinyali ileride kullanılabilir ama bu milestone’da route apply yok.
- Taslak / önizleme / kontrol edilmeli dili kullanır.

### STAGE 4 - RFQ / Offer Prep
- Talebi teklif istemeye hazır hale getirir.
- Room / supplier adaylarını kalite, verified supplier, telematics readiness ve capacity fit sinyalleriyle açıklar.
- Supplier auto-selection yok.
- RFQ gönderimi yok.
- Kullanıcı onaylarsa hazırlık notu bir sonraki insan onaylı adıma taşınır; kritik adımın kendisi yine yapılmaz.

### STAGE 5 - Offer Comparison
- Offer Ranking Quality sinyallerini kullanarak teklifleri açıklar.
- Fiyat + kalite + risk + eksik veri + safe-drive + telematics readiness birlikte yorumlanır.
- Kazanan teklif otomatik seçilmez.

### STAGE 6 - Negotiation / Clarification Prep
- Eksik bilgi, fiyat farkı, kalite riski, kapasite uyumsuzluğu veya kanıt eksikliği için görüşme notu hazırlar.
- SMS/email/push gönderimi yok.

### STAGE 7 - Agreement Prep
- Sözleşmeye dönüştürmeden önce checklist hazırlar.
- Rota, vardiya, kişi, fiyat, kalite, kanıt, telematics, KVKK ve hizmet kapsamı kontrol edilir.
- Agreement/contract execute yok.

### STAGE 8 - Dispatch / Operation Prep
- Operasyon başlamadan önce dispatch readiness, driver/vehicle readiness, GPS/safe-drive readiness ve evidence checklist hazırlar.
- Dispatch apply, route apply ve driver/vehicle assignment yok.

## Copilot görev sınırı
- READ: mevcut sinyalleri okur.
- EXPLAIN: talep / teklif / sözleşme / operasyon durumunu açıklar.
- RECOMMEND: sıradaki kontrol adımını önerir.
- PREPARE: checklist, özet, karşılaştırma notu ve karar öncesi taslak hazırlar.
- HUMAN_APPROVAL_REQUIRED: kritik adımlar için insan onayı gerektiğini söyler.

## Role bazlı kullanım

### SUPER_ADMIN
- Platform talep -> teklif -> sözleşme funnel sağlığını ve riskleri görür.
- Onboarding, verified supplier, marketplace readiness ve offer quality sinyallerini ilişkilendirir.
- Execute yok.

### COMPANY
- Talep oluşturma hazırlığı, teklif karşılaştırma, sözleşme öncesi checklist ve operasyon hazırlık önerilerini görür.
- Teklif kabul / sözleşme execute yok.

### ROOM
- Teklif hazırlığı, araç / sürücü / telematics / safe-drive readiness ve dispatch checklist görür.
- Dispatch apply, route apply ve assignment execute yok.

### DRIVER
- Demand-to-agreement roadmap gösterilmez.
- Sadece görev / rota / check-in / safe-drive açıklaması görür.

### PERSONEL / PARENT
- Demand-to-agreement roadmap gösterilmez.
- Sadece ride / live tracking / support message açıklamaları görür.

### SCHOOL / ORGANIZATION
- Plan readiness ve eksik veri checklist görebilir.
- Cross-organization data yok.
- Route apply / contract / payment yok.

## Uyum / sinyal katmanları
- Offer Ranking Quality ile uyumludur; fiyat, kalite, risk ve telematics readiness birlikte okunur ama winner otomasyonu yapılmaz.
- Safe Drive ile uyumludur; route apply olmadan readiness ve risk sinyali hazırlanır.
- Telematics Provider Hub ile uyumludur; provider readiness, live / stale / offline ve secret boundary korunur.
- Verified Supplier / Marketplace readiness ile uyumludur; supplier readiness ve human approval çizgisi korunur.

## Güven / public promise stratejisi
- Kullanıcıya "AI her şeyi yapar" denmez.
- Public promise sadece testle kanıtlanmış kabiliyeti söyler.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.

## Static helper
- `backend/src/ai/chat/copilotDemandToAgreementRoadmap.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action yok.
- Tool execution yok.
- Demand create execute yok.
- Excel/CSV import execute yok.
- Route apply yok.
- RFQ send yok.
- Offer accept/reject yok.
- Supplier auto-selection yok.
- Agreement/contract execute yok.
- Dispatch apply yok.
- Driver/vehicle assignment yok.
- Stop reached/skipped/complete yok.
- Payment/hakediş execute yok.
- SMS/email/push yok.
- Provider credential management yok.
- User/account/admin write-action yok.
- Backend route/service/schema yok.
- Prisma/schema/migration yok.

## Not
- Bu roadmap docs/check odaklıdır; Sefer Abi’nin future-only talep -> teklif -> sözleşme hazırlık hattını kilitler.
- Kritik write adımları ayrı milestone, guard ve audit log olmadan açılmaz.
