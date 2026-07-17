# COPILOT PLAN REVIEW ENGINE 01

Tarih: 2026-07-16
Repo: `servis-platform`

## 1) Kısa Özet

- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotplanreviewengine01`
- Bu milestone, kullanıcıya görünen plan kontrolü / önizleme / onay öncesi değerlendirme dilini `Planlama Merkezi` ekseninde sade Türkçe ile sabitler.
- `Sonraki güvenli kontrol` ve `İnsan onayı` dili korunur; `write-action` ve `route review` sınırları açık kalır.
- Runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.

## 2) Kapsam

- `backend/src/ai/chat/conversationPlanReviewEngine.js` plan değerlendirme reply ve chip yüzeyini read-only şekilde taşır.
- `helpComposer.js`, `intentRouter.js` ve task-state responses plan review intentini görünür kullanıcı diliyle bağlar.
- `Planlama Merkezi`, `Vardiyalar`, `Sözleşmeler`, `Canlı Takip`, `Araçlar` ve `Sürücü Rotası` gibi yüzeylerde kontrol öncesi okuma / yönlendirme dili korunur.

## 3) Yapmaz

- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success üretmez.
- Smoke policy, threshold, skip, timeout/wait veya PASS kriteri gevşetmez.
- Browser-smoke artifact stage etmez.
- Route/service/prisma değişikliği yapmaz.

## 4) Kanonik Eşleşme

- Check script: `backend/scripts/copilot_plan_review_engine_01_check.js`
- Coordinating helper: `backend/src/ai/chat/conversationPlanReviewEngine.js`
- Milestone doc: `docs/COPILOT_PLAN_REVIEW_ENGINE_01.md`
- Guard çizgisi: `route review`
- Action sınırı: `write-action`

## 5) Handoff

- Bu milestone, workflow reasoning engine ile hot-file split arasında plan kontrolü için güvenli okuma katmanı ekler.
- Sonraki güvenli kontrol, product-extensions ve verify zincirlerinde plan review görünürlüğünün korunmasıdır.
