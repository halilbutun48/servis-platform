# COPILOT REASONING ANSWER COMPOSER 01

Tarih: 2026-06-15
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotreasoninganswercomposer01`
- Komut: `node backend\scripts\copilot_reasoning_answer_composer_01_check.js`
- Static source of truth: `backend/src/ai/chat/copilotReasoningAnswerComposer.js`

## Scope lock
- Bu milestone artık `core composer + required product acceptance support` scope'u ile kilitlidir.
- Strict A-only acceptance denemesinde product-flow smoke, Company shifts preview/convert affordance eksikse blocker üretti; bu yüzden acceptance scope buna göre tamamlanır.
- Required product acceptance support yalnızca Company shifts görünür yüzeyini kapsar: `web/src/panels/company/ShiftsPanel.jsx`, `web/src/panels/company/CompanyShiftsPanelTrackView.jsx`, `web/src/panels/company/companyShiftsPanelSections.jsx`.
- Bu support write-action, runtime AI action, tool execution, DB write, route apply veya fake success açmaz.
- Golden pack yine sadece kabul / test içindir, reply source değildir.

## Amaç
- `COPILOT-REASONING-ANSWER-COMPOSER-01` Sefer Abi reasoning reply'ının son doğal dil katmanını sabitler.
- Final reply, robotik `Şimdi:` / `Kısaca:` lead marker'larından, tekrar eden cümlelerden ve tek tip copilot şablonlarından arındırılır.
- Progress command, previous task state, last assistant answer type ve safe alternative bağlamı korunur.
- Role tonu korunur: DRIVER kısa/saha, COMPANY plan/sözleşme, ROOM operasyon, SUPER_ADMIN audit/kalite, PERSONEL/PARENT KVKK, SCHOOL/ORGANIZATION yetki kapsamı.

## Input sinyalleri
- `rawReply`
- `roleProfile`
- `effectiveRole`
- `questionType`
- `userProgressCommand`
- `previousTaskState`
- `lastAssistantAnswerType`
- `safetyBoundary`

## Guard boundary
- Golden pack test/kabul içindir, reply source değildir.
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Backend route / service / schema açmaz.
- Prisma / schema / migration açmaz.

## Kanonik yüzeyler
- Static helper: `backend/src/ai/chat/copilotReasoningAnswerComposer.js`
- Helper consumer: `backend/src/ai/chat/helpComposer.js`
- Reasoning helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`

## Sonraki güvenli hatlar
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`
- `COPILOT-GUIDED-TASK-ENGINE-01`
