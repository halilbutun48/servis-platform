# TEST-QUALITY-AND-FLAKE-AUDIT-01

Tarih: 2026-07-18
Repo: `servis-platform`

> Bu belge, smoke/check zincirindeki flake risklerini, false negative sıcak noktalarını ve threshold gevşetme risklerini dar kapsamda audit eder. Yeni ürün özelliği açmaz; UI davranışı, backend route/service/prisma ve commit sınırı değişmez.

## 1) Purpose

Bu milestone feature milestone değildir.

Amaç:
- smoke/check zincirindeki kırılgan bekleme ve selector yüzeylerini denetlemek
- false negative üreten dar noktaları belgelemek
- threshold / skip / timing / PASS kriteri gevşetme riskini kapatmak
- runtime-data, browser-smoke ve debug.log commit sınırını görünür tutmak
- route/service/prisma guardını gevşetmeden kalibrasyon yapmak

Bu çalışma:
- yeni UI davranışı eklemez
- backend route/service/prisma değiştirmez
- smoke PASS sayısını düşürmez
- skip eklemez
- threshold düşürmez
- broad allowlist açmaz

## 2) Scope

Audited scripts and gates:
- `npm run smoke:productflowbuttonaudit01`
- `npm run smoke:uxlivepanelpremium01`
- `npm run smoke:uxallpanelsrealityaudit01`
- `npm run smoke:uxmobileallrolespanelaudit01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run check:hotfilesplitwebpanels01`
- `npm run check:hotfilesplitaichatcomposers01`
- `npm run check:copilotnextbestactionengine01`
- `npm run check:seferabiturkishterminology01`
- `npm run check:copilotoperationhealthengine01`
- `npm run check:copilotplanreviewengine01`
- `npm run check:copilotworkflowreasoningengine01`
- `npm run check:copilotroutereviewhumanapproval01`
- `npm run check:copilotdynamicquestionengine01`
- `npm run check:copilotsmartdiagnosticengine01`
- `npm run check:copilotrootcauseengine01`
- `npm run check:copilotclarifyingquestionengine01`

Relevant source files:
- `backend/scripts/product_flow_button_audit_01.mjs`
- `backend/scripts/ux_live_panel_premium_smoke_01.mjs`
- `backend/scripts/ux_all_panels_reality_audit_01.mjs`
- `backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs`
- `backend/scripts/product_flow_button_audit_01_check.js`
- `backend/scripts/ux_live_panel_premium_smoke_01_check.js`
- `backend/scripts/ux_all_panels_reality_audit_01_check.js`
- `backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js`
- `backend/scripts/copilot_route_review_human_approval_01_check.js`
- `backend/scripts/excel_to_route_readiness_redteam_01_check.js`
- `backend/scripts/_m91_route_preview_checks.js`

## 3) Scripts Audited

The audit keeps the current smoke/check baseline visible:
- product-flow PASS target: `18/0/0/0`
- premium smoke PASS target: `82/0/0/0`
- all-panels reality audit PASS target: `82/0/0/0`
- mobile all-roles audit PASS target: `82/0/0/0`

The product-extension chain stays wired through the same core checks:
- `check:hotfilesplitaichatcomposers01`
- `check:hotfilesplitwebpanels01`
- `check:copilotnextbestactionengine01`
- `check:seferabiturkishterminology01`
- `check:copilotoperationhealthengine01`
- `check:copilotplanreviewengine01`
- `check:copilotworkflowreasoningengine01`
- `check:testqualityandflakeaudit01`

## 4) Flake Risks Found

Observed risks are narrow and targeted:
- a school mobile overview can race its first visible content check if the screen is read too early
- split path references can drift after hot-file splits, especially for route preview assertions
- route-review scope can accidentally widen if exact allowlist entries become broad or global

No threshold relaxation was accepted.
No skip was added.
No PASS count was reduced.

## 5) False Negative Fixes

Documented fixes are false-negative repairs, not user-visible product changes:
- `backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs` uses a targeted `Okul — Planlama Merkezi` visibility wait before the school mobile overview re-read
- `backend/scripts/_m91_route_preview_checks.js` now points the room ops bridge assertion at `web/src/panels/room/roomAgreementsBridgeSection.jsx`

These fixes keep the smoke/check signal honest without loosening thresholds.

## 6) Selector / Wait Stabilization Notes

- visible locators are preferred over hidden or ambiguous matches
- role/data-testid and role and aria-label surfaces stay stable for smoke-critical controls
- button text is preserved where the smoke asserts depend on it
- the school overview wait is narrow and purpose-built
- no broad sleep was introduced to manufacture PASS

## 7) Explicitly Not Changed

- smoke threshold / skip / timing / PASS criteria
- route/service/prisma boundaries
- runtime-data commit policy
- browser-smoke commit policy
- debug.log policy
- global allowlist policy
- product behavior and UI semantics
- new UI davranışı eklemez; backend route/service/prisma değiştirmez; skip eklemez; threshold düşürmez; broad allowlist açmaz

## 8) Smoke Threshold Preservation

The audit keeps the established thresholds intact:
- product-flow: `PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- premium smoke: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- all-panels reality audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- mobile all-roles audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`

PASS criteria are not relaxed by this audit.

## 9) Runtime-data / Browser-smoke / debug.log Policy

- runtime-data stays commit external and unstaged
- browser-smoke artifacts stay commit external and ignored
- debug.log stays absent (debug.log absent)
- stage stays empty before commit-ready (`stage empty`)
- debug.log absent
- stage empty

## 10) Validation Results

| Command | Status | Notes |
| --- | --- | --- |
| `npm run check:testqualityandflakeaudit01` | PASS | `guardCases >= 45`, `failCount=0`, summaries present |
| `npm run check:hotfilesplitwebpanels01` | PASS | split path and bridge/helper boundaries preserved |
| `npm run check:hotfilesplitaichatcomposers01` | PASS | `helpComposer` hot-file split preserved |
| `npm run check:copilotnextbestactionengine01` | PASS | runtimeCases / testedCases / passCount / failCount remain healthy |
| `npm run check:seferabiturkishterminology01` | PASS | terminology audit remains `80/80` and blocked terms stay `none` |
| `npm run check:copilotoperationhealthengine01` | PASS | operation-health guard remains read-only |
| `npm run check:copilotplanreviewengine01` | PASS | plan-review guard remains stable |
| `npm run check:copilotworkflowreasoningengine01` | PASS | workflow reasoning guard remains stable |
| `npm run check:copilotroutereviewhumanapproval01` | PASS | route-review scope remains exact |
| `npm run check:product-extensions` | PASS | chain wiring preserved |
| `npm run verify:repo` | PASS | repo verification chain preserved |
| `npm run verify:final` | PASS | final verification chain preserved |
| `npm --prefix backend run lint` | PASS | backend lint remains green |
| `npm --prefix web run lint` | PASS | web lint remains green |
| `npm run smoke:productflowbuttonaudit01` | PASS | `18/0/0/0` |
| `npm run smoke:uxlivepanelpremium01` | PASS | `82/0/0/0` |
| `npm run smoke:uxallpanelsrealityaudit01` | PASS | `82/0/0/0` |
| `npm run smoke:uxmobileallrolespanelaudit01` | PASS | `82/0/0/0` |

Audit summary labels:
- `PASS TEST-QUALITY-AND-FLAKE-AUDIT-01`
- `guardCases`
- `passCount`
- `failCount`
- `flakeRiskSummary`
- `smokeThresholdSummary`
- `selectorStabilitySummary`
- `commitExternalSummary`
- `routeServicePrismaSummary`

## 11) Remaining Risks

- any future route split can reintroduce stale path references if docs/checks are not updated together
- mobile overview waits should stay targeted, not generalized
- browser-smoke artifacts must remain out of the commit set
- PASS-minus evidence routes should stay evidence-only and not become threshold relaxation pressure

## 12) Next Recommended Milestone

`QUALITY-GATE-FINAL-01`

This audit should be followed by the existing release gate, not by any new product behavior change.
