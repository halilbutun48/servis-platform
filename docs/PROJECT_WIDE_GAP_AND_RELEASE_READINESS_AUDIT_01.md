# Project-wide gap and release readiness audit — #14

This document is the #14 audit contract and evidence index. It is an audit of
the current product surface, not a new milestone and not a replacement for the
canonical owners of accounting, finance, scenario, reconciliation, backup, or
migration behavior.

## Evidence sources

- Capability matrix: `docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json`
- Gap register: `docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json`
- Static contract checker: `backend/scripts/project_wide_gap_and_release_readiness_audit_01_check.js`
- API acceptance: `backend/scripts/project_wide_gap_and_release_readiness_audit_01_acceptance.mjs`
- Real browser acceptance: `backend/scripts/project_wide_gap_and_release_readiness_audit_01_browser.mjs`

The scripts print the current Git head and use the live local API/browser. A
source-only string match, a route-open-only result, or a synthetic assistant
page is not accepted as task evidence.

## Capability and ownership model

The matrix records each material capability, its canonical owner, role/context,
API and data owner, web/mobile surface, authorization and tenant boundary,
approval/audit semantics, real task evidence, and status. Existing milestone
owners remain authoritative:

- #1 owns Company budget and service cost.
- #2 owns market/reference acquisition and provenance.
- #3 owns hakediş/invoice reconciliation preview.
- #4 owns scenario calculation and savings/impact semantics.
- #5 explains canonical outputs and does not become a calculator or export
  owner.
- #6 owns provider-independent accounting export preparation.
- #7/#10/#11/#12/#13 own their respective Prisma, schema, backup, and migration
  contracts.

## Mandatory #14 closure — School → Parent Access

School remains `AUTH_ROLE=COMPANY` with `CompanyKind=SCHOOL`; it is not a new
backend role. Parent access is `AUTH_ROLE=PARENT`. The School navigation item
labelled `Veli Erişimi` resolves to the existing `#/school/parents` route and
the existing `SchoolParentInvitePanel`; no duplicate backend role or separate
School authentication model is introduced.

The existing canonical flow is:

1. School user opens `Veli Erişimi` and creates a bounded invite for an existing
   student in the same School tenant.
2. The existing `/api/school/parent-invites` owner validates role, School kind,
   tenant, and child ownership, and records audit activity.
3. The public invite info/accept endpoints validate expiry, revocation, School
   kind, and child-to-School binding, then create/reuse the scoped Parent
   access identity.
4. Parent reads are scoped through `ParentChild` and the authenticated parent.
5. Acceptance revokes and removes only the temporary test records; the live
   protected runtime-data files are not used as fixtures and are not modified.

The concrete #14 correction was a navigation-owner defect: the School-labelled
item previously pointed to `/school/personel-access`, a route not owned by the
School app surface. It now points to `/school/parents`; the existing panel,
API, audit, and privacy owners are reused.

## Representative real-task coverage

The browser acceptance covers eight role/context tasks: SUPER_ADMIN overview,
COMPANY finance, ROOM finance, SCHOOL parent access, PARENT live access,
ORGANIZATION planning, DRIVER route, and PERSONEL service. It also covers
School mobile layout and records console errors, page errors, and unexpected
5xx responses. The API acceptance covers School creation/list/info/accept,
code+PIN access, revoke/expired-style denial behavior, same-tenant scope,
cross-tenant rejection where a second fixture exists, and non-School denial.

## Readiness rules

Release readiness is `READY` only when all discovered gaps are classified, no
#14 blocker/critical remains unresolved, the mandatory School → Parent flow is
proven through API and browser evidence, and required regression/verification
suites pass. Values that are intentionally owned by future locked milestones
remain explicitly deferred; they are not silently marked complete.

Deferred by owner: #15 terminology, #17 global navigation redesign, #18
highlights, #20 optimizer, #36 physical-device proof, and #38 production
hardening. These deferrals do not excuse the current School route defect.

## Safety boundaries

No new numbered milestone, auth role, schema model, finance calculator, or
provider-specific behavior belongs in #14. No live DB reset/reseed/migration,
protected runtime-data edit, autonomous approval, payment, posting, or legal
finalization is part of this audit.
