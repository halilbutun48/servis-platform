# COPILOT HUMAN APPROVAL 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman kritik işlemlerde insan onayı / confirmation sınırını docs/check olarak kilitler.
- Canonical check: `check:copilothumanapproval01`
- Companion check: `check:copilotnegotiationassist01`
- Komut: `node backend\scripts\copilot_human_approval_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotHumanApprovalPolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- Sefer Abi’nin kritik işlemlerde öneri ile uygulama ayrımını net anlatmasını dokümante eder.
- Riskli kararlar için onay checklisti, özet, etki ve geri alma görünürlüğünü standardize eder.
- Voice / autopilot tarafında yanlış anlama riskini azaltan confirmation modelini kilitler.
- Bu milestone runtime AI action açmaz.
- Tool execution, write-action dispatcher, otomatik talep oluşturma, Excel/CSV import execute, geocode kayıt, route apply, RFQ gönderimi, teklif kabul/red, sözleşme execute, dispatch apply, ödeme/hakediş, SMS/e-posta/push, provider credential, driver/vehicle assignment veya user/account/admin write-action açmaz.

## Human approval categories
- `READ`
- `EXPLAIN`
- `RECOMMEND`
- `PREPARE`
- `DRAFT`
- `RISK_SUMMARY`
- `NEXT_STEP`
- `HUMAN_APPROVAL_REQUIRED`

## Human approval checklist
Her kritik işlem öncesi Sefer Abi şu maddeleri gösterebilir:

1. Action summary
2. Role / actor
3. Scope
4. Data source
5. Confidence
6. Missing data
7. Risk summary
8. Impact preview
9. Reversibility
10. Audit expectation
11. Human confirmation phrase
12. Safe fallback

## Role / actor boundaries

### SUPER_ADMIN
- Platform, marketplace, supplier verification, public lead, onboarding, policy ve cross-tenant risklerde onay / veri sınırını görür.
- Cross-organization data veya global policy değişikliklerinde insan onayı gerekir.
- User/account/admin write-action execute yok.

### COMPANY
- Talep oluşturma, Excel import, teklif karşılaştırma, offer accept, sözleşmeye dönüştürme ve ödeme/hakediş hazırlığında onay sınırını görür.
- Teklif kabul / sözleşme / payment execute yok.

### ROOM
- RFQ yanıtı, araç/sürücü hazırlığı, dispatch, route apply, assignment ve telematics / safe-drive aksiyonlarında onay sınırını görür.
- Dispatch apply, route apply, assignment execute yok.

### DRIVER
- Voice command, route/check-in/skip/reached/complete gibi saha aksiyonlarında açık confirmation gerekir.
- Bu milestone’da driver action execute yok.

### PERSONEL / PARENT
- Ride / live tracking / support message akışında açıklama görebilir.
- Talep, rota, ödeme, sözleşme veya dispatch execute yok.

### SCHOOL / ORGANIZATION
- Plan readiness, kişi/adres veri hazırlığı ve route draft öncesi onay sınırını görür.
- Cross-organization data yok.
- Route apply / contract / payment yok.

## Voice / autopilot boundaries
- Voice command alone must not execute critical actions.
- Second explicit confirmation is required for critical voice actions.
- Wrong-interpretation risk stops the action.
- Proactive Copilot only suggests / warns.
- Safe autopilot does not open real-world action.
- Real autopilot action only after separate milestone + audit + rollback + explicit human approval guard.

## Public promise / güven stratejisi
- AI her şeyi yapar public promise yok.
- Tek tıkla her şeyi halleder gibi bir overclaim yok.
- Sefer Abi karar verici değil, karar destekleyici ve hazırlayıcıdır.
- İnsan onayı olmadan kritik işlem yapılmaz.
- Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.
- Underpromise, overdeliver stratejisi korunur.
- Kritik işlemler ayrı milestone, guard, audit log ve rollback modeli olmadan açılmaz.

## Sonraki güvenli hatlar
- `COPILOT-EXCEL-DEMAND-IMPORT-01`
- `ADDRESS-GEOCODING-CONFIDENCE-01`
- `COPILOT-STOP-ROUTE-DRAFT-01`
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- `COPILOT-ACTION-PREP-01`
- `VOICE-COPILOT-CONFIRMATION-01`
- `COPILOT-SAFE-AUTOPILOT-01`

## Static helper
- `backend/src/ai/chat/copilotHumanApprovalPolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Demand create execute açılmaz.
- Excel/CSV import execute açılmaz.
- Address/geocode persistent write açılmaz.
- Route apply açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Supplier auto-selection açılmaz.
- Agreement/contract execute açılmaz.
- Dispatch apply açılmaz.
- Driver/vehicle assignment açılmaz.
- Stop reached/skipped/complete açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Cross-organization write açılmaz.
- Voice command execute açılmaz.
- Autopilot real action açılmaz.

## Not
- Bu milestone yalnızca docs/check sınırındadır; kritik aksiyonların onay modeli için güvenli temel tanımlar.
