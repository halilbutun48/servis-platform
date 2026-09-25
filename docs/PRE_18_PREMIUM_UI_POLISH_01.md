# PRE-#18 Premium UI Polish — bounded closure pack

## Current PRE-#18 status overlay (2026-09-24)

The current authoritative Premium UI gate is `72_OF_72_PROVEN`. The final 24
states were re-run from the canonical Playwright producer at the current HEAD;
they were previously unproven because the producer captured the React loading
fallback or had not opened the current native workspace disclosure. They are
now backed by route-specific readiness, real browser screenshots, and the
required interaction evidence. Foundation Exit and final repository hygiene
remain separate lifecycle gates.

Status: bounded implementation and real-browser acceptance for the pre-#18 visual polish pass.

This document is an evidence owner for the single consolidated pass. It is not a new roadmap or business SSOT.

## Scope

- Existing dark/navy SeferPakt identity is preserved.
- All visible PRE-#18 surfaces use one canonical semantic typography layer: `Inter, system-ui, Arial, sans-serif`.
- Authenticated shell has one medium sidebar brand and a small contextual topbar symbol.
- Header, navigation, task-home hierarchy, tables, cards, form controls and responsive overflow are reviewed in the current browser UI.
- Visible engineering/governance wording is removed or translated only where it appears in an end-user surface.
- Login keeps its existing large-brand presentation; the #18 brand-explainer chips remain owned by #18.
- Sefer Abi remains the accepted static portrait with state UI. Real Live2D remains deferred by asset production.

## Current rendered census

The acceptance matrix covers SUPER_ADMIN, COMPANY, ROOM, DRIVER, PERSONEL, PARENT, SCHOOL and ORGANIZATION as real browser contexts at desktop (1440x900), tablet (1024x900) and mobile (390x844). SCHOOL and ORGANIZATION use COMPANY authentication with their existing company-kind context.

Representative surfaces include the authenticated shell and task home, expanded task workspace, responsive mobile shell, Sefer Abi quick assistant, role navigation, Command Center, map entry, and Super Admin operational/export surfaces. The existing #15 rendered acceptance remains the terminology-state owner for its broader error, finance and map diagnostics matrix.

### Final 72-state and NavDock closure record

Owner: `PRE_18_UX_NAVDOCK_AND_PREMIUM_UI_FINAL_CLOSURE_01`.

- Canonical producer: `npm run smoke:pre18premiumuipolish01`.
- Current check: `npm run check:pre18premiumuipolish01`.
- Result: 24 context states plus 48 additional states, 77 screenshots, and
  `PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT=72` at the current HEAD.
- The original 24 unproven records were 12 delayed task-home contexts, nine
  delayed core surfaces, and three missing desktop workspace disclosures. All
  were `HARNESS_EVIDENCE_DEFECT` records: the real UI was current, while the
  producer waited for a generic loading fallback rather than the current
  route's actual user-facing readiness condition.
- Final NavDock proof covers desktop selected state, accessible names,
  keyboard focus-visible state, safe navigation and browser back; and mobile
  drawer opening, safe-area bounds, Escape/focus restoration, and backdrop
  close. It records 14 safe interactions, all passing.
- The current source assertion preserves the readonly payment-preparation
  preview and proves that execution controls remain explicitly unavailable.

The historical full requirement matrix below is retained as the pre-closure
audit baseline. Its earlier partial/insufficient labels are not current gate
status; the canonical result above and generated current-HEAD report are the
active authority.

## Canonical decisions

- `Hizmet Alan Firma` and `Taşımacılık Firması` remain the user-facing company/room labels.
- `Sefer Abi` remains the only assistant name and primary entrypoint.
- API/backend enum values and route/deep-link contracts remain unchanged.
- Technical values needed by Super Admin remain available in their existing admin surfaces, but field-name labels and workflow verbs are presented in plain Turkish.
- A preview remains a preview; terminology cleanup does not turn it into an execution or accounting action.

## Owned files

- `web/src/index.css` — one PRE-#18 typography, hierarchy and responsive override layer.
- `web/src/layout/AppShell.jsx` — compact contextual topbar symbol while retaining the shell brand owner.
- `web/src/App.jsx` — accessible login landmark wording.
- `web/src/components/TabletOpsQuickBar.jsx` — removes the visible milestone reference.
- `web/src/panels/company/planBuilderPanelSections.jsx` — removes visible stage/field/provider wording from the planning UI.
- `web/src/panels/superadmin/LogExportPanel.jsx` — translates visible export controls and table headings.
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx` — translates visible internal cycle labels.
- `web/src/utils/copilotFacts.js` — keeps current Sefer Abi responses free of milestone/English workflow wording.
- `backend/scripts/pre_18_premium_ui_polish_01_browser.mjs` and `_check.js` — real rendered acceptance and strict report guard.

## Acceptance evidence

Run:

```text
npm run smoke:pre18premiumuipolish01
npm run check:pre18premiumuipolish01
```

The browser run writes ignored evidence under `backend/artifacts/browser-smoke/pre-18-premium-ui-polish-01/`. The report records source HEAD, context/state screenshots, visible and accessible text leak findings, brand sizing, responsive overflow, and browser errors. A blank source-only assertion cannot satisfy this pack.

Required outcomes:

- `PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT >= 72`
- `PRE_18_TYPOGRAPHY_TARGET_PASS_COUNT >= 3`
- `PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT = 16`
- `TYPOGRAPHY_COMPETING_SYSTEM_COUNT = 0`
- `TYPOGRAPHY_UNEXPLAINED_ONE_OFF_OVERRIDE_COUNT = 0`
- `VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT = 0`
- `RESPONSIVE_TEXT_CLIP_COUNT = 0`
- `OVERSIZED_PAGE_TITLE_COUNT = 0`
- `OVERSIZED_SECTION_TITLE_COUNT = 0`
- `VISIBLE_CONTENT_COMPRESSION_BY_TYPOGRAPHY_COUNT = 0`
- authenticated header brand is compact and non-competing
- responsive overflow and critical-label clipping are zero
- visible internal/engineering wording and accessible English workflow wording are zero
- console errors, page errors and HTTP 500 responses are zero
- Sefer Abi continuity and map behavior remain covered by the existing baseline regressions

## Canonical typography scale — current applied corrective

The final semantic layer is applied after legacy surface declarations so that
the same visible role cannot silently drift by panel or breakpoint. It covers
the shared shell, task homes, tables, forms, cards, dialogs/drawers, maps and
Command Center, Sefer Abi quick UI, login, and the named financial/location
surfaces.

| Semantic role | Desktop | Tablet/mobile behavior |
|---|---|---|
| PageTitle | 36px / 1.14 / 800 / -0.02em | 32px / 1.14 |
| SectionEyebrow | 13px / 18px / 700 / 0.08em uppercase | unchanged, wraps safely |
| SectionTitle | 24px / 28.8px / 700 | 22px / 26.4px |
| CardTitle | 17px / 22.1px / 700 | 16px / 20.8px |
| Body | 14px / 22px / 400 | unchanged |
| Helper / Meta / FormLabel | 12px / 18px / 500 | unchanged |
| ButtonCTA | 14px / 20px / 600 | unchanged |
| SidebarItem | 15px / 22px / 600 | unchanged |
| BadgeChip | 12px / 16px / 700 | unchanged |
| TableHeader | 12px / 18px / 700 / 0.04em | unchanged |
| TableBody / TableCell / Input | 13px / 20px / 400 | unchanged |
| ModalTitle | 20px / 26px / 700 | unchanged |
| ModalBody / Map / Command Center | 14px / 22px / 400 | unchanged |

Real rendered target evidence explicitly includes `Taşımacılık Firması
Konumu`, `Bugün neye odaklanmalısın?`, and `Teklif ve Kârlılık`, in addition
to the 8-context × 3-viewport matrix, expanded workspaces, navigation,
Sefer Abi quick panels, dialogs and login. The current report records 24
context renders, 48 additional states, 77 screenshots, 72 passing rendered
proofs, and two dedicated NavDock interaction probes at the current HEAD.

## Locked deferrals

- Real Live2D animation: `DEFERRED_BY_ASSET_PRODUCTION`.
- #18 guided anchor/highlight behavior: not started.
- No new business capability, proactive behavior, role, API contract or database migration is part of this pass.

## Historical full requirement matrix — pre-closure audit baseline

This matrix is retained as the pre-edit audit baseline for the visible surface
pass. It does not override the current closure record above.

| ID | Requirement | Owner | Implementation status | Real browser proof | Desktop / tablet / mobile | Role coverage | Current evidence | Missing work | Classification |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Font family | `web/src/index.css`, `web/src/components/map/mapShell.css` | Canonical Inter token and map override applied | 72 passing rendered states; no competing family | D/T/M | all 8 contexts + named targets | report `TYPOGRAPHY_COMPETING_SYSTEM_COUNT=0` | none for scale | PROVEN_COMPLETE |
| A2 | Semantic type scale and weights | `web/src/index.css` semantic token layer | 16 roles mapped to final visible selectors | 72 passing rendered states; computed role samples | D/T/M | all 8 contexts | report `PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT=16` | none for scale | PROVEN_COMPLETE |
| A3 | Line-height, tracking and responsive scaling | `web/src/index.css` | Canonical values with mobile 32/22/16 title reductions | 72 passing rendered states; clip/overflow counters zero | D/T/M | all 8 contexts | report scale and responsive counters | none for scale | PROVEN_COMPLETE |
| A4 | Page/section/card/body/helper/meta roles | existing surface selectors + `web/src/index.css` | Shared semantic selectors cover visible product roles | named target screens + 24 context renders | D/T/M | all 8 contexts | report 16 role matches | none for scale | PROVEN_COMPLETE |
| A5 | Form/input/button/navigation/table/badge roles | shared selectors + `web/src/index.css` | Form, input, CTA, sidebar, badge and table roles mapped | core surface family renders, navigation, login | D/T/M | all 8 contexts | typography drift counters zero | none for scale | PROVEN_COMPLETE |
| A6 | Modal/drawer/map/Command Center roles | map/copilot selectors + `web/src/index.css` | Modal/drawer/map/Command Center roles mapped | quick panel, modal, map and task-home screenshots | D/T/M | COMPANY/ROOM/PARENT + all shell contexts | role and overflow counters zero | none for scale | PROVEN_COMPLETE |
| B1 | Sidebar brand sizing | `AppShell.jsx` + `index.css` | Implemented | Pass | D/M; T missing | all 8 shell contexts | compact sidebar mark | Tablet/collapsed proof | PARTIAL |
| B2 | Topbar composition and compact mark | `AppShell.jsx` | Implemented | Pass | D/M; T missing | all 8 shell contexts | 16 context renders | Tablet proof | INSUFFICIENT_EVIDENCE |
| B3 | No duplicate oversized brand | `AppShell.jsx` + harness | Implemented and checked | Pass | D/M; T missing | all 8 | counter 0 | Tablet proof | PARTIAL |
| B4 | User/role/context visibility | `AppShell.jsx` + session labels | Existing | Partial | D/M; T missing | all 8 | task-home shell text | Dedicated tablet proof | INSUFFICIENT_EVIDENCE |
| C1 | Login desktop typography/logo/spacing/rhythm | `App.jsx` + shared auth CSS | Existing polished surface | Pass | D proven | unauthenticated | login screenshot | none known | PROVEN_COMPLETE |
| C2 | Login mobile typography/logo/spacing/rhythm | `App.jsx` + shared auth CSS | Existing polished surface | Pass | M proven | unauthenticated | login screenshot | tablet optional | PROVEN_COMPLETE |
| C3 | Login CTA and helper/demo text hierarchy | `App.jsx` | Existing | Partial | D/M; T missing | unauthenticated | login state | explicit error/helper proof | PARTIAL |
| D1 | Milestone/governance IDs absent in visible UI | touched PRE-18 owners + leak harness | Fixed in known surfaces | Pass on task-home | D/M; T missing | all 8 plus SUPER_ADMIN | visible leak counter 0 | broader role-specific routes | INSUFFICIENT_EVIDENCE |
| D2 | M48.5/M61/M62/README/Primer/Startpack absent | shared/product owners | Fixed in known surfaces | Partial | D/M; T missing | SUPER_ADMIN included | tablet quick bar + copilot facts | all admin surfaces | INSUFFICIENT_EVIDENCE |
| D3 | Developer counters/file engineering terms absent | visible-copy owners | Partial | Partial | D/M; T missing | SUPER_ADMIN + business roles | known leak rules | core panels | INSUFFICIENT_EVIDENCE |
| E1 | Dense notification/audit/log tables | shared table styles + panel owners | Existing wrappers; not fully audited | Not proven | D/M; T missing | SUPER_ADMIN | no dedicated render | representative table states | INSUFFICIENT_EVIDENCE |
| E2 | Commercial/financial/operations tables | panel owners | Existing | Not proven | D/M; T missing | COMPANY/ROOM/SCHOOL/ORG/DRIVER/PERSONEL | source census only | render families | INSUFFICIENT_EVIDENCE |
| E3 | Cell/badge/text/action collision safety | shared table CSS + harness | No strict geometry counters yet | Not proven | D/M; T missing | table-bearing roles | source only | geometry assertions | INSUFFICIENT_EVIDENCE |
| E4 | Mobile table representation and ellipsis justification | panel owners | Existing mixed table/card variants | Not proven | M only partial | all relevant roles | source census | mobile family renders | INSUFFICIENT_EVIDENCE |
| F1 | Sidebar/nested/collapsed navigation | `roleNavigation.js`, `AppShell.jsx` | Existing #17 navigation preserved | Partial | D/M; T missing | all 8 | #17 regression | tablet navigation proof | PARTIAL |
| F2 | Tablet quick bar and mobile bottom navigation | shared shell/components | Existing | Partial | M proven; T missing | role contexts | mobile context screenshots | tablet proof | INSUFFICIENT_EVIDENCE |
| F3 | Selected state, icon/text alignment, long Turkish labels | shared nav CSS | Existing PRE-18 labels wrap | Partial | D/M; T missing | all 8 | nav label rule | tablet + collapsed proof | PARTIAL |
| G1 | Text/number/select/date/textarea controls | panel owners + shared form CSS | Existing controls | Not proven | D/M; T missing | business/admin roles | source census | form matrix | INSUFFICIENT_EVIDENCE |
| G2 | Labels/helpers/errors/advanced disclosure | panel owners | Existing mixed inline styles | Not proven | D/M; T missing | business/admin roles | source census | validation + advanced render | INSUFFICIENT_EVIDENCE |
| G3 | Units and mobile CTA/keyboard behavior | panel owners | Existing | Not proven | M partial | COMPANY/ROOM/DRIVER | source only | responsive form proof | INSUFFICIENT_EVIDENCE |
| H1 | Status/problem/opportunity/primary-secondary hierarchy | role task-home + panel owners | Task-home implemented | Pass on task-home | D/M; T missing | all 8 task homes | 28 passes | core surfaces | PARTIAL |
| H2 | Advanced disclosure/nested-card/border/rhythm | shared card CSS + panel owners | Existing | Partial | D/M; T missing | all 8 | workspace expansion | core surfaces | INSUFFICIENT_EVIDENCE |
| H3 | CTA prominence and unambiguous primary action | shared button styles + panel owners | Existing | Partial | D/M; T missing | all 8 | task-home | modal/form/core proof | INSUFFICIENT_EVIDENCE |
| I1 | Map/Command Center labels and selected context | #17 map/task-home owners | Preserved | Pass on known map/task states | D/M; T missing | COMPANY/ROOM/SCHOOL/ORG/PERSONEL/PARENT | #15/#17 evidence | tablet and role-specific map proof | PARTIAL |
| I2 | Responsive map spacing and Sefer Abi coexistence | frozen #17 owners | Preserved | Existing baseline pass | D/M; T missing | map roles | #17/Sefer Abi evidence | no PRE-18 redesign | DEFERRED_BY_LOCKED_OWNER |
| J1 | Desktop audit for all 8 contexts | browser harness | Implemented | Pass 8 + named target screens | D proven | all 8 | 24 context/state matrix | none for scale | PROVEN_COMPLETE |
| J2 | Tablet audit for all 8 contexts | browser harness | Implemented | Pass 8 | T proven | all 8 | 8 tablet context screenshots | none for scale | PROVEN_COMPLETE |
| J3 | Mobile audit for all 8 contexts | browser harness | Implemented | Pass 8 + quick panel | M proven | all 8 | 8 mobile context screenshots | none for scale | PROVEN_COMPLETE |
| K1 | Heading hierarchy/readability/contrast/line-height | shared CSS + browser computed-role geometry | Implemented | 72 passing rendered states | D/T/M | all 8 + named screens | hierarchy/clip/compression counters zero | none for scale | PROVEN_COMPLETE |
| K2 | Focus and keyboard semantics | existing controls + #17 | Existing | Existing regression proof | D/M; T missing | all 8 not isolated | #17/Sefer Abi regressions | role matrix | PARTIAL |
| K3 | Touch targets and reduced motion | existing shared styles | Existing | Partial | M only | relevant roles | Sefer Abi baseline | full matrix | INSUFFICIENT_EVIDENCE |
| L1 | Meaningful rendered evidence, not health-only | PRE-18 browser harness | 72 passing rendered proofs | Pass | D/T/M | all 8 + named targets | 75 screenshots, 72 passes | none for scale | PROVEN_COMPLETE |
| L2 | All required families and viewports represented | PRE-18 harness | Complete for current scale corrective | Pass | D/T/M | all 8 contexts | 24 contexts + 48 states | none for scale | PROVEN_COMPLETE |
| M1 | Sefer Abi freeze/no Live2D/fake motion/oscillation regression | frozen Sefer Abi owners | Preserved | Existing independent pass | D/M; T existing elsewhere | current supported contexts | accepted baseline | no PRE-18 change | DEFERRED_BY_LOCKED_OWNER |
| N1 | #18 brand-system ownership preserved | #18 boundary docs | Preserved | Not a product acceptance claim | D/M/T | all contexts | docs scope | record only | DEFERRED_BY_LOCKED_OWNER |
| N2 | No #18 implementation/start/finalization | repository workflow | Current worktree not finalized | N/A | all | all | no stage/commit/tag/push | maintain boundary | PROVEN_COMPLETE |
