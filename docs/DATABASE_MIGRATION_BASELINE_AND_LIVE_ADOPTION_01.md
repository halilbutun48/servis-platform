# #13 Database Migration Baseline and Live Adoption

## Canonical decision

The current canonical database already contains the complete migration history:
56 local migration directories correspond to 56 finished rows in
`_prisma_migrations`, with matching checksums and no failed, rolled-back, or
unfinished rows. The terminal migration is
`20260829100000_external_reference_gasoline95_01`.

Therefore the #13 live-adoption action is:

`LIVE_ADOPTION_ACTION = NO_OP_ALREADY_CANONICAL`

No synthetic baseline row, `migrate resolve`, deployment, DDL, reset, or data
rewrite is needed for this state.

## Schema and migration entrypoints

The single canonical Prisma schema entrypoint is:

`backend/prisma/schema.prisma`

It is the explicit `--schema` value for migration status and deployment. On
this Prisma 5.22.0 modular setup, `--schema prisma` points at the schema folder
and can report a false-green status without discovering the migration history.
Use:

```text
npm --prefix backend run prisma:migrate:status
```

Live deployment is owned by
`backend/scripts/database_migration_baseline_and_live_adoption_01_owner.mjs`
and is exposed through `prisma:migrate:deploy`. It requires the external
deployment/change-control boundary to provide:

- `MIGRATION_APPROVAL=APPROVED`
- a verified #12 `MIGRATION_BACKUP_ID`
- `MIGRATION_CHANGE_CONTROL_ID`

The application does not silently establish a baseline at startup.

## Pre-deployment workflow

1. Confirm tenant/scope, period and the intended migration set.
2. Create and verify a #12 backup before any live migration or reconciliation.
3. Review `prisma migrate diff` and the migration SQL.
4. Obtain explicit operator/user approval at the deployment boundary.
5. Run the canonical deploy owner with the explicit schema entrypoint.
6. Run canonical status, schema parity, runtime health, and representative read
   queries.

For #13’s current state, step 5 is intentionally not executed because the
metadata is already complete and the DB, corrected Prisma schema, and isolated
56-migration replay are semantically identical.

## Allowed and forbidden command boundaries

- `migrate deploy`: canonical deployment owner only, after backup and approval.
- `migrate status`: read-only status through the explicit entrypoint.
- `migrate dev`: isolated developer migration creation only.
- `migrate reset`: isolated/test/fresh fixtures only; never the canonical DB.
- `db push`: isolated/test schema setup only; never a production migration path.
- `migrate resolve`: reconciliation only after a state census and explicit
  change-control approval; never as a shortcut for a complete history.

Historical migration SQL and directory names are immutable. Do not replay old
migrations blindly against a live database and do not create a cleanup
migration for the two authorized Prisma default corrections: the physical
defaults already exist in the historical migration and live database.

## Validation and recovery

The #13 acceptance harness performs a fresh isolated replay, checks migration
metadata and checksums, compares physical schema structure, validates Prisma
runtime queries, rehearses a bounded future migration, tests concurrent and
interrupted migration failure states, and verifies the protected #12 backup in
an isolated restore.

Migration adoption has no automatic down-migration claim. If a future schema
change causes a live incident, the #12 verified backup/restore path is the
destructive recovery fallback. Migration metadata incidents require a fresh
state census and supported Prisma reconciliation under explicit change
control.

The canonical commands are:

```text
npm --prefix backend run prisma:migrate:status
npm --prefix backend run prisma:migrate:deploy
npm --prefix backend run prisma:migration:acceptance
npm --prefix backend run prisma:migration:ci
```

The last two commands are evidence owners. They do not mutate the canonical
database; their database mutations, when needed, are isolated acceptance or
CI fixtures and are cleaned up.

## Relationship to prior milestones

- #7 owns fresh-install and migration replay completeness.
- #10 owns cross-platform Prisma client generation/runtime integrity.
- #11 owns modular schema organization and zero unauthorized semantic drift.
- #12 owns backup, restore, retention, and recovery integrity.
- #13 owns the live migration baseline/adoption contract and its deployment
  boundary. It does not add product models or reopen #7–#12.
