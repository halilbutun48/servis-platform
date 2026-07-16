# COPILOT WORKFLOW REASONING ENGINE 01

Tarih: 2026-07-15
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotworkflowreasoningengine01`
- Komut: `node backend\scripts\copilot_workflow_reasoning_engine_01_check.js`
- Static source of truth: `backend/src/ai/chat/conversationWorkflowReasoningEngine.js`
- Implementation helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Barrel re-export: `backend/src/ai/chat/conversationTaskStateResponses.js`

## Amaç
- `COPILOT-WORKFLOW-REASONING-ENGINE-01` company plan, offers / agreements, shifts, room map / vehicles, driver route, personel live, parent live ve superadmin yüzeylerinde workflow reasoning katmanını tek yerde toplar.
- Çıkış dili Türkçe kullanıcı dilidir; `İşlem akışı`, `Sonraki güvenli kontrol` ve `Onay noktası` cümlelerini korur.
- Surface-aware chip seti, selected record özeti ve güvenli sonraki ekran yönlendirmesi korunur.
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Route / service / prisma değişikliği açmaz.

## Kanonik akış
- `backend/src/ai/chat/conversationWorkflowReasoningEngine.js` workflow reasoning için canonical home'dur.
- `backend/src/ai/chat/conversationTaskStateResponses.js` workflow helper'ı barrel üzerinden re-export eder.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` workflow state'i snapshot'a alır ve reasoning reply katmanına bağlar.
- `backend/src/ai/chat/helpComposer.js` kullanıcı yüzünde workflow-safe reply'ı normalize eder.

## Yüzeyler
- `COMPANY_PLAN`
- `COMPANY_AGREEMENTS`
- `ROOM_OFFERS`
- `COMPANY_SHIFTS`
- `ROOM_MAP`
- `ROOM_VEHICLES`
- `DRIVER_ROUTE`
- `PERSONEL_LIVE`
- `PARENT_LIVE`
- `SUPERADMIN`

## Sonraki güvenli hatlar
- `COPILOT-REASONING-ANSWER-COMPOSER-01`
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- `SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01`
- `SEFER-ABI-TURKISH-USER-FACING-LANGUAGE-AUDIT-01`
