# Engineering architecture

This document is an owner map. Runtime behavior remains authoritative in the referenced source and configuration files.

## System shape

```text
Web / mobile clients
        |
        v
Express API + Socket.IO  ---> Redis/cache/queue support
        |
        +--> Prisma Client ---> PostgreSQL
        +--> OSRM (optional routing provider)
        +--> solver (optional plan-solving service)
        +--> external reference and telematics providers
        +--> background jobs and audit/evidence owners
        +--> Sefer Abi read/evidence reasoning
```

Canonical owners:

| Component | Owner paths | Boundary |
|---|---|---|
| Web shell and panels | `web/src/App.jsx`, `web/package.json` | Role-aware presentation and data fetching; no database ownership |
| Mobile | `mobile/App.js`, `mobile/src/app/`, `mobile/src/screens/` | Driver-first native surface plus supported management/parent surfaces |
| API/bootstrap | `backend/src/server.js`, `backend/src/routes/` | Authentication, authorization, tenant checks, API composition |
| Persistence | `backend/prisma/schema.prisma`, `backend/prisma/schema/*.prisma`, `infra/docker-compose.yml` | PostgreSQL is the business persistence boundary |
| Prisma | `backend/src/prisma.js`, `backend/scripts/prisma_cross_platform_client_hardening_01.mjs` | Typed client generation and runtime data access |
| Redis | `backend/src/redis/index.js`, `backend/src/redis/miniRedis.js` | Cache, rate-limit and queue support; not business SSOT |
| Routing | `backend/src/services/osrmRoute.js`, `backend/src/routes/routeTemplates.js` | OSRM is an optional provider boundary; fallback behavior is owned by route services |
| Solver | `infra/solver/app.py`, `infra/docker-compose.yml` | Optional planning service; #20 optimizer is future |
| Jobs | `backend/src/jobs/index.js`, `backend/src/jobs/autoReachedQueue.js` | Background monitoring/queue behavior |
| External providers | `backend/src/externalCost/providerRegistry.js`, `backend/src/telematics/providers.js` | Provider abstraction, provenance and safe failure |
| AI | `backend/src/ai/service.js`, `backend/src/ai/chat/seferAbiReasoningAssistant.js` | Evidence-bound explanation and preparation; no autonomous critical execution |
| Verification | `backend/scripts/run_repo_check_chain.js`, `backend/scripts/run_product_extensions_check_chain.js` | Check/evidence orchestration |
| CI | `.github/workflows/vardis_verification_visibility.yml` | Repo-native verification visibility |

## Dependency and approval boundaries

Calculation and data owners produce structured results. UI and Sefer Abi consume those results and may explain them, but do not recreate finance, scenario, market-reference, profitability, reconciliation, migration, or backup engines. External provider values remain reference/provenance data, not internal actual cost.

Writes that can change money, contracts, dispatch, accounting, or other important operations require the canonical route’s authorization and user approval. #6 prepares exports; it does not post accounting, make payments, or finalize legal records.

## Current versus future

Current implementation includes basic dispatch/assignment, routing, GPS/evidence, finance/reconciliation previews, provider-independent accounting export preparation, and Sefer Abi decision support. #20’s cost-aware optimizer and disruption recovery, #21 safe action execution, #17 navigation redesign, #18 anchors, #19 natural-language forms, voice (#22–#29), proactive/autopilot (#30–#33), and production hardening (#38) remain future locked owners.

## Runtime boundaries

The canonical local topology is API + PostgreSQL + Redis, with optional OSRM and solver services defined by `infra/docker-compose.yml`. The backend image is `backend/Dockerfile`. Environment configuration and secrets are supplied at runtime; no secret belongs in this document or in source-controlled documentation.
