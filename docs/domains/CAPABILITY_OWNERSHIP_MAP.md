# Capability ownership map

This map points to actual implementation/check owners. Status is one of `IMPLEMENTED`, `PARTIAL`, `PLANNED_LOCKED_OWNER`, `DEFERRED`, or `NOT_APPLICABLE`; it does not replace the capability code or its acceptance evidence. The complete machine-readable rows are in `PROJECT_DOCUMENTATION_ARCHITECTURE_AND_CODEBASE_INDEX_01.json`.

## Current capabilities

| Capability | Domain | API owner | Data owner | Web/mobile owner | Check owner | Status |
|---|---|---|---|---|---|---|
| Authentication and identity | identity | `backend/src/routes/auth.js` | `backend/prisma/schema/identity.prisma` | `web/src/App.jsx` / mobile login | security/KVKK checks | IMPLEMENTED |
| RBAC and tenant isolation | security | `backend/src/auth/middleware.js` | tenant + identity schema modules | App shell/API client | role-data isolation check | IMPLEMENTED |
| Marketplace and offers | marketplace | `backend/src/routes/offers.js` | operations schema module | `web/src/panels/room/OffersPanel.jsx` | supplier matching check | IMPLEMENTED |
| Agreements and commercial | commercial | `backend/src/routes/agreements.js`, `commercialCore.js` | commercial schema module | Company/Room agreement panels | agreement lineage check | IMPLEMENTED |
| Shifts and service planning | operations | `backend/src/routes/shifts/index.js` | operations schema module | Company/Room shift panels | dispatch approval check | IMPLEMENTED |
| Routes and location | routing | `backend/src/routes/routeTemplates.js` | routing schema module | web map / mobile route screen | ETA/OSRM checks | IMPLEMENTED |
| Fleet and driver operations | fleet | `backend/src/routes/vehicles.js`, `drivers.js` | fleet schema module | Room vehicles / driver screens | driver-flow check | IMPLEMENTED |
| Company budget and service cost | finance | `backend/src/routes/companyBudgetLifecycleRoutes.js` | tenant + finance owners | Company commercial flow | #1 checker | IMPLEMENTED |
| Market/reference data | reference | `backend/src/externalCost/router.js` | reference schema module | shared scenario/reference surfaces | #2 checker | IMPLEMENTED |
| Cost scenario forecast | finance | `backend/src/routes/costScenario.js` | #4 calculation owner | `CostScenarioWorkspacePanel.jsx` | #4 checker | IMPLEMENTED |
| Hakediş/invoice reconciliation | finance | `backend/src/routes/reconciliation.js` | commercial schema module | finance preview surfaces | #3 checker | IMPLEMENTED |
| Accounting export preparation | finance | `backend/src/routes/accountingExports.js` | #6 contract/audit owner | `AccountingExportPanel.jsx` | #6 checker | IMPLEMENTED |
| School parent access | identity | `schoolParentInvites.js`, `parent.js` | identity schema module | School/Parent panels | #14 checker | IMPLEMENTED |
| Sefer Abi decision support | ai | `backend/src/routes/ai.js` | canonical result owners | `CopilotPanel.jsx` | #5 and assistant checks | IMPLEMENTED |
| Backup and recovery | operations | #12 CLI/service | backup metadata/ops owner | operator evidence | #12 checker | IMPLEMENTED |
| Migration baseline/adoption | operations | #13 owner script | migrations/schema owners | operator evidence | #13 checker | IMPLEMENTED |
| Prisma cross-platform client | platform | `backend/src/prisma.js` | #11 schema root | runtime infrastructure | #10 checker | IMPLEMENTED |
| School planning | operations | `backend/src/routes/organization.js` | tenant/operations modules | `school/OperationsPanel.jsx` | school/org check | IMPLEMENTED |
| Organization planning | operations | `backend/src/routes/organization.js` | tenant/operations modules | `organization/PlansPanel.jsx` | school/org check | IMPLEMENTED |
| Role-based task home and navigation | platform/ux | existing role routes and bundles | role/context owners | `web/src/utils/roleNavigation.js`, `web/src/components/RoleTaskHome.jsx` | #17 browser/check owner | IMPLEMENTED |
| Operations Command Center presentation | platform/ux | existing dashboard/observability bundle owners | existing canonical signal owners | `web/src/components/OperationsCommandCenter.jsx` | #17 browser/check owner | IMPLEMENTED |
| Single Sefer Abi contextual entry | ai/ux | `backend/src/routes/ai.js` | #5 context/state owners | `FloatingCopilotDrawer.jsx`, `CopilotPanel.jsx` | #17 browser + #5 checks | IMPLEMENTED |

## Finance semantics

The current finance owners deliberately distinguish `ACTUAL`, `ESTIMATE`, `PARTIAL`, `MARKET_REFERENCE`, and `DEMO_FIXTURE`. #1 owns Company budget/service cost, #2 external market/reference data, #3 reconciliation preview, #4 scenario forecast, #5 explanation, and #6 provider-independent export preparation. #5 is not an accounting calculator; #6 is not a posting engine.

## Contract-to-cash trace

`demand/offer` → `agreement` → `shift/route/operation` → `GPS/evidence` → `hakediş` → `invoice` → `reconciliation` → `accounting export`.

Each arrow is owned by the route/service/schema family named above. Current boundaries intentionally exclude automatic payment, legal invoice acceptance, accounting posting, and unapproved dispatch execution.

## Future locked owners

| Capability | Status | Owner |
|---|---|---|
| Terminology sweep | PLANNED_LOCKED_OWNER | #15 |
| UI anchors/highlights | PLANNED_LOCKED_OWNER | #18 |
| Natural-language form preparation | PLANNED_LOCKED_OWNER | #19 |
| Cost-aware optimizer/disruption recovery | PLANNED_LOCKED_OWNER | #20 |
| Safe action framework | PLANNED_LOCKED_OWNER | #21 |
| Voice program | PLANNED_LOCKED_OWNER | #22–#29 |
| Proactive/autopilot program | PLANNED_LOCKED_OWNER | #30–#33 |
| MFA production policy | PLANNED_LOCKED_OWNER | #35 / #38 |
| Physical-device proof | PLANNED_LOCKED_OWNER | #36 |
| Production hardening | PLANNED_LOCKED_OWNER | #38 |
