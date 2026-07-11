# COPILOT ROOT CAUSE ENGINE 01

Tarih: 2026-07-06
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotrootcauseengine01`
- Komut: `node backend\scripts\copilot_root_cause_engine_01_check.js`
- Static source of truth: `backend/src/ai/chat/conversationRootCauseEngine.js`
- Implementation helper: `backend/src/ai/chat/conversationRootCauseEngine.js`

## Amaç
- `COPILOT-ROOT-CAUSE-ENGINE-01` root cause sorularında role + screen + selected record + current reply üzerinden güvenli sebep açıklaması ve sonraki kontrol üretir.
- `helpComposer.js`, `seferAbiReasoningAssistant.js` ve `answerQualityPolicy.js` aynı root cause reply/chip önceliğini paylaşır.
- `Görünmüyor / çıkmadı / çalışmadı / başlamadı / gelmedi / yok / asıl sebep` gibi sinyallerde bağlamlı kök neden ipucu verir.
- Clarifying soru davranışını bozmaz; ambiguity varsa güvenli bağlam eksikliği cevabına düşer.
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.

## Okunan sinyaller
- Mesajdaki root-cause / symptom ifadeleri
- Ekran yolu ve ekran etiketi
- Seçili kayıt ve seçili özet
- Conversation state, current reply ve son soru tipi
- Role / surface group / selected anchor
- Planning / operations / shifts / live / feedback bağlamı

## Kanonik akış
- `backend/src/ai/chat/conversationRootCauseEngine.js` root cause theme, reply ve chip üretiminin canonical home'udur.
- `backend/src/ai/chat/helpComposer.js` direct user-facing help akışında bu helper'ı kullanır.
- `backend/src/ai/chat/seferAbiReasoningAssistant.js` role-aware reasoning akışında bu helper'ı kullanır.
- `backend/src/ai/chat/answerQualityPolicy.js` policy seviyesinde root cause guidance ve chip önceliğini korur.
- `backend/src/ai/chat/conversationTaskStateResponses.js` task-state facade üzerinden root cause state export'unu taşır.

## Guard boundary
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Belirsiz ya da çıplak "neden?" mesajlarında diagnostic/root-cause reply yerine güvenli bağlam eksikliği cevabını korur.

## Sonraki güvenli hatlar
- `COPILOT-CLARIFYING-QUESTION-ENGINE-01`
- `COPILOT-REASONING-ANSWER-COMPOSER-01`
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- `UX-COPILOT-SMART-CHIPS-01`
- `UX-COPILOT-PERSONA-01`
- `UX-COPILOT-TERMINAL-01`
