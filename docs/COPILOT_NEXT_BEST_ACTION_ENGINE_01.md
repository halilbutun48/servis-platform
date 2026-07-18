# COPILOT NEXT BEST ACTION ENGINE 01

Tarih: 2026-07-17
Repo: `servis-platform`

## 1) Kısa Özet

- Bu doküman docs/check milestone kaydıdır; runtime feature, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotnextbestactionengine01`
- Bu milestone, kullanıcıya görünen "sıradaki en doğru güvenli adım" ve "önce yapılacak güvenli kontrol" çizgisini tek yerde toplar.
- Sefer Abi yalnız okur, sinyal toplar ve en güvenli sonraki kontrolü önerir; write-action, tool execution, DB write, route apply ve fake success açmaz.

## 2) Kapsam

- `backend/src/ai/chat/conversationNextBestActionEngine.js` next-best-action reply, chip ve surface mapping helper'ını taşır.
- `backend/src/ai/chat/conversationTaskStateResponses.js` task-state response yüzeyine next-best-action bridge'i bağlar.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` role-aware reasoning akışında next-best-action fallback'ini korur.
- `backend/scripts/copilot_route_review_human_approval_01_check.js` yeni helper dosyalarını meşru route-review scope olarak kabul eder.

## 3) Supported Surfaces

- Company / Planlama Merkezi
- Organization / Planlama
- School / Planlama
- Room / Operasyon Sağlığı
- Driver / Route
- Personel / Live
- Parent / Live
- Super Admin / Operations
- Generic fallback

## 4) Health Signals

- summary
- reasoningLead
- nextBestAction
- safestNextStep
- selectedSummaryText
- selectedRecordStatus
- blockers
- missingData
- evidence
- healthSignals
- chips
- reply

## 5) No Write-Action Boundary

- `yaptım`
- `oluşturdum`
- `başlattım`
- `gönderdim`
- `kabul ettim`
- `uyguladım`
- `atadım`
- `sildim`
- `güncelledim`
- `kaydettim`
- `açtım`
- `kapattım`
- `değiştirdim`
- `ekledim`
- `çıkardım`
- `devreye aldım`
- `otomatik yaptım`
- `route apply`
- `dispatch apply`
- `db write`
- `tool execution`

## 6) Terminology Boundary

- `sıradaki en doğru güvenli adım`
- `önce yapılacak güvenli kontrol`
- `insan onayı gerekir`
- `seçili kayıt`
- `eksik sinyal`
- `güvenli kontrol`
- `Planlama Merkezi`
- `Vardiyalar`
- `Konum sinyali`
- `Son konum bilgisi`
- `Riskli cihaz`
- `Açık sorun`

## 7) Regression Protection

- Workflow reasoning ayrı kalır.
- Plan review ayrı kalır.
- Risk scoring ayrı kalır.
- Root cause ayrı kalır.
- Smart diagnostic ayrı kalır.
- Dynamic question ayrı kalır.
- Clarifying question ayrı kalır.
- Route review ayrı kalır.
- Intent routing ve helper wiring minimum kalır.

## 8) Validation Results

- `runtimeCases`: pending
- `testedCases`: pending
- `passCount`: pending
- `failCount`: pending
- `no-write-action assertions`: pending
- `terminology assertions`: pending
- `regression separation assertions`: pending
- `health signal assertions`: pending
- `role/screen coverage`: pending

## 9) Bridge Files

- `backend/src/ai/chat/conversationTaskStateResponses.js`
- `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- `backend/scripts/copilot_route_review_human_approval_01_check.js`
- `backend/src/ai/chat/conversationNextBestActionEngine.js`

## 10) Canonical Check

- `check:copilotnextbestactionengine01`
