# ADDRESS GEOCODING CONFIDENCE 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime geocode execute, map API, OSRM route apply, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:addressgeocodingconfidence01`
- Komut: `node backend\scripts\address_geocoding_confidence_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/addressGeocodingConfidencePolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- Servis adresi kalite sözlüğünü, geocoding readiness modelini, confidence score bands'ini, risk sınıflarını ve human review gate'ini docs/check olarak kilitler.
- Bu milestone runtime geocode açmaz.
- Geocode provider call, map API call, OSRM call veya lat/lng persistence açmaz.
- DB write, stop create, route draft/apply, Excel/CSV import execute, demand create, shift/personel create, RFQ send, offer accept/reject, agreement/contract execute, dispatch apply, payment/hakediş execute, SMS/email/push, provider credential management veya user/account/admin write-action açmaz.
- Public promise overclaim yazmaz.

## STAGE 1 — Address Intake Readiness
- Ham adres metni, tenant / role bağlamı ve KVKK / izin sinyali alınır.
- Kullanıcının yazdığı adres olduğu gibi saklanmaz; sadece okunur ve açıklanır.
- Geocode execute yok.

## STAGE 2 — Address Normalization Signals
- Şehir, ilçe, mahalle, sokak, cadde, bina no, blok, kat, daire ve landmark sinyalleri ayrıştırılır.
- Address quality dictionary bu sinyalleri standartlaştırır.
- Yazım hatası ve Türkçe karakter riski görünür tutulur.

## STAGE 3 — Confidence Bands
- `HIGH_CONFIDENCE`
- `MEDIUM_CONFIDENCE`
- `LOW_CONFIDENCE`
- `BLOCKED_FOR_GEOCODING`
- Confidence score yalnız önizleme / açıklama içindir.

## STAGE 4 — Risk Categories
- `MISSING_CITY`
- `MISSING_DISTRICT`
- `MISSING_STREET_OR_NEIGHBORHOOD`
- `AMBIGUOUS_LANDMARK`
- `DUPLICATE_ADDRESS`
- `POSSIBLE_MULTI_MATCH`
- `PERSONAL_DATA_EXPOSURE`
- `CROSS_ORGANIZATION_RISK`
- `KVKK_CONSENT_UNKNOWN`
- `TOO_SHORT_ADDRESS`
- `TOO_LONG_FREE_TEXT`
- `TURKISH_CHARACTER_OR_TYPING_RISK`
- `MANUAL_REVIEW_REQUIRED`

## STAGE 5 — Human Review Gate
- `HUMAN_REVIEW_REQUIRED` durumunda insan incelemesi gerekir.
- `KVKK_REVIEW_REQUIRED` durumunda veri güvenliği incelemesi gerekir.
- `CROSS_ORGANIZATION_REVIEW_REQUIRED` durumunda organizasyon sınırı kontrol edilir.
- `AMBIGUOUS_ADDRESS_REVIEW_REQUIRED` durumunda adres netleştirilir.
- `BLOCKED_FOR_GEOCODING` durumunda runtime geocode başlatılmaz.

## STAGE 6 — Handoff to Next Milestones
Bu milestone güvenli şekilde şu next milestone'lara veri hazırlar:

- `COPILOT-EXCEL-DEMAND-IMPORT-01`
- `COPILOT-STOP-ROUTE-DRAFT-01`
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `COPILOT-DEMAND-INTAKE-01`

## Address quality dictionary
- city
- district
- neighborhood
- street / avenue
- building number
- block / floor / apartment
- landmark
- postal code
- organization / tenant label
- duplicate candidate
- typo risk
- Turkish character / typing risk
- KVKK / privacy exposure

## Geocoding readiness model
- Intake
- Normalization
- Scoring
- Human review
- Next handoff

## Confidence bands
- `HIGH_CONFIDENCE`
- `MEDIUM_CONFIDENCE`
- `LOW_CONFIDENCE`
- `BLOCKED_FOR_GEOCODING`

## Risk classes
- Missing city
- Missing district
- Missing street or neighborhood
- Ambiguous landmark
- Duplicate address
- Possible multi match
- Personal data exposure
- Cross-organization risk
- KVKK consent unknown
- Too short address
- Too long free text
- Turkish character or typing risk
- Manual review required

## Human review-required address states
- `HUMAN_REVIEW_REQUIRED`
- `KVKK_REVIEW_REQUIRED`
- `CROSS_ORGANIZATION_REVIEW_REQUIRED`
- `AMBIGUOUS_ADDRESS_REVIEW_REQUIRED`
- `BLOCKED_FOR_GEOCODING`

## Task categories
- `ADDRESS_READINESS_EXPLAIN`
- `CONFIDENCE_CLASSIFY`
- `RISK_FLAG_SUMMARY`
- `MISSING_ADDRESS_FIELD_REPORT`
- `DUPLICATE_ADDRESS_HINT`
- `MANUAL_REVIEW_LIST`
- `GEOCODE_PREP_CHECKLIST`
- `NEXT_STEP_RECOMMENDATION`
- `HUMAN_APPROVAL_REQUIRED`

## Role boundaries
### SUPER_ADMIN
- Platform-wide address quality dictionary ve cross-tenant risk görünür.
- Review queue ve privacy escalation görünür.
- Runtime geocode yok.

### COMPANY
- Personel servis adres readiness ve confidence summary görünür.
- Geocode commit yok.
- Route apply yok.

### ROOM
- Stop / route draft readiness ve human review list görünür.
- Dispatch apply yok.
- Route apply yok.

### DRIVER
- Bu roadmap driver-facing runtime aksiyon açmaz.
- Sadece güvenli açıklama ve destek dili kalır.

### PERSONEL / PARENT
- Bu roadmap personel / parent yüzeyinde gösterilmez.
- Gizli veri veya başka kişinin adresi görünmez.

### SCHOOL / ORGANIZATION
- School / organization plan readiness ve privacy boundary görünür.
- Cross-organization write yok.
- Route apply yok.

## KVKK / data safety boundary
- Adres verisi kişisel veri veya operasyonel hassas veri olabilir.
- KVKK / data safety boundary korunur.
- Field-level privacy minimization yapılır.
- Cross-organization / cross-tenant karışma riski blok sayılır.
- Public dokümanda kesin geocode sonucu veya otomatik route vaadi yoktur.

## Handoff to next milestones
- Excel demand import handoff alignment: `COPILOT-EXCEL-DEMAND-IMPORT-01`
- Stop / route draft handoff alignment: `COPILOT-STOP-ROUTE-DRAFT-01`
- OSRM route draft handoff alignment: `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- Human approval handoff alignment: `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- Demand intake handoff alignment: `COPILOT-DEMAND-INTAKE-01`

## Static helper
- `backend/src/ai/chat/addressGeocodingConfidencePolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime geocode açılmaz.
- Geocode provider call açılmaz.
- Map API call açılmaz.
- OSRM call açılmaz.
- DB write açılmaz.
- lat/lng persistence açılmaz.
- Route apply açılmaz.
- Stop create açılmaz.
- Excel/CSV import execute açılmaz.
- Demand create execute açılmaz.
- Shift/personel create execute açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Agreement/contract execute açılmaz.
- Dispatch apply açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.

## Public promise / güven stratejisi
- AI her şeyi yapar public promise yok.
- Tek tıkla geocoding, route draft ve karar üretir gibi bir overclaim yok.
- Sefer Abi adresi yorumlar; kesin geocode sonucu vaat etmez.
- Testle kanıtlanmamış runtime geocoding public dokümanda vaat edilmez.
- Underpromise, overdeliver stratejisi korunur.
- Kritik işlemler ayrı milestone, guard, audit log ve rollback modeli olmadan açılmaz.
