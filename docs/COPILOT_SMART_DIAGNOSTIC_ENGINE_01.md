# COPILOT SMART DIAGNOSTIC ENGINE 01

Tarih: 2026-07-05
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotsmartdiagnosticengine01`
- Komut: `node backend\scripts\copilot_smart_diagnostic_engine_01_check.js`
- Static source of truth: `backend/src/ai/chat/conversationSmartDiagnostics.js`
- Implementation helper: `backend/src/ai/chat/conversationTaskStateDynamicQuestions.js`

## Amaç
- `COPILOT-SMART-DIAGNOSTIC-ENGINE-01` symptom/problem mesajlarında dynamic question ile clarifying question arasında güvenli diagnostic katmanını toplar.
- `Görünmüyor / çıkmadı / çalışmadı / başlamadı / gelmedi / yok` gibi sinyallerde bağlamlı kök neden ipucu ve güvenli sonraki kontrol verir.
- Clarifying soru davranışını bozmaz; ambiguity varsa netleştirme sorusuna düşer.
- `Netleştirelim`, `Devam edelim` ve `Alternatif` dili helpComposer, Sefer Abi reasoning assistant ve guided task engine arasında paylaşılır.

## Okunan sinyaller
- Mesajdaki symptom / problem ifadeleri
- Ekran yolu ve ekran etiketi
- Seçili kayıt ve seçili özet
- Conversation state ve current reply
- Role / surface group / selected anchor
- Clarifying sinyal, devam sinyali ve ambiguity durumu

## Kanonik akış
- `backend/src/ai/chat/conversationSmartDiagnostics.js` symptom theme ve reply builder'dır.
- `backend/src/ai/chat/conversationTaskStateDynamicQuestions.js` dynamic question yüzeyinde diagnostic reply'ı önceliklendirir.
- `backend/src/ai/chat/helpComposer.js` direct user-facing help akışında bu katmanı kullanır.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` role-aware reasoning akışında bu katmanı kullanır.
- `backend/src/ai/chat/conversationTaskStateResponses.js` clarifying ve dynamic response facade'ını korur.

## Guard boundary
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Belirsiz ya da çıplak `Görünmüyor.` gibi mesajlarda diagnostic reply üretmek yerine netleştirme davranışını korur.

## Sonraki güvenli hatlar
- `COPILOT-ROOT-CAUSE-ENGINE-01`
- `COPILOT-CLARIFYING-QUESTION-ENGINE-01`
- `COPILOT-REASONING-ANSWER-COMPOSER-01`
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- `UX-COPILOT-SMART-CHIPS-01`
- `UX-COPILOT-PERSONA-01`
- `UX-COPILOT-TERMINAL-01`
