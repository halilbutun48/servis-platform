# REPO-CAPABILITY-AUDIT-AND-CANONICAL-ROADMAP-01

Tarih: 2026-07-26
Repo: `servis-platform`

> Bu belge yeni ürün davranışı açmaz. Amaç, mevcut repo durumunu code-first biçimde audit etmek, kanonik milestone sırasını sabitlemek ve kalan işleri güvenli sırada görünür kılmaktır.

## 1) Snapshot

Audit anındaki repo fotoğrafı:

| Alan | Durum |
| --- | --- |
| Branch | `m90d1_web_lint_inventory` |
| HEAD | `15a786adcea77a27825aaed6a6b008176772a282` |
| HEAD tag | `v2026.07.26-copilot-dispatch-action-prep-01` |
| Stage | boş |
| `debug.log` | absent |
| Route / service / Prisma diff | boş |
| Browser smoke artifacts | commit dışı |
| Runtime-data | commit dışı, stage dışı |

Dirty state yalnızca runtime-data katmanındaydı:
- `backend/artifacts/runtime-data/password-change-requirements.json`
- `backend/artifacts/runtime-data/username-directory.json`
- `backend/artifacts/runtime-data/agreement-route-refresh-requests.json`
- `backend/artifacts/runtime-data/public-leads.json`
- `backend/artifacts/runtime-data/quality-review-decisions.json`
- `backend/artifacts/runtime-data/region-failover-drill-state.json`

## 2) Verified Gates

Bu audit sırasında doğrulanan ana kapılar:

- `npm run check:copilotdemandintake01` PASS
- `npm run check:copilotrfqprep01` PASS, `guardCases=309`, `passCount=309`, `failCount=0`
- `npm run check:suppliermatching01` PASS, `guardCases=529`, `passCount=529`, `failCount=0`
- `npm run check:supplieroffercollect01` PASS, `guardCases=577`, `passCount=577`, `failCount=0`
- `npm run check:copilotofferanalysis01` PASS, `guardCases=726`, `passCount=726`, `failCount=0`, `lineCountSummary=backend/src/ai/chat/copilotOfferAnalysis.js stays under 1000 lines`
- `npm run check:copilotnegotiationassist01` PASS, `guardCases=1723`, `passCount=1723`, `failCount=0`, `lineCountSummary=backend/src/ai/chat/copilotNegotiationAssist.js stays under 1000 lines`
- `npm run check:copilotguidedtaskengine01` PASS
- `npm run check:copilotdynamicquestionengine01` PASS, `runtimeCases=40`, `testedCases=40`, `passCount=40`, `failCount=0`
- `npm run check:copilotsmartdiagnosticengine01` PASS, `runtimeCases=55`, `testedCases=55`, `passCount=55`, `failCount=0`
- `npm run check:copilotrootcauseengine01` PASS, `runtimeCases=68`, `testedCases=68`, `passCount=68`, `failCount=0`

Önceki doğrulama hattında temiz olduğu görülen gates:

- `npm run check:copilotdispatchactionprep01` PASS, `guardCases=1211`, `passCount=1211`, `failCount=0`
- `npm run check:copilotshifttoagreementprep01` PASS, `guardCases=1538`, `passCount=1538`, `failCount=0`
- `npm run check:copilotofferrecommendation01` PASS, `guardCases=2076`, `passCount=2076`, `failCount=0`
- `npm run check:product-extensions` PASS
- `npm run verify:repo` PASS
- `npm run verify:final` PASS
- `npm --prefix backend run lint` PASS
- `npm --prefix web run lint` PASS

Smoke sonucu:

- `npm run smoke:productflowbuttonaudit01` PASS `18/0/0/0`
- `npm run smoke:uxlivepanelpremium01` PASS `82/0/0/0`
- `npm run smoke:uxallpanelsrealityaudit01` PASS `82/0/0/0`
- `npm run smoke:uxmobileallrolespanelaudit01` PASS `82/0/0/0`
- `consoleErrorCount=0`
- `pageErrorCount=0`
- `429=none`

## 3) Canonical Capability Map

### A. Runtime-verified reasoning / guidance family

Bu grup hem docs hem check zinciriyle doğrulandı:

- `COPILOT-GUIDED-TASK-ENGINE-01`
- `COPILOT-DYNAMIC-QUESTION-ENGINE-01`
- `COPILOT-SMART-DIAGNOSTIC-ENGINE-01`
- `COPILOT-ROOT-CAUSE-ENGINE-01`
- `COPILOT-RISK-SCORING-ENGINE-01`
- `COPILOT-CLARIFYING-QUESTION-ENGINE-01`
- `COPILOT-WORKFLOW-REASONING-ENGINE-01`
- `COPILOT-OPERATION-HEALTH-ENGINE-01`
- `COPILOT-NEXT-BEST-ACTION-ENGINE-01`
- `COPILOT-PLAN-REVIEW-ENGINE-01`
- `COPILOT-REASONING-ANSWER-COMPOSER-01`
- `SEFER-ABI-REASONING-ASSISTANT-01`
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01`

Bu aile runtime execute açmaz; read-only reasoning / reply composition sınırında kalır.

### B. Demand-to-dispatch chain

Doğrulanan read-only ürün zinciri:

- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`

Bu sıra içinde contact/send/accept/reject, agreement execute, dispatch apply, route apply, driver/vehicle assignment ve provider credential açılmamalı. Mevcut guardrail ve smoke sonuçları bu sınırı koruyor.

### C. Docs-only guardrail milestones

Kanonik yol haritasını kilitleyen, fakat runtime behavior açmayan belgeler:

- `COPILOT-AI-ACTION-ROADMAP-01`
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- `COPILOT-HUMAN-APPROVAL-01`
- `COPILOT-ACTION-PREP-01`

Bu belgeler phase modelini, human approval sınırını ve ortak action-prep owner pack katmanını görünür kılar; write-action, tool execution ve fake success açmaz.

### D. Future-only / not yet implemented product milestones

Kanonik roadmap'te yer alıp bu audit anında current runtime gate olarak doğrulanmayan 25 başlık:

- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`
- `OPERATIONAL-COST-MODEL-01`
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`
- `COMPANY-BUDGET-AND-SERVICE-COST-01`
- `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`
- `COST-SCENARIO-FORECAST-AND-SAVINGS-01`
- `SEFER-ABI-COST-ANALYSIS-ASSISTANT-01`
- `ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01`
- `VOICE-COPILOT-ROLE-ASSISTANT-01`
- `VOICE-COPILOT-COMMANDS-01`
- `VOICE-COPILOT-CONFIRMATION-01`
- `DRIVER-VOICE-COPILOT-01`
- `DRIVER-VOICE-ROUTE-ASSIST-01`
- `DRIVER-VOICE-CHECKIN-ASSIST-01`
- `DRIVER-VOICE-RISK-ALERTS-01`
- `PROACTIVE-COPILOT-01`
- `PROACTIVE-COPILOT-NEXT-BEST-ACTION-01`
- `COPILOT-NEXT-BEST-ACTION-01`
- `COPILOT-ALERT-TO-ACTION-CARD-01`
- `COPILOT-SAFE-AUTOPILOT-01`
- `PERF-REGRESSION-01`
- `SECURITY-KVKK-FINAL-01`
- `PROD-HARDENING-01`
- `FIELD-ACCEPTANCE-01`
- `RELEASE-CANDIDATE-01`

Not:
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01` mevcut dynamic savings, hakediş önizleme, quality-payment bridge, payment preview, CSV export ve Sefer Abi cost cevapları üzerine kurulur; full muhasebe/e-Fatura/e-Defter/vergi programı değildir.
- Kanonik yüzey kaydı: `check:financialoperationssurfaceandrbac01`, `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`, `backend/src/finance/financialOperationsScope.js`.
- `OPERATIONAL-COST-MODEL-01` `check:operationalcostmodel01`, `docs/OPERATIONAL_COST_MODEL_01.md`, `backend/src/finance/operationalCostModel.js` ve `backend/src/finance/operationalCostMath.js` ile takip edilir; pure deterministic read-only cost modeldir.
- `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01` `check:roomprofitabilityandquotefloor01`, `docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md` ve `backend/src/finance/roomProfitabilityAndQuoteFloor.js` ile takip edilir; room profitability ve quote floor preview katmanını yeniden kullanır.
- `COMPANY-BUDGET-AND-SERVICE-COST-01` `check:companybudgetandservicecost01`, `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md` ve `backend/src/finance/companyBudgetAndServiceCost.js` ile takip edilir; company budget ve service cost preview katmanını read-only tutar.
- `PROACTIVE-COPILOT-01` harness içinde açıkça `MISSING_FUTURE_MILESTONE` olarak işaretli.
- `PROACTIVE-COPILOT-NEXT-BEST-ACTION-01` docs-only companion milestone'dır; `docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md` ile yaşar ve `COPILOT-NEXT-BEST-ACTION-01` ile aynı şey değildir.
- `VOICE-COPILOT-ROLE-ASSISTANT-01` için web tarafında text-to-speech / voice readout yardımcı kodu mevcut olsa da, dedicated check script ve tamamlanmış voice-command execution zinciri görünmüyor.
- `COPILOT-NEXT-BEST-ACTION-01`, `COPILOT-NEXT-BEST-ACTION-ENGINE-01` ile aynı şey değildir; roadmap ürün başlığı ayrı, engine check ayrı doğrulandı.

## 4) Canonical Next Order

Bu auditin önerdiği güvenli sonraki sıra:

1. `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`
2. `OPERATIONAL-COST-MODEL-01`
3. `ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01`
4. `COMPANY-BUDGET-AND-SERVICE-COST-01`
5. `HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01`
6. `COST-SCENARIO-FORECAST-AND-SAVINGS-01`
7. `SEFER-ABI-COST-ANALYSIS-ASSISTANT-01`
8. `ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01`
9. `VOICE-COPILOT-ROLE-ASSISTANT-01`
10. `VOICE-COPILOT-COMMANDS-01`
11. `VOICE-COPILOT-CONFIRMATION-01`
12. `DRIVER-VOICE-COPILOT-01`
13. `DRIVER-VOICE-ROUTE-ASSIST-01`
14. `DRIVER-VOICE-CHECKIN-ASSIST-01`
15. `DRIVER-VOICE-RISK-ALERTS-01`
16. `PROACTIVE-COPILOT-01`
17. `PROACTIVE-COPILOT-NEXT-BEST-ACTION-01`
18. `COPILOT-NEXT-BEST-ACTION-01`
19. `COPILOT-ALERT-TO-ACTION-CARD-01`
20. `COPILOT-SAFE-AUTOPILOT-01`
21. `PERF-REGRESSION-01`
22. `SECURITY-KVKK-FINAL-01`
23. `PROD-HARDENING-01`
24. `FIELD-ACCEPTANCE-01`
25. `RELEASE-CANDIDATE-01`

Bu sıra, mevcut verified chain'i zayıflatmadan ilerlemek için hazırlanmıştır. Yeni milestone açarken current allowlist, smoke threshold, 429 policy ve write-action boundary gevşetilmemelidir.

## 5) Open Notes

- BATCH-09 kapandı; `Product Extensions 198/198 GREEN`.
- BATCH-10 technical provenance/current-head closure green.
- Bu patch BATCH-10 doc/runbook SSOT closure'ını tamamlıyor; executable policy owners zaten canonical durumda.
- Sonraki planlama kovası: BATCH-11 Repository Knowledge Backbone. Burada başlatılmıyor.
- Route / service / Prisma / backend-prisma diff boş kaldı.
- Stage boş kaldı.
- `debug.log` absent kaldı.
- Runtime-data commit dışı tutuldu.
- Browser smoke raporları commit setine alınmadı.

## 6) Read Together With

Bu belge şu kanonik kaynaklarla birlikte okunmalı:

- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- `docs/PRIMER_SSOT.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/COPILOT_HUMAN_APPROVAL_01.md`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
