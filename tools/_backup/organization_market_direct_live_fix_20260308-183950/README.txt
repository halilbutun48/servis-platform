Organization schema dedupe hotfix

Purpose:
- Remove duplicate OrganizationPlan / OrganizationStop model blocks from backend/prisma/schema.prisma
- Keep the first occurrence, remove later duplicates
- Safe backup under tools/_backup

Run:
  .\tools\apply_organization_schema_dedupe_hotfix.ps1 -RepoRoot D:\servis-platform
