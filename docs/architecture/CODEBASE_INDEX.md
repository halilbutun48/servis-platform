# Codebase index

Use this map to reach an owner without reading the entire repository.

| Area | Purpose | Canonical owners | Do not put here |
|---|---|---|---|
| `backend/` | API, domain services, Prisma, jobs and checks | `backend/src/server.js`, `backend/src/routes/`, `backend/src/services/`, `backend/scripts/` | Web presentation or protected runtime-data edits |
| `backend/src/routes/` | Authenticated API route families | Route file for the family; middleware is applied at the route/bootstrap boundary | Business logic duplicated in UI or AI |
| `backend/src/services/` | Reusable domain/service orchestration | Service named for the domain | A second calculation engine |
| `backend/src/finance/` | Canonical finance calculations/contracts | #1–#6 finance owners | Free-form AI as financial SSOT |
| `backend/src/ai/` | Sefer Abi intent, context, reasoning and safe replies | `backend/src/ai/service.js` and `backend/src/ai/chat/` | Autonomous posting or unapproved writes |
| `backend/prisma/` | Schema, migrations, seed and generated-client inputs | `schema.prisma`, `schema/*.prisma`, `migrations/` | A second schema SSOT or ad-hoc DB changes |
| `backend/artifacts/` | Evidence and runtime artifacts | Individual milestone/check owners | Protected runtime-data as test fixture |
| `web/` | React/Vite client | `web/src/App.jsx`, `web/src/panels/`, `web/src/components/` | Backend authorization or business calculations |
| `mobile/` | Expo/React Native client | `mobile/App.js`, `mobile/src/app/`, `mobile/src/screens/` | Claiming #36 physical-device proof from static checks |
| `infra/` | Local deployment topology and optional services | `infra/docker-compose.yml`, `infra/solver/` | Provider-specific production assumptions |
| `tools/` | PowerShell wrappers, packs and repo hygiene | `tools/check-repo.ps1`, pack/check owners | New competing roadmap or broad destructive cleanup |
| `docs/` | Canonical explanation, historical evidence and indexes | `docs/INDEX.md`, existing SSOTs, milestone owners | Reimplementing business rules |
| `.github/workflows/` | CI workflow definitions | `vardis_verification_visibility.yml` | Hidden local-only generation paths |

## Backend entrypoints

- Bootstrap: `backend/src/server.js`
- Auth and identity: `backend/src/routes/auth.js`, `backend/src/routes/me.js`, `backend/src/auth/middleware.js`
- Tenant/RBAC: `backend/src/auth/middleware.js` and route-specific ownership checks
- Commercial/finance: `backend/src/routes/commercialCore.js`, `backend/src/routes/companyBudgetLifecycleRoutes.js`, `backend/src/finance/`
- Agreements/shifts: `backend/src/routes/agreements.js`, `backend/src/routes/shifts/`, `backend/src/services/`
- Routing/GPS: `backend/src/routes/routeTemplates.js`, `backend/src/routes/gps.js`, `backend/src/services/osrmRoute.js`
- Jobs/operations: `backend/src/jobs/`, `backend/src/ops/`
- Sefer Abi: `backend/src/routes/ai.js`, `backend/src/ai/`
- Verification: `backend/scripts/` and the package-script registry

## Web and mobile entrypoints

The web shell resolves authenticated role/context and mounts role panels through `web/src/App.jsx`. Shared finance and assistant surfaces live under `web/src/panels/shared/`; role-specific surfaces live under `web/src/panels/company/`, `room/`, `school/`, `organization/`, `driver/`, `parent/`, and related folders.

The mobile shell is driver-first. `mobile/src/app/` owns lifecycle/state composition and `mobile/src/screens/` owns screens. Driver, Personel, and Parent behavior is present in the current lightweight/native surface; Company, Room, School, and Organization support is bounded by the existing mobile scope and browser/mobile-web checks. Physical-device field proof remains #36.

## Change navigation

Start with the capability map, then follow the API owner and data owner. For a Prisma change, use #11’s module owner and run #10 generation plus #13 migration-impact checks. For documentation changes, use `docs/INDEX.md` and the #16 checker; do not modify product code to make a documentation check green.
