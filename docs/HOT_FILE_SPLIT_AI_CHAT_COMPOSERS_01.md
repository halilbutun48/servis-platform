# HOT FILE SPLIT AI CHAT COMPOSERS 01

Tarih: 2026-07-16
Repo: `servis-platform`

## 1) Kısa Özet

- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:hotfilesplitaichatcomposers01`
- Bu milestone, `backend/src/ai/chat/helpComposer.js` içindeki güvenli reply-helper yüzeyini `backend/src/ai/chat/helpComposerSafeReplies.js` dosyasına ayırır.
- Ayrım acceptance-safe'tir; behavior değişmez, sadece yardımcıların sahibi ayrılır.
- Smoke policy, threshold, skip, timeout/wait ve PASS kriteri gevşetilmez.
- Route/service/prisma değişikliği yoktur.

## 2) Kapsam

- `backend/src/ai/chat/helpComposer.js` yalnız koordinasyon ve çağrı yüzeyini taşır.
- `backend/src/ai/chat/helpComposerSafeReplies.js` normalize / polish / route-plan / visible reply shaping yardımcılarını taşır.
- `backend/src/ai/chat/conversationWorkflowReasoningEngine.js` ile gelen workflow reply yüzeyi aynı görünen Türkçe davranışı korur.

## 3) Yapmaz

- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Smoke policy değiştirmez.
- Smoke threshold, skip veya PASS kriteri gevşetmez.
- Browser-smoke artifact stage etmez.
- Route/service/prisma değişikliği yapmaz.

## 4) Kanonik Eşleşme

- Check script: `backend/scripts/hot_file_split_ai_chat_composers_01_check.js`
- Coordinating file: `backend/src/ai/chat/helpComposer.js`
- Split helper file: `backend/src/ai/chat/helpComposerSafeReplies.js`
- Shared fragment helper: `backend/src/ai/chat/conversationTaskStateShared.js`

## 5) Handoff

- Bu milestone, workflow reasoning engine ve reasoning answer composer arasında güvenli hot-file borcu azaltma adımıdır.
- Sonraki kontrol noktası, product-extensions ve verify zincirlerinde bu split’in görünür kalmasıdır.
