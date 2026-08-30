# Prisma Schema Modularization 01

## Canonical contract

The canonical Prisma schema root is `backend/prisma/`. Its single entry file,
`backend/prisma/schema.prisma`, owns exactly one `generator client` and one
`datasource db` block. Domain declarations live in the native Prisma schema
folder at `backend/prisma/schema/`.

Prisma CLI 5.22.0 loads this folder through the `prismaSchemaFolder` preview
feature. The repository does not concatenate fragments or commit a generated
second schema. Every Prisma consumer uses the directory root through the
canonical `backend/scripts/prisma_cross_platform_client_hardening_01.mjs`
generation owner.

## Domain ownership

Each declaration is owned by exactly one module. Cross-domain relations remain
declared on their existing models; modularization changes file placement only.

| Module | Primary ownership |
| --- | --- |
| `schema/tenant.prisma` | Company, Room, organization plans/stops, budget plans, CompanyKind and tenant lifecycle enums |
| `schema/identity.prisma` | User identity, roles, invites, consent, parent/child identity, refresh sessions |
| `schema/reference.prisma` | Region and external cost/reference data and its enums |
| `schema/fleet.prisma` | Vehicle, Driver, Personel and fleet/geo enums |
| `schema/operations.prisma` | Shift, stops, offers, assignments, imports, penalties, pickup and progress |
| `schema/routing.prisma` | Route templates and route learning records |
| `schema/telemetry.prisma` | GPS devices, last positions, vehicle GPS state and points |
| `schema/commercial.prisma` | Agreement, quote floors, hakediş, invoice, commission, settlement and payment account records |
| `schema/platform.prisma` | Notification, API request and audit platform records |
| `schema/security.prisma` | Personnel credentials and check-in events |

The full model/enum ownership map and 91 cross-domain relation inventory are
generated in the current acceptance evidence at
`backend/artifacts/browser-smoke/PRISMA_SCHEMA_MODULARIZATION_01/acceptance.json`.
That evidence is ignored/disposable and is accepted only when its source HEAD
matches the current checkout.

## Safe change procedure

1. Put a new model or enum in the module that owns its domain and keep the
   `// #11 domain owner: ...` marker.
2. Keep shared declarations single-source. Do not duplicate a model or enum in
   another module.
3. For a cross-domain relation, preserve the field type, optionality,
   cardinality, relation name, foreign-key fields and referential actions.
4. Run the focused checks before considering a change complete:

   ```text
   npm --prefix backend run prisma:modularization:acceptance
   npm --prefix backend run prisma:modularization:check
   npm --prefix backend run prisma:verify
   ```

5. A model/field/relation/default/index/database mapping change is a schema
   change, not a modularization-only change. Stop and review it separately;
   do not create a migration merely because files moved.

## Generation and compatibility

`backend/package.json` owns the public `prisma:generate` and `prisma:verify`
commands. They delegate to the #10 cross-platform generation owner, which
resolves `backend/prisma/` as the schema root. CI and Docker use that same
contract. Runtime application code continues importing `@prisma/client`; no
domain module creates a second Prisma Client.

The #10 identity contract includes the modular schema source set and semantic
model identity. Platform-specific engine binaries may differ, but schema,
Prisma version, runtime model/DMMF and generated API identity must remain
compatible across Windows, Linux, container and CI.

## Migration and database boundary

This milestone is source organization only. It must produce an empty Prisma
schema diff, zero new migrations, and no database mutation. Historical
migration directories and SQL are not renamed or rewritten. Use the #11
acceptance’s isolated pre/post comparison before changing ownership or a
relation.

## Review invariants

- one canonical schema root and one datasource/generator owner;
- every model and enum has one primary module owner;
- no orphan or one-model module and no `misc` dump;
- DMMF model, field, relation and enum parity is required;
- runtime read-only probes cover auth/user, company, room, agreement,
  operations and finance;
- no UI, Sefer Abi, business calculation or product behavior change belongs
  in #11.

The #11 checker validates these invariants behaviorally with Prisma validation,
generated-client identity, current-head acceptance evidence and migration
status. It is not a source-string-only guard.
