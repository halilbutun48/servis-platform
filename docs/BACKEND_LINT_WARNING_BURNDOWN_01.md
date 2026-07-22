# BACKEND-LINT-WARNING-BURNDOWN-01

## 1) Purpose
Backend lint warning'lerini davranış değiştirmeden, check ve smoke eşiklerini gevşetmeden, lint config'i yumuşatmadan ve commit dışı repo hijyenini bozmadan azaltmak.

## 2) Problem statement
Başlangıç durumu: `npm --prefix backend run lint` sonucu `0 error / 60 warning`.

Bu milestone feature geliştirme milestone'u değildir. Amaç, backend lint warning yükünü güvenli şekilde sıfıra indirmektir.

## 3) Starting state
- Backend lint baseline: `0 error / 60 warning`
- Stage boş kalacak.
- `debug.log` bırakılmayacak.
- Runtime-data commit dışı kalacak.
- Browser-smoke ve generated report artefact'leri commit dışı kalacak.

## 4) Cleanup policy
- Gerçekten kullanılmayan import kaldırılabilir.
- Gerçekten kullanılmayan helper kaldırılabilir.
- Gerçekten kullanılmayan local variable kaldırılabilir.
- Kullanılmayan callback argümanı gerekiyorsa `_arg` olarak adlandırılabilir.
- Davranış riski varsa dokunulmaz ve raporlanır.
- No new dependency.
- No big refactor.
- no eslint-disable.
- no config relax.

## 5) Allowed cleanup methods
- Unused import silme.
- Unused helper silme.
- Unused local variable silme.
- Unused destructured field silme.
- Arity korumak gerekiyorsa `_arg` kullanma.
- Public contract olmayan unused export kaldırma.

## 6) Forbidden cleanup methods
- Feature davranışı değiştirme.
- API davranışı değiştirme.
- Sefer Abi cevap davranışı değiştirme.
- User-facing Türkçe metni değiştirme.
- Semantic output formatını değiştirme.
- Check output contract'ını gevşetme.
- Smoke PASS threshold'larını gevşetme.
- 429 ignore list açma.
- Global allowlist genişletme.
- ESLint kuralı kapatma.
- Lint config gevşetme.
- `eslint-disable` ekleme.
- Sahte kullanım ekleme.
- Büyük refactor yapma.

## 7) Files touched
- `backend/scripts/ai_response_semantic_quality_gate_01_check.js`
- `backend/scripts/cache_coalescing_and_backoff_01_check.js`
- `backend/scripts/copilot_next_best_action_engine_01_check.js`
- `backend/scripts/copilot_plan_review_engine_01_check.js`
- `backend/scripts/copilot_risk_scoring_engine_01_check.js`
- `backend/scripts/copilot_root_cause_engine_01_check.js`
- `backend/scripts/load_test_2000_users_01_check.js`
- `backend/scripts/production_rate_limit_policy_01_check.js`
- `backend/scripts/request_storm_resilience_01_check.js`
- `backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js`
- `backend/scripts/sefer_abi_turkish_user_facing_terminology_01_check.js`
- `backend/src/ai/chat/conversationNextBestActionEngine.js`
- `backend/src/ai/chat/conversationOperationHealthEngine.js`
- `backend/src/ai/chat/conversationPlanReviewEngine.js`
- `backend/src/ai/chat/conversationRootCauseEngine.js`
- `backend/src/ai/chat/conversationSmartDiagnostics.js`
- `backend/src/ai/chat/conversationTaskStateDynamicQuestions.js`
- `backend/src/ai/chat/conversationTaskStateRoomReplies.js`
- `backend/src/ai/chat/helpComposer.js`
- `backend/src/ai/chat/helpComposerSafeReplies.js`
- `backend/scripts/backend_lint_warning_burndown_01_check.js`
- `docs/BACKEND_LINT_WARNING_BURNDOWN_01.md`

## 8) Warning categories
- Check script unused helpers and imports.
- AI chat engine unused helpers and imports.
- `helpComposer.js` hot-file unused locals.
- `helpComposerSafeReplies.js` unused helper functions.
- Repo hygiene and lint policy checks.

## 9) Behavior safety policy
- Reply akışı değişmez.
- Route/service/prisma davranışı değişmez.
- API contract değişmez.
- Human approval sınırları korunur.
- KVKK/PII safe logging korunur.

## 10) AI/Sefer Abi safety policy
- `helpComposer.js` semantic output contract'u korunur.
- `helpComposerSafeReplies.js` response şekli korunur.
- Sefer Abi Türkçe metinler değişmez.
- AI runtime/model/API execution açılmaz.

## 11) Check script output contract safety
Guard script şu isimleri korur:
- `PASS BACKEND-LINT-WARNING-BURNDOWN-01`
- `guardCases`
- `passCount`
- `failCount`
- `warningBurndownSummary`
- `lintPolicySummary`
- `behaviorSafetySummary`
- `aiSafetySummary`
- `thresholdSafetySummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`

## 12) Smoke threshold safety
- `product-flow` hedefi `18/0/0/0`.
- `premium` hedefi `82/0/0/0`.
- `all-panels` hedefi `82/0/0/0`.
- `mobile all-roles` hedefi `82/0/0/0`.
- `consoleErrorCount=0`.
- `pageErrorCount=0`.
- `429=none`.

## 13) Lint config safety
- `package.json` lint chain'i `npm run lint:backend && npm run lint:web` olarak kalır.
- `lint:backend` backend lint runner olarak `backend/scripts/run_backend_lint.js` kullanır.
- `lint:web` web lint evidence runner olarak `backend/scripts/run_web_lint_with_evidence.js` kullanır.
- `backend/scripts/run_backend_lint.js` gevşetilmez.
- `max-warnings`, `quiet`, allowlist relax ve benzeri kaçışlar eklenmez.
- no quiet.
- no max-warnings.
- no lint config relax.
- no eslint-disable.

## 14) ESLint disable policy
- Kod tarafında yeni `eslint-disable` eklenmez.
- Gerekirse önce raporlanır, sonra mümkünse hiç kullanılmaz.

## 15) Remaining warnings, if any
- None.

## 16) Validation results
- Starting backend lint warning count: `60`
- Ending backend lint warning count: `0`
- Ending backend lint error count: `0`
- Final backend lint state: `0 error / 0 warning`
- `npm --prefix backend run lint`: PASS
- `npm run check:backendlintwarningburndown01`: PASS

## 17) Remaining risks
- Yeni warning ekleyen bir sonraki değişiklik bu baseline'ı bozabilir.
- Guard script'in kapsamı sadece mevcut policy ve repo hygiene sınırlarını doğrular.
- Suggested commit message: `chore: reduce backend lint warnings`
- Suggested tag: `v2026.07.20-backend-lint-warning-burndown-01`

## 18) Next recommended milestone
`DATA-INTEGRITY-AND-RECOVERY-01`
