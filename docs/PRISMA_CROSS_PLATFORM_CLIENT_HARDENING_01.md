# Prisma Cross-Platform Client Hardening 01

This document records the repository-owned generation contract and current-head
acceptance evidence for #10. It is an export of the contract, not a substitute
for a real platform run.

## Canonical generation contract

- Schema: backend/prisma/schema.prisma
- Generator: prisma-client-js
- Output: Prisma's normal backend/node_modules/.prisma/client
- Binary policy: implicit native; each runtime installs its own dependencies
  and generates the engine for its own operating system and architecture.
- Owner: backend/scripts/prisma_cross_platform_client_hardening_01.mjs
- Package entry points: npm --prefix backend run prisma:generate and
  npm --prefix backend run prisma:verify
- Docker entry point: npm run prisma:generate after npm ci
- Backend Docker context excludes host `node_modules`, Prisma output and cache
  paths through `backend/.dockerignore`; the image must generate its own client.
- CI entry points: the same package scripts on Ubuntu and Windows.

The repository does not commit platform-specific Prisma engines or generated
cache directories. CI cache keys include the operating system, architecture,
schema, lockfile and generation-owner identity.

## Current Windows census

The native acceptance environment is Windows with Node v24.12.0, npm 11.6.2,
Prisma 5.22.0, and the windows native engine target. The current canonical
schema identity and generated client identity are written to the
backend/artifacts/browser-smoke/PRISMA_CROSS_PLATFORM_CLIENT_HARDENING_01
evidence area by the acceptance harness. Generation is staged, validated
against the real schema and only then promoted to the canonical
generated-client directory.

The Windows harness covers repeated generation, isolated generation, stale
schema/version/cache detection, generated DMMF/model integrity, read-only
Prisma access, backend health and process survival. EPERM and ACL checks use
temporary isolated directories only.

## Platform matrix and evidence policy

| Platform | Environment | Required proof | Current local status |
| --- | --- | --- | --- |
| Windows native | Current host | generate, identity, import/DMMF, read-only query, backend health | Run by the acceptance harness |
| Linux / WSL | Actual WSL distribution | independent install, Linux generation, import/DMMF, query | Must remain NOT RUN when WSL returns access denied |
| Container Linux | backend/Dockerfile | cached build, clean build, generated-client verify and runtime topology | Must remain NOT RUN when Docker daemon is unavailable |
| Canonical CI | .github/workflows/vardis_verification_visibility.yml | real Ubuntu/Windows run and cache invalidation proof | Must remain NOT RUN without connected CI evidence |

The harness exits blocked when any required platform row is not a real PASS.
NOT RUN is never converted to PASS.

## Safety boundaries

#10 does not alter schema.prisma, relations or migrations, and does not reset,
reseed or migrate the protected runtime database. It does not add startup
generation races or copy a generated client between worktrees.

Generation failure is terminal and actionable: lock/ACL failures identify the
bounded retry condition and the exact generation command to rerun. A failed
staged generation cannot replace the existing canonical client.
