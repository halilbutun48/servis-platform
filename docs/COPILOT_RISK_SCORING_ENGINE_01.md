# COPILOT RISK SCORING ENGINE 01

Tarih: 2026-07-11
Repo: `servis-platform`

## docs/check milestone
- Bu dokuman docs/check milestone kaydidir; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact acmaz.
- Canonical check: `check:copilotriskscoringengine01`
- Komut: `node backend\scripts\copilot_risk_scoring_engine_01_check.js`
- Static source of truth: `backend/src/ai/chat/conversationRiskScoringEngine.js`
- Implementation helper: `backend/src/ai/chat/conversationRiskScoringEngine.js`

## Amaç
- `COPILOT-RISK-SCORING-ENGINE-01` role + screen + selected record + current reply üzerinden risk listesi ve risk skorlama cevabi uretir.
- `riskleri sırala`, `risk var mı`, `riskli mi`, `en riskli ne`, `hangi konu acil` ve benzeri sinyallerde guvenli risk reply/chip akisi verir.
- `helpComposer.js`, `seferAbiReasoningAssistant.js` ve `answerQualityPolicy.js` ayni risk reply/chip onceligini paylasir.
- Runtime AI action acmaz.
- Tool execution acmaz.
- Write-action dispatcher acmaz.
- DB write acmaz.
- Route apply acmaz.
- Fake success acmaz.

## Okunan sinyaller
- Mesajdaki risk / oncelik / aciliyet ifadeleri
- Ekran yolu ve ekran etiketi
- Secili kayit ve secili ozet
- Conversation state, current reply ve son soru tipi
- Role / surface group / selected anchor
- Planning / shifts / operations / live / superadmin baglami

## Kanonik akış
- `backend/src/ai/chat/conversationRiskScoringEngine.js` risk theme, reply ve chip uretiminin canonical home'udur.
- `backend/src/ai/chat/helpComposer.js` direct user-facing help akisinda bu helper'i kullanir.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` role-aware reasoning akisinda risk scoring state'i tasir.
- `backend/src/ai/chat/answerQualityPolicy.js` policy seviyesinde risk reply ve chip onceligini korur.
- `backend/src/ai/chat/conversationTaskStateResponses.js` task-state facade uzerinden risk state export'unu tasir.

## Guard boundary
- Runtime AI action acmaz.
- Tool execution acmaz.
- Write-action dispatcher acmaz.
- DB write acmaz.
- Route apply acmaz.
- Fake success acmaz.
- Belirsiz ya da risk sinyali olmayan mesajlarda risk reply'yi zorlamaz.

## Surface kapsamı
- `COMPANY_PLANNING`
- `COMPANY_SHIFTS`
- `COMPANY_OPERATIONS`
- `OFFERS`
- `ROOM_SHIFTS`
- `ROOM_VEHICLES`
- `DRIVER_ROUTE`
- `PERSONEL_LIVE`
- `PARENT_LIVE`
- `SUPERADMIN`
- `GENERIC`
