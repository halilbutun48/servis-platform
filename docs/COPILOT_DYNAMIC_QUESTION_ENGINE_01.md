# COPILOT DYNAMIC QUESTION ENGINE 01

Tarih: 2026-07-05
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotdynamicquestionengine01`
- Komut: `node backend\scripts\copilot_dynamic_question_engine_01_check.js`
- Static source of truth: `backend/src/ai/chat/conversationTaskStateResponses.js`
- Implementation helper: `backend/src/ai/chat/conversationTaskStateDynamicQuestions.js`

## Amaç
- `COPILOT-DYNAMIC-QUESTION-ENGINE-01` role + screen + selected record + current reply üzerinden dynamic question assembly katmanını tek yerde toplar.
- `helpComposer.js`, `seferAbiReasoningAssistant.js` ve `copilotGuidedTaskEngine.js` aynı dinamik chip ve continuation paylaşımını kullanır.
- Role-aware dynamic clarification, screen-purpose koruması, selected-record continuation ve safe alternative korunur.
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Plan Center persistence davranışını değiştirmez.

## Kanonik akış
- `backend/src/ai/chat/conversationTaskStateResponses.js` dynamic response assembly için canonical home'dur.
- `backend/src/ai/chat/helpComposer.js` direct user-facing help akışında bu helper'ı kullanır.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` role-aware reasoning akışında bu helper'ı kullanır.
- `backend/src/ai/chat/copilotGuidedTaskEngine.js` guided follow-up akışında task-state uyumunu korur.
- `backend/src/ai/chat/conversationTaskStateDynamicQuestions.js` low-level dynamic question builder'dır.

## Sonraki güvenli hatlar
- `COPILOT-CLARIFYING-QUESTION-ENGINE-01`
- `COPILOT-REASONING-ANSWER-COMPOSER-01`
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- `UX-COPILOT-SMART-CHIPS-01`
- `UX-COPILOT-PERSONA-01`
- `UX-COPILOT-TERMINAL-01`
