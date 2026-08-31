# ADR index

## Census

The current repository has no dedicated `ADR/` or `docs/adr/*.md` decision-record collection at this HEAD. Therefore:

- `ADR_COUNT = 0`
- `ACTIVE_ADR_COUNT = 0`
- `SUPERSEDED_ADR_COUNT = 0`
- `ORPHAN_ADR_COUNT = 0`
- `ORPHAN_ACTIVE_ADR_COUNT = 0`

This index is the #16 navigation owner; it does not invent ADRs for facts already owned by the schema, code, milestone registry, or runbooks.

## Existing decision owners

Material decisions already have canonical owners:

- Prisma schema modularization: [#11](../PRISMA_SCHEMA_MODULARIZATION_01.md) and `backend/prisma/schema.prisma` / `backend/prisma/schema/*.prisma`
- Backup and recovery: [#12](../DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01.md)
- Migration baseline/adoption: [#13](../DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01.md)
- Release gap disposition: [#14](../PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01.md) and its JSON evidence
- AI marketplace roadmap lock: [ROADMAP_LOCK_AI_MARKETPLACE_01.md](../ROADMAP_LOCK_AI_MARKETPLACE_01.md)
- Region/sharding decision: [TECHNICAL_DECISION_REGION_SHARDING_V1.md](../TECHNICAL_DECISION_REGION_SHARDING_V1.md)

## Future ADR rule

Create a dedicated ADR only for a material decision that needs a durable decision record and has an identified owner. It must contain title, status, decision, scope, owner, and supersession links where applicable. Do not turn this index into a second roadmap or schema.
